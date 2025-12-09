import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCartStore } from '../cart.store';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

describe('Cart Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    useCartStore.setState({
      activeCartId: null,
      carts: new Map(),
    });
    localStorageMock.clear();
  });

  describe('Cart Management', () => {
    it('should create a new cart', () => {
      const cartId = useCartStore.getState().createCart();
      expect(cartId).toBeTruthy();
      expect(useCartStore.getState().activeCartId).toBe(cartId);
      expect(useCartStore.getState().carts.size).toBe(1);
    });

    it('should create a cart with custom ID', () => {
      const customId = 'custom-cart-123';
      const cartId = useCartStore.getState().createCart(customId);
      expect(cartId).toBe(customId);
      expect(useCartStore.getState().activeCartId).toBe(customId);
    });

    it('should switch between carts', () => {
      const cart1Id = useCartStore.getState().createCart();
      const cart2Id = useCartStore.getState().createCart();

      useCartStore.getState().switchCart(cart1Id);
      expect(useCartStore.getState().activeCartId).toBe(cart1Id);

      useCartStore.getState().switchCart(cart2Id);
      expect(useCartStore.getState().activeCartId).toBe(cart2Id);
    });

    it('should not switch to non-existent cart', () => {
      const cartId = useCartStore.getState().createCart();
      useCartStore.getState().switchCart('non-existent');
      expect(useCartStore.getState().activeCartId).toBe(cartId);
    });

    it('should delete a cart', () => {
      const cart1Id = useCartStore.getState().createCart();
      const cart2Id = useCartStore.getState().createCart();

      useCartStore.getState().deleteCart(cart1Id);
      expect(useCartStore.getState().carts.size).toBe(1);
      expect(useCartStore.getState().carts.has(cart1Id)).toBe(false);
    });

    it('should switch to another cart when deleting active cart', () => {
      const cart1Id = useCartStore.getState().createCart();
      const cart2Id = useCartStore.getState().createCart();

      useCartStore.getState().switchCart(cart1Id);
      useCartStore.getState().deleteCart(cart1Id);

      expect(useCartStore.getState().activeCartId).toBe(cart2Id);
    });

    it('should set activeCartId to null when deleting last cart', () => {
      const cartId = useCartStore.getState().createCart();
      useCartStore.getState().deleteCart(cartId);

      expect(useCartStore.getState().activeCartId).toBe(null);
      expect(useCartStore.getState().carts.size).toBe(0);
    });
  });

  describe('Item Management', () => {
    beforeEach(() => {
      useCartStore.getState().createCart();
    });

    it('should add an item to cart', () => {
      useCartStore.getState().addItem({
        productId: 'prod-1',
        name: 'Test Product',
        price: 100,
        quantity: 1,
        discount: 0,
        discountType: 'fixed',
        taxRate: 10,
      });

      const cart = useCartStore.getState().getActiveCart();
      expect(cart?.items).toHaveLength(1);
      expect(cart?.items[0].name).toBe('Test Product');
    });

    it('should increment quantity when adding same item', () => {
      useCartStore.getState().addItem({
        productId: 'prod-1',
        name: 'Test Product',
        price: 100,
        quantity: 1,
        discount: 0,
        discountType: 'fixed',
        taxRate: 10,
      });

      useCartStore.getState().addItem({
        productId: 'prod-1',
        name: 'Test Product',
        price: 100,
        quantity: 2,
        discount: 0,
        discountType: 'fixed',
        taxRate: 10,
      });

      const cart = useCartStore.getState().getActiveCart();
      expect(cart?.items).toHaveLength(1);
      expect(cart?.items[0].quantity).toBe(3);
    });

    it('should calculate item subtotal correctly', () => {
      useCartStore.getState().addItem({
        productId: 'prod-1',
        name: 'Test Product',
        price: 100,
        quantity: 2,
        discount: 0,
        discountType: 'fixed',
        taxRate: 0,
      });

      const cart = useCartStore.getState().getActiveCart();
      expect(cart?.items[0].subtotal).toBe(200);
    });

    it('should calculate item total with tax', () => {
      useCartStore.getState().addItem({
        productId: 'prod-1',
        name: 'Test Product',
        price: 100,
        quantity: 1,
        discount: 0,
        discountType: 'fixed',
        taxRate: 10,
      });

      const cart = useCartStore.getState().getActiveCart();
      expect(cart?.items[0].total).toBe(110);
    });

    it('should remove an item from cart', () => {
      useCartStore.getState().addItem({
        productId: 'prod-1',
        name: 'Test Product',
        price: 100,
        quantity: 1,
        discount: 0,
        discountType: 'fixed',
        taxRate: 10,
      });

      const cart = useCartStore.getState().getActiveCart();
      const itemId = cart?.items[0].id!;

      useCartStore.getState().removeItem(itemId);
      const updatedCart = useCartStore.getState().getActiveCart();
      expect(updatedCart?.items).toHaveLength(0);
    });

    it('should update item quantity', () => {
      useCartStore.getState().addItem({
        productId: 'prod-1',
        name: 'Test Product',
        price: 100,
        quantity: 1,
        discount: 0,
        discountType: 'fixed',
        taxRate: 10,
      });

      const cart = useCartStore.getState().getActiveCart();
      const itemId = cart?.items[0].id!;

      useCartStore.getState().updateQuantity(itemId, 5);
      const updatedCart = useCartStore.getState().getActiveCart();
      expect(updatedCart?.items[0].quantity).toBe(5);
    });

    it('should remove item when quantity is set to 0', () => {
      useCartStore.getState().addItem({
        productId: 'prod-1',
        name: 'Test Product',
        price: 100,
        quantity: 1,
        discount: 0,
        discountType: 'fixed',
        taxRate: 10,
      });

      const cart = useCartStore.getState().getActiveCart();
      const itemId = cart?.items[0].id!;

      useCartStore.getState().updateQuantity(itemId, 0);
      const updatedCart = useCartStore.getState().getActiveCart();
      expect(updatedCart?.items).toHaveLength(0);
    });
  });

  describe('Discount Management', () => {
    beforeEach(() => {
      useCartStore.getState().createCart();
    });

    it('should apply percentage discount to item', () => {
      useCartStore.getState().addItem({
        productId: 'prod-1',
        name: 'Test Product',
        price: 100,
        quantity: 1,
        discount: 0,
        discountType: 'fixed',
        taxRate: 0,
      });

      const cart = useCartStore.getState().getActiveCart();
      const itemId = cart?.items[0].id!;

      useCartStore.getState().applyItemDiscount(itemId, 10, 'percentage');
      const updatedCart = useCartStore.getState().getActiveCart();

      expect(updatedCart?.items[0].discount).toBe(10);
      expect(updatedCart?.items[0].discountType).toBe('percentage');
      expect(updatedCart?.items[0].total).toBe(90);
    });

    it('should apply fixed discount to item', () => {
      useCartStore.getState().addItem({
        productId: 'prod-1',
        name: 'Test Product',
        price: 100,
        quantity: 1,
        discount: 0,
        discountType: 'fixed',
        taxRate: 0,
      });

      const cart = useCartStore.getState().getActiveCart();
      const itemId = cart?.items[0].id!;

      useCartStore.getState().applyItemDiscount(itemId, 20, 'fixed');
      const updatedCart = useCartStore.getState().getActiveCart();

      expect(updatedCart?.items[0].discount).toBe(20);
      expect(updatedCart?.items[0].discountType).toBe('fixed');
      expect(updatedCart?.items[0].total).toBe(80);
    });

    it('should calculate tax after discount', () => {
      useCartStore.getState().addItem({
        productId: 'prod-1',
        name: 'Test Product',
        price: 100,
        quantity: 1,
        discount: 0,
        discountType: 'fixed',
        taxRate: 10,
      });

      const cart = useCartStore.getState().getActiveCart();
      const itemId = cart?.items[0].id!;

      useCartStore.getState().applyItemDiscount(itemId, 20, 'fixed');
      const updatedCart = useCartStore.getState().getActiveCart();

      // Price: 100, Discount: 20, After discount: 80, Tax 10%: 8, Total: 88
      expect(updatedCart?.items[0].total).toBe(88);
    });
  });

  describe('Cart Totals', () => {
    beforeEach(() => {
      useCartStore.getState().createCart();
    });

    it('should calculate cart subtotal', () => {
      useCartStore.getState().addItem({
        productId: 'prod-1',
        name: 'Product 1',
        price: 100,
        quantity: 2,
        discount: 0,
        discountType: 'fixed',
        taxRate: 0,
      });

      useCartStore.getState().addItem({
        productId: 'prod-2',
        name: 'Product 2',
        price: 50,
        quantity: 3,
        discount: 0,
        discountType: 'fixed',
        taxRate: 0,
      });

      const cart = useCartStore.getState().getActiveCart();
      expect(cart?.subtotal).toBe(350);
    });

    it('should calculate cart total with taxes', () => {
      useCartStore.getState().addItem({
        productId: 'prod-1',
        name: 'Product 1',
        price: 100,
        quantity: 1,
        discount: 0,
        discountType: 'fixed',
        taxRate: 10,
      });

      const cart = useCartStore.getState().getActiveCart();
      expect(cart?.total).toBe(110);
      expect(cart?.totalTax).toBe(10);
    });

    it('should calculate cart total discount', () => {
      useCartStore.getState().addItem({
        productId: 'prod-1',
        name: 'Product 1',
        price: 100,
        quantity: 1,
        discount: 10,
        discountType: 'percentage',
        taxRate: 0,
      });

      const cart = useCartStore.getState().getActiveCart();
      expect(cart?.totalDiscount).toBe(10);
    });
  });

  describe('Table and Customer', () => {
    beforeEach(() => {
      useCartStore.getState().createCart();
    });

    it('should set table for cart', () => {
      useCartStore.getState().setTable('table-1', 'Table 1');
      const cart = useCartStore.getState().getActiveCart();

      expect(cart?.tableId).toBe('table-1');
      expect(cart?.tableName).toBe('Table 1');
    });

    it('should set customer for cart', () => {
      useCartStore.getState().setCustomer('customer-1', 'John Doe');
      const cart = useCartStore.getState().getActiveCart();

      expect(cart?.customerId).toBe('customer-1');
      expect(cart?.customerName).toBe('John Doe');
    });
  });

  describe('Clear Cart', () => {
    beforeEach(() => {
      useCartStore.getState().createCart();
    });

    it('should clear all items from cart', () => {
      useCartStore.getState().addItem({
        productId: 'prod-1',
        name: 'Test Product',
        price: 100,
        quantity: 1,
        discount: 0,
        discountType: 'fixed',
        taxRate: 10,
      });

      useCartStore.getState().clear();
      const cart = useCartStore.getState().getActiveCart();

      expect(cart?.items).toHaveLength(0);
      expect(cart?.subtotal).toBe(0);
      expect(cart?.total).toBe(0);
    });

    it('should clear table and customer info', () => {
      useCartStore.getState().setTable('table-1', 'Table 1');
      useCartStore.getState().setCustomer('customer-1', 'John Doe');
      useCartStore.getState().clear();

      const cart = useCartStore.getState().getActiveCart();
      expect(cart?.tableId).toBeUndefined();
      expect(cart?.tableName).toBeUndefined();
      expect(cart?.customerId).toBeUndefined();
      expect(cart?.customerName).toBeUndefined();
    });
  });

  describe('Getters', () => {
    it('should get active cart', () => {
      useCartStore.getState().createCart();
      const cart = useCartStore.getState().getActiveCart();

      expect(cart).not.toBeNull();
      expect(cart?.items).toEqual([]);
    });

    it('should return null when no active cart', () => {
      const cart = useCartStore.getState().getActiveCart();
      expect(cart).toBeNull();
    });

    it('should get cart by ID', () => {
      const cartId = useCartStore.getState().createCart();
      const cart = useCartStore.getState().getCart(cartId);

      expect(cart).not.toBeNull();
      expect(cart?.id).toBe(cartId);
    });

    it('should get all carts', () => {
      useCartStore.getState().createCart();
      useCartStore.getState().createCart();
      useCartStore.getState().createCart();

      const carts = useCartStore.getState().getAllCarts();
      expect(carts).toHaveLength(3);
    });
  });

  describe('Multiple Cart Support', () => {
    it('should manage multiple carts independently', () => {
      const cart1Id = useCartStore.getState().createCart();
      useCartStore.getState().addItem({
        productId: 'prod-1',
        name: 'Product 1',
        price: 100,
        quantity: 1,
        discount: 0,
        discountType: 'fixed',
        taxRate: 0,
      });

      const cart2Id = useCartStore.getState().createCart();
      useCartStore.getState().addItem({
        productId: 'prod-2',
        name: 'Product 2',
        price: 200,
        quantity: 2,
        discount: 0,
        discountType: 'fixed',
        taxRate: 0,
      });

      const cart1 = useCartStore.getState().getCart(cart1Id);
      const cart2 = useCartStore.getState().getCart(cart2Id);

      expect(cart1?.items).toHaveLength(1);
      expect(cart1?.items[0].name).toBe('Product 1');
      expect(cart1?.total).toBe(100);

      expect(cart2?.items).toHaveLength(1);
      expect(cart2?.items[0].name).toBe('Product 2');
      expect(cart2?.total).toBe(400);
    });

    it('should switch between carts and maintain state', () => {
      const cart1Id = useCartStore.getState().createCart();
      useCartStore.getState().setTable('table-1', 'Table 1');

      const cart2Id = useCartStore.getState().createCart();
      useCartStore.getState().setTable('table-2', 'Table 2');

      useCartStore.getState().switchCart(cart1Id);
      const cart1 = useCartStore.getState().getActiveCart();
      expect(cart1?.tableName).toBe('Table 1');

      useCartStore.getState().switchCart(cart2Id);
      const cart2 = useCartStore.getState().getActiveCart();
      expect(cart2?.tableName).toBe('Table 2');
    });
  });

  describe('Auto-create cart', () => {
    it('should auto-create cart when adding item to empty store', () => {
      expect(useCartStore.getState().activeCartId).toBeNull();

      useCartStore.getState().addItem({
        productId: 'prod-1',
        name: 'Test Product',
        price: 100,
        quantity: 1,
        discount: 0,
        discountType: 'fixed',
        taxRate: 10,
      });

      expect(useCartStore.getState().activeCartId).not.toBeNull();
      const cart = useCartStore.getState().getActiveCart();
      expect(cart?.items).toHaveLength(1);
    });
  });
});
