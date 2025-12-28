'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Eye,
  Trash2,
  Play,
  Pause,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  usePropertyForEdit,
  useUpdateProperty,
  useDeleteProperty,
  usePublishProperty,
  useUpdatePropertyStatus,
} from '@/hooks/use-my-properties';
import { MediaUploader } from '@/components/properties/media-uploader';
import { AvailabilityCalendar } from '@/components/properties/availability-calendar';
import { PricingRules } from '@/components/properties/pricing-rules';
import { cn } from '@/lib/utils';
import type { ListingType, PropertyStatus } from '@/lib/types';

const listingTypeOptions: { value: ListingType; label: string }[] = [
  { value: 'FOR_SALE', label: 'For Sale' },
  { value: 'LONG_TERM_RENT', label: 'Long-term Rent' },
  { value: 'SHORT_TERM_RENT', label: 'Short-term Rent' },
  { value: 'EVENTS', label: 'Events' },
  { value: 'BARTER', label: 'Barter' },
];

const statusLabels: Record<PropertyStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  SOLD: 'Sold',
  RENTED: 'Rented',
  EXPIRED: 'Expired',
  DELETED: 'Deleted',
};

const statusColors: Record<PropertyStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  SOLD: 'bg-blue-100 text-blue-700',
  RENTED: 'bg-purple-100 text-purple-700',
  EXPIRED: 'bg-red-100 text-red-700',
  DELETED: 'bg-red-100 text-red-700',
};

export default function PropertyEditPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [listingTypes, setListingTypes] = useState<ListingType[]>([]);
  const [basePrice, setBasePrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [squareMeters, setSquareMeters] = useState('');
  const [floors, setFloors] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [petFriendly, setPetFriendly] = useState(false);
  const [noAgents, setNoAgents] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  const { data: property, isLoading, error } = usePropertyForEdit(propertyId);
  const updateProperty = useUpdateProperty(propertyId);
  const deleteProperty = useDeleteProperty();
  const publishProperty = usePublishProperty(propertyId);
  const updateStatus = useUpdatePropertyStatus(propertyId);

  // Initialize form when property loads
  if (property && !formInitialized) {
    setTitle(property.title);
    setDescription(property.description || '');
    setAddress(property.address);
    setCity(property.city);
    setPostalCode(property.postalCode);
    setCountry(property.country);
    setListingTypes(property.listingTypes);
    setBasePrice(property.basePrice);
    setCurrency(property.currency);
    setBedrooms(property.bedrooms?.toString() || '');
    setBathrooms(property.bathrooms?.toString() || '');
    setSquareMeters(property.squareMeters?.toString() || '');
    setFloors(property.floors?.toString() || '');
    setYearBuilt(property.yearBuilt?.toString() || '');
    setPetFriendly(property.petFriendly);
    setNoAgents(property.noAgents);
    setFormInitialized(true);
  }

  const isRental = useMemo(
    () =>
      listingTypes.includes('SHORT_TERM_RENT') ||
      listingTypes.includes('LONG_TERM_RENT'),
    [listingTypes]
  );

  const handleListingTypeChange = (type: ListingType, checked: boolean) => {
    setListingTypes((prev) =>
      checked ? [...prev, type] : prev.filter((t) => t !== type)
    );
  };

  const handleSave = async () => {
    await updateProperty.mutateAsync({
      title,
      description: description || undefined,
      address,
      city,
      postalCode,
      country,
      listingTypes,
      basePrice: parseFloat(basePrice),
      currency,
      bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
      bathrooms: bathrooms ? parseFloat(bathrooms) : undefined,
      squareMeters: squareMeters ? parseInt(squareMeters) : undefined,
      floors: floors ? parseInt(floors) : undefined,
      yearBuilt: yearBuilt ? parseInt(yearBuilt) : undefined,
      petFriendly,
      noAgents,
    });
  };

  const handlePublish = async () => {
    await publishProperty.mutateAsync();
  };

  const handlePause = async () => {
    await updateStatus.mutateAsync('PAUSED');
  };

  const handleUnpause = async () => {
    await updateStatus.mutateAsync('ACTIVE');
  };

  const handleDelete = async () => {
    await deleteProperty.mutateAsync(propertyId);
    router.push('/dashboard/properties');
  };

  if (isLoading) {
    return <PropertyEditSkeleton />;
  }

  if (error || !property) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Property not found</h2>
        <p className="text-muted-foreground mb-4">
          The property you're looking for doesn't exist or you don't have access.
        </p>
        <Link href="/dashboard/properties">
          <Button>Back to Properties</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/properties">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{property.title}</h1>
              <Badge className={cn('ml-2', statusColors[property.status])}>
                {statusLabels[property.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {property.city}, {property.country}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/properties/${propertyId}`} target="_blank">
            <Button variant="outline" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </Button>
          </Link>

          {property.status === 'DRAFT' && (
            <Button
              onClick={handlePublish}
              disabled={publishProperty.isPending}
              className="gap-2"
            >
              {publishProperty.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Publish
            </Button>
          )}

          {property.status === 'ACTIVE' && (
            <Button
              variant="outline"
              onClick={handlePause}
              disabled={updateStatus.isPending}
              className="gap-2"
            >
              {updateStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
              Pause
            </Button>
          )}

          {property.status === 'PAUSED' && (
            <Button
              onClick={handleUnpause}
              disabled={updateStatus.isPending}
              className="gap-2"
            >
              {updateStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Reactivate
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          {isRental && <TabsTrigger value="availability">Availability</TabsTrigger>}
          {isRental && <TabsTrigger value="pricing">Pricing Rules</TabsTrigger>}
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update your property details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Property Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Listing Types */}
              <div className="space-y-3">
                <Label>Listing Types</Label>
                <div className="flex flex-wrap gap-3">
                  {listingTypeOptions.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors',
                        listingTypes.includes(option.value)
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <Checkbox
                        checked={listingTypes.includes(option.value)}
                        onCheckedChange={(checked) =>
                          handleListingTypeChange(option.value, checked as boolean)
                        }
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code</Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min="0"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min="0"
                    step="0.5"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="squareMeters">Size (m²)</Label>
                  <Input
                    id="squareMeters"
                    type="number"
                    min="0"
                    value={squareMeters}
                    onChange={(e) => setSquareMeters(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floors">Floors</Label>
                  <Input
                    id="floors"
                    type="number"
                    min="1"
                    value={floors}
                    onChange={(e) => setFloors(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearBuilt">Year Built</Label>
                  <Input
                    id="yearBuilt"
                    type="number"
                    min="1800"
                    max={new Date().getFullYear()}
                    value={yearBuilt}
                    onChange={(e) => setYearBuilt(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="petFriendly">Pet Friendly</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow pets at this property
                    </p>
                  </div>
                  <Switch
                    id="petFriendly"
                    checked={petFriendly}
                    onCheckedChange={setPetFriendly}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="noAgents">Direct Contact Only</Label>
                    <p className="text-sm text-muted-foreground">
                      Prefer direct inquiries, no agents
                    </p>
                  </div>
                  <Switch
                    id="noAgents"
                    checked={noAgents}
                    onCheckedChange={setNoAgents}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="space-y-2 w-[140px]">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                      <SelectItem value="AUD">AUD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex-1">
                  <Label htmlFor="basePrice">Base Price</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex items-center justify-between">
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Property
            </Button>

            <Button
              onClick={handleSave}
              disabled={updateProperty.isPending}
              className="gap-2"
            >
              {updateProperty.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media">
          <Card>
            <CardHeader>
              <CardTitle>Photos & Media</CardTitle>
              <CardDescription>
                Add photos to showcase your property
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MediaUploader propertyId={propertyId} media={property.media} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Availability Tab */}
        {isRental && (
          <TabsContent value="availability">
            <Card>
              <CardHeader>
                <CardTitle>Availability Calendar</CardTitle>
                <CardDescription>
                  Manage when your property is available for booking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AvailabilityCalendar
                  propertyId={propertyId}
                  basePrice={parseFloat(basePrice) || 0}
                  currency={currency}
                  isRental={isRental}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Pricing Rules Tab */}
        {isRental && (
          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle>Dynamic Pricing</CardTitle>
                <CardDescription>
                  Set up rules to automatically adjust your pricing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PricingRules
                  propertyId={propertyId}
                  basePrice={parseFloat(basePrice) || 0}
                  currency={currency}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Property</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{property.title}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteProperty.isPending}
            >
              {deleteProperty.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Property'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PropertyEditSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
