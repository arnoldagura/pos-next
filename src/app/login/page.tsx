import { LoginForm } from '@/components/auth/login-form';
import { getOrganizationFromSubdomain, getCurrentSubdomain } from '@/lib/tenant-registration';
import { Suspense } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

async function LoginContent() {
  const tenantInfo = await getOrganizationFromSubdomain();
  const subdomain = await getCurrentSubdomain();

  if (subdomain && !tenantInfo.organization) {
    return (
      <div className='auth-page-wrapper'>
        <div className='w-full max-w-md'>
          <Card className='shadow-lg border-border/60'>
            <CardContent className='px-8 py-8 space-y-6'>
              <div className='flex flex-col items-center text-center space-y-3'>
                <div className='flex items-center justify-center w-14 h-14 rounded-2xl bg-destructive/10'>
                  <AlertTriangle className='w-7 h-7 text-destructive' />
                </div>
                <div className='space-y-1'>
                  <h1 className='text-xl font-bold tracking-tight'>Organization Not Found</h1>
                  <p className='text-sm text-muted-foreground'>
                    The subdomain{' '}
                    <span className='font-semibold text-foreground'>&quot;{subdomain}&quot;</span>{' '}
                    does not exist.
                  </p>
                </div>
              </div>

              <div className='rounded-lg bg-destructive/5 border border-destructive/20 p-4 text-sm text-muted-foreground space-y-1'>
                <p className='font-medium text-foreground mb-2'>This could mean:</p>
                <ul className='space-y-1 list-disc list-inside'>
                  <li>The organization subdomain is incorrect</li>
                  <li>The organization has been deactivated</li>
                  <li>You may have a typo in the URL</li>
                </ul>
              </div>

              <div className='space-y-3'>
                <Button className='w-full' asChild>
                  <a
                    href={`${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://${
                      process.env.NODE_ENV === 'production'
                        ? process.env.NEXT_PUBLIC_APP_DOMAIN || 'yourapp.com'
                        : 'localhost:3000'
                    }/login`}
                  >
                    Go to Main Login
                  </a>
                </Button>
                <p className='text-center text-xs text-muted-foreground'>
                  Need help?{' '}
                  <Link
                    href='/contact'
                    className='underline underline-offset-4 hover:text-foreground'
                  >
                    Contact support
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className='auth-page-wrapper'>
      <div className='w-full max-w-md space-y-4'>
        {tenantInfo.organization && (
          <div className='flex items-center gap-2.5 px-4 py-3 rounded-lg bg-primary/10 border border-primary/20 text-sm'>
            <div className='w-2 h-2 rounded-full bg-primary shrink-0' />
            <p className='text-foreground'>
              Signing in to <span className='font-semibold'>{tenantInfo.organization.name}</span>
            </p>
          </div>
        )}
        <LoginForm
          organizationName={tenantInfo.organization?.name}
          organizationId={tenantInfo.organizationId}
        />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className='auth-page-wrapper'>
          <div className='w-full max-w-md'>
            <Card className='shadow-lg'>
              <CardContent className='flex flex-col items-center justify-center py-16 gap-4'>
                <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                <p className='text-sm text-muted-foreground font-medium'>Loading...</p>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
