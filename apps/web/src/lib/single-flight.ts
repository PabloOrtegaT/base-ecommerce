const inFlightRequests = new Map<string, Promise<unknown>>();

export function runSingleFlight<T>(key: string, task: () => Promise<T>) {
  const existing = inFlightRequests.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const promise = task().finally(() => {
    if (inFlightRequests.get(key) === promise) {
      inFlightRequests.delete(key);
    }
  });

  inFlightRequests.set(key, promise);
  return promise;
}
