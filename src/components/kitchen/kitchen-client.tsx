'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MapPin,
  ChefHat,
  Clock,
  ArrowRight,
  Check,
  Volume2,
  VolumeX,
  RefreshCw,
  Utensils,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type OrderStatus = 'pending' | 'processing' | 'ready';

interface KitchenOrderItem {
  id: string;
  orderId: string;
  productName: string;
  quantity: number;
  itemStatus: string;
  notes: string | null;
}

interface KitchenOrder {
  id: string;
  orderNumber: string;
  locationId: string;
  tableId: string | null;
  customerName: string | null;
  status: OrderStatus;
  notes: string | null;
  createdAt: string;
  tableName: string | null;
  items: KitchenOrderItem[];
}

type Location = {
  id: string;
  name: string;
};

const STATUS_CONFIG = {
  pending: {
    status: 'pending' as const,
    label: 'New Orders',
    color: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
    headerColor: 'bg-orange-500',
    badgeVariant: 'destructive' as const,
    nextStatus: 'processing' as const,
    nextLabel: 'Start',
    nextIcon: ChefHat,
  },
  processing: {
    status: 'processing' as const,
    label: 'Preparing',
    color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    headerColor: 'bg-blue-500',
    badgeVariant: 'default' as const,
    nextStatus: 'ready' as const,
    nextLabel: 'Ready',
    nextIcon: Check,
  },
  ready: {
    status: 'ready' as const,
    label: 'Ready',
    color: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
    headerColor: 'bg-green-500',
    badgeVariant: 'secondary' as const,
    nextStatus: 'completed' as const,
    nextLabel: 'Complete',
    nextIcon: Check,
  },
};

function getElapsedTime(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

export function KitchenClient() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const prevOrderCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch locations
  useEffect(() => {
    fetch('/api/locations')
      .then((res) => res.json())
      .then((data) => setLocations(data.locations || []))
      .catch(console.error);
  }, []);

  // Create audio for notifications
  useEffect(() => {
    // Use Web Audio API for a simple notification beep
    audioRef.current = null; // Will use AudioContext instead
  }, []);

  const playNotification = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gain.gain.value = 0.3;
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch {
      // Audio not supported
    }
  }, [soundEnabled]);

  // Initial fetch of kitchen orders
  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedLocation !== 'all') {
        params.set('locationId', selectedLocation);
      }
      const res = await fetch(`/api/orders/kitchen?${params}`);
      if (!res.ok) throw new Error('Failed to fetch kitchen orders');
      const data = (await res.json()) as { orders: KitchenOrder[] };
      setOrders(data.orders || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching kitchen orders:', error);
      setIsLoading(false);
    }
  }, [selectedLocation]);

  // Subscribe to realtime updates, or fall back to polling
  useEffect(() => {
    fetchOrders();

    if (supabase) {
      // Supabase Realtime: instant updates when orders/items change
      const channel = supabase
        .channel('kitchen')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order' }, () =>
          fetchOrders()
        )
        .on('postgres_changes', { event: '*', schema: 'public', table: 'order_item' }, () =>
          fetchOrders()
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    } else {
      // Fallback: poll every 5 seconds if Supabase is not configured
      const interval = setInterval(fetchOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchOrders]);

  // Play sound when new pending orders arrive
  useEffect(() => {
    const pendingCount = orders.filter((o) => o.status === 'pending').length;
    if (pendingCount > prevOrderCountRef.current) {
      playNotification();
    }
    prevOrderCountRef.current = pendingCount;
  }, [orders, playNotification]);

  const refetch = fetchOrders;

  // Status update mutation
  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update');
      }
      return res.json();
    },
    onSuccess: () => {
      fetchOrders();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const processingOrders = orders.filter((o) => o.status === 'processing');
  const readyOrders = orders.filter((o) => o.status === 'ready');

  const handleAdvanceStatus = (orderId: string, nextStatus: string) => {
    updateStatus.mutate({ orderId, status: nextStatus });
  };

  // Re-render every minute to update elapsed times; also provides a stable `now` for purity
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className='flex flex-col h-screen'>
      {/* Header */}
      <div className='border-b px-6 py-3 flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <h1 className='text-xl font-bold flex items-center gap-2'>
            <ChefHat className='h-6 w-6' />
            Kitchen Display
          </h1>

          <div className='flex items-center gap-2'>
            <MapPin className='h-4 w-4 text-muted-foreground' />
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className='w-[180px]'>
                <SelectValue placeholder='All locations' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
          >
            {soundEnabled ? <Volume2 className='h-4 w-4' /> : <VolumeX className='h-4 w-4' />}
          </Button>
          <Button variant='ghost' size='sm' onClick={() => refetch()}>
            <RefreshCw className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Columns */}
      {isLoading ? (
        <div className='flex-1 flex items-center justify-center'>
          <RefreshCw className='h-8 w-8 animate-spin text-muted-foreground' />
        </div>
      ) : (
        <div className='flex-1 grid grid-cols-1 md:grid-cols-3 gap-0 overflow-hidden'>
          <KitchenColumn
            config={STATUS_CONFIG.pending}
            orders={pendingOrders}
            onAdvance={handleAdvanceStatus}
            isUpdating={updateStatus.isPending}
            now={now}
          />
          <KitchenColumn
            config={STATUS_CONFIG.processing}
            orders={processingOrders}
            onAdvance={handleAdvanceStatus}
            isUpdating={updateStatus.isPending}
            now={now}
          />
          <KitchenColumn
            config={STATUS_CONFIG.ready}
            orders={readyOrders}
            onAdvance={handleAdvanceStatus}
            isUpdating={updateStatus.isPending}
            now={now}
          />
        </div>
      )}
    </div>
  );
}

function KitchenColumn({
  config,
  orders,
  onAdvance,
  isUpdating,
  now,
}: {
  config: (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG];
  orders: KitchenOrder[];
  onAdvance: (orderId: string, nextStatus: string) => void;
  isUpdating: boolean;
  now: number;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    const orderId = e.dataTransfer.getData('orderId');
    if (orderId) {
      onAdvance(orderId, config.status);
    }
  };

  return (
    <div className='flex flex-col border-r last:border-r-0 overflow-hidden'>
      {/* Column header */}
      <div
        className={cn(
          'px-4 py-3 text-white font-semibold flex items-center justify-between',
          config.headerColor
        )}
      >
        <span className='text-lg'>{config.label}</span>
        <Badge variant='secondary' className='text-sm'>
          {orders.length}
        </Badge>
      </div>

      {/* Order cards */}
      <ScrollArea className='flex-1'>
        <div
          className={cn('p-3 space-y-3 min-h-full', dragOver && 'bg-accent/50')}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {orders.length === 0 && (
            <div className='text-center py-12 text-muted-foreground'>
              <Utensils className='h-10 w-10 mx-auto mb-2 opacity-30' />
              <p className='text-sm'>No orders</p>
            </div>
          )}
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              config={config}
              onAdvance={onAdvance}
              isUpdating={isUpdating}
              now={now}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function OrderCard({
  order,
  config,
  onAdvance,
  isUpdating,
  now,
}: {
  order: KitchenOrder;
  config: (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG];
  onAdvance: (orderId: string, nextStatus: string) => void;
  isUpdating: boolean;
  now: number;
}) {
  const NextIcon = config.nextIcon;
  const elapsed = getElapsedTime(order.createdAt);
  const isUrgent =
    order.status === 'pending' && now - new Date(order.createdAt).getTime() > 10 * 60000;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('orderId', order.id);
  };

  const handleItemStatusToggle = async (itemId: string, currentStatus: string) => {
    // Toggle: pending → ready → served → pending
    const nextStatus =
      currentStatus === 'pending' ? 'ready' : currentStatus === 'ready' ? 'served' : 'pending';

    try {
      const res = await fetch(`/api/order-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemStatus: nextStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update item status');
      }
    } catch (error) {
      console.error('Error updating item status:', error);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        'rounded-lg border-2 p-3 transition-all cursor-grab active:cursor-grabbing',
        config.color,
        isUrgent && 'border-red-400 animate-pulse'
      )}
    >
      {/* Header */}
      <div className='flex items-center justify-between mb-2'>
        <span className='font-bold text-base text-foreground'>{order.orderNumber}</span>
        <div className='flex items-center gap-1 text-muted-foreground'>
          <Clock className='h-3.5 w-3.5' />
          <span className={cn('text-sm font-medium', isUrgent && 'text-red-500')}>{elapsed}</span>
        </div>
      </div>

      {/* Table / Customer */}
      {(order.tableName || order.customerName) && (
        <div className='flex items-center gap-2 mb-2 text-sm'>
          {order.tableName && (
            <Badge variant='outline' className='text-xs'>
              {order.tableName}
            </Badge>
          )}
          {order.customerName && <span className='text-foreground'>{order.customerName}</span>}
        </div>
      )}

      {/* Items */}
      <div className='space-y-2 mb-3'>
        {order.items.map((item) => (
          <div
            key={item.id}
            onClick={() => handleItemStatusToggle(item.id, item.itemStatus)}
            className='flex items-start gap-2 text-sm p-2 rounded-md cursor-pointer transition-colors hover:bg-white/10 group'
          >
            <div className='flex-shrink-0 pt-0.5'>
              {item.itemStatus === 'pending' && (
                <Circle className='h-4 w-4 text-muted-foreground group-hover:text-foreground' />
              )}
              {item.itemStatus === 'ready' && <Check className='h-4 w-4 text-yellow-500' />}
              {item.itemStatus === 'served' && <CheckCircle2 className='h-4 w-4 text-green-500' />}
            </div>
            <div className='flex-1'>
              <span className='font-medium text-foreground'>
                {item.quantity}x {item.productName}
              </span>
              {item.notes && <p className='text-xs text-muted-foreground italic'>{item.notes}</p>}
            </div>
            <div className='flex-shrink-0 text-xs font-medium text-muted-foreground capitalize'>
              {item.itemStatus}
            </div>
          </div>
        ))}
      </div>

      {/* Order notes */}
      {order.notes && (
        <p className='text-xs text-muted-foreground italic border-t border-border pt-2 mb-2'>
          Note: {order.notes}
        </p>
      )}

      {/* Action button */}
      <Button
        className='w-full min-h-[44px]'
        onClick={() => onAdvance(order.id, config.nextStatus)}
        disabled={isUpdating}
      >
        <NextIcon className='h-4 w-4 mr-2' />
        {config.nextLabel}
        <ArrowRight className='h-4 w-4 ml-2' />
      </Button>
    </div>
  );
}
