'use client';

import { useEffect, useCallback } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';
import { TypingIndicator } from './typing-indicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useNegotiationConversation,
  useMessages,
  useSendMessage,
  useMarkConversationAsRead,
} from '@/hooks/use-messaging';
import { useMessagingSocket } from '@/hooks/use-messaging-socket';
import { useToast } from '@/components/ui/use-toast';
import type { Message } from '@/lib/types';

interface NegotiationMessagesProps {
  negotiationId: string;
  currentUserId: string;
}

export function NegotiationMessages({
  negotiationId,
  currentUserId,
}: NegotiationMessagesProps) {
  const { toast } = useToast();

  // Get or create conversation for this negotiation
  const {
    data: conversation,
    isLoading: isLoadingConversation,
  } = useNegotiationConversation(negotiationId);

  const conversationId = conversation?.id;

  // Get messages for the conversation
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(conversationId);

  const sendMessageMutation = useSendMessage(conversationId || '');
  const markAsReadMutation = useMarkConversationAsRead();

  // Real-time socket connection
  const { typingUsers, startTyping, stopTyping, markRead } = useMessagingSocket({
    conversationId,
  });

  // Flatten paginated messages
  const messages =
    messagesData?.pages.flatMap((page) => page?.data || []).filter(Boolean) || [];

  // Sort messages oldest first for display
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Mark as read when viewing
  useEffect(() => {
    if (conversationId) {
      markAsReadMutation.mutate(conversationId);
      markRead();
    }
  }, [conversationId]);

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!conversationId) return;

      sendMessageMutation.mutate(
        { content },
        {
          onError: () => {
            toast({
              title: 'Error',
              description: 'Failed to send message. Please try again.',
              variant: 'destructive',
            });
          },
        }
      );
    },
    [conversationId, sendMessageMutation, toast]
  );

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Loading state
  if (isLoadingConversation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-16 w-2/3 ml-auto" />
            <Skeleton className="h-16 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col" data-testid="negotiation-messages">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col p-0">
        {/* Messages Area */}
        <ScrollArea className="h-[300px] px-4">
          {hasNextPage && (
            <div className="flex justify-center py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                disabled={isFetchingNextPage}
                className="text-xs text-muted-foreground"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Loading...
                  </>
                ) : (
                  'Load earlier messages'
                )}
              </Button>
            </div>
          )}

          {isLoadingMessages ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            <div className="py-2 space-y-1">
              {sortedMessages.map((message, index) => {
                const isOwn = message.senderId === currentUserId;
                const prevMessage = index > 0 ? sortedMessages[index - 1] : null;
                const showAvatar = !prevMessage || prevMessage.senderId !== message.senderId;

                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                  />
                );
              })}
            </div>
          )}

          <TypingIndicator users={typingUsers} />
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t">
          <MessageInput
            onSend={handleSendMessage}
            onTypingStart={startTyping}
            onTypingStop={stopTyping}
            isSending={sendMessageMutation.isPending}
            disabled={!conversationId}
            placeholder="Send a message..."
          />
        </div>
      </CardContent>
    </Card>
  );
}
