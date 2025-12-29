'use client';

import { MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationItem } from './conversation-item';
import type { Conversation } from '@/lib/types';

interface ConversationListProps {
  conversations: Conversation[];
  currentUserId: string;
  activeConversationId?: string;
  isLoading?: boolean;
  hasMore?: boolean;
  isFetchingMore?: boolean;
  onLoadMore?: () => void;
}

export function ConversationList({
  conversations,
  currentUserId,
  activeConversationId,
  isLoading = false,
  hasMore = false,
  isFetchingMore = false,
  onLoadMore,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="divide-y" data-testid="skeleton">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-4">
            <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Start a conversation by contacting a property owner or responding to a
          negotiation.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y" data-testid="conversation-list">
        {conversations.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            currentUserId={currentUserId}
            isActive={conversation.id === activeConversationId}
          />
        ))}
      </div>

      {hasMore && (
        <div className="p-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={onLoadMore}
            disabled={isFetchingMore}
          >
            {isFetchingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              'Load more conversations'
            )}
          </Button>
        </div>
      )}
    </ScrollArea>
  );
}
