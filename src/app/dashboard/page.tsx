import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className='min-h-screen p-4 md:p-8'>
      <div className='max-w-7xl mx-auto'>
        <DashboardClient />
      </div>
    </div>
  );
}
