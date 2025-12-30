import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { MessageType, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '@/database';
import { NotificationsService } from '@/modules/notifications';
import { MailService } from '@/mail';
import {
  CreateConversationDto,
  SendMessageDto,
  ConversationQueryDto,
  MessageQueryDto,
  ConversationResponseDto,
  ConversationDetailResponseDto,
  ConversationListResponseDto,
  MessageResponseDto,
  MessageListResponseDto,
  UnreadCountResponseDto,
} from './dto/messaging.dto';
import type { MessagingGateway } from './messaging.gateway';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private mailService: MailService,
    @Inject(forwardRef(() => 'MessagingGateway'))
    private messagingGateway: MessagingGateway,
  ) {}

  // ============================================
  // CONVERSATIONS
  // ============================================

  async createConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    // Validate that we have at least one context
    if (!dto.recipientId && !dto.propertyId && !dto.negotiationId) {
      throw new BadRequestException(
        'Either recipientId, propertyId, or negotiationId is required',
      );
    }

    // Determine participants
    const participantIds: string[] = [userId];

    if (dto.recipientId) {
      // Validate recipient exists
      const recipient = await this.prisma.user.findUnique({
        where: { id: dto.recipientId },
      });
      if (!recipient) {
        throw new NotFoundException('Recipient not found');
      }
      if (!participantIds.includes(dto.recipientId)) {
        participantIds.push(dto.recipientId);
      }
    }

    if (dto.propertyId) {
      // Add property owner as participant
      const property = await this.prisma.property.findUnique({
        where: { id: dto.propertyId },
      });
      if (!property) {
        throw new NotFoundException('Property not found');
      }
      if (!participantIds.includes(property.ownerId)) {
        participantIds.push(property.ownerId);
      }
    }

    if (dto.negotiationId) {
      // Check if conversation already exists for this negotiation
      const existing = await this.prisma.conversation.findUnique({
        where: { negotiationId: dto.negotiationId },
        include: {
          participants: { include: { user: true } },
        },
      });
      if (existing) {
        return this.mapConversationToResponse(existing, userId);
      }

      // Add negotiation parties as participants
      const negotiation = await this.prisma.negotiation.findUnique({
        where: { id: dto.negotiationId },
      });
      if (!negotiation) {
        throw new NotFoundException('Negotiation not found');
      }

      // Verify user is part of negotiation
      if (negotiation.buyerId !== userId && negotiation.sellerId !== userId) {
        throw new ForbiddenException('You are not part of this negotiation');
      }

      if (!participantIds.includes(negotiation.buyerId)) {
        participantIds.push(negotiation.buyerId);
      }
      if (!participantIds.includes(negotiation.sellerId)) {
        participantIds.push(negotiation.sellerId);
      }
    }

    // Create conversation with participants
    const conversation = await this.prisma.conversation.create({
      data: {
        negotiationId: dto.negotiationId,
        propertyId: dto.propertyId,
        subject: dto.subject,
        participants: {
          create: participantIds.map((id) => ({
            userId: id,
          })),
        },
      },
      include: {
        participants: { include: { user: true } },
        property: true,
        negotiation: true,
      },
    });

    // Send initial message if provided
    if (dto.initialMessage) {
      await this.sendMessage(userId, conversation.id, {
        content: dto.initialMessage,
      });
    }

    return this.mapConversationToResponse(conversation, userId);
  }

  async getConversations(
    userId: string,
    query: ConversationQueryDto,
  ): Promise<ConversationListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ConversationWhereInput = {
      participants: {
        some: {
          userId,
          isArchived: query.isArchived ?? false,
        },
      },
    };

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: {
          participants: { include: { user: true } },
          property: true,
          negotiation: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { sender: true },
          },
        },
        orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return {
      data: conversations.map((c) => this.mapConversationToResponse(c, userId)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getConversation(
    userId: string,
    conversationId: string,
  ): Promise<ConversationDetailResponseDto> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: { include: { user: true } },
        property: true,
        negotiation: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { sender: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const isParticipant = conversation.participants.some(
      (p) => p.userId === userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    return this.mapConversationDetailToResponse(conversation, userId);
  }

  async getOrCreateNegotiationConversation(
    negotiationId: string,
    userId: string,
  ): Promise<ConversationResponseDto> {
    // Check if conversation exists
    const existing = await this.prisma.conversation.findUnique({
      where: { negotiationId },
      include: {
        participants: { include: { user: true } },
        property: true,
        negotiation: true,
      },
    });

    if (existing) {
      const isParticipant = existing.participants.some(
        (p) => p.userId === userId,
      );
      if (!isParticipant) {
        throw new ForbiddenException('You are not part of this negotiation');
      }
      return this.mapConversationToResponse(existing, userId);
    }

    // Create new conversation
    return this.createConversation(userId, { negotiationId });
  }

  async archiveConversation(
    userId: string,
    conversationId: string,
  ): Promise<{ message: string }> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!participant) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { isArchived: true },
    });

    return { message: 'Conversation archived' };
  }

  async unarchiveConversation(
    userId: string,
    conversationId: string,
  ): Promise<{ message: string }> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!participant) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { isArchived: false },
    });

    return { message: 'Conversation unarchived' };
  }

  // ============================================
  // MESSAGES
  // ============================================

  async getMessages(
    userId: string,
    conversationId: string,
    query: MessageQueryDto,
  ): Promise<MessageListResponseDto> {
    // Verify user is participant
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.MessageWhereInput = { conversationId };

    // If cursor provided, get messages before that cursor
    if (query.before) {
      const cursorMessage = await this.prisma.message.findUnique({
        where: { id: query.before },
      });
      if (cursorMessage) {
        where.createdAt = { lt: cursorMessage.createdAt };
      }
    }

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: { sender: true },
        orderBy: { createdAt: 'desc' },
        skip: query.before ? 0 : skip,
        take: limit,
      }),
      this.prisma.message.count({ where: { conversationId } }),
    ]);

    return {
      data: messages.map((m) => this.mapMessageToResponse(m)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: messages.length === limit,
      },
    };
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    // Verify user is participant
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const now = new Date();

    // Create message and update conversation in transaction
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          content: dto.content,
          type: MessageType.TEXT,
        },
        include: { sender: true },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: now },
      }),
      // Increment unread count for other participants
      this.prisma.conversationParticipant.updateMany({
        where: {
          conversationId,
          userId: { not: userId },
        },
        data: {
          unreadCount: { increment: 1 },
        },
      }),
    ]);

    // Send notifications to other participants (async, don't block response)
    this.sendMessageNotifications(userId, conversationId, message).catch((error) => {
      this.logger.error('Failed to send message notifications', error);
    });

    return this.mapMessageToResponse(message);
  }

  private async sendMessageNotifications(
    senderId: string,
    conversationId: string,
    message: {
      id: string;
      content: string;
      sender?: { id: string; firstName: string; lastName: string } | null;
    },
  ): Promise<void> {
    // Get conversation with all participants and context
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
        property: { select: { id: true, title: true } },
      },
    });

    if (!conversation) return;

    // Get sender info
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { firstName: true, lastName: true },
    });
    const senderName = sender
      ? `${sender.firstName} ${sender.lastName}`
      : 'Someone';

    // Truncate message for preview (max 100 chars)
    const messagePreview =
      message.content.length > 100
        ? message.content.substring(0, 97) + '...'
        : message.content;

    // Notify each participant except the sender
    for (const participant of conversation.participants) {
      if (participant.userId === senderId) continue;

      const recipientUser = participant.user;

      // Create in-app notification
      const notification = await this.notificationsService.create(
        recipientUser.id,
        NotificationType.MESSAGE_RECEIVED,
        'New Message',
        `${senderName}: ${messagePreview}`,
        {
          conversationId,
          messageId: message.id,
          senderId,
          senderName,
          propertyId: conversation.propertyId,
        },
      );

      // Emit real-time WebSocket notification event
      try {
        this.messagingGateway.emitToUser(recipientUser.id, 'notification', {
          type: 'MESSAGE_RECEIVED',
          notification: {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            createdAt: notification.createdAt,
          },
          conversationId,
          messageId: message.id,
        });
      } catch (error) {
        this.logger.warn('Failed to emit WebSocket notification', error);
      }

      // Send email notification
      try {
        await this.mailService.sendNewMessageEmail(
          recipientUser.email,
          recipientUser.firstName,
          senderName,
          messagePreview,
          conversationId,
          conversation.property?.title,
          conversation.subject || undefined,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send email notification to ${recipientUser.email}`,
          error,
        );
      }
    }
  }

  async deleteMessage(
    userId: string,
    messageId: string,
  ): Promise<{ message: string }> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.prisma.message.delete({ where: { id: messageId } });

    return { message: 'Message deleted' };
  }

  // ============================================
  // READ STATUS
  // ============================================

  async markAsRead(
    userId: string,
    conversationId: string,
  ): Promise<{ message: string }> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!participant) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: {
        lastReadAt: new Date(),
        unreadCount: 0,
      },
    });

    return { message: 'Conversation marked as read' };
  }

  async getUnreadCount(userId: string): Promise<UnreadCountResponseDto> {
    const result = await this.prisma.conversationParticipant.aggregate({
      where: {
        userId,
        isArchived: false,
      },
      _sum: { unreadCount: true },
    });

    return { count: result._sum.unreadCount || 0 };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  async isParticipant(userId: string, conversationId: string): Promise<boolean> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });
    return !!participant;
  }

  private mapConversationToResponse(
    conversation: {
      id: string;
      negotiationId: string | null;
      propertyId: string | null;
      subject: string | null;
      lastMessageAt: Date | null;
      createdAt: Date;
      participants: Array<{
        userId: string;
        lastReadAt: Date | null;
        unreadCount: number;
        user: { id: string; firstName: string; lastName: string };
      }>;
      property?: { id: string; title: string; city: string } | null;
      negotiation?: { id: string; type: string; status: string } | null;
      messages?: Array<{
        id: string;
        conversationId: string;
        senderId: string;
        type: MessageType;
        content: string;
        isEdited: boolean;
        editedAt: Date | null;
        createdAt: Date;
        sender: { id: string; firstName: string; lastName: string };
      }>;
    },
    currentUserId: string,
  ): ConversationResponseDto {
    const currentParticipant = conversation.participants.find(
      (p) => p.userId === currentUserId,
    );

    return {
      id: conversation.id,
      negotiationId: conversation.negotiationId || undefined,
      propertyId: conversation.propertyId || undefined,
      subject: conversation.subject || undefined,
      lastMessageAt: conversation.lastMessageAt || undefined,
      createdAt: conversation.createdAt,
      property: conversation.property
        ? {
            id: conversation.property.id,
            title: conversation.property.title,
            city: conversation.property.city,
          }
        : undefined,
      negotiation: conversation.negotiation
        ? {
            id: conversation.negotiation.id,
            type: conversation.negotiation.type,
            status: conversation.negotiation.status,
          }
        : undefined,
      participants: conversation.participants.map((p) => ({
        id: p.user.id,
        odString: p.userId,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        lastReadAt: p.lastReadAt || undefined,
        unreadCount: p.unreadCount,
      })),
      lastMessage: conversation.messages?.[0]
        ? this.mapMessageToResponse(conversation.messages[0])
        : undefined,
      unreadCount: currentParticipant?.unreadCount || 0,
    };
  }

  private mapConversationDetailToResponse(
    conversation: {
      id: string;
      negotiationId: string | null;
      propertyId: string | null;
      subject: string | null;
      lastMessageAt: Date | null;
      createdAt: Date;
      participants: Array<{
        userId: string;
        lastReadAt: Date | null;
        unreadCount: number;
        user: { id: string; firstName: string; lastName: string };
      }>;
      property?: { id: string; title: string; city: string } | null;
      negotiation?: { id: string; type: string; status: string } | null;
      messages: Array<{
        id: string;
        conversationId: string;
        senderId: string;
        type: MessageType;
        content: string;
        isEdited: boolean;
        editedAt: Date | null;
        createdAt: Date;
        sender: { id: string; firstName: string; lastName: string };
      }>;
    },
    currentUserId: string,
  ): ConversationDetailResponseDto {
    const base = this.mapConversationToResponse(conversation, currentUserId);
    return {
      ...base,
      messages: conversation.messages.map((m) => this.mapMessageToResponse(m)),
    };
  }

  private mapMessageToResponse(message: {
    id: string;
    conversationId: string;
    senderId: string;
    type: MessageType;
    content: string;
    isEdited: boolean;
    editedAt: Date | null;
    createdAt: Date;
    sender?: { id: string; firstName: string; lastName: string };
  }): MessageResponseDto {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      sender: message.sender
        ? {
            id: message.sender.id,
            firstName: message.sender.firstName,
            lastName: message.sender.lastName,
          }
        : undefined,
      type: message.type,
      content: message.content,
      isEdited: message.isEdited,
      editedAt: message.editedAt || undefined,
      createdAt: message.createdAt,
    };
  }
}
