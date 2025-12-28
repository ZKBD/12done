'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  RefreshCw,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useRequestRefund } from '@/hooks/use-payments';
import type { TransactionWithDetails } from '@/lib/api/payments';
import type { TransactionStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PaymentStatusCardProps {
  transaction: TransactionWithDetails;
  isBuyer: boolean;
}

const statusConfig: Record<
  TransactionStatus,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  PENDING: {
    label: 'Payment Pending',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  PROCESSING: {
    label: 'Processing',
    icon: Loader2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  COMPLETED: {
    label: 'Payment Complete',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  FAILED: {
    label: 'Payment Failed',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  REFUNDED: {
    label: 'Refunded',
    icon: RefreshCw,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100',
  },
};

export function PaymentStatusCard({
  transaction,
  isBuyer,
}: PaymentStatusCardProps) {
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');

  const requestRefund = useRequestRefund();

  const status = statusConfig[transaction.status] || statusConfig.PENDING;
  const StatusIcon = status.icon;

  const formatPrice = (price: string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  const canRequestRefund =
    isBuyer && transaction.status === 'COMPLETED' && !transaction.paidAt;

  const handleRefundRequest = async () => {
    if (!refundReason.trim()) return;

    await requestRefund.mutateAsync({
      transactionId: transaction.id,
      reason: refundReason,
    });

    setShowRefundModal(false);
    setRefundReason('');
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Badge */}
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg p-3',
              status.bgColor
            )}
          >
            <StatusIcon
              className={cn(
                'h-5 w-5',
                status.color,
                transaction.status === 'PROCESSING' && 'animate-spin'
              )}
            />
            <div>
              <p className={cn('font-medium', status.color)}>{status.label}</p>
              {transaction.paidAt && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(transaction.paidAt), 'MMM d, yyyy h:mm a')}
                </p>
              )}
            </div>
          </div>

          {/* Amount Breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">
                {formatPrice(transaction.amount, transaction.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Fee</span>
              <span>
                {formatPrice(transaction.platformFee, transaction.currency)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {isBuyer ? 'Seller Receives' : 'You Receive'}
              </span>
              <span className="font-medium text-green-600">
                {formatPrice(transaction.sellerAmount, transaction.currency)}
              </span>
            </div>
          </div>

          {/* Transaction ID */}
          <div className="text-xs text-muted-foreground">
            <span>Transaction ID: </span>
            <code className="rounded bg-muted px-1 py-0.5">
              {transaction.id.slice(0, 8)}...
            </code>
          </div>

          {/* Refund Button (Buyer only, completed transactions) */}
          {canRequestRefund && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRefundModal(true)}
              className="w-full gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Request Refund
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Refund Modal */}
      <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Request Refund
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for your refund request. The seller will
              be notified and can approve or deny the request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Refund Amount</span>
                <span className="font-medium">
                  {formatPrice(transaction.amount, transaction.currency)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Refund</Label>
              <Textarea
                id="reason"
                placeholder="Please explain why you're requesting a refund..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRefundModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRefundRequest}
              disabled={requestRefund.isPending || !refundReason.trim()}
              className="gap-2"
            >
              {requestRefund.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
