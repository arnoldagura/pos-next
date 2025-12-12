import {
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { outputTypeEnum, productionRecipe } from './production-recipes';
import { relations } from 'drizzle-orm';
import { location } from './locations';
import { productInventory } from './product-inventories';
import { materialInventory } from './material-inventories';

export const productionOrderStatusEnum = pgEnum('production_order_status', [
  'draft',
  'scheduled',
  'in_progress',
  'completed',
  'costing_done',
  'cancelled',
]);

export const productionOrder = pgTable(
  'production_order',
  {
    id: text('id').primaryKey(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => productionRecipe.id, {
        onDelete: 'restrict',
      }),
    locationId: text('location_id')
      .notNull()
      .references(() => location.id, {
        onDelete: 'restrict',
      }),
    plannedQuantity: numeric('planned_quantity', {
      precision: 10,
      scale: 2,
    }).notNull(),
    actualQuantity: numeric('actual_quantity', {
      precision: 10,
      scale: 2,
    }),
    status: productionOrderStatusEnum('status')
      .default('draft')
      .notNull(),
    outputType: outputTypeEnum('output_type').notNull(),
    outputProductInventoryId: text('output_product_inventory_id').references(
      () => productInventory.id,
      {
        onDelete: 'set null',
      }
    ),
    outputMaterialInventoryId: text('output_material_inventory_id').references(
      () => materialInventory.id,
      {
        onDelete: 'set null',
      }
    ),
    scheduledDate: date('scheduled_date', { mode: 'date' }),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    materialCost: numeric('material_cost', {
      precision: 10,
      scale: 2,
    })
      .default('0.00')
      .notNull(),
    laborCost: numeric('labor_cost', {
      precision: 10,
      scale: 2,
    })
      .default('0.00')
      .notNull(),
    overheadCost: numeric('overhead_cost', {
      precision: 10,
      scale: 2,
    })
      .default('0.00')
      .notNull(),
    totalCost: numeric('total_cost', {
      precision: 10,
      scale: 2,
    })
      .default('0.00')
      .notNull(),
    unitCost: numeric('unit_cost', {
      precision: 10,
      scale: 2,
    }),
    suggestedPrice: numeric('suggested_price', {
      precision: 10,
      scale: 2,
    }),
    notes: text('notes'),
    createdBy: text('created_by'),
    updatedBy: text('updated_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    recipeIdx: index('production_order_recipe_idx').on(table.recipeId),
    locationIdx: index('production_order_location_idx').on(table.locationId),
    outputProductInventoryIdx: index(
      'production_order_output_product_inventory_idx'
    ).on(table.outputProductInventoryId),
    outputMaterialInventoryIdx: index(
      'production_order_output_material_inventory_idx'
    ).on(table.outputMaterialInventoryId),
    statusIdx: index('production_order_status_idx').on(table.status),
    scheduledDateIdx: index('production_order_scheduled_date_idx').on(
      table.scheduledDate
    ),
  })
);

export const productionMaterial = pgTable(
  'production_material',
  {
    id: text('id').primaryKey(),
    productionOrderId: text('production_order_id')
      .notNull()
      .references(() => productionOrder.id, {
        onDelete: 'cascade',
      }),
    materialInventoryId: text('material_inventory_id')
      .notNull()
      .references(() => materialInventory.id, {
        onDelete: 'restrict',
      }),
    plannedQuantity: numeric('planned_quantity', {
      precision: 10,
      scale: 2,
    }).notNull(),
    actualQuantity: numeric('actual_quantity', {
      precision: 10,
      scale: 2,
    }),
    unitOfMeasure: text('unit_of_measure').notNull(),
    unitCost: numeric('unit_cost', {
      precision: 10,
      scale: 2,
    }),
    totalCost: numeric('total_cost', {
      precision: 10,
      scale: 2,
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    productionOrderIdx: index('production_material_production_order_idx').on(
      table.productionOrderId
    ),
    materialInventoryIdx: index('production_material_material_inventory_idx').on(
      table.materialInventoryId
    ),
  })
);

export const productionQualityCheck = pgTable(
  'production_quality_check',
  {
    id: text('id').primaryKey(),
    productionOrderId: text('production_order_id')
      .notNull()
      .references(() => productionOrder.id, {
        onDelete: 'cascade',
      }),
    checkType: text('check_type').notNull(),
    checkResult: text('check_result').notNull(),
    notes: text('notes'),
    checkedBy: text('checked_by'),
    checkedAt: timestamp('checked_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    productionOrderIdx: index(
      'production_quality_check_production_order_idx'
    ).on(table.productionOrderId),
    checkedAtIdx: index('production_quality_check_checked_at_idx').on(
      table.checkedAt
    ),
  })
);

export const productionOrderRelations = relations(
  productionOrder,
  ({ one, many }) => ({
    recipe: one(productionRecipe, {
      fields: [productionOrder.recipeId],
      references: [productionRecipe.id],
    }),
    location: one(location, {
      fields: [productionOrder.locationId],
      references: [location.id],
    }),
    outputProductInventory: one(productInventory, {
      fields: [productionOrder.outputProductInventoryId],
      references: [productInventory.id],
    }),
    outputMaterialInventory: one(materialInventory, {
      fields: [productionOrder.outputMaterialInventoryId],
      references: [materialInventory.id],
    }),
    materials: many(productionMaterial),
    qualityChecks: many(productionQualityCheck),
  })
);

export const productionMaterialRelations = relations(
  productionMaterial,
  ({ one }) => ({
    productionOrder: one(productionOrder, {
      fields: [productionMaterial.productionOrderId],
      references: [productionOrder.id],
    }),
    materialInventory: one(materialInventory, {
      fields: [productionMaterial.materialInventoryId],
      references: [materialInventory.id],
    }),
  })
);

export const productionQualityCheckRelations = relations(
  productionQualityCheck,
  ({ one }) => ({
    productionOrder: one(productionOrder, {
      fields: [productionQualityCheck.productionOrderId],
      references: [productionOrder.id],
    }),
  })
);
