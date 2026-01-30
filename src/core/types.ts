/**
 * Predicate function for filtering operations.
 * @param item - The current element
 * @param index - The zero-based index of the element
 * @returns true if the element should be included
 */
export type Predicate<T> = (item: T, index: number) => boolean;

/**
 * Type guard predicate that narrows the type.
 * @param item - The current element
 * @param index - The zero-based index of the element
 * @returns true if item is of type U
 */
export type TypeGuard<T, U extends T> = (item: T, index: number) => item is U;

/**
 * Selector function for projection operations.
 * @param item - The current element
 * @param index - The zero-based index of the element
 * @returns The transformed value
 */
export type Selector<T, R> = (item: T, index: number) => R;

/**
 * Key selector for grouping and ordering operations.
 * @param item - The current element
 * @returns The key value
 */
export type KeySelector<T, K> = (item: T) => K;

/**
 * Comparer function for ordering operations.
 * @param a - First element
 * @param b - Second element
 * @returns Negative if a < b, positive if a > b, zero if equal
 */
export type Comparer<T> = (a: T, b: T) => number;

/**
 * Equality comparer for set operations.
 * @param a - First element
 * @param b - Second element
 * @returns true if elements are equal
 */
export type EqualityComparer<T> = (a: T, b: T) => boolean;

/**
 * Grouping result containing a key and its associated values.
 */
export interface Grouping<K, V> {
  readonly key: K;
  readonly values: V[];
}

/**
 * Action function for forEach operations.
 */
export type Action<T> = (item: T, index: number) => void;
