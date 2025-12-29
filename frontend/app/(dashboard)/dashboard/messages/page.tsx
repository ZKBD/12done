'use client';

import { useEffect } from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConversationList } from '@/components/messaging';
import { useConversations, useUnreadMessageCount } from '@/hooks/use-messaging';
import { useMessagingSocket } from '@/hooks/use-messaging-socket';
import { useAuthStore } from '@/stores/auth-store';

export default function MessagesPage() {
  const { user } = useAuthStore();
  const currentUserId = user?.id || '';

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useConversations();

  const { data: unreadData } = useUnreadMessageCount();

  // Connect to socket for real-time updates
  useMessagingSocket();

  const conversations = data?.pages.flatMap((page) => page?.data || []).filter(Boolean) || [];
  const unreadCount = unreadData?.count || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `You have ${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
      </div>

      {/* Conversations List */}
      <Card>
        <CardContent className="p-0">
          <ConversationList
            conversations={conversations}
            currentUserId={currentUserId}
            isLoading={isLoading}
            hasMore={hasNextPage}
            isFetchingMore={isFetchingNextPage}
            onLoadMore={() => fetchNextPage()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
