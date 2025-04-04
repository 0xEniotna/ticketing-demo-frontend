// Cache for contract function calls to reduce RPC usage

interface CachedValue<T> {
  value: T;
  timestamp: number;
}

// Cache storage
const callCache: Record<string, CachedValue<any>> = {};
const lastCallTimestamps: Record<string, number> = {};

// Default values
const DEFAULT_CACHE_TIME = 30000; // 30 seconds
const DEFAULT_THROTTLE_TIME = 8000; // 8 seconds (increased to reduce rate limiting)
const MAX_BACKOFF_TIME = 30000; // Maximum backoff of 30 seconds

/**
 * Wraps a contract function call with caching to reduce RPC calls
 *
 * @param fn The contract function to call
 * @param args Arguments to pass to the function
 * @param cacheKey A unique key for this function (usually the function name)
 * @param options Caching options
 * @returns The function result (cached or fresh)
 */
export async function cachedContractCall<T>(
  fn: (...args: any[]) => Promise<T>,
  args: any[],
  cacheKey: string,
  options?: {
    cacheTime?: number; // How long to cache results (ms)
    throttleTime?: number; // Minimum time between calls (ms)
    forceFresh?: boolean; // Force a fresh call
  }
): Promise<T> {
  const cacheTime = options?.cacheTime || DEFAULT_CACHE_TIME;
  const throttleTime = options?.throttleTime || DEFAULT_THROTTLE_TIME;
  const forceFresh = options?.forceFresh || false;

  // Create a full cache key that includes the arguments
  const argsKey = JSON.stringify(args);
  const fullCacheKey = `${cacheKey}:${argsKey}`;

  // Check if we have a cached result that's still valid
  const cachedResult = callCache[fullCacheKey];
  const now = Date.now();

  if (!forceFresh && cachedResult && now - cachedResult.timestamp < cacheTime) {
    return cachedResult.value;
  }

  // Check if we need to throttle this call
  const lastCallTime = lastCallTimestamps[cacheKey] || 0;
  if (!forceFresh && now - lastCallTime < throttleTime) {
    // If we have any cached result, return it even if expired
    if (cachedResult) {
      return cachedResult.value;
    }

    // If we must wait, sleep for the remaining throttle time
    const waitTime = throttleTime - (now - lastCallTime);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  // Update the last call timestamp
  lastCallTimestamps[cacheKey] = Date.now();

  // Make the actual contract call with exponential backoff for rate limiting
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    try {
      const result = await fn(...args);

      // Cache the result
      callCache[fullCacheKey] = {
        value: result,
        timestamp: Date.now(),
      };

      return result;
    } catch (error: any) {
      attempt++;

      // Check if this is a rate limiting error
      const isRateLimit =
        error?.message?.includes('rate limit') ||
        error?.message?.includes('429') ||
        error?.message?.includes('too many requests');

      // If it's the last attempt or not a rate limit error, throw
      if (attempt >= maxAttempts || !isRateLimit) {
        throw error;
      }

      // Exponential backoff with jitter
      const backoffTime = Math.min(
        Math.random() * 1000 * Math.pow(2, attempt) + 1000,
        MAX_BACKOFF_TIME
      );

      console.warn(
        `Rate limit hit, backing off for ${backoffTime}ms before retry ${attempt}/${maxAttempts}`
      );
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
    }
  }

  // This should never happen, but add to satisfy TypeScript
  throw new Error(`Max retries (${maxAttempts}) exceeded for ${cacheKey}`);
}

/**
 * Clears the cache for a specific function or all cache if no key provided
 */
export function clearContractCache(cacheKey?: string): void {
  if (cacheKey) {
    // Clear only entries for this key
    Object.keys(callCache).forEach((key) => {
      if (key.startsWith(`${cacheKey}:`)) {
        delete callCache[key];
      }
    });
    delete lastCallTimestamps[cacheKey];
  } else {
    // Clear all cache
    Object.keys(callCache).forEach((key) => {
      delete callCache[key];
    });
    Object.keys(lastCallTimestamps).forEach((key) => {
      delete lastCallTimestamps[key];
    });
  }
}
