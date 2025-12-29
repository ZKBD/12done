'use client';

import { useRef, useEffect, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format, isSameDay } from 'date-fns';
import { MessageBubble } from './message-bubble';
import { TypingIndicator } from './typing-indicator';
import type { Message } from '@/lib/types';

interface TypingUser {
  id: string;
  firstName: string;
  lastName: string;
}

interface VirtualizedMessageListProps {
  messages: Message[];
  currentUserId: string;
  typingUsers?: TypingUser[];
  hasMoreMessages?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

interface MessageGroup {
  type: 'date' | 'message';
  date?: Date;
  message?: Message;
  showAvatar?: boolean;
  isOwn?: boolean;
}

function DateDivider({ date }: { date: Date }) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let label: string;
  if (isSameDay(date, today)) {
    label = 'Today';
  } else if (isSameDay(date, yesterday)) {
    label = 'Yesterday';
  } else {
    label = format(date, 'MMMM d, yyyy');
  }

  return (
    <div className="flex items-center gap-4 py-4 px-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export function VirtualizedMessageList({
  messages,
  currentUserId,
  typingUsers = [],
  hasMoreMessages = false,
  isLoadingMore = false,
  onLoadMore,
  className,
}: VirtualizedMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  // Sort messages oldest first and group with date dividers
  const groupedItems = useMemo(() => {
    const sorted = [...messages].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const groups: MessageGroup[] = [];
    let lastDate: Date | null = null;
    let lastSenderId: string | null = null;

    sorted.forEach((message) => {
      const messageDate = new Date(message.createdAt);

      // Add date divider if new day
      if (!lastDate || !isSameDay(messageDate, lastDate)) {
        groups.push({ type: 'date', date: messageDate });
        lastSenderId = null;
      }

      const isOwn = message.senderId === currentUserId;
      const showAvatar = message.senderId !== lastSenderId;

      groups.push({
        type: 'message',
        message,
        showAvatar,
        isOwn,
      });

      lastDate = messageDate;
      lastSenderId = message.senderId;
    });

    return groups;
  }, [messages, currentUserId]);

  const virtualizer = useVirtualizer({
    count: groupedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const item = groupedItems[index];
      if (item.type === 'date') return 48; // Date divider height
      return 60; // Approximate message height
    },
    overscan: 5,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && groupedItems.length > 0) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(groupedItems.length - 1, {
          align: 'end',
          behavior: 'smooth',
        });
      });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, groupedItems.length, virtualizer]);

  // Handle scroll for loading more
  const handleScroll = useCallback(() => {
    if (!parentRef.current || isLoadingMore) return;

    const { scrollTop } = parentRef.current;
    if (scrollTop < 100 && hasMoreMessages && onLoadMore) {
      onLoadMore();
    }
  }, [hasMoreMessages, isLoadingMore, onLoadMore]);

  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;

    element.addEventListener('scroll', handleScroll);
    return () => element.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">
          No messages yet. Start the conversation!
        </p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`flex-1 overflow-auto ${className || ''}`}
      data-testid="virtualized-message-list"
    >
      {/* Load more indicator */}
      {hasMoreMessages && (
        <div className="flex justify-center py-4">
          {isLoadingMore ? (
            <span className="text-sm text-muted-foreground">Loading...</span>
          ) : (
            <button
              onClick={onLoadMore}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Load earlier messages
            </button>
          )}
        </div>
      )}

      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = groupedItems[virtualRow.index];

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
              {item.type === 'date' && item.date && (
                <DateDivider date={item.date} />
              )}
              {item.type === 'message' && item.message && (
                <MessageBubble
                  message={item.message}
                  isOwn={item.isOwn || false}
                  showAvatar={item.showAvatar}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Typing indicator at the bottom */}
      {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
    </div>
  );
}
