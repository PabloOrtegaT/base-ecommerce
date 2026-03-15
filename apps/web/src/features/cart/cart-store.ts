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
import { emptyCartMergeSummary, type CartMergeSummary } from "./merge-summary";
import { readCartFromStorage, writeCartToStorage } from "./storage";

type CartStoreState = {
  cart: CartState;
  mergeSummary: CartMergeSummary;
  addItem: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  replaceCart: (cart: CartState) => void;
  applyMergeSummary: (summary: CartMergeSummary) => void;
  clearMergeSummary: () => void;
  clearCart: () => void;
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

async function persistCartToServer(cart: CartState) {
  if (typeof window === "undefined" || typeof fetch !== "function") {
    return;
  }

  const endpoint = new URL("/api/cart", window.location.origin).toString();

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cart),
    });
  } catch {
    // Guest users and offline flows intentionally ignore server sync failures.
  }
}

export const useCartStore = create<CartStoreState>((set, get) => ({
  cart: getInitialCartState(),
  mergeSummary: emptyCartMergeSummary,
  addItem: (item, quantity) => {
    const next = addCartItem(get().cart, item, quantity);
    persistCart(next);
    void persistCartToServer(next);
    set({ cart: next });
  },
  updateQuantity: (variantId, quantity) => {
    const next = updateCartItemQuantity(get().cart, variantId, quantity);
    persistCart(next);
    void persistCartToServer(next);
    set({ cart: next });
  },
  removeItem: (variantId) => {
    const next = removeCartItem(get().cart, variantId);
    persistCart(next);
    void persistCartToServer(next);
    set({ cart: next });
  },
  replaceCart: (cart) => {
    persistCart(cart);
    void persistCartToServer(cart);
    set({ cart });
  },
  applyMergeSummary: (summary) => {
    set({ mergeSummary: summary });
  },
  clearMergeSummary: () => {
    set({ mergeSummary: emptyCartMergeSummary });
  },
  clearCart: () => {
    persistCart(emptyCartState);
    set({ cart: emptyCartState });
  },
}));
