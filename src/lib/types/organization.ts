import { SubscriptionTier } from '../validations/organization';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  domain: string | null;
  status: OrgStatus;
  subscriptionTier: SubscriptionTier;
  maxUsers: number;
  maxLocations: number;
  billingEmail: string | null;
  contactName: string | null;
  contactPhone: string | null;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export enum OrgStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  CANCELLED = 'cancelled',
}
