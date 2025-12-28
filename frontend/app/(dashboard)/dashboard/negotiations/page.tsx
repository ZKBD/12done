'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  Home,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useNegotiations, useNegotiationStats } from '@/hooks/use-negotiations';
import { useAuth } from '@/providers';
import { cn, getImageUrl } from '@/lib/utils';
import type { NegotiationStatus, OfferStatus } from '@/lib/types';

const statusLabels: Record<NegotiationStatus, string> = {
  ACTIVE: 'Active',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
  EXPIRED: 'Expired',
};

const statusColors: Record<NegotiationStatus, string> = {
  ACTIVE: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-purple-100 text-purple-700',
  EXPIRED: 'bg-slate-100 text-slate-700',
};

const statusIcons: Record<NegotiationStatus, React.ElementType> = {
  ACTIVE: Clock,
  ACCEPTED: CheckCircle2,
  REJECTED: XCircle,
  COMPLETED: CheckCircle2,
  EXPIRED: Clock,
};

export default function NegotiationsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<NegotiationStatus | 'ALL'>('ALL');
  const [roleFilter, setRoleFilter] = useState<'all' | 'buyer' | 'seller'>('all');

  const params = useMemo(
    () => ({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      role: roleFilter,
      limit: 20,
    }),
    [statusFilter, roleFilter]
  );

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNegotiations(params);
  const { data: stats, isLoading: statsLoading } = useNegotiationStats();

  const negotiations = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  const formatPrice = (price: string, currency?: string) => {
    const num = parseFloat(price);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Negotiations</h1>
        <p className="text-muted-foreground">
          Manage your property offers and negotiations
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                <p className="text-sm text-muted-foreground">Total Negotiations</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.active || 0}
                </div>
                <p className="text-sm text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {stats?.accepted || 0}
                </div>
                <p className="text-sm text-muted-foreground">Accepted</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-purple-600">
                  {stats?.completed || 0}
                </div>
                <p className="text-sm text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">All Negotiations</CardTitle>
            <div className="flex items-center gap-3">
              <Tabs
                value={roleFilter}
                onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}
              >
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="buyer">Buying</TabsTrigger>
                  <TabsTrigger value="seller">Selling</TabsTrigger>
                </TabsList>
              </Tabs>
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as NegotiationStatus | 'ALL')
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ACCEPTED">Accepted</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <NegotiationsListSkeleton />
          ) : negotiations.length === 0 ? (
            <EmptyState roleFilter={roleFilter} />
          ) : (
            <div className="space-y-4">
              {negotiations.map((negotiation) => {
                const isBuyer = negotiation.buyerId === user?.id;
                const otherParty = isBuyer
                  ? negotiation.seller
                  : negotiation.buyer;
                const primaryImage =
                  negotiation.property.media?.find((m) => m.isPrimary) ||
                  negotiation.property.media?.[0];
                const StatusIcon = statusIcons[negotiation.status];

                return (
                  <Link
                    key={negotiation.id}
                    href={`/dashboard/negotiations/${negotiation.id}`}
                  >
                    <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      {/* Property Image */}
                      <div className="relative h-16 w-24 rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
                        {primaryImage ? (
                          <Image
                            src={getImageUrl(primaryImage.thumbnailUrl || primaryImage.url)}
                            alt={negotiation.property.title}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Home className="h-6 w-6 text-slate-400" />
                          </div>
                        )}
                      </div>

                      {/* Negotiation Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">
                            {negotiation.property.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className={cn(
                              'flex-shrink-0',
                              isBuyer
                                ? 'border-green-200 text-green-700'
                                : 'border-blue-200 text-blue-700'
                            )}
                          >
                            {isBuyer ? (
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowDownLeft className="h-3 w-3 mr-1" />
                            )}
                            {isBuyer ? 'Buying' : 'Selling'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {isBuyer ? 'From' : 'To'}: {otherParty.firstName}{' '}
                          {otherParty.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {negotiation.property.city},{' '}
                          {negotiation.property.country}
                        </p>
                      </div>

                      {/* Latest Offer */}
                      <div className="text-right hidden sm:block">
                        {negotiation.latestOffer && (
                          <>
                            <div className="font-semibold">
                              {formatPrice(
                                negotiation.latestOffer.amount,
                                negotiation.latestOffer.currency
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(
                                new Date(negotiation.latestOffer.createdAt),
                                { addSuffix: true }
                              )}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            'flex-shrink-0',
                            statusColors[negotiation.status]
                          )}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusLabels[negotiation.status]}
                        </Badge>
                        {negotiation.unreadCount && negotiation.unreadCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="h-5 w-5 p-0 flex items-center justify-center rounded-full"
                          >
                            {negotiation.unreadCount}
                          </Badge>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                );
              })}

              {hasNextPage && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load more'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ roleFilter }: { roleFilter: 'all' | 'buyer' | 'seller' }) {
  return (
    <div className="py-12 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <MessageSquare className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No negotiations yet</h3>
      <p className="text-muted-foreground mb-6">
        {roleFilter === 'buyer'
          ? 'Start browsing properties to make an offer.'
          : roleFilter === 'seller'
          ? 'List a property to receive offers.'
          : 'Make an offer on a property or list your own to get started.'}
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/properties">
          <Button variant="outline">Browse Properties</Button>
        </Link>
        <Link href="/dashboard/properties/new">
          <Button>List Property</Button>
        </Link>
      </div>
    </div>
  );
}

function NegotiationsListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-16 w-24 rounded-md" />
          <div className="flex-1">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="hidden sm:block text-right">
            <Skeleton className="h-5 w-20 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}
