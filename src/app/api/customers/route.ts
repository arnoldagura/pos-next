import { db } from '@/db/db';
import { customer } from '@/drizzle/schema/customers';
import { randomUUID } from 'crypto';
import { or, ilike, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const query = db.select().from(customer);

    const customers = search
      ? await query
          .where(
            or(
              ilike(customer.name, `%${search}%`),
              ilike(customer.email, `%${search}%`),
              ilike(customer.phone, `%${search}%`)
            )
          )
          .orderBy(desc(customer.createdAt))
          .limit(limit)
          .offset(offset)
      : await query
          .orderBy(desc(customer.createdAt))
          .limit(limit)
          .offset(offset);

    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const [newCustomer] = await db
      .insert(customer)
      .values({
        id: randomUUID(),
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        country: country || null,
        notes: notes || null,
        loyaltyPoints: '0',
        isActive: true,
      })
      .returning();

    return NextResponse.json(newCustomer, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}
