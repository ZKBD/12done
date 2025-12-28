'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { PropertyFormData } from '../property-wizard';
import type { ListingType } from '@/lib/types';

interface BasicInfoStepProps {
  data: PropertyFormData;
  errors: Record<string, string>;
  onChange: (data: Partial<PropertyFormData>) => void;
}

const listingTypes: { value: ListingType; label: string; description: string }[] = [
  {
    value: 'FOR_SALE',
    label: 'For Sale',
    description: 'List your property for sale',
  },
  {
    value: 'LONG_TERM_RENT',
    label: 'Long-term Rent',
    description: 'Rent for 6+ months',
  },
  {
    value: 'SHORT_TERM_RENT',
    label: 'Short-term Rent',
    description: 'Vacation rentals and short stays',
  },
  {
    value: 'EVENTS',
    label: 'Events',
    description: 'Host events and gatherings',
  },
  {
    value: 'BARTER',
    label: 'Barter',
    description: 'Exchange for goods or services',
  },
];

export function BasicInfoStep({ data, errors, onChange }: BasicInfoStepProps) {
  const handleListingTypeChange = (type: ListingType, checked: boolean) => {
    const newTypes = checked
      ? [...data.listingTypes, type]
      : data.listingTypes.filter((t) => t !== type);
    onChange({ listingTypes: newTypes });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Property Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          placeholder="e.g., Modern 2-bedroom apartment in downtown"
          value={data.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className={cn(errors.title && 'border-red-500')}
        />
        {errors.title && (
          <p className="text-sm text-red-500">{errors.title}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Create a catchy title that describes your property
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe your property, its features, and what makes it special..."
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={5}
        />
        <p className="text-sm text-muted-foreground">
          A detailed description helps attract potential buyers or renters
        </p>
      </div>

      {/* Listing Types */}
      <div className="space-y-3">
        <Label>
          Listing Type <span className="text-red-500">*</span>
        </Label>
        <p className="text-sm text-muted-foreground">
          Select all that apply to your property
        </p>
        <div className="grid gap-3">
          {listingTypes.map((type) => (
            <label
              key={type.value}
              className={cn(
                'flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors',
                data.listingTypes.includes(type.value)
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              )}
            >
              <Checkbox
                checked={data.listingTypes.includes(type.value)}
                onCheckedChange={(checked) =>
                  handleListingTypeChange(type.value, checked as boolean)
                }
                className="mt-0.5"
              />
              <div>
                <div className="font-medium">{type.label}</div>
                <div className="text-sm text-muted-foreground">
                  {type.description}
                </div>
              </div>
            </label>
          ))}
        </div>
        {errors.listingTypes && (
          <p className="text-sm text-red-500">{errors.listingTypes}</p>
        )}
      </div>
    </div>
  );
}
