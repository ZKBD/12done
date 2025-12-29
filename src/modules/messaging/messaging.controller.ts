import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
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
import { JwtAuthGuard } from '@/modules/auth/guards';
import { CurrentUser, CurrentUserData } from '@/common/decorators';

@ApiTags('messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  // ============================================
  // CONVERSATIONS
  // ============================================

  @Get('conversations')
  @ApiOperation({ summary: 'List user conversations' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of conversations',
    type: ConversationListResponseDto,
  })
  async getConversations(
    @CurrentUser() user: CurrentUserData,
    @Query() query: ConversationQueryDto,
  ): Promise<ConversationListResponseDto> {
    return this.messagingService.getConversations(user.id, query);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created',
    type: ConversationResponseDto,
  })
  async createConversation(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    return this.messagingService.createConversation(user.id, dto);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation details with recent messages' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation with messages',
    type: ConversationDetailResponseDto,
  })
  async getConversation(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<ConversationDetailResponseDto> {
    return this.messagingService.getConversation(user.id, id);
  }

  @Get('negotiations/:negotiationId/conversation')
  @ApiOperation({ summary: 'Get or create conversation for a negotiation' })
  @ApiParam({ name: 'negotiationId', description: 'Negotiation ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation for the negotiation',
    type: ConversationResponseDto,
  })
  async getNegotiationConversation(
    @CurrentUser() user: CurrentUserData,
    @Param('negotiationId') negotiationId: string,
  ): Promise<ConversationResponseDto> {
    return this.messagingService.getOrCreateNegotiationConversation(
      negotiationId,
      user.id,
    );
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get paginated messages from a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Paginated messages',
    type: MessageListResponseDto,
  })
  async getMessages(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Query() query: MessageQueryDto,
  ): Promise<MessageListResponseDto> {
    return this.messagingService.getMessages(user.id, id, query);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 201,
    description: 'Message sent',
    type: MessageResponseDto,
  })
  async sendMessage(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messagingService.sendMessage(user.id, id, dto);
  }

  @Patch('conversations/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark conversation as read' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation marked as read',
  })
  async markAsRead(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.messagingService.markAsRead(user.id, id);
  }

  @Patch('conversations/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation archived',
  })
  async archiveConversation(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.messagingService.archiveConversation(user.id, id);
  }

  @Patch('conversations/:id/unarchive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unarchive a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation unarchived',
  })
  async unarchiveConversation(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.messagingService.unarchiveConversation(user.id, id);
  }

  // ============================================
  // MESSAGES
  // ============================================

  @Delete(':messageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete own message' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({
    status: 200,
    description: 'Message deleted',
  })
  async deleteMessage(
    @CurrentUser() user: CurrentUserData,
    @Param('messageId') messageId: string,
  ): Promise<{ message: string }> {
    return this.messagingService.deleteMessage(user.id, messageId);
  }

  // ============================================
  // UNREAD COUNT
  // ============================================

  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread message count' })
  @ApiResponse({
    status: 200,
    description: 'Unread count',
    type: UnreadCountResponseDto,
  })
  async getUnreadCount(
    @CurrentUser() user: CurrentUserData,
  ): Promise<UnreadCountResponseDto> {
    return this.messagingService.getUnreadCount(user.id);
  }
}
