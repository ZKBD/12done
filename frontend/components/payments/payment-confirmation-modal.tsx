'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Loader2,
  CreditCard,
  Home,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useCompleteMockPayment, usePaymentStatus } from '@/hooks/use-payments';
import type { Negotiation, Offer } from '@/lib/types';

interface PaymentConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  negotiation: Negotiation;
  sessionId: string;
  onSuccess?: () => void;
}

export function PaymentConfirmationModal({
  open,
  onOpenChange,
  negotiation,
  sessionId,
  onSuccess,
}: PaymentConfirmationModalProps) {
  const [paymentComplete, setPaymentComplete] = useState(false);
  const isMockSession = sessionId?.startsWith('mock_');

  const completeMockPayment = useCompleteMockPayment();
  const { data: paymentStatus, isLoading: isPolling } = usePaymentStatus(
    !isMockSession && open ? sessionId : ''
  );

  // Get the accepted offer
  const acceptedOffer = negotiation.offers?.find(
    (offer: Offer) => offer.status === 'ACCEPTED'
  );

  const amount = acceptedOffer?.amount || '0';
  const currency = acceptedOffer?.currency || 'USD';

  // Calculate fees (5% platform fee)
  const amountNumber = parseFloat(amount);
  const platformFee = amountNumber * 0.05;
  const sellerReceives = amountNumber - platformFee;

  // Watch for payment status changes (Stripe flow)
  useEffect(() => {
    if (paymentStatus?.status === 'complete' || paymentStatus?.status === 'COMPLETED') {
      setPaymentComplete(true);
    }
  }, [paymentStatus]);

  const formatPrice = (price: number | string, curr: string = currency) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 0,
    }).format(numPrice);
  };

  const handleCompleteMockPayment = async () => {
    try {
      await completeMockPayment.mutateAsync(sessionId);
      setPaymentComplete(true);
      onSuccess?.();
    } catch {
      // Error handled by the hook's onError
    }
  };

  const handleClose = () => {
    if (paymentComplete) {
      onSuccess?.();
    }
    onOpenChange(false);
    setPaymentComplete(false);
  };

  const property = negotiation.property;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {paymentComplete ? (
          // Success State
          <>
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <DialogTitle className="text-center text-2xl">
                Payment Successful!
              </DialogTitle>
              <DialogDescription className="text-center">
                Your payment has been processed. The negotiation is now complete.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Home className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{property.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {property.city}, {property.country}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">Amount Paid</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatPrice(amount)}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          // Payment Pending State
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {isMockSession ? 'Complete Payment' : 'Processing Payment'}
              </DialogTitle>
              <DialogDescription>
                {isMockSession
                  ? 'Review and complete your mock payment for testing.'
                  : 'Please wait while we verify your payment...'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Property Info */}
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Home className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{property.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {property.city}, {property.country}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Payment Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purchase Amount</span>
                  <span className="font-medium">{formatPrice(amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform Fee (5%)</span>
                  <span className="font-medium">{formatPrice(platformFee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Total</span>
                  <span className="text-xl font-bold">{formatPrice(amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Seller Receives</span>
                  <span className="text-green-600">{formatPrice(sellerReceives)}</span>
                </div>
              </div>

              {/* Status indicator for Stripe flow */}
              {!isMockSession && isPolling && (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 p-3 text-blue-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Verifying payment with Stripe...</span>
                </div>
              )}

              {/* Mock payment notice */}
              {isMockSession && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    This is a test payment. No real charges will be made.
                  </span>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              {isMockSession && (
                <Button
                  onClick={handleCompleteMockPayment}
                  disabled={completeMockPayment.isPending}
                  className="gap-2"
                >
                  {completeMockPayment.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Complete Payment
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface PaymentCancelledToastProps {
  show: boolean;
  onClose: () => void;
}

export function PaymentCancelledNotice({
  show,
  onClose,
}: PaymentCancelledToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg bg-slate-800 px-4 py-3 text-white shadow-lg">
      <XCircle className="h-5 w-5 text-red-400" />
      <span>Payment was cancelled</span>
      <button
        onClick={onClose}
        className="ml-2 text-slate-400 hover:text-white"
      >
        &times;
      </button>
    </div>
  );
}
