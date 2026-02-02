import { VorpalLazy, VorpalOrdered, createArrayWrapper } from './VorpalLazy.js';

/**
 * Creates a lazy evaluation wrapper for the given iterable.
 * Uses a fast path for arrays that avoids constructor overhead.
 * @param source - The source iterable to wrap
 * @returns A VorpalLazy instance
 */
export function V<T>(source: Iterable<T>): VorpalLazy<T> {
  // Fast path for arrays - bypass constructor's null coalescing checks
  if (Array.isArray(source)) {
    return createArrayWrapper(source);
  }
  return new VorpalLazy(source);
}

/**
 * Creates an array with n copies of a value.
 * @param value - The value to repeat
 * @param count - The number of times to repeat
 * @returns A VorpalLazy sequence of repeated values
 */
export function repeat<T>(value: T, count: number): VorpalLazy<T> {
  return new VorpalLazy(repeatIterator(value, count));
}

/**
 * Calls a function n times with the current index.
 * @param fn - Function to call with each index
 * @param count - Number of times to call
 * @returns A VorpalLazy sequence of results
 */
export function times<T>(fn: (index: number) => T, count: number): VorpalLazy<T> {
  return new VorpalLazy(timesIterator(fn, count));
}

/**
 * Generates a sequence of numbers from start to end (exclusive).
 * @param start - Starting number (or end if only one arg)
 * @param end - End number (exclusive)
 * @param step - Step increment (default 1 or -1)
 * @returns A VorpalLazy sequence of numbers
 */
export function range(start: number, end?: number, step?: number): VorpalLazy<number> {
  return new VorpalLazy(rangeIterator(start, end, step));
}

/**
 * Generates a sequence from a seed value using an unfold function.
 * @param fn - Function returning [value, nextSeed] or undefined to stop
 * @param seed - Initial seed value
 * @returns A VorpalLazy sequence of unfolded values
 */
export function unfold<T, S>(fn: (seed: S) => [T, S] | undefined, seed: S): VorpalLazy<T> {
  return new VorpalLazy(unfoldIterator(fn, seed));
}

function* repeatIterator<T>(value: T, count: number): Generator<T> {
  for (let i = 0; i < count; i++) {
    yield value;
  }
}

function* timesIterator<T>(fn: (index: number) => T, count: number): Generator<T> {
  for (let i = 0; i < count; i++) {
    yield fn(i);
  }
}

function* rangeIterator(start: number, end?: number, step?: number): Generator<number> {
  // If only one argument, treat it as end and start from 0
  let actualStart: number;
  let actualEnd: number;
  let actualStep: number;

  if (end === undefined) {
    actualStart = 0;
    actualEnd = start;
    actualStep = 1;
  } else {
    actualStart = start;
    actualEnd = end;
    actualStep = step ?? (actualStart <= actualEnd ? 1 : -1);
  }

  if (actualStep > 0) {
    for (let i = actualStart; i < actualEnd; i += actualStep) {
      yield i;
    }
  } else if (actualStep < 0) {
    for (let i = actualStart; i > actualEnd; i += actualStep) {
      yield i;
    }
  }
  // If step is 0, yield nothing (avoid infinite loop)
}

function* unfoldIterator<T, S>(fn: (seed: S) => [T, S] | undefined, seed: S): Generator<T> {
  let currentSeed = seed;
  while (true) {
    const result = fn(currentSeed);
    if (result === undefined) break;
    yield result[0];
    currentSeed = result[1];
  }
}

// ==================== Object/Dictionary Functions ====================

/**
 * Wraps object entries as a lazy sequence of [key, value] pairs.
 * @param obj - The object to iterate over
 * @returns A VorpalLazy sequence of [key, value] pairs
 */
export function entries<T>(obj: Record<string, T>): VorpalLazy<[string, T]> {
  return new VorpalLazy(Object.entries(obj) as [string, T][]);
}

/**
 * Wraps object keys as a lazy sequence.
 * @param obj - The object to get keys from
 * @returns A VorpalLazy sequence of keys
 */
export function keys<T extends Record<string, unknown>>(obj: T): VorpalLazy<keyof T & string> {
  return new VorpalLazy(Object.keys(obj) as (keyof T & string)[]);
}

/**
 * Wraps object values as a lazy sequence.
 * @param obj - The object to get values from
 * @returns A VorpalLazy sequence of values
 */
export function values<T>(obj: Record<string, T>): VorpalLazy<T> {
  return new VorpalLazy(Object.values(obj));
}

/**
 * Wraps Map entries as a lazy sequence of [key, value] pairs.
 * @param map - The Map to iterate over
 * @returns A VorpalLazy sequence of [key, value] pairs
 */
export function fromMap<K, V>(map: Map<K, V>): VorpalLazy<[K, V]> {
  return new VorpalLazy(map.entries());
}

/**
 * Converts an array of [key, value] pairs to an object.
 * @param pairs - Array of [key, value] pairs
 * @returns A plain object
 */
export function fromPairs<V>(pairs: Iterable<[string | number, V]>): Record<string, V> {
  const result = Object.create(null) as Record<string, V>;
  for (const [key, value] of pairs) {
    result[String(key)] = value;
  }
  return result;
}

/**
 * Maps over object values while preserving keys.
 * @param fn - Function to apply to each value
 * @param obj - The object to map over
 * @returns A new object with transformed values
 */
export function mapValues<T, R>(fn: (value: T, key: string) => R, obj: Record<string, T>): Record<string, R> {
  const result = Object.create(null) as Record<string, R>;
  for (const key of Object.keys(obj)) {
    result[key] = fn(obj[key]!, key);
  }
  return result;
}

/**
 * Filters object entries by a predicate.
 * @param predicate - Function to test each entry
 * @param obj - The object to filter
 * @returns A new object with only matching entries
 */
export function filterObj<T>(predicate: (value: T, key: string) => boolean, obj: Record<string, T>): Record<string, T> {
  const result = Object.create(null) as Record<string, T>;
  for (const key of Object.keys(obj)) {
    if (predicate(obj[key]!, key)) {
      result[key] = obj[key]!;
    }
  }
  return result;
}

/**
 * Returns a new object with only the specified keys.
 * @param keys - Array of keys to keep
 * @param obj - The source object
 * @returns A new object with only the specified keys
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(pickKeys: K[], obj: T): Pick<T, K> {
  const result = Object.create(null) as Pick<T, K>;
  for (const key of pickKeys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Returns a new object without the specified keys.
 * @param keys - Array of keys to exclude
 * @param obj - The source object
 * @returns A new object without the specified keys
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(omitKeys: K[], obj: T): Omit<T, K> {
  const keySet = new Set(omitKeys as (keyof T)[]);
  const result = Object.create(null) as Omit<T, K>;
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (!keySet.has(key)) {
      (result as Record<keyof T, unknown>)[key] = obj[key];
    }
  }
  return result;
}

/**
 * Swaps keys and values of an object.
 * @param obj - The object to invert
 * @returns A new object with keys and values swapped
 */
export function invert<T extends string | number>(obj: Record<string, T>): Record<string, string> {
  const result = Object.create(null) as Record<string, string>;
  for (const key of Object.keys(obj)) {
    result[String(obj[key])] = key;
  }
  return result;
}

/**
 * Gets a property value from an object.
 * @param key - The property key
 * @param obj - The object
 * @returns The property value
 */
export function prop<T, K extends keyof T>(key: K, obj: T): T[K] {
  return obj[key];
}

/**
 * Gets a nested property value from an object using a path.
 * @param path - Array of keys forming the path
 * @param obj - The object
 * @returns The nested value or undefined
 */
export function path<T = unknown>(pathKeys: (string | number)[], obj: unknown): T | undefined {
  let current: unknown = obj;
  for (const key of pathKeys) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string | number, unknown>)[key];
  }
  return current as T | undefined;
}

/**
 * Sets a property value immutably.
 * @param key - The property key
 * @param value - The new value
 * @param obj - The object
 * @returns A new object with the property set
 */
export function assoc<T extends Record<string, unknown>, K extends string, V>(
  key: K,
  value: V,
  obj: T
): T & Record<K, V> {
  return { ...obj, [key]: value } as T & Record<K, V>;
}

/**
 * Removes a property immutably.
 * @param key - The property key to remove
 * @param obj - The object
 * @returns A new object without the property
 */
export function dissoc<T extends Record<string, unknown>, K extends keyof T>(key: K, obj: T): Omit<T, K> {
  const result = { ...obj };
  delete result[key];
  return result as Omit<T, K>;
}

/**
 * Checks if an object has a property.
 * @param key - The property key
 * @param obj - The object
 * @returns True if the property exists
 */
export function has<K extends string>(key: K, obj: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Merges multiple objects into one (later objects override earlier).
 * @param objects - Objects to merge
 * @returns A new merged object
 */
export function merge<T extends Record<string, unknown>>(...objects: T[]): T {
  return Object.assign({}, ...objects) as T;
}

/**
 * Deep merges objects (nested objects are merged recursively).
 * @param target - Target object
 * @param source - Source object
 * @returns A new deep-merged object
 */
export function mergeDeep<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
  const result = { ...target } as Record<string, unknown>;
  for (const key of Object.keys(source)) {
    const targetVal = result[key];
    const sourceVal = source[key];
    if (isPlainObject(targetVal) && isPlainObject(sourceVal)) {
      result[key] = mergeDeep(targetVal as Record<string, unknown>, sourceVal as Record<string, unknown>);
    } else {
      result[key] = sourceVal;
    }
  }
  return result as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Applies transformations to specific keys of an object.
 * @param transformations - Object mapping keys to transformation functions
 * @param obj - The object to transform
 * @returns A new object with transformations applied
 */
export function evolve<T extends Record<string, unknown>>(
  transformations: { [K in keyof T]?: (value: T[K]) => unknown },
  obj: T
): T {
  const result = { ...obj };
  for (const key of Object.keys(transformations) as (keyof T)[]) {
    if (key in obj) {
      const fn = transformations[key];
      if (fn) {
        (result as Record<keyof T, unknown>)[key] = fn(obj[key]);
      }
    }
  }
  return result;
}

export { VorpalLazy, VorpalOrdered };
export type { PaginationResult } from './VorpalLazy.js';
