'use client';

import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Home,
  MessageSquare,
  DollarSign,
  UserPlus,
  AlertCircle,
  Loader2,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useDeleteAllNotifications,
} from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/types';

const notificationIcons: Record<string, React.ElementType> = {
  PROPERTY: Home,
  NEGOTIATION: MessageSquare,
  PAYMENT: DollarSign,
  INVITATION: UserPlus,
  SYSTEM: AlertCircle,
};

function getNotificationLink(notification: Notification): string | null {
  const data = notification.data as Record<string, string> | undefined;

  if (!data) return null;

  switch (notification.type) {
    case 'PROPERTY':
      return data.propertyId ? `/properties/${data.propertyId}` : null;
    case 'NEGOTIATION':
      return data.negotiationId
        ? `/dashboard/negotiations/${data.negotiationId}`
        : null;
    case 'PAYMENT':
      return data.transactionId ? `/dashboard/transactions` : null;
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const { data: unreadData } = useUnreadCount();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNotifications({ limit: 20 });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const deleteAll = useDeleteAllNotifications();

  const notifications = data?.pages.flatMap((page) => page.data) || [];
  const unreadCount = unreadData?.count || 0;

  const handleMarkAsRead = (id: string) => {
    markAsRead.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const handleDelete = (id: string) => {
    deleteNotification.mutate(id);
  };

  const handleDeleteAll = () => {
    deleteAll.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsRead.isPending}
              className="gap-2"
            >
              {markAllAsRead.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteAll}
              disabled={deleteAll.isPending}
              className="gap-2 text-red-600 hover:text-red-700"
            >
              {deleteAll.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No notifications</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                When you receive notifications about your properties,
                negotiations, or payments, they&apos;ll appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || AlertCircle;
                const link = getNotificationLink(notification);

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex gap-4 p-4 transition-colors',
                      !notification.isRead && 'bg-primary/5'
                    )}
                  >
                    <div
                      className={cn(
                        'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                        notification.isRead ? 'bg-muted' : 'bg-primary/10'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-5 w-5',
                          notification.isRead
                            ? 'text-muted-foreground'
                            : 'text-primary'
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p
                            className={cn(
                              'text-sm',
                              !notification.isRead && 'font-medium'
                            )}
                          >
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(
                              new Date(notification.createdAt),
                              { addSuffix: true }
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={markAsRead.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(notification.id)}
                            disabled={deleteNotification.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {link && (
                        <Link href={link}>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 mt-2"
                          >
                            View details →
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More */}
          {hasNextPage && (
            <div className="p-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  'Load more notifications'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Link */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Notification Settings</p>
                <p className="text-sm text-muted-foreground">
                  Manage your notification preferences
                </p>
              </div>
            </div>
            <Link href="/dashboard/settings">
              <Button variant="outline" size="sm">
                Settings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
