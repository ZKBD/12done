'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Plus,
  Search,
  Trash2,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Loader2,
  Clock,
  Zap,
  CalendarDays,
  Home,
  DollarSign,
  BedDouble,
  Bath,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useSearchAgents,
  useCreateSearchAgent,
  useDeleteSearchAgent,
  useToggleSearchAgent,
  useRunSearchAgent,
} from '@/hooks/use-search-agents';
import { cn } from '@/lib/utils';
import type { SearchAgent, SearchAgentCriteria } from '@/lib/types';

const frequencyLabels = {
  INSTANT: 'Instant',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
};

const frequencyIcons = {
  INSTANT: Zap,
  DAILY: Clock,
  WEEKLY: CalendarDays,
};

const frequencyColors = {
  INSTANT: 'text-amber-600 bg-amber-100',
  DAILY: 'text-blue-600 bg-blue-100',
  WEEKLY: 'text-purple-600 bg-purple-100',
};

export default function SearchAgentsPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<SearchAgent | null>(null);

  const { data, isLoading } = useSearchAgents();
  const createAgent = useCreateSearchAgent();
  const deleteAgent = useDeleteSearchAgent();
  const toggleAgent = useToggleSearchAgent();
  const runAgent = useRunSearchAgent();

  const agents = data?.data || [];

  const handleToggle = (id: string) => {
    toggleAgent.mutate(id);
  };

  const handleRun = (id: string) => {
    runAgent.mutate(id);
  };

  const handleDelete = () => {
    if (selectedAgent) {
      deleteAgent.mutate(selectedAgent.id);
      setDeleteDialogOpen(false);
      setSelectedAgent(null);
    }
  };

  const formatCriteria = (criteria: SearchAgentCriteria): string[] => {
    const parts: string[] = [];

    if (criteria.listingType) {
      parts.push(criteria.listingType === 'SALE' ? 'For Sale' : 'For Rent');
    }
    if (criteria.propertyType) {
      parts.push(criteria.propertyType);
    }
    if (criteria.minPrice || criteria.maxPrice) {
      const min = criteria.minPrice
        ? `$${(criteria.minPrice / 1000).toFixed(0)}k`
        : '';
      const max = criteria.maxPrice
        ? `$${(criteria.maxPrice / 1000).toFixed(0)}k`
        : '';
      parts.push(min && max ? `${min} - ${max}` : min || `Up to ${max}`);
    }
    if (criteria.minBedrooms || criteria.maxBedrooms) {
      const min = criteria.minBedrooms || 0;
      const max = criteria.maxBedrooms;
      parts.push(max ? `${min}-${max} beds` : `${min}+ beds`);
    }
    if (criteria.city) {
      parts.push(criteria.city);
    }

    return parts.length > 0 ? parts : ['Any property'];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Search Agents</h1>
          <p className="text-muted-foreground">
            Get notified when properties match your criteria
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Agent
        </Button>
      </div>

      {/* Agents List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <EmptyState onCreateClick={() => setCreateModalOpen(true)} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {agents.map((agent) => {
            const FrequencyIcon = frequencyIcons[agent.frequency];
            const criteriaList = formatCriteria(agent.criteria);

            return (
              <Card
                key={agent.id}
                className={cn(!agent.isActive && 'opacity-60')}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {agent.name}
                        {!agent.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Paused
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'gap-1',
                            frequencyColors[agent.frequency]
                          )}
                        >
                          <FrequencyIcon className="h-3 w-3" />
                          {frequencyLabels[agent.frequency]}
                        </Badge>
                        <span className="text-muted-foreground">
                          {agent.matchCount} matches
                        </span>
                      </CardDescription>
                    </div>
                    <Switch
                      checked={agent.isActive}
                      onCheckedChange={() => handleToggle(agent.id)}
                      disabled={toggleAgent.isPending}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Criteria Summary */}
                  <div className="flex flex-wrap gap-2">
                    {criteriaList.map((item, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>

                  {/* Last Run */}
                  {agent.lastRunAt && (
                    <p className="text-xs text-muted-foreground">
                      Last checked{' '}
                      {formatDistanceToNow(new Date(agent.lastRunAt), {
                        addSuffix: true,
                      })}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRun(agent.id)}
                      disabled={runAgent.isPending || !agent.isActive}
                      className="gap-1"
                    >
                      {runAgent.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Run Now
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedAgent(agent);
                        setDeleteDialogOpen(true);
                      }}
                      className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <CreateSearchAgentModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={async (data) => {
          await createAgent.mutateAsync(data);
          setCreateModalOpen(false);
        }}
        isPending={createAgent.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Search Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedAgent?.name}&quot;?
              You will no longer receive notifications for matching properties.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No search agents yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create a search agent to get notified when new properties match your
            criteria. Never miss your dream home!
          </p>
          <Button onClick={onCreateClick} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Your First Agent
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface CreateSearchAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    criteria: SearchAgentCriteria;
    frequency: 'INSTANT' | 'DAILY' | 'WEEKLY';
  }) => Promise<void>;
  isPending: boolean;
}

function CreateSearchAgentModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: CreateSearchAgentModalProps) {
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<'INSTANT' | 'DAILY' | 'WEEKLY'>(
    'DAILY'
  );
  const [listingType, setListingType] = useState<string>('');
  const [propertyType, setPropertyType] = useState<string>('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minBedrooms, setMinBedrooms] = useState('');
  const [city, setCity] = useState('');

  const resetForm = () => {
    setName('');
    setFrequency('DAILY');
    setListingType('');
    setPropertyType('');
    setMinPrice('');
    setMaxPrice('');
    setMinBedrooms('');
    setCity('');
  };

  const handleSubmit = async () => {
    const criteria: SearchAgentCriteria = {};

    if (listingType) criteria.listingType = listingType;
    if (propertyType) criteria.propertyType = propertyType;
    if (minPrice) criteria.minPrice = parseFloat(minPrice);
    if (maxPrice) criteria.maxPrice = parseFloat(maxPrice);
    if (minBedrooms) criteria.minBedrooms = parseInt(minBedrooms, 10);
    if (city) criteria.city = city;

    await onSubmit({ name, criteria, frequency });
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Search Agent</DialogTitle>
          <DialogDescription>
            Set up alerts for properties that match your criteria
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              placeholder="e.g., Downtown Apartments"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>Notification Frequency</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['INSTANT', 'DAILY', 'WEEKLY'] as const).map((freq) => {
                const Icon = frequencyIcons[freq];
                return (
                  <Button
                    key={freq}
                    type="button"
                    variant={frequency === freq ? 'default' : 'outline'}
                    className="gap-2"
                    onClick={() => setFrequency(freq)}
                  >
                    <Icon className="h-4 w-4" />
                    {frequencyLabels[freq]}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Listing Type */}
          <div className="space-y-2">
            <Label>Listing Type</Label>
            <Select value={listingType} onValueChange={setListingType}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                <SelectItem value="SALE">For Sale</SelectItem>
                <SelectItem value="RENT">For Rent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Property Type */}
          <div className="space-y-2">
            <Label>Property Type</Label>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                <SelectItem value="APARTMENT">Apartment</SelectItem>
                <SelectItem value="HOUSE">House</SelectItem>
                <SelectItem value="CONDO">Condo</SelectItem>
                <SelectItem value="TOWNHOUSE">Townhouse</SelectItem>
                <SelectItem value="LAND">Land</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minPrice">Min Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="minPrice"
                  type="number"
                  placeholder="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxPrice">Max Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="maxPrice"
                  type="number"
                  placeholder="No max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Bedrooms */}
          <div className="space-y-2">
            <Label htmlFor="bedrooms">Minimum Bedrooms</Label>
            <Select value={minBedrooms} onValueChange={setMinBedrooms}>
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any</SelectItem>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
                <SelectItem value="5">5+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="city"
                placeholder="e.g., New York"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !name}
            className="gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Agent
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
