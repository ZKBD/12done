'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ArrowLeft,
  Home,
  MapPin,
  Bed,
  Bath,
  Square,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
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
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { OfferActions } from '@/components/negotiations';
import {
  PaymentConfirmationModal,
  PaymentStatusCard,
  PaymentCancelledNotice,
} from '@/components/payments';
import { NegotiationMessages } from '@/components/messaging';
import {
  useNegotiation,
  useNegotiationOffers,
  useMarkNegotiationAsRead,
  useNegotiationTransaction,
} from '@/hooks/use-negotiations';
import { useCreateCheckout, useTransaction } from '@/hooks/use-payments';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/providers';
import { cn, getImageUrl } from '@/lib/utils';
import type { NegotiationStatus, OfferStatus, Offer } from '@/lib/types';

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

const offerStatusLabels: Record<OfferStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  COUNTERED: 'Countered',
  EXPIRED: 'Expired',
  WITHDRAWN: 'Withdrawn',
};

const offerStatusColors: Record<OfferStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  COUNTERED: 'bg-blue-100 text-blue-700',
  EXPIRED: 'bg-slate-100 text-slate-700',
  WITHDRAWN: 'bg-slate-100 text-slate-700',
};

export default function NegotiationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const negotiationId = params.id as string;

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [showCancelledNotice, setShowCancelledNotice] = useState(false);

  const { data: negotiation, isLoading, error, refetch } = useNegotiation(negotiationId);
  const { data: offers } = useNegotiationOffers(negotiationId);
  const { data: transaction } = useNegotiationTransaction(negotiationId);
  const markAsRead = useMarkNegotiationAsRead(negotiationId);
  const createCheckout = useCreateCheckout();

  // Handle payment callbacks from URL params
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');

    if (paymentStatus === 'success' && sessionId) {
      setCheckoutSessionId(sessionId);
      setShowPaymentModal(true);
      // Clear query params
      router.replace(`/dashboard/negotiations/${negotiationId}`, { scroll: false });
    } else if (paymentStatus === 'cancelled') {
      setShowCancelledNotice(true);
      toast({
        title: 'Payment Cancelled',
        description: 'Your payment was cancelled. You can try again when ready.',
        variant: 'default',
      });
      // Clear query params
      router.replace(`/dashboard/negotiations/${negotiationId}`, { scroll: false });
    }
  }, [searchParams, negotiationId, router, toast]);

  // Mark as read when viewing
  useEffect(() => {
    if (negotiation) {
      markAsRead.mutate();
    }
  }, [negotiation?.id]);

  const isBuyer = negotiation?.buyerId === user?.id;
  const isSeller = negotiation?.sellerId === user?.id;

  const latestOffer = useMemo(() => {
    if (!offers || offers.length === 0) return null;
    return offers[offers.length - 1];
  }, [offers]);

  const canAcceptOffer = useMemo(() => {
    if (!latestOffer || !negotiation) return false;
    return (
      negotiation.status === 'ACTIVE' &&
      latestOffer.status === 'PENDING' &&
      latestOffer.madeById !== user?.id
    );
  }, [latestOffer, negotiation, user]);

  const canRejectOffer = canAcceptOffer;

  const canCounterOffer = useMemo(() => {
    if (!latestOffer || !negotiation) return false;
    return (
      negotiation.status === 'ACTIVE' &&
      latestOffer.status === 'PENDING' &&
      latestOffer.madeById !== user?.id
    );
  }, [latestOffer, negotiation, user]);

  const canWithdrawOffer = useMemo(() => {
    if (!latestOffer || !negotiation) return false;
    return (
      negotiation.status === 'ACTIVE' &&
      latestOffer.status === 'PENDING' &&
      latestOffer.madeById === user?.id
    );
  }, [latestOffer, negotiation, user]);

  const canPay = useMemo(() => {
    return negotiation?.status === 'ACCEPTED' && isBuyer;
  }, [negotiation, isBuyer]);

  const formatPrice = (price: string, currency?: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  const handlePay = async () => {
    try {
      // Don't pass URLs - let backend use its defaults which include Stripe's {CHECKOUT_SESSION_ID} placeholder
      const result = await createCheckout.mutateAsync({
        negotiationId,
      });

      // Check if this is a mock session (for development/testing)
      if (result.url.includes('mock=true') || result.sessionId.startsWith('mock_')) {
        // For mock sessions, show the modal instead of redirecting
        setCheckoutSessionId(result.sessionId);
        setShowPaymentModal(true);
      } else {
        // For real Stripe sessions, redirect to Stripe checkout
        window.location.href = result.url;
      }
    } catch {
      // Error is handled by the hook's onError
    }
  };

  const handlePaymentSuccess = useCallback(() => {
    refetch();
    setShowPaymentModal(false);
    setCheckoutSessionId(null);
  }, [refetch]);

  if (isLoading) {
    return <NegotiationDetailSkeleton />;
  }

  if (error || !negotiation) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Negotiation not found</h2>
        <p className="text-muted-foreground mb-4">
          This negotiation doesn&apos;t exist or you don&apos;t have access.
        </p>
        <Link href="/dashboard/negotiations">
          <Button>Back to Negotiations</Button>
        </Link>
      </div>
    );
  }

  const property = negotiation.property;
  const otherParty = isBuyer ? negotiation.seller : negotiation.buyer;
  const primaryImage =
    property.media?.find((m) => m.isPrimary) || property.media?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/negotiations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Negotiation</h1>
            <Badge className={cn(statusColors[negotiation.status])}>
              {statusLabels[negotiation.status]}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
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
          <p className="text-muted-foreground">
            Started {formatDistanceToNow(new Date(negotiation.createdAt), { addSuffix: true })}
          </p>
        </div>

        {canPay && (
          <Button
            onClick={handlePay}
            disabled={createCheckout.isPending}
            className="gap-2"
          >
            {createCheckout.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Proceed to Payment
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Property Card */}
          <Card>
            <CardContent className="pt-6">
              <Link href={`/properties/${property.id}`} target="_blank">
                <div className="flex gap-4 hover:bg-muted/50 p-2 -m-2 rounded-lg transition-colors">
                  <div className="relative h-24 w-32 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                    {primaryImage ? (
                      <Image
                        src={getImageUrl(primaryImage.thumbnailUrl || primaryImage.url)}
                        alt={property.title}
                        fill
                        className="object-cover"
                        sizes="128px"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Home className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{property.title}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                      <MapPin className="h-3 w-3" />
                      {property.city}, {property.country}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      {property.bedrooms && (
                        <span className="flex items-center gap-1">
                          <Bed className="h-3 w-3" />
                          {property.bedrooms}
                        </span>
                      )}
                      {property.bathrooms && (
                        <span className="flex items-center gap-1">
                          <Bath className="h-3 w-3" />
                          {property.bathrooms}
                        </span>
                      )}
                      {property.squareMeters && (
                        <span className="flex items-center gap-1">
                          <Square className="h-3 w-3" />
                          {property.squareMeters} m²
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Asking</p>
                    <p className="font-semibold">
                      {formatPrice(property.basePrice, property.currency)}
                    </p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Offer Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Offer History</CardTitle>
              <CardDescription>
                All offers made in this negotiation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {offers && offers.length > 0 ? (
                <div className="space-y-4">
                  {offers.map((offer, index) => {
                    const isMyOffer = offer.madeById === user?.id;
                    const offerMaker = isMyOffer
                      ? user
                      : offer.madeById === negotiation.buyerId
                      ? negotiation.buyer
                      : negotiation.seller;
                    const isLatest = index === offers.length - 1;

                    return (
                      <div
                        key={offer.id}
                        className={cn(
                          'relative pl-6 pb-4',
                          index < offers.length - 1 && 'border-l-2 border-muted'
                        )}
                      >
                        {/* Timeline dot */}
                        <div
                          className={cn(
                            'absolute left-0 -translate-x-1/2 w-3 h-3 rounded-full',
                            offer.status === 'ACCEPTED'
                              ? 'bg-green-500'
                              : offer.status === 'REJECTED'
                              ? 'bg-red-500'
                              : offer.status === 'PENDING'
                              ? 'bg-amber-500'
                              : 'bg-slate-300'
                          )}
                        />

                        <div
                          className={cn(
                            'p-4 rounded-lg',
                            isMyOffer ? 'bg-primary/5' : 'bg-muted/50'
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                                <User className="h-4 w-4 text-slate-600" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {offerMaker?.firstName} {offerMaker?.lastName}
                                  {isMyOffer && (
                                    <span className="text-muted-foreground">
                                      {' '}
                                      (You)
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(
                                    new Date(offer.createdAt),
                                    'MMM d, yyyy h:mm a'
                                  )}
                                </p>
                              </div>
                            </div>
                            <Badge className={offerStatusColors[offer.status]}>
                              {offerStatusLabels[offer.status]}
                            </Badge>
                          </div>

                          <div className="text-2xl font-bold mb-2">
                            {formatPrice(offer.amount, offer.currency)}
                          </div>

                          {offer.message && (
                            <p className="text-sm text-muted-foreground italic mb-3">
                              &quot;{offer.message}&quot;
                            </p>
                          )}

                          {isLatest &&
                            offer.status === 'PENDING' &&
                            negotiation.status === 'ACTIVE' && (
                              <OfferActions
                                negotiationId={negotiationId}
                                offer={offer}
                                canAccept={canAcceptOffer}
                                canReject={canRejectOffer}
                                canCounter={canCounterOffer}
                                canWithdraw={canWithdrawOffer}
                              />
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No offers yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Other Party */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {isBuyer ? 'Seller' : 'Buyer'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center">
                  <User className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <p className="font-medium">
                    {otherParty.firstName} {otherParty.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Property {isBuyer ? 'Owner' : 'Interested'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Negotiation Type</span>
                <span className="font-medium">
                  {negotiation.type === 'BUY' ? 'Purchase' : 'Rental'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Asking Price</span>
                <span className="font-medium">
                  {formatPrice(property.basePrice, property.currency)}
                </span>
              </div>
              {latestOffer && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Latest Offer</span>
                    <span className="font-medium">
                      {formatPrice(latestOffer.amount, latestOffer.currency)}
                    </span>
                  </div>
                </>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Offers</span>
                <span className="font-medium">{offers?.length || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          <NegotiationMessages
            negotiationId={negotiationId}
            currentUserId={user?.id || ''}
          />

          {/* Status Message */}
          {negotiation.status === 'ACCEPTED' && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-800">Offer Accepted</p>
                    <p className="text-sm text-green-700">
                      {isBuyer
                        ? 'Proceed to payment to complete the transaction.'
                        : 'Waiting for buyer to complete payment.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {negotiation.status === 'COMPLETED' && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-800">Transaction Complete</p>
                    <p className="text-sm text-purple-700">
                      This negotiation has been successfully completed.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {negotiation.status === 'REJECTED' && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Negotiation Ended</p>
                    <p className="text-sm text-red-700">
                      This negotiation was declined.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Status Card - show when transaction exists */}
          {transaction && (
            <PaymentStatusCard
              transaction={transaction}
              isBuyer={isBuyer}
            />
          )}
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {negotiation && checkoutSessionId && (
        <PaymentConfirmationModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          negotiation={negotiation}
          sessionId={checkoutSessionId}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Payment Cancelled Notice */}
      <PaymentCancelledNotice
        show={showCancelledNotice}
        onClose={() => setShowCancelledNotice(false)}
      />
    </div>
  );
}

function NegotiationDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Skeleton className="h-24 w-32 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-20" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
