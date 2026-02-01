/**
 * Vorpal Function-Based API
 *
 * High-performance array operations with zero wrapper overhead.
 * All functions are curried (data-last) for pipe/compose compatibility.
 *
 * @example
 * ```ts
 * import { pipe, filter, map, take, sum } from 'vorpal/fn';
 *
 * const result = pipe(
 *   filter((x: number) => x % 2 === 0),
 *   map((x: number) => x * 2),
 *   take(5)
 * )([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 * // [4, 8, 12, 16, 20]
 * ```
 */

// ==================== Type Definitions ====================

type Fn<A, B> = (a: A) => B;
type Predicate<T> = (value: T, index: number) => boolean;
type Selector<T, R> = (value: T, index: number) => R;
type Comparator<T> = (a: T, b: T) => number;

// Symbol to mark functions that have transducer equivalents
const TRANSDUCER = Symbol('transducer');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TransducerFn<A, B> = Fn<A, B> & { [TRANSDUCER]?: Transducer<any, any> };

// Transducer types (defined early for use in pipe)
type Reducer<A, B> = (acc: A, x: B) => A | Reduced<A>;
type Transducer<A, B> = <R>(rf: Reducer<R, B>) => Reducer<R, A>;

// Reduced wrapper for early termination
const REDUCED = Symbol('reduced');
interface Reduced<T> {
  [REDUCED]: true;
  value: T;
}

function reduced<T>(value: T): Reduced<T> {
  return { [REDUCED]: true, value };
}

function isReduced<T>(x: T | Reduced<T>): x is Reduced<T> {
  return x !== null && typeof x === 'object' && REDUCED in x;
}

function unreduced<T>(x: T | Reduced<T>): T {
  return isReduced(x) ? x.value : x;
}

// ==================== Pipe / Compose ====================

/**
 * Composes functions from left to right.
 * @example
 * ```ts
 * const process = pipe(
 *   filter((x: number) => x > 0),
 *   map((x: number) => x * 2),
 *   take(5)
 * );
 * process([1, -2, 3, 4, 5, 6]); // [2, 6, 8, 10, 12]
 * ```
 */
export function pipe<A, B>(f1: Fn<A, B>): Fn<A, B>;
export function pipe<A, B, C>(f1: Fn<A, B>, f2: Fn<B, C>): Fn<A, C>;
export function pipe<A, B, C, D>(f1: Fn<A, B>, f2: Fn<B, C>, f3: Fn<C, D>): Fn<A, D>;
export function pipe<A, B, C, D, E>(f1: Fn<A, B>, f2: Fn<B, C>, f3: Fn<C, D>, f4: Fn<D, E>): Fn<A, E>;
export function pipe<A, B, C, D, E, F>(f1: Fn<A, B>, f2: Fn<B, C>, f3: Fn<C, D>, f4: Fn<D, E>, f5: Fn<E, F>): Fn<A, F>;
export function pipe<A, B, C, D, E, F, G>(f1: Fn<A, B>, f2: Fn<B, C>, f3: Fn<C, D>, f4: Fn<D, E>, f5: Fn<E, F>, f6: Fn<F, G>): Fn<A, G>;
export function pipe<A, B, C, D, E, F, G, H>(f1: Fn<A, B>, f2: Fn<B, C>, f3: Fn<C, D>, f4: Fn<D, E>, f5: Fn<E, F>, f6: Fn<F, G>, f7: Fn<G, H>): Fn<A, H>;
export function pipe<A, B, C, D, E, F, G, H, I>(f1: Fn<A, B>, f2: Fn<B, C>, f3: Fn<C, D>, f4: Fn<D, E>, f5: Fn<E, F>, f6: Fn<F, G>, f7: Fn<G, H>, f8: Fn<H, I>): Fn<A, I>;
export function pipe<A, B, C, D, E, F, G, H, I, J>(f1: Fn<A, B>, f2: Fn<B, C>, f3: Fn<C, D>, f4: Fn<D, E>, f5: Fn<E, F>, f6: Fn<F, G>, f7: Fn<G, H>, f8: Fn<H, I>, f9: Fn<I, J>): Fn<A, J>;
export function pipe<A, B, C, D, E, F, G, H, I, J, K>(f1: Fn<A, B>, f2: Fn<B, C>, f3: Fn<C, D>, f4: Fn<D, E>, f5: Fn<E, F>, f6: Fn<F, G>, f7: Fn<G, H>, f8: Fn<H, I>, f9: Fn<I, J>, f10: Fn<J, K>): Fn<A, K>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function pipe(...fns: TransducerFn<any, any>[]): Fn<unknown, unknown> {
  // Check if all functions have transducer equivalents - use single-pass execution
  const allTransducible = fns.every(fn => TRANSDUCER in fn);

  if (allTransducible && fns.length > 1) {
    // Compose transducers for single-pass execution
    const transducers = fns.map(fn => fn[TRANSDUCER]!);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (arr: unknown): any[] => {
      // Compose transducers right-to-left
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const push: Reducer<any[], any> = (acc, x) => {
        acc.push(x);
        return acc;
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let composed: Reducer<any[], any> = push;
      for (let i = transducers.length - 1; i >= 0; i--) {
        composed = transducers[i]!(composed);
      }

      // Execute in single pass
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any[] = [];
      const inputArr = arr as readonly unknown[];
      for (let i = 0; i < inputArr.length; i++) {
        const res = composed(result, inputArr[i]);
        if (isReduced(res)) break;
      }
      return result;
    };
  }

  // Fallback to regular pipe for non-transducible functions
  return (x) => {
    let result = x;
    for (let i = 0; i < fns.length; i++) {
      result = fns[i]!(result);
    }
    return result;
  };
}

/**
 * Composes functions from right to left.
 * @example
 * ```ts
 * const process = compose(
 *   take(5),
 *   map((x: number) => x * 2),
 *   filter((x: number) => x > 0)
 * );
 * process([1, -2, 3, 4, 5, 6]); // [2, 6, 8, 10, 12]
 * ```
 */
export function compose<A, B>(f1: Fn<A, B>): Fn<A, B>;
export function compose<A, B, C>(f2: Fn<B, C>, f1: Fn<A, B>): Fn<A, C>;
export function compose<A, B, C, D>(f3: Fn<C, D>, f2: Fn<B, C>, f1: Fn<A, B>): Fn<A, D>;
export function compose<A, B, C, D, E>(f4: Fn<D, E>, f3: Fn<C, D>, f2: Fn<B, C>, f1: Fn<A, B>): Fn<A, E>;
export function compose<A, B, C, D, E, F>(f5: Fn<E, F>, f4: Fn<D, E>, f3: Fn<C, D>, f2: Fn<B, C>, f1: Fn<A, B>): Fn<A, F>;
export function compose(...fns: Fn<unknown, unknown>[]): Fn<unknown, unknown> {
  return (x) => {
    let result = x;
    for (let i = fns.length - 1; i >= 0; i--) {
      result = fns[i]!(result);
    }
    return result;
  };
}

// ==================== Transformation Operations ====================

/**
 * Filters array elements by predicate.
 * @example
 * ```ts
 * filter((x: number) => x > 2)([1, 2, 3, 4]); // [3, 4]
 * filter((x: number) => x > 2, [1, 2, 3, 4]); // [3, 4]
 * ```
 */
export function filter<T>(predicate: Predicate<T>): (arr: readonly T[]) => T[];
export function filter<T>(predicate: Predicate<T>, arr: readonly T[]): T[];
export function filter<T>(predicate: Predicate<T>, arr?: readonly T[]) {
  const exec = ((arr: readonly T[]): T[] => {
    const len = arr.length;
    const result: T[] = [];
    for (let i = 0; i < len; i++) {
      if (predicate(arr[i] as T, i)) result.push(arr[i] as T);
    }
    return result;
  }) as TransducerFn<readonly T[], T[]>;

  // Attach transducer for pipe optimization
  exec[TRANSDUCER] = <R>(rf: Reducer<R, T>): Reducer<R, T> => {
    let i = 0;
    return (acc, x) => predicate(x as T, i++) ? rf(acc, x) : acc;
  };

  return arr === undefined ? exec : exec(arr);
}

/**
 * Maps array elements through a transformation function.
 * @example
 * ```ts
 * map((x: number) => x * 2)([1, 2, 3]); // [2, 4, 6]
 * map((x: number) => x * 2, [1, 2, 3]); // [2, 4, 6]
 * ```
 */
export function map<T, U>(fn: Selector<T, U>): (arr: readonly T[]) => U[];
export function map<T, U>(fn: Selector<T, U>, arr: readonly T[]): U[];
export function map<T, U>(fn: Selector<T, U>, arr?: readonly T[]) {
  const exec = ((arr: readonly T[]): U[] => {
    const len = arr.length;
    const result = new Array<U>(len);
    for (let i = 0; i < len; i++) {
      result[i] = fn(arr[i] as T, i);
    }
    return result;
  }) as TransducerFn<readonly T[], U[]>;

  // Attach transducer for pipe optimization
  exec[TRANSDUCER] = <R>(rf: Reducer<R, U>): Reducer<R, T> => {
    let i = 0;
    return (acc, x) => rf(acc, fn(x as T, i++));
  };

  return arr === undefined ? exec : exec(arr);
}

/**
 * Maps and flattens array elements.
 * @example
 * ```ts
 * flatMap((x: number) => [x, x * 2])([1, 2]); // [1, 2, 2, 4]
 * ```
 */
export function flatMap<T, U>(fn: (value: T, index: number) => readonly U[]): (arr: readonly T[]) => U[];
export function flatMap<T, U>(fn: (value: T, index: number) => readonly U[], arr: readonly T[]): U[];
export function flatMap<T, U>(fn: (value: T, index: number) => readonly U[], arr?: readonly T[]) {
  const exec = ((arr: readonly T[]): U[] => {
    const result: U[] = [];
    for (let i = 0; i < arr.length; i++) {
      const inner = fn(arr[i] as T, i);
      for (let j = 0; j < inner.length; j++) {
        result.push(inner[j] as U);
      }
    }
    return result;
  }) as TransducerFn<readonly T[], U[]>;

  // Attach transducer for pipe optimization
  exec[TRANSDUCER] = <R>(rf: Reducer<R, U>): Reducer<R, T> => {
    let i = 0;
    return (acc, x) => {
      const items = fn(x as T, i++);
      let result: R | Reduced<R> = acc;
      for (let j = 0; j < items.length; j++) {
        result = rf(unreduced(result), items[j] as U);
        if (isReduced(result)) break;
      }
      return result;
    };
  };

  return arr === undefined ? exec : exec(arr);
}

/**
 * Reverses an array (returns new array).
 * @example
 * ```ts
 * reverse([1, 2, 3]); // [3, 2, 1]
 * ```
 */
export function reverse<T>(arr: readonly T[]): T[] {
  // Native slice().reverse() is highly optimized by V8
  return arr.slice().reverse();
}

/**
 * Concatenates two arrays.
 * @example
 * ```ts
 * concat([3, 4])([1, 2]); // [1, 2, 3, 4]
 * concat([1, 2], [3, 4]); // [1, 2, 3, 4]
 * ```
 */
export function concat<T>(other: readonly T[]): (arr: readonly T[]) => T[];
export function concat<T>(arr: readonly T[], other: readonly T[]): T[];
export function concat<T>(arrOrOther: readonly T[], other?: readonly T[]) {
  if (other === undefined) {
    const toAppend = arrOrOther;
    return (arr: readonly T[]): T[] => {
      const len1 = arr.length;
      const len2 = toAppend.length;
      const result = new Array<T>(len1 + len2);
      for (let i = 0; i < len1; i++) result[i] = arr[i] as T;
      for (let i = 0; i < len2; i++) result[len1 + i] = toAppend[i] as T;
      return result;
    };
  }
  const arr = arrOrOther;
  const len1 = arr.length;
  const len2 = other.length;
  const result = new Array<T>(len1 + len2);
  for (let i = 0; i < len1; i++) result[i] = arr[i] as T;
  for (let i = 0; i < len2; i++) result[len1 + i] = other[i] as T;
  return result;
}

/**
 * Zips two arrays with a combining function.
 * @example
 * ```ts
 * zip([4, 5, 6], (a, b) => a + b)([1, 2, 3]); // [5, 7, 9]
 * zip([1, 2, 3], [4, 5, 6], (a, b) => a + b); // [5, 7, 9]
 * ```
 */
export function zip<T, U, R>(other: readonly U[], fn: (a: T, b: U) => R): (arr: readonly T[]) => R[];
export function zip<T, U, R>(arr: readonly T[], other: readonly U[], fn: (a: T, b: U) => R): R[];
export function zip<T, U, R>(
  arrOrOther: readonly T[] | readonly U[],
  otherOrFn: readonly U[] | ((a: T, b: U) => R),
  fn?: (a: T, b: U) => R
) {
  if (fn !== undefined) {
    // Direct execution path - pre-allocate for V8 optimization
    const arr = arrOrOther as readonly T[];
    const other = otherOrFn as readonly U[];
    const len = arr.length < other.length ? arr.length : other.length;
    const result = new Array<R>(len);
    for (let i = 0; i < len; i++) {
      result[i] = fn(arr[i]!, other[i]!);
    }
    return result;
  }
  // Curried path
  const other = arrOrOther as readonly U[];
  const resultFn = otherOrFn as (a: T, b: U) => R;
  return (arr: readonly T[]): R[] => {
    const len = arr.length < other.length ? arr.length : other.length;
    const result = new Array<R>(len);
    for (let i = 0; i < len; i++) {
      result[i] = resultFn(arr[i]!, other[i]!);
    }
    return result;
  };
}

/**
 * Splits array into chunks of specified size.
 * @example
 * ```ts
 * chunk(2)([1, 2, 3, 4, 5]); // [[1, 2], [3, 4], [5]]
 * chunk(2, [1, 2, 3, 4, 5]); // [[1, 2], [3, 4], [5]]
 * ```
 */
export function chunk<T>(size: number): (arr: readonly T[]) => T[][];
export function chunk<T>(size: number, arr: readonly T[]): T[][];
export function chunk<T>(size: number, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): T[][] => {
    if (size <= 0) return [];
    const len = arr.length;
    const numChunks = Math.ceil(len / size);
    const result = new Array<T[]>(numChunks);
    for (let i = 0; i < numChunks; i++) {
      const start = i * size;
      const end = start + size;
      result[i] = arr.slice(start, end > len ? len : end) as T[];
    }
    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Flattens nested arrays by one level.
 * @example
 * ```ts
 * flatten([[1, 2], [3, 4]]); // [1, 2, 3, 4]
 * ```
 */
export function flatten<T>(arr: readonly (readonly T[])[]): T[] {
  const result: T[] = [];
  for (let i = 0; i < arr.length; i++) {
    const inner = arr[i]!;
    for (let j = 0; j < inner.length; j++) {
      result.push(inner[j] as T);
    }
  }
  return result;
}

// ==================== Slicing Operations ====================

/**
 * Takes first n elements.
 * @example
 * ```ts
 * take(2)([1, 2, 3, 4]); // [1, 2]
 * take(2, [1, 2, 3, 4]); // [1, 2]
 * ```
 */
export function take<T>(n: number): (arr: readonly T[]) => T[];
export function take<T>(n: number, arr: readonly T[]): T[];
export function take<T>(n: number, arr?: readonly T[]) {
  const exec = ((arr: readonly T[]): T[] => arr.slice(0, n) as T[]) as TransducerFn<readonly T[], T[]>;

  // Attach transducer for pipe optimization (with early termination!)
  exec[TRANSDUCER] = <R>(rf: Reducer<R, T>): Reducer<R, T> => {
    let taken = 0;
    return (acc, x) => {
      if (taken >= n) return reduced(acc);
      taken++;
      const result = rf(acc, x as T);
      return taken >= n ? reduced(unreduced(result)) : result;
    };
  };

  return arr === undefined ? exec : exec(arr);
}

/**
 * Takes elements while predicate is true.
 * @example
 * ```ts
 * takeWhile((x: number) => x < 3)([1, 2, 3, 4]); // [1, 2]
 * ```
 */
export function takeWhile<T>(predicate: Predicate<T>): (arr: readonly T[]) => T[];
export function takeWhile<T>(predicate: Predicate<T>, arr: readonly T[]): T[];
export function takeWhile<T>(predicate: Predicate<T>, arr?: readonly T[]) {
  const exec = ((arr: readonly T[]): T[] => {
    const result: T[] = [];
    for (let i = 0; i < arr.length; i++) {
      if (!predicate(arr[i] as T, i)) break;
      result.push(arr[i] as T);
    }
    return result;
  }) as TransducerFn<readonly T[], T[]>;

  // Attach transducer for pipe optimization
  exec[TRANSDUCER] = <R>(rf: Reducer<R, T>): Reducer<R, T> => {
    let i = 0;
    let done = false;
    return (acc, x) => {
      if (done) return reduced(acc);
      if (!predicate(x as T, i++)) {
        done = true;
        return reduced(acc);
      }
      return rf(acc, x as T);
    };
  };

  return arr === undefined ? exec : exec(arr);
}

/**
 * Skips first n elements.
 * @example
 * ```ts
 * skip(2)([1, 2, 3, 4]); // [3, 4]
 * skip(2, [1, 2, 3, 4]); // [3, 4]
 * ```
 */
export function skip<T>(n: number): (arr: readonly T[]) => T[];
export function skip<T>(n: number, arr: readonly T[]): T[];
export function skip<T>(n: number, arr?: readonly T[]) {
  if (arr !== undefined) {
    // Direct execution - fastest path
    return arr.slice(n) as T[];
  }
  // Curried path with transducer support
  const exec = ((arr: readonly T[]): T[] => arr.slice(n) as T[]) as TransducerFn<readonly T[], T[]>;
  exec[TRANSDUCER] = <R>(rf: Reducer<R, T>): Reducer<R, T> => {
    let skipped = 0;
    return (acc, x) => {
      if (skipped < n) {
        skipped++;
        return acc;
      }
      return rf(acc, x as T);
    };
  };
  return exec;
}

/**
 * Skips elements while predicate is true.
 * @example
 * ```ts
 * skipWhile((x: number) => x < 3)([1, 2, 3, 4]); // [3, 4]
 * ```
 */
export function skipWhile<T>(predicate: Predicate<T>): (arr: readonly T[]) => T[];
export function skipWhile<T>(predicate: Predicate<T>, arr: readonly T[]): T[];
export function skipWhile<T>(predicate: Predicate<T>, arr?: readonly T[]) {
  const exec = ((arr: readonly T[]): T[] => {
    let startIndex = 0;
    for (let i = 0; i < arr.length; i++) {
      if (!predicate(arr[i] as T, i)) {
        startIndex = i;
        break;
      }
      startIndex = arr.length;
    }
    return arr.slice(startIndex) as T[];
  }) as TransducerFn<readonly T[], T[]>;

  // Attach transducer for pipe optimization
  exec[TRANSDUCER] = <R>(rf: Reducer<R, T>): Reducer<R, T> => {
    let i = 0;
    let skipping = true;
    return (acc, x) => {
      if (skipping) {
        if (predicate(x as T, i++)) return acc;
        skipping = false;
      }
      return rf(acc, x as T);
    };
  };

  return arr === undefined ? exec : exec(arr);
}

/**
 * Gets a slice of array.
 * @example
 * ```ts
 * slice(1, 3)([1, 2, 3, 4]); // [2, 3]
 * slice(1, 3, [1, 2, 3, 4]); // [2, 3]
 * ```
 */
export function slice<T>(start: number, end?: number): (arr: readonly T[]) => T[];
export function slice<T>(start: number, end: number | undefined, arr: readonly T[]): T[];
export function slice<T>(start: number, endOrArr?: number | readonly T[], arr?: readonly T[]) {
  if (arr === undefined && !Array.isArray(endOrArr)) {
    const end = endOrArr as number | undefined;
    return (arr: readonly T[]): T[] => arr.slice(start, end) as T[];
  }
  if (Array.isArray(endOrArr) && arr === undefined) {
    return endOrArr.slice(start) as T[];
  }
  return arr!.slice(start, endOrArr as number) as T[];
}

// ==================== Element Access ====================

/**
 * Gets the first element.
 * @example
 * ```ts
 * first([1, 2, 3]); // 1
 * first((x: number) => x > 2)([1, 2, 3, 4]); // 3
 * ```
 */
export function first<T>(arr: readonly T[]): T;
export function first<T>(predicate: Predicate<T>): (arr: readonly T[]) => T;
export function first<T>(predicate: Predicate<T>, arr: readonly T[]): T;
export function first<T>(arrOrPred: readonly T[] | Predicate<T>, arr?: readonly T[]) {
  if (Array.isArray(arrOrPred)) {
    if (arrOrPred.length === 0) throw new Error('Sequence contains no elements');
    return arrOrPred[0];
  }
  const predicate = arrOrPred as Predicate<T>;
  const exec = (arr: readonly T[]): T => {
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i] as T, i)) return arr[i] as T;
    }
    throw new Error('Sequence contains no matching element');
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Gets the first element or a default value.
 * @example
 * ```ts
 * firstOr(0)([]);  // 0
 * firstOr(0)([1, 2, 3]); // 1
 * firstOr(0, (x: number) => x > 5)([1, 2, 3]); // 0
 * ```
 */
export function firstOr<T>(defaultValue: T): (arr: readonly T[]) => T;
export function firstOr<T>(defaultValue: T, predicate: Predicate<T>): (arr: readonly T[]) => T;
export function firstOr<T>(defaultValue: T, predicate: Predicate<T>, arr: readonly T[]): T;
export function firstOr<T>(defaultValue: T, predicateOrArr?: Predicate<T> | readonly T[], arr?: readonly T[]) {
  if (predicateOrArr === undefined) {
    return (arr: readonly T[]): T => arr.length === 0 ? defaultValue : arr[0] as T;
  }
  if (Array.isArray(predicateOrArr)) {
    return predicateOrArr.length === 0 ? defaultValue : predicateOrArr[0] as T;
  }
  const predicate = predicateOrArr as Predicate<T>;
  const exec = (arr: readonly T[]): T => {
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i] as T, i)) return arr[i] as T;
    }
    return defaultValue;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Gets the last element.
 * @example
 * ```ts
 * last([1, 2, 3]); // 3
 * ```
 */
export function last<T>(arr: readonly T[]): T;
export function last<T>(predicate: Predicate<T>): (arr: readonly T[]) => T;
export function last<T>(predicate: Predicate<T>, arr: readonly T[]): T;
export function last<T>(arrOrPred: readonly T[] | Predicate<T>, arr?: readonly T[]) {
  // Fast path: check length property (faster than Array.isArray)
  if (typeof (arrOrPred as readonly T[]).length === 'number' && typeof arrOrPred !== 'function') {
    const a = arrOrPred as readonly T[];
    if (a.length === 0) throw new Error('Sequence contains no elements');
    return a[a.length - 1]!;
  }
  const predicate = arrOrPred as Predicate<T>;
  if (arr !== undefined) {
    // Direct execution with predicate
    for (let i = arr.length - 1; i >= 0; i--) {
      if (predicate(arr[i]!, i)) return arr[i]!;
    }
    throw new Error('Sequence contains no matching element');
  }
  // Curried path
  return (arr: readonly T[]): T => {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (predicate(arr[i]!, i)) return arr[i]!;
    }
    throw new Error('Sequence contains no matching element');
  };
}

/**
 * Gets the last element or a default value.
 * @example
 * ```ts
 * lastOr(0)([]); // 0
 * lastOr(0)([1, 2, 3]); // 3
 * ```
 */
export function lastOr<T>(defaultValue: T): (arr: readonly T[]) => T;
export function lastOr<T>(defaultValue: T, predicate: Predicate<T>): (arr: readonly T[]) => T;
export function lastOr<T>(defaultValue: T, predicate: Predicate<T>, arr: readonly T[]): T;
export function lastOr<T>(defaultValue: T, predicateOrArr?: Predicate<T> | readonly T[], arr?: readonly T[]) {
  if (predicateOrArr === undefined) {
    return (arr: readonly T[]): T => arr.length === 0 ? defaultValue : arr[arr.length - 1] as T;
  }
  if (Array.isArray(predicateOrArr)) {
    return predicateOrArr.length === 0 ? defaultValue : predicateOrArr[predicateOrArr.length - 1] as T;
  }
  const predicate = predicateOrArr as Predicate<T>;
  const exec = (arr: readonly T[]): T => {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (predicate(arr[i] as T, i)) return arr[i] as T;
    }
    return defaultValue;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Gets element at index (supports negative indices).
 * @example
 * ```ts
 * at(1)([1, 2, 3]); // 2
 * at(-1)([1, 2, 3]); // 3
 * at(1, [1, 2, 3]); // 2
 * ```
 */
export function at<T>(index: number): (arr: readonly T[]) => T | undefined;
export function at<T>(index: number, arr: readonly T[]): T | undefined;
export function at<T>(index: number, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): T | undefined => {
    const idx = index < 0 ? arr.length + index : index;
    return arr[idx] as T | undefined;
  };
  return arr === undefined ? exec : exec(arr);
}

// ==================== Search Operations ====================

/**
 * Finds the first element matching predicate.
 * @example
 * ```ts
 * find((x: number) => x > 2)([1, 2, 3, 4]); // 3
 * find((x: number) => x > 2, [1, 2, 3, 4]); // 3
 * ```
 */
export function find<T>(predicate: Predicate<T>): (arr: readonly T[]) => T | undefined;
export function find<T>(predicate: Predicate<T>, arr: readonly T[]): T | undefined;
export function find<T>(predicate: Predicate<T>, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): T | undefined => {
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i] as T, i)) return arr[i] as T;
    }
    return undefined;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Finds the index of the first element matching predicate.
 * @example
 * ```ts
 * findIndex((x: number) => x > 2)([1, 2, 3, 4]); // 2
 * findIndex((x: number) => x > 2, [1, 2, 3, 4]); // 2
 * ```
 */
export function findIndex<T>(predicate: Predicate<T>): (arr: readonly T[]) => number;
export function findIndex<T>(predicate: Predicate<T>, arr: readonly T[]): number;
export function findIndex<T>(predicate: Predicate<T>, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): number => {
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i] as T, i)) return i;
    }
    return -1;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Finds the index of a value.
 * @example
 * ```ts
 * indexOf(3)([1, 2, 3, 4]); // 2
 * indexOf(3, [1, 2, 3, 4]); // 2
 * ```
 */
export function indexOf<T>(value: T): (arr: readonly T[]) => number;
export function indexOf<T>(value: T, arr: readonly T[]): number;
export function indexOf<T>(value: T, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): number => {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === value) return i;
    }
    return -1;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Finds the last index of a value.
 * @example
 * ```ts
 * lastIndexOf(2)([1, 2, 3, 2]); // 3
 * lastIndexOf(2, [1, 2, 3, 2]); // 3
 * ```
 */
export function lastIndexOf<T>(value: T): (arr: readonly T[]) => number;
export function lastIndexOf<T>(value: T, arr: readonly T[]): number;
export function lastIndexOf<T>(value: T, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): number => {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i] === value) return i;
    }
    return -1;
  };
  return arr === undefined ? exec : exec(arr);
}

// ==================== Boolean Operations ====================

/**
 * Tests if all elements match predicate.
 * @example
 * ```ts
 * every((x: number) => x > 0)([1, 2, 3]); // true
 * every((x: number) => x > 0, [1, 2, 3]); // true
 * ```
 */
export function every<T>(predicate: Predicate<T>): (arr: readonly T[]) => boolean;
export function every<T>(predicate: Predicate<T>, arr: readonly T[]): boolean;
export function every<T>(predicate: Predicate<T>, arr?: readonly T[]) {
  // Check if predicate uses index (length check for optimization)
  const useIndex = predicate.length > 1;
  if (arr !== undefined) {
    // Direct execution path - for loop matches V8's fast path
    if (useIndex) {
      for (let i = 0, len = arr.length; i < len; i++) {
        if (!predicate(arr[i]!, i)) return false;
      }
    } else {
      // Fast path: predicate doesn't use index
      for (let i = 0, len = arr.length; i < len; i++) {
        if (!(predicate as (value: T) => boolean)(arr[i]!)) return false;
      }
    }
    return true;
  }
  // Curried path - create specialized closure
  if (useIndex) {
    return (arr: readonly T[]): boolean => {
      for (let i = 0, len = arr.length; i < len; i++) {
        if (!predicate(arr[i]!, i)) return false;
      }
      return true;
    };
  }
  // Fast path: predicate doesn't use index
  return (arr: readonly T[]): boolean => {
    const fn = predicate as (value: T) => boolean;
    for (let i = 0, len = arr.length; i < len; i++) {
      if (!fn(arr[i]!)) return false;
    }
    return true;
  };
}

/**
 * Tests if any element matches predicate.
 * @example
 * ```ts
 * some((x: number) => x > 2)([1, 2, 3]); // true
 * some((x: number) => x > 2, [1, 2, 3]); // true
 * ```
 */
export function some<T>(predicate: Predicate<T>): (arr: readonly T[]) => boolean;
export function some<T>(predicate: Predicate<T>, arr: readonly T[]): boolean;
export function some<T>(predicate: Predicate<T>, arr?: readonly T[]) {
  // Check if predicate uses index (length check for optimization)
  const useIndex = predicate.length > 1;
  if (arr !== undefined) {
    // Direct execution path - for loop matches V8's fast path
    if (useIndex) {
      for (let i = 0, len = arr.length; i < len; i++) {
        if (predicate(arr[i]!, i)) return true;
      }
    } else {
      // Fast path: predicate doesn't use index
      for (let i = 0, len = arr.length; i < len; i++) {
        if ((predicate as (value: T) => boolean)(arr[i]!)) return true;
      }
    }
    return false;
  }
  // Curried path - create specialized closure
  if (useIndex) {
    return (arr: readonly T[]): boolean => {
      for (let i = 0, len = arr.length; i < len; i++) {
        if (predicate(arr[i]!, i)) return true;
      }
      return false;
    };
  }
  // Fast path: predicate doesn't use index
  return (arr: readonly T[]): boolean => {
    const fn = predicate as (value: T) => boolean;
    for (let i = 0, len = arr.length; i < len; i++) {
      if (fn(arr[i]!)) return true;
    }
    return false;
  };
}

/**
 * Tests if array contains a value.
 * @example
 * ```ts
 * includes(2)([1, 2, 3]); // true
 * includes(2, [1, 2, 3]); // true
 * ```
 */
export function includes<T>(value: T): (arr: readonly T[]) => boolean;
export function includes<T>(value: T, arr: readonly T[]): boolean;
export function includes<T>(value: T, arr?: readonly T[]) {
  if (arr !== undefined) {
    // Direct execution path - native includes is fastest
    return (arr as T[]).includes(value);
  }
  // Curried path
  return (arr: readonly T[]): boolean => (arr as T[]).includes(value);
}

/**
 * Tests if array is empty.
 * @example
 * ```ts
 * isEmpty([]); // true
 * isEmpty([1]); // false
 * ```
 */
export function isEmpty<T>(arr: readonly T[]): boolean {
  return arr.length === 0;
}

// ==================== Aggregation Operations ====================

/**
 * Counts elements (optionally matching predicate).
 * @example
 * ```ts
 * count([1, 2, 3]); // 3
 * count((x: number) => x > 1)([1, 2, 3]); // 2
 * count((x: number) => x > 1, [1, 2, 3]); // 2
 * ```
 */
export function count<T>(arr: readonly T[]): number;
export function count<T>(predicate: Predicate<T>): (arr: readonly T[]) => number;
export function count<T>(predicate: Predicate<T>, arr: readonly T[]): number;
export function count<T>(arrOrPred: readonly T[] | Predicate<T>, arr?: readonly T[]) {
  if (Array.isArray(arrOrPred)) {
    return arrOrPred.length;
  }
  const predicate = arrOrPred as Predicate<T>;
  const exec = (arr: readonly T[]): number => {
    let c = 0;
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i] as T, i)) c++;
    }
    return c;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Sums numeric array or selected values.
 * @example
 * ```ts
 * sum([1, 2, 3]); // 6
 * sum((x: {v: number}) => x.v)([{v: 1}, {v: 2}]); // 3
 * ```
 */
export function sum(arr: readonly number[]): number;
export function sum<T>(selector: Selector<T, number>): (arr: readonly T[]) => number;
export function sum<T>(selector: Selector<T, number>, arr: readonly T[]): number;
export function sum<T>(arrOrSelector: readonly number[] | Selector<T, number>, arr?: readonly T[]) {
  if (Array.isArray(arrOrSelector)) {
    let total = 0;
    for (let i = 0; i < arrOrSelector.length; i++) {
      total += arrOrSelector[i]!;
    }
    return total;
  }
  const selector = arrOrSelector as Selector<T, number>;
  const exec = (arr: readonly T[]): number => {
    let total = 0;
    for (let i = 0; i < arr.length; i++) {
      total += selector(arr[i] as T, i);
    }
    return total;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Averages numeric array or selected values.
 * @example
 * ```ts
 * average([1, 2, 3]); // 2
 * average((x: {v: number}) => x.v)([{v: 1}, {v: 2}, {v: 3}]); // 2
 * ```
 */
export function average(arr: readonly number[]): number;
export function average<T>(selector: Selector<T, number>): (arr: readonly T[]) => number;
export function average<T>(selector: Selector<T, number>, arr: readonly T[]): number;
export function average<T>(arrOrSelector: readonly number[] | Selector<T, number>, arr?: readonly T[]) {
  if (Array.isArray(arrOrSelector)) {
    if (arrOrSelector.length === 0) throw new Error('Sequence contains no elements');
    let total = 0;
    for (let i = 0; i < arrOrSelector.length; i++) {
      total += arrOrSelector[i]!;
    }
    return total / arrOrSelector.length;
  }
  const selector = arrOrSelector as Selector<T, number>;
  const exec = (arr: readonly T[]): number => {
    if (arr.length === 0) throw new Error('Sequence contains no elements');
    let total = 0;
    for (let i = 0; i < arr.length; i++) {
      total += selector(arr[i] as T, i);
    }
    return total / arr.length;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Gets minimum value.
 * @example
 * ```ts
 * min([3, 1, 2]); // 1
 * min((x: {v: number}) => x.v)([{v: 3}, {v: 1}]); // 1
 * ```
 */
export function min(arr: readonly number[]): number;
export function min<T>(selector: Selector<T, number>): (arr: readonly T[]) => number;
export function min<T>(selector: Selector<T, number>, arr: readonly T[]): number;
export function min<T>(arrOrSelector: readonly number[] | Selector<T, number>, arr?: readonly T[]) {
  if (Array.isArray(arrOrSelector)) {
    if (arrOrSelector.length === 0) throw new Error('Sequence contains no elements');
    let m = arrOrSelector[0]!;
    for (let i = 1; i < arrOrSelector.length; i++) {
      if (arrOrSelector[i]! < m) m = arrOrSelector[i]!;
    }
    return m;
  }
  const selector = arrOrSelector as Selector<T, number>;
  const exec = (arr: readonly T[]): number => {
    if (arr.length === 0) throw new Error('Sequence contains no elements');
    let m = selector(arr[0] as T, 0);
    for (let i = 1; i < arr.length; i++) {
      const v = selector(arr[i] as T, i);
      if (v < m) m = v;
    }
    return m;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Gets maximum value.
 * @example
 * ```ts
 * max([1, 3, 2]); // 3
 * max((x: {v: number}) => x.v)([{v: 1}, {v: 3}]); // 3
 * ```
 */
export function max(arr: readonly number[]): number;
export function max<T>(selector: Selector<T, number>): (arr: readonly T[]) => number;
export function max<T>(selector: Selector<T, number>, arr: readonly T[]): number;
export function max<T>(arrOrSelector: readonly number[] | Selector<T, number>, arr?: readonly T[]) {
  if (Array.isArray(arrOrSelector)) {
    if (arrOrSelector.length === 0) throw new Error('Sequence contains no elements');
    let m = arrOrSelector[0]!;
    for (let i = 1; i < arrOrSelector.length; i++) {
      if (arrOrSelector[i]! > m) m = arrOrSelector[i]!;
    }
    return m;
  }
  const selector = arrOrSelector as Selector<T, number>;
  const exec = (arr: readonly T[]): number => {
    if (arr.length === 0) throw new Error('Sequence contains no elements');
    let m = selector(arr[0] as T, 0);
    for (let i = 1; i < arr.length; i++) {
      const v = selector(arr[i] as T, i);
      if (v > m) m = v;
    }
    return m;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Gets element with minimum value by selector.
 * @example
 * ```ts
 * minBy((x: {v: number}) => x.v)([{v: 3}, {v: 1}]); // {v: 1}
 * ```
 */
export function minBy<T>(selector: Selector<T, number>): (arr: readonly T[]) => T;
export function minBy<T>(selector: Selector<T, number>, arr: readonly T[]): T;
export function minBy<T>(selector: Selector<T, number>, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): T => {
    if (arr.length === 0) throw new Error('Sequence contains no elements');
    let minItem = arr[0] as T;
    let minVal = selector(minItem, 0);
    for (let i = 1; i < arr.length; i++) {
      const v = selector(arr[i] as T, i);
      if (v < minVal) {
        minVal = v;
        minItem = arr[i] as T;
      }
    }
    return minItem;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Gets element with maximum value by selector.
 * @example
 * ```ts
 * maxBy((x: {v: number}) => x.v)([{v: 1}, {v: 3}]); // {v: 3}
 * ```
 */
export function maxBy<T>(selector: Selector<T, number>): (arr: readonly T[]) => T;
export function maxBy<T>(selector: Selector<T, number>, arr: readonly T[]): T;
export function maxBy<T>(selector: Selector<T, number>, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): T => {
    if (arr.length === 0) throw new Error('Sequence contains no elements');
    let maxItem = arr[0] as T;
    let maxVal = selector(maxItem, 0);
    for (let i = 1; i < arr.length; i++) {
      const v = selector(arr[i] as T, i);
      if (v > maxVal) {
        maxVal = v;
        maxItem = arr[i] as T;
      }
    }
    return maxItem;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Reduces array to single value.
 * @example
 * ```ts
 * reduce((acc, x) => acc + x, 0)([1, 2, 3]); // 6
 * reduce((acc, x) => acc + x, 0, [1, 2, 3]); // 6
 * ```
 */
export function reduce<T, R>(fn: (acc: R, value: T, index: number) => R, initial: R): (arr: readonly T[]) => R;
export function reduce<T, R>(fn: (acc: R, value: T, index: number) => R, initial: R, arr: readonly T[]): R;
export function reduce<T, R>(fn: (acc: R, value: T, index: number) => R, initial: R, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): R => {
    let acc = initial;
    for (let i = 0; i < arr.length; i++) {
      acc = fn(acc, arr[i] as T, i);
    }
    return acc;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Reduces array from right to left.
 * @example
 * ```ts
 * reduceRight((acc, x) => acc + x, '')(['a', 'b', 'c']); // 'cba'
 * ```
 */
export function reduceRight<T, R>(fn: (acc: R, value: T, index: number) => R, initial: R): (arr: readonly T[]) => R;
export function reduceRight<T, R>(fn: (acc: R, value: T, index: number) => R, initial: R, arr: readonly T[]): R;
export function reduceRight<T, R>(fn: (acc: R, value: T, index: number) => R, initial: R, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): R => {
    let acc = initial;
    for (let i = arr.length - 1; i >= 0; i--) {
      acc = fn(acc, arr[i] as T, i);
    }
    return acc;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Cumulative reduce that returns all intermediate values.
 * @example
 * ```ts
 * scan((acc, x) => acc + x, 0)([1, 2, 3, 4]); // [0, 1, 3, 6, 10]
 * scan((acc, x) => acc + x, 0, [1, 2, 3, 4]); // [0, 1, 3, 6, 10]
 * ```
 */
export function scan<T, R>(fn: (acc: R, value: T, index: number) => R, initial: R): (arr: readonly T[]) => R[];
export function scan<T, R>(fn: (acc: R, value: T, index: number) => R, initial: R, arr: readonly T[]): R[];
export function scan<T, R>(fn: (acc: R, value: T, index: number) => R, initial: R, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): R[] => {
    const result: R[] = [initial];
    let acc = initial;
    for (let i = 0; i < arr.length; i++) {
      acc = fn(acc, arr[i] as T, i);
      result.push(acc);
    }
    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

// ==================== Grouping Operations ====================

/**
 * Groups elements by key.
 * @example
 * ```ts
 * groupBy((x: {type: string}) => x.type)([{type: 'a', v: 1}, {type: 'b', v: 2}, {type: 'a', v: 3}]);
 * // { a: [{type: 'a', v: 1}, {type: 'a', v: 3}], b: [{type: 'b', v: 2}] }
 * ```
 */
export function groupBy<T, K extends string | number | symbol>(keyFn: (value: T) => K): (arr: readonly T[]) => Record<K, T[]>;
export function groupBy<T, K extends string | number | symbol>(keyFn: (value: T) => K, arr: readonly T[]): Record<K, T[]>;
export function groupBy<T, K extends string | number | symbol>(keyFn: (value: T) => K, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): Record<K, T[]> => {
    const result = {} as Record<K, T[]>;
    for (let i = 0; i < arr.length; i++) {
      const key = keyFn(arr[i] as T);
      if (!result[key]) result[key] = [];
      result[key].push(arr[i] as T);
    }
    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Creates a Map grouped by key.
 * @example
 * ```ts
 * groupByMap((x: {type: string}) => x.type)([{type: 'a', v: 1}, {type: 'a', v: 2}]);
 * // Map { 'a' => [{type: 'a', v: 1}, {type: 'a', v: 2}] }
 * ```
 */
export function groupByMap<T, K>(keyFn: (value: T) => K): (arr: readonly T[]) => Map<K, T[]>;
export function groupByMap<T, K>(keyFn: (value: T) => K, arr: readonly T[]): Map<K, T[]>;
export function groupByMap<T, K>(keyFn: (value: T) => K, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): Map<K, T[]> => {
    const result = new Map<K, T[]>();
    for (let i = 0; i < arr.length; i++) {
      const key = keyFn(arr[i] as T);
      let group = result.get(key);
      if (!group) {
        group = [];
        result.set(key, group);
      }
      group.push(arr[i] as T);
    }
    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Creates a lookup object (key -> single value).
 * @example
 * ```ts
 * keyBy((x: {id: number}) => x.id)([{id: 1, name: 'a'}, {id: 2, name: 'b'}]);
 * // { 1: {id: 1, name: 'a'}, 2: {id: 2, name: 'b'} }
 * ```
 */
export function keyBy<T, K extends string | number | symbol>(keyFn: (value: T) => K): (arr: readonly T[]) => Record<K, T>;
export function keyBy<T, K extends string | number | symbol>(keyFn: (value: T) => K, arr: readonly T[]): Record<K, T>;
export function keyBy<T, K extends string | number | symbol>(keyFn: (value: T) => K, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): Record<K, T> => {
    const result = {} as Record<K, T>;
    for (let i = 0; i < arr.length; i++) {
      const key = keyFn(arr[i] as T);
      result[key] = arr[i] as T;
    }
    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Partitions array into two based on predicate.
 * @example
 * ```ts
 * partition((x: number) => x % 2 === 0)([1, 2, 3, 4]);
 * // [[2, 4], [1, 3]]
 * ```
 */
export function partition<T>(predicate: Predicate<T>): (arr: readonly T[]) => [T[], T[]];
export function partition<T>(predicate: Predicate<T>, arr: readonly T[]): [T[], T[]];
export function partition<T>(predicate: Predicate<T>, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): [T[], T[]] => {
    const pass: T[] = [];
    const fail: T[] = [];
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i] as T, i)) {
        pass.push(arr[i] as T);
      } else {
        fail.push(arr[i] as T);
      }
    }
    return [pass, fail];
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Groups by key and aggregates each group.
 * @example
 * ```ts
 * aggregateBy(
 *   (x: {dept: string, salary: number}) => x.dept,
 *   () => ({ total: 0, count: 0 }),
 *   (acc, x) => ({ total: acc.total + x.salary, count: acc.count + 1 })
 * )([
 *   {dept: 'eng', salary: 100},
 *   {dept: 'eng', salary: 150},
 *   {dept: 'sales', salary: 80}
 * ]);
 * // Map { 'eng' => {total: 250, count: 2}, 'sales' => {total: 80, count: 1} }
 * ```
 */
export function aggregateBy<T, K, R>(
  keyFn: (value: T) => K,
  seed: () => R,
  reducer: (acc: R, value: T) => R
): (arr: readonly T[]) => Map<K, R>;
export function aggregateBy<T, K, R>(
  keyFn: (value: T) => K,
  seed: () => R,
  reducer: (acc: R, value: T) => R,
  arr: readonly T[]
): Map<K, R>;
export function aggregateBy<T, K, R>(
  keyFn: (value: T) => K,
  seed: () => R,
  reducer: (acc: R, value: T) => R,
  arr?: readonly T[]
) {
  const exec = (arr: readonly T[]): Map<K, R> => {
    const result = new Map<K, R>();
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i] as T;
      const key = keyFn(item);
      let acc = result.get(key);
      if (acc === undefined) {
        acc = seed();
      }
      result.set(key, reducer(acc, item));
    }
    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

// ==================== Set Operations ====================

/**
 * Returns unique elements.
 * @example
 * ```ts
 * distinct([1, 2, 2, 3, 1]); // [1, 2, 3]
 * distinct((x: {id: number}) => x.id)([{id: 1}, {id: 2}, {id: 1}]); // [{id: 1}, {id: 2}]
 * ```
 */
export function distinct<T>(arr: readonly T[]): T[];
export function distinct<T, K>(keyFn: (value: T) => K): (arr: readonly T[]) => T[];
export function distinct<T, K>(keyFn: (value: T) => K, arr: readonly T[]): T[];
export function distinct<T, K>(arrOrKeyFn: readonly T[] | ((value: T) => K), arr?: readonly T[]) {
  if (Array.isArray(arrOrKeyFn)) {
    const seen = new Set<T>();
    const result: T[] = [];
    for (let i = 0; i < arrOrKeyFn.length; i++) {
      const item = arrOrKeyFn[i] as T;
      if (!seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    }
    return result;
  }
  const keyFn = arrOrKeyFn as (value: T) => K;
  const exec = ((arr: readonly T[]): T[] => {
    const seen = new Set<K>();
    const result: T[] = [];
    for (let i = 0; i < arr.length; i++) {
      const key = keyFn(arr[i] as T);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(arr[i] as T);
      }
    }
    return result;
  }) as TransducerFn<readonly T[], T[]>;

  // Attach transducer for pipe optimization
  exec[TRANSDUCER] = <R>(rf: Reducer<R, T>): Reducer<R, T> => {
    const seen = new Set<K>();
    return (acc, x) => {
      const key = keyFn(x as T);
      if (seen.has(key)) return acc;
      seen.add(key);
      return rf(acc, x as T);
    };
  };

  return arr === undefined ? exec : exec(arr);
}

/**
 * Returns elements in first array but not in second.
 * @example
 * ```ts
 * difference([3, 4, 5])([1, 2, 3, 4]); // [1, 2]
 * difference([1, 2, 3], [2, 3, 4]); // [1]
 * ```
 */
export function difference<T>(other: readonly T[]): (arr: readonly T[]) => T[];
export function difference<T>(arr: readonly T[], other: readonly T[]): T[];
export function difference<T>(arrOrOther: readonly T[], other?: readonly T[]) {
  if (other === undefined) {
    const exclude = new Set(arrOrOther);
    return (arr: readonly T[]): T[] => {
      const result: T[] = [];
      for (let i = 0; i < arr.length; i++) {
        if (!exclude.has(arr[i] as T)) result.push(arr[i] as T);
      }
      return result;
    };
  }
  const exclude = new Set(other);
  const result: T[] = [];
  for (let i = 0; i < arrOrOther.length; i++) {
    if (!exclude.has(arrOrOther[i] as T)) result.push(arrOrOther[i] as T);
  }
  return result;
}

/**
 * Returns elements present in both arrays.
 * @example
 * ```ts
 * intersection([2, 3, 4])([1, 2, 3]); // [2, 3]
 * intersection([1, 2, 3], [2, 3, 4]); // [2, 3]
 * ```
 */
export function intersection<T>(other: readonly T[]): (arr: readonly T[]) => T[];
export function intersection<T>(arr: readonly T[], other: readonly T[]): T[];
export function intersection<T>(arrOrOther: readonly T[], other?: readonly T[]) {
  if (other === undefined) {
    const include = new Set(arrOrOther);
    return (arr: readonly T[]): T[] => {
      const result: T[] = [];
      const seen = new Set<T>();
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i] as T;
        if (include.has(item) && !seen.has(item)) {
          seen.add(item);
          result.push(item);
        }
      }
      return result;
    };
  }
  const include = new Set(other);
  const seen = new Set<T>();
  const result: T[] = [];
  for (let i = 0; i < arrOrOther.length; i++) {
    const item = arrOrOther[i] as T;
    if (include.has(item) && !seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

/**
 * Returns unique elements from both arrays.
 * @example
 * ```ts
 * union([3, 4, 5])([1, 2, 3]); // [1, 2, 3, 4, 5]
 * union([1, 2, 3], [3, 4, 5]); // [1, 2, 3, 4, 5]
 * ```
 */
export function union<T>(other: readonly T[]): (arr: readonly T[]) => T[];
export function union<T>(arr: readonly T[], other: readonly T[]): T[];
export function union<T>(arrOrOther: readonly T[], other?: readonly T[]) {
  if (other === undefined) {
    return (arr: readonly T[]): T[] => {
      const seen = new Set<T>();
      const result: T[] = [];
      for (let i = 0; i < arr.length; i++) {
        const item = arr[i] as T;
        if (!seen.has(item)) {
          seen.add(item);
          result.push(item);
        }
      }
      for (let i = 0; i < arrOrOther.length; i++) {
        const item = arrOrOther[i] as T;
        if (!seen.has(item)) {
          seen.add(item);
          result.push(item);
        }
      }
      return result;
    };
  }
  const seen = new Set<T>();
  const result: T[] = [];
  for (let i = 0; i < arrOrOther.length; i++) {
    const item = arrOrOther[i] as T;
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  for (let i = 0; i < other.length; i++) {
    const item = other[i] as T;
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

/**
 * Returns elements from first array not in second, compared by key.
 * @example
 * ```ts
 * differenceBy((x: {id: number}) => x.id)([{id: 3}])([{id: 1}, {id: 2}, {id: 3}]);
 * // [{id: 1}, {id: 2}]
 * ```
 */
export function differenceBy<T, K>(keyFn: (value: T) => K): (other: readonly T[]) => (arr: readonly T[]) => T[];
export function differenceBy<T, K>(keyFn: (value: T) => K, other: readonly T[]): (arr: readonly T[]) => T[];
export function differenceBy<T, K>(keyFn: (value: T) => K, other: readonly T[], arr: readonly T[]): T[];
export function differenceBy<T, K>(keyFn: (value: T) => K, other?: readonly T[], arr?: readonly T[]) {
  const impl = (arr: readonly T[], other: readonly T[]): T[] => {
    const otherKeys = new Set<K>();
    for (let i = 0; i < other.length; i++) {
      otherKeys.add(keyFn(other[i] as T));
    }
    const result: T[] = [];
    const seenKeys = new Set<K>();
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i] as T;
      const key = keyFn(item);
      if (!otherKeys.has(key) && !seenKeys.has(key)) {
        seenKeys.add(key);
        result.push(item);
      }
    }
    return result;
  };

  if (arr !== undefined) {
    return impl(arr, other!);
  }
  if (other !== undefined) {
    return (arr: readonly T[]) => impl(arr, other);
  }
  return (other: readonly T[]) => (arr: readonly T[]) => impl(arr, other);
}

/**
 * Alias for differenceBy.
 */
export const exceptBy = differenceBy;

/**
 * Returns elements present in both arrays, compared by key.
 * @example
 * ```ts
 * intersectionBy((x: {id: number}) => x.id)([{id: 2}, {id: 3}])([{id: 1}, {id: 2}, {id: 3}]);
 * // [{id: 2}, {id: 3}]
 * ```
 */
export function intersectionBy<T, K>(keyFn: (value: T) => K): (other: readonly T[]) => (arr: readonly T[]) => T[];
export function intersectionBy<T, K>(keyFn: (value: T) => K, other: readonly T[]): (arr: readonly T[]) => T[];
export function intersectionBy<T, K>(keyFn: (value: T) => K, other: readonly T[], arr: readonly T[]): T[];
export function intersectionBy<T, K>(keyFn: (value: T) => K, other?: readonly T[], arr?: readonly T[]) {
  const impl = (arr: readonly T[], other: readonly T[]): T[] => {
    const otherKeys = new Set<K>();
    for (let i = 0; i < other.length; i++) {
      otherKeys.add(keyFn(other[i] as T));
    }
    const result: T[] = [];
    const seenKeys = new Set<K>();
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i] as T;
      const key = keyFn(item);
      if (otherKeys.has(key) && !seenKeys.has(key)) {
        seenKeys.add(key);
        result.push(item);
      }
    }
    return result;
  };

  if (arr !== undefined) {
    return impl(arr, other!);
  }
  if (other !== undefined) {
    return (arr: readonly T[]) => impl(arr, other);
  }
  return (other: readonly T[]) => (arr: readonly T[]) => impl(arr, other);
}

/**
 * Returns unique elements from both arrays, compared by key.
 * @example
 * ```ts
 * unionBy((x: {id: number}) => x.id)([{id: 2}, {id: 3}])([{id: 1}, {id: 2}]);
 * // [{id: 1}, {id: 2}, {id: 3}]
 * ```
 */
export function unionBy<T, K>(keyFn: (value: T) => K): (other: readonly T[]) => (arr: readonly T[]) => T[];
export function unionBy<T, K>(keyFn: (value: T) => K, other: readonly T[]): (arr: readonly T[]) => T[];
export function unionBy<T, K>(keyFn: (value: T) => K, other: readonly T[], arr: readonly T[]): T[];
export function unionBy<T, K>(keyFn: (value: T) => K, other?: readonly T[], arr?: readonly T[]) {
  const impl = (arr: readonly T[], other: readonly T[]): T[] => {
    const seenKeys = new Set<K>();
    const result: T[] = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i] as T;
      const key = keyFn(item);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        result.push(item);
      }
    }
    for (let i = 0; i < other.length; i++) {
      const item = other[i] as T;
      const key = keyFn(item);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        result.push(item);
      }
    }
    return result;
  };

  if (arr !== undefined) {
    return impl(arr, other!);
  }
  if (other !== undefined) {
    return (arr: readonly T[]) => impl(arr, other);
  }
  return (other: readonly T[]) => (arr: readonly T[]) => impl(arr, other);
}

// ==================== Join Operations ====================

/**
 * Builds a lookup map for efficient key-based access.
 */
function buildJoinLookup<T, K>(items: readonly T[], keyFn: (value: T) => K): Map<K, T[]> {
  const lookup = new Map<K, T[]>();
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as T;
    const key = keyFn(item);
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
 * Inner join - returns results where keys exist in both arrays.
 * @example
 * ```ts
 * const users = [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}];
 * const orders = [{userId: 1, product: 'Book'}, {userId: 1, product: 'Pen'}];
 * innerJoin(orders, u => u.id, o => o.userId, (u, o) => ({...u, ...o}))(users);
 * // [{id: 1, name: 'Alice', userId: 1, product: 'Book'}, {id: 1, name: 'Alice', userId: 1, product: 'Pen'}]
 * ```
 */
export function innerJoin<T, I, K, R>(
  inner: readonly I[],
  outerKeyFn: (value: T) => K,
  innerKeyFn: (value: I) => K,
  resultFn: (outer: T, inner: I) => R
): (arr: readonly T[]) => R[];
export function innerJoin<T, I, K, R>(
  outer: readonly T[],
  inner: readonly I[],
  outerKeyFn: (value: T) => K,
  innerKeyFn: (value: I) => K,
  resultFn: (outer: T, inner: I) => R
): R[];
export function innerJoin<T, I, K, R>(
  outerOrInner: readonly T[] | readonly I[],
  innerOrOuterKeyFn: readonly I[] | ((value: T) => K),
  outerKeyFnOrInnerKeyFn: ((value: T) => K) | ((value: I) => K),
  innerKeyFnOrResultFn: ((value: I) => K) | ((outer: T, inner: I) => R),
  resultFn?: (outer: T, inner: I) => R
) {
  if (resultFn !== undefined) {
    // Direct execution: innerJoin(outer, inner, outerKeyFn, innerKeyFn, resultFn)
    const outer = outerOrInner as readonly T[];
    const inner = innerOrOuterKeyFn as readonly I[];
    const outerKeyFn = outerKeyFnOrInnerKeyFn as (value: T) => K;
    const innerKeyFn = innerKeyFnOrResultFn as (value: I) => K;

    const innerLookup = buildJoinLookup(inner, innerKeyFn);
    const result: R[] = [];

    for (let i = 0; i < outer.length; i++) {
      const outerItem = outer[i] as T;
      const key = outerKeyFn(outerItem);
      const matches = innerLookup.get(key);
      if (matches) {
        for (let j = 0; j < matches.length; j++) {
          result.push(resultFn(outerItem, matches[j]!));
        }
      }
    }
    return result;
  }

  // Curried: innerJoin(inner, outerKeyFn, innerKeyFn, resultFn)(outer)
  const inner = outerOrInner as readonly I[];
  const outerKeyFn = innerOrOuterKeyFn as (value: T) => K;
  const innerKeyFn = outerKeyFnOrInnerKeyFn as (value: I) => K;
  const resFn = innerKeyFnOrResultFn as (outer: T, inner: I) => R;

  return (outer: readonly T[]): R[] => {
    const innerLookup = buildJoinLookup(inner, innerKeyFn);
    const result: R[] = [];

    for (let i = 0; i < outer.length; i++) {
      const outerItem = outer[i] as T;
      const key = outerKeyFn(outerItem);
      const matches = innerLookup.get(key);
      if (matches) {
        for (let j = 0; j < matches.length; j++) {
          result.push(resFn(outerItem, matches[j]!));
        }
      }
    }
    return result;
  };
}

/**
 * Left join - returns all elements from left with matched elements from right.
 * If no match exists, inner will be undefined.
 * @example
 * ```ts
 * const users = [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}];
 * const orders = [{userId: 1, product: 'Book'}];
 * leftJoin(orders, u => u.id, o => o.userId, (u, o) => ({name: u.name, product: o?.product}))(users);
 * // [{name: 'Alice', product: 'Book'}, {name: 'Bob', product: undefined}]
 * ```
 */
export function leftJoin<T, I, K, R>(
  inner: readonly I[],
  outerKeyFn: (value: T) => K,
  innerKeyFn: (value: I) => K,
  resultFn: (outer: T, inner: I | undefined) => R
): (arr: readonly T[]) => R[];
export function leftJoin<T, I, K, R>(
  outer: readonly T[],
  inner: readonly I[],
  outerKeyFn: (value: T) => K,
  innerKeyFn: (value: I) => K,
  resultFn: (outer: T, inner: I | undefined) => R
): R[];
export function leftJoin<T, I, K, R>(
  outerOrInner: readonly T[] | readonly I[],
  innerOrOuterKeyFn: readonly I[] | ((value: T) => K),
  outerKeyFnOrInnerKeyFn: ((value: T) => K) | ((value: I) => K),
  innerKeyFnOrResultFn: ((value: I) => K) | ((outer: T, inner: I | undefined) => R),
  resultFn?: (outer: T, inner: I | undefined) => R
) {
  if (resultFn !== undefined) {
    const outer = outerOrInner as readonly T[];
    const inner = innerOrOuterKeyFn as readonly I[];
    const outerKeyFn = outerKeyFnOrInnerKeyFn as (value: T) => K;
    const innerKeyFn = innerKeyFnOrResultFn as (value: I) => K;

    const innerLookup = buildJoinLookup(inner, innerKeyFn);
    const result: R[] = [];

    for (let i = 0; i < outer.length; i++) {
      const outerItem = outer[i] as T;
      const key = outerKeyFn(outerItem);
      const matches = innerLookup.get(key);
      if (matches && matches.length > 0) {
        for (let j = 0; j < matches.length; j++) {
          result.push(resultFn(outerItem, matches[j]!));
        }
      } else {
        result.push(resultFn(outerItem, undefined));
      }
    }
    return result;
  }

  const inner = outerOrInner as readonly I[];
  const outerKeyFn = innerOrOuterKeyFn as (value: T) => K;
  const innerKeyFn = outerKeyFnOrInnerKeyFn as (value: I) => K;
  const resFn = innerKeyFnOrResultFn as (outer: T, inner: I | undefined) => R;

  return (outer: readonly T[]): R[] => {
    const innerLookup = buildJoinLookup(inner, innerKeyFn);
    const result: R[] = [];

    for (let i = 0; i < outer.length; i++) {
      const outerItem = outer[i] as T;
      const key = outerKeyFn(outerItem);
      const matches = innerLookup.get(key);
      if (matches && matches.length > 0) {
        for (let j = 0; j < matches.length; j++) {
          result.push(resFn(outerItem, matches[j]!));
        }
      } else {
        result.push(resFn(outerItem, undefined));
      }
    }
    return result;
  };
}

/**
 * Right join - returns all elements from right with matched elements from left.
 * If no match exists, outer will be undefined.
 * @example
 * ```ts
 * const users = [{id: 1, name: 'Alice'}];
 * const orders = [{userId: 1, product: 'Book'}, {userId: 2, product: 'Pen'}];
 * rightJoin(orders, u => u.id, o => o.userId, (u, o) => ({name: u?.name, product: o.product}))(users);
 * // [{name: 'Alice', product: 'Book'}, {name: undefined, product: 'Pen'}]
 * ```
 */
export function rightJoin<T, I, K, R>(
  inner: readonly I[],
  outerKeyFn: (value: T) => K,
  innerKeyFn: (value: I) => K,
  resultFn: (outer: T | undefined, inner: I) => R
): (arr: readonly T[]) => R[];
export function rightJoin<T, I, K, R>(
  outer: readonly T[],
  inner: readonly I[],
  outerKeyFn: (value: T) => K,
  innerKeyFn: (value: I) => K,
  resultFn: (outer: T | undefined, inner: I) => R
): R[];
export function rightJoin<T, I, K, R>(
  outerOrInner: readonly T[] | readonly I[],
  innerOrOuterKeyFn: readonly I[] | ((value: T) => K),
  outerKeyFnOrInnerKeyFn: ((value: T) => K) | ((value: I) => K),
  innerKeyFnOrResultFn: ((value: I) => K) | ((outer: T | undefined, inner: I) => R),
  resultFn?: (outer: T | undefined, inner: I) => R
) {
  if (resultFn !== undefined) {
    const outer = outerOrInner as readonly T[];
    const inner = innerOrOuterKeyFn as readonly I[];
    const outerKeyFn = outerKeyFnOrInnerKeyFn as (value: T) => K;
    const innerKeyFn = innerKeyFnOrResultFn as (value: I) => K;

    const outerLookup = buildJoinLookup(outer, outerKeyFn);
    const result: R[] = [];

    for (let i = 0; i < inner.length; i++) {
      const innerItem = inner[i] as I;
      const key = innerKeyFn(innerItem);
      const matches = outerLookup.get(key);
      if (matches && matches.length > 0) {
        for (let j = 0; j < matches.length; j++) {
          result.push(resultFn(matches[j]!, innerItem));
        }
      } else {
        result.push(resultFn(undefined, innerItem));
      }
    }
    return result;
  }

  const inner = outerOrInner as readonly I[];
  const outerKeyFn = innerOrOuterKeyFn as (value: T) => K;
  const innerKeyFn = outerKeyFnOrInnerKeyFn as (value: I) => K;
  const resFn = innerKeyFnOrResultFn as (outer: T | undefined, inner: I) => R;

  return (outer: readonly T[]): R[] => {
    const outerLookup = buildJoinLookup(outer, outerKeyFn);
    const result: R[] = [];

    for (let i = 0; i < inner.length; i++) {
      const innerItem = inner[i] as I;
      const key = innerKeyFn(innerItem);
      const matches = outerLookup.get(key);
      if (matches && matches.length > 0) {
        for (let j = 0; j < matches.length; j++) {
          result.push(resFn(matches[j]!, innerItem));
        }
      } else {
        result.push(resFn(undefined, innerItem));
      }
    }
    return result;
  };
}

/**
 * Full outer join - returns all elements from both arrays.
 * Unmatched elements will have undefined for the missing side.
 * @example
 * ```ts
 * const users = [{id: 1, name: 'Alice'}];
 * const orders = [{userId: 1, product: 'Book'}, {userId: 2, product: 'Pen'}];
 * fullJoin(orders, u => u.id, o => o.userId, (u, o) => ({name: u?.name, product: o?.product}))(users);
 * // [{name: 'Alice', product: 'Book'}, {name: undefined, product: 'Pen'}]
 * ```
 */
export function fullJoin<T, I, K, R>(
  inner: readonly I[],
  outerKeyFn: (value: T) => K,
  innerKeyFn: (value: I) => K,
  resultFn: (outer: T | undefined, inner: I | undefined) => R
): (arr: readonly T[]) => R[];
export function fullJoin<T, I, K, R>(
  outer: readonly T[],
  inner: readonly I[],
  outerKeyFn: (value: T) => K,
  innerKeyFn: (value: I) => K,
  resultFn: (outer: T | undefined, inner: I | undefined) => R
): R[];
export function fullJoin<T, I, K, R>(
  outerOrInner: readonly T[] | readonly I[],
  innerOrOuterKeyFn: readonly I[] | ((value: T) => K),
  outerKeyFnOrInnerKeyFn: ((value: T) => K) | ((value: I) => K),
  innerKeyFnOrResultFn: ((value: I) => K) | ((outer: T | undefined, inner: I | undefined) => R),
  resultFn?: (outer: T | undefined, inner: I | undefined) => R
) {
  if (resultFn !== undefined) {
    const outer = outerOrInner as readonly T[];
    const inner = innerOrOuterKeyFn as readonly I[];
    const outerKeyFn = outerKeyFnOrInnerKeyFn as (value: T) => K;
    const innerKeyFn = innerKeyFnOrResultFn as (value: I) => K;

    const innerLookup = buildJoinLookup(inner, innerKeyFn);
    const matchedInnerKeys = new Set<K>();
    const result: R[] = [];

    // First, iterate outer and match with inner
    for (let i = 0; i < outer.length; i++) {
      const outerItem = outer[i] as T;
      const key = outerKeyFn(outerItem);
      const matches = innerLookup.get(key);
      if (matches && matches.length > 0) {
        matchedInnerKeys.add(key);
        for (let j = 0; j < matches.length; j++) {
          result.push(resultFn(outerItem, matches[j]!));
        }
      } else {
        result.push(resultFn(outerItem, undefined));
      }
    }

    // Then, yield unmatched inner items
    for (const [key, items] of innerLookup) {
      if (!matchedInnerKeys.has(key)) {
        for (let j = 0; j < items.length; j++) {
          result.push(resultFn(undefined, items[j]!));
        }
      }
    }
    return result;
  }

  const inner = outerOrInner as readonly I[];
  const outerKeyFn = innerOrOuterKeyFn as (value: T) => K;
  const innerKeyFn = outerKeyFnOrInnerKeyFn as (value: I) => K;
  const resFn = innerKeyFnOrResultFn as (outer: T | undefined, inner: I | undefined) => R;

  return (outer: readonly T[]): R[] => {
    const innerLookup = buildJoinLookup(inner, innerKeyFn);
    const matchedInnerKeys = new Set<K>();
    const result: R[] = [];

    for (let i = 0; i < outer.length; i++) {
      const outerItem = outer[i] as T;
      const key = outerKeyFn(outerItem);
      const matches = innerLookup.get(key);
      if (matches && matches.length > 0) {
        matchedInnerKeys.add(key);
        for (let j = 0; j < matches.length; j++) {
          result.push(resFn(outerItem, matches[j]!));
        }
      } else {
        result.push(resFn(outerItem, undefined));
      }
    }

    for (const [key, items] of innerLookup) {
      if (!matchedInnerKeys.has(key)) {
        for (let j = 0; j < items.length; j++) {
          result.push(resFn(undefined, items[j]!));
        }
      }
    }
    return result;
  };
}

/**
 * Cross join - returns the Cartesian product of two arrays.
 * @example
 * ```ts
 * const colors = ['red', 'blue'];
 * const sizes = ['S', 'M'];
 * crossJoin(sizes, (c, s) => `${c}-${s}`)(colors);
 * // ['red-S', 'red-M', 'blue-S', 'blue-M']
 * ```
 */
export function crossJoin<T, I, R>(
  inner: readonly I[],
  resultFn: (outer: T, inner: I) => R
): (arr: readonly T[]) => R[];
export function crossJoin<T, I, R>(
  outer: readonly T[],
  inner: readonly I[],
  resultFn: (outer: T, inner: I) => R
): R[];
export function crossJoin<T, I, R>(
  outerOrInner: readonly T[] | readonly I[],
  innerOrResultFn: readonly I[] | ((outer: T, inner: I) => R),
  resultFn?: (outer: T, inner: I) => R
) {
  if (resultFn !== undefined) {
    const outer = outerOrInner as readonly T[];
    const inner = innerOrResultFn as readonly I[];
    const result: R[] = [];

    for (let i = 0; i < outer.length; i++) {
      const outerItem = outer[i] as T;
      for (let j = 0; j < inner.length; j++) {
        result.push(resultFn(outerItem, inner[j] as I));
      }
    }
    return result;
  }

  const inner = outerOrInner as readonly I[];
  const resFn = innerOrResultFn as (outer: T, inner: I) => R;

  return (outer: readonly T[]): R[] => {
    const result: R[] = [];
    for (let i = 0; i < outer.length; i++) {
      const outerItem = outer[i] as T;
      for (let j = 0; j < inner.length; j++) {
        result.push(resFn(outerItem, inner[j]!));
      }
    }
    return result;
  };
}

/**
 * Group join - groups all matching inner elements for each outer element.
 * @example
 * ```ts
 * const users = [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}];
 * const orders = [{userId: 1, product: 'Book'}, {userId: 1, product: 'Pen'}];
 * groupJoin(orders, u => u.id, o => o.userId, (u, os) => ({name: u.name, orderCount: os.length}))(users);
 * // [{name: 'Alice', orderCount: 2}, {name: 'Bob', orderCount: 0}]
 * ```
 */
export function groupJoin<T, I, K, R>(
  inner: readonly I[],
  outerKeyFn: (value: T) => K,
  innerKeyFn: (value: I) => K,
  resultFn: (outer: T, innerGroup: I[]) => R
): (arr: readonly T[]) => R[];
export function groupJoin<T, I, K, R>(
  outer: readonly T[],
  inner: readonly I[],
  outerKeyFn: (value: T) => K,
  innerKeyFn: (value: I) => K,
  resultFn: (outer: T, innerGroup: I[]) => R
): R[];
export function groupJoin<T, I, K, R>(
  outerOrInner: readonly T[] | readonly I[],
  innerOrOuterKeyFn: readonly I[] | ((value: T) => K),
  outerKeyFnOrInnerKeyFn: ((value: T) => K) | ((value: I) => K),
  innerKeyFnOrResultFn: ((value: I) => K) | ((outer: T, innerGroup: I[]) => R),
  resultFn?: (outer: T, innerGroup: I[]) => R
) {
  if (resultFn !== undefined) {
    const outer = outerOrInner as readonly T[];
    const inner = innerOrOuterKeyFn as readonly I[];
    const outerKeyFn = outerKeyFnOrInnerKeyFn as (value: T) => K;
    const innerKeyFn = innerKeyFnOrResultFn as (value: I) => K;

    const innerLookup = buildJoinLookup(inner, innerKeyFn);
    const result: R[] = [];

    for (let i = 0; i < outer.length; i++) {
      const outerItem = outer[i] as T;
      const key = outerKeyFn(outerItem);
      const matches = innerLookup.get(key) ?? [];
      result.push(resultFn(outerItem, matches));
    }
    return result;
  }

  const inner = outerOrInner as readonly I[];
  const outerKeyFn = innerOrOuterKeyFn as (value: T) => K;
  const innerKeyFn = outerKeyFnOrInnerKeyFn as (value: I) => K;
  const resFn = innerKeyFnOrResultFn as (outer: T, innerGroup: I[]) => R;

  return (outer: readonly T[]): R[] => {
    const innerLookup = buildJoinLookup(inner, innerKeyFn);
    const result: R[] = [];

    for (let i = 0; i < outer.length; i++) {
      const outerItem = outer[i] as T;
      const key = outerKeyFn(outerItem);
      const matches = innerLookup.get(key) ?? [];
      result.push(resFn(outerItem, matches));
    }
    return result;
  };
}

/**
 * Semi join - returns outer elements that have at least one match in inner.
 * Does not include any data from the inner array.
 * @example
 * ```ts
 * const users = [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}];
 * const orders = [{userId: 1, product: 'Book'}];
 * semiJoin(orders, u => u.id, o => o.userId)(users);
 * // [{id: 1, name: 'Alice'}]
 * ```
 */
export function semiJoin<T, I, K>(
  inner: readonly I[],
  outerKeyFn: (value: T) => K,
  innerKeyFn: (value: I) => K
): (arr: readonly T[]) => T[];
export function semiJoin<T, I, K>(
  outer: readonly T[],
  inner: readonly I[],
  outerKeyFn: (value: T) => K,
  innerKeyFn: (value: I) => K
): T[];
export function semiJoin<T, I, K>(
  outerOrInner: readonly T[] | readonly I[],
  innerOrOuterKeyFn: readonly I[] | ((value: T) => K),
  outerKeyFnOrInnerKeyFn: ((value: T) => K) | ((value: I) => K),
  innerKeyFn?: (value: I) => K
) {
  if (innerKeyFn !== undefined) {
    const outer = outerOrInner as readonly T[];
    const inner = innerOrOuterKeyFn as readonly I[];
    const outerKeyFn = outerKeyFnOrInnerKeyFn as (value: T) => K;

    const innerKeys = new Set<K>();
    for (let i = 0; i < inner.length; i++) {
      innerKeys.add(innerKeyFn(inner[i] as I));
    }

    const result: T[] = [];
    for (let i = 0; i < outer.length; i++) {
      const outerItem = outer[i] as T;
      if (innerKeys.has(outerKeyFn(outerItem))) {
        result.push(outerItem);
      }
    }
    return result;
  }

  const inner = outerOrInner as readonly I[];
  const outerKeyFn = innerOrOuterKeyFn as (value: T) => K;
  const innerKeyFnCurried = outerKeyFnOrInnerKeyFn as (value: I) => K;

  return (outer: readonly T[]): T[] => {
    const innerKeys = new Set<K>();
    for (let i = 0; i < inner.length; i++) {
      innerKeys.add(innerKeyFnCurried(inner[i]!));
    }

    const result: T[] = [];
    for (let i = 0; i < outer.length; i++) {
      const outerItem = outer[i] as T;
      if (innerKeys.has(outerKeyFn(outerItem))) {
        result.push(outerItem);
      }
    }
    return result;
  };
}

/**
 * Anti join - returns outer elements that have NO match in inner.
 * Opposite of semi join.
 * @example
 * ```ts
 * const users = [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}];
 * const orders = [{userId: 1, product: 'Book'}];
 * antiJoin(orders, u => u.id, o => o.userId)(users);
 * // [{id: 2, name: 'Bob'}]
 * ```
 */
export function antiJoin<T, I, K>(
  inner: readonly I[],
  outerKeyFn: (value: T) => K,
  innerKeyFn: (value: I) => K
): (arr: readonly T[]) => T[];
export function antiJoin<T, I, K>(
  outer: readonly T[],
  inner: readonly I[],
  outerKeyFn: (value: T) => K,
  innerKeyFn: (value: I) => K
): T[];
export function antiJoin<T, I, K>(
  outerOrInner: readonly T[] | readonly I[],
  innerOrOuterKeyFn: readonly I[] | ((value: T) => K),
  outerKeyFnOrInnerKeyFn: ((value: T) => K) | ((value: I) => K),
  innerKeyFn?: (value: I) => K
) {
  if (innerKeyFn !== undefined) {
    const outer = outerOrInner as readonly T[];
    const inner = innerOrOuterKeyFn as readonly I[];
    const outerKeyFn = outerKeyFnOrInnerKeyFn as (value: T) => K;

    const innerKeys = new Set<K>();
    for (let i = 0; i < inner.length; i++) {
      innerKeys.add(innerKeyFn(inner[i] as I));
    }

    const result: T[] = [];
    for (let i = 0; i < outer.length; i++) {
      const outerItem = outer[i] as T;
      if (!innerKeys.has(outerKeyFn(outerItem))) {
        result.push(outerItem);
      }
    }
    return result;
  }

  const inner = outerOrInner as readonly I[];
  const outerKeyFn = innerOrOuterKeyFn as (value: T) => K;
  const innerKeyFnCurried = outerKeyFnOrInnerKeyFn as (value: I) => K;

  return (outer: readonly T[]): T[] => {
    const innerKeys = new Set<K>();
    for (let i = 0; i < inner.length; i++) {
      innerKeys.add(innerKeyFnCurried(inner[i]!));
    }

    const result: T[] = [];
    for (let i = 0; i < outer.length; i++) {
      const outerItem = outer[i] as T;
      if (!innerKeys.has(outerKeyFn(outerItem))) {
        result.push(outerItem);
      }
    }
    return result;
  };
}

// ==================== Windowing Operations ====================

/**
 * Returns sliding windows of n consecutive elements with optional step.
 * @example
 * ```ts
 * aperture(3)([1, 2, 3, 4, 5]); // [[1, 2, 3], [2, 3, 4], [3, 4, 5]]
 * aperture(2, 2)([1, 2, 3, 4, 5]); // [[1, 2], [3, 4]]
 * ```
 */
export function aperture<T>(size: number, step?: number): (arr: readonly T[]) => T[][];
export function aperture<T>(size: number, step: number, arr: readonly T[]): T[][];
export function aperture<T>(size: number, stepOrArr?: number | readonly T[], arr?: readonly T[]) {
  // Direct call: aperture(3, 1, array)
  if (arr !== undefined) {
    const step = stepOrArr as number;
    return apertureImpl(arr as readonly T[], size, step);
  }

  // Direct call with just step as array: aperture(3, array) - but step defaults to 1
  if (Array.isArray(stepOrArr)) {
    return apertureImpl(stepOrArr as readonly T[], size, 1);
  }

  // Curried: aperture(3) or aperture(3, 2)
  const step = (stepOrArr as number | undefined) ?? 1;
  return (arr: readonly T[]): T[][] => apertureImpl(arr, size, step);
}

function apertureImpl<T>(arr: readonly T[], size: number, step: number): T[][] {
  if (size <= 0 || step <= 0 || arr.length < size) return [];

  const result: T[][] = [];
  for (let i = 0; i <= arr.length - size; i += step) {
    result.push(arr.slice(i, i + size) as T[]);
  }
  return result;
}

/**
 * Alias for aperture. Returns sliding windows.
 */
export function slidingWindow<T>(size: number, step?: number): (arr: readonly T[]) => T[][];
export function slidingWindow<T>(size: number, step: number, arr: readonly T[]): T[][];
export function slidingWindow<T>(size: number, stepOrArr?: number | readonly T[], arr?: readonly T[]): T[][] | ((arr: readonly T[]) => T[][]) {
  // Direct call: slidingWindow(size, step, arr)
  if (arr !== undefined) {
    return apertureImpl(arr, size, stepOrArr as number);
  }

  // Curried: slidingWindow(size) or slidingWindow(size, step)
  const step = (stepOrArr as number | undefined) ?? 1;
  return (arr: readonly T[]): T[][] => apertureImpl(arr, size, step);
}

/**
 * Returns consecutive pairs of elements.
 * @example
 * ```ts
 * pairwise([1, 2, 3, 4]); // [[1, 2], [2, 3], [3, 4]]
 * ```
 */
export function pairwise<T>(arr: readonly T[]): [T, T][] {
  const len = arr.length;
  if (len < 2) return [];

  const result: [T, T][] = new Array(len - 1);
  for (let i = 0; i < len - 1; i++) {
    result[i] = [arr[i]!, arr[i + 1]!];
  }
  return result;
}

// ==================== Comparison Operations ====================

/**
 * Checks if two sequences are equal element by element.
 * @example
 * ```ts
 * sequenceEqual([1, 2, 3], [1, 2, 3]); // true
 * sequenceEqual([1, 2], [1, 2, 3]); // false
 * ```
 */
export function sequenceEqual<T>(other: readonly T[], comparer?: (a: T, b: T) => boolean): (arr: readonly T[]) => boolean;
export function sequenceEqual<T>(arr: readonly T[], other: readonly T[], comparer?: (a: T, b: T) => boolean): boolean;
export function sequenceEqual<T>(
  arrOrOther: readonly T[],
  otherOrComparer?: readonly T[] | ((a: T, b: T) => boolean),
  comparer?: (a: T, b: T) => boolean
) {
  // Direct call: sequenceEqual(arr, other) or sequenceEqual(arr, other, comparer)
  if (Array.isArray(otherOrComparer)) {
    const arr = arrOrOther;
    const other = otherOrComparer as readonly T[];
    const cmp = comparer ?? ((a: T, b: T) => a === b);
    return sequenceEqualImpl(arr, other, cmp);
  }

  // Curried: sequenceEqual(other) or sequenceEqual(other, comparer)
  const other = arrOrOther;
  const cmp = (otherOrComparer as ((a: T, b: T) => boolean) | undefined) ?? ((a: T, b: T) => a === b);
  return (arr: readonly T[]): boolean => sequenceEqualImpl(arr, other, cmp);
}

function sequenceEqualImpl<T>(arr: readonly T[], other: readonly T[], comparer: (a: T, b: T) => boolean): boolean {
  if (arr.length !== other.length) return false;
  for (let i = 0; i < arr.length; i++) {
    if (!comparer(arr[i]!, other[i]!)) return false;
  }
  return true;
}

/**
 * Checks if the sequence starts with the given prefix.
 * @example
 * ```ts
 * startsWith([1, 2])([1, 2, 3, 4]); // true
 * startsWith([1, 2], [1, 2, 3, 4]); // true
 * ```
 */
export function startsWith<T>(prefix: readonly T[], comparer?: (a: T, b: T) => boolean): (arr: readonly T[]) => boolean;
export function startsWith<T>(arr: readonly T[], prefix: readonly T[], comparer?: (a: T, b: T) => boolean): boolean;
export function startsWith<T>(
  arrOrPrefix: readonly T[],
  prefixOrComparer?: readonly T[] | ((a: T, b: T) => boolean),
  comparer?: (a: T, b: T) => boolean
) {
  // Direct call: startsWith(arr, prefix) or startsWith(arr, prefix, comparer)
  if (Array.isArray(prefixOrComparer)) {
    const arr = arrOrPrefix;
    const prefix = prefixOrComparer as readonly T[];
    const cmp = comparer ?? ((a: T, b: T) => a === b);
    return startsWithImpl(arr, prefix, cmp);
  }

  // Curried: startsWith(prefix) or startsWith(prefix, comparer)
  const prefix = arrOrPrefix;
  const cmp = (prefixOrComparer as ((a: T, b: T) => boolean) | undefined) ?? ((a: T, b: T) => a === b);
  return (arr: readonly T[]): boolean => startsWithImpl(arr, prefix, cmp);
}

function startsWithImpl<T>(arr: readonly T[], prefix: readonly T[], comparer: (a: T, b: T) => boolean): boolean {
  if (prefix.length > arr.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (!comparer(arr[i]!, prefix[i]!)) return false;
  }
  return true;
}

/**
 * Checks if the sequence ends with the given suffix.
 * @example
 * ```ts
 * endsWith([3, 4])([1, 2, 3, 4]); // true
 * endsWith([1, 2, 3, 4], [3, 4]); // true
 * ```
 */
export function endsWith<T>(suffix: readonly T[], comparer?: (a: T, b: T) => boolean): (arr: readonly T[]) => boolean;
export function endsWith<T>(arr: readonly T[], suffix: readonly T[], comparer?: (a: T, b: T) => boolean): boolean;
export function endsWith<T>(
  arrOrSuffix: readonly T[],
  suffixOrComparer?: readonly T[] | ((a: T, b: T) => boolean),
  comparer?: (a: T, b: T) => boolean
) {
  // Direct call: endsWith(arr, suffix) or endsWith(arr, suffix, comparer)
  if (Array.isArray(suffixOrComparer)) {
    const arr = arrOrSuffix;
    const suffix = suffixOrComparer as readonly T[];
    const cmp = comparer ?? ((a: T, b: T) => a === b);
    return endsWithImpl(arr, suffix, cmp);
  }

  // Curried: endsWith(suffix) or endsWith(suffix, comparer)
  const suffix = arrOrSuffix;
  const cmp = (suffixOrComparer as ((a: T, b: T) => boolean) | undefined) ?? ((a: T, b: T) => a === b);
  return (arr: readonly T[]): boolean => endsWithImpl(arr, suffix, cmp);
}

function endsWithImpl<T>(arr: readonly T[], suffix: readonly T[], comparer: (a: T, b: T) => boolean): boolean {
  if (suffix.length > arr.length) return false;
  const startIndex = arr.length - suffix.length;
  for (let i = 0; i < suffix.length; i++) {
    if (!comparer(arr[startIndex + i]!, suffix[i]!)) return false;
  }
  return true;
}

// ==================== Combinatorial Operations ====================

/**
 * Returns all permutations of the array.
 * Warning: O(n!) complexity - use only for small arrays.
 * @example
 * ```ts
 * permutations([1, 2, 3]);
 * // [[1,2,3], [2,1,3], [3,1,2], [1,3,2], [2,3,1], [3,2,1]]
 * ```
 */
export function permutations<T>(arr: readonly T[]): T[][] {
  const result: T[][] = [];
  const items = arr.slice() as T[];
  const len = items.length;

  if (len === 0) return [[]];
  if (len === 1) return [[items[0]!]];

  // Heap's algorithm
  const c = new Array<number>(len).fill(0);
  result.push(items.slice());

  let i = 0;
  while (i < len) {
    if (c[i]! < i) {
      if (i % 2 === 0) {
        [items[0], items[i]] = [items[i]!, items[0]!];
      } else {
        [items[c[i]!], items[i]] = [items[i]!, items[c[i]!]!];
      }
      result.push(items.slice());
      c[i]!++;
      i = 0;
    } else {
      c[i] = 0;
      i++;
    }
  }

  return result;
}

/**
 * Returns all k-combinations of the array.
 * @example
 * ```ts
 * combinations(2)([1, 2, 3]); // [[1, 2], [1, 3], [2, 3]]
 * combinations(2, [1, 2, 3]); // [[1, 2], [1, 3], [2, 3]]
 * ```
 */
export function combinations<T>(k: number): (arr: readonly T[]) => T[][];
export function combinations<T>(k: number, arr: readonly T[]): T[][];
export function combinations<T>(k: number, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): T[][] => {
    const result: T[][] = [];
    const len = arr.length;

    if (k === 0) return [[]];
    if (k > len) return [];
    if (k === len) return [arr.slice() as T[]];

    const indices = Array.from({ length: k }, (_, i) => i);

    while (true) {
      result.push(indices.map(i => arr[i]!));

      let i = k - 1;
      while (i >= 0 && indices[i] === len - k + i) {
        i--;
      }

      if (i < 0) break;

      indices[i]!++;
      for (let j = i + 1; j < k; j++) {
        indices[j] = indices[j - 1]! + 1;
      }
    }

    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

// ==================== Randomization Operations ====================

/**
 * Returns a new array with elements in random order.
 * Uses Fisher-Yates shuffle algorithm.
 * @example
 * ```ts
 * shuffle([1, 2, 3, 4, 5]); // e.g., [3, 1, 5, 2, 4]
 * ```
 */
export function shuffle<T>(arr: readonly T[]): T[] {
  const result = arr.slice() as T[];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * Returns n random elements from the array.
 * @example
 * ```ts
 * sample(3)([1, 2, 3, 4, 5]); // e.g., [2, 5, 1]
 * sample(3, [1, 2, 3, 4, 5]); // e.g., [4, 1, 3]
 * ```
 */
export function sample<T>(n: number): (arr: readonly T[]) => T[];
export function sample<T>(n: number, arr: readonly T[]): T[];
export function sample<T>(n: number, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): T[] => {
    if (n <= 0) return [];
    if (n >= arr.length) return shuffle(arr);

    const result: T[] = [];
    const indices = new Set<number>();
    while (result.length < n) {
      const idx = Math.floor(Math.random() * arr.length);
      if (!indices.has(idx)) {
        indices.add(idx);
        result.push(arr[idx]!);
      }
    }
    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Returns a single random element from the array.
 * @example
 * ```ts
 * randomElement([1, 2, 3, 4, 5]); // e.g., 3
 * ```
 */
export function randomElement<T>(arr: readonly T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

// ==================== Search Operations ====================

/**
 * Binary search on a sorted array.
 * @returns The index of the element, or -1 if not found
 * @example
 * ```ts
 * binarySearch(3)([1, 2, 3, 4, 5]); // 2
 * binarySearch(6, [1, 2, 3, 4, 5]); // -1
 * ```
 */
export function binarySearch<T>(value: T, compareFn?: (a: T, b: T) => number): (arr: readonly T[]) => number;
export function binarySearch<T>(value: T, compareFn: ((a: T, b: T) => number) | undefined, arr: readonly T[]): number;
export function binarySearch<T>(value: T, compareFnOrArr?: ((a: T, b: T) => number) | readonly T[], arr?: readonly T[]) {
  const exec = (arr: readonly T[], compareFn?: (a: T, b: T) => number): number => {
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
  };

  // Direct call: binarySearch(value, compareFn, arr)
  if (arr !== undefined) {
    return exec(arr, compareFnOrArr as (a: T, b: T) => number);
  }

  // Curried: binarySearch(value) or binarySearch(value, compareFn)
  const compareFn = typeof compareFnOrArr === 'function' ? compareFnOrArr : undefined;
  return (arr: readonly T[]) => exec(arr, compareFn);
}

/**
 * Binary search that returns the insertion point.
 * @returns The index where the element should be inserted to maintain sorted order
 * @example
 * ```ts
 * binarySearchIndex(3)([1, 2, 4, 5]); // 2
 * binarySearchIndex(3, [1, 2, 3, 4, 5]); // 2
 * ```
 */
export function binarySearchIndex<T>(value: T, compareFn?: (a: T, b: T) => number): (arr: readonly T[]) => number;
export function binarySearchIndex<T>(value: T, compareFn: ((a: T, b: T) => number) | undefined, arr: readonly T[]): number;
export function binarySearchIndex<T>(value: T, compareFnOrArr?: ((a: T, b: T) => number) | readonly T[], arr?: readonly T[]) {
  const exec = (arr: readonly T[], compareFn?: (a: T, b: T) => number): number => {
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
  };

  // Direct call: binarySearchIndex(value, compareFn, arr)
  if (arr !== undefined) {
    return exec(arr, compareFnOrArr as (a: T, b: T) => number);
  }

  // Curried: binarySearchIndex(value) or binarySearchIndex(value, compareFn)
  const compareFn = typeof compareFnOrArr === 'function' ? compareFnOrArr : undefined;
  return (arr: readonly T[]) => exec(arr, compareFn);
}

// ==================== Sorting Operations ====================

/**
 * Sorts by key selector.
 * @example
 * ```ts
 * sortBy((x: {age: number}) => x.age)([{age: 30}, {age: 20}]);
 * // [{age: 20}, {age: 30}]
 * ```
 */
export function sortBy<T, K>(keyFn: (value: T) => K): (arr: readonly T[]) => T[];
export function sortBy<T, K>(keyFn: (value: T) => K, arr: readonly T[]): T[];
export function sortBy<T, K>(keyFn: (value: T) => K, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): T[] => {
    const len = arr.length;
    if (len <= 1) return arr.slice() as T[];

    // Cache keys for O(n) key computation instead of O(n log n)
    const keyed = new Array<{ item: T; key: K }>(len);
    for (let i = 0; i < len; i++) {
      keyed[i] = { item: arr[i] as T, key: keyFn(arr[i] as T) };
    }

    keyed.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

    const result = new Array<T>(len);
    for (let i = 0; i < len; i++) {
      result[i] = keyed[i]!.item;
    }
    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Sorts in descending order by key.
 * @example
 * ```ts
 * sortByDesc((x: {age: number}) => x.age)([{age: 20}, {age: 30}]);
 * // [{age: 30}, {age: 20}]
 * ```
 */
export function sortByDesc<T, K>(keyFn: (value: T) => K): (arr: readonly T[]) => T[];
export function sortByDesc<T, K>(keyFn: (value: T) => K, arr: readonly T[]): T[];
export function sortByDesc<T, K>(keyFn: (value: T) => K, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): T[] => {
    const len = arr.length;
    if (len <= 1) return arr.slice() as T[];

    const keyed = new Array<{ item: T; key: K }>(len);
    for (let i = 0; i < len; i++) {
      keyed[i] = { item: arr[i] as T, key: keyFn(arr[i] as T) };
    }

    keyed.sort((a, b) => (a.key > b.key ? -1 : a.key < b.key ? 1 : 0));

    const result = new Array<T>(len);
    for (let i = 0; i < len; i++) {
      result[i] = keyed[i]!.item;
    }
    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Sorts with custom comparator.
 * @example
 * ```ts
 * sort((a, b) => a - b)([3, 1, 2]); // [1, 2, 3]
 * sort((a, b) => a - b, [3, 1, 2]); // [1, 2, 3]
 * ```
 */
export function sort<T>(comparator: Comparator<T>): (arr: readonly T[]) => T[];
export function sort<T>(comparator: Comparator<T>, arr: readonly T[]): T[];
export function sort<T>(comparator: Comparator<T>, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): T[] => {
    const result = arr.slice() as T[];
    result.sort(comparator);
    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

// ==================== Utility Operations ====================

/**
 * Executes a function for each element (returns original array).
 * @example
 * ```ts
 * forEach(console.log)([1, 2, 3]); // logs 1, 2, 3; returns [1, 2, 3]
 * ```
 */
export function forEach<T>(fn: (value: T, index: number) => void): (arr: readonly T[]) => readonly T[];
export function forEach<T>(fn: (value: T, index: number) => void, arr: readonly T[]): readonly T[];
export function forEach<T>(fn: (value: T, index: number) => void, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): readonly T[] => {
    for (let i = 0; i < arr.length; i++) {
      fn(arr[i] as T, i);
    }
    return arr;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Taps into pipeline for side effects.
 * @example
 * ```ts
 * pipe(
 *   filter((x: number) => x > 0),
 *   tap(arr => console.log('After filter:', arr)),
 *   map((x: number) => x * 2)
 * )([1, -2, 3]);
 * ```
 */
export function tap<T>(fn: (arr: readonly T[]) => void): (arr: readonly T[]) => readonly T[];
export function tap<T>(fn: (arr: readonly T[]) => void, arr: readonly T[]): readonly T[];
export function tap<T>(fn: (arr: readonly T[]) => void, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): readonly T[] => {
    fn(arr);
    return arr;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Joins array elements into string.
 * @example
 * ```ts
 * join(', ')([1, 2, 3]); // '1, 2, 3'
 * join(', ', [1, 2, 3]); // '1, 2, 3'
 * ```
 */
export function join<T>(separator: string): (arr: readonly T[]) => string;
export function join<T>(separator: string, arr: readonly T[]): string;
export function join<T>(separator: string, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): string => arr.join(separator);
  return arr === undefined ? exec : exec(arr);
}

// ==================== Generator Factories ====================

/**
 * Creates an array of numbers in a range.
 * @example
 * ```ts
 * range(5);       // [0, 1, 2, 3, 4]
 * range(1, 5);    // [1, 2, 3, 4]
 * range(0, 10, 2); // [0, 2, 4, 6, 8]
 * ```
 */
export function range(end: number): number[];
export function range(start: number, end: number, step?: number): number[];
export function range(startOrEnd: number, end?: number, step?: number): number[] {
  let actualStart: number;
  let actualEnd: number;
  let actualStep: number;

  if (end === undefined) {
    actualStart = 0;
    actualEnd = startOrEnd;
    actualStep = 1;
  } else {
    actualStart = startOrEnd;
    actualEnd = end;
    actualStep = step ?? (actualStart <= actualEnd ? 1 : -1);
  }

  if (actualStep === 0) return [];

  const len = Math.max(0, Math.ceil((actualEnd - actualStart) / actualStep));
  const result = new Array<number>(len);

  for (let i = 0; i < len; i++) {
    result[i] = actualStart + i * actualStep;
  }

  return result;
}

/**
 * Creates an array with n copies of a value.
 * @example
 * ```ts
 * repeat('x', 3); // ['x', 'x', 'x']
 * ```
 */
export function repeat<T>(value: T, count: number): T[] {
  const result = new Array<T>(count);
  for (let i = 0; i < count; i++) {
    result[i] = value;
  }
  return result;
}

/**
 * Calls a function n times with the index.
 * @example
 * ```ts
 * times(i => i * 2, 4); // [0, 2, 4, 6]
 * ```
 */
export function times<T>(fn: (index: number) => T, count: number): T[] {
  const result = new Array<T>(count);
  for (let i = 0; i < count; i++) {
    result[i] = fn(i);
  }
  return result;
}

// ==================== Pagination Operations ====================

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

/**
 * Gets a specific page of items (1-indexed).
 * @example
 * ```ts
 * page(2, 10)([1, 2, ..., 100]); // items 11-20
 * page(2, 10, [1, 2, ..., 100]); // items 11-20
 * ```
 */
export function page<T>(pageNum: number, pageSize: number): (arr: readonly T[]) => T[];
export function page<T>(pageNum: number, pageSize: number, arr: readonly T[]): T[];
export function page<T>(pageNum: number, pageSize: number, arr?: readonly T[]) {
  // Fast path: direct 3-arg call - single branch for invalid inputs
  if (arr !== undefined) {
    return pageNum > 0 && pageSize > 0 ? arr.slice((pageNum - 1) * pageSize, pageNum * pageSize) as T[] : [];
  }
  // Curried version
  if (pageNum < 1 || pageSize < 1) return () => [] as T[];
  const start = (pageNum - 1) * pageSize;
  const end = pageNum * pageSize;
  return (arr: readonly T[]): T[] => arr.slice(start, end) as T[];
}

/**
 * Gets a page of items with pagination metadata (1-indexed).
 * @example
 * ```ts
 * paginate(2, 10)([1, 2, ..., 100]);
 * // { items: [11-20], page: 2, pageSize: 10, total: 100, totalPages: 10, hasNext: true, hasPrev: true }
 * ```
 */
export function paginate<T>(pageNum: number, pageSize: number): (arr: readonly T[]) => PaginationResult<T>;
export function paginate<T>(pageNum: number, pageSize: number, arr: readonly T[]): PaginationResult<T>;
export function paginate<T>(pageNum: number, pageSize: number, arr?: readonly T[]) {
  // Fast path: direct call - streamlined calculations
  if (arr !== undefined) {
    const total = arr.length;
    const totalPages = ((total + pageSize - 1) / pageSize) | 0; // Fast ceil for positive integers
    const validPage = pageNum < 1 ? 1 : pageNum > totalPages ? (totalPages || 1) : pageNum;
    const start = (validPage - 1) * pageSize;
    return {
      items: arr.slice(start, start + pageSize) as T[],
      page: validPage,
      pageSize,
      total,
      totalPages,
      hasNext: validPage < totalPages,
      hasPrev: validPage > 1,
    };
  }
  return (arr: readonly T[]): PaginationResult<T> => {
    const total = arr.length;
    const totalPages = ((total + pageSize - 1) / pageSize) | 0;
    const validPage = pageNum < 1 ? 1 : pageNum > totalPages ? (totalPages || 1) : pageNum;
    const start = (validPage - 1) * pageSize;
    return {
      items: arr.slice(start, start + pageSize) as T[],
      page: validPage,
      pageSize,
      total,
      totalPages,
      hasNext: validPage < totalPages,
      hasPrev: validPage > 1,
    };
  };
}

// ==================== Array Manipulation Operations ====================

/**
 * Returns all elements except the first.
 * @example
 * ```ts
 * tail([1, 2, 3, 4]); // [2, 3, 4]
 * ```
 */
export function tail<T>(arr: readonly T[]): T[] {
  return arr.slice(1) as T[];
}

/**
 * Returns all elements except the last.
 * @example
 * ```ts
 * init([1, 2, 3, 4]); // [1, 2, 3]
 * ```
 */
export function init<T>(arr: readonly T[]): T[] {
  return arr.slice(0, -1) as T[];
}

/**
 * Takes the last n elements.
 * @example
 * ```ts
 * takeLast(2)([1, 2, 3, 4]); // [3, 4]
 * takeLast(2, [1, 2, 3, 4]); // [3, 4]
 * ```
 */
export function takeLast<T>(n: number): (arr: readonly T[]) => T[];
export function takeLast<T>(n: number, arr: readonly T[]): T[];
export function takeLast<T>(n: number, arr?: readonly T[]) {
  // Fast path: direct call - n <= 0 returns [] from slice(-0) = whole array, so we need the check
  if (arr !== undefined) return n > 0 ? arr.slice(-n) as T[] : [];
  // Curried version
  if (n <= 0) return () => [] as T[];
  const neg = -n;
  return (arr: readonly T[]): T[] => arr.slice(neg) as T[];
}

/**
 * Drops the last n elements.
 * @example
 * ```ts
 * dropLast(2)([1, 2, 3, 4]); // [1, 2]
 * dropLast(2, [1, 2, 3, 4]); // [1, 2]
 * ```
 */
export function dropLast<T>(n: number): (arr: readonly T[]) => T[];
export function dropLast<T>(n: number, arr: readonly T[]): T[];
export function dropLast<T>(n: number, arr?: readonly T[]) {
  // Fast path for direct 2-arg calls
  if (arr !== undefined) {
    return n <= 0 ? arr.slice() as T[] : arr.slice(0, -n) as T[];
  }
  // Pre-validate for curried version
  if (n <= 0) return (arr: readonly T[]): T[] => arr.slice() as T[];
  return (arr: readonly T[]): T[] => arr.slice(0, -n) as T[];
}

/**
 * Takes elements from the end while predicate is true.
 * @example
 * ```ts
 * takeLastWhile((x: number) => x > 2)([1, 2, 3, 4]); // [3, 4]
 * ```
 */
export function takeLastWhile<T>(predicate: Predicate<T>): (arr: readonly T[]) => T[];
export function takeLastWhile<T>(predicate: Predicate<T>, arr: readonly T[]): T[];
export function takeLastWhile<T>(predicate: Predicate<T>, arr?: readonly T[]) {
  // Fast path for direct 2-arg calls - inline to avoid function creation
  if (arr !== undefined) {
    let startIndex = arr.length;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (!predicate(arr[i] as T, i)) break;
      startIndex = i;
    }
    return arr.slice(startIndex) as T[];
  }
  return (arr: readonly T[]): T[] => {
    let startIndex = arr.length;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (!predicate(arr[i] as T, i)) break;
      startIndex = i;
    }
    return arr.slice(startIndex) as T[];
  };
}

/**
 * Drops elements from the end while predicate is true.
 * @example
 * ```ts
 * dropLastWhile((x: number) => x > 2)([1, 2, 3, 4]); // [1, 2]
 * ```
 */
export function dropLastWhile<T>(predicate: Predicate<T>): (arr: readonly T[]) => T[];
export function dropLastWhile<T>(predicate: Predicate<T>, arr: readonly T[]): T[];
export function dropLastWhile<T>(predicate: Predicate<T>, arr?: readonly T[]) {
  // Fast path for direct 2-arg calls - inline to avoid function creation
  if (arr !== undefined) {
    let endIndex = arr.length;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (!predicate(arr[i] as T, i)) break;
      endIndex = i;
    }
    return arr.slice(0, endIndex) as T[];
  }
  return (arr: readonly T[]): T[] => {
    let endIndex = arr.length;
    for (let i = arr.length - 1; i >= 0; i--) {
      if (!predicate(arr[i] as T, i)) break;
      endIndex = i;
    }
    return arr.slice(0, endIndex) as T[];
  };
}

/**
 * Appends an element to the end of the array.
 * @example
 * ```ts
 * append(4)([1, 2, 3]); // [1, 2, 3, 4]
 * append(4, [1, 2, 3]); // [1, 2, 3, 4]
 * ```
 */
export function append<T>(value: T): (arr: readonly T[]) => T[];
export function append<T>(value: T, arr: readonly T[]): T[];
export function append<T>(value: T, arr?: readonly T[]) {
  // Fast path: use concat for better performance than spread
  if (arr !== undefined) {
    return arr.concat([value]) as T[];
  }
  return (arr: readonly T[]): T[] => arr.concat([value]) as T[];
}

/**
 * Prepends an element to the beginning of the array.
 * @example
 * ```ts
 * prepend(0)([1, 2, 3]); // [0, 1, 2, 3]
 * prepend(0, [1, 2, 3]); // [0, 1, 2, 3]
 * ```
 */
export function prepend<T>(value: T): (arr: readonly T[]) => T[];
export function prepend<T>(value: T, arr: readonly T[]): T[];
export function prepend<T>(value: T, arr?: readonly T[]) {
  // Fast path: pre-allocate array and copy
  if (arr !== undefined) {
    const len = arr.length;
    const result = new Array<T>(len + 1);
    result[0] = value;
    for (let i = 0; i < len; i++) result[i + 1] = arr[i] as T;
    return result;
  }
  return (arr: readonly T[]): T[] => {
    const len = arr.length;
    const result = new Array<T>(len + 1);
    result[0] = value;
    for (let i = 0; i < len; i++) result[i + 1] = arr[i] as T;
    return result;
  };
}

/**
 * Inserts an element at the specified index.
 * @example
 * ```ts
 * insert(1, 'x')(['a', 'b', 'c']); // ['a', 'x', 'b', 'c']
 * insert(1, 'x', ['a', 'b', 'c']); // ['a', 'x', 'b', 'c']
 * ```
 */
export function insert<T>(index: number, value: T): (arr: readonly T[]) => T[];
export function insert<T>(index: number, value: T, arr: readonly T[]): T[];
export function insert<T>(index: number, value: T, arr?: readonly T[]) {
  // Fast path for direct 3-arg calls
  if (arr !== undefined) {
    const result = arr.slice() as T[];
    result.splice(index, 0, value);
    return result;
  }
  return (arr: readonly T[]): T[] => {
    const result = arr.slice() as T[];
    result.splice(index, 0, value);
    return result;
  };
}

/**
 * Inserts multiple elements at the specified index.
 * @example
 * ```ts
 * insertAll(1, ['x', 'y'])(['a', 'b', 'c']); // ['a', 'x', 'y', 'b', 'c']
 * insertAll(1, ['x', 'y'], ['a', 'b', 'c']); // ['a', 'x', 'y', 'b', 'c']
 * ```
 */
export function insertAll<T>(index: number, values: readonly T[]): (arr: readonly T[]) => T[];
export function insertAll<T>(index: number, values: readonly T[], arr: readonly T[]): T[];
export function insertAll<T>(index: number, values: readonly T[], arr?: readonly T[]) {
  const exec = (arr: readonly T[]): T[] => {
    const result = arr.slice() as T[];
    result.splice(index, 0, ...values);
    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Replaces the element at the specified index.
 * @example
 * ```ts
 * update(1, 'x')(['a', 'b', 'c']); // ['a', 'x', 'c']
 * update(1, 'x', ['a', 'b', 'c']); // ['a', 'x', 'c']
 * ```
 */
export function update<T>(index: number, value: T): (arr: readonly T[]) => T[];
export function update<T>(index: number, value: T, arr: readonly T[]): T[];
export function update<T>(index: number, value: T, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): T[] => {
    const result = arr.slice() as T[];
    const idx = index < 0 ? arr.length + index : index;
    if (idx >= 0 && idx < arr.length) {
      result[idx] = value;
    }
    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Applies a function to the element at the specified index.
 * @example
 * ```ts
 * adjust(1, x => x.toUpperCase())(['a', 'b', 'c']); // ['a', 'B', 'c']
 * adjust(1, x => x.toUpperCase(), ['a', 'b', 'c']); // ['a', 'B', 'c']
 * ```
 */
export function adjust<T>(index: number, fn: (value: T) => T): (arr: readonly T[]) => T[];
export function adjust<T>(index: number, fn: (value: T) => T, arr: readonly T[]): T[];
export function adjust<T>(index: number, fn: (value: T) => T, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): T[] => {
    const result = arr.slice() as T[];
    const idx = index < 0 ? arr.length + index : index;
    if (idx >= 0 && idx < arr.length) {
      result[idx] = fn(arr[idx] as T);
    }
    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Moves an element from one index to another.
 * @example
 * ```ts
 * move(0, 2)(['a', 'b', 'c', 'd']); // ['b', 'c', 'a', 'd']
 * move(0, 2, ['a', 'b', 'c', 'd']); // ['b', 'c', 'a', 'd']
 * ```
 */
export function move<T>(from: number, to: number): (arr: readonly T[]) => T[];
export function move<T>(from: number, to: number, arr: readonly T[]): T[];
export function move<T>(from: number, to: number, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): T[] => {
    const result = arr.slice() as T[];
    const len = result.length;
    const fromIdx = from < 0 ? len + from : from;
    const toIdx = to < 0 ? len + to : to;
    if (fromIdx < 0 || fromIdx >= len || toIdx < 0 || toIdx >= len) {
      return result;
    }
    const [item] = result.splice(fromIdx, 1);
    result.splice(toIdx, 0, item!);
    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Inserts a separator between each element.
 * @example
 * ```ts
 * intersperse('-')(['a', 'b', 'c']); // ['a', '-', 'b', '-', 'c']
 * intersperse('-', ['a', 'b', 'c']); // ['a', '-', 'b', '-', 'c']
 * ```
 */
export function intersperse<T>(separator: T): (arr: readonly T[]) => T[];
export function intersperse<T>(separator: T, arr: readonly T[]): T[];
export function intersperse<T>(separator: T, arr?: readonly T[]) {
  // Fast path with pre-allocated array
  if (arr !== undefined) {
    const len = arr.length;
    if (len <= 1) return arr.slice() as T[];
    const result = new Array<T>(len * 2 - 1);
    result[0] = arr[0] as T;
    for (let i = 1; i < len; i++) {
      result[i * 2 - 1] = separator;
      result[i * 2] = arr[i] as T;
    }
    return result;
  }
  return (arr: readonly T[]): T[] => {
    const len = arr.length;
    if (len <= 1) return arr.slice() as T[];
    const result = new Array<T>(len * 2 - 1);
    result[0] = arr[0] as T;
    for (let i = 1; i < len; i++) {
      result[i * 2 - 1] = separator;
      result[i * 2] = arr[i] as T;
    }
    return result;
  };
}

/**
 * Splits an array at the specified index.
 * @example
 * ```ts
 * splitAt(2)([1, 2, 3, 4, 5]); // [[1, 2], [3, 4, 5]]
 * splitAt(2, [1, 2, 3, 4, 5]); // [[1, 2], [3, 4, 5]]
 * ```
 */
export function splitAt<T>(index: number): (arr: readonly T[]) => [T[], T[]];
export function splitAt<T>(index: number, arr: readonly T[]): [T[], T[]];
export function splitAt<T>(index: number, arr?: readonly T[]) {
  // Fast path for direct 2-arg calls
  if (arr !== undefined) {
    return [arr.slice(0, index) as T[], arr.slice(index) as T[]];
  }
  return (arr: readonly T[]): [T[], T[]] => [arr.slice(0, index) as T[], arr.slice(index) as T[]];
}

/**
 * Splits an array when the predicate returns true.
 * @example
 * ```ts
 * splitWhen((x: number) => x > 3)([1, 2, 3, 4, 5]); // [[1, 2, 3], [4, 5]]
 * ```
 */
export function splitWhen<T>(predicate: Predicate<T>): (arr: readonly T[]) => [T[], T[]];
export function splitWhen<T>(predicate: Predicate<T>, arr: readonly T[]): [T[], T[]];
export function splitWhen<T>(predicate: Predicate<T>, arr?: readonly T[]) {
  // Fast path for direct 2-arg calls
  if (arr !== undefined) {
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i] as T, i)) {
        return [arr.slice(0, i) as T[], arr.slice(i) as T[]];
      }
    }
    return [arr.slice() as T[], []];
  }
  return (arr: readonly T[]): [T[], T[]] => {
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i] as T, i)) {
        return [arr.slice(0, i) as T[], arr.slice(i) as T[]];
      }
    }
    return [arr.slice() as T[], []];
  };
}

/**
 * Removes specified values from an array.
 * @example
 * ```ts
 * without([2, 4])([1, 2, 3, 4, 5]); // [1, 3, 5]
 * without([2, 4], [1, 2, 3, 4, 5]); // [1, 3, 5]
 * ```
 */
export function without<T>(values: readonly T[]): (arr: readonly T[]) => T[];
export function without<T>(values: readonly T[], arr: readonly T[]): T[];
export function without<T>(values: readonly T[], arr?: readonly T[]) {
  const exec = (arr: readonly T[]): T[] => {
    const exclude = new Set(values);
    const result: T[] = [];
    for (let i = 0; i < arr.length; i++) {
      if (!exclude.has(arr[i] as T)) result.push(arr[i] as T);
    }
    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Returns elements that are in either array but not both.
 * @example
 * ```ts
 * symmetricDifference([2, 3, 4])([1, 2, 3]); // [1, 4]
 * symmetricDifference([1, 2, 3], [2, 3, 4]); // [1, 4]
 * ```
 */
export function symmetricDifference<T>(other: readonly T[]): (arr: readonly T[]) => T[];
export function symmetricDifference<T>(arr: readonly T[], other: readonly T[]): T[];
export function symmetricDifference<T>(arrOrOther: readonly T[], other?: readonly T[]) {
  if (other === undefined) {
    const otherSet = new Set(arrOrOther);
    return (arr: readonly T[]): T[] => {
      const arrSet = new Set(arr);
      const result: T[] = [];
      for (let i = 0; i < arr.length; i++) {
        if (!otherSet.has(arr[i] as T)) result.push(arr[i] as T);
      }
      for (let i = 0; i < arrOrOther.length; i++) {
        if (!arrSet.has(arrOrOther[i] as T)) result.push(arrOrOther[i] as T);
      }
      return result;
    };
  }
  const arrSet = new Set(arrOrOther);
  const otherSet = new Set(other);
  const result: T[] = [];
  for (let i = 0; i < arrOrOther.length; i++) {
    if (!otherSet.has(arrOrOther[i] as T)) result.push(arrOrOther[i] as T);
  }
  for (let i = 0; i < other.length; i++) {
    if (!arrSet.has(other[i] as T)) result.push(other[i] as T);
  }
  return result;
}

/**
 * Transposes a 2D array (swaps rows and columns).
 * @example
 * ```ts
 * transpose([[1, 2, 3], [4, 5, 6]]); // [[1, 4], [2, 5], [3, 6]]
 * ```
 */
export function transpose<T>(arr: readonly (readonly T[])[]): T[][] {
  if (arr.length === 0) return [];
  const maxLen = Math.max(...arr.map(row => row.length));
  const result: T[][] = [];
  for (let i = 0; i < maxLen; i++) {
    const row: T[] = [];
    for (let j = 0; j < arr.length; j++) {
      if (i < arr[j]!.length) {
        row.push(arr[j]![i]!);
      }
    }
    result.push(row);
  }
  return result;
}

// ==================== Additional Boolean Operations ====================

/**
 * Tests if no element matches predicate.
 * @example
 * ```ts
 * none((x: number) => x > 5)([1, 2, 3]); // true
 * none((x: number) => x > 5, [1, 2, 3]); // true
 * ```
 */
export function none<T>(predicate: Predicate<T>): (arr: readonly T[]) => boolean;
export function none<T>(predicate: Predicate<T>, arr: readonly T[]): boolean;
export function none<T>(predicate: Predicate<T>, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): boolean => {
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i] as T, i)) return false;
    }
    return true;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Filters elements that do NOT match predicate (opposite of filter).
 * @example
 * ```ts
 * reject((x: number) => x % 2 === 0)([1, 2, 3, 4]); // [1, 3]
 * reject((x: number) => x % 2 === 0, [1, 2, 3, 4]); // [1, 3]
 * ```
 */
export function reject<T>(predicate: Predicate<T>): (arr: readonly T[]) => T[];
export function reject<T>(predicate: Predicate<T>, arr: readonly T[]): T[];
export function reject<T>(predicate: Predicate<T>, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): T[] => {
    const result: T[] = [];
    for (let i = 0; i < arr.length; i++) {
      if (!predicate(arr[i] as T, i)) result.push(arr[i] as T);
    }
    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

// ==================== Additional Search Operations ====================

/**
 * Finds the index of the last element matching predicate.
 * @example
 * ```ts
 * findLastIndex((x: number) => x % 2 === 0)([1, 2, 3, 4, 5]); // 3
 * findLastIndex((x: number) => x % 2 === 0, [1, 2, 3, 4, 5]); // 3
 * ```
 */
export function findLastIndex<T>(predicate: Predicate<T>): (arr: readonly T[]) => number;
export function findLastIndex<T>(predicate: Predicate<T>, arr: readonly T[]): number;
export function findLastIndex<T>(predicate: Predicate<T>, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): number => {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (predicate(arr[i] as T, i)) return i;
    }
    return -1;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Returns the only element if array has exactly one, otherwise throws.
 * @example
 * ```ts
 * single([42]); // 42
 * single([]); // throws Error
 * single([1, 2]); // throws Error
 * ```
 */
export function single<T>(arr: readonly T[]): T;
export function single<T>(predicate: Predicate<T>): (arr: readonly T[]) => T;
export function single<T>(predicate: Predicate<T>, arr: readonly T[]): T;
export function single<T>(arrOrPred: readonly T[] | Predicate<T>, arr?: readonly T[]) {
  if (Array.isArray(arrOrPred)) {
    if (arrOrPred.length !== 1) {
      throw new Error(arrOrPred.length === 0 ? 'Sequence contains no elements' : 'Sequence contains more than one element');
    }
    return arrOrPred[0];
  }
  const predicate = arrOrPred as Predicate<T>;
  const exec = (arr: readonly T[]): T => {
    let found: T | undefined;
    let count = 0;
    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i] as T, i)) {
        found = arr[i] as T;
        count++;
        if (count > 1) throw new Error('Sequence contains more than one matching element');
      }
    }
    if (count === 0) throw new Error('Sequence contains no matching element');
    return found!;
  };
  return arr === undefined ? exec : exec(arr);
}

// ==================== Additional Set Operations ====================

/**
 * Returns unique elements using a custom equality function.
 * @example
 * ```ts
 * uniqWith((a, b) => a.id === b.id)([{id: 1}, {id: 2}, {id: 1}]); // [{id: 1}, {id: 2}]
 * ```
 */
export function uniqWith<T>(compareFn: (a: T, b: T) => boolean): (arr: readonly T[]) => T[];
export function uniqWith<T>(compareFn: (a: T, b: T) => boolean, arr: readonly T[]): T[];
export function uniqWith<T>(compareFn: (a: T, b: T) => boolean, arr?: readonly T[]) {
  const exec = (arr: readonly T[]): T[] => {
    const result: T[] = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i] as T;
      let isDuplicate = false;
      for (let j = 0; j < result.length; j++) {
        if (compareFn(item, result[j]!)) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) result.push(item);
    }
    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

// ==================== Transducers ====================

/**
 * Transducers enable single-pass composition of array operations.
 * Unlike pipe() which creates intermediate arrays, transducers compose
 * the operations themselves, then execute in a single pass.
 *
 * Note: pipe() automatically uses transducers when all functions support them,
 * so you rarely need to use these directly. They're exported for advanced use cases.
 *
 * @example
 * ```ts
 * // Automatic optimization - pipe detects transducers and fuses them!
 * const result = pipe(
 *   filter((x: number) => x % 2 === 0),
 *   map((x: number) => x * 2),
 *   take(5)
 * )(arr); // Single pass execution!
 *
 * // Manual transducer composition (for advanced use)
 * const result = into(
 *   [],
 *   comp(
 *     filterT((x: number) => x % 2 === 0),
 *     mapT((x: number) => x * 2),
 *     takeT(5)
 *   ),
 *   arr
 * );
 * ```
 */

/**
 * Transducer filter - filters elements by predicate.
 * @example
 * ```ts
 * const xf = filterT((x: number) => x > 0);
 * ```
 */
export function filterT<T>(predicate: (x: T, i: number) => boolean): Transducer<T, T> {
  return <R>(rf: Reducer<R, T>): Reducer<R, T> => {
    let i = 0;
    return (acc, x) => predicate(x, i++) ? rf(acc, x) : acc;
  };
}

/**
 * Transducer map - transforms elements.
 * @example
 * ```ts
 * const xf = mapT((x: number) => x * 2);
 * ```
 */
export function mapT<A, B>(fn: (x: A, i: number) => B): Transducer<A, B> {
  return <R>(rf: Reducer<R, B>): Reducer<R, A> => {
    let i = 0;
    return (acc, x) => rf(acc, fn(x, i++));
  };
}

/**
 * Transducer flatMap - maps and flattens.
 * @example
 * ```ts
 * const xf = flatMapT((x: number) => [x, x * 2]);
 * ```
 */
export function flatMapT<A, B>(fn: (x: A, i: number) => readonly B[]): Transducer<A, B> {
  return <R>(rf: Reducer<R, B>): Reducer<R, A> => {
    let i = 0;
    return (acc, x) => {
      const items = fn(x, i++);
      let result: R | Reduced<R> = acc;
      for (let j = 0; j < items.length; j++) {
        result = rf(unreduced(result), items[j]!);
        if (isReduced(result)) break;
      }
      return result;
    };
  };
}

/**
 * Transducer take - takes first n elements.
 * @example
 * ```ts
 * const xf = takeT(5);
 * ```
 */
export function takeT<T>(n: number): Transducer<T, T> {
  return <R>(rf: Reducer<R, T>): Reducer<R, T> => {
    let taken = 0;
    return (acc, x) => {
      if (taken >= n) return reduced(acc);
      taken++;
      const result = rf(acc, x);
      return taken >= n ? reduced(unreduced(result)) : result;
    };
  };
}

/**
 * Transducer skip - skips first n elements.
 * @example
 * ```ts
 * const xf = skipT(5);
 * ```
 */
export function skipT<T>(n: number): Transducer<T, T> {
  return <R>(rf: Reducer<R, T>): Reducer<R, T> => {
    let skipped = 0;
    return (acc, x) => {
      if (skipped < n) {
        skipped++;
        return acc;
      }
      return rf(acc, x);
    };
  };
}

/**
 * Transducer takeWhile - takes while predicate is true.
 * @example
 * ```ts
 * const xf = takeWhileT((x: number) => x < 5);
 * ```
 */
export function takeWhileT<T>(predicate: (x: T, i: number) => boolean): Transducer<T, T> {
  return <R>(rf: Reducer<R, T>): Reducer<R, T> => {
    let i = 0;
    let done = false;
    return (acc, x) => {
      if (done) return reduced(acc);
      if (!predicate(x, i++)) {
        done = true;
        return reduced(acc);
      }
      return rf(acc, x);
    };
  };
}

/**
 * Transducer skipWhile - skips while predicate is true.
 * @example
 * ```ts
 * const xf = skipWhileT((x: number) => x < 5);
 * ```
 */
export function skipWhileT<T>(predicate: (x: T, i: number) => boolean): Transducer<T, T> {
  return <R>(rf: Reducer<R, T>): Reducer<R, T> => {
    let i = 0;
    let skipping = true;
    return (acc, x) => {
      if (skipping) {
        if (predicate(x, i++)) return acc;
        skipping = false;
      }
      return rf(acc, x);
    };
  };
}

/**
 * Transducer distinct - removes duplicates.
 * @example
 * ```ts
 * const xf = distinctT();
 * const xf2 = distinctT((x: User) => x.id);
 * ```
 */
export function distinctT<T>(): Transducer<T, T>;
export function distinctT<T, K>(keyFn: (x: T) => K): Transducer<T, T>;
export function distinctT<T, K>(keyFn?: (x: T) => K): Transducer<T, T> {
  return <R>(rf: Reducer<R, T>): Reducer<R, T> => {
    const seen = new Set<T | K>();
    return (acc, x) => {
      const key = keyFn ? keyFn(x) : x;
      if (seen.has(key as T | K)) return acc;
      seen.add(key as T | K);
      return rf(acc, x);
    };
  };
}

/**
 * Composes transducers from left to right.
 * @example
 * ```ts
 * const xf = comp(
 *   filterT((x: number) => x > 0),
 *   mapT((x: number) => x * 2),
 *   takeT(5)
 * );
 * ```
 */
export function comp<A, B>(t1: Transducer<A, B>): Transducer<A, B>;
export function comp<A, B, C>(t1: Transducer<A, B>, t2: Transducer<B, C>): Transducer<A, C>;
export function comp<A, B, C, D>(t1: Transducer<A, B>, t2: Transducer<B, C>, t3: Transducer<C, D>): Transducer<A, D>;
export function comp<A, B, C, D, E>(t1: Transducer<A, B>, t2: Transducer<B, C>, t3: Transducer<C, D>, t4: Transducer<D, E>): Transducer<A, E>;
export function comp<A, B, C, D, E, F>(t1: Transducer<A, B>, t2: Transducer<B, C>, t3: Transducer<C, D>, t4: Transducer<D, E>, t5: Transducer<E, F>): Transducer<A, F>;
export function comp(...xfs: Transducer<unknown, unknown>[]): Transducer<unknown, unknown> {
  return <R>(rf: Reducer<R, unknown>): Reducer<R, unknown> => {
    // Compose right-to-left (transducers compose backwards)
    let composed = rf;
    for (let i = xfs.length - 1; i >= 0; i--) {
      composed = xfs[i]!(composed);
    }
    return composed;
  };
}

/**
 * Transduce - apply transducer to array and collect results.
 * @example
 * ```ts
 * const result = transduce(
 *   comp(filterT(x => x > 0), mapT(x => x * 2)),
 *   [1, -2, 3, 4]
 * ); // [2, 6, 8]
 * ```
 */
export function transduce<A, B>(xf: Transducer<A, B>): (arr: readonly A[]) => B[];
export function transduce<A, B>(xf: Transducer<A, B>, arr: readonly A[]): B[];
export function transduce<A, B>(xf: Transducer<A, B>, arr?: readonly A[]) {
  const exec = (arr: readonly A[]): B[] => {
    const push: Reducer<B[], B> = (acc, x) => {
      acc.push(x);
      return acc;
    };
    const rf = xf(push);
    const result: B[] = [];
    for (let i = 0; i < arr.length; i++) {
      const res = rf(result, arr[i] as A);
      if (isReduced(res)) break;
    }
    return result;
  };
  return arr === undefined ? exec : exec(arr);
}

/**
 * Into - transduce into a target collection.
 * @example
 * ```ts
 * const result = into(
 *   [],
 *   comp(filterT(x => x > 0), mapT(x => x * 2)),
 *   [1, -2, 3, 4]
 * ); // [2, 6, 8]
 * ```
 */
export function into<A, B>(target: B[], xf: Transducer<A, B>, arr: readonly A[]): B[] {
  const push: Reducer<B[], B> = (acc, x) => {
    acc.push(x);
    return acc;
  };
  const rf = xf(push);
  for (let i = 0; i < arr.length; i++) {
    const res = rf(target, arr[i] as A);
    if (isReduced(res)) break;
  }
  return target;
}

/**
 * Creates a transducer-based pipe for single-pass execution.
 * This is the fastest way to chain filter/map/take operations.
 *
 * @example
 * ```ts
 * // Single pass - 4-8x faster than regular pipe!
 * const result = pipeT(
 *   filterT((x: number) => x % 2 === 0),
 *   mapT((x: number) => x * 2),
 *   takeT(5)
 * )([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 * // [4, 8, 12, 16, 20]
 * ```
 */
export function pipeT<A, B>(t1: Transducer<A, B>): (arr: readonly A[]) => B[];
export function pipeT<A, B, C>(t1: Transducer<A, B>, t2: Transducer<B, C>): (arr: readonly A[]) => C[];
export function pipeT<A, B, C, D>(t1: Transducer<A, B>, t2: Transducer<B, C>, t3: Transducer<C, D>): (arr: readonly A[]) => D[];
export function pipeT<A, B, C, D, E>(t1: Transducer<A, B>, t2: Transducer<B, C>, t3: Transducer<C, D>, t4: Transducer<D, E>): (arr: readonly A[]) => E[];
export function pipeT<A, B, C, D, E, F>(t1: Transducer<A, B>, t2: Transducer<B, C>, t3: Transducer<C, D>, t4: Transducer<D, E>, t5: Transducer<E, F>): (arr: readonly A[]) => F[];
export function pipeT(...xfs: Transducer<unknown, unknown>[]): (arr: readonly unknown[]) => unknown[] {
  const xf = comp(...xfs as [Transducer<unknown, unknown>]);
  return (arr: readonly unknown[]): unknown[] => transduce(xf, arr);
}

// ==================== Lazy Evaluation ====================

/**
 * Creates a lazy pipeline for early termination scenarios.
 * Use when you need to process large arrays but only need a few results.
 *
 * @example
 * ```ts
 * // Only processes ~20 elements, not 1 million
 * lazy([...million items...])
 *   .filter(x => x % 2 === 0)
 *   .map(x => x * 2)
 *   .take(10)
 *   .toArray();
 * ```
 */
export function lazy<T>(arr: readonly T[]): LazyPipeline<T> {
  return new LazyPipeline(arr);
}

class LazyPipeline<T> {
  private source: Iterable<T>;
  private ops: Array<(source: Iterable<unknown>) => Generator<unknown>> = [];

  constructor(source: Iterable<T>) {
    this.source = source;
  }

  filter(predicate: (value: T, index: number) => boolean): LazyPipeline<T> {
    this.ops.push(function* (src) {
      let i = 0;
      for (const item of src) {
        if (predicate(item as T, i++)) yield item;
      }
    });
    return this;
  }

  map<U>(fn: (value: T, index: number) => U): LazyPipeline<U> {
    this.ops.push(function* (src) {
      let i = 0;
      for (const item of src) {
        yield fn(item as T, i++);
      }
    });
    return this as unknown as LazyPipeline<U>;
  }

  flatMap<U>(fn: (value: T, index: number) => Iterable<U>): LazyPipeline<U> {
    this.ops.push(function* (src) {
      let i = 0;
      for (const item of src) {
        yield* fn(item as T, i++);
      }
    });
    return this as unknown as LazyPipeline<U>;
  }

  take(n: number): LazyPipeline<T> {
    this.ops.push(function* (src) {
      let count = 0;
      for (const item of src) {
        if (count++ >= n) break;
        yield item;
      }
    });
    return this;
  }

  skip(n: number): LazyPipeline<T> {
    this.ops.push(function* (src) {
      let count = 0;
      for (const item of src) {
        if (count++ >= n) yield item;
      }
    });
    return this;
  }

  takeWhile(predicate: (value: T, index: number) => boolean): LazyPipeline<T> {
    this.ops.push(function* (src) {
      let i = 0;
      for (const item of src) {
        if (!predicate(item as T, i++)) break;
        yield item;
      }
    });
    return this;
  }

  skipWhile(predicate: (value: T, index: number) => boolean): LazyPipeline<T> {
    this.ops.push(function* (src) {
      let i = 0;
      let skipping = true;
      for (const item of src) {
        if (skipping && predicate(item as T, i++)) continue;
        skipping = false;
        yield item;
      }
    });
    return this;
  }

  distinct(): LazyPipeline<T>;
  distinct<K>(keyFn: (value: T) => K): LazyPipeline<T>;
  distinct<K>(keyFn?: (value: T) => K): LazyPipeline<T> {
    if (keyFn) {
      this.ops.push(function* (src) {
        const seen = new Set<K>();
        for (const item of src) {
          const key = keyFn(item as T);
          if (!seen.has(key)) {
            seen.add(key);
            yield item;
          }
        }
      });
    } else {
      this.ops.push(function* (src) {
        const seen = new Set<T>();
        for (const item of src) {
          if (!seen.has(item as T)) {
            seen.add(item as T);
            yield item;
          }
        }
      });
    }
    return this;
  }

  // Terminal operations

  toArray(): T[] {
    let current: Iterable<unknown> = this.source;
    for (const op of this.ops) {
      current = op(current);
    }
    return [...current] as T[];
  }

  first(): T;
  first(predicate: (value: T, index: number) => boolean): T;
  first(predicate?: (value: T, index: number) => boolean): T {
    let current: Iterable<unknown> = this.source;
    for (const op of this.ops) {
      current = op(current);
    }

    let i = 0;
    for (const item of current) {
      if (!predicate || predicate(item as T, i++)) {
        return item as T;
      }
    }
    throw new Error('Sequence contains no matching element');
  }

  firstOr(defaultValue: T): T;
  firstOr(defaultValue: T, predicate: (value: T, index: number) => boolean): T;
  firstOr(defaultValue: T, predicate?: (value: T, index: number) => boolean): T {
    let current: Iterable<unknown> = this.source;
    for (const op of this.ops) {
      current = op(current);
    }

    let i = 0;
    for (const item of current) {
      if (!predicate || predicate(item as T, i++)) {
        return item as T;
      }
    }
    return defaultValue;
  }

  count(): number;
  count(predicate: (value: T, index: number) => boolean): number;
  count(predicate?: (value: T, index: number) => boolean): number {
    let current: Iterable<unknown> = this.source;
    for (const op of this.ops) {
      current = op(current);
    }

    let c = 0;
    let i = 0;
    for (const item of current) {
      if (!predicate || predicate(item as T, i++)) c++;
    }
    return c;
  }

  some(predicate: (value: T, index: number) => boolean): boolean {
    let current: Iterable<unknown> = this.source;
    for (const op of this.ops) {
      current = op(current);
    }

    let i = 0;
    for (const item of current) {
      if (predicate(item as T, i++)) return true;
    }
    return false;
  }

  every(predicate: (value: T, index: number) => boolean): boolean {
    let current: Iterable<unknown> = this.source;
    for (const op of this.ops) {
      current = op(current);
    }

    let i = 0;
    for (const item of current) {
      if (!predicate(item as T, i++)) return false;
    }
    return true;
  }

  reduce<R>(fn: (acc: R, value: T, index: number) => R, initial: R): R {
    let current: Iterable<unknown> = this.source;
    for (const op of this.ops) {
      current = op(current);
    }

    let acc = initial;
    let i = 0;
    for (const item of current) {
      acc = fn(acc, item as T, i++);
    }
    return acc;
  }

  forEach(fn: (value: T, index: number) => void): void {
    let current: Iterable<unknown> = this.source;
    for (const op of this.ops) {
      current = op(current);
    }

    let i = 0;
    for (const item of current) {
      fn(item as T, i++);
    }
  }

  *[Symbol.iterator](): Generator<T> {
    let current: Iterable<unknown> = this.source;
    for (const op of this.ops) {
      current = op(current);
    }
    yield* current as Iterable<T>;
  }
}
