"use client";

import { create } from "zustand";
import {
  addCartItem,
  emptyCartState,
  removeCartItem,
  updateCartItemQuantity,
  type CartItem,
  type CartState,
} from "./cart";
import { createEmptyCartMergeSummary, type CartMergeSummary } from "./merge-summary";
import { readCartFromStorage, writeCartToStorage } from "./storage";

type CartSyncStatus = "idle" | "syncing" | "error";

type CartStoreState = {
  cart: CartState;
  authenticated: boolean;
  serverVersion: number | null;
  mergeSummary: CartMergeSummary;
  syncStatus: CartSyncStatus;
  syncError: string | null;
  addItem: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  hydrateCart: (cart: CartState, options?: { version?: number | null }) => void;
  replaceCart: (cart: CartState) => void;
  applyMergeSummary: (summary: CartMergeSummary) => void;
  clearMergeSummary: () => void;
  clearCart: () => void;
  setAuthState: (authenticated: boolean) => void;
};

function getInitialCartState(): CartState {
  if (typeof window === "undefined") {
    return emptyCartState;
  }
  return readCartFromStorage();
}

function persistCart(cart: CartState) {
  writeCartToStorage(cart);
}

async function syncCartToServer(cart: CartState) {
  if (typeof window === "undefined" || typeof fetch !== "function") {
    return;
  }

  try {
    await fetch(new URL("/api/cart", window.location.origin).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart }),
    });
  } catch {
    // Silently fail — server sync is best-effort for cart updates.
    // The cart is always persisted to localStorage as source of truth.
  }
}

export const useCartStore = create<CartStoreState>((set, get) => {
  const persistAndSync = (cart: CartState) => {
    persistCart(cart);
    if (get().authenticated) {
      void syncCartToServer(cart);
    }
  };

  return {
    cart: getInitialCartState(),
    authenticated: false,
    serverVersion: null,
    mergeSummary: createEmptyCartMergeSummary(),
    syncStatus: "idle",
    syncError: null,
    addItem: (item, quantity) => {
      const next = addCartItem(get().cart, item, quantity);
      set({ cart: next });
      persistAndSync(next);
    },
    updateQuantity: (variantId, quantity) => {
      const next = updateCartItemQuantity(get().cart, variantId, quantity);
      set({ cart: next });
      persistAndSync(next);
    },
    removeItem: (variantId) => {
      const next = removeCartItem(get().cart, variantId);
      set({ cart: next });
      persistAndSync(next);
    },
    hydrateCart: (cart, options) => {
      persistCart(cart);
      set({
        cart,
        serverVersion: typeof options?.version === "number" ? options.version : null,
        syncStatus: "idle",
        syncError: null,
      });
    },
    replaceCart: (cart) => {
      set({ cart });
      persistAndSync(cart);
    },
    applyMergeSummary: (summary) => {
      set({ mergeSummary: summary });
    },
    clearMergeSummary: () => {
      set({ mergeSummary: createEmptyCartMergeSummary() });
    },
    clearCart: () => {
      set({ cart: emptyCartState });
      persistAndSync(emptyCartState);
    },
    setAuthState: (authenticated) => {
      if (get().authenticated === authenticated) {
        return;
      }
      set({
        authenticated,
        ...(!authenticated
          ? { serverVersion: null, syncStatus: "idle" as const, syncError: null }
          : {}),
      });
    },
  };
});
