'use client';

import { useState } from 'react';
import { Check, X, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useAcceptOffer,
  useRejectOffer,
  useWithdrawOffer,
} from '@/hooks/use-negotiations';
import { CounterOfferModal } from './counter-offer-modal';
import type { Offer } from '@/lib/types';

// We need to create AlertDialog component
interface OfferActionsProps {
  negotiationId: string;
  offer: Offer;
  canAccept: boolean;
  canReject: boolean;
  canCounter: boolean;
  canWithdraw: boolean;
  onAction?: () => void;
}

export function OfferActions({
  negotiationId,
  offer,
  canAccept,
  canReject,
  canCounter,
  canWithdraw,
  onAction,
}: OfferActionsProps) {
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [counterOfferOpen, setCounterOfferOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const acceptOffer = useAcceptOffer(negotiationId);
  const rejectOffer = useRejectOffer(negotiationId);
  const withdrawOffer = useWithdrawOffer(negotiationId);

  const handleAccept = async () => {
    await acceptOffer.mutateAsync(offer.id);
    setAcceptDialogOpen(false);
    onAction?.();
  };

  const handleReject = async () => {
    await rejectOffer.mutateAsync({
      offerId: offer.id,
      reason: rejectReason || undefined,
    });
    setRejectDialogOpen(false);
    setRejectReason('');
    onAction?.();
  };

  const handleWithdraw = async () => {
    await withdrawOffer.mutateAsync(offer.id);
    setWithdrawDialogOpen(false);
    onAction?.();
  };

  const formatPrice = (price: string, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canAccept && (
          <Button
            size="sm"
            onClick={() => setAcceptDialogOpen(true)}
            className="gap-1"
          >
            <Check className="h-4 w-4" />
            Accept
          </Button>
        )}

        {canCounter && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCounterOfferOpen(true)}
            className="gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            Counter
          </Button>
        )}

        {canReject && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRejectDialogOpen(true)}
            className="gap-1 text-red-600 hover:text-red-700"
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
        )}

        {canWithdraw && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setWithdrawDialogOpen(true)}
            className="gap-1 text-muted-foreground"
          >
            Withdraw
          </Button>
        )}
      </div>

      {/* Accept Dialog */}
      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Offer</DialogTitle>
            <DialogDescription>
              Are you sure you want to accept this offer of{' '}
              <strong>{formatPrice(offer.amount, offer.currency)}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">What happens next:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>The buyer will be notified to proceed with payment</li>
                  <li>You&apos;ll receive funds after successful payment</li>
                  <li>The property status will be updated</li>
                </ul>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAcceptDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAccept}
              disabled={acceptOffer.isPending}
              className="gap-2"
            >
              {acceptOffer.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Accept Offer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Offer</DialogTitle>
            <DialogDescription>
              Decline this offer of{' '}
              <strong>{formatPrice(offer.amount, offer.currency)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p>
                    Consider sending a counter offer instead. This keeps the
                    negotiation open.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Let them know why you're declining..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectOffer.isPending}
              className="gap-2"
            >
              {rejectOffer.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <X className="h-4 w-4" />
                  Reject Offer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Offer</DialogTitle>
            <DialogDescription>
              Are you sure you want to withdraw your offer of{' '}
              <strong>{formatPrice(offer.amount, offer.currency)}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              You can submit a new offer after withdrawing this one.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setWithdrawDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleWithdraw}
              disabled={withdrawOffer.isPending}
              className="gap-2"
            >
              {withdrawOffer.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Withdrawing...
                </>
              ) : (
                'Withdraw Offer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Counter Offer Modal */}
      <CounterOfferModal
        open={counterOfferOpen}
        onOpenChange={setCounterOfferOpen}
        negotiationId={negotiationId}
        currentOffer={offer}
        onSuccess={onAction}
      />
    </>
  );
}
