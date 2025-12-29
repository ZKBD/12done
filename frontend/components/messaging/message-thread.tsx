'use client';

import { useEffect, useRef, useCallback } from 'react';
import { format, isSameDay } from 'date-fns';
import { ArrowLeft, Loader2, MoreVertical, Archive } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';
import { TypingIndicator } from './typing-indicator';
import type { Message, ConversationDetail } from '@/lib/types';

interface TypingUser {
  id: string;
  firstName: string;
  lastName: string;
}

interface MessageThreadProps {
  conversation: ConversationDetail | undefined;
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMoreMessages?: boolean;
  isSending?: boolean;
  typingUsers?: TypingUser[];
  onSendMessage: (content: string) => void;
  onLoadMoreMessages?: () => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  onArchive?: () => void;
  showBackButton?: boolean;
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

export function MessageThread({
  conversation,
  messages,
  currentUserId,
  isLoading = false,
  isLoadingMore = false,
  hasMoreMessages = false,
  isSending = false,
  typingUsers = [],
  onSendMessage,
  onLoadMoreMessages,
  onTypingStart,
  onTypingStop,
  onArchive,
  showBackButton = false,
}: MessageThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  // Get the other participant(s) for header display
  const otherParticipants =
    conversation?.participants.filter((p) => p.id !== currentUserId) || [];
  const displayParticipant = otherParticipants[0];
  const displayName = displayParticipant
    ? `${displayParticipant.firstName} ${displayParticipant.lastName}`
    : 'Conversation';
  const initials = displayParticipant
    ? `${displayParticipant.firstName[0]}${displayParticipant.lastName[0]}`
    : '?';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Handle scroll for loading more messages
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      if (target.scrollTop < 100 && hasMoreMessages && !isLoadingMore) {
        onLoadMoreMessages?.();
      }
    },
    [hasMoreMessages, isLoadingMore, onLoadMoreMessages]
  );

  // Group messages by date and consecutive sender
  const renderMessages = () => {
    if (messages.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">
            No messages yet. Start the conversation!
          </p>
        </div>
      );
    }

    const elements: React.ReactNode[] = [];
    let lastDate: Date | null = null;
    let lastSenderId: string | null = null;

    // Messages are typically newest-first from API, reverse for display
    const sortedMessages = [...messages].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sortedMessages.forEach((message, index) => {
      const messageDate = new Date(message.createdAt);
      const isOwn = message.senderId === currentUserId;

      // Add date divider if new day
      if (!lastDate || !isSameDay(messageDate, lastDate)) {
        elements.push(
          <DateDivider key={`date-${message.id}`} date={messageDate} />
        );
        lastSenderId = null;
      }

      // Show avatar only for first message in a consecutive sequence
      const showAvatar = message.senderId !== lastSenderId;

      elements.push(
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={isOwn}
          showAvatar={showAvatar}
        />
      );

      lastDate = messageDate;
      lastSenderId = message.senderId;
    });

    return elements;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 p-4 border-b">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        {/* Messages skeleton */}
        <div className="flex-1 p-4 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`flex gap-2 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}
            >
              {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
              <Skeleton
                className={`h-16 w-48 rounded-2xl ${i % 2 === 0 ? 'rounded-bl-sm' : 'rounded-br-sm'}`}
              />
            </div>
          ))}
        </div>

        {/* Input skeleton */}
        <div className="p-4 border-t">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-center p-4">
        <p className="text-muted-foreground">
          Select a conversation to start messaging
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 border-b bg-background">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <Link href="/dashboard/messages">
              <Button variant="ghost" size="icon" className="lg:hidden">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
          )}
          <Avatar className="h-10 w-10">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{displayName}</h2>
            {conversation.subject && (
              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                {conversation.subject}
              </p>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onArchive && (
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive conversation
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1"
        onScroll={handleScroll}
      >
        {isLoadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {hasMoreMessages && !isLoadingMore && (
          <div className="flex justify-center py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMoreMessages}
              className="text-muted-foreground"
            >
              Load earlier messages
            </Button>
          </div>
        )}

        <div className="py-2">{renderMessages()}</div>

        <TypingIndicator users={typingUsers} />

        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input */}
      <MessageInput
        onSend={onSendMessage}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
        isSending={isSending}
      />
    </div>
  );
}
