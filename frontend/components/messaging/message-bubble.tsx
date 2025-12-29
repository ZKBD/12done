'use client';

import { format } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Message } from '@/lib/types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  isRead?: boolean;
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar = true,
  isRead = false,
}: MessageBubbleProps) {
  const initials = message.sender
    ? `${message.sender.firstName[0]}${message.sender.lastName[0]}`
    : '?';

  if (message.type === 'SYSTEM') {
    return (
      <div className="flex justify-center py-2">
        <div className="bg-muted px-4 py-2 rounded-full text-xs text-muted-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={isOwn ? 'message-sent' : 'message-received'}
      className={cn(
        'flex gap-2 px-4 py-1',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {showAvatar && !isOwn && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      )}
      {!showAvatar && !isOwn && <div className="w-8 flex-shrink-0" />}

      <div className={cn('flex flex-col max-w-[70%]', isOwn && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted rounded-bl-sm'
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
        <div
          className={cn(
            'flex items-center gap-1 mt-1 text-xs text-muted-foreground',
            isOwn && 'flex-row-reverse'
          )}
        >
          <span>{format(new Date(message.createdAt), 'h:mm a')}</span>
          {isOwn && (
            <span className="flex-shrink-0">
              {isRead ? (
                <CheckCheck className="h-3 w-3 text-primary" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
          {message.isEdited && <span className="italic">(edited)</span>}
        </div>
      </div>
    </div>
  );
}
