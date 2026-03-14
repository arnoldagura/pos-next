export const movementTypeLabels: Record<string, string> = {
  purchase: 'Purchase',
  production_consumption: 'Production Use',
  adjustment: 'Adjustment',
  waste: 'Waste',
  expired: 'Expired',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  transfer_to_pos: 'Transfer to POS',
};

export const movementTypeColors: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  purchase: 'default',
  production_consumption: 'secondary',
  adjustment: 'outline',
  waste: 'destructive',
  expired: 'destructive',
  transfer_in: 'default',
  transfer_out: 'secondary',
  transfer_to_pos: 'secondary',
};

export const positiveMovementTypes = ['purchase', 'adjustment', 'transfer_in'];
