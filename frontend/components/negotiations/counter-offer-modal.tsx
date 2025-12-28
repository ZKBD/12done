'use client';

import { useState } from 'react';
import { DollarSign, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useMakeOffer } from '@/hooks/use-negotiations';
import type { Offer } from '@/lib/types';

interface CounterOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  negotiationId: string;
  currentOffer: Offer;
  onSuccess?: () => void;
}

export function CounterOfferModal({
  open,
  onOpenChange,
  negotiationId,
  currentOffer,
  onSuccess,
}: CounterOfferModalProps) {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');

  const makeOffer = useMakeOffer(negotiationId);

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    await makeOffer.mutateAsync({
      amount: parseFloat(amount),
      currency: currentOffer.currency,
      message: message || undefined,
    });

    onOpenChange(false);
    resetForm();
    onSuccess?.();
  };

  const resetForm = () => {
    setAmount('');
    setMessage('');
  };

  const formatPrice = (price: number | string) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currentOffer.currency,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const currentAmount = parseFloat(currentOffer.amount);
  const newAmount = parseFloat(amount) || 0;
  const difference = newAmount - currentAmount;
  const percentDiff = currentAmount > 0 ? (difference / currentAmount) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Counter Offer</DialogTitle>
          <DialogDescription>
            Respond with your counter offer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Offer */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Current Offer</p>
            <p className="text-xl font-bold">{formatPrice(currentOffer.amount)}</p>
            {currentOffer.message && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                &quot;{currentOffer.message}&quot;
              </p>
            )}
          </div>

          {/* Counter Offer Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Your Counter Offer</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Comparison */}
          {newAmount > 0 && (
            <div className="flex items-center justify-center gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Their offer</p>
                <p className="font-semibold">{formatPrice(currentAmount)}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Your counter</p>
                <p className="font-semibold">{formatPrice(newAmount)}</p>
              </div>
              <div
                className={`text-center ${
                  difference >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                <p className="text-xs">Change</p>
                <p className="font-semibold">
                  {percentDiff >= 0 ? '+' : ''}
                  {percentDiff.toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Explain your counter offer..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={makeOffer.isPending || !amount || parseFloat(amount) <= 0}
            className="gap-2"
          >
            {makeOffer.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Counter Offer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
