'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/providers';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  Heart,
  MessageSquare,
  Eye,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  Bell,
  Package,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { useDashboardStats, useRecentActivity } from '@/hooks/use-dashboard';
import { useNotifications } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activityData, isLoading: activityLoading } = useRecentActivity(5);
  const { data: notificationsData, isLoading: notificationsLoading } =
    useNotifications({ limit: 5 });

  const notifications =
    notificationsData?.pages.flatMap((page) => page.data) || [];
  const activities = activityData || [];

  const formatPrice = (price: string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'PROPERTY_VIEW':
        return Eye;
      case 'OFFER_RECEIVED':
        return MessageSquare;
      case 'OFFER_ACCEPTED':
        return CheckCircle;
      case 'PAYMENT_RECEIVED':
        return DollarSign;
      case 'PROPERTY_LISTED':
        return Home;
      default:
        return Package;
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {user?.firstName || 'User'}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your properties today.
          </p>
        </div>
        <Link href="/dashboard/properties/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            List Property
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  My Properties
                </CardTitle>
                <div className="rounded-full p-2 bg-blue-100">
                  <Home className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.properties.total || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.properties.active || 0} active,{' '}
                  {stats?.properties.pending || 0} pending
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Favorites</CardTitle>
                <div className="rounded-full p-2 bg-red-100">
                  <Heart className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.favorites.count || 0}
                </div>
                <p className="text-xs text-muted-foreground">Saved properties</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Negotiations
                </CardTitle>
                <div className="rounded-full p-2 bg-green-100">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.negotiations.active || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.negotiations.pending || 0} pending response
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Property Views
                </CardTitle>
                <div className="rounded-full p-2 bg-purple-100">
                  <Eye className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {stats?.views.thisMonth || 0}
                  </span>
                  {stats?.views.trend !== undefined && stats.views.trend !== 0 && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        'gap-1',
                        stats.views.trend > 0
                          ? 'text-green-600 bg-green-100'
                          : 'text-red-600 bg-red-100'
                      )}
                    >
                      {stats.views.trend > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(stats.views.trend)}%
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Earnings Card */}
      {stats?.earnings && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Earnings Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(stats.earnings.total, stats.earnings.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">
                  {formatPrice(stats.earnings.thisMonth, stats.earnings.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Payout</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatPrice(stats.earnings.pending, stats.earnings.currency)}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/dashboard/transactions">
                <Button variant="outline" size="sm" className="gap-2">
                  View Transactions
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity and Notifications Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest property interactions</CardDescription>
            </div>
            <Link href="/dashboard/activity">
              <Button variant="ghost" size="sm" className="gap-1">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
                <p className="text-sm mt-1">
                  Start browsing properties or create a listing
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(activity.timestamp), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Stay updated on your properties</CardDescription>
            </div>
            <Link href="/dashboard/notifications">
              <Button variant="ghost" size="sm" className="gap-1">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {notificationsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No new notifications</p>
                <p className="text-sm mt-1">
                  We&apos;ll notify you when something important happens
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-3 p-2 rounded-lg -mx-2',
                      !notification.isRead && 'bg-primary/5'
                    )}
                  >
                    <div
                      className={cn(
                        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                        notification.isRead ? 'bg-muted' : 'bg-primary/10'
                      )}
                    >
                      <Bell
                        className={cn(
                          'h-4 w-4',
                          notification.isRead
                            ? 'text-muted-foreground'
                            : 'text-primary'
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm truncate',
                          !notification.isRead && 'font-medium'
                        )}
                      >
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks at your fingertips</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/dashboard/properties/new">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <div className="rounded-full p-2 bg-blue-100">
                  <Plus className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">List Property</p>
                  <p className="text-xs text-muted-foreground">
                    Create a new listing
                  </p>
                </div>
              </Button>
            </Link>
            <Link href="/properties">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <div className="rounded-full p-2 bg-purple-100">
                  <Eye className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Browse Properties</p>
                  <p className="text-xs text-muted-foreground">
                    Find your next home
                  </p>
                </div>
              </Button>
            </Link>
            <Link href="/dashboard/negotiations">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <div className="rounded-full p-2 bg-green-100">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">View Negotiations</p>
                  <p className="text-xs text-muted-foreground">
                    Manage your offers
                  </p>
                </div>
              </Button>
            </Link>
            <Link href="/dashboard/search-agents">
              <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3">
                <div className="rounded-full p-2 bg-amber-100">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Search Agents</p>
                  <p className="text-xs text-muted-foreground">
                    Set up alerts
                  </p>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
