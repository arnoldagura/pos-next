import { db, schema } from './db';
import { eq } from 'drizzle-orm';

// This file demonstrates type inference is working correctly
// You can delete this file once you've verified everything works

async function testTypeInference() {
  // Test 1: Insert with type inference
  const newUser = await db.insert(schema.usersTable).values({
    name: 'Test User',
    age: 25,
    email: 'test@example.com',
  }).returning();

  // newUser should be typed as { id: number, name: string, age: number, email: string }[]
  console.log('New user:', newUser);

  // Test 2: Select with type inference
  const users = await db.select().from(schema.usersTable);

  // users should be typed as { id: number, name: string, age: number, email: string }[]
  console.log('All users:', users);

  // Test 3: Select with where clause
  const user = await db.select()
    .from(schema.usersTable)
    .where(eq(schema.usersTable.id, 1));

  // user should be typed correctly
  console.log('User with id 1:', user);

  // Test 4: Update with type inference
  await db.update(schema.usersTable)
    .set({ age: 26 })
    .where(eq(schema.usersTable.id, 1));

  // Test 5: Delete with type inference
  await db.delete(schema.usersTable)
    .where(eq(schema.usersTable.id, 1));

  console.log('Type inference test completed successfully!');
}

// Uncomment to run the test
// testTypeInference().catch(console.error);
