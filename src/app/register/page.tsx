import { RegisterForm } from '@/components/auth/register-form';
import { getRegistrationTenant } from '@/lib/tenant-registration';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface RegisterPageProps {
  searchParams: Promise<{ org?: string; orgId?: string }>;
}

async function RegisterContent({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const tenantInfo = await getRegistrationTenant(params);

  return (
    <div className='auth-page-wrapper'>
      <div className='w-full max-w-md space-y-4'>
        {tenantInfo.organization && (
          <div className='flex items-center gap-2.5 px-4 py-3 rounded-lg bg-primary/10 border border-primary/20 text-sm'>
            <div className='w-2 h-2 rounded-full bg-primary shrink-0' />
            <p className='text-foreground'>
              Registering for <span className='font-semibold'>{tenantInfo.organization.name}</span>
            </p>
          </div>
        )}
        <RegisterForm
          organizationId={tenantInfo.organizationId}
          organizationName={tenantInfo.organization?.name}
        />
      </div>
    </div>
  );
}

export default function RegisterPage(props: RegisterPageProps) {
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
      <RegisterContent {...props} />
    </Suspense>
  );
}
