import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DiscountType } from '@/lib/types';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  discount: number;
  discountType: DiscountType;
  taxRate: number;
  subtotal: number;
  total: number;
  image?: string;
  sku?: string;
  notes?: string;
}

export interface Cart {
  id: string;
  items: CartItem[];
  tableId?: string;
  tableName?: string;
  customerId?: string;
  customerName?: string;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CartState {
  activeCartId: string | null;

  carts: Map<string, Cart>;

  createCart: (cartId?: string) => string;
  switchCart: (cartId: string) => void;
  deleteCart: (cartId: string) => void;

  addItem: (item: Omit<CartItem, 'id' | 'subtotal' | 'total'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  applyItemDiscount: (itemId: string, discount: number, discountType: DiscountType) => void;

  setTable: (tableId: string, tableName: string) => void;
  setCustomer: (customerId: string, customerName: string) => void;

  clear: () => void;

  getActiveCart: () => Cart | null;
  getCart: (cartId: string) => Cart | null;
  getAllCarts: () => Cart[];
}

const calculateItemTotals = (
  item: Omit<CartItem, 'id' | 'subtotal' | 'total'> & { id?: string }
): CartItem => {
  const subtotal = item.price * item.quantity;

  let discountAmount = 0;
  if (item.discountType === 'percentage') {
    discountAmount = (subtotal * item.discount) / 100;
  } else {
    discountAmount = item.discount;
  }

  const afterDiscount = subtotal - discountAmount;
  const taxAmount = (afterDiscount * item.taxRate) / 100;
  const total = afterDiscount + taxAmount;

  return {
    ...item,
    id: item.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    subtotal,
    total,
  };
};

const calculateCartTotals = (cart: Cart): Cart => {
  const subtotal = cart.items.reduce((sum, item) => sum + item.subtotal, 0);

  const totalDiscount = cart.items.reduce((sum, item) => {
    const itemSubtotal = item.price * item.quantity;
    if (item.discountType === 'percentage') {
      return sum + (itemSubtotal * item.discount) / 100;
    }
    return sum + item.discount;
  }, 0);

  const totalTax = cart.items.reduce((sum, item) => {
    const itemSubtotal = item.price * item.quantity;
    const discountAmount =
      item.discountType === 'percentage' ? (itemSubtotal * item.discount) / 100 : item.discount;
    const afterDiscount = itemSubtotal - discountAmount;
    return sum + (afterDiscount * item.taxRate) / 100;
  }, 0);

  const total = cart.items.reduce((sum, item) => sum + item.total, 0);

  return {
    ...cart,
    subtotal,
    totalDiscount,
    totalTax,
    total,
    updatedAt: new Date(),
  };
};

const generateCartId = (): string => {
  return `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      activeCartId: null,
      carts: new Map(),

      createCart: (cartId?: string) => {
        const newCartId = cartId || generateCartId();
        const newCart: Cart = {
          id: newCartId,
          items: [],
          subtotal: 0,
          totalDiscount: 0,
          totalTax: 0,
          total: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => {
          const newCarts = new Map(state.carts);
          newCarts.set(newCartId, newCart);
          return {
            carts: newCarts,
            activeCartId: newCartId,
          };
        });

        return newCartId;
      },

      switchCart: (cartId: string) => {
        const cart = get().carts.get(cartId);
        if (cart) {
          set({ activeCartId: cartId });
        }
      },

      deleteCart: (cartId: string) => {
        set((state) => {
          const newCarts = new Map(state.carts);
          newCarts.delete(cartId);

          const newActiveCartId =
            state.activeCartId === cartId
              ? newCarts.size > 0
                ? Array.from(newCarts.keys())[0]
                : null
              : state.activeCartId;

          return {
            carts: newCarts,
            activeCartId: newActiveCartId,
          };
        });
      },

      addItem: (item) => {
        const { activeCartId } = get();

        if (!activeCartId) {
          const newCartId = get().createCart();
          set({ activeCartId: newCartId });
        }

        set((state) => {
          const cartId = state.activeCartId;
          if (!cartId) return state;

          const cart = state.carts.get(cartId);
          if (!cart) return state;

          const existingItemIndex = cart.items.findIndex((i) => i.productId === item.productId);

          let updatedItems: CartItem[];
          if (existingItemIndex >= 0) {
            updatedItems = [...cart.items];
            const existingItem = updatedItems[existingItemIndex];
            updatedItems[existingItemIndex] = calculateItemTotals({
              ...existingItem,
              quantity: existingItem.quantity + item.quantity,
            });
          } else {
            const newItem = calculateItemTotals(item);
            updatedItems = [...cart.items, newItem];
          }

          const updatedCart = calculateCartTotals({
            ...cart,
            items: updatedItems,
          });

          const newCarts = new Map(state.carts);
          newCarts.set(cartId, updatedCart);

          return { carts: newCarts };
        });
      },

      removeItem: (itemId: string) => {
        set((state) => {
          const cartId = state.activeCartId;
          if (!cartId) return state;

          const cart = state.carts.get(cartId);
          if (!cart) return state;

          const updatedItems = cart.items.filter((item) => item.id !== itemId);
          const updatedCart = calculateCartTotals({
            ...cart,
            items: updatedItems,
          });

          const newCarts = new Map(state.carts);
          newCarts.set(cartId, updatedCart);

          return { carts: newCarts };
        });
      },

      updateQuantity: (itemId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        set((state) => {
          const cartId = state.activeCartId;
          if (!cartId) return state;

          const cart = state.carts.get(cartId);
          if (!cart) return state;

          const updatedItems = cart.items.map((item) =>
            item.id === itemId ? calculateItemTotals({ ...item, quantity }) : item
          );

          const updatedCart = calculateCartTotals({
            ...cart,
            items: updatedItems,
          });

          const newCarts = new Map(state.carts);
          newCarts.set(cartId, updatedCart);

          return { carts: newCarts };
        });
      },

      applyItemDiscount: (itemId, discount, discountType) => {
        set((state) => {
          const cartId = state.activeCartId;
          if (!cartId) return state;

          const cart = state.carts.get(cartId);
          if (!cart) return state;

          const updatedItems = cart.items.map((item) =>
            item.id === itemId ? calculateItemTotals({ ...item, discount, discountType }) : item
          );

          const updatedCart = calculateCartTotals({
            ...cart,
            items: updatedItems,
          });

          const newCarts = new Map(state.carts);
          newCarts.set(cartId, updatedCart);

          return { carts: newCarts };
        });
      },

      setTable: (tableId: string, tableName: string) => {
        set((state) => {
          const cartId = state.activeCartId;
          if (!cartId) return state;

          const cart = state.carts.get(cartId);
          if (!cart) return state;

          const updatedCart: Cart = {
            ...cart,
            tableId,
            tableName,
            updatedAt: new Date(),
          };

          const newCarts = new Map(state.carts);
          newCarts.set(cartId, updatedCart);

          return { carts: newCarts };
        });
      },

      setCustomer: (customerId: string, customerName: string) => {
        set((state) => {
          const cartId = state.activeCartId;
          if (!cartId) return state;

          const cart = state.carts.get(cartId);
          if (!cart) return state;

          const updatedCart: Cart = {
            ...cart,
            customerId,
            customerName,
            updatedAt: new Date(),
          };

          const newCarts = new Map(state.carts);
          newCarts.set(cartId, updatedCart);

          return { carts: newCarts };
        });
      },

      clear: () => {
        set((state) => {
          const cartId = state.activeCartId;
          if (!cartId) return state;

          const cart = state.carts.get(cartId);
          if (!cart) return state;

          const clearedCart: Cart = {
            ...cart,
            items: [],
            tableId: undefined,
            tableName: undefined,
            customerId: undefined,
            customerName: undefined,
            subtotal: 0,
            totalDiscount: 0,
            totalTax: 0,
            total: 0,
            updatedAt: new Date(),
          };

          const newCarts = new Map(state.carts);
          newCarts.set(cartId, clearedCart);

          return { carts: newCarts };
        });
      },

      getActiveCart: () => {
        const { activeCartId, carts } = get();
        if (!activeCartId) return null;
        return carts.get(activeCartId) || null;
      },

      getCart: (cartId: string) => {
        return get().carts.get(cartId) || null;
      },

      getAllCarts: () => {
        return Array.from(get().carts.values());
      },
    }),
    {
      name: 'pos-cart-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeCartId: state.activeCartId,
        carts: Array.from(state.carts.entries()),
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as {
          activeCartId: string | null;
          carts: [string, Cart][];
        };

        return {
          ...currentState,
          activeCartId: persisted.activeCartId,
          carts: new Map(
            persisted.carts.map(([id, cart]) => [
              id,
              {
                ...cart,
                createdAt: new Date(cart.createdAt),
                updatedAt: new Date(cart.updatedAt),
              },
            ])
          ),
        };
      },
    }
  )
);
