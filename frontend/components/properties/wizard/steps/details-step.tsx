'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Bed, Bath, Square, Building2, Calendar, PawPrint, UserX } from 'lucide-react';
import type { PropertyFormData } from '../property-wizard';

interface DetailsStepProps {
  data: PropertyFormData;
  errors: Record<string, string>;
  onChange: (data: Partial<PropertyFormData>) => void;
}

export function DetailsStep({ data, errors, onChange }: DetailsStepProps) {
  return (
    <div className="space-y-8">
      {/* Property Specs */}
      <div className="space-y-4">
        <h3 className="font-medium">Property Specifications</h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Bedrooms */}
          <div className="space-y-2">
            <Label htmlFor="bedrooms" className="flex items-center gap-2">
              <Bed className="h-4 w-4 text-muted-foreground" />
              Bedrooms
            </Label>
            <Input
              id="bedrooms"
              type="number"
              min="0"
              placeholder="e.g., 3"
              value={data.bedrooms ?? ''}
              onChange={(e) =>
                onChange({
                  bedrooms: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
            />
          </div>

          {/* Bathrooms */}
          <div className="space-y-2">
            <Label htmlFor="bathrooms" className="flex items-center gap-2">
              <Bath className="h-4 w-4 text-muted-foreground" />
              Bathrooms
            </Label>
            <Input
              id="bathrooms"
              type="number"
              min="0"
              step="0.5"
              placeholder="e.g., 2"
              value={data.bathrooms ?? ''}
              onChange={(e) =>
                onChange({
                  bathrooms: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
            />
          </div>

          {/* Square Meters */}
          <div className="space-y-2">
            <Label htmlFor="squareMeters" className="flex items-center gap-2">
              <Square className="h-4 w-4 text-muted-foreground" />
              Size (m²)
            </Label>
            <Input
              id="squareMeters"
              type="number"
              min="0"
              placeholder="e.g., 120"
              value={data.squareMeters ?? ''}
              onChange={(e) =>
                onChange({
                  squareMeters: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
            />
          </div>

          {/* Floors */}
          <div className="space-y-2">
            <Label htmlFor="floors" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Floors
            </Label>
            <Input
              id="floors"
              type="number"
              min="1"
              placeholder="e.g., 1"
              value={data.floors ?? ''}
              onChange={(e) =>
                onChange({
                  floors: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
            />
          </div>

          {/* Year Built */}
          <div className="space-y-2 col-span-2">
            <Label htmlFor="yearBuilt" className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Year Built
            </Label>
            <Input
              id="yearBuilt"
              type="number"
              min="1800"
              max={new Date().getFullYear()}
              placeholder="e.g., 2020"
              value={data.yearBuilt ?? ''}
              onChange={(e) =>
                onChange({
                  yearBuilt: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="space-y-4">
        <h3 className="font-medium">Preferences</h3>

        <div className="space-y-4">
          {/* Pet Friendly */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-full">
                <PawPrint className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <Label htmlFor="petFriendly" className="font-medium cursor-pointer">
                  Pet Friendly
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow pets at this property
                </p>
              </div>
            </div>
            <Switch
              id="petFriendly"
              checked={data.petFriendly}
              onCheckedChange={(checked) => onChange({ petFriendly: checked })}
            />
          </div>

          {/* No Agents */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <UserX className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <Label htmlFor="noAgents" className="font-medium cursor-pointer">
                  Direct Contact Only
                </Label>
                <p className="text-sm text-muted-foreground">
                  Prefer direct inquiries, no real estate agents
                </p>
              </div>
            </div>
            <Switch
              id="noAgents"
              checked={data.noAgents}
              onCheckedChange={(checked) => onChange({ noAgents: checked })}
            />
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        All fields on this page are optional. Fill in what applies to your property.
      </p>
    </div>
  );
}
