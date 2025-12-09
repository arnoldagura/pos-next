import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calculateMaterialCost,
  calculateFullCost,
  calculateSuggestedPrice,
  estimateProductionCost,
  batchCostAnalysis,
  ProductionCostingError,
} from '../production-costing';
import { db } from '@/db/db';

// Mock the database
vi.mock('@/db/db', () => ({
  db: {
    query: {
      productionOrder: {
        findFirst: vi.fn(),
      },
      productionRecipe: {
        findFirst: vi.fn(),
      },
    },
  },
}));

describe('Production Costing Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateMaterialCost', () => {
    it('should calculate total material cost correctly', async () => {
      const mockOrder = {
        id: 'order_1',
        materials: [
          {
            materialId: 'mat_1',
            plannedQuantity: '10.00',
            actualQuantity: '10.00',
            unitCost: '5.00',
            unitOfMeasure: 'kg',
            material: {
              name: 'Flour',
              defaultCost: '5.00',
            },
          },
          {
            materialId: 'mat_2',
            plannedQuantity: '5.00',
            actualQuantity: '5.00',
            unitCost: '10.00',
            unitOfMeasure: 'L',
            material: {
              name: 'Milk',
              defaultCost: '10.00',
            },
          },
        ],
      };

      vi.mocked(db.query.productionOrder.findFirst).mockResolvedValue(mockOrder as never);

      const result = await calculateMaterialCost('order_1');

      expect(result.totalCost).toBe(100); // (10 * 5) + (5 * 10) = 100
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0]).toEqual({
        materialId: 'mat_1',
        materialName: 'Flour',
        quantity: 10,
        unitCost: 5,
        totalCost: 50,
        unitOfMeasure: 'kg',
      });
    });

    it('should use default cost if unit cost is not set', async () => {
      const mockOrder = {
        id: 'order_1',
        materials: [
          {
            materialId: 'mat_1',
            plannedQuantity: '10.00',
            actualQuantity: null,
            unitCost: null,
            unitOfMeasure: 'kg',
            material: {
              name: 'Flour',
              defaultCost: '8.00',
            },
          },
        ],
      };

      vi.mocked(db.query.productionOrder.findFirst).mockResolvedValue(mockOrder as never);

      const result = await calculateMaterialCost('order_1');

      expect(result.totalCost).toBe(80); // 10 * 8
      expect(result.breakdown[0].unitCost).toBe(8);
    });

    it('should throw error if order not found', async () => {
      vi.mocked(db.query.productionOrder.findFirst).mockResolvedValue(undefined);

      await expect(calculateMaterialCost('invalid_order')).rejects.toThrow(
        ProductionCostingError
      );
    });

    it('should handle orders with no materials', async () => {
      const mockOrder = {
        id: 'order_1',
        materials: [],
      };

      vi.mocked(db.query.productionOrder.findFirst).mockResolvedValue(mockOrder as never);

      const result = await calculateMaterialCost('order_1');

      expect(result.totalCost).toBe(0);
      expect(result.breakdown).toHaveLength(0);
    });
  });

  describe('calculateFullCost', () => {
    it('should calculate full cost with all components', async () => {
      const mockOrder = {
        id: 'order_1',
        plannedQuantity: '100',
        actualQuantity: '100',
        laborCost: '200.00',
        overheadCost: '150.00',
        materials: [
          {
            materialId: 'mat_1',
            plannedQuantity: '10.00',
            actualQuantity: '10.00',
            unitCost: '5.00',
            unitOfMeasure: 'kg',
            material: {
              name: 'Flour',
              defaultCost: '5.00',
            },
          },
        ],
      };

      vi.mocked(db.query.productionOrder.findFirst).mockResolvedValue(mockOrder as never);

      const result = await calculateFullCost('order_1');

      expect(result.materialCost).toBe(50); // 10 * 5
      expect(result.laborCost).toBe(200);
      expect(result.overheadCost).toBe(150);
      expect(result.totalCost).toBe(400); // 50 + 200 + 150
      expect(result.unitCost).toBe(4); // 400 / 100
      expect(result.quantity).toBe(100);
    });

    it('should use provided labor and overhead costs', async () => {
      const mockOrder = {
        id: 'order_1',
        plannedQuantity: '100',
        actualQuantity: '100',
        laborCost: '200.00',
        overheadCost: '150.00',
        materials: [
          {
            materialId: 'mat_1',
            plannedQuantity: '10.00',
            actualQuantity: '10.00',
            unitCost: '5.00',
            unitOfMeasure: 'kg',
            material: {
              name: 'Flour',
              defaultCost: '5.00',
            },
          },
        ],
      };

      vi.mocked(db.query.productionOrder.findFirst).mockResolvedValue(mockOrder as never);

      const result = await calculateFullCost('order_1', 300, 250);

      expect(result.laborCost).toBe(300);
      expect(result.overheadCost).toBe(250);
      expect(result.totalCost).toBe(600); // 50 + 300 + 250
    });

    it('should handle zero quantity gracefully', async () => {
      const mockOrder = {
        id: 'order_1',
        plannedQuantity: '0',
        actualQuantity: null,
        laborCost: '0',
        overheadCost: '0',
        materials: [],
      };

      vi.mocked(db.query.productionOrder.findFirst).mockResolvedValue(mockOrder as never);

      const result = await calculateFullCost('order_1');

      expect(result.unitCost).toBe(0);
    });
  });

  describe('calculateSuggestedPrice', () => {
    it('should calculate suggested price with default margin', async () => {
      const mockOrder = {
        id: 'order_1',
        plannedQuantity: '100',
        actualQuantity: '100',
        laborCost: '0',
        overheadCost: '0',
        materials: [
          {
            materialId: 'mat_1',
            plannedQuantity: '100.00',
            actualQuantity: '100.00',
            unitCost: '10.00',
            unitOfMeasure: 'kg',
            material: {
              name: 'Material',
              defaultCost: '10.00',
            },
          },
        ],
      };

      vi.mocked(db.query.productionOrder.findFirst).mockResolvedValue(mockOrder as never);

      const result = await calculateSuggestedPrice('order_1');

      expect(result.unitCost).toBe(10); // 1000 / 100
      expect(result.profitMargin).toBe(30);
      expect(result.profitAmount).toBe(3); // 10 * 0.3
      expect(result.suggestedPrice).toBe(13); // 10 + 3
    });

    it('should calculate suggested price with custom margin', async () => {
      const mockOrder = {
        id: 'order_1',
        plannedQuantity: '100',
        actualQuantity: '100',
        laborCost: '0',
        overheadCost: '0',
        materials: [
          {
            materialId: 'mat_1',
            plannedQuantity: '100.00',
            actualQuantity: '100.00',
            unitCost: '10.00',
            unitOfMeasure: 'kg',
            material: {
              name: 'Material',
              defaultCost: '10.00',
            },
          },
        ],
      };

      vi.mocked(db.query.productionOrder.findFirst).mockResolvedValue(mockOrder as never);

      const result = await calculateSuggestedPrice('order_1', 50);

      expect(result.profitMargin).toBe(50);
      expect(result.profitAmount).toBe(5); // 10 * 0.5
      expect(result.suggestedPrice).toBe(15); // 10 + 5
    });

    it('should throw error for negative profit margin', async () => {
      await expect(calculateSuggestedPrice('order_1', -10)).rejects.toThrow(
        ProductionCostingError
      );
    });
  });

  describe('estimateProductionCost', () => {
    it('should estimate cost for a recipe', async () => {
      const mockRecipe = {
        id: 'recipe_1',
        outputQuantity: '50',
        ingredients: [
          {
            materialId: 'mat_1',
            quantity: '10.00',
            unitOfMeasure: 'kg',
            material: {
              name: 'Flour',
              defaultCost: '5.00',
            },
          },
          {
            materialId: 'mat_2',
            quantity: '5.00',
            unitOfMeasure: 'L',
            material: {
              name: 'Milk',
              defaultCost: '10.00',
            },
          },
        ],
      };

      vi.mocked(db.query.productionRecipe.findFirst).mockResolvedValue(mockRecipe as never);

      const result = await estimateProductionCost('recipe_1', 100, 200, 150);

      // Scaling factor: 100 / 50 = 2
      // Material cost: (10 * 2 * 5) + (5 * 2 * 10) = 100 + 100 = 200
      expect(result.estimatedMaterialCost).toBe(200);
      expect(result.estimatedLaborCost).toBe(200);
      expect(result.estimatedOverheadCost).toBe(150);
      expect(result.estimatedTotalCost).toBe(550);
      expect(result.estimatedUnitCost).toBe(5.5); // 550 / 100
      expect(result.materialBreakdown).toHaveLength(2);
    });

    it('should handle recipe with no labor or overhead', async () => {
      const mockRecipe = {
        id: 'recipe_1',
        outputQuantity: '50',
        ingredients: [
          {
            materialId: 'mat_1',
            quantity: '10.00',
            unitOfMeasure: 'kg',
            material: {
              name: 'Flour',
              defaultCost: '5.00',
            },
          },
        ],
      };

      vi.mocked(db.query.productionRecipe.findFirst).mockResolvedValue(mockRecipe as never);

      const result = await estimateProductionCost('recipe_1', 50);

      expect(result.estimatedMaterialCost).toBe(50); // 10 * 5
      expect(result.estimatedLaborCost).toBe(0);
      expect(result.estimatedOverheadCost).toBe(0);
      expect(result.estimatedTotalCost).toBe(50);
    });

    it('should throw error for invalid quantity', async () => {
      await expect(estimateProductionCost('recipe_1', 0)).rejects.toThrow(
        ProductionCostingError
      );
    });

    it('should throw error if recipe not found', async () => {
      vi.mocked(db.query.productionRecipe.findFirst).mockResolvedValue(undefined);

      await expect(estimateProductionCost('invalid_recipe', 100)).rejects.toThrow(
        ProductionCostingError
      );
    });
  });

  describe('batchCostAnalysis', () => {
    it('should analyze costs for multiple batch sizes', async () => {
      const mockRecipe = {
        id: 'recipe_1',
        outputQuantity: '10',
        ingredients: [
          {
            materialId: 'mat_1',
            quantity: '10.00',
            unitOfMeasure: 'kg',
            material: {
              name: 'Material',
              defaultCost: '5.00',
            },
          },
        ],
      };

      vi.mocked(db.query.productionRecipe.findFirst).mockResolvedValue(mockRecipe as never);

      // Labor cost decreases with volume (economies of scale)
      const laborCalculator = (qty: number) => 100 + qty * 0.5;
      // Overhead is fixed
      const overheadCalculator = () => 50;

      const result = await batchCostAnalysis(
        'recipe_1',
        [10, 50, 100],
        laborCalculator,
        overheadCalculator
      );

      expect(result.batches).toHaveLength(3);
      expect(result.batches[0].quantity).toBe(10);
      expect(result.batches[1].quantity).toBe(50);
      expect(result.batches[2].quantity).toBe(100);

      // Unit cost should decrease with larger batches
      expect(result.batches[2].unitCost).toBeLessThan(result.batches[0].unitCost);

      // Should have recommended batch size
      expect(result.recommendedBatchSize).toBeDefined();
      expect(result.optimalUnitCost).toBeDefined();
    });

    it('should calculate cost savings vs smallest batch', async () => {
      const mockRecipe = {
        id: 'recipe_1',
        outputQuantity: '10',
        ingredients: [
          {
            materialId: 'mat_1',
            quantity: '10.00',
            unitOfMeasure: 'kg',
            material: {
              name: 'Material',
              defaultCost: '5.00',
            },
          },
        ],
      };

      vi.mocked(db.query.productionRecipe.findFirst).mockResolvedValue(mockRecipe as never);

      const result = await batchCostAnalysis('recipe_1', [10, 50]);

      expect(result.batches[0].costSavingsVsSmallest).toBeUndefined();
      expect(result.batches[1].costSavingsVsSmallest).toBeDefined();
      expect(result.batches[1].costSavingsPercentage).toBeDefined();
    });

    it('should throw error for empty quantities array', async () => {
      await expect(batchCostAnalysis('recipe_1', [])).rejects.toThrow(
        ProductionCostingError
      );
    });

    it('should throw error for invalid quantities', async () => {
      await expect(batchCostAnalysis('recipe_1', [10, -5, 100])).rejects.toThrow(
        ProductionCostingError
      );
    });

    it('should sort quantities before analysis', async () => {
      const mockRecipe = {
        id: 'recipe_1',
        outputQuantity: '10',
        ingredients: [
          {
            materialId: 'mat_1',
            quantity: '10.00',
            unitOfMeasure: 'kg',
            material: {
              name: 'Material',
              defaultCost: '5.00',
            },
          },
        ],
      };

      vi.mocked(db.query.productionRecipe.findFirst).mockResolvedValue(mockRecipe as never);

      const result = await batchCostAnalysis('recipe_1', [100, 10, 50]);

      expect(result.batches[0].quantity).toBe(10);
      expect(result.batches[1].quantity).toBe(50);
      expect(result.batches[2].quantity).toBe(100);
    });
  });
});
