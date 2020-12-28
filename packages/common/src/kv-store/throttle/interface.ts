/**
 * Some type of KVStore can has the throttle logic.
 * Especially, when using `localStorage` in browser as KVStore,
 * it can block the interaction if too many get/sets occur because these are synchronous function.
 * To reduce this problem, if it supports the throttling, it get/sets the value asynchronously,
 * and if the value is not needed anymore before the throttled execution completes,
 * call the `abortGet(key: string)` to abort the uncompleted `get` method and expect `get` method to return `undefined`.
 */
export interface ThrottledKVStore {
  abortGet(key: string): void;
}

export interface ThrottleOption {
  // Millisec.
  interval: number;
  // Maximum call within the interval.
  limit: number;

  dev?: boolean;
}
