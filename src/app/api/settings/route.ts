import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { organization } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { requireTenantId } from '@/lib/tenant-context';
import { getDefaultOrganizationSettings } from '@/drizzle/schema/organizations';
import { updateOrganizationSettingsSchema } from '@/lib/validations/organization';
import { ZodError } from 'zod';
import { invalidateEntityCache } from '@/lib/cache';

/**
 * GET /api/settings
 * Returns the current tenant's organization details and settings
 */
export async function GET() {
  try {
    const tenantId = await requireTenantId();

    const [org] = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        contactName: organization.contactName,
        contactPhone: organization.contactPhone,
        address: organization.address,
        city: organization.city,
        country: organization.country,
        taxId: organization.taxId,
        billingEmail: organization.billingEmail,
        settings: organization.settings,
      })
      .from(organization)
      .where(eq(organization.id, tenantId))
      .limit(1);

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Merge with defaults so new settings fields always have values
    const defaults = getDefaultOrganizationSettings();
    const mergedSettings = {
      pos: { ...defaults.pos, ...org.settings?.pos },
      features: { ...defaults.features, ...org.settings?.features },
      branding: { ...defaults.branding, ...org.settings?.branding },
      notifications: { ...defaults.notifications, ...org.settings?.notifications },
      inventory: { ...defaults.inventory, ...org.settings?.inventory },
    };

    return NextResponse.json({ ...org, settings: mergedSettings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

/**
 * PATCH /api/settings
 * Updates the current tenant's organization details and/or settings
 */
export async function PATCH(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const body = await req.json();

    // Separate org-level fields from settings
    const {
      name,
      contactName,
      contactPhone,
      address,
      city,
      country,
      taxId,
      billingEmail,
      settings: settingsInput,
    } = body;

    // Fetch current org to merge settings
    const [current] = await db
      .select({ settings: organization.settings })
      .from(organization)
      .where(eq(organization.id, tenantId))
      .limit(1);

    if (!current) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const defaults = getDefaultOrganizationSettings();
    const existing = {
      pos: { ...defaults.pos, ...current.settings?.pos },
      features: { ...defaults.features, ...current.settings?.features },
      branding: { ...defaults.branding, ...current.settings?.branding },
      notifications: { ...defaults.notifications, ...current.settings?.notifications },
      inventory: { ...defaults.inventory, ...current.settings?.inventory },
    };

    // Deep-merge new settings over existing
    let mergedSettings = existing;
    if (settingsInput) {
      const validated = updateOrganizationSettingsSchema.parse(settingsInput);
      mergedSettings = {
        pos: { ...existing.pos, ...validated.pos },
        features: { ...existing.features, ...validated.features },
        branding: { ...existing.branding, ...validated.branding },
        notifications: { ...existing.notifications, ...validated.notifications },
        inventory: { ...existing.inventory, ...validated.inventory },
      };
    }

    // Build org-level update
    const orgUpdate: Record<string, unknown> = {
      settings: mergedSettings,
      updatedAt: new Date(),
    };
    if (name !== undefined) orgUpdate.name = name;
    if (contactName !== undefined) orgUpdate.contactName = contactName;
    if (contactPhone !== undefined) orgUpdate.contactPhone = contactPhone;
    if (address !== undefined) orgUpdate.address = address;
    if (city !== undefined) orgUpdate.city = city;
    if (country !== undefined) orgUpdate.country = country;
    if (taxId !== undefined) orgUpdate.taxId = taxId;
    if (billingEmail !== undefined) orgUpdate.billingEmail = billingEmail;

    const [updated] = await db
      .update(organization)
      .set(orgUpdate)
      .where(eq(organization.id, tenantId))
      .returning({
        id: organization.id,
        name: organization.name,
        settings: organization.settings,
      });

    // Invalidate cached org settings
    await invalidateEntityCache('settings', tenantId);

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
