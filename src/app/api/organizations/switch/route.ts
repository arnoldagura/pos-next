import { NextRequest, NextResponse } from 'next/server';
import { setCurrentTenant } from '@/lib/tenant-context';
import { isTenantError } from '@/lib/errors/tenant-errors';

/**
 * POST /api/organizations/switch
 * Switch the current organization/tenant
 * Includes rate limiting and audit logging
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Extract IP and User-Agent for audit logging
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    const userAgent = req.headers.get('user-agent');

    // Use centralized setCurrentTenant with rate limiting and audit logging
    await setCurrentTenant(organizationId, ipAddress, userAgent);

    return NextResponse.json({
      success: true,
      organizationId,
    });
  } catch (error) {
    console.error('Error switching organization:', error);

    // Handle custom tenant errors with proper status codes
    if (isTenantError(error)) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    // Generic error fallback
    return NextResponse.json({ error: 'Failed to switch organization' }, { status: 500 });
  }
}
