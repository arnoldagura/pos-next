'use client';

import { useSidebar } from '@/contexts/sidebar-context';
import { UserMenu } from '@/components/auth/user-menu';
import { ThemeSettingsDialog } from '@/components/settings/theme-settings-dialog';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  Layers,
  FileText,
  Factory,
  MapPin,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Store as StoreIcon,
  ShoppingCart,
  UserCircle,
  Building2,
  Shield,
  ChefHat,
} from 'lucide-react';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useExtendedSession } from '@/hooks/use-extended-session';
import { TenantSelector } from './tenant-selector';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
  superAdminOnly?: boolean;
}

const navGroups: NavGroup[] = [
  {
    items: [
      { title: 'POS', href: '/pos', icon: StoreIcon },
      { title: 'Kitchen', href: '/kitchen', icon: ChefHat },
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Sales',
    items: [
      { title: 'Orders', href: '/orders', icon: ShoppingCart },
      { title: 'Customers', href: '/customers', icon: UserCircle },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { title: 'Categories', href: '/categories', icon: Layers },
      { title: 'Products', href: '/products', icon: Package },
      { title: 'Material Categories', href: '/material-categories', icon: Layers },
      { title: 'Materials', href: '/materials', icon: Package },
    ],
  },
  {
    title: 'Inventory',
    items: [
      {
        title: 'Product Inventories',
        href: '/product-inventories',
        icon: Package,
      },
      {
        title: 'Material Inventories',
        href: '/material-inventories',
        icon: Package,
      },
    ],
  },
  {
    title: 'Production',
    items: [
      { title: 'Recipes', href: '/recipes', icon: FileText },
      { title: 'Production Orders', href: '/production-orders', icon: Factory },
    ],
  },
  {
    title: 'Management',
    items: [
      { title: 'Locations', href: '/locations', icon: MapPin },
      { title: 'Users', href: '/users', icon: Users },
      { title: 'Roles & Permissions', href: '/roles', icon: Shield },
    ],
  },
  {
    title: 'Admin',
    superAdminOnly: true,
    items: [{ title: 'Organizations', href: '/admin/organizations', icon: Building2 }],
  },
];

export function Sidebar() {
  const { data: session, isPending } = useExtendedSession();
  const { mobileOpen, setMobileOpen, collapsed, setCollapsed } = useSidebar();
  const pathname = usePathname();

  if (isPending || !session) {
    return null;
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className='fixed inset-0 z-40 bg-black/50 lg:hidden'
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r bg-sidebar transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className='flex h-full flex-col'>
          {/* Header with Logo and Toggle */}
          <div className='flex items-center justify-between h-16 px-4 border-b border-sidebar-border'>
            {collapsed ? (
              <Link href='/' className='flex items-center justify-center'>
                <div className='w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center'>
                  <StoreIcon className='h-4 w-4 text-sidebar-primary-foreground' />
                </div>
              </Link>
            ) : (
              <Link href='/' className='flex items-center gap-2.5 text-sidebar-foreground'>
                <div className='w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0'>
                  <StoreIcon className='h-4 w-4 text-sidebar-primary-foreground' />
                </div>
                <span className='text-base font-bold tracking-tight'>POS Next</span>
              </Link>
            )}
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setCollapsed(!collapsed)}
              className='h-8 w-8 p-0 ml-auto'
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <PanelLeft className='h-4 w-4' />
              ) : (
                <PanelLeftClose className='h-4 w-4' />
              )}
            </Button>
          </div>

          {/* Tenant Selector for Super Admin */}
          {session?.user?.isSuperAdmin &&
            session?.user?.organizations &&
            session.user.organizations.length > 0 && (
              <div className='p-3 border-b border-sidebar-border'>
                <TenantSelector
                  organizations={session.user.organizations}
                  currentOrganizationId={session.user.currentOrganizationId}
                  collapsed={collapsed}
                />
              </div>
            )}

          {/* Navigation */}
          <ScrollArea className='flex-1'>
            <nav className='p-2 space-y-4'>
              {navGroups.map((group, groupIndex) => {
                // Hide super admin only sections if user is not a super admin
                if (group.superAdminOnly && !session?.user?.isSuperAdmin) {
                  return null;
                }

                return (
                  <div key={groupIndex} className='space-y-1'>
                    {group.title && !collapsed && (
                      <div className='flex items-center gap-2 px-3 pt-1 pb-0.5'>
                        <span className='text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-widest'>
                          {group.title}
                        </span>
                        <div className='flex-1 h-px bg-sidebar-border/60' />
                      </div>
                    )}
                    <div className='space-y-1'>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
                              isActive
                                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold nav-item-active'
                                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                              collapsed && 'justify-center px-2'
                            )}
                            title={collapsed ? item.title : undefined}
                          >
                            <Icon
                              className={cn('h-4 w-4 shrink-0', isActive && 'text-sidebar-primary')}
                            />
                            {!collapsed && <span>{item.title}</span>}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>

            <Separator className='my-2' />

            {/* Settings */}
            <div className='p-2'>
              <Link
                href='/settings'
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150',
                  pathname === '/settings'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold nav-item-active'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? 'Settings' : undefined}
              >
                <Settings
                  className={cn(
                    'h-4 w-4 shrink-0',
                    pathname === '/settings' && 'text-sidebar-primary'
                  )}
                />
                {!collapsed && <span>Settings</span>}
              </Link>
            </div>
          </ScrollArea>

          {/* Footer with Theme Toggle and User Menu */}
          <div className='border-t border-sidebar-border p-3 space-y-2'>
            {!collapsed && (
              <div className='w-full'>
                <ThemeSettingsDialog />
              </div>
            )}
            <Suspense
              fallback={
                <div className='flex items-center gap-2 p-2'>
                  <Skeleton className='h-8 w-8 rounded-full' />
                  {!collapsed && (
                    <div className='flex flex-col gap-2'>
                      <Skeleton className='h-4 w-24' />
                      <Skeleton className='h-3 w-32' />
                    </div>
                  )}
                </div>
              }
            >
              <UserMenu />
            </Suspense>
          </div>
        </div>
      </aside>
    </>
  );
}
