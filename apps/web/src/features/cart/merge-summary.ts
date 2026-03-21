export type AdjustedLine = {
  variantId: string;
  previousQuantity: number;
  nextQuantity: number;
};

export type UnavailableLine = {
  variantId: string;
  reason: string;
};

export type CartMergeSummary = {
  mergedLines: string[];
  adjustedLines: AdjustedLine[];
  unavailableLines: UnavailableLine[];
  messages: string[];
};

export function createEmptyCartMergeSummary(): CartMergeSummary {
  return {
    mergedLines: [],
    adjustedLines: [],
    unavailableLines: [],
    messages: [],
  };
}

export const emptyCartMergeSummary: CartMergeSummary = createEmptyCartMergeSummary();
