'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  Loader2,
  Receipt,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ExternalLink,
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransactions, usePaymentStats } from '@/hooks/use-payments';
import { useAuth } from '@/providers';
import { cn } from '@/lib/utils';
import type { TransactionStatus } from '@/lib/types';

const statusLabels: Record<TransactionStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
};

const statusColors: Record<TransactionStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
};

const statusIcons: Record<TransactionStatus, React.ElementType> = {
  PENDING: Clock,
  PROCESSING: Loader2,
  COMPLETED: CheckCircle2,
  FAILED: XCircle,
  REFUNDED: RotateCcw,
  CANCELLED: XCircle,
};

export default function TransactionsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'ALL'>('ALL');
  const [viewType, setViewType] = useState<'all' | 'earnings' | 'payments'>('all');

  const params = useMemo(
    () => ({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      limit: 20,
    }),
    [statusFilter]
  );

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTransactions(params);
  const { data: stats, isLoading: statsLoading } = usePaymentStats();

  const transactions = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  const formatPrice = (price: string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 2,
    }).format(parseFloat(price));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="text-muted-foreground">
          View your payment history and earnings
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-muted-foreground">
                    Total Earnings
                  </span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {stats ? formatPrice(stats.totalEarnings, stats.currency) : '$0'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-muted-foreground">
                    Total Spent
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {stats ? formatPrice(stats.totalSpent, stats.currency) : '$0'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <span className="text-sm text-muted-foreground">
                    Pending Payouts
                  </span>
                </div>
                <div className="text-2xl font-bold text-amber-600">
                  {stats
                    ? formatPrice(stats.pendingPayouts, stats.currency)
                    : '$0'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-purple-600" />
                  <span className="text-sm text-muted-foreground">
                    Completed
                  </span>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {stats?.completedTransactions || 0}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">Transaction History</CardTitle>
            <div className="flex items-center gap-3">
              <Tabs
                value={viewType}
                onValueChange={(v) => setViewType(v as typeof viewType)}
              >
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="earnings">Earnings</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                </TabsList>
              </Tabs>
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as TransactionStatus | 'ALL')
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TransactionsTableSkeleton />
          ) : transactions.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => {
                      const isSeller =
                        transaction.negotiation.seller.id === user?.id;
                      const StatusIcon = statusIcons[transaction.status];

                      return (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  'p-2 rounded-full',
                                  isSeller ? 'bg-green-100' : 'bg-blue-100'
                                )}
                              >
                                {isSeller ? (
                                  <ArrowDownLeft className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ArrowUpRight className="h-4 w-4 text-blue-600" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {isSeller ? 'Sale' : 'Purchase'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {transaction.id.slice(0, 8)}...
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/properties/${transaction.negotiation.property.id}`}
                              className="hover:underline"
                            >
                              <p className="font-medium text-sm truncate max-w-[200px]">
                                {transaction.negotiation.property.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {transaction.negotiation.property.city}
                              </p>
                            </Link>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">
                              {format(
                                new Date(transaction.createdAt),
                                'MMM d, yyyy'
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(transaction.createdAt), 'h:mm a')}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p
                                className={cn(
                                  'font-semibold',
                                  isSeller ? 'text-green-600' : ''
                                )}
                              >
                                {isSeller ? '+' : ''}
                                {formatPrice(
                                  isSeller
                                    ? transaction.sellerAmount
                                    : transaction.amount,
                                  transaction.currency
                                )}
                              </p>
                              {isSeller && (
                                <p className="text-xs text-muted-foreground">
                                  Fee:{' '}
                                  {formatPrice(
                                    transaction.platformFee,
                                    transaction.currency
                                  )}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                'gap-1',
                                statusColors[transaction.status]
                              )}
                            >
                              <StatusIcon
                                className={cn(
                                  'h-3 w-3',
                                  transaction.status === 'PROCESSING' &&
                                    'animate-spin'
                                )}
                              />
                              {statusLabels[transaction.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/dashboard/negotiations/${transaction.negotiationId}`}
                            >
                              <Button variant="ghost" size="sm" className="gap-1">
                                View
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-12 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Receipt className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
      <p className="text-muted-foreground mb-6">
        Complete a property purchase or sale to see your transaction history.
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/properties">
          <Button variant="outline">Browse Properties</Button>
        </Link>
        <Link href="/dashboard/negotiations">
          <Button>View Negotiations</Button>
        </Link>
      </div>
    </div>
  );
}

function TransactionsTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Transaction</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-3 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-20" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-8 w-16 ml-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
