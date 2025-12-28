'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DollarSign, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PropertyFormData } from '../property-wizard';

interface PricingStepProps {
  data: PropertyFormData;
  errors: Record<string, string>;
  onChange: (data: Partial<PropertyFormData>) => void;
}

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
];

export function PricingStep({ data, errors, onChange }: PricingStepProps) {
  const isRental =
    data.listingTypes.includes('SHORT_TERM_RENT') ||
    data.listingTypes.includes('LONG_TERM_RENT');
  const isShortTerm = data.listingTypes.includes('SHORT_TERM_RENT');

  const selectedCurrency = currencies.find((c) => c.code === data.currency);

  return (
    <div className="space-y-6">
      {/* Price Input */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="basePrice">
            {isRental ? 'Rental Price' : 'Asking Price'}{' '}
            <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-3">
            <Select
              value={data.currency}
              onValueChange={(value) => onChange({ currency: value })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code} ({currency.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="basePrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={data.basePrice || ''}
                onChange={(e) =>
                  onChange({
                    basePrice: e.target.value ? parseFloat(e.target.value) : 0,
                  })
                }
                className={cn('pl-10', errors.basePrice && 'border-red-500')}
              />
            </div>
          </div>
          {errors.basePrice && (
            <p className="text-sm text-red-500">{errors.basePrice}</p>
          )}
          {isRental && (
            <p className="text-sm text-muted-foreground">
              {isShortTerm ? 'Price per night' : 'Price per month'}
            </p>
          )}
        </div>

        {/* Price Preview */}
        {data.basePrice > 0 && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: data.currency,
                maximumFractionDigits: 0,
              }).format(data.basePrice)}
              {isRental && (
                <span className="text-base font-normal text-muted-foreground">
                  {isShortTerm ? ' / night' : ' / month'}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              This is how your price will appear to potential{' '}
              {isRental ? 'renters' : 'buyers'}
            </p>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Pricing Tips</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>Research similar properties in your area for competitive pricing</li>
            <li>Consider seasonal demand if offering short-term rentals</li>
            <li>You can set up dynamic pricing rules after creating your listing</li>
          </ul>
        </div>
      </div>

      {/* Platform Fee Notice */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Platform Fee:</strong> 12done.com charges a small commission
          on successful transactions. The exact fee depends on your listing type
          and will be displayed before any transaction is completed.
        </p>
      </div>
    </div>
  );
}
