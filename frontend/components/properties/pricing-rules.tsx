'use client';

import { useState, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Percent,
  DollarSign,
  Calendar,
  Clock,
  Sun,
  Loader2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  usePricingRules,
  useCreatePricingRule,
  useUpdatePricingRule,
  useDeletePricingRule,
} from '@/hooks/use-my-properties';
import type { PricingRule } from '@/lib/api/properties';
import type { CreatePricingRuleDto } from '@/lib/api/my-properties';

interface PricingRulesProps {
  propertyId: string;
  basePrice: number;
  currency: string;
}

const ruleTypeLabels: Record<PricingRule['type'], string> = {
  SEASONAL: 'Seasonal',
  WEEKEND: 'Weekend',
  LAST_MINUTE: 'Last Minute',
  LONG_STAY: 'Long Stay',
};

const ruleTypeDescriptions: Record<PricingRule['type'], string> = {
  SEASONAL: 'Adjust prices for specific date ranges (holidays, peak seasons)',
  WEEKEND: 'Different pricing for Friday and Saturday nights',
  LAST_MINUTE: 'Discounts for bookings made close to check-in date',
  LONG_STAY: 'Discounts for stays longer than a minimum number of nights',
};

const ruleTypeIcons: Record<PricingRule['type'], React.ElementType> = {
  SEASONAL: Calendar,
  WEEKEND: Sun,
  LAST_MINUTE: Clock,
  LONG_STAY: TrendingDown,
};

export function PricingRules({ propertyId, basePrice, currency }: PricingRulesProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<PricingRule | null>(null);

  const { data: rules, isLoading } = usePricingRules(propertyId);
  const createRule = useCreatePricingRule(propertyId);
  const updateRule = useUpdatePricingRule(propertyId);
  const deleteRule = useDeletePricingRule(propertyId);

  const handleOpenCreate = () => {
    setEditingRule(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (rule: PricingRule) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const handleOpenDelete = (rule: PricingRule) => {
    setRuleToDelete(rule);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (ruleToDelete) {
      await deleteRule.mutateAsync(ruleToDelete.id);
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getAdjustedPrice = (rule: PricingRule) => {
    if (rule.adjustmentType === 'PERCENTAGE') {
      return basePrice * (1 + rule.adjustment / 100);
    }
    return basePrice + rule.adjustment;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Pricing Rules</h3>
          <p className="text-sm text-muted-foreground">
            Set up dynamic pricing to maximize your revenue
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {/* Base Price Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Base Price</p>
              <p className="text-2xl font-bold">{formatPrice(basePrice)}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Pricing rules adjust this base rate
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Rules List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rules && rules.length > 0 ? (
        <div className="space-y-4">
          {rules.map((rule) => {
            const Icon = ruleTypeIcons[rule.type];
            const adjustedPrice = getAdjustedPrice(rule);
            const isIncrease = rule.adjustment > 0;

            return (
              <Card key={rule.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'p-2 rounded-full',
                        isIncrease ? 'bg-green-100' : 'bg-blue-100'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-5 w-5',
                          isIncrease ? 'text-green-600' : 'text-blue-600'
                        )}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{rule.name}</h4>
                        <Badge variant="secondary">
                          {ruleTypeLabels[rule.type]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {rule.adjustmentType === 'PERCENTAGE'
                          ? `${isIncrease ? '+' : ''}${rule.adjustment}%`
                          : `${isIncrease ? '+' : ''}${formatPrice(
                              rule.adjustment
                            )}`}{' '}
                        = {formatPrice(adjustedPrice)}
                        {rule.startDate && rule.endDate && (
                          <span className="ml-2">
                            ({rule.startDate} - {rule.endDate})
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(rule)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleOpenDelete(rule)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="font-medium mb-2">No pricing rules yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Create pricing rules to automatically adjust your rates
            </p>
            <Button onClick={handleOpenCreate} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Create your first rule
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <PricingRuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        propertyId={propertyId}
        editingRule={editingRule}
        basePrice={basePrice}
        currency={currency}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Pricing Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{ruleToDelete?.name}&quot;?
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
              onClick={handleConfirmDelete}
              disabled={deleteRule.isPending}
            >
              {deleteRule.isPending ? (
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

interface PricingRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  editingRule: PricingRule | null;
  basePrice: number;
  currency: string;
}

function PricingRuleDialog({
  open,
  onOpenChange,
  propertyId,
  editingRule,
  basePrice,
  currency,
}: PricingRuleDialogProps) {
  const [name, setName] = useState(editingRule?.name || '');
  const [type, setType] = useState<PricingRule['type']>(
    editingRule?.type || 'SEASONAL'
  );
  const [adjustmentType, setAdjustmentType] = useState<'PERCENTAGE' | 'FIXED'>(
    editingRule?.adjustmentType || 'PERCENTAGE'
  );
  const [adjustment, setAdjustment] = useState(
    editingRule?.adjustment?.toString() || ''
  );
  const [startDate, setStartDate] = useState(editingRule?.startDate || '');
  const [endDate, setEndDate] = useState(editingRule?.endDate || '');

  const createRule = useCreatePricingRule(propertyId);
  const updateRule = useUpdatePricingRule(propertyId);

  const handleSubmit = async () => {
    const data: CreatePricingRuleDto = {
      name,
      type,
      adjustmentType,
      adjustment: parseFloat(adjustment),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    if (editingRule) {
      await updateRule.mutateAsync({ ruleId: editingRule.id, data });
    } else {
      await createRule.mutateAsync(data);
    }

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setType('SEASONAL');
    setAdjustmentType('PERCENTAGE');
    setAdjustment('');
    setStartDate('');
    setEndDate('');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const previewPrice = adjustment
    ? adjustmentType === 'PERCENTAGE'
      ? basePrice * (1 + parseFloat(adjustment) / 100)
      : basePrice + parseFloat(adjustment)
    : basePrice;

  const isPending = createRule.isPending || updateRule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingRule ? 'Edit Pricing Rule' : 'Create Pricing Rule'}
          </DialogTitle>
          <DialogDescription>
            {editingRule
              ? 'Modify your pricing rule settings'
              : 'Set up a new pricing rule for your property'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Rule Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Rule Name</Label>
            <Input
              id="name"
              placeholder="e.g., Summer Peak Season"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Rule Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Rule Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as PricingRule['type'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ruleTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {ruleTypeDescriptions[type]}
            </p>
          </div>

          {/* Adjustment */}
          <div className="space-y-2">
            <Label>Price Adjustment</Label>
            <div className="flex gap-2">
              <Select
                value={adjustmentType}
                onValueChange={(value) =>
                  setAdjustmentType(value as 'PERCENTAGE' | 'FIXED')
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FIXED">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                {adjustmentType === 'PERCENTAGE' ? (
                  <Percent className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                ) : (
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  type="number"
                  placeholder={adjustmentType === 'PERCENTAGE' ? '10' : '50'}
                  value={adjustment}
                  onChange={(e) => setAdjustment(e.target.value)}
                  className={adjustmentType === 'FIXED' ? 'pl-10' : ''}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Use negative values for discounts
            </p>
          </div>

          {/* Date Range (for seasonal rules) */}
          {type === 'SEASONAL' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {adjustment && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Price Preview
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {formatPrice(previewPrice)}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(basePrice)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !name || !adjustment}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {editingRule ? 'Saving...' : 'Creating...'}
              </>
            ) : editingRule ? (
              'Save Changes'
            ) : (
              'Create Rule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
