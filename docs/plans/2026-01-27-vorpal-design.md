# Vorpal Design Document

**Date:** 2026-01-27
**Status:** Approved

## Overview

Vorpal is a high-performance TypeScript library for array manipulation with LINQ-style fluent APIs. It provides both lazy and eager evaluation modes, maximum type safety, and advanced performance optimizations.

## Core Decisions

| Aspect | Decision |
|--------|----------|
| **Name** | Vorpal |
| **Wrapper** | `V()` function |
| **Modules** | `vorpal/lazy` and `vorpal/eager` |
| **API Style** | Fluent/chained |
| **Operations** | Full LINQ parity (40+ operators) |
| **Type Safety** | Maximum - full inference, type guards, narrowing |
| **Optimizations** | Iterator-based, fusion, fast paths, pooling, batching |
| **Distribution** | ESM only, single entry points |
| **Testing** | Vitest + benchmarks vs native/Lodash/Ramda |
| **Docs** | TSDoc + generated API docs + interactive playground |

## Usage Example

```typescript
import { V } from 'vorpal/lazy';

const result = V(users)
  .where(u => u.active)
  .groupBy(u => u.department)
  .select(g => ({
    department: g.key,
    avgSalary: V(g.values).average(u => u.salary)
  }))
  .orderByDescending(x => x.avgSalary)
  .toArray();
```

## Project Structure

```
vorpal/
├── src/
│   ├── core/
│   │   ├── types.ts           # Core type definitions, generics
│   │   ├── iterator.ts        # Base iterator protocol
│   │   └── utils.ts           # Shared utilities
│   ├── lazy/
│   │   ├── index.ts           # Entry: export { V }
│   │   ├── VorpalLazy.ts      # Lazy wrapper class
│   │   └── operators/         # One file per operator category
│   │       ├── filtering.ts
│   │       ├── projection.ts
│   │       ├── ordering.ts
│   │       ├── aggregation.ts
│   │       ├── element.ts
│   │       ├── grouping.ts
│   │       ├── set.ts
│   │       ├── joining.ts
│   │       └── quantifiers.ts
│   ├── eager/
│   │   ├── index.ts           # Entry: export { V }
│   │   ├── VorpalEager.ts     # Eager wrapper class
│   │   └── operators/         # Same structure as lazy
│   └── optimizations/
│       ├── fusion.ts          # Operation fusion
│       ├── fastPaths.ts       # Sorted array detection, etc.
│       ├── pool.ts            # Object pooling
│       └── batch.ts           # Batched processing
├── tests/
├── benchmarks/
├── docs/
│   └── playground/            # Interactive REPL
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Core Types

```typescript
// src/core/types.ts

// Predicate with optional type guard support
type Predicate<T> = (item: T, index: number) => boolean;
type TypeGuard<T, U extends T> = (item: T, index: number) => item is U;

// Selector for projections
type Selector<T, R> = (item: T, index: number) => R;

// Comparer for ordering
type Comparer<T> = (a: T, b: T) => number;
type KeySelector<T, K> = (item: T) => K;

// Equality comparer for set operations
type EqualityComparer<T> = (a: T, b: T) => boolean;

// Result types for optional returns
type Option<T> = { hasValue: true; value: T } | { hasValue: false };
```

## Type Inference Examples

```typescript
// Type narrowing with where
V([1, "two", 3])
  .where((x): x is number => typeof x === "number")
  // Result: VorpalLazy<number> - narrowed!

// Type transformation with select
V([{ name: "Alice", age: 30 }])
  .select(x => x.name)
  // Result: VorpalLazy<string>

// Chained with full inference
V(users)
  .where(u => u.active)
  .orderBy(u => u.lastName)
  .select(u => ({ display: `${u.firstName} ${u.lastName}` }))
  .toArray()
  // Result: { display: string }[]
```

## Wrapper Class Design

### Lazy Implementation

```typescript
// src/lazy/VorpalLazy.ts

class VorpalLazy<T> implements Iterable<T> {
  private source: Iterable<T>;
  private operations: Operation[]; // Fusion-ready operation queue

  constructor(source: Iterable<T>) {
    this.source = source;
    this.operations = [];
  }

  // Filtering
  where(predicate: Predicate<T>): VorpalLazy<T>;
  where<U extends T>(guard: TypeGuard<T, U>): VorpalLazy<U>;

  // Projection
  select<R>(selector: Selector<T, R>): VorpalLazy<R>;
  selectMany<R>(selector: Selector<T, Iterable<R>>): VorpalLazy<R>;

  // Terminal operations (force evaluation)
  toArray(): T[];
  toMap<K, V>(keySelector: Selector<T, K>, valueSelector: Selector<T, V>): Map<K, V>;
  toSet(): Set<T>;

  // Iteration protocol
  [Symbol.iterator](): Iterator<T>;
}
```

### Eager Implementation

```typescript
// src/eager/VorpalEager.ts

class VorpalEager<T> {
  private data: T[]; // Always materialized

  constructor(source: Iterable<T>) {
    this.data = Array.from(source);
  }

  // Same method signatures, but each returns new VorpalEager
  // with immediately computed results
  where(predicate: Predicate<T>): VorpalEager<T> {
    return new VorpalEager(this.data.filter(predicate));
  }
}
```

## Complete Operator List

```typescript
interface VorpalOperators<T> {
  // Filtering
  where(predicate: Predicate<T>): Vorpal<T>;
  where<U extends T>(guard: TypeGuard<T, U>): Vorpal<U>;
  distinct(): Vorpal<T>;
  distinctBy<K>(keySelector: KeySelector<T, K>): Vorpal<T>;
  take(count: number): Vorpal<T>;
  skip(count: number): Vorpal<T>;
  takeWhile(predicate: Predicate<T>): Vorpal<T>;
  skipWhile(predicate: Predicate<T>): Vorpal<T>;

  // Projection
  select<R>(selector: Selector<T, R>): Vorpal<R>;
  selectMany<R>(selector: Selector<T, Iterable<R>>): Vorpal<R>;
  cast<U>(): Vorpal<U>;
  ofType<U>(guard: TypeGuard<unknown, U>): Vorpal<U>;

  // Ordering
  orderBy<K>(keySelector: KeySelector<T, K>, comparer?: Comparer<K>): VorpalOrdered<T>;
  orderByDescending<K>(keySelector: KeySelector<T, K>): VorpalOrdered<T>;
  reverse(): Vorpal<T>;

  // VorpalOrdered extends with:
  thenBy<K>(keySelector: KeySelector<T, K>): VorpalOrdered<T>;
  thenByDescending<K>(keySelector: KeySelector<T, K>): VorpalOrdered<T>;

  // Aggregation (terminal)
  count(predicate?: Predicate<T>): number;
  sum(selector?: Selector<T, number>): number;
  average(selector?: Selector<T, number>): number;
  min(selector?: Selector<T, number>): number;
  max(selector?: Selector<T, number>): number;
  aggregate<A>(seed: A, func: (acc: A, item: T) => A): A;

  // Element access (terminal)
  first(predicate?: Predicate<T>): T;           // throws if empty
  firstOrDefault(defaultValue: T): T;
  last(predicate?: Predicate<T>): T;
  lastOrDefault(defaultValue: T): T;
  single(predicate?: Predicate<T>): T;          // throws if not exactly one
  elementAt(index: number): T;

  // Grouping
  groupBy<K>(keySelector: KeySelector<T, K>): Vorpal<Grouping<K, T>>;
  groupBy<K, V>(keySelector: KeySelector<T, K>, valueSelector: Selector<T, V>): Vorpal<Grouping<K, V>>;

  // Set operations
  union(other: Iterable<T>, comparer?: EqualityComparer<T>): Vorpal<T>;
  intersect(other: Iterable<T>, comparer?: EqualityComparer<T>): Vorpal<T>;
  except(other: Iterable<T>, comparer?: EqualityComparer<T>): Vorpal<T>;
  concat(other: Iterable<T>): Vorpal<T>;

  // Joining
  join<I, K, R>(inner: Iterable<I>, outerKey: KeySelector<T, K>, innerKey: KeySelector<I, K>, resultSelector: (outer: T, inner: I) => R): Vorpal<R>;
  groupJoin<I, K, R>(inner: Iterable<I>, outerKey: KeySelector<T, K>, innerKey: KeySelector<I, K>, resultSelector: (outer: T, inner: Iterable<I>) => R): Vorpal<R>;
  zip<U, R>(other: Iterable<U>, resultSelector: (first: T, second: U) => R): Vorpal<R>;

  // Quantifiers (terminal)
  any(predicate?: Predicate<T>): boolean;
  all(predicate: Predicate<T>): boolean;
  contains(item: T, comparer?: EqualityComparer<T>): boolean;

  // Partitioning
  chunk(size: number): Vorpal<T[]>;
  partition(predicate: Predicate<T>): [T[], T[]];  // terminal

  // Terminal conversions
  toArray(): T[];
  toMap<K, V>(keySelector: Selector<T, K>, valueSelector: Selector<T, V>): Map<K, V>;
  toSet(): Set<T>;
  forEach(action: (item: T, index: number) => void): void;
}
```

## Performance Optimizations

### 1. Iterator-based Lazy Evaluation

```typescript
// Each operation returns a generator, no intermediate arrays
function* whereIterator<T>(source: Iterable<T>, predicate: Predicate<T>) {
  let index = 0;
  for (const item of source) {
    if (predicate(item, index++)) yield item;
  }
}
```

### 2. Operation Fusion

```typescript
// Adjacent where/select operations merge into single pass
// Instead of: iterate → filter → iterate → map → iterate
// Becomes:   iterate → (filter + map) → done

// Detected at chain-build time, fused at evaluation time
operations: [
  { type: 'where', fn: x => x > 5 },
  { type: 'select', fn: x => x * 2 }
]
// Fuses to single: x => x > 5 ? x * 2 : SKIP
```

### 3. Fast Paths

```typescript
// Detect sorted arrays for binary search in contains/indexOf
// Detect consecutive take/skip for slice optimization
// Use Set internally for distinct/intersect/except
```

### 4. Object Pooling

```typescript
// Reuse iterator state objects to reduce GC
const iteratorPool = new Pool<IteratorState>(() => new IteratorState());
```

### 5. Batch Processing

```typescript
// Process in chunks of 64-256 items for CPU cache efficiency
// Especially effective for numeric operations (sum, average, min, max)
```

## Testing Strategy

### Test Structure

```
tests/
├── lazy/
│   ├── filtering.test.ts      # where, distinct, take, skip...
│   ├── projection.test.ts     # select, selectMany, cast...
│   ├── ordering.test.ts       # orderBy, thenBy, reverse...
│   └── ...                    # One file per operator category
├── eager/
│   └── ...                    # Mirror of lazy tests
├── types/
│   └── inference.test-d.ts    # Type-level tests (expect-type)
└── integration/
    └── chains.test.ts         # Complex real-world chains
```

### Benchmark Suite

```typescript
// benchmarks/comparison.bench.ts
import { bench, describe } from 'vitest';

describe('filter + map chain (10,000 items)', () => {
  const data = Array.from({ length: 10000 }, (_, i) => i);

  bench('Vorpal lazy', () => {
    V(data).where(x => x % 2 === 0).select(x => x * 2).toArray();
  });

  bench('Vorpal eager', () => {
    V(data).where(x => x % 2 === 0).select(x => x * 2).toArray();
  });

  bench('Native array', () => {
    data.filter(x => x % 2 === 0).map(x => x * 2);
  });

  bench('Lodash', () => {
    _.chain(data).filter(x => x % 2 === 0).map(x => x * 2).value();
  });

  bench('Ramda', () => {
    R.pipe(R.filter(x => x % 2 === 0), R.map(x => x * 2))(data);
  });
});
```

Benchmarks cover: small arrays (10), medium (10K), large (1M), and various operation combinations.

## Documentation

### TSDoc Comments

```typescript
/**
 * Filters elements based on a predicate.
 *
 * @param predicate - Function to test each element
 * @returns A new sequence containing only elements that pass the test
 *
 * @example
 * V([1, 2, 3, 4, 5]).where(x => x > 3).toArray()
 * // => [4, 5]
 *
 * @example Type narrowing with type guard
 * V([1, "two", 3]).where((x): x is number => typeof x === "number")
 * // => VorpalLazy<number>
 */
where<U extends T>(predicate: TypeGuard<T, U>): VorpalLazy<U>;
```

### Generated Docs

- Use TypeDoc to generate API reference from TSDoc
- Hosted on GitHub Pages or similar
- Organized by operator category

### Interactive Playground

```
docs/playground/
├── index.html
├── playground.ts         # Monaco editor + live execution
└── examples/             # Preloaded example snippets
    ├── filtering.ts
    ├── grouping.ts
    └── real-world.ts
```

Features:
- Monaco editor with full TypeScript IntelliSense
- Live preview of results
- Preloaded examples for each operator
- Shareable URLs (encode code in hash)
- Side-by-side comparison mode (Vorpal vs native vs Lodash)
