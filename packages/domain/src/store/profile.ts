import { z } from "zod";

export const storeProfileSchema = z.enum(["plant-seeds"]);
export type StoreProfile = z.infer<typeof storeProfileSchema>;

export const defaultStoreProfile: StoreProfile = "plant-seeds";

export function resolveStoreProfile(input?: string | null): StoreProfile {
  if (!input) {
    return defaultStoreProfile;
  }

  return storeProfileSchema.parse(input);
}
