'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Package, DollarSign, TrendingUp, Archive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type BulkOperationType =
  | 'adjust_price'
  | 'adjust_stock'
  | 'change_status'
  | 'update_threshold';

interface BulkOperationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onSuccess?: () => void;
}

export function BulkOperationsDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: BulkOperationsDialogProps) {
  const [operation, setOperation] = useState<BulkOperationType>('adjust_price');
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'percentage' | 'fixed'>('percentage');
  const [remarks, setRemarks] = useState('');

  const handleSubmit = async () => {
    if (!value && operation !== 'change_status') {
      alert('Please enter a value');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/product-inventories/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryIds: selectedIds,
          operation,
          value,
          adjustmentType,
          remarks,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Bulk operation failed');
      }

      alert(`Successfully updated ${selectedIds.length} items`);
      onSuccess?.();
      onOpenChange(false);
      // Reset form
      setValue('');
      setRemarks('');
    } catch (error) {
      console.error('Bulk operation error:', error);
      alert(error instanceof Error ? error.message : 'Failed to perform bulk operation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Operations</DialogTitle>
          <DialogDescription>
            Apply changes to {selectedIds.length} selected item(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Operation Type</Label>
            <Select value={operation} onValueChange={(v) => setOperation(v as BulkOperationType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adjust_price">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Adjust Price
                  </div>
                </SelectItem>
                <SelectItem value="adjust_stock">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Adjust Stock
                  </div>
                </SelectItem>
                <SelectItem value="update_threshold">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Update Alert Threshold
                  </div>
                </SelectItem>
                <SelectItem value="change_status">
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    Change Status
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {operation === 'adjust_price' && (
            <>
              <div className="space-y-2">
                <Label>Adjustment Type</Label>
                <Select value={adjustmentType} onValueChange={(v) => setAdjustmentType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {adjustmentType === 'percentage' ? 'Percentage Change' : 'Amount'}
                </Label>
                <Input
                  type="number"
                  placeholder={adjustmentType === 'percentage' ? 'e.g., 10 for +10%' : 'e.g., 5.00'}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  step={adjustmentType === 'percentage' ? '1' : '0.01'}
                />
                <p className="text-xs text-muted-foreground">
                  {adjustmentType === 'percentage'
                    ? 'Use positive for increase, negative for decrease'
                    : 'Use positive to increase, negative to decrease'}
                </p>
              </div>
            </>
          )}

          {operation === 'adjust_stock' && (
            <div className="space-y-2">
              <Label>Stock Adjustment</Label>
              <Input
                type="number"
                placeholder="e.g., 10 to add, -5 to remove"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Positive to add stock, negative to remove
              </p>
            </div>
          )}

          {operation === 'update_threshold' && (
            <div className="space-y-2">
              <Label>New Alert Threshold</Label>
              <Input
                type="number"
                placeholder="e.g., 10"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                min="0"
              />
            </div>
          )}

          {operation === 'change_status' && (
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Remarks (Optional)</Label>
            <Textarea
              placeholder="Add notes about this bulk operation..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              `Apply to ${selectedIds.length} Item(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
