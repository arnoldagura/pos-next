import { randomUUID } from 'crypto';
import postgres from 'postgres';
import { config } from 'dotenv';

config();

async function seedCategories() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    console.log('Seeding categories...');

    // Create parent categories
    const foodId = randomUUID();
    const beveragesId = randomUUID();
    const dessertsId = randomUUID();

    // Insert parent product categories
    await sql`
      INSERT INTO product_category (id, name, description, slug, display_order, is_active)
      VALUES
        (${foodId}, 'Food', 'Main food items and dishes', 'food', 1, true),
        (${beveragesId}, 'Beverages', 'Drinks and beverages', 'beverages', 2, true),
        (${dessertsId}, 'Desserts', 'Sweet treats and desserts', 'desserts', 3, true)
      ON CONFLICT (slug) DO NOTHING
    `;

    console.log('✓ Parent product categories created');

    // Insert child categories for Food
    await sql`
      INSERT INTO product_category (id, name, description, slug, parent_id, display_order, is_active)
      VALUES
        (${randomUUID()}, 'Appetizers', 'Starters and small plates', 'appetizers', ${foodId}, 1, true),
        (${randomUUID()}, 'Main Course', 'Main dishes and entrees', 'main-course', ${foodId}, 2, true),
        (${randomUUID()}, 'Side Dishes', 'Accompaniments and sides', 'side-dishes', ${foodId}, 3, true),
        (${randomUUID()}, 'Salads', 'Fresh salads and greens', 'salads', ${foodId}, 4, true)
      ON CONFLICT (slug) DO NOTHING
    `;

    console.log('✓ Food subcategories created');

    // Insert child categories for Beverages
    await sql`
      INSERT INTO product_category (id, name, description, slug, parent_id, display_order, is_active)
      VALUES
        (${randomUUID()}, 'Hot Drinks', 'Coffee, tea, and hot beverages', 'hot-drinks', ${beveragesId}, 1, true),
        (${randomUUID()}, 'Cold Drinks', 'Juices, sodas, and cold beverages', 'cold-drinks', ${beveragesId}, 2, true),
        (${randomUUID()}, 'Alcoholic', 'Beer, wine, and spirits', 'alcoholic', ${beveragesId}, 3, true),
        (${randomUUID()}, 'Smoothies', 'Fruit and vegetable smoothies', 'smoothies', ${beveragesId}, 4, true)
      ON CONFLICT (slug) DO NOTHING
    `;

    console.log('✓ Beverage subcategories created');

    // Insert child categories for Desserts
    await sql`
      INSERT INTO product_category (id, name, description, slug, parent_id, display_order, is_active)
      VALUES
        (${randomUUID()}, 'Cakes', 'Cakes and pastries', 'cakes', ${dessertsId}, 1, true),
        (${randomUUID()}, 'Ice Cream', 'Ice cream and frozen treats', 'ice-cream', ${dessertsId}, 2, true),
        (${randomUUID()}, 'Cookies', 'Cookies and biscuits', 'cookies', ${dessertsId}, 3, true),
        (${randomUUID()}, 'Puddings', 'Puddings and custards', 'puddings', ${dessertsId}, 4, true)
      ON CONFLICT (slug) DO NOTHING
    `;

    console.log('✓ Dessert subcategories created');
    console.log('✓ All categories seeded successfully!');
  } catch (error) {
    console.error('Error seeding categories:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

seedCategories()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
