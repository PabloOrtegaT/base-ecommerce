"use client";

import type { FlashToast } from "@/server/feedback/flash-toast";

export const CLIENT_TOAST_EVENT = "app:toast";

export function showClientToast(toast: FlashToast) {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent<FlashToast>(CLIENT_TOAST_EVENT, { detail: toast }));
}
