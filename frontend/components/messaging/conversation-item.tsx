'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Conversation } from '@/lib/types';

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  isActive?: boolean;
}

export function ConversationItem({
  conversation,
  currentUserId,
  isActive = false,
}: ConversationItemProps) {
  // Get the other participant(s)
  const otherParticipants = conversation.participants.filter(
    (p) => p.id !== currentUserId
  );
  const displayParticipant = otherParticipants[0];
  const hasMultipleParticipants = otherParticipants.length > 1;

  const displayName = displayParticipant
    ? `${displayParticipant.firstName} ${displayParticipant.lastName}`
    : 'Unknown User';

  const initials = displayParticipant
    ? `${displayParticipant.firstName[0]}${displayParticipant.lastName[0]}`
    : '?';

  const lastMessage = conversation.lastMessage;
  const unreadCount = conversation.unreadCount || 0;
  const isUnread = unreadCount > 0;

  return (
    <Link href={`/dashboard/messages/${conversation.id}`}>
      <div
        className={cn(
          'flex items-start gap-3 p-4 border-b transition-colors hover:bg-muted/50 cursor-pointer',
          isActive && 'bg-primary/5',
          isUnread && 'bg-primary/5'
        )}
      >
        <Avatar className="h-12 w-12 flex-shrink-0">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  'font-medium truncate',
                  isUnread && 'text-foreground'
                )}
              >
                {displayName}
              </span>
              {hasMultipleParticipants && (
                <span className="text-xs text-muted-foreground">
                  +{otherParticipants.length - 1}
                </span>
              )}
            </div>
            {lastMessage && (
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatDistanceToNow(new Date(lastMessage.createdAt), {
                  addSuffix: true,
                })}
              </span>
            )}
          </div>

          {conversation.subject && (
            <p className="text-sm text-muted-foreground truncate">
              {conversation.subject}
            </p>
          )}

          {lastMessage && (
            <div className="flex items-center justify-between gap-2 mt-1">
              <p
                className={cn(
                  'text-sm truncate',
                  isUnread
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                )}
              >
                {lastMessage.senderId === currentUserId && (
                  <span className="text-muted-foreground">You: </span>
                )}
                {lastMessage.content}
              </p>
              {isUnread && (
                <Badge
                  variant="default"
                  className="h-5 min-w-5 px-1.5 text-xs flex-shrink-0"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
