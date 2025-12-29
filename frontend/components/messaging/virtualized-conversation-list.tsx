'use client';

import { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConversationItem } from './conversation-item';
import type { Conversation } from '@/lib/types';

interface VirtualizedConversationListProps {
  conversations: Conversation[];
  currentUserId: string;
  activeConversationId?: string;
  hasMore?: boolean;
  isFetchingMore?: boolean;
  onLoadMore?: () => void;
}

export function VirtualizedConversationList({
  conversations,
  currentUserId,
  activeConversationId,
  hasMore = false,
  isFetchingMore = false,
  onLoadMore,
}: VirtualizedConversationListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88, // Approximate conversation item height
    overscan: 3,
  });

  // Handle scroll for loading more at bottom
  const handleScroll = useCallback(() => {
    if (!parentRef.current || isFetchingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    if (isNearBottom && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isFetchingMore, onLoadMore]);

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
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      onScroll={handleScroll}
      data-testid="virtualized-conversation-list"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const conversation = conversations[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ConversationItem
                conversation={conversation}
                currentUserId={currentUserId}
                isActive={conversation.id === activeConversationId}
              />
            </div>
          );
        })}
      </div>

      {/* Load more button */}
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
    </div>
  );
}
