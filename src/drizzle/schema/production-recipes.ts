import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  numeric,
  boolean,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { product } from './products';
import { material } from './materials';
import { organization } from './organizations';

export const outputTypeEnum = pgEnum('output_type', ['product', 'material']);

export const productionRecipe = pgTable(
  'production_recipe',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    outputType: outputTypeEnum('output_type').notNull(),
    outputProductId: text('output_product_id').references(() => product.id, {
      onDelete: 'set null',
    }),
    outputMaterialId: text('output_material_id').references(
      () => material.id,
      {
        onDelete: 'set null',
      }
    ),
    outputQuantity: numeric('output_quantity', {
      precision: 10,
      scale: 2,
    }).notNull(),
    unitOfMeasure: text('unit_of_measure').notNull(),
    status: boolean('status').default(true).notNull(),
    createdBy: text('created_by'),
    updatedBy: text('updated_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    orgIdx: index('production_recipe_org_idx').on(table.organizationId),
    nameIdx: index('production_recipe_name_idx').on(table.name),
    outputTypeIdx: index('production_recipe_output_type_idx').on(
      table.outputType
    ),
    outputProductIdx: index('production_recipe_output_product_idx').on(
      table.outputProductId
    ),
    outputMaterialIdx: index('production_recipe_output_material_idx').on(
      table.outputMaterialId
    ),
    statusIdx: index('production_recipe_status_idx').on(table.status),
  })
);

export const productionRecipeIngredient = pgTable(
  'production_recipe_ingredient',
  {
    id: text('id').primaryKey(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => productionRecipe.id, {
        onDelete: 'cascade',
      }),
    materialId: text('material_id')
      .notNull()
      .references(() => material.id, {
        onDelete: 'restrict',
      }),
    quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
    unitOfMeasure: text('unit_of_measure').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    recipeIdx: index('production_recipe_ingredient_recipe_idx').on(
      table.recipeId
    ),
    materialIdx: index('production_recipe_ingredient_material_idx').on(
      table.materialId
    ),
  })
);

export const productionRecipeRelations = relations(
  productionRecipe,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [productionRecipe.organizationId],
      references: [organization.id],
    }),
    outputProduct: one(product, {
      fields: [productionRecipe.outputProductId],
      references: [product.id],
    }),
    outputMaterial: one(material, {
      fields: [productionRecipe.outputMaterialId],
      references: [material.id],
    }),
    ingredients: many(productionRecipeIngredient),
  })
);

export const productionRecipeIngredientRelations = relations(
  productionRecipeIngredient,
  ({ one }) => ({
    recipe: one(productionRecipe, {
      fields: [productionRecipeIngredient.recipeId],
      references: [productionRecipe.id],
    }),
    material: one(material, {
      fields: [productionRecipeIngredient.materialId],
      references: [material.id],
    }),
  })
);
