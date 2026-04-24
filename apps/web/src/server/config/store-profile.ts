import { resolveStoreProfile, type StoreProfile } from "@cannaculture/domain";

export const STORE_PROFILE_ENV_KEY = "STORE_PROFILE";

export function getActiveStoreProfile(env: NodeJS.ProcessEnv = process.env): StoreProfile {
  try {
    return resolveStoreProfile(env[STORE_PROFILE_ENV_KEY]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown validation error.";
    throw new Error(
      `Invalid ${STORE_PROFILE_ENV_KEY} value "${env[STORE_PROFILE_ENV_KEY]}". ` +
        `Expected: plant-seeds. ${message}`,
    );
  }
}
