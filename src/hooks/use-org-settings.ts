import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { OrganizationSettings } from '@/lib/validations/organization';

interface OrgData {
  id: string;
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  taxId: string | null;
  billingEmail: string | null;
  settings: OrganizationSettings;
}

export function useOrgSettings() {
  return useQuery<OrgData>({
    queryKey: ['org-settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Returns a formatCurrency function bound to the org's configured currency.
 * Falls back to USD if settings are not yet loaded.
 */
export function useFormatCurrency() {
  const { data } = useOrgSettings();
  const currency = data?.settings?.pos?.currency ?? 'USD';
  return (value: number) => formatCurrency(value, currency);
}
