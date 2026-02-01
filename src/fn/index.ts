/**
 * Vorpal Function-Based API
 *
 * High-performance array operations with zero wrapper overhead.
 * All functions are curried (data-last) for pipe/compose compatibility.
 *
 * @example
 * ```ts
 * import { V } from 'vorpal/fn';
 *
 * // Pipe style
 * const result = V.pipe(
 *   V.filter((x: number) => x % 2 === 0),
 *   V.map((x: number) => x * 2),
 *   V.take(5)
 * )([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
 *
 * // Direct calls
 * V.sum([1, 2, 3]); // 6
 * V.last([1, 2, 3]); // 3
 * V.reverse([1, 2, 3]); // [3, 2, 1]
 * ```
 */

import * as fns from './functions.js';

/**
 * Vorpal function-based API namespace.
 * All functions are available as V.functionName()
 */
export const V = {
  // Pipe / Compose
  pipe: fns.pipe,
  compose: fns.compose,

  // Transformation
  filter: fns.filter,
  reject: fns.reject,
  map: fns.map,
  flatMap: fns.flatMap,
  reverse: fns.reverse,
  concat: fns.concat,
  zip: fns.zip,
  chunk: fns.chunk,
  flatten: fns.flatten,
  transpose: fns.transpose,

  // Array Manipulation
  append: fns.append,
  prepend: fns.prepend,
  insert: fns.insert,
  insertAll: fns.insertAll,
  update: fns.update,
  adjust: fns.adjust,
  move: fns.move,
  intersperse: fns.intersperse,
  splitAt: fns.splitAt,
  splitWhen: fns.splitWhen,

  // Slicing
  take: fns.take,
  takeWhile: fns.takeWhile,
  takeLast: fns.takeLast,
  takeLastWhile: fns.takeLastWhile,
  skip: fns.skip,
  skipWhile: fns.skipWhile,
  dropLast: fns.dropLast,
  dropLastWhile: fns.dropLastWhile,
  slice: fns.slice,

  // Element Access
  first: fns.first,
  last: fns.last,
  at: fns.at,
  tail: fns.tail,
  init: fns.init,
  single: fns.single,

  // Search
  find: fns.find,
  findIndex: fns.findIndex,
  findLastIndex: fns.findLastIndex,
  indexOf: fns.indexOf,
  lastIndexOf: fns.lastIndexOf,

  // Boolean
  every: fns.every,
  some: fns.some,
  none: fns.none,
  includes: fns.includes,
  isEmpty: fns.isEmpty,

  // Aggregation
  count: fns.count,
  sum: fns.sum,
  average: fns.average,
  min: fns.min,
  max: fns.max,
  minBy: fns.minBy,
  maxBy: fns.maxBy,
  reduce: fns.reduce,
  reduceRight: fns.reduceRight,
  scan: fns.scan,

  // Grouping
  groupBy: fns.groupBy,
  groupByMap: fns.groupByMap,
  keyBy: fns.keyBy,
  partition: fns.partition,
  aggregateBy: fns.aggregateBy,

  // Set Operations
  distinct: fns.distinct,
  difference: fns.difference,
  intersection: fns.intersection,
  union: fns.union,
  symmetricDifference: fns.symmetricDifference,
  differenceBy: fns.differenceBy,
  exceptBy: fns.exceptBy,
  intersectionBy: fns.intersectionBy,
  unionBy: fns.unionBy,
  uniqWith: fns.uniqWith,
  without: fns.without,

  // Join Operations
  innerJoin: fns.innerJoin,
  leftJoin: fns.leftJoin,
  rightJoin: fns.rightJoin,
  fullJoin: fns.fullJoin,
  crossJoin: fns.crossJoin,
  groupJoin: fns.groupJoin,
  semiJoin: fns.semiJoin,
  antiJoin: fns.antiJoin,

  // Windowing Operations
  aperture: fns.aperture,
  slidingWindow: fns.slidingWindow,
  pairwise: fns.pairwise,

  // Comparison Operations
  sequenceEqual: fns.sequenceEqual,
  startsWith: fns.startsWith,
  endsWith: fns.endsWith,

  // Combinatorial Operations
  permutations: fns.permutations,
  combinations: fns.combinations,

  // Randomization Operations
  shuffle: fns.shuffle,
  sample: fns.sample,
  randomElement: fns.randomElement,

  // Search Operations
  binarySearch: fns.binarySearch,
  binarySearchIndex: fns.binarySearchIndex,

  // Sorting
  sortBy: fns.sortBy,
  sortByDesc: fns.sortByDesc,
  sort: fns.sort,

  // Utility
  forEach: fns.forEach,
  tap: fns.tap,
  join: fns.join,

  // Generators
  range: fns.range,
  repeat: fns.repeat,
  times: fns.times,

  // Pagination
  page: fns.page,
  paginate: fns.paginate,

  // Lazy evaluation
  lazy: fns.lazy,

  // Transducers (single-pass composition)
  filterT: fns.filterT,
  mapT: fns.mapT,
  flatMapT: fns.flatMapT,
  takeT: fns.takeT,
  skipT: fns.skipT,
  takeWhileT: fns.takeWhileT,
  skipWhileT: fns.skipWhileT,
  distinctT: fns.distinctT,
  comp: fns.comp,
  transduce: fns.transduce,
  into: fns.into,
  pipeT: fns.pipeT,
} as const;

// Type for the V namespace
export type VorpalFn = typeof V;

// Also export individual functions for tree-shaking
export {
  // Pipe / Compose
  pipe,
  compose,

  // Transformation
  filter,
  reject,
  map,
  flatMap,
  reverse,
  concat,
  zip,
  chunk,
  flatten,
  transpose,

  // Array Manipulation
  append,
  prepend,
  insert,
  insertAll,
  update,
  adjust,
  move,
  intersperse,
  splitAt,
  splitWhen,

  // Slicing
  take,
  takeWhile,
  takeLast,
  takeLastWhile,
  skip,
  skipWhile,
  dropLast,
  dropLastWhile,
  slice,

  // Element Access
  first,
  last,
  at,
  tail,
  init,
  single,

  // Search
  find,
  findIndex,
  findLastIndex,
  indexOf,
  lastIndexOf,

  // Boolean
  every,
  some,
  none,
  includes,
  isEmpty,

  // Aggregation
  count,
  sum,
  average,
  min,
  max,
  minBy,
  maxBy,
  reduce,
  reduceRight,
  scan,

  // Grouping
  groupBy,
  groupByMap,
  keyBy,
  partition,
  aggregateBy,

  // Set Operations
  distinct,
  difference,
  intersection,
  union,
  symmetricDifference,
  differenceBy,
  exceptBy,
  intersectionBy,
  unionBy,
  uniqWith,
  without,

  // Join Operations
  innerJoin,
  leftJoin,
  rightJoin,
  fullJoin,
  crossJoin,
  groupJoin,
  semiJoin,
  antiJoin,

  // Windowing Operations
  aperture,
  slidingWindow,
  pairwise,

  // Comparison Operations
  sequenceEqual,
  startsWith,
  endsWith,

  // Combinatorial Operations
  permutations,
  combinations,

  // Randomization Operations
  shuffle,
  sample,
  randomElement,

  // Search Operations
  binarySearch,
  binarySearchIndex,

  // Sorting
  sortBy,
  sortByDesc,
  sort,

  // Utility
  forEach,
  tap,
  join,

  // Generators
  range,
  repeat,
  times,

  // Pagination
  page,
  paginate,

  // Lazy
  lazy,

  // Transducers
  filterT,
  mapT,
  flatMapT,
  takeT,
  skipT,
  takeWhileT,
  skipWhileT,
  distinctT,
  comp,
  transduce,
  into,
  pipeT,
} from './functions.js';

// Type exports
export type { PaginationResult } from './functions.js';
