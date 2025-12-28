'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Pause,
  Play,
  BarChart3,
  Home,
  Loader2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useMyProperties,
  useDeleteProperty,
  useUpdatePropertyStatus,
} from '@/hooks/use-my-properties';
import type { Property, PropertyStatus, ListingType } from '@/lib/types';
import { cn, getImageUrl } from '@/lib/utils';

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

const listingTypeLabels: Record<ListingType, string> = {
  FOR_SALE: 'Sale',
  SHORT_TERM_RENT: 'Short-term',
  LONG_TERM_RENT: 'Long-term',
  EVENTS: 'Events',
  BARTER: 'Barter',
};

export default function DashboardPropertiesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | 'ALL'>(
    'ALL'
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(
    null
  );

  const params = useMemo(
    () => ({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      limit: 20,
    }),
    [statusFilter]
  );

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMyProperties(params);

  const deleteProperty = useDeleteProperty();

  const properties = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  const handleDeleteClick = (property: Property) => {
    setPropertyToDelete(property);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (propertyToDelete) {
      await deleteProperty.mutateAsync(propertyToDelete.id);
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
    }
  };

  const formatPrice = (price: string, currency: string) => {
    const num = parseFloat(price);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Properties</h1>
          <p className="text-muted-foreground">
            Manage your property listings
          </p>
        </div>
        <Link href="/dashboard/properties/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">All Listings</CardTitle>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as PropertyStatus | 'ALL')
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="SOLD">Sold</SelectItem>
                <SelectItem value="RENTED">Rented</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PropertiesTableSkeleton />
          ) : properties.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Property</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map((property) => (
                      <PropertyRow
                        key={property.id}
                        property={property}
                        onDelete={() => handleDeleteClick(property)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {hasNextPage && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load more'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Property</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{propertyToDelete?.title}
              &quot;? This action cannot be undone.
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
              onClick={handleConfirmDelete}
              disabled={deleteProperty.isPending}
            >
              {deleteProperty.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PropertyRow({
  property,
  onDelete,
}: {
  property: Property;
  onDelete: () => void;
}) {
  const router = useRouter();
  const updateStatus = useUpdatePropertyStatus(property.id);

  const primaryImage = property.media?.find((m) => m.isPrimary) || property.media?.[0];

  const handlePause = () => {
    updateStatus.mutate('PAUSED');
  };

  const handleUnpause = () => {
    updateStatus.mutate('ACTIVE');
  };

  const formatPrice = (price: string, currency: string) => {
    const num = parseFloat(price);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-16 rounded-md overflow-hidden bg-slate-100 flex-shrink-0">
            {primaryImage ? (
              <Image
                src={getImageUrl(primaryImage.thumbnailUrl || primaryImage.url)}
                alt={property.title}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Home className="h-5 w-5 text-slate-400" />
              </div>
            )}
          </div>
          <div>
            <Link
              href={`/dashboard/properties/${property.id}`}
              className="font-medium hover:underline"
            >
              {property.title}
            </Link>
            <p className="text-sm text-muted-foreground">
              {property.city}, {property.country}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {property.listingTypes.slice(0, 2).map((type) => (
            <Badge key={type} variant="outline" className="text-xs">
              {listingTypeLabels[type]}
            </Badge>
          ))}
          {property.listingTypes.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{property.listingTypes.length - 2}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className="font-medium">
          {formatPrice(property.basePrice, property.currency)}
        </span>
      </TableCell>
      <TableCell>
        <Badge className={cn('font-medium', statusColors[property.status])}>
          {statusLabels[property.status]}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/properties/${property.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                View Listing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/properties/${property.id}`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/properties/${property.id}/stats`}>
                <BarChart3 className="h-4 w-4 mr-2" />
                View Stats
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {property.status === 'ACTIVE' && (
              <DropdownMenuItem onClick={handlePause}>
                <Pause className="h-4 w-4 mr-2" />
                Pause Listing
              </DropdownMenuItem>
            )}
            {property.status === 'PAUSED' && (
              <DropdownMenuItem onClick={handleUnpause}>
                <Play className="h-4 w-4 mr-2" />
                Reactivate
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function EmptyState() {
  return (
    <div className="py-12 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Home className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
      <p className="text-muted-foreground mb-6">
        Create your first property listing to get started.
      </p>
      <Link href="/dashboard/properties/new">
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Property
        </Button>
      </Link>
    </div>
  );
}

function PropertiesTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Property</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-16 rounded-md" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="h-8 w-8 ml-auto" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
