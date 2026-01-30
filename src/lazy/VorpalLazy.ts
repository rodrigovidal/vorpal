import type { Predicate, TypeGuard, KeySelector, Selector, Comparer, Grouping, EqualityComparer, Action } from '../core/types.js';

// Operation types for fusion
const enum OpType {
  Filter,
  Map,
  Take,
  Skip,
  TakeWhile,
  SkipWhile,
}

interface FilterOp { type: OpType.Filter; fn: (item: unknown, index: number) => boolean; }
interface MapOp { type: OpType.Map; fn: (item: unknown, index: number) => unknown; }
interface TakeOp { type: OpType.Take; count: number; }
interface SkipOp { type: OpType.Skip; count: number; }
interface TakeWhileOp { type: OpType.TakeWhile; fn: (item: unknown, index: number) => boolean; }
interface SkipWhileOp { type: OpType.SkipWhile; fn: (item: unknown, index: number) => boolean; }

type Operation = FilterOp | MapOp | TakeOp | SkipOp | TakeWhileOp | SkipWhileOp;

/**
 * Result of paginate function with metadata.
 */
export interface PaginationResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Use short string keys instead of Symbols for faster property access
// V8 optimizes string property lookups much better than Symbol lookups
const SOURCE = '_s' as const;
const OPS = '_o' as const;
const PATTERN = '_p' as const;
const FILTER_FN = '_f' as const;
const MAP_FN = '_m' as const;
const OWNED = '_w' as const;

// Fast-path pattern codes (computed once when building chain)
const enum Pattern {
  None = 0,
  FilterOnly = 1,
  MapOnly = 2,
  FilterMap = 3,
  Complex = 99,
}

// Shared empty array to avoid allocations
const EMPTY_OPS: readonly Operation[] = Object.freeze([]);

// Fast factory for owned array wrappers (used by take, skip, concat, etc.)
function ownedArray<T>(arr: T[]): VorpalLazy<T> {
  const v = Object.create(VorpalLazy.prototype) as VorpalLazy<T>;
  (v as any)._s = arr;
  (v as any)._o = EMPTY_OPS;
  (v as any)._p = Pattern.None;
  (v as any)._f = null;
  (v as any)._m = null;
  (v as any)._w = true;
  return v;
}

/**
 * Fast factory for wrapping arrays - bypasses constructor overhead.
 * Uses direct property assignment without null coalescing checks.
 */
export function createArrayWrapper<T>(arr: T[]): VorpalLazy<T> {
  const v = Object.create(VorpalLazy.prototype) as VorpalLazy<T>;
  (v as any)._s = arr;
  (v as any)._o = EMPTY_OPS;
  (v as any)._p = Pattern.None;
  (v as any)._f = null;
  (v as any)._m = null;
  (v as any)._w = false;
  return v;
}

/**
 * Lazy evaluation wrapper for iterables with operation fusion.
 * Operations are deferred and fused until a terminal method is called.
 */
export class VorpalLazy<T> implements Iterable<T> {
  // Use 'declare' to tell TypeScript about properties without emitting initialization code
  // The actual properties are set via string keys for V8 optimization
  declare private readonly [SOURCE]: Iterable<unknown>;
  declare private readonly [OPS]: readonly Operation[];
  declare private readonly [PATTERN]: Pattern;
  declare private readonly [FILTER_FN]: ((item: unknown, index: number) => boolean) | null;
  declare private readonly [MAP_FN]: ((item: unknown, index: number) => unknown) | null;
  declare private readonly [OWNED]: boolean;

  constructor(
    source: Iterable<T>,
    ops?: readonly Operation[] | null,
    pattern?: Pattern,
    filterFn?: ((item: unknown, index: number) => boolean) | null,
    mapFn?: ((item: unknown, index: number) => unknown) | null,
    owned?: boolean
  ) {
    // Direct property assignment with string keys - V8 optimizes this well
    (this as any)._s = source;
    (this as any)._o = ops ?? EMPTY_OPS;
    (this as any)._p = pattern ?? Pattern.None;
    (this as any)._f = filterFn ?? null;
    (this as any)._m = mapFn ?? null;
    (this as any)._w = owned ?? false;
  }

  /**
   * Returns an iterator over the elements with fused operations.
   */
  [Symbol.iterator](): Iterator<T> {
    const source = this[SOURCE];
    const pattern = this[PATTERN];

    // Fast path: no operations at all
    if (pattern === Pattern.None) {
      return (source as Iterable<T>)[Symbol.iterator]();
    }

    // Get effective ops (rebuild from stored functions for simple patterns)
    const ops = pattern === Pattern.Complex ? this[OPS] : this.rebuildOps();

    // Fast path: source is array - use indexed loop execution
    if (Array.isArray(source)) {
      return this.executeArrayPipeline(source, ops)[Symbol.iterator]();
    }

    // Fused iteration for non-array sources
    return this.createFusedIterator(source, ops);
  }

  /**
   * Try to use array slice for take/skip chains
   */
  private tryArrayFastPath(source: unknown[], ops: readonly Operation[]): unknown[] | null {
    let start = 0;
    let end: number | undefined = undefined;
    let hasOnlySliceOps = true;

    for (const op of ops) {
      if (op.type === OpType.Skip) {
        start += op.count;
      } else if (op.type === OpType.Take) {
        const newEnd = start + op.count;
        end = end === undefined ? newEnd : Math.min(end, newEnd);
      } else {
        hasOnlySliceOps = false;
        break;
      }
    }

    if (hasOnlySliceOps) {
      return source.slice(start, end);
    }
    return null;
  }

  /**
   * Execute operations pipeline on an array source using indexed loops.
   * This avoids generator overhead by using labeled loops with continue/break.
   * Operations are applied in sequence to preserve order (filter->map->filter).
   */
  private executeArrayPipeline(arr: unknown[], ops: readonly Operation[]): T[] {
    const len = arr.length;
    if (len === 0) return [];

    // Fast path for no operations
    if (ops.length === 0) return arr.slice() as T[];

    const opsLen = ops.length;

    // Fast path: single filter - use native (V8 C++ is faster)
    if (opsLen === 1 && ops[0]!.type === OpType.Filter) {
      return arr.filter((ops[0] as FilterOp).fn) as T[];
    }

    // Fast path: single map - use native (V8 C++ is faster)
    if (opsLen === 1 && ops[0]!.type === OpType.Map) {
      return arr.map((ops[0] as MapOp).fn) as T[];
    }

    // Fast path: filter + map (very common pattern)
    // Use native methods - V8's C++ implementation is faster than JS loops
    if (opsLen === 2 && ops[0]!.type === OpType.Filter && ops[1]!.type === OpType.Map) {
      const filterFn = (ops[0] as FilterOp).fn;
      const mapFn = (ops[1] as MapOp).fn;
      return (arr.filter(filterFn) as unknown[]).map(mapFn) as T[];
    }

    // Pre-calculate take count for early termination
    let takeCount = Infinity;
    let hasSkipOrTake = false;
    for (let o = 0; o < opsLen; o++) {
      const opType = ops[o]!.type;
      if (opType === OpType.Take) {
        takeCount = Math.min(takeCount, (ops[o] as TakeOp).count);
        hasSkipOrTake = true;
      } else if (opType === OpType.Skip || opType === OpType.SkipWhile || opType === OpType.TakeWhile) {
        hasSkipOrTake = true;
      }
    }

    // Early exit if take is 0
    if (takeCount === 0) return [];

    // Optimized path: only filters and maps (no skip/take)
    if (!hasSkipOrTake) {
      const results: T[] = [];
      outer: for (let i = 0; i < len; i++) {
        let item: unknown = arr[i];
        for (let o = 0; o < opsLen; o++) {
          const op = ops[o]!;
          if (op.type === OpType.Filter) {
            if (!(op as FilterOp).fn(item, i)) continue outer;
          } else if (op.type === OpType.Map) {
            item = (op as MapOp).fn(item, i);
          }
        }
        results.push(item as T);
      }
      return results;
    }

    // General path with skip/take support
    const results: T[] = [];
    let resultCount = 0;
    let skipRemaining = 0;
    let skippingWhile = false;
    let skipWhileFn: ((item: unknown, index: number) => boolean) | null = null;

    // Pre-scan for skipWhile (only first one matters)
    for (let o = 0; o < opsLen; o++) {
      if (ops[o]!.type === OpType.SkipWhile) {
        skippingWhile = true;
        skipWhileFn = (ops[o] as SkipWhileOp).fn;
        break;
      }
    }

    // Pre-scan for skip count
    for (let o = 0; o < opsLen; o++) {
      if (ops[o]!.type === OpType.Skip) {
        skipRemaining += (ops[o] as SkipOp).count;
      }
    }

    outer: for (let i = 0; i < len; i++) {
      let item: unknown = arr[i];

      // Handle skipWhile first
      if (skippingWhile) {
        if (skipWhileFn!(item, i)) {
          continue outer;
        }
        skippingWhile = false;
      }

      // Process each operation in order
      for (let o = 0; o < opsLen; o++) {
        const op = ops[o]!;

        switch (op.type) {
          case OpType.Filter:
            if (!(op as FilterOp).fn(item, i)) {
              continue outer;
            }
            break;

          case OpType.Map:
            item = (op as MapOp).fn(item, i);
            break;

          case OpType.TakeWhile:
            if (!(op as TakeWhileOp).fn(item, i)) {
              break outer;
            }
            break;

          case OpType.Skip:
          case OpType.SkipWhile:
          case OpType.Take:
            // Handled separately
            break;
        }
      }

      // Handle skip count (applied after all filters/maps)
      if (skipRemaining > 0) {
        skipRemaining--;
        continue outer;
      }

      // Check take limit before pushing
      if (resultCount >= takeCount) {
        break outer;
      }

      results.push(item as T);
      resultCount++;
    }

    return results;
  }

  /**
   * Create a fused iterator that applies all operations in a single pass
   */
  private *createFusedIterator(source: Iterable<unknown>, ops: readonly Operation[]): Generator<T> {
    // Fuse consecutive filters and maps
    const fusedOps = this.fuseOperations(ops);

    let index = 0;
    let outputIndex = 0;
    let skipCount = 0;
    let takeCount = Infinity;
    let skipping = false;
    let taken = 0;

    // Pre-calculate skip/take from fused ops
    for (const op of fusedOps) {
      if (op.type === OpType.Skip) skipCount += op.count;
      else if (op.type === OpType.Take) takeCount = Math.min(takeCount, op.count);
    }

    // Build fused filter function
    const filters: ((item: unknown, index: number) => boolean)[] = [];
    const maps: ((item: unknown, index: number) => unknown)[] = [];
    let hasSkipWhile = false;
    let hasTakeWhile = false;
    let skipWhileFn: ((item: unknown, index: number) => boolean) | null = null;
    let takeWhileFn: ((item: unknown, index: number) => boolean) | null = null;

    for (const op of fusedOps) {
      if (op.type === OpType.Filter) filters.push(op.fn);
      else if (op.type === OpType.Map) maps.push(op.fn);
      else if (op.type === OpType.SkipWhile) { hasSkipWhile = true; skipWhileFn = op.fn; }
      else if (op.type === OpType.TakeWhile) { hasTakeWhile = true; takeWhileFn = op.fn; }
    }

    // Create combined filter function
    const filterFn = filters.length === 0 ? null :
      filters.length === 1 ? filters[0]! :
      (item: unknown, idx: number) => {
        for (const f of filters) {
          if (!f(item, idx)) return false;
        }
        return true;
      };

    // Create combined map function
    const mapFn = maps.length === 0 ? null :
      maps.length === 1 ? maps[0]! :
      (item: unknown, idx: number) => {
        let result = item;
        for (const m of maps) {
          result = m(result, idx);
        }
        return result;
      };

    // Use manual iterator to control exactly when we consume items
    const iter = source[Symbol.iterator]();

    while (true) {
      // Check take count BEFORE consuming next item
      if (taken >= takeCount) {
        return;
      }

      const next = iter.next();
      if (next.done) return;
      const item = next.value;

      // Handle skipWhile
      if (hasSkipWhile && !skipping) {
        if (skipWhileFn!(item, index)) {
          index++;
          continue;
        }
        skipping = true;
        hasSkipWhile = false; // Done skipping
      }

      // Handle skip count
      if (outputIndex < skipCount) {
        // Check filter first - only count items that would pass
        if (filterFn === null || filterFn(item, index)) {
          outputIndex++;
        }
        index++;
        continue;
      }

      // Handle takeWhile
      if (hasTakeWhile && !takeWhileFn!(item, index)) {
        return;
      }

      // Apply filter
      if (filterFn !== null && !filterFn(item, index)) {
        index++;
        continue;
      }

      // Apply map and yield
      const result = mapFn !== null ? mapFn(item, index) : item;
      yield result as T;
      taken++;
      outputIndex++;
      index++;
    }
  }

  /**
   * Fuse consecutive operations of the same type
   */
  private fuseOperations(ops: readonly Operation[]): Operation[] {
    if (ops.length <= 1) return [...ops];

    const result: Operation[] = [];
    let pendingFilters: ((item: unknown, index: number) => boolean)[] = [];
    let pendingMaps: ((item: unknown, index: number) => unknown)[] = [];

    const flushPending = () => {
      if (pendingFilters.length > 0) {
        if (pendingFilters.length === 1) {
          result.push({ type: OpType.Filter, fn: pendingFilters[0]! });
        } else {
          const fns = pendingFilters;
          result.push({
            type: OpType.Filter,
            fn: (item, idx) => {
              for (const f of fns) {
                if (!f(item, idx)) return false;
              }
              return true;
            }
          });
        }
        pendingFilters = [];
      }
      if (pendingMaps.length > 0) {
        if (pendingMaps.length === 1) {
          result.push({ type: OpType.Map, fn: pendingMaps[0]! });
        } else {
          const fns = pendingMaps;
          result.push({
            type: OpType.Map,
            fn: (item, idx) => {
              let result = item;
              for (const m of fns) {
                result = m(result, idx);
              }
              return result;
            }
          });
        }
        pendingMaps = [];
      }
    };

    for (const op of ops) {
      if (op.type === OpType.Filter) {
        // Flush maps before accumulating filters (order matters)
        if (pendingMaps.length > 0) flushPending();
        pendingFilters.push(op.fn);
      } else if (op.type === OpType.Map) {
        // Can accumulate maps after filters
        pendingMaps.push(op.fn);
      } else {
        flushPending();
        result.push(op);
      }
    }
    flushPending();

    return result;
  }

  // Rebuild OPS array from stored functions when transitioning from simple to complex pattern
  private rebuildOps(): Operation[] {
    const pattern = this[PATTERN];
    if (pattern === Pattern.Complex) {
      // Already complex, OPS is populated
      return [...this[OPS]];
    }
    if (pattern === Pattern.None) {
      return [];
    }
    const result: Operation[] = [];
    if (pattern === Pattern.FilterOnly || pattern === Pattern.FilterMap) {
      if (this[FILTER_FN]) {
        result.push({ type: OpType.Filter, fn: this[FILTER_FN] });
      }
    }
    if (pattern === Pattern.MapOnly || pattern === Pattern.FilterMap) {
      if (this[MAP_FN]) {
        result.push({ type: OpType.Map, fn: this[MAP_FN] });
      }
    }
    return result;
  }

  // Helper to create new VorpalLazy with additional operation
  private addOp<R>(op: Operation): VorpalLazy<R> {
    const ops = this.rebuildOps();
    return new VorpalLazy<R>(
      this[SOURCE] as Iterable<R>,
      [...ops, op],
      Pattern.Complex,  // Any addOp call goes to complex path
      null,
      null
    );
  }

  /**
   * Evaluates the sequence and returns an array.
   */
  toArray(): T[] {
    const source = this[SOURCE];

    // Ultra-fast path: use pre-computed pattern for array sources
    if (Array.isArray(source)) {
      const pattern = this[PATTERN];

      // Direct dispatch based on pattern - no array checks needed
      if (pattern === Pattern.FilterMap) {
        // Ultra-tight loop with all values cached locally
        const filterFn = this[FILTER_FN]!;
        const mapFn = this[MAP_FN]!;
        const len = source.length;
        // Pre-allocate with estimated capacity (assume ~50% pass filter)
        const result: unknown[] = new Array(len >>> 1);
        let resultLen = 0;
        for (let i = 0; i < len; i++) {
          const item = source[i];
          if (filterFn(item, i)) {
            result[resultLen++] = mapFn(item, i);
          }
        }
        result.length = resultLen;
        return result as T[];
      }
      if (pattern === Pattern.FilterOnly) {
        return source.filter(this[FILTER_FN]!) as T[];
      }
      if (pattern === Pattern.MapOnly) {
        return source.map(this[MAP_FN]!) as T[];
      }
      if (pattern === Pattern.None) {
        // If source was created internally (owned), return directly without copy
        // Otherwise, copy to maintain immutability contract
        return this[OWNED] ? source as T[] : source.slice() as T[];
      }

      // Complex pattern - use general pipeline
      return this.executeArrayPipeline(source, this[OPS]);
    }

    // Fallback: use iterator for non-array sources
    return [...this];
  }

  /**
   * Evaluates the sequence and returns a Set.
   */
  toSet(): Set<T> {
    return new Set(this);
  }

  /**
   * Evaluates the sequence and returns a Map.
   */
  toMap<K, V>(
    keySelector: (item: T, index: number) => K,
    valueSelector: (item: T, index: number) => V
  ): Map<K, V> {
    const map = new Map<K, V>();
    let index = 0;
    for (const item of this) {
      map.set(keySelector(item, index), valueSelector(item, index));
      index++;
    }
    return map;
  }

  /**
   * Filters elements based on a predicate.
   */
  filter(predicate: Predicate<T>): VorpalLazy<T>;
  filter<U extends T>(guard: TypeGuard<T, U>): VorpalLazy<U>;
  filter(predicate: Predicate<T>): VorpalLazy<T> {
    const fn = predicate as (item: unknown, index: number) => boolean;
    // Track pattern for fast path
    if (this[PATTERN] === Pattern.None) {
      // For FilterOnly pattern, we don't need OPS - just the function
      return new VorpalLazy<T>(
        this[SOURCE] as Iterable<T>,
        null,  // Skip OPS allocation - we use FILTER_FN directly
        Pattern.FilterOnly,
        fn,
        null
      );
    }
    // Rebuild OPS from stored functions when transitioning from simple to complex
    const ops = this.rebuildOps();
    return new VorpalLazy<T>(
      this[SOURCE] as Iterable<T>,
      [...ops, { type: OpType.Filter, fn }],
      Pattern.Complex,
      null,
      null
    );
  }

  /**
   * Returns elements that do not match the predicate (opposite of filter).
   */
  reject(predicate: Predicate<T>): VorpalLazy<T> {
    return this.addOp<T>({
      type: OpType.Filter,
      fn: (item, index) => !predicate(item as T, index)
    });
  }

  /**
   * Returns the first n elements.
   */
  take(count: number): VorpalLazy<T> {
    if (count <= 0) return ownedArray<T>([]);
    // Fast path: array source with no ops - use slice directly
    const source = this[SOURCE];
    if (Array.isArray(source) && this[PATTERN] === Pattern.None) {
      return ownedArray(source.slice(0, count) as T[]);
    }
    return this.addOp<T>({ type: OpType.Take, count });
  }

  /**
   * Skips the first n elements.
   */
  skip(count: number): VorpalLazy<T> {
    if (count <= 0) return this;
    // Fast path: array source with no ops - use slice directly
    const source = this[SOURCE];
    if (Array.isArray(source) && this[PATTERN] === Pattern.None) {
      return ownedArray(source.slice(count) as T[]);
    }
    return this.addOp<T>({ type: OpType.Skip, count });
  }

  /**
   * Returns elements while predicate is true.
   */
  takeWhile(predicate: Predicate<T>): VorpalLazy<T> {
    return this.addOp<T>({ type: OpType.TakeWhile, fn: predicate as (item: unknown, index: number) => boolean });
  }

  /**
   * Skips elements while predicate is true.
   */
  skipWhile(predicate: Predicate<T>): VorpalLazy<T> {
    return this.addOp<T>({ type: OpType.SkipWhile, fn: predicate as (item: unknown, index: number) => boolean });
  }

  /**
   * Returns distinct elements.
   */
  distinct(): VorpalLazy<T> {
    const source = this[SOURCE];
    const ops = this[OPS];

    // Fast path: array source - use direct array processing
    if (Array.isArray(source)) {
      const arr = ops.length === 0 ? source : this.executeArrayPipeline(source, ops);
      return new VorpalLazy(distinctArray(arr as T[]), []);
    }

    return new VorpalLazy(distinctIterator(this), []);
  }

  /**
   * Returns elements with distinct keys.
   */
  distinctBy<K>(keySelector: KeySelector<T, K>): VorpalLazy<T> {
    const source = this[SOURCE];
    const ops = this[OPS];

    // Fast path: array source - use direct array processing
    if (Array.isArray(source)) {
      const arr = ops.length === 0 ? source : this.executeArrayPipeline(source, ops);
      return new VorpalLazy(distinctByArray(arr as T[], keySelector), []);
    }

    return new VorpalLazy(distinctByIterator(this, keySelector), []);
  }

  /**
   * Projects each element into a new form.
   */
  map<R>(selector: Selector<T, R>): VorpalLazy<R> {
    const fn = selector as (item: unknown, index: number) => unknown;
    // Track pattern for fast path
    if (this[PATTERN] === Pattern.None) {
      // For MapOnly pattern, we don't need OPS - just the function
      return new VorpalLazy<R>(
        this[SOURCE] as Iterable<R>,
        null,  // Skip OPS allocation - we use MAP_FN directly
        Pattern.MapOnly,
        null,
        fn
      );
    }
    if (this[PATTERN] === Pattern.FilterOnly) {
      // For FilterMap pattern, we don't need OPS - we use FILTER_FN and MAP_FN directly
      return new VorpalLazy<R>(
        this[SOURCE] as Iterable<R>,
        null,  // Skip OPS allocation
        Pattern.FilterMap,
        this[FILTER_FN],
        fn
      );
    }
    // Rebuild OPS from stored functions when transitioning from simple to complex
    const ops = this.rebuildOps();
    return new VorpalLazy<R>(
      this[SOURCE] as Iterable<R>,
      [...ops, { type: OpType.Map, fn }],
      Pattern.Complex,
      null,
      null
    );
  }

  /**
   * Projects each element to an iterable and flattens.
   */
  flatMap<R>(selector: Selector<T, Iterable<R>>): VorpalLazy<R> {
    const source = this[SOURCE];
    const ops = this[OPS];
    const pattern = this[PATTERN];

    // Fast path: array source - use direct array processing
    if (Array.isArray(source)) {
      // Get the processed array (apply any pending ops)
      let arr: T[];
      if (pattern === Pattern.None) {
        arr = source as unknown as T[];
      } else if (pattern === Pattern.Complex) {
        arr = this.executeArrayPipeline(source, ops);
      } else {
        arr = this.executeArrayPipeline(source, this.rebuildOps());
      }
      // Flatten directly using array methods
      return new VorpalLazy(flatMapArray(arr, selector), []);
    }

    return new VorpalLazy(flatMapIterator(this, selector), []);
  }

  /**
   * Casts elements to a different type (unsafe).
   */
  as<U>(): VorpalLazy<U> {
    return this as unknown as VorpalLazy<U>;
  }

  /**
   * Filters elements by type guard.
   */
  ofType<U>(guard: (item: unknown) => item is U): VorpalLazy<U> {
    return this.addOp<U>({ type: OpType.Filter, fn: guard });
  }

  /**
   * Reverses the order of elements.
   */
  reverse(): VorpalLazy<T> {
    const source = this[SOURCE];
    const pattern = this[PATTERN];
    // Fast path: array source with no ops - use slice().reverse()
    if (Array.isArray(source) && pattern === Pattern.None) {
      return ownedArray(source.slice().reverse() as T[]);
    }
    // Fallback: materialize then reverse
    const arr = this.toArray();
    arr.reverse();
    return ownedArray(arr);
  }

  /**
   * Sorts elements by key in ascending order.
   */
  sortBy<K>(keySelector: KeySelector<T, K>, comparer?: Comparer<K>): VorpalOrdered<T> {
    return new VorpalOrdered(this, [{
      keySelector: keySelector as KeySelector<T, unknown>,
      comparer: comparer as Comparer<unknown> | undefined,
      descending: false,
    }]);
  }

  /**
   * Sorts elements by key in descending order.
   */
  sortByDesc<K>(keySelector: KeySelector<T, K>, comparer?: Comparer<K>): VorpalOrdered<T> {
    return new VorpalOrdered(this, [{
      keySelector: keySelector as KeySelector<T, unknown>,
      comparer: comparer as Comparer<unknown> | undefined,
      descending: true,
    }]);
  }

  /**
   * Groups elements by key.
   */
  groupBy<K>(keySelector: KeySelector<T, K>): VorpalLazy<Grouping<K, T>>;
  groupBy<K, V>(keySelector: KeySelector<T, K>, valueSelector: Selector<T, V>): VorpalLazy<Grouping<K, V>>;
  groupBy<K, V = T>(keySelector: KeySelector<T, K>, valueSelector?: Selector<T, V>): VorpalLazy<Grouping<K, V>> {
    const source = this[SOURCE];
    const ops = this[OPS];

    // Fast path: array source - use direct array processing
    if (Array.isArray(source)) {
      const arr = ops.length === 0 ? source : this.executeArrayPipeline(source, ops);
      return new VorpalLazy(groupByArray(arr as T[], keySelector, valueSelector), []);
    }

    return new VorpalLazy(groupByIterator(this, keySelector, valueSelector), []);
  }

  /**
   * Concatenates two sequences.
   */
  concat(other: Iterable<T>): VorpalLazy<T> {
    const source = this[SOURCE];
    const pattern = this[PATTERN];
    // Fast path: both are arrays with no ops
    if (Array.isArray(source) && pattern === Pattern.None && Array.isArray(other)) {
      return ownedArray((source as T[]).concat(other));
    }
    return new VorpalLazy(concatIterator(this, other), []);
  }

  /**
   * Returns distinct elements from both sequences.
   */
  union(other: Iterable<T>, comparer?: EqualityComparer<T>): VorpalLazy<T> {
    return new VorpalLazy(unionIterator(this, other, comparer), []);
  }

  /**
   * Returns elements present in both sequences.
   */
  intersect(other: Iterable<T>, comparer?: EqualityComparer<T>): VorpalLazy<T> {
    return new VorpalLazy(intersectIterator(this, other, comparer), []);
  }

  /**
   * Returns elements in first sequence but not in second.
   */
  difference(other: Iterable<T>, comparer?: EqualityComparer<T>): VorpalLazy<T> {
    return new VorpalLazy(differenceIterator(this, other, comparer), []);
  }

  /**
   * Returns distinct elements from both sequences, compared by key.
   */
  unionBy<K>(other: Iterable<T>, keySelector: KeySelector<T, K>): VorpalLazy<T> {
    return new VorpalLazy(unionByIterator(this, other, keySelector), []);
  }

  /**
   * Returns elements present in both sequences, compared by key.
   */
  intersectBy<K>(other: Iterable<T>, keySelector: KeySelector<T, K>): VorpalLazy<T> {
    return new VorpalLazy(intersectByIterator(this, other, keySelector), []);
  }

  /**
   * Returns elements in first sequence but not in second, compared by key.
   */
  differenceBy<K>(other: Iterable<T>, keySelector: KeySelector<T, K>): VorpalLazy<T> {
    return new VorpalLazy(differenceByIterator(this, other, keySelector), []);
  }

  /**
   * Alias for differenceBy.
   */
  exceptBy<K>(other: Iterable<T>, keySelector: KeySelector<T, K>): VorpalLazy<T> {
    return this.differenceBy(other, keySelector);
  }

  /**
   * Correlates elements based on matching keys (inner join).
   * Only returns results where keys exist in both sequences.
   * @deprecated Use innerJoin instead
   */
  join<I, K, R>(
    inner: Iterable<I>,
    outerKeySelector: KeySelector<T, K>,
    innerKeySelector: KeySelector<I, K>,
    resultSelector: (outer: T, inner: I) => R
  ): VorpalLazy<R> {
    return this.innerJoin(inner, outerKeySelector, innerKeySelector, resultSelector);
  }

  /**
   * Inner join - returns results where keys exist in both sequences.
   */
  innerJoin<I, K, R>(
    inner: Iterable<I>,
    outerKeySelector: KeySelector<T, K>,
    innerKeySelector: KeySelector<I, K>,
    resultSelector: (outer: T, inner: I) => R
  ): VorpalLazy<R> {
    return new VorpalLazy(innerJoinIterator(this, inner, outerKeySelector, innerKeySelector, resultSelector), []);
  }

  /**
   * Left join - returns all elements from left sequence with matched elements from right.
   * If no match exists, inner will be undefined.
   */
  leftJoin<I, K, R>(
    inner: Iterable<I>,
    outerKeySelector: KeySelector<T, K>,
    innerKeySelector: KeySelector<I, K>,
    resultSelector: (outer: T, inner: I | undefined) => R
  ): VorpalLazy<R> {
    return new VorpalLazy(leftJoinIterator(this, inner, outerKeySelector, innerKeySelector, resultSelector), []);
  }

  /**
   * Right join - returns all elements from right sequence with matched elements from left.
   * If no match exists, outer will be undefined.
   */
  rightJoin<I, K, R>(
    inner: Iterable<I>,
    outerKeySelector: KeySelector<T, K>,
    innerKeySelector: KeySelector<I, K>,
    resultSelector: (outer: T | undefined, inner: I) => R
  ): VorpalLazy<R> {
    return new VorpalLazy(rightJoinIterator(this, inner, outerKeySelector, innerKeySelector, resultSelector), []);
  }

  /**
   * Full outer join - returns all elements from both sequences.
   * Unmatched elements will have undefined for the missing side.
   */
  fullJoin<I, K, R>(
    inner: Iterable<I>,
    outerKeySelector: KeySelector<T, K>,
    innerKeySelector: KeySelector<I, K>,
    resultSelector: (outer: T | undefined, inner: I | undefined) => R
  ): VorpalLazy<R> {
    return new VorpalLazy(fullJoinIterator(this, inner, outerKeySelector, innerKeySelector, resultSelector), []);
  }

  /**
   * Cross join - returns the Cartesian product of two sequences.
   * Every element from left is paired with every element from right.
   */
  crossJoin<I, R>(
    inner: Iterable<I>,
    resultSelector: (outer: T, inner: I) => R
  ): VorpalLazy<R> {
    return new VorpalLazy(crossJoinIterator(this, inner, resultSelector), []);
  }

  /**
   * Group join - groups all matching right elements for each left element.
   * Similar to left join but collects all matches into an array.
   */
  groupJoin<I, K, R>(
    inner: Iterable<I>,
    outerKeySelector: KeySelector<T, K>,
    innerKeySelector: KeySelector<I, K>,
    resultSelector: (outer: T, innerGroup: I[]) => R
  ): VorpalLazy<R> {
    return new VorpalLazy(groupJoinIterator(this, inner, outerKeySelector, innerKeySelector, resultSelector), []);
  }

  /**
   * Semi join - returns left elements that have at least one match in right.
   * Does not include any data from the right sequence.
   */
  semiJoin<I, K>(
    inner: Iterable<I>,
    outerKeySelector: KeySelector<T, K>,
    innerKeySelector: KeySelector<I, K>
  ): VorpalLazy<T> {
    return new VorpalLazy(semiJoinIterator(this, inner, outerKeySelector, innerKeySelector), []);
  }

  /**
   * Anti join - returns left elements that have NO match in right.
   * Opposite of semi join.
   */
  antiJoin<I, K>(
    inner: Iterable<I>,
    outerKeySelector: KeySelector<T, K>,
    innerKeySelector: KeySelector<I, K>
  ): VorpalLazy<T> {
    return new VorpalLazy(antiJoinIterator(this, inner, outerKeySelector, innerKeySelector), []);
  }

  /**
   * Combines elements from two sequences pairwise.
   */
  zip<U, R>(other: Iterable<U>, resultSelector: (first: T, second: U) => R): VorpalLazy<R> {
    const source = this[SOURCE];
    // Fast path: both are arrays with no ops
    if (Array.isArray(source) && this[PATTERN] === Pattern.None && Array.isArray(other)) {
      const len = source.length < other.length ? source.length : other.length;
      const result = new Array<R>(len);
      for (let i = 0; i < len; i++) {
        result[i] = resultSelector(source[i]!, other[i]!);
      }
      return ownedArray(result);
    }
    return new VorpalLazy(zipIterator(this, other, resultSelector), []);
  }

  /**
   * Counts elements, optionally filtered by predicate.
   */
  count(predicate?: Predicate<T>): number {
    const source = this[SOURCE];
    const ops = this[OPS];

    // Fast path: array source with no ops and no predicate
    if (Array.isArray(source) && ops.length === 0 && !predicate) {
      return source.length;
    }

    // Fast path: array source - use indexed loop
    if (Array.isArray(source)) {
      const arr = ops.length === 0 ? source : this.executeArrayPipeline(source, ops);
      if (!predicate) return arr.length;
      let count = 0;
      for (let i = 0; i < arr.length; i++) {
        if (predicate(arr[i] as T, i)) count++;
      }
      return count;
    }

    // Fallback for non-array sources
    let count = 0;
    let index = 0;
    for (const item of this) {
      if (!predicate || predicate(item, index++)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Sums numeric values, optionally with a selector.
   */
  sum(selector?: Selector<T, number>): number {
    const source = this[SOURCE];
    const ops = this[OPS];

    // Fast path: array source - use indexed loop
    if (Array.isArray(source)) {
      const arr = ops.length === 0 ? source : this.executeArrayPipeline(source, ops);
      let sum = 0;
      const len = arr.length;
      if (selector) {
        for (let i = 0; i < len; i++) {
          sum += selector(arr[i] as T, i);
        }
      } else {
        for (let i = 0; i < len; i++) {
          sum += arr[i] as number;
        }
      }
      return sum;
    }

    // Fallback for non-array sources
    let sum = 0;
    let index = 0;
    for (const item of this) {
      sum += selector ? selector(item, index++) : (item as unknown as number);
    }
    return sum;
  }

  /**
   * Calculates average of numeric values, optionally with a selector.
   */
  average(selector?: Selector<T, number>): number {
    const source = this[SOURCE];
    const ops = this[OPS];

    // Fast path: array source - use indexed loop
    if (Array.isArray(source)) {
      const arr = ops.length === 0 ? source : this.executeArrayPipeline(source, ops);
      const len = arr.length;
      if (len === 0) return NaN;
      let sum = 0;
      if (selector) {
        for (let i = 0; i < len; i++) {
          sum += selector(arr[i] as T, i);
        }
      } else {
        for (let i = 0; i < len; i++) {
          sum += arr[i] as number;
        }
      }
      return sum / len;
    }

    // Fallback for non-array sources
    let sum = 0;
    let count = 0;
    let index = 0;
    for (const item of this) {
      sum += selector ? selector(item, index++) : (item as unknown as number);
      count++;
    }
    return count === 0 ? NaN : sum / count;
  }

  /**
   * Finds the minimum value, optionally with a selector.
   */
  min(selector?: Selector<T, number>): number | undefined {
    const source = this[SOURCE];
    const ops = this[OPS];

    // Fast path: array source - use indexed loop
    if (Array.isArray(source)) {
      const arr = ops.length === 0 ? source : this.executeArrayPipeline(source, ops);
      const len = arr.length;
      if (len === 0) return undefined;
      let min = selector ? selector(arr[0] as T, 0) : arr[0] as number;
      for (let i = 1; i < len; i++) {
        const value = selector ? selector(arr[i] as T, i) : arr[i] as number;
        if (value < min) min = value;
      }
      return min;
    }

    // Fallback for non-array sources
    let min: number | undefined;
    let index = 0;
    for (const item of this) {
      const value = selector ? selector(item, index++) : (item as unknown as number);
      if (min === undefined || value < min) {
        min = value;
      }
    }
    return min;
  }

  /**
   * Finds the maximum value, optionally with a selector.
   */
  max(selector?: Selector<T, number>): number | undefined {
    const source = this[SOURCE];
    const ops = this[OPS];

    // Fast path: array source - use indexed loop
    if (Array.isArray(source)) {
      const arr = ops.length === 0 ? source : this.executeArrayPipeline(source, ops);
      const len = arr.length;
      if (len === 0) return undefined;
      let max = selector ? selector(arr[0] as T, 0) : arr[0] as number;
      for (let i = 1; i < len; i++) {
        const value = selector ? selector(arr[i] as T, i) : arr[i] as number;
        if (value > max) max = value;
      }
      return max;
    }

    // Fallback for non-array sources
    let max: number | undefined;
    let index = 0;
    for (const item of this) {
      const value = selector ? selector(item, index++) : (item as unknown as number);
      if (max === undefined || value > max) {
        max = value;
      }
    }
    return max;
  }

  /**
   * Applies an accumulator function over a sequence.
   */
  reduce<A>(seed: A, func: (acc: A, item: T, index: number) => A): A {
    let acc = seed;
    let index = 0;
    for (const item of this) {
      acc = func(acc, item, index++);
    }
    return acc;
  }

  /**
   * Groups by key and aggregates each group.
   * @example
   * ```ts
   * V(employees)
   *   .aggregateBy(
   *     e => e.dept,
   *     () => ({ total: 0, count: 0 }),
   *     (acc, e) => ({ total: acc.total + e.salary, count: acc.count + 1 })
   *   );
   * // Map { 'eng' => {total: 250, count: 2}, 'sales' => {total: 80, count: 1} }
   * ```
   */
  aggregateBy<K, R>(
    keySelector: KeySelector<T, K>,
    seed: () => R,
    reducer: (acc: R, value: T) => R
  ): Map<K, R> {
    const result = new Map<K, R>();
    for (const item of this) {
      const key = keySelector(item);
      let acc = result.get(key);
      if (acc === undefined) {
        acc = seed();
      }
      result.set(key, reducer(acc, item));
    }
    return result;
  }

  /**
   * Returns the first element, optionally matching a predicate.
   * @throws Error if sequence is empty or no element matches
   */
  first(predicate?: Predicate<T>): T {
    const source = this[SOURCE];
    const ops = this[OPS];

    // Fast path: array source with no ops - direct indexed access
    if (Array.isArray(source) && ops.length === 0) {
      if (!predicate) {
        if (source.length === 0) throw new Error('Sequence contains no elements');
        return source[0] as T;
      }
      // Indexed loop for predicate search
      for (let i = 0; i < source.length; i++) {
        if (predicate(source[i] as T, i)) return source[i] as T;
      }
      throw new Error('Sequence contains no matching element');
    }

    // Fast path: array source with ops - execute pipeline then search
    if (Array.isArray(source)) {
      // For find operations, we need to short-circuit
      // Execute ops but we can optimize by checking as we go
      const arr = this.executeArrayPipelineWithEarlyExit(source, ops, predicate);
      if (arr !== undefined) return arr;
      throw new Error(predicate ? 'Sequence contains no matching element' : 'Sequence contains no elements');
    }

    // Fallback for non-array sources
    let index = 0;
    for (const item of this) {
      if (!predicate || predicate(item, index++)) {
        return item;
      }
    }
    throw new Error(predicate ? 'Sequence contains no matching element' : 'Sequence contains no elements');
  }

  /**
   * Returns the first element or a default value.
   */
  firstOr(defaultValue: T, predicate?: Predicate<T>): T {
    const source = this[SOURCE];
    const ops = this[OPS];

    // Fast path: array source with no ops - direct indexed access
    if (Array.isArray(source) && ops.length === 0) {
      if (!predicate) {
        return source.length > 0 ? source[0] as T : defaultValue;
      }
      // Indexed loop for predicate search
      for (let i = 0; i < source.length; i++) {
        if (predicate(source[i] as T, i)) return source[i] as T;
      }
      return defaultValue;
    }

    // Fast path: array source with ops
    if (Array.isArray(source)) {
      const arr = this.executeArrayPipelineWithEarlyExit(source, ops, predicate);
      return arr !== undefined ? arr : defaultValue;
    }

    // Fallback for non-array sources
    let index = 0;
    for (const item of this) {
      if (!predicate || predicate(item, index++)) {
        return item;
      }
    }
    return defaultValue;
  }

  /**
   * Execute array pipeline with early exit support for find operations.
   * Returns the first matching element or undefined.
   * Operations are applied in sequence to preserve order.
   */
  private executeArrayPipelineWithEarlyExit(
    arr: unknown[],
    ops: readonly Operation[],
    predicate?: Predicate<T>
  ): T | undefined {
    const len = arr.length;
    if (len === 0) return undefined;

    const opsLen = ops.length;
    let skipRemaining = 0;
    let skippingWhile = false;
    let skipWhileFn: ((item: unknown, index: number) => boolean) | null = null;

    // Pre-scan for skipWhile
    for (let o = 0; o < opsLen; o++) {
      if (ops[o]!.type === OpType.SkipWhile) {
        skippingWhile = true;
        skipWhileFn = (ops[o] as SkipWhileOp).fn;
        break;
      }
    }

    // Pre-scan for skip count
    for (let o = 0; o < opsLen; o++) {
      if (ops[o]!.type === OpType.Skip) {
        skipRemaining += (ops[o] as SkipOp).count;
      }
    }

    let outputIdx = 0;

    outer: for (let i = 0; i < len; i++) {
      let item: unknown = arr[i];

      // Handle skipWhile first
      if (skippingWhile) {
        if (skipWhileFn!(item, i)) continue outer;
        skippingWhile = false;
      }

      // Process each operation in order
      for (let o = 0; o < opsLen; o++) {
        const op = ops[o]!;

        switch (op.type) {
          case OpType.Filter:
            if (!(op as FilterOp).fn(item, i)) continue outer;
            break;

          case OpType.Map:
            item = (op as MapOp).fn(item, i);
            break;

          case OpType.TakeWhile:
            if (!(op as TakeWhileOp).fn(item, i)) return undefined;
            break;

          case OpType.Skip:
          case OpType.SkipWhile:
          case OpType.Take:
            break;
        }
      }

      // Handle skip count
      if (skipRemaining > 0) {
        skipRemaining--;
        continue outer;
      }

      // Check predicate and return if matches
      if (!predicate || predicate(item as T, outputIdx)) {
        return item as T;
      }
      outputIdx++;
    }

    return undefined;
  }

  /**
   * Returns the last element, optionally matching a predicate.
   * @throws Error if sequence is empty or no element matches
   */
  last(predicate?: Predicate<T>): T {
    const source = this[SOURCE];
    const pattern = this[PATTERN];

    // Fast path: array source with no ops and no predicate
    if (Array.isArray(source) && pattern === Pattern.None && !predicate) {
      const len = source.length;
      if (len === 0) throw new Error('Sequence contains no elements');
      return source[len - 1] as T;
    }

    // Fast path: array source with ops - process then get last
    if (Array.isArray(source)) {
      const arr = pattern === Pattern.None ? source :
        pattern === Pattern.Complex ? this.executeArrayPipeline(source, this[OPS]) :
        this.executeArrayPipeline(source, this.rebuildOps());

      if (!predicate) {
        const len = arr.length;
        if (len === 0) throw new Error('Sequence contains no elements');
        return arr[len - 1] as T;
      }
      // Search from end for predicate
      for (let i = arr.length - 1; i >= 0; i--) {
        if (predicate(arr[i] as T, i)) return arr[i] as T;
      }
      throw new Error('Sequence contains no matching element');
    }

    // Fallback for non-array sources
    let last: T | undefined;
    let found = false;
    let index = 0;
    for (const item of this) {
      if (!predicate || predicate(item, index++)) {
        last = item;
        found = true;
      }
    }
    if (!found) {
      throw new Error(predicate ? 'Sequence contains no matching element' : 'Sequence contains no elements');
    }
    return last as T;
  }

  /**
   * Returns the last element or a default value.
   */
  lastOr(defaultValue: T, predicate?: Predicate<T>): T {
    let last: T = defaultValue;
    let index = 0;
    for (const item of this) {
      if (!predicate || predicate(item, index++)) {
        last = item;
      }
    }
    return last;
  }

  /**
   * Returns the only element, optionally matching a predicate.
   * @throws Error if sequence is empty or contains more than one element
   */
  single(predicate?: Predicate<T>): T {
    let result: T | undefined;
    let found = false;
    let index = 0;
    for (const item of this) {
      if (!predicate || predicate(item, index++)) {
        if (found) {
          throw new Error(predicate ? 'Sequence contains more than one matching element' : 'Sequence contains more than one element');
        }
        result = item;
        found = true;
      }
    }
    if (!found) {
      throw new Error(predicate ? 'Sequence contains no matching element' : 'Sequence contains no elements');
    }
    return result as T;
  }

  /**
   * Returns the element at the specified index.
   * @throws Error if index is out of range
   */
  at(index: number): T {
    if (index < 0) {
      throw new Error('Index out of range');
    }
    let currentIndex = 0;
    for (const item of this) {
      if (currentIndex === index) {
        return item;
      }
      currentIndex++;
    }
    throw new Error('Index out of range');
  }

  /**
   * Returns the index of the first element matching the predicate, or -1.
   */
  findIndex(predicate: Predicate<T>): number {
    const source = this[SOURCE];
    const ops = this[OPS];

    // Fast path: array source with no ops
    if (Array.isArray(source) && ops.length === 0) {
      for (let i = 0; i < source.length; i++) {
        if (predicate(source[i] as T, i)) return i;
      }
      return -1;
    }

    // Fast path: array source with ops
    if (Array.isArray(source)) {
      const arr = this.executeArrayPipeline(source, ops);
      for (let i = 0; i < arr.length; i++) {
        if (predicate(arr[i]!, i)) return i;
      }
      return -1;
    }

    // Fallback for non-array sources
    let index = 0;
    for (const item of this) {
      if (predicate(item, index)) {
        return index;
      }
      index++;
    }
    return -1;
  }

  /**
   * Returns the index of the last element matching the predicate, or -1.
   */
  findLastIndex(predicate: Predicate<T>): number {
    const source = this[SOURCE];
    const ops = this[OPS];

    // Fast path: array source
    if (Array.isArray(source)) {
      const arr = ops.length === 0 ? source : this.executeArrayPipeline(source, ops);
      for (let i = arr.length - 1; i >= 0; i--) {
        if (predicate(arr[i] as T, i)) return i;
      }
      return -1;
    }

    // Fallback for non-array sources
    let lastIndex = -1;
    let index = 0;
    for (const item of this) {
      if (predicate(item, index)) {
        lastIndex = index;
      }
      index++;
    }
    return lastIndex;
  }

  /**
   * Returns the index of the first occurrence of an element, or -1.
   */
  indexOf(item: T): number {
    const source = this[SOURCE];
    const ops = this[OPS];

    // Fast path: array source with no ops
    if (Array.isArray(source) && ops.length === 0) {
      return source.indexOf(item);
    }

    // Fast path: array source with ops
    if (Array.isArray(source)) {
      const arr = this.executeArrayPipeline(source, ops);
      return arr.indexOf(item);
    }

    // Fallback for non-array sources
    let index = 0;
    for (const element of this) {
      if (element === item) {
        return index;
      }
      index++;
    }
    return -1;
  }

  /**
   * Returns the index of the last occurrence of an element, or -1.
   */
  lastIndexOf(item: T): number {
    const source = this[SOURCE];
    const ops = this[OPS];

    // Fast path: array source with no ops
    if (Array.isArray(source) && ops.length === 0) {
      return source.lastIndexOf(item);
    }

    // Fast path: array source with ops
    if (Array.isArray(source)) {
      const arr = this.executeArrayPipeline(source, ops);
      return arr.lastIndexOf(item);
    }

    // Fallback for non-array sources
    let lastIndex = -1;
    let index = 0;
    for (const element of this) {
      if (element === item) {
        lastIndex = index;
      }
      index++;
    }
    return lastIndex;
  }

  /**
   * Determines whether any elements exist, optionally matching a predicate.
   */
  some(predicate?: Predicate<T>): boolean {
    const source = this[SOURCE];
    const ops = this[OPS];

    // Fast path: array source with no ops
    if (Array.isArray(source) && ops.length === 0) {
      if (!predicate) return source.length > 0;
      for (let i = 0, len = source.length; i < len; i++) {
        if (predicate(source[i], i)) return true;
      }
      return false;
    }

    // Fast path: array source with ops
    if (Array.isArray(source)) {
      const result = this.executeArrayPipelineWithEarlyExit(source, ops, predicate || (() => true));
      return result !== undefined;
    }

    // Fallback for non-array sources
    let index = 0;
    for (const item of this) {
      if (!predicate || predicate(item, index++)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Determines whether all elements match a predicate.
   */
  every(predicate: Predicate<T>): boolean {
    const source = this[SOURCE];
    const pattern = this[PATTERN];

    // Fast path: array source with no ops - direct indexed loop beats native .every()
    if (Array.isArray(source) && pattern === Pattern.None) {
      for (let i = 0, len = source.length; i < len; i++) {
        if (!predicate(source[i], i)) return false;
      }
      return true;
    }

    // Fast path: array source with ops
    if (Array.isArray(source)) {
      const arr = pattern === Pattern.Complex
        ? this.executeArrayPipeline(source, this[OPS])
        : this.executeArrayPipeline(source, this.rebuildOps());
      for (let i = 0, len = arr.length; i < len; i++) {
        if (!predicate(arr[i]!, i)) return false;
      }
      return true;
    }

    // Fallback for non-array sources
    let index = 0;
    for (const item of this) {
      if (!predicate(item, index++)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Determines whether the sequence contains a specified element.
   */
  includes(item: T, comparer?: EqualityComparer<T>): boolean {
    const source = this[SOURCE];
    const ops = this[OPS];

    // Fast path: array source with no ops and no custom comparer
    if (Array.isArray(source) && ops.length === 0 && !comparer) {
      return source.includes(item);
    }

    // Fast path: array source with no ops but custom comparer
    if (Array.isArray(source) && ops.length === 0) {
      for (let i = 0; i < source.length; i++) {
        if (comparer!(source[i] as T, item)) return true;
      }
      return false;
    }

    // Fast path: array source with ops
    if (Array.isArray(source)) {
      const arr = this.executeArrayPipeline(source, ops);
      if (!comparer) return arr.includes(item);
      for (let i = 0; i < arr.length; i++) {
        if (comparer(arr[i]!, item)) return true;
      }
      return false;
    }

    // Fallback for non-array sources
    for (const element of this) {
      if (comparer ? comparer(element, item) : element === item) {
        return true;
      }
    }
    return false;
  }

  /**
   * Returns true if no elements match the predicate (opposite of some).
   */
  none(predicate: Predicate<T>): boolean {
    return !this.some(predicate);
  }

  /**
   * Splits sequence into chunks of specified size.
   */
  chunk(size: number): VorpalLazy<T[]> {
    const source = this[SOURCE];
    const pattern = this[PATTERN];
    // Fast path: array source with no ops
    if (Array.isArray(source) && pattern === Pattern.None) {
      const len = source.length;
      const numChunks = Math.ceil(len / size);
      const result = new Array<T[]>(numChunks);
      for (let i = 0; i < numChunks; i++) {
        result[i] = source.slice(i * size, (i + 1) * size) as T[];
      }
      return ownedArray(result);
    }
    return new VorpalLazy(chunkIterator(this, size), []);
  }

  /**
   * Gets a specific page of items (1-indexed).
   * @example
   * ```ts
   * V([1, 2, ..., 100]).page(2, 10); // items 11-20
   * ```
   */
  page(pageNum: number, pageSize: number): T[] {
    if (pageNum < 1 || pageSize < 1) return [];
    const start = (pageNum - 1) * pageSize;
    return this.skip(start).take(pageSize).toArray();
  }

  /**
   * Gets a page of items with pagination metadata (1-indexed).
   * @example
   * ```ts
   * V([1, 2, ..., 100]).paginate(2, 10);
   * // { items: [11-20], page: 2, pageSize: 10, total: 100, totalPages: 10, hasNext: true, hasPrev: true }
   * ```
   */
  paginate(pageNum: number, pageSize: number): PaginationResult<T> {
    const arr = this.toArray();
    const total = arr.length;
    const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
    const validPage = Math.max(1, Math.min(pageNum, totalPages || 1));
    const start = (validPage - 1) * pageSize;
    const items = pageSize > 0 ? arr.slice(start, start + pageSize) : [];

    return {
      items,
      page: validPage,
      pageSize,
      total,
      totalPages,
      hasNext: validPage < totalPages,
      hasPrev: validPage > 1,
    };
  }

  /**
   * Splits sequence into two arrays based on predicate.
   * Returns [matching, non-matching].
   */
  partition(predicate: Predicate<T>): [T[], T[]] {
    const matches: T[] = [];
    const rest: T[] = [];
    let index = 0;
    for (const item of this) {
      if (predicate(item, index++)) {
        matches.push(item);
      } else {
        rest.push(item);
      }
    }
    return [matches, rest];
  }

  /**
   * Executes an action on each element.
   */
  forEach(action: Action<T>): void {
    let index = 0;
    for (const item of this) {
      action(item, index++);
    }
  }

  /**
   * Returns all elements except the first (like skip(1)).
   */
  tail(): VorpalLazy<T> {
    return this.skip(1);
  }

  /**
   * Returns all elements except the last.
   */
  init(): VorpalLazy<T> {
    return new VorpalLazy(initIterator(this), []);
  }

  /**
   * Returns the last n elements.
   */
  takeLast(count: number): VorpalLazy<T> {
    if (count <= 0) return new VorpalLazy<T>([], []);
    const items = this.toArray();
    return new VorpalLazy(items.slice(-count), []);
  }

  /**
   * Returns all elements except the last n.
   */
  dropLast(count: number): VorpalLazy<T> {
    if (count <= 0) return this;
    const items = this.toArray();
    return new VorpalLazy(items.slice(0, -count), []);
  }

  /**
   * Returns elements from the end while predicate is true.
   */
  takeLastWhile(predicate: Predicate<T>): VorpalLazy<T> {
    const items = this.toArray();
    let i = items.length - 1;
    while (i >= 0 && predicate(items[i]!, i)) {
      i--;
    }
    return new VorpalLazy(items.slice(i + 1), []);
  }

  /**
   * Returns elements except those from the end while predicate is true.
   */
  dropLastWhile(predicate: Predicate<T>): VorpalLazy<T> {
    const items = this.toArray();
    let i = items.length - 1;
    while (i >= 0 && predicate(items[i]!, i)) {
      i--;
    }
    return new VorpalLazy(items.slice(0, i + 1), []);
  }

  /**
   * Returns a slice of elements from start to end index.
   */
  slice(start: number, end?: number): VorpalLazy<T> {
    const items = this.toArray();
    return new VorpalLazy(items.slice(start, end), []);
  }

  /**
   * Returns true if the sequence has no elements.
   */
  isEmpty(): boolean {
    for (const _ of this) {
      return false;
    }
    return true;
  }

  /**
   * Flattens nested arrays deeply.
   */
  flatten<D extends number = 20>(): VorpalLazy<FlatArray<T[], D>> {
    return new VorpalLazy(flattenIterator(this), []) as VorpalLazy<FlatArray<T[], D>>;
  }

  /**
   * Extracts a property from each element.
   */
  pluck<K extends keyof T>(key: K): VorpalLazy<T[K]> {
    return this.map(item => item[key]);
  }

  /**
   * Counts occurrences by key function.
   */
  countBy<K extends string | number>(keySelector: KeySelector<T, K>): Record<K, number> {
    const counts = {} as Record<K, number>;
    for (const item of this) {
      const key = keySelector(item);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }

  /**
   * Creates an object indexed by key function.
   */
  indexBy<K extends string | number>(keySelector: KeySelector<T, K>): Record<K, T> {
    const result = {} as Record<K, T>;
    for (const item of this) {
      const key = keySelector(item);
      result[key] = item;
    }
    return result;
  }

  /**
   * Returns elements not in the exclusion list.
   */
  without(exclusions: Iterable<T>): VorpalLazy<T> {
    const excludeSet = new Set(exclusions);
    return this.filter(item => !excludeSet.has(item));
  }

  /**
   * Returns elements in either sequence but not both (XOR).
   */
  symmetricDifference(other: Iterable<T>): VorpalLazy<T> {
    const otherSet = new Set(other);
    const thisArr = this.toArray();
    const thisSet = new Set(thisArr);
    const result: T[] = [];
    for (const item of thisSet) {
      if (!otherSet.has(item)) result.push(item);
    }
    for (const item of otherSet) {
      if (!thisSet.has(item)) result.push(item);
    }
    return new VorpalLazy(result, []);
  }

  /**
   * Returns sliding windows of n consecutive elements.
   * @param size - The window size
   * @param step - The step between windows (default 1)
   */
  aperture(size: number, step: number = 1): VorpalLazy<T[]> {
    if (size <= 0 || step <= 0) return new VorpalLazy<T[]>([], []);
    return new VorpalLazy(apertureIterator(this, size, step), []);
  }

  /**
   * Alias for aperture. Returns sliding windows of n consecutive elements.
   * @param size - The window size
   * @param step - The step between windows (default 1)
   */
  slidingWindow(size: number, step: number = 1): VorpalLazy<T[]> {
    return this.aperture(size, step);
  }

  /**
   * Returns consecutive pairs of elements.
   * Equivalent to aperture(2).
   */
  pairwise(): VorpalLazy<[T, T]> {
    return new VorpalLazy(pairwiseIterator(this), []);
  }

  /**
   * Checks if this sequence equals another sequence element by element.
   * @param other - The sequence to compare with
   * @param comparer - Optional equality function (default: strict equality)
   */
  sequenceEqual(other: Iterable<T>, comparer: (a: T, b: T) => boolean = (a, b) => a === b): boolean {
    const iter1 = this[Symbol.iterator]();
    const iter2 = other[Symbol.iterator]();

    while (true) {
      const r1 = iter1.next();
      const r2 = iter2.next();

      if (r1.done && r2.done) return true;
      if (r1.done !== r2.done) return false;
      if (!comparer(r1.value, r2.value)) return false;
    }
  }

  /**
   * Checks if this sequence starts with the given prefix.
   * @param prefix - The prefix sequence to check
   * @param comparer - Optional equality function (default: strict equality)
   */
  startsWith(prefix: Iterable<T>, comparer: (a: T, b: T) => boolean = (a, b) => a === b): boolean {
    const iter = this[Symbol.iterator]();

    for (const prefixItem of prefix) {
      const result = iter.next();
      if (result.done) return false;
      if (!comparer(result.value, prefixItem)) return false;
    }

    return true;
  }

  /**
   * Checks if this sequence ends with the given suffix.
   * @param suffix - The suffix sequence to check
   * @param comparer - Optional equality function (default: strict equality)
   */
  endsWith(suffix: Iterable<T>, comparer: (a: T, b: T) => boolean = (a, b) => a === b): boolean {
    const items = this.toArray();
    const suffixArr = [...suffix];

    if (suffixArr.length > items.length) return false;

    const startIndex = items.length - suffixArr.length;
    for (let i = 0; i < suffixArr.length; i++) {
      if (!comparer(items[startIndex + i]!, suffixArr[i]!)) return false;
    }

    return true;
  }

  /**
   * Returns intermediate values of a reduction (like reduce but keeps all steps).
   */
  scan<A>(func: (acc: A, item: T, index: number) => A, seed: A): VorpalLazy<A> {
    return new VorpalLazy(scanIterator(this, func, seed), []);
  }

  /**
   * Inserts a separator between each element.
   */
  intersperse(separator: T): VorpalLazy<T> {
    return new VorpalLazy(intersperseIterator(this, separator), []);
  }

  /**
   * Splits the sequence at the given index into two arrays.
   */
  splitAt(index: number): [T[], T[]] {
    const items = this.toArray();
    const actualIndex = index < 0 ? Math.max(0, items.length + index) : index;
    return [items.slice(0, actualIndex), items.slice(actualIndex)];
  }

  /**
   * Splits the sequence when the predicate first returns true.
   */
  splitWhen(predicate: Predicate<T>): [T[], T[]] {
    const items = this.toArray();
    const index = items.findIndex((item, i) => predicate(item, i));
    if (index === -1) return [items, []];
    return [items.slice(0, index), items.slice(index)];
  }

  /**
   * Transposes rows and columns of a 2D array.
   */
  transpose(): VorpalLazy<unknown[]> {
    const items = this.toArray() as unknown[][];
    if (items.length === 0) return new VorpalLazy<unknown[]>([], []);
    const maxLen = Math.max(...items.map(row => (row as unknown[]).length));
    const result: unknown[][] = [];
    for (let col = 0; col < maxLen; col++) {
      result.push(items.map(row => (row as unknown[])[col]));
    }
    return new VorpalLazy(result, []);
  }

  /**
   * Returns the Cartesian product of two sequences.
   */
  xprod<U>(other: Iterable<U>): VorpalLazy<[T, U]> {
    const otherArr = [...other];
    return new VorpalLazy(xprodIterator(this, otherArr), []);
  }

  /**
   * Returns distinct elements using a custom equality function.
   */
  uniqWith(equals: (a: T, b: T) => boolean): VorpalLazy<T> {
    return new VorpalLazy(uniqWithIterator(this, equals), []);
  }

  /**
   * Adds an element to the beginning.
   */
  prepend(item: T): VorpalLazy<T> {
    return new VorpalLazy(prependIterator(this, item), []);
  }

  /**
   * Adds an element to the end.
   */
  append(item: T): VorpalLazy<T> {
    return new VorpalLazy(appendIterator(this, item), []);
  }

  /**
   * Applies a function to the element at the specified index.
   */
  adjust(index: number, fn: (value: T) => T): VorpalLazy<T> {
    return new VorpalLazy(adjustIterator(this, index, fn), []);
  }

  /**
   * Replaces the element at the specified index with a new value.
   */
  update(index: number, value: T): VorpalLazy<T> {
    return this.adjust(index, () => value);
  }

  /**
   * Inserts an element at the specified index.
   */
  insert(index: number, item: T): VorpalLazy<T> {
    return new VorpalLazy(insertIterator(this, index, item), []);
  }

  /**
   * Inserts multiple elements at the specified index.
   */
  insertAll(index: number, items: Iterable<T>): VorpalLazy<T> {
    return new VorpalLazy(insertAllIterator(this, index, items), []);
  }

  /**
   * Moves an element from one index to another.
   */
  move(from: number, to: number): VorpalLazy<T> {
    const items = this.toArray();
    if (from < 0 || from >= items.length) return new VorpalLazy(items, []);
    const actualTo = Math.max(0, Math.min(items.length - 1, to));
    const [item] = items.splice(from, 1);
    items.splice(actualTo, 0, item!);
    return new VorpalLazy(items, []);
  }

  /**
   * Converts a sequence of [key, value] pairs to a plain object.
   * Assumes T is [string | number, V].
   */
  fromPairs<V>(): Record<string, V> {
    const result = {} as Record<string, V>;
    for (const item of this) {
      const [key, value] = item as unknown as [string | number, V];
      result[String(key)] = value;
    }
    return result;
  }

  /**
   * Converts a sequence of [key, value] pairs to a plain object.
   * Alias for fromPairs for compatibility.
   */
  toObject<V>(): Record<string, V> {
    return this.fromPairs<V>();
  }

  // ==================== Combinatorial Operations ====================

  /**
   * Returns all permutations of the sequence.
   * Warning: O(n!) complexity - use only for small sequences.
   * @example
   * V([1, 2, 3]).permutations().toArray();
   * // [[1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]]
   */
  permutations(): VorpalLazy<T[]> {
    return new VorpalLazy(permutationsIterator(this.toArray()), []);
  }

  /**
   * Returns all k-combinations of the sequence.
   * @param k - The size of each combination
   * @example
   * V([1, 2, 3]).combinations(2).toArray();
   * // [[1, 2], [1, 3], [2, 3]]
   */
  combinations(k: number): VorpalLazy<T[]> {
    if (k < 0) return new VorpalLazy<T[]>([], []);
    return new VorpalLazy(combinationsIterator(this.toArray(), k), []);
  }

  // ==================== Randomization Operations ====================

  /**
   * Returns a new sequence with elements in random order.
   * Uses Fisher-Yates shuffle algorithm.
   */
  shuffle(): VorpalLazy<T> {
    const arr = this.toArray();
    // Fisher-Yates shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return new VorpalLazy(arr, []);
  }

  /**
   * Returns n random elements from the sequence.
   * @param n - Number of elements to sample
   */
  sample(n: number): VorpalLazy<T> {
    if (n <= 0) return new VorpalLazy<T>([], []);
    const arr = this.toArray();
    if (n >= arr.length) return this.shuffle();

    // Partial Fisher-Yates for sampling
    const result: T[] = [];
    const indices = new Set<number>();
    while (result.length < n && result.length < arr.length) {
      const idx = Math.floor(Math.random() * arr.length);
      if (!indices.has(idx)) {
        indices.add(idx);
        result.push(arr[idx]!);
      }
    }
    return new VorpalLazy(result, []);
  }

  /**
   * Returns a single random element from the sequence.
   * @returns A random element or undefined if sequence is empty
   */
  random(): T | undefined {
    const arr = this.toArray();
    if (arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ==================== Search Operations ====================

  /**
   * Binary search on a sorted sequence.
   * @param value - The value to search for
   * @param compareFn - Optional comparison function (default: numeric/string comparison)
   * @returns The index of the element, or -1 if not found
   */
  binarySearch(value: T, compareFn?: (a: T, b: T) => number): number {
    const arr = this.toArray();
    const cmp = compareFn ?? ((a: T, b: T) => (a < b ? -1 : a > b ? 1 : 0));

    let left = 0;
    let right = arr.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const comparison = cmp(arr[mid]!, value);

      if (comparison === 0) return mid;
      if (comparison < 0) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return -1;
  }

  /**
   * Binary search that returns the insertion point.
   * @param value - The value to search for
   * @param compareFn - Optional comparison function
   * @returns The index where the element should be inserted to maintain sorted order
   */
  binarySearchIndex(value: T, compareFn?: (a: T, b: T) => number): number {
    const arr = this.toArray();
    const cmp = compareFn ?? ((a: T, b: T) => (a < b ? -1 : a > b ? 1 : 0));

    let left = 0;
    let right = arr.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (cmp(arr[mid]!, value) < 0) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return left;
  }
}

interface SortKey<T> {
  keySelector: KeySelector<T, unknown>;
  comparer?: Comparer<unknown> | undefined;
  descending: boolean;
}

/**
 * Ordered sequence that supports secondary sorting with thenBy.
 */
export class VorpalOrdered<T> extends VorpalLazy<T> {
  private readonly sortKeys: SortKey<T>[];
  private readonly originalSource: Iterable<T>;

  constructor(source: Iterable<T>, sortKeys: SortKey<T>[]) {
    // Don't pass to super yet - we need to sort first
    super([], []);
    this.originalSource = source;
    this.sortKeys = sortKeys;
  }

  [Symbol.iterator](): Iterator<T> {
    return this.sortedArray()[Symbol.iterator]();
  }

  /**
   * Create sorted array with cached keys for performance.
   * Caches key values to avoid repeated keySelector calls during sort.
   */
  private sortedArray(): T[] {
    // Fast path: avoid spread for array sources
    const source = this.originalSource;
    const items: T[] = Array.isArray(source) ? source.slice() : [...source];
    const len = items.length;
    if (len <= 1) return items;

    const sortKeys = this.sortKeys;
    const numKeys = sortKeys.length;

    // Single key optimization - most common case
    if (numKeys === 1) {
      const { keySelector, comparer, descending } = sortKeys[0]!;

      // Ultra-fast path: numeric sort with identity-like selector
      // Check first element to detect if keys are the items themselves (numbers)
      const firstKey = keySelector(items[0]!);
      if (!comparer && typeof firstKey === 'number' && firstKey === items[0]) {
        // Direct numeric sort - no key caching needed
        if (descending) {
          items.sort((a, b) => (b as unknown as number) - (a as unknown as number));
        } else {
          items.sort((a, b) => (a as unknown as number) - (b as unknown as number));
        }
        return items;
      }

      // Pre-compute all keys once
      const keys = new Array(len);
      keys[0] = firstKey; // Reuse already computed first key
      for (let i = 1; i < len; i++) {
        keys[i] = keySelector(items[i]!);
      }

      // Create index array for stable sort
      const indices = new Array(len);
      for (let i = 0; i < len; i++) indices[i] = i;

      if (comparer) {
        indices.sort((i, j) => {
          const result = comparer(keys[i], keys[j]);
          return descending ? -result : result;
        });
      } else {
        indices.sort((i, j) => {
          const ka = keys[i] as string | number;
          const kb = keys[j] as string | number;
          const result = ka < kb ? -1 : ka > kb ? 1 : 0;
          return descending ? -result : result;
        });
      }

      // Reorder items according to sorted indices
      const sorted = new Array(len);
      for (let i = 0; i < len; i++) {
        sorted[i] = items[indices[i]!]!;
      }
      return sorted as T[];
    }

    // Multiple keys - cache all key values
    const allKeys: unknown[][] = new Array(numKeys);
    for (let k = 0; k < numKeys; k++) {
      const keys = new Array(len);
      const selector = sortKeys[k]!.keySelector;
      for (let i = 0; i < len; i++) {
        keys[i] = selector(items[i]!);
      }
      allKeys[k] = keys;
    }

    // Create index array for stable sort
    const indices = new Array(len);
    for (let i = 0; i < len; i++) indices[i] = i;

    indices.sort((i, j) => {
      for (let k = 0; k < numKeys; k++) {
        const { comparer, descending } = sortKeys[k]!;
        const keyA = allKeys[k]![i];
        const keyB = allKeys[k]![j];
        let result: number;
        if (comparer) {
          result = comparer(keyA, keyB);
        } else {
          const ka = keyA as string | number;
          const kb = keyB as string | number;
          result = ka < kb ? -1 : ka > kb ? 1 : 0;
        }
        if (result !== 0) {
          return descending ? -result : result;
        }
      }
      return 0;
    });

    // Reorder items according to sorted indices
    const sorted = new Array(len);
    for (let i = 0; i < len; i++) {
      sorted[i] = items[indices[i]!]!;
    }
    return sorted as T[];
  }

  /**
   * Performs secondary sort by key in ascending order.
   */
  thenBy<K>(keySelector: KeySelector<T, K>, comparer?: Comparer<K>): VorpalOrdered<T> {
    return new VorpalOrdered(this.originalSource, [
      ...this.sortKeys,
      { keySelector: keySelector as KeySelector<T, unknown>, comparer: comparer as Comparer<unknown>, descending: false },
    ]);
  }

  /**
   * Performs secondary sort by key in descending order.
   */
  thenByDesc<K>(keySelector: KeySelector<T, K>, comparer?: Comparer<K>): VorpalOrdered<T> {
    return new VorpalOrdered(this.originalSource, [
      ...this.sortKeys,
      { keySelector: keySelector as KeySelector<T, unknown>, comparer: comparer as Comparer<unknown>, descending: true },
    ]);
  }

  /**
   * Override toArray to use the sorted array directly
   */
  toArray(): T[] {
    return this.sortedArray();
  }
}

// ==================== Iterator Functions ====================

/**
 * Optimized distinct for arrays - returns array directly without generator
 */
function distinctArray<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  const len = arr.length;
  for (let i = 0; i < len; i++) {
    const item = arr[i]!;
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

/**
 * Optimized distinctBy for arrays - returns array directly without generator
 */
function distinctByArray<T, K>(arr: T[], keySelector: KeySelector<T, K>): T[] {
  const seen = new Set<K>();
  const result: T[] = [];
  const len = arr.length;
  for (let i = 0; i < len; i++) {
    const item = arr[i]!;
    const key = keySelector(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function* distinctIterator<T>(source: Iterable<T>): Generator<T> {
  const seen = new Set<T>();
  for (const item of source) {
    if (!seen.has(item)) {
      seen.add(item);
      yield item;
    }
  }
}

function* distinctByIterator<T, K>(source: Iterable<T>, keySelector: KeySelector<T, K>): Generator<T> {
  const seen = new Set<K>();
  for (const item of source) {
    const key = keySelector(item);
    if (!seen.has(key)) {
      seen.add(key);
      yield item;
    }
  }
}

/**
 * Optimized flatMap for arrays - returns array directly without generator
 */
function flatMapArray<T, R>(arr: T[], selector: Selector<T, Iterable<R>>): R[] {
  const result: R[] = [];
  const len = arr.length;
  for (let i = 0; i < len; i++) {
    const inner = selector(arr[i]!, i);
    // Fast path for arrays
    if (Array.isArray(inner)) {
      const innerLen = inner.length;
      for (let j = 0; j < innerLen; j++) {
        result.push(inner[j]!);
      }
    } else {
      for (const item of inner) {
        result.push(item);
      }
    }
  }
  return result;
}

function* flatMapIterator<T, R>(source: Iterable<T>, selector: Selector<T, Iterable<R>>): Generator<R> {
  let index = 0;
  for (const item of source) {
    yield* selector(item, index++);
  }
}

/**
 * Optimized groupBy for arrays - returns array directly without generator
 */
function groupByArray<T, K, V>(
  arr: T[],
  keySelector: KeySelector<T, K>,
  valueSelector?: Selector<T, V>
): Grouping<K, V>[] {
  const map = new Map<K, V[]>();
  const order: K[] = [];
  const len = arr.length;

  for (let i = 0; i < len; i++) {
    const item = arr[i]!;
    const key = keySelector(item);
    const value = valueSelector ? valueSelector(item, i) : item as unknown as V;

    let group = map.get(key);
    if (group === undefined) {
      group = [];
      map.set(key, group);
      order.push(key);
    }
    group.push(value);
  }

  const result: Grouping<K, V>[] = new Array(order.length);
  for (let i = 0; i < order.length; i++) {
    result[i] = { key: order[i]!, values: map.get(order[i]!)! };
  }
  return result;
}

function* groupByIterator<T, K, V>(
  source: Iterable<T>,
  keySelector: KeySelector<T, K>,
  valueSelector?: Selector<T, V>
): Generator<Grouping<K, V>> {
  const map = new Map<K, V[]>();
  const order: K[] = [];
  let index = 0;

  for (const item of source) {
    const key = keySelector(item);
    const value = valueSelector ? valueSelector(item, index++) : item as unknown as V;

    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(value);
  }

  for (const key of order) {
    yield { key, values: map.get(key)! };
  }
}

function* concatIterator<T>(first: Iterable<T>, second: Iterable<T>): Generator<T> {
  yield* first;
  yield* second;
}

function* unionIterator<T>(first: Iterable<T>, second: Iterable<T>, _comparer?: EqualityComparer<T>): Generator<T> {
  const seen = new Set<T>();
  for (const item of first) {
    if (!seen.has(item)) {
      seen.add(item);
      yield item;
    }
  }
  for (const item of second) {
    if (!seen.has(item)) {
      seen.add(item);
      yield item;
    }
  }
}

function* intersectIterator<T>(first: Iterable<T>, second: Iterable<T>, _comparer?: EqualityComparer<T>): Generator<T> {
  const secondSet = new Set(second);
  const seen = new Set<T>();
  for (const item of first) {
    if (secondSet.has(item) && !seen.has(item)) {
      seen.add(item);
      yield item;
    }
  }
}

function* differenceIterator<T>(first: Iterable<T>, second: Iterable<T>, _comparer?: EqualityComparer<T>): Generator<T> {
  const secondSet = new Set(second);
  const seen = new Set<T>();
  for (const item of first) {
    if (!secondSet.has(item) && !seen.has(item)) {
      seen.add(item);
      yield item;
    }
  }
}

function* unionByIterator<T, K>(first: Iterable<T>, second: Iterable<T>, keySelector: KeySelector<T, K>): Generator<T> {
  const seenKeys = new Set<K>();
  for (const item of first) {
    const key = keySelector(item);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      yield item;
    }
  }
  for (const item of second) {
    const key = keySelector(item);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      yield item;
    }
  }
}

function* intersectByIterator<T, K>(first: Iterable<T>, second: Iterable<T>, keySelector: KeySelector<T, K>): Generator<T> {
  const secondKeys = new Set<K>();
  for (const item of second) {
    secondKeys.add(keySelector(item));
  }
  const seenKeys = new Set<K>();
  for (const item of first) {
    const key = keySelector(item);
    if (secondKeys.has(key) && !seenKeys.has(key)) {
      seenKeys.add(key);
      yield item;
    }
  }
}

function* differenceByIterator<T, K>(first: Iterable<T>, second: Iterable<T>, keySelector: KeySelector<T, K>): Generator<T> {
  const secondKeys = new Set<K>();
  for (const item of second) {
    secondKeys.add(keySelector(item));
  }
  const seenKeys = new Set<K>();
  for (const item of first) {
    const key = keySelector(item);
    if (!secondKeys.has(key) && !seenKeys.has(key)) {
      seenKeys.add(key);
      yield item;
    }
  }
}

// ==================== Join Iterator Functions ====================

/**
 * Builds a lookup map from an iterable for efficient key-based access.
 */
function buildLookup<T, K>(items: Iterable<T>, keySelector: KeySelector<T, K>): Map<K, T[]> {
  const lookup = new Map<K, T[]>();
  for (const item of items) {
    const key = keySelector(item);
    let group = lookup.get(key);
    if (group === undefined) {
      group = [];
      lookup.set(key, group);
    }
    group.push(item);
  }
  return lookup;
}

/**
 * Inner join - returns results where keys exist in both sequences.
 */
function* innerJoinIterator<T, I, K, R>(
  outer: Iterable<T>,
  inner: Iterable<I>,
  outerKeySelector: KeySelector<T, K>,
  innerKeySelector: KeySelector<I, K>,
  resultSelector: (outer: T, inner: I) => R
): Generator<R> {
  const innerLookup = buildLookup(inner, innerKeySelector);

  for (const outerItem of outer) {
    const key = outerKeySelector(outerItem);
    const matches = innerLookup.get(key);
    if (matches) {
      for (const innerItem of matches) {
        yield resultSelector(outerItem, innerItem);
      }
    }
  }
}

/**
 * Left join - all from outer, matched from inner (undefined if no match).
 */
function* leftJoinIterator<T, I, K, R>(
  outer: Iterable<T>,
  inner: Iterable<I>,
  outerKeySelector: KeySelector<T, K>,
  innerKeySelector: KeySelector<I, K>,
  resultSelector: (outer: T, inner: I | undefined) => R
): Generator<R> {
  const innerLookup = buildLookup(inner, innerKeySelector);

  for (const outerItem of outer) {
    const key = outerKeySelector(outerItem);
    const matches = innerLookup.get(key);
    if (matches && matches.length > 0) {
      for (const innerItem of matches) {
        yield resultSelector(outerItem, innerItem);
      }
    } else {
      yield resultSelector(outerItem, undefined);
    }
  }
}

/**
 * Right join - all from inner, matched from outer (undefined if no match).
 */
function* rightJoinIterator<T, I, K, R>(
  outer: Iterable<T>,
  inner: Iterable<I>,
  outerKeySelector: KeySelector<T, K>,
  innerKeySelector: KeySelector<I, K>,
  resultSelector: (outer: T | undefined, inner: I) => R
): Generator<R> {
  const outerLookup = buildLookup(outer, outerKeySelector);

  for (const innerItem of inner) {
    const key = innerKeySelector(innerItem);
    const matches = outerLookup.get(key);
    if (matches && matches.length > 0) {
      for (const outerItem of matches) {
        yield resultSelector(outerItem, innerItem);
      }
    } else {
      yield resultSelector(undefined, innerItem);
    }
  }
}

/**
 * Full outer join - all from both, undefined where no match.
 */
function* fullJoinIterator<T, I, K, R>(
  outer: Iterable<T>,
  inner: Iterable<I>,
  outerKeySelector: KeySelector<T, K>,
  innerKeySelector: KeySelector<I, K>,
  resultSelector: (outer: T | undefined, inner: I | undefined) => R
): Generator<R> {
  const innerLookup = buildLookup(inner, innerKeySelector);
  const matchedInnerKeys = new Set<K>();

  // First, iterate outer and match with inner
  for (const outerItem of outer) {
    const key = outerKeySelector(outerItem);
    const matches = innerLookup.get(key);
    if (matches && matches.length > 0) {
      matchedInnerKeys.add(key);
      for (const innerItem of matches) {
        yield resultSelector(outerItem, innerItem);
      }
    } else {
      yield resultSelector(outerItem, undefined);
    }
  }

  // Then, yield unmatched inner items
  for (const [key, items] of innerLookup) {
    if (!matchedInnerKeys.has(key)) {
      for (const innerItem of items) {
        yield resultSelector(undefined, innerItem);
      }
    }
  }
}

/**
 * Cross join - Cartesian product of two sequences.
 */
function* crossJoinIterator<T, I, R>(
  outer: Iterable<T>,
  inner: Iterable<I>,
  resultSelector: (outer: T, inner: I) => R
): Generator<R> {
  // Materialize inner to allow multiple iterations
  const innerArr = Array.isArray(inner) ? inner : [...inner];

  for (const outerItem of outer) {
    for (const innerItem of innerArr) {
      yield resultSelector(outerItem, innerItem);
    }
  }
}

/**
 * Group join - groups all matching inner elements for each outer element.
 */
function* groupJoinIterator<T, I, K, R>(
  outer: Iterable<T>,
  inner: Iterable<I>,
  outerKeySelector: KeySelector<T, K>,
  innerKeySelector: KeySelector<I, K>,
  resultSelector: (outer: T, innerGroup: I[]) => R
): Generator<R> {
  const innerLookup = buildLookup(inner, innerKeySelector);

  for (const outerItem of outer) {
    const key = outerKeySelector(outerItem);
    const matches = innerLookup.get(key) ?? [];
    yield resultSelector(outerItem, matches);
  }
}

/**
 * Semi join - outer elements that have at least one match in inner.
 */
function* semiJoinIterator<T, I, K>(
  outer: Iterable<T>,
  inner: Iterable<I>,
  outerKeySelector: KeySelector<T, K>,
  innerKeySelector: KeySelector<I, K>
): Generator<T> {
  // Build a Set of inner keys for O(1) lookup
  const innerKeys = new Set<K>();
  for (const item of inner) {
    innerKeys.add(innerKeySelector(item));
  }

  for (const outerItem of outer) {
    const key = outerKeySelector(outerItem);
    if (innerKeys.has(key)) {
      yield outerItem;
    }
  }
}

/**
 * Anti join - outer elements that have NO match in inner.
 */
function* antiJoinIterator<T, I, K>(
  outer: Iterable<T>,
  inner: Iterable<I>,
  outerKeySelector: KeySelector<T, K>,
  innerKeySelector: KeySelector<I, K>
): Generator<T> {
  // Build a Set of inner keys for O(1) lookup
  const innerKeys = new Set<K>();
  for (const item of inner) {
    innerKeys.add(innerKeySelector(item));
  }

  for (const outerItem of outer) {
    const key = outerKeySelector(outerItem);
    if (!innerKeys.has(key)) {
      yield outerItem;
    }
  }
}

function* zipIterator<T, U, R>(
  first: Iterable<T>,
  second: Iterable<U>,
  resultSelector: (first: T, second: U) => R
): Generator<R> {
  const iter1 = first[Symbol.iterator]();
  const iter2 = second[Symbol.iterator]();

  while (true) {
    const result1 = iter1.next();
    const result2 = iter2.next();

    if (result1.done || result2.done) {
      break;
    }

    yield resultSelector(result1.value, result2.value);
  }
}

function* chunkIterator<T>(source: Iterable<T>, size: number): Generator<T[]> {
  let chunk: T[] = [];
  for (const item of source) {
    chunk.push(item);
    if (chunk.length === size) {
      yield chunk;
      chunk = [];
    }
  }
  if (chunk.length > 0) {
    yield chunk;
  }
}

function* initIterator<T>(source: Iterable<T>): Generator<T> {
  let prev: T | undefined;
  let hasPrev = false;
  for (const item of source) {
    if (hasPrev) {
      yield prev!;
    }
    prev = item;
    hasPrev = true;
  }
}

function* flattenIterator<T>(source: Iterable<T>): Generator<unknown> {
  for (const item of source) {
    if (Array.isArray(item)) {
      yield* flattenIterator(item);
    } else {
      yield item;
    }
  }
}

function* apertureIterator<T>(source: Iterable<T>, size: number, step: number = 1): Generator<T[]> {
  const buffer: T[] = [];
  let skipCount = 0;

  for (const item of source) {
    buffer.push(item);

    if (buffer.length === size) {
      yield [...buffer];
      // Remove 'step' elements from the front
      for (let i = 0; i < step && buffer.length > 0; i++) {
        buffer.shift();
      }
      // If step > size, we need to skip some elements
      if (step > size) {
        skipCount = step - size;
      }
    } else if (skipCount > 0) {
      buffer.pop(); // Remove the item we just added
      skipCount--;
    }
  }
}

function* pairwiseIterator<T>(source: Iterable<T>): Generator<[T, T]> {
  let prev: T | undefined;
  let hasPrev = false;

  for (const item of source) {
    if (hasPrev) {
      yield [prev!, item];
    }
    prev = item;
    hasPrev = true;
  }
}

function* scanIterator<T, A>(source: Iterable<T>, func: (acc: A, item: T, index: number) => A, seed: A): Generator<A> {
  let acc = seed;
  let index = 0;
  yield acc;
  for (const item of source) {
    acc = func(acc, item, index++);
    yield acc;
  }
}

function* intersperseIterator<T>(source: Iterable<T>, separator: T): Generator<T> {
  let first = true;
  for (const item of source) {
    if (!first) yield separator;
    yield item;
    first = false;
  }
}

function* xprodIterator<T, U>(first: Iterable<T>, second: U[]): Generator<[T, U]> {
  for (const a of first) {
    for (const b of second) {
      yield [a, b];
    }
  }
}

function* uniqWithIterator<T>(source: Iterable<T>, equals: (a: T, b: T) => boolean): Generator<T> {
  const seen: T[] = [];
  for (const item of source) {
    if (!seen.some(s => equals(s, item))) {
      seen.push(item);
      yield item;
    }
  }
}

function* prependIterator<T>(source: Iterable<T>, item: T): Generator<T> {
  yield item;
  yield* source;
}

function* appendIterator<T>(source: Iterable<T>, item: T): Generator<T> {
  yield* source;
  yield item;
}

function* adjustIterator<T>(source: Iterable<T>, index: number, fn: (value: T) => T): Generator<T> {
  let i = 0;
  for (const item of source) {
    yield i === index ? fn(item) : item;
    i++;
  }
}

function* insertIterator<T>(source: Iterable<T>, index: number, newItem: T): Generator<T> {
  let i = 0;
  let inserted = false;
  for (const item of source) {
    if (i === index && !inserted) {
      yield newItem;
      inserted = true;
    }
    yield item;
    i++;
  }
  if (!inserted) {
    yield newItem;
  }
}

function* insertAllIterator<T>(source: Iterable<T>, index: number, newItems: Iterable<T>): Generator<T> {
  let i = 0;
  let inserted = false;
  for (const item of source) {
    if (i === index && !inserted) {
      yield* newItems;
      inserted = true;
    }
    yield item;
    i++;
  }
  if (!inserted) {
    yield* newItems;
  }
}

// ==================== Combinatorial Iterator Functions ====================

function* permutationsIterator<T>(arr: T[]): Generator<T[]> {
  const len = arr.length;
  if (len === 0) {
    yield [];
    return;
  }
  if (len === 1) {
    yield [arr[0]!];
    return;
  }

  // Heap's algorithm for generating permutations
  const c = new Array<number>(len).fill(0);
  const result = arr.slice();

  yield result.slice();

  let i = 0;
  while (i < len) {
    if (c[i]! < i) {
      if (i % 2 === 0) {
        [result[0], result[i]] = [result[i]!, result[0]!];
      } else {
        [result[c[i]!], result[i]] = [result[i]!, result[c[i]!]!];
      }
      yield result.slice();
      c[i]!++;
      i = 0;
    } else {
      c[i] = 0;
      i++;
    }
  }
}

function* combinationsIterator<T>(arr: T[], k: number): Generator<T[]> {
  const len = arr.length;
  if (k === 0) {
    yield [];
    return;
  }
  if (k > len) return;
  if (k === len) {
    yield arr.slice();
    return;
  }

  // Generate combinations using iterative approach
  const indices = Array.from({ length: k }, (_, i) => i);

  while (true) {
    yield indices.map(i => arr[i]!);

    // Find rightmost index that can be incremented
    let i = k - 1;
    while (i >= 0 && indices[i] === len - k + i) {
      i--;
    }

    if (i < 0) break;

    // Increment that index and reset all following indices
    indices[i]!++;
    for (let j = i + 1; j < k; j++) {
      indices[j] = indices[j - 1]! + 1;
    }
  }
}

