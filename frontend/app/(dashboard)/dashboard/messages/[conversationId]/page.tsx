'use client';

import { useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MessageThread, ConnectionBanner } from '@/components/messaging';
import {
  useConversation,
  useMessages,
  useSendMessage,
  useMarkConversationAsRead,
  useArchiveConversation,
} from '@/hooks/use-messaging';
import { useMessagingSocket } from '@/hooks/use-messaging-socket';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/components/ui/use-toast';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const conversationId = params.conversationId as string;

  const { user } = useAuthStore();
  const currentUserId = user?.id || '';

  // Fetch conversation and messages
  const { data: conversation, isLoading: isLoadingConversation } =
    useConversation(conversationId);

  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(conversationId);

  const sendMessageMutation = useSendMessage(conversationId);
  const markAsReadMutation = useMarkConversationAsRead();
  const archiveMutation = useArchiveConversation();

  // Real-time socket connection
  const {
    connectionStatus,
    pendingMessages,
    typingUsers,
    startTyping,
    stopTyping,
    markRead,
  } = useMessagingSocket({
    conversationId,
  });

  // Flatten paginated messages
  const messages = messagesData?.pages.flatMap((page) => page?.data || []).filter(Boolean) || [];

  // Mark as read when viewing conversation
  useEffect(() => {
    if (conversationId && conversation) {
      markAsReadMutation.mutate(conversationId);
      markRead();
    }
  }, [conversationId, conversation?.id]);

  const handleSendMessage = useCallback(
    (content: string) => {
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
    [sendMessageMutation, toast]
  );

  const handleArchive = useCallback(() => {
    archiveMutation.mutate(conversationId, {
      onSuccess: () => {
        toast({
          title: 'Conversation archived',
          description: 'The conversation has been archived.',
        });
        router.push('/dashboard/messages');
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to archive conversation.',
          variant: 'destructive',
        });
      },
    });
  }, [archiveMutation, conversationId, router, toast]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="h-[calc(100vh-8rem)] -m-6 lg:-m-8 flex flex-col">
      <ConnectionBanner status={connectionStatus} pendingMessages={pendingMessages} />
      <div className="flex-1 min-h-0">
        <MessageThread
          conversation={conversation}
          messages={messages}
          currentUserId={currentUserId}
          isLoading={isLoadingConversation || isLoadingMessages}
          isLoadingMore={isFetchingNextPage}
          hasMoreMessages={hasNextPage}
          isSending={sendMessageMutation.isPending}
          typingUsers={typingUsers}
          onSendMessage={handleSendMessage}
          onLoadMoreMessages={handleLoadMore}
          onTypingStart={startTyping}
          onTypingStop={stopTyping}
          onArchive={handleArchive}
          showBackButton
        />
      </div>
    </div>
  );
}
