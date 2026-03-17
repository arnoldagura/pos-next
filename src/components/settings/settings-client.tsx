'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Building2,
  ShoppingCart,
  Bell,
  Package,
  Save,
  Loader2,
  BadgeDollarSign,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ─── Currency data ────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card / Credit' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Check' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgSettings {
  id: string;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  taxId: string | null;
  billingEmail: string | null;
  settings: {
    pos: {
      taxRate: number;
      currency: string;
      currencySymbol: string;
      receiptHeader: string;
      receiptFooter: string;
      allowDiscounts: boolean;
      maxDiscountPercent: number;
      requireCustomerInfo: boolean;
      enableTipping: boolean;
      defaultTipPercent: number;
      paymentMethods: string[];
      defaultPaymentMethod: string;
      autoCompleteOrders: boolean;
      printReceiptAuto: boolean;
      enableTableService: boolean;
      requireCashierApproval: boolean;
      approvalThreshold: number;
    };
    notifications: {
      lowStockAlert: boolean;
      lowStockThreshold: number;
      dailySalesReport: boolean;
      weeklySalesReport: boolean;
      reportEmail: string;
      orderNotifications: boolean;
      inventoryAlerts: boolean;
    };
    inventory: {
      trackSerialNumbers: boolean;
      enableBarcodeScanning: boolean;
      autoDeductInventory: boolean;
      allowNegativeStock: boolean;
      defaultReorderPoint: number;
    };
    branding: {
      companyName: string;
      logo: string;
      primaryColor: string;
      accentColor: string;
    };
  };
}

// ─── Nav sections ─────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'general', label: 'General', icon: Building2, description: 'Business info & contact' },
  {
    id: 'pos',
    label: 'POS & Payments',
    icon: ShoppingCart,
    description: 'Currency, taxes & checkout',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Alerts & email reports',
  },
  { id: 'inventory', label: 'Inventory', icon: Package, description: 'Stock & tracking rules' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SettingsSkeleton() {
  return (
    <div className='space-y-4'>
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className='h-5 w-32' />
            <Skeleton className='h-4 w-64 mt-1' />
          </CardHeader>
          <CardContent className='space-y-4'>
            <Skeleton className='h-9 w-full' />
            <Skeleton className='h-9 w-full' />
            <Skeleton className='h-9 w-2/3' />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className='mb-6'>
      <h2 className='text-xl font-semibold tracking-tight'>{title}</h2>
      <p className='text-sm text-muted-foreground mt-1'>{description}</p>
    </div>
  );
}

function SaveButton({ loading, label = 'Save changes' }: { loading?: boolean; label?: string }) {
  return (
    <Button type='submit' disabled={loading} className='min-w-[120px]'>
      {loading ? (
        <Loader2 className='h-4 w-4 animate-spin mr-2' />
      ) : (
        <Save className='h-4 w-4 mr-2' />
      )}
      {loading ? 'Saving…' : label}
    </Button>
  );
}

// ─── Section: General ─────────────────────────────────────────────────────────

function GeneralSection({
  data,
  onSave,
}: {
  data: OrgSettings;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: data.name ?? '',
    contactName: data.contactName ?? '',
    contactPhone: data.contactPhone ?? '',
    address: data.address ?? '',
    city: data.city ?? '',
    country: data.country ?? '',
    taxId: data.taxId ?? '',
    billingEmail: data.billingEmail ?? '',
    companyName: data.settings?.branding?.companyName ?? '',
  });
  const [loading, setLoading] = useState(false);

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { companyName, ...orgFields } = form;
      await onSave({
        ...orgFields,
        settings: { branding: { companyName } },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <SectionHeader title='General' description='Your business information and contact details' />

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Business Identity</CardTitle>
          <CardDescription>How your business appears to customers and in reports</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-2'>
          <div className='space-y-1.5'>
            <Label htmlFor='name'>Organization Name</Label>
            <Input id='name' value={form.name} onChange={f('name')} placeholder='My Business' />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='companyName'>
              Display Name <span className='text-muted-foreground text-xs'>(receipts)</span>
            </Label>
            <Input
              id='companyName'
              value={form.companyName}
              onChange={f('companyName')}
              placeholder='Same as org name'
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='taxId'>Tax / VAT ID</Label>
            <Input
              id='taxId'
              value={form.taxId}
              onChange={f('taxId')}
              placeholder='000-000-000-000'
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='billingEmail'>Billing Email</Label>
            <Input
              id='billingEmail'
              type='email'
              value={form.billingEmail}
              onChange={f('billingEmail')}
              placeholder='billing@yourco.com'
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Contact Details</CardTitle>
          <CardDescription>Primary contact person for this account</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-2'>
          <div className='space-y-1.5'>
            <Label htmlFor='contactName'>Contact Name</Label>
            <Input
              id='contactName'
              value={form.contactName}
              onChange={f('contactName')}
              placeholder='Jane Dela Cruz'
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='contactPhone'>Phone Number</Label>
            <Input
              id='contactPhone'
              type='tel'
              value={form.contactPhone}
              onChange={f('contactPhone')}
              placeholder='+63 912 345 6789'
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Address</CardTitle>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-2'>
          <div className='space-y-1.5 sm:col-span-2'>
            <Label htmlFor='address'>Street Address</Label>
            <Input
              id='address'
              value={form.address}
              onChange={f('address')}
              placeholder='123 Rizal Ave'
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='city'>City / Municipality</Label>
            <Input id='city' value={form.city} onChange={f('city')} placeholder='Quezon City' />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='country'>Country</Label>
            <Input
              id='country'
              value={form.country}
              onChange={f('country')}
              placeholder='Philippines'
            />
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end pt-2'>
        <SaveButton loading={loading} />
      </div>
    </form>
  );
}

// ─── Section: POS & Payments ─────────────────────────────────────────────────

function POSSection({
  data,
  onSave,
}: {
  data: OrgSettings;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const pos = data.settings.pos;
  const [form, setForm] = useState({
    currency: pos.currency ?? 'USD',
    currencySymbol: pos.currencySymbol ?? '$',
    taxRate: ((pos.taxRate ?? 0) * 100).toString(),
    receiptHeader: pos.receiptHeader ?? '',
    receiptFooter: pos.receiptFooter ?? '',
    allowDiscounts: pos.allowDiscounts ?? true,
    maxDiscountPercent: pos.maxDiscountPercent?.toString() ?? '20',
    enableTipping: pos.enableTipping ?? false,
    defaultTipPercent: pos.defaultTipPercent?.toString() ?? '10',
    paymentMethods: pos.paymentMethods ?? ['cash', 'card'],
    defaultPaymentMethod: pos.defaultPaymentMethod ?? 'cash',
    autoCompleteOrders: pos.autoCompleteOrders ?? true,
    printReceiptAuto: pos.printReceiptAuto ?? false,
    enableTableService: pos.enableTableService ?? true,
    requireCashierApproval: pos.requireCashierApproval ?? false,
    approvalThreshold: pos.approvalThreshold?.toString() ?? '1000',
  });
  const [loading, setLoading] = useState(false);

  const onCurrencyChange = (code: string) => {
    const found = CURRENCIES.find((c) => c.code === code);
    setForm((prev) => ({
      ...prev,
      currency: code,
      currencySymbol: found?.symbol ?? prev.currencySymbol,
    }));
  };

  const togglePaymentMethod = (value: string) => {
    setForm((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.includes(value)
        ? prev.paymentMethods.filter((m) => m !== value)
        : [...prev.paymentMethods, value],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        settings: {
          pos: {
            currency: form.currency,
            currencySymbol: form.currencySymbol,
            taxRate: parseFloat(form.taxRate) / 100,
            receiptHeader: form.receiptHeader,
            receiptFooter: form.receiptFooter,
            allowDiscounts: form.allowDiscounts,
            maxDiscountPercent: parseFloat(form.maxDiscountPercent),
            enableTipping: form.enableTipping,
            defaultTipPercent: parseFloat(form.defaultTipPercent),
            paymentMethods: form.paymentMethods,
            defaultPaymentMethod: form.defaultPaymentMethod,
            autoCompleteOrders: form.autoCompleteOrders,
            printReceiptAuto: form.printReceiptAuto,
            enableTableService: form.enableTableService,
            requireCashierApproval: form.requireCashierApproval,
            approvalThreshold: parseFloat(form.approvalThreshold),
          },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <SectionHeader
        title='POS & Payments'
        description='Currency, tax rates, and checkout behavior'
      />

      <Card>
        <CardHeader>
          <CardTitle className='text-base flex items-center gap-2'>
            <BadgeDollarSign className='h-4 w-4 text-primary' />
            Currency & Tax
          </CardTitle>
          <CardDescription>Set the currency for all prices, receipts, and reports</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-3'>
          <div className='space-y-1.5 sm:col-span-2'>
            <Label>Currency</Label>
            <Select value={form.currency} onValueChange={onCurrencyChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className='font-mono text-xs text-muted-foreground mr-2'>{c.code}</span>
                    {c.name}
                    <span className='ml-1 text-muted-foreground'>({c.symbol})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='currencySymbol'>Symbol</Label>
            <Input
              id='currencySymbol'
              value={form.currencySymbol}
              onChange={(e) => setForm((p) => ({ ...p, currencySymbol: e.target.value }))}
              maxLength={5}
              className='font-mono'
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='taxRate'>Tax Rate (%)</Label>
            <Input
              id='taxRate'
              type='number'
              step='0.01'
              min='0'
              max='100'
              value={form.taxRate}
              onChange={(e) => setForm((p) => ({ ...p, taxRate: e.target.value }))}
              placeholder='0'
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Payment Methods</CardTitle>
          <CardDescription>Which methods your cashiers can accept</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-3'>
            {PAYMENT_METHOD_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  form.paymentMethods.includes(opt.value)
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <Checkbox
                  checked={form.paymentMethods.includes(opt.value)}
                  onCheckedChange={() => togglePaymentMethod(opt.value)}
                />
                <span className='text-sm font-medium'>{opt.label}</span>
              </label>
            ))}
          </div>
          <div className='space-y-1.5 pt-2'>
            <Label>Default Payment Method</Label>
            <Select
              value={form.defaultPaymentMethod}
              onValueChange={(v) => setForm((p) => ({ ...p, defaultPaymentMethod: v }))}
            >
              <SelectTrigger className='w-full sm:w-[240px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.filter((opt) =>
                  form.paymentMethods.includes(opt.value)
                ).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Discounts & Tipping</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Allow Discounts</p>
              <p className='text-xs text-muted-foreground'>Cashiers can apply order discounts</p>
            </div>
            <Switch
              checked={form.allowDiscounts}
              onCheckedChange={(v: boolean) => setForm((p) => ({ ...p, allowDiscounts: v }))}
            />
          </div>
          {form.allowDiscounts && (
            <div className='space-y-1.5 pl-0'>
              <Label htmlFor='maxDiscountPercent'>Max Discount Percent (%)</Label>
              <Input
                id='maxDiscountPercent'
                type='number'
                min='0'
                max='100'
                value={form.maxDiscountPercent}
                onChange={(e) => setForm((p) => ({ ...p, maxDiscountPercent: e.target.value }))}
                className='w-32'
              />
            </div>
          )}
          <Separator />
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Enable Tipping</p>
              <p className='text-xs text-muted-foreground'>Show tip prompt at checkout</p>
            </div>
            <Switch
              checked={form.enableTipping}
              onCheckedChange={(v: boolean) => setForm((p) => ({ ...p, enableTipping: v }))}
            />
          </div>
          {form.enableTipping && (
            <div className='space-y-1.5'>
              <Label htmlFor='defaultTipPercent'>Default Tip (%)</Label>
              <Input
                id='defaultTipPercent'
                type='number'
                min='0'
                max='100'
                value={form.defaultTipPercent}
                onChange={(e) => setForm((p) => ({ ...p, defaultTipPercent: e.target.value }))}
                className='w-32'
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Checkout Behavior</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {(
            [
              {
                key: 'autoCompleteOrders',
                label: 'Auto-complete orders',
                desc: 'Mark orders as completed automatically on payment',
              },
              {
                key: 'printReceiptAuto',
                label: 'Auto-print receipt',
                desc: 'Print receipt immediately after payment',
              },
              {
                key: 'enableTableService',
                label: 'Enable table service',
                desc: 'Allow assigning orders to tables',
              },
              {
                key: 'requireCashierApproval',
                label: 'Require cashier approval',
                desc: 'Large orders need supervisor sign-off',
              },
            ] as const
          ).map(({ key, label, desc }) => (
            <div key={key} className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium'>{label}</p>
                <p className='text-xs text-muted-foreground'>{desc}</p>
              </div>
              <Switch
                checked={form[key] as boolean}
                onCheckedChange={(v: boolean) => setForm((p) => ({ ...p, [key]: v }))}
              />
            </div>
          ))}
          {form.requireCashierApproval && (
            <div className='space-y-1.5'>
              <Label htmlFor='approvalThreshold'>Approval threshold ({form.currencySymbol})</Label>
              <Input
                id='approvalThreshold'
                type='number'
                min='0'
                value={form.approvalThreshold}
                onChange={(e) => setForm((p) => ({ ...p, approvalThreshold: e.target.value }))}
                className='w-40'
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Receipt Customization</CardTitle>
          <CardDescription>Text printed at the top and bottom of receipts</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-2'>
          <div className='space-y-1.5'>
            <Label htmlFor='receiptHeader'>Receipt Header</Label>
            <Textarea
              id='receiptHeader'
              value={form.receiptHeader}
              onChange={(e) => setForm((p) => ({ ...p, receiptHeader: e.target.value }))}
              rows={3}
              maxLength={200}
              placeholder='Thank you for your business!'
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='receiptFooter'>Receipt Footer</Label>
            <Textarea
              id='receiptFooter'
              value={form.receiptFooter}
              onChange={(e) => setForm((p) => ({ ...p, receiptFooter: e.target.value }))}
              rows={3}
              maxLength={200}
              placeholder='Please come again'
            />
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end pt-2'>
        <SaveButton loading={loading} />
      </div>
    </form>
  );
}

// ─── Section: Notifications ───────────────────────────────────────────────────

function NotificationsSection({
  data,
  onSave,
}: {
  data: OrgSettings;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const notif = data.settings.notifications;
  const [form, setForm] = useState({
    lowStockAlert: notif.lowStockAlert ?? true,
    lowStockThreshold: notif.lowStockThreshold?.toString() ?? '10',
    orderNotifications: notif.orderNotifications ?? true,
    inventoryAlerts: notif.inventoryAlerts ?? true,
    dailySalesReport: notif.dailySalesReport ?? false,
    weeklySalesReport: notif.weeklySalesReport ?? false,
    reportEmail: notif.reportEmail ?? '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        settings: {
          notifications: {
            ...form,
            lowStockThreshold: parseInt(form.lowStockThreshold),
          },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <SectionHeader
        title='Notifications'
        description='Configure alerts and automated email reports'
      />

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Alerts</CardTitle>
          <CardDescription>In-app and system alerts for important events</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Order notifications</p>
              <p className='text-xs text-muted-foreground'>Notify when new orders are placed</p>
            </div>
            <Switch
              checked={form.orderNotifications}
              onCheckedChange={(v: boolean) => setForm((p) => ({ ...p, orderNotifications: v }))}
            />
          </div>
          <Separator />
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Inventory alerts</p>
              <p className='text-xs text-muted-foreground'>
                Notify when stock levels change significantly
              </p>
            </div>
            <Switch
              checked={form.inventoryAlerts}
              onCheckedChange={(v: boolean) => setForm((p) => ({ ...p, inventoryAlerts: v }))}
            />
          </div>
          <Separator />
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Low stock alerts</p>
              <p className='text-xs text-muted-foreground'>
                Warn when item quantity falls below threshold
              </p>
            </div>
            <Switch
              checked={form.lowStockAlert}
              onCheckedChange={(v: boolean) => setForm((p) => ({ ...p, lowStockAlert: v }))}
            />
          </div>
          {form.lowStockAlert && (
            <div className='space-y-1.5'>
              <Label htmlFor='lowStockThreshold'>Low Stock Threshold (units)</Label>
              <Input
                id='lowStockThreshold'
                type='number'
                min='0'
                value={form.lowStockThreshold}
                onChange={(e) => setForm((p) => ({ ...p, lowStockThreshold: e.target.value }))}
                className='w-32'
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Email Reports</CardTitle>
          <CardDescription>Automated sales summaries sent to your inbox</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-1.5'>
            <Label htmlFor='reportEmail'>Report Email Address</Label>
            <Input
              id='reportEmail'
              type='email'
              value={form.reportEmail}
              onChange={(e) => setForm((p) => ({ ...p, reportEmail: e.target.value }))}
              placeholder='owner@yourco.com'
              className='max-w-sm'
            />
          </div>
          <Separator />
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Daily sales report</p>
              <p className='text-xs text-muted-foreground'>Receive a summary every morning</p>
            </div>
            <Switch
              checked={form.dailySalesReport}
              onCheckedChange={(v: boolean) => setForm((p) => ({ ...p, dailySalesReport: v }))}
            />
          </div>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Weekly sales report</p>
              <p className='text-xs text-muted-foreground'>
                Receive a summary every Monday morning
              </p>
            </div>
            <Switch
              checked={form.weeklySalesReport}
              onCheckedChange={(v: boolean) => setForm((p) => ({ ...p, weeklySalesReport: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end pt-2'>
        <SaveButton loading={loading} />
      </div>
    </form>
  );
}

// ─── Section: Inventory ───────────────────────────────────────────────────────

function InventorySection({
  data,
  onSave,
}: {
  data: OrgSettings;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const inv = data.settings.inventory;
  const [form, setForm] = useState({
    enableBarcodeScanning: inv.enableBarcodeScanning ?? true,
    autoDeductInventory: inv.autoDeductInventory ?? true,
    allowNegativeStock: inv.allowNegativeStock ?? false,
    trackSerialNumbers: inv.trackSerialNumbers ?? false,
    defaultReorderPoint: inv.defaultReorderPoint?.toString() ?? '20',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        settings: {
          inventory: {
            ...form,
            defaultReorderPoint: parseInt(form.defaultReorderPoint),
          },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <SectionHeader title='Inventory' description='Control how stock is tracked and managed' />

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Tracking Rules</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {(
            [
              {
                key: 'enableBarcodeScanning',
                label: 'Barcode scanning',
                desc: 'Use barcodes to identify products in POS and inventory',
              },
              {
                key: 'autoDeductInventory',
                label: 'Auto-deduct on sale',
                desc: 'Reduce stock automatically when an order is completed',
              },
              {
                key: 'allowNegativeStock',
                label: 'Allow negative stock',
                desc: 'Let sales proceed even when inventory is at zero',
              },
              {
                key: 'trackSerialNumbers',
                label: 'Track serial numbers',
                desc: 'Record individual serial numbers for each unit sold',
              },
            ] as const
          ).map(({ key, label, desc }) => (
            <div key={key}>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium'>{label}</p>
                  <p className='text-xs text-muted-foreground'>{desc}</p>
                </div>
                <Switch
                  checked={form[key] as boolean}
                  onCheckedChange={(v: boolean) => setForm((p) => ({ ...p, [key]: v }))}
                />
              </div>
              {key !== 'trackSerialNumbers' && <Separator className='mt-4' />}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Default Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-1.5'>
            <Label htmlFor='defaultReorderPoint'>Default Reorder Point (units)</Label>
            <Input
              id='defaultReorderPoint'
              type='number'
              min='0'
              value={form.defaultReorderPoint}
              onChange={(e) => setForm((p) => ({ ...p, defaultReorderPoint: e.target.value }))}
              className='w-32'
            />
            <p className='text-xs text-muted-foreground'>
              Applied to new inventory items unless overridden individually
            </p>
          </div>
        </CardContent>
      </Card>

      <div className='flex justify-end pt-2'>
        <SaveButton loading={loading} />
      </div>
    </form>
  );
}

// ─── Main Settings Client ─────────────────────────────────────────────────────

export function SettingsClient() {
  const [activeSection, setActiveSection] = useState<SectionId>('general');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<OrgSettings>({
    queryKey: ['org-settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to load settings');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save settings');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-settings'] });
      toast.success('Settings saved');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleSave = async (payload: Record<string, unknown>) => {
    await mutation.mutateAsync(payload);
  };

  const activeInfo = SECTIONS.find((s) => s.id === activeSection)!;

  return (
    <div className='space-y-6'>
      {/* Page header */}
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Settings</h1>
        <p className='text-muted-foreground mt-1'>
          Manage your organization preferences and configuration
        </p>
      </div>

      <div className='flex flex-col lg:flex-row gap-6'>
        {/* Left nav */}
        <nav className='lg:w-56 shrink-0'>
          <div className='lg:sticky lg:top-6'>
            <ul className='space-y-1'>
              {SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <li key={section.id}>
                    <button
                      type='button'
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left relative',
                        isActive
                          ? 'bg-primary/10 text-primary nav-item-active'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-primary')} />
                      <span className='flex-1'>{section.label}</span>
                      {isActive && <ChevronRight className='h-3 w-3 text-primary/60' />}
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Active section description on desktop */}
            <div className='hidden lg:block mt-4 px-3 py-3 rounded-lg bg-muted/50 border border-border/50'>
              <p className='text-xs font-medium text-foreground'>{activeInfo.label}</p>
              <p className='text-xs text-muted-foreground mt-0.5'>{activeInfo.description}</p>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className='flex-1 min-w-0'>
          {isLoading && <SettingsSkeleton />}

          {error && (
            <Card>
              <CardContent className='py-12 text-center'>
                <p className='text-sm text-destructive'>Failed to load settings. Please refresh.</p>
              </CardContent>
            </Card>
          )}

          {data && (
            <>
              {activeSection === 'general' && <GeneralSection data={data} onSave={handleSave} />}
              {activeSection === 'pos' && <POSSection data={data} onSave={handleSave} />}
              {activeSection === 'notifications' && (
                <NotificationsSection data={data} onSave={handleSave} />
              )}
              {activeSection === 'inventory' && (
                <InventorySection data={data} onSave={handleSave} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
