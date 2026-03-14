'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Check } from 'lucide-react';

type Role = {
  id: string;
  name: string;
  description: string | null;
};

type User = {
  id: string;
  name: string;
  email: string;
  roles: { id: string; name: string }[];
};

type RoleAssignmentDialogProps = {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function RoleAssignmentDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: RoleAssignmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(user.roles.map((r) => r.id));

  useEffect(() => {
    if (open) {
      fetchRoles();
      setSelectedRoleIds(user.roles.map((r) => r.id));
    }
  }, [open, user]);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      if (!response.ok) throw new Error('Failed to fetch roles');

      const data = await response.json();
      setAvailableRoles(data.roles);
    } catch (error) {
      toast.error('Failed to load roles');
      console.error(error);
    }
  };

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${user.id}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds: selectedRoleIds }),
      });

      if (!response.ok) throw new Error('Failed to update roles');

      toast.success('Roles updated successfully');
      onSuccess();
    } catch (error) {
      toast.error('Failed to update roles');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Manage User Roles</DialogTitle>
          <DialogDescription>
            Assign roles to {user.name}. Select or deselect roles to update their permissions.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3'>
          {availableRoles.map((role) => {
            const isSelected = selectedRoleIds.includes(role.id);
            return (
              <div
                key={role.id}
                onClick={() => toggleRole(role.id)}
                className={`
                  p-4 rounded-lg border-2 cursor-pointer transition-colors
                  ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className='flex items-start justify-between'>
                  <div className='flex-1'>
                    <div className='flex items-center gap-2'>
                      <p className='font-medium capitalize'>{role.name}</p>
                      {isSelected && <Check className='h-4 w-4 text-blue-500' />}
                    </div>
                    {role.description && (
                      <p className='text-sm text-gray-600 mt-1'>{role.description}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {availableRoles.length === 0 && (
            <p className='text-center text-gray-500 py-4'>No roles available</p>
          )}
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type='button' onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Roles'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
