import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
type User = {
  id: number;
  name: string;
  email: string;
  age: number;
};

type UsersResponse = {
  users: User[];
};

type CreateUserData = {
  name: string;
  email: string;
  age: number;
};

// API functions
async function fetchUsers(): Promise<UsersResponse> {
  const response = await fetch('/api/users');
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  return response.json();
}

async function createUser(userData: CreateUserData): Promise<{ user: User }> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  if (!response.ok) {
    throw new Error('Failed to create user');
  }
  return response.json();
}

// Hooks
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      // Invalidate and refetch users query after successful creation
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
