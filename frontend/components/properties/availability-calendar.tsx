'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  DollarSign,
  Loader2,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  usePropertyAvailability,
  useUpdateAvailability,
  useBlockDates,
  useUnblockDates,
} from '@/hooks/use-my-properties';
import type { AvailabilitySlot } from '@/lib/api/properties';

interface AvailabilityCalendarProps {
  propertyId: string;
  basePrice: number;
  currency: string;
  isRental?: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function AvailabilityCalendar({
  propertyId,
  basePrice,
  currency,
  isRental = true,
}: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectMode, setSelectMode] = useState<'single' | 'range'>('single');
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [customPrice, setCustomPrice] = useState('');
  const [blockReason, setBlockReason] = useState('');

  // Calculate date range for the current month view
  const { startDate, endDate } = useMemo(() => {
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [currentDate]);

  const { data: availability, isLoading } = usePropertyAvailability(
    propertyId,
    startDate,
    endDate
  );

  const updateAvailability = useUpdateAvailability(propertyId);
  const blockDates = useBlockDates(propertyId);
  const unblockDates = useUnblockDates(propertyId);

  // Create a map of date string to availability slot
  const availabilityMap = useMemo(() => {
    const map = new Map<string, AvailabilitySlot>();
    availability?.forEach((slot) => {
      map.set(slot.date, slot);
    });
    return map;
  }, [availability]);

  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentDate]);

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const handleDateClick = useCallback(
    (date: Date) => {
      if (selectMode === 'single') {
        setSelectedDates((prev) => {
          const dateStr = date.toISOString().split('T')[0];
          const exists = prev.some(
            (d) => d.toISOString().split('T')[0] === dateStr
          );
          if (exists) {
            return prev.filter(
              (d) => d.toISOString().split('T')[0] !== dateStr
            );
          }
          return [...prev, date];
        });
      } else {
        // Range selection
        if (!rangeStart) {
          setRangeStart(date);
          setSelectedDates([date]);
        } else {
          const start = rangeStart < date ? rangeStart : date;
          const end = rangeStart < date ? date : rangeStart;
          const dates: Date[] = [];

          const current = new Date(start);
          while (current <= end) {
            dates.push(new Date(current));
            current.setDate(current.getDate() + 1);
          }

          setSelectedDates(dates);
          setRangeStart(null);
        }
      }
    },
    [selectMode, rangeStart]
  );

  const clearSelection = () => {
    setSelectedDates([]);
    setRangeStart(null);
  };

  const handleBlockDates = async () => {
    if (selectedDates.length === 0) return;

    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    const startDateStr = sortedDates[0].toISOString().split('T')[0];
    const endDateStr = sortedDates[sortedDates.length - 1].toISOString().split('T')[0];

    await blockDates.mutateAsync({
      startDate: startDateStr,
      endDate: endDateStr,
      reason: blockReason || undefined,
    });

    setBlockDialogOpen(false);
    setBlockReason('');
    clearSelection();
  };

  const handleUnblockDates = async () => {
    if (selectedDates.length === 0) return;

    const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
    const startDateStr = sortedDates[0].toISOString().split('T')[0];
    const endDateStr = sortedDates[sortedDates.length - 1].toISOString().split('T')[0];

    await unblockDates.mutateAsync({
      startDate: startDateStr,
      endDate: endDateStr,
    });

    clearSelection();
  };

  const handleSetCustomPrice = async () => {
    if (selectedDates.length === 0 || !customPrice) return;

    const price = parseFloat(customPrice);
    if (isNaN(price) || price <= 0) return;

    const dates = selectedDates.map((d) => ({
      date: d.toISOString().split('T')[0],
      isAvailable: true,
      price,
    }));

    await updateAvailability.mutateAsync({ dates });

    setPriceDialogOpen(false);
    setCustomPrice('');
    clearSelection();
  };

  const isDateSelected = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return selectedDates.some((d) => d.toISOString().split('T')[0] === dateStr);
  };

  const isDateBlocked = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const slot = availabilityMap.get(dateStr);
    return slot && !slot.isAvailable;
  };

  const getDatePrice = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const slot = availabilityMap.get(dateStr);
    return slot?.price ? parseFloat(slot.price) : basePrice;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[180px] text-center">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={selectMode === 'single' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectMode('single');
              clearSelection();
            }}
          >
            Single
          </Button>
          <Button
            variant={selectMode === 'range' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setSelectMode('range');
              clearSelection();
            }}
          >
            Range
          </Button>
        </div>
      </div>

      {/* Selection Actions */}
      {selectedDates.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
          <span className="text-sm font-medium">
            {selectedDates.length} {selectedDates.length === 1 ? 'day' : 'days'}{' '}
            selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBlockDialogOpen(true)}
            >
              <Lock className="h-4 w-4 mr-1" />
              Block
            </Button>
            <Button variant="outline" size="sm" onClick={handleUnblockDates}>
              <Unlock className="h-4 w-4 mr-1" />
              Unblock
            </Button>
            {isRental && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPriceDialogOpen(true)}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Set Price
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {DAYS.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="p-2 h-20" />;
              }

              const isPast = date < today;
              const isBlocked = isDateBlocked(date);
              const isSelected = isDateSelected(date);
              const price = getDatePrice(date);
              const hasCustomPrice = price !== basePrice;

              return (
                <button
                  key={date.toISOString()}
                  disabled={isPast}
                  onClick={() => handleDateClick(date)}
                  className={cn(
                    'p-2 h-20 border-t border-l first:border-l-0 text-left transition-colors relative',
                    isPast && 'opacity-40 cursor-not-allowed bg-muted/30',
                    !isPast && 'hover:bg-muted/50 cursor-pointer',
                    isSelected && 'bg-primary/10 hover:bg-primary/20',
                    isBlocked && !isSelected && 'bg-red-50'
                  )}
                >
                  <div className="flex flex-col h-full">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        date.toDateString() === new Date().toDateString() &&
                          'text-primary'
                      )}
                    >
                      {date.getDate()}
                    </span>
                    {!isPast && isRental && (
                      <span
                        className={cn(
                          'text-xs mt-auto',
                          hasCustomPrice
                            ? 'text-primary font-medium'
                            : 'text-muted-foreground'
                        )}
                      >
                        {formatPrice(price)}
                      </span>
                    )}
                    {isBlocked && (
                      <Lock className="absolute top-1 right-1 h-3 w-3 text-red-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted/30" />
          <span className="text-muted-foreground">Past</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-50 border border-red-200" />
          <span className="text-muted-foreground">Blocked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary/10 border border-primary/20" />
          <span className="text-muted-foreground">Selected</span>
        </div>
      </div>

      {/* Block Dates Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Dates</DialogTitle>
            <DialogDescription>
              Block {selectedDates.length}{' '}
              {selectedDates.length === 1 ? 'day' : 'days'} from being booked.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                placeholder="e.g., Personal use, Maintenance"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBlockDates}
              disabled={blockDates.isPending}
            >
              {blockDates.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Blocking...
                </>
              ) : (
                'Block Dates'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Price Dialog */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Custom Price</DialogTitle>
            <DialogDescription>
              Set a custom price for {selectedDates.length}{' '}
              {selectedDates.length === 1 ? 'day' : 'days'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customPrice">Price per night ({currency})</Label>
              <Input
                id="customPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder={basePrice.toString()}
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Base price: {formatPrice(basePrice)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSetCustomPrice}
              disabled={updateAvailability.isPending || !customPrice}
            >
              {updateAvailability.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Set Price'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
