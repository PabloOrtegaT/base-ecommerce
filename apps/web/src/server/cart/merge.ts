import { type CartItem, type CartState } from "@/features/cart/cart";
import { createEmptyCartMergeSummary, type CartMergeSummary } from "@/features/cart/merge-summary";

export type VariantResolution =
  | {
      status: "available";
      item: Omit<CartItem, "quantity" | "unavailableReason">;
      stockOnHand: number;
    }
  | {
      status: "unavailable";
      reason: string;
      fallbackItem?: Omit<CartItem, "quantity">;
    };

type MergeInput = {
  guestCart: CartState;
  serverCart: CartState;
  resolveVariant: (variantId: string) => VariantResolution | Promise<VariantResolution>;
};

type MergeResult = {
  cart: CartState;
  summary: CartMergeSummary;
};

function toMergedMap(items: CartItem[]) {
  return items.reduce<Map<string, CartItem>>((accumulator, line) => {
    const existing = accumulator.get(line.variantId);
    if (!existing) {
      accumulator.set(line.variantId, { ...line });
      return accumulator;
    }

    const unavailableReason = line.unavailableReason ?? existing.unavailableReason;
    accumulator.set(line.variantId, {
      ...existing,
      quantity: existing.quantity + line.quantity,
      stockOnHand: Math.max(existing.stockOnHand, line.stockOnHand),
      ...(unavailableReason ? { unavailableReason } : {}),
    });
    return accumulator;
  }, new Map<string, CartItem>());
}

export async function mergeCartStates(input: MergeInput): Promise<MergeResult> {
  const mergedBase = toMergedMap([...input.serverCart.items, ...input.guestCart.items]);
  const summary: CartMergeSummary = createEmptyCartMergeSummary();
  const nextItems: CartItem[] = [];

  for (const [variantId, baseLine] of mergedBase.entries()) {
    const resolution = await input.resolveVariant(variantId);
    const hadGuestLine = input.guestCart.items.some((line) => line.variantId === variantId);
    const hadServerLine = input.serverCart.items.some((line) => line.variantId === variantId);

    if (hadGuestLine && hadServerLine) {
      summary.mergedLines.push(variantId);
    }

    if (resolution.status === "unavailable") {
      summary.unavailableLines.push({
        variantId,
        reason: resolution.reason,
      });

      nextItems.push({
        ...(resolution.fallbackItem ?? baseLine),
        quantity: baseLine.quantity,
        stockOnHand: 0,
        unavailableReason: resolution.reason,
      });
      continue;
    }

    const desiredQuantity = baseLine.quantity;
    const nextQuantity = Math.max(0, Math.min(desiredQuantity, resolution.stockOnHand));

    if (nextQuantity !== desiredQuantity) {
      summary.adjustedLines.push({
        variantId,
        previousQuantity: desiredQuantity,
        nextQuantity,
      });
    }

    if (nextQuantity <= 0) {
      summary.unavailableLines.push({
        variantId,
        reason: "No stock available after merge.",
      });
      nextItems.push({
        ...resolution.item,
        quantity: desiredQuantity,
        stockOnHand: 0,
        unavailableReason: "No stock available after merge.",
      });
      continue;
    }

    nextItems.push({
      ...resolution.item,
      quantity: nextQuantity,
    });
  }

  if (summary.mergedLines.length > 0) {
    summary.messages.push(`Merged ${summary.mergedLines.length} item(s) from your guest cart.`);
  }
  if (summary.adjustedLines.length > 0) {
    summary.messages.push(`${summary.adjustedLines.length} item(s) were adjusted by stock limits.`);
  }
  if (summary.unavailableLines.length > 0) {
    summary.messages.push(`${summary.unavailableLines.length} item(s) are unavailable and require review.`);
  }

  return {
    cart: {
      items: nextItems,
    },
    summary,
  };
}
