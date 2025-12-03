'use client';

import { useBear } from '@/stores';
import { useUsers, useCreateUser } from '@/hooks/use-users';
import { useState } from 'react';

export default function Home() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');

  // Zustand example - Client state
  const bears = useBear((state: any) => state.bears);
  const increasePopulation = useBear((state: any) => state.increasePopulation);

  // TanStack Query example - Server state
  const { data, isLoading, error } = useUsers();
  const createUserMutation = useCreateUser();

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate({
      name,
      email,
      age: parseInt(age),
    });
    // Reset form
    setName('');
    setEmail('');
    setAge('');
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

      {/* TanStack Query Example - Server State */}
      <section className="border rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">
          TanStack Query Example (Server State)
        </h2>

        {/* Create User Form */}
        <form onSubmit={handleCreateUser} className="mb-6 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
              required
            />
            <input
              type="number"
              placeholder="Age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-24 px-3 py-2 border rounded"
              required
            />
          </div>
          <button
            type="submit"
            disabled={createUserMutation.isPending}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {createUserMutation.isPending ? 'Creating...' : 'Create User'}
          </button>
        </form>

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
