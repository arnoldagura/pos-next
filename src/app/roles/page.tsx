import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { RolesTable } from '@/components/roles/roles-table';
import { PermissionsMatrix } from '@/components/roles/permissions-matrix';
import { hasPermission } from '@/lib/rbac';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Key } from 'lucide-react';

function RolesPageSkeleton() {
  return <div className='p-6 animate-pulse bg-gray-100 rounded-lg h-96' />;
}

async function RolesPageContent() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has permission to manage users/roles
  const canManageUsers = await hasPermission(user.id, 'users:update');

  if (!canManageUsers) {
    return (
      <div className='p-6'>
        <h1 className='text-2xl font-bold text-red-600'>Access Denied</h1>
        <p className='mt-2 text-gray-600'>
          You do not have permission to manage roles and permissions.
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Roles & Permissions</h1>
        <p className='text-gray-600 mt-2'>
          Manage user roles and their associated permissions to control access throughout your
          system
        </p>
      </div>

      <Tabs defaultValue='roles' className='w-full'>
        <TabsList className='grid w-full max-w-md grid-cols-2'>
          <TabsTrigger value='roles' className='flex items-center gap-2'>
            <Shield className='h-4 w-4' />
            Roles
          </TabsTrigger>
          <TabsTrigger value='matrix' className='flex items-center gap-2'>
            <Key className='h-4 w-4' />
            Permissions Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value='roles' className='mt-6'>
          <RolesTable />
        </TabsContent>

        <TabsContent value='matrix' className='mt-6'>
          <PermissionsMatrix />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function RolesPage() {
  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto px-4 py-8'>
        <Suspense fallback={<RolesPageSkeleton />}>
          <RolesPageContent />
        </Suspense>
      </div>
    </div>
  );
}
