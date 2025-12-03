import { NextResponse } from 'next/server';

// Sample user data
const users = [
  { id: 1, name: 'John Doe', email: 'john@example.com', age: 30 },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25 },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 35 },
];

export async function GET() {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const body = await request.json();
  const newUser = {
    id: users.length + 1,
    ...body,
  };
  users.push(newUser);

  return NextResponse.json({ user: newUser }, { status: 201 });
}
