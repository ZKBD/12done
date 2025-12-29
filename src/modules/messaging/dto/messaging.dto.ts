import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ============================================
// CREATE CONVERSATION DTO
// ============================================

export class CreateConversationDto {
  @ApiPropertyOptional({
    description: 'Recipient user ID for direct conversations',
    example: 'uuid-user-123',
  })
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @ApiPropertyOptional({
    description: 'Property ID for property inquiry conversations',
    example: 'uuid-property-123',
  })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({
    description: 'Negotiation ID for negotiation-linked conversations',
    example: 'uuid-negotiation-123',
  })
  @IsOptional()
  @IsUUID()
  negotiationId?: string;

  @ApiPropertyOptional({
    description: 'Conversation subject',
    example: 'Question about your property',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional({
    description: 'Initial message content',
    example: 'Hi, I am interested in your property...',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  initialMessage?: string;
}

// ============================================
// SEND MESSAGE DTO
// ============================================

export class SendMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Hello, I am interested in this property.',
  })
  @IsString()
  @MaxLength(5000)
  content: string;
}

// ============================================
// QUERY DTOs
// ============================================

export class ConversationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by archived status',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isArchived?: boolean;
}

export class MessageQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Load messages before this cursor ID',
  })
  @IsOptional()
  @IsUUID()
  before?: string;
}

// ============================================
// RESPONSE DTOs
// ============================================

export class ParticipantResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() odString: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiPropertyOptional() lastReadAt?: Date;
  @ApiProperty() unreadCount: number;
}

export class MessageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() conversationId: string;
  @ApiProperty() senderId: string;
  @ApiPropertyOptional() sender?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  @ApiProperty() type: string;
  @ApiProperty() content: string;
  @ApiProperty() isEdited: boolean;
  @ApiPropertyOptional() editedAt?: Date;
  @ApiProperty() createdAt: Date;
}

export class ConversationResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional() negotiationId?: string;
  @ApiPropertyOptional() propertyId?: string;
  @ApiPropertyOptional() subject?: string;
  @ApiPropertyOptional() lastMessageAt?: Date;
  @ApiProperty() createdAt: Date;

  @ApiPropertyOptional() property?: {
    id: string;
    title: string;
    city: string;
  };

  @ApiPropertyOptional() negotiation?: {
    id: string;
    type: string;
    status: string;
  };

  @ApiProperty({ type: [ParticipantResponseDto] })
  participants: ParticipantResponseDto[];

  @ApiPropertyOptional({ type: MessageResponseDto })
  lastMessage?: MessageResponseDto;

  @ApiProperty() unreadCount: number;
}

export class ConversationDetailResponseDto extends ConversationResponseDto {
  @ApiProperty({ type: [MessageResponseDto] })
  messages: MessageResponseDto[];
}

export class ConversationListResponseDto {
  @ApiProperty({ type: [ConversationResponseDto] })
  data: ConversationResponseDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class MessageListResponseDto {
  @ApiProperty({ type: [MessageResponseDto] })
  data: MessageResponseDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export class UnreadCountResponseDto {
  @ApiProperty() count: number;
}
