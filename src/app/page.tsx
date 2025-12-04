'use client';

import { useBear } from '@/stores';
import { useUsers, useCreateUser } from '@/hooks/use-users';
import { UserFormExample } from '@/components/forms/user-form-example';
import type { CreateUserInput } from '@/lib/validations/user';

export default function Home() {
  // Zustand example - Client state
  const bears = useBear((state) => state.bears);
  const increasePopulation = useBear((state) => state.increasePopulation);

  // TanStack Query example - Server state
  const { data, isLoading, error } = useUsers();
  const createUserMutation = useCreateUser();

  const handleCreateUser = (formData: CreateUserInput) => {
    createUserMutation.mutate(formData);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Zustand Example - Client State */}
      <section className="border rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">
          Zustand Example (Client State)
        </h2>
        <div className="space-y-4">
          <h3 className="text-xl">{bears} bears around here...</h3>
          <button
            onClick={increasePopulation}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Bear
          </button>
        </div>
      </section>

      {/* TanStack Query + React Hook Form Example */}
      <section className="border rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">
          React Hook Form + Zod Validation
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          This form uses React Hook Form with Zod schema validation
        </p>

        {/* Create User Form with Validation */}
        <UserFormExample onSubmit={handleCreateUser} />

      </section>

      {/* TanStack Query - User List */}
      <section className="border rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">
          TanStack Query Example (Server State)
        </h2>

        {/* Users List */}
        {isLoading && <p>Loading users...</p>}
        {error && <p className="text-red-500">Error: {error.message}</p>}
        {data && (
          <div className="space-y-2">
            <h3 className="font-semibold">Users:</h3>
            {data.users.map((user) => (
              <div
                key={user.id}
                className="p-3 bg-gray-100 rounded flex justify-between"
              >
                <span>{user.name}</span>
                <span className="text-gray-600">{user.email}</span>
                <span className="text-gray-500">Age: {user.age}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
