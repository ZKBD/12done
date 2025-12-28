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
import { cn } from '@/lib/utils';
import type { PropertyFormData } from '../property-wizard';

interface LocationStepProps {
  data: PropertyFormData;
  errors: Record<string, string>;
  onChange: (data: Partial<PropertyFormData>) => void;
}

// Common countries for the dropdown
const countries = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'PT', name: 'Portugal' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'MX', name: 'Mexico' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'PH', name: 'Philippines' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IN', name: 'India' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' },
  { code: 'GR', name: 'Greece' },
  { code: 'TR', name: 'Turkey' },
  { code: 'IL', name: 'Israel' },
];

export function LocationStep({ data, errors, onChange }: LocationStepProps) {
  return (
    <div className="space-y-6">
      {/* Country */}
      <div className="space-y-2">
        <Label htmlFor="country">
          Country <span className="text-red-500">*</span>
        </Label>
        <Select
          value={data.country}
          onValueChange={(value) => onChange({ country: value })}
        >
          <SelectTrigger className={cn(errors.country && 'border-red-500')}>
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            {countries.map((country) => (
              <SelectItem key={country.code} value={country.name}>
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.country && (
          <p className="text-sm text-red-500">{errors.country}</p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">
          Street Address <span className="text-red-500">*</span>
        </Label>
        <Input
          id="address"
          placeholder="e.g., 123 Main Street, Apt 4B"
          value={data.address}
          onChange={(e) => onChange({ address: e.target.value })}
          className={cn(errors.address && 'border-red-500')}
        />
        {errors.address && (
          <p className="text-sm text-red-500">{errors.address}</p>
        )}
      </div>

      {/* City and Postal Code */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">
            City <span className="text-red-500">*</span>
          </Label>
          <Input
            id="city"
            placeholder="e.g., New York"
            value={data.city}
            onChange={(e) => onChange({ city: e.target.value })}
            className={cn(errors.city && 'border-red-500')}
          />
          {errors.city && (
            <p className="text-sm text-red-500">{errors.city}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="postalCode">
            Postal Code <span className="text-red-500">*</span>
          </Label>
          <Input
            id="postalCode"
            placeholder="e.g., 10001"
            value={data.postalCode}
            onChange={(e) => onChange({ postalCode: e.target.value })}
            className={cn(errors.postalCode && 'border-red-500')}
          />
          {errors.postalCode && (
            <p className="text-sm text-red-500">{errors.postalCode}</p>
          )}
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="space-y-2">
        <Label>Map Location</Label>
        <div className="h-48 bg-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Map integration requires Google Maps API key
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Pin your exact location to help buyers find your property
        </p>
      </div>
    </div>
  );
}
