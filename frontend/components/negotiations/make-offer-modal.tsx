'use client';

import { useState } from 'react';
import { DollarSign, Loader2, Send } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateNegotiation } from '@/hooks/use-negotiations';
import type { Property } from '@/lib/types';

interface MakeOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
  onSuccess?: () => void;
}

export function MakeOfferModal({
  open,
  onOpenChange,
  property,
  onSuccess,
}: MakeOfferModalProps) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(property.currency);
  const [message, setMessage] = useState('');
  const [negotiationType, setNegotiationType] = useState<'BUY' | 'RENT'>(
    property.listingTypes.includes('FOR_SALE') ? 'BUY' : 'RENT'
  );

  const createNegotiation = useCreateNegotiation();

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    await createNegotiation.mutateAsync({
      propertyId: property.id,
      type: negotiationType,
      initialOfferAmount: parseFloat(amount),
      currency,
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const askingPrice = parseFloat(property.basePrice);
  const offerAmount = parseFloat(amount) || 0;
  const difference = offerAmount - askingPrice;
  const percentDiff = askingPrice > 0 ? (difference / askingPrice) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Make an Offer</DialogTitle>
          <DialogDescription>
            Submit your offer for &quot;{property.title}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Property Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Asking Price</p>
            <p className="text-xl font-bold">
              {formatPrice(askingPrice)}
              {negotiationType === 'RENT' && (
                <span className="text-sm font-normal text-muted-foreground">
                  {' '}
                  / month
                </span>
              )}
            </p>
          </div>

          {/* Negotiation Type */}
          {property.listingTypes.length > 1 && (
            <div className="space-y-2">
              <Label>I want to</Label>
              <Select
                value={negotiationType}
                onValueChange={(v) => setNegotiationType(v as 'BUY' | 'RENT')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {property.listingTypes.includes('FOR_SALE') && (
                    <SelectItem value="BUY">Buy this property</SelectItem>
                  )}
                  {(property.listingTypes.includes('SHORT_TERM_RENT') ||
                    property.listingTypes.includes('LONG_TERM_RENT')) && (
                    <SelectItem value="RENT">Rent this property</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Offer Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Your Offer</Label>
            <div className="flex gap-2">
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1">
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
          </div>

          {/* Offer Comparison */}
          {offerAmount > 0 && (
            <div
              className={`p-3 rounded-lg ${
                difference >= 0
                  ? 'bg-green-50 text-green-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              <p className="text-sm">
                Your offer is{' '}
                <strong>
                  {formatPrice(Math.abs(difference))} (
                  {percentDiff >= 0 ? '+' : ''}
                  {percentDiff.toFixed(1)}%)
                </strong>{' '}
                {difference >= 0 ? 'above' : 'below'} asking price
              </p>
            </div>
          )}

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to the seller..."
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
            disabled={createNegotiation.isPending || !amount || parseFloat(amount) <= 0}
            className="gap-2"
          >
            {createNegotiation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Offer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
