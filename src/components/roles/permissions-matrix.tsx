'use client';

import { useState, useEffect } from 'react';
import { Key, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Role, Permission, PermissionsByResource } from '@/lib/types/rbac';

type PermissionMatrix = {
  [roleId: string]: Set<string>; // roleId -> Set of permissionIds
};

export function PermissionsMatrix() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionsByResource, setPermissionsByResource] = useState<PermissionsByResource>({});
  const [matrix, setMatrix] = useState<PermissionMatrix>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch roles
        const rolesResponse = await fetch('/api/roles');
        if (!rolesResponse.ok) throw new Error('Failed to fetch roles');
        const rolesData = await rolesResponse.json();
        const rolesArray = rolesData.roles || [];
        setRoles(rolesArray);

        // Fetch permissions
        const permsResponse = await fetch('/api/permissions');
        if (!permsResponse.ok) throw new Error('Failed to fetch permissions');
        const permsData = await permsResponse.json();
        const permsArray = permsData.permissions || [];
        setPermissions(permsArray);

        // Group permissions by resource
        const grouped = permsArray.reduce((acc: PermissionsByResource, perm: Permission) => {
          if (!acc[perm.resource]) {
            acc[perm.resource] = [];
          }
          acc[perm.resource].push(perm);
          return acc;
        }, {});
        setPermissionsByResource(grouped);

        // Fetch each role's permissions to build the matrix
        const newMatrix: PermissionMatrix = {};
        await Promise.all(
          rolesArray.map(async (role: Role) => {
            const roleResponse = await fetch(`/api/roles/${role.id}`);
            if (roleResponse.ok) {
              const roleData = await roleResponse.json();
              newMatrix[role.id] = new Set(
                roleData.permissions?.map((p: Permission) => p.id) || []
              );
            }
          })
        );
        setMatrix(newMatrix);
      } catch (error) {
        toast.error('Failed to load permissions matrix');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const hasPermission = (roleId: string, permissionId: string): boolean => {
    return matrix[roleId]?.has(permissionId) || false;
  };

  const getResourceLabel = (resource: string) => {
    return resource
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className='py-12'>
          <div className='flex items-center justify-center'>
            <div className='text-gray-500'>Loading permissions matrix...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (roles.length === 0 || permissions.length === 0) {
    return (
      <Card>
        <CardContent className='py-12'>
          <div className='flex flex-col items-center justify-center text-center'>
            <Key className='h-16 w-16 text-gray-300 mb-4' />
            <p className='text-gray-500'>
              {roles.length === 0 ? 'No roles created yet' : 'No permissions available'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Key className='h-5 w-5' />
          Permissions Matrix
        </CardTitle>
        <CardDescription>Overview of permissions assigned to each role</CardDescription>
      </CardHeader>

      <CardContent>
        <ScrollArea className='w-full'>
          <div className='min-w-[800px]'>
            {Object.entries(permissionsByResource).map(([resource, perms]) => (
              <div key={resource} className='mb-6'>
                <div className='flex items-center gap-2 mb-3'>
                  <h3 className='font-semibold text-lg'>{getResourceLabel(resource)}</h3>
                  <Badge variant='outline'>{perms.length} permissions</Badge>
                </div>

                <div className='rounded-md border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='w-[200px]'>Action</TableHead>
                        {roles.map((role) => (
                          <TableHead key={role.id} className='text-center'>
                            <div className='flex flex-col items-center'>
                              <span className='font-medium'>{role.name}</span>
                              {role.isGlobal && (
                                <Badge variant='secondary' className='mt-1 text-xs'>
                                  Global
                                </Badge>
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {perms.map((perm) => (
                        <TableRow key={perm.id}>
                          <TableCell className='font-medium'>
                            <div>
                              <div className='font-medium'>{perm.action}</div>
                              {perm.description && (
                                <div className='text-xs text-gray-500 mt-1'>{perm.description}</div>
                              )}
                            </div>
                          </TableCell>
                          {roles.map((role) => (
                            <TableCell key={role.id} className='text-center'>
                              {hasPermission(role.id, perm.id) ? (
                                <div className='flex justify-center'>
                                  <div className='rounded-full bg-green-100 p-1'>
                                    <Check className='h-4 w-4 text-green-600' />
                                  </div>
                                </div>
                              ) : (
                                <div className='flex justify-center'>
                                  <div className='rounded-full bg-gray-100 p-1'>
                                    <X className='h-4 w-4 text-gray-400' />
                                  </div>
                                </div>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
