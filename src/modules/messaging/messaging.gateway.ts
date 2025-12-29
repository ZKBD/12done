import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/database';
import { MessagingService } from './messaging.service';
import { WsJwtGuard, AuthenticatedSocket, WsJwtPayload } from './guards/ws-jwt.guard';

// Event payloads
interface JoinConversationPayload {
  conversationId: string;
}

interface SendMessagePayload {
  conversationId: string;
  content: string;
}

interface TypingPayload {
  conversationId: string;
}

interface MarkReadPayload {
  conversationId: string;
}

// Emitted events
interface NewMessageEvent {
  id: string;
  conversationId: string;
  senderId: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
  };
  content: string;
  type: string;
  createdAt: Date;
}

interface TypingEvent {
  conversationId: string;
  userId: string;
  firstName: string;
  lastName: string;
}

interface ReadReceiptEvent {
  conversationId: string;
  userId: string;
  readAt: Date;
}

@WebSocketGateway({
  namespace: '/messaging',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagingGateway.name);

  // Track which users are in which rooms and their socket IDs
  private userSockets: Map<string, Set<string>> = new Map();
  private socketUsers: Map<string, string> = new Map();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private messagingService: MessagingService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const user = await this.authenticateSocket(client);
      if (!user) {
        client.disconnect();
        return;
      }

      // Store socket mapping
      this.socketUsers.set(client.id, user.id);
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(client.id);

      // Attach user to socket
      (client as AuthenticatedSocket).user = user;

      this.logger.log(`Client connected: ${client.id} (User: ${user.id})`);
    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id);
    if (userId) {
      this.socketUsers.delete(client.id);
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(client.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private async authenticateSocket(client: Socket): Promise<{
    id: string;
    email: string;
    role: string;
    status: string;
  } | null> {
    const token = this.extractToken(client);
    if (!token) {
      return null;
    }

    try {
      const payload = this.jwtService.verify<WsJwtPayload>(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
        },
      });

      if (!user || user.status === 'DELETED' || user.status === 'SUSPENDED') {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
      };
    } catch {
      return null;
    }
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake?.auth?.token;
    if (authToken) return authToken;

    const queryToken = client.handshake?.query?.token;
    if (queryToken && typeof queryToken === 'string') return queryToken;

    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinConversationPayload,
  ) {
    const { conversationId } = payload;
    const userId = client.user.id;

    // Verify user is participant
    const isParticipant = await this.messagingService.isParticipant(userId, conversationId);
    if (!isParticipant) {
      throw new WsException('You are not a participant in this conversation');
    }

    // Join the room
    const roomName = `conversation:${conversationId}`;
    await client.join(roomName);

    this.logger.log(`User ${userId} joined ${roomName}`);

    return { success: true, conversationId };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: JoinConversationPayload,
  ) {
    const { conversationId } = payload;
    const roomName = `conversation:${conversationId}`;

    await client.leave(roomName);

    this.logger.log(`User ${client.user.id} left ${roomName}`);

    return { success: true, conversationId };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SendMessagePayload,
  ): Promise<NewMessageEvent> {
    const { conversationId, content } = payload;
    const userId = client.user.id;

    // Create message via service
    const message = await this.messagingService.sendMessage(userId, conversationId, {
      content,
    });

    // Get sender info for the event
    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true },
    });

    const messageEvent: NewMessageEvent = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      sender: sender!,
      content: message.content,
      type: message.type,
      createdAt: message.createdAt,
    };

    // Broadcast to all in the conversation room (except sender)
    const roomName = `conversation:${conversationId}`;
    client.to(roomName).emit('new_message', messageEvent);

    this.logger.log(`Message sent in ${roomName} by ${userId}`);

    return messageEvent;
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: TypingPayload,
  ) {
    const { conversationId } = payload;
    const userId = client.user.id;

    // Verify participation
    const isParticipant = await this.messagingService.isParticipant(userId, conversationId);
    if (!isParticipant) {
      return;
    }

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true },
    });

    const typingEvent: TypingEvent = {
      conversationId,
      userId,
      firstName: user!.firstName,
      lastName: user!.lastName,
    };

    // Broadcast to others in the room
    const roomName = `conversation:${conversationId}`;
    client.to(roomName).emit('user_typing', typingEvent);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: TypingPayload,
  ) {
    const { conversationId } = payload;
    const userId = client.user.id;

    // Broadcast typing stopped
    const roomName = `conversation:${conversationId}`;
    client.to(roomName).emit('user_stopped_typing', {
      conversationId,
      userId,
    });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: MarkReadPayload,
  ) {
    const { conversationId } = payload;
    const userId = client.user.id;

    // Mark as read via service
    await this.messagingService.markAsRead(userId, conversationId);

    const readReceiptEvent: ReadReceiptEvent = {
      conversationId,
      userId,
      readAt: new Date(),
    };

    // Broadcast read receipt to others in the room
    const roomName = `conversation:${conversationId}`;
    client.to(roomName).emit('read_receipt', readReceiptEvent);

    return { success: true };
  }

  // Utility method to emit events to specific users (for notifications)
  emitToUser(userId: string, event: string, data: unknown) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }

  // Emit to all participants of a conversation
  async emitToConversation(conversationId: string, event: string, data: unknown) {
    const roomName = `conversation:${conversationId}`;
    this.server.to(roomName).emit(event, data);
  }
}
