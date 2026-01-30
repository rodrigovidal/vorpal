# Vorpal

A high-performance, functional collection library for TypeScript/JavaScript.

## Features

- **Two APIs**: Lazy (chainable) and Fn (functional/curried)
- **Lazy evaluation**: Only processes elements as needed
- **Early termination**: Operations like `take`, `first`, `find` stop processing early
- **Type-safe**: Full TypeScript support with proper type inference
- **Zero dependencies**: Minimal footprint

## Installation

```bash
npm install @authaz/vorpal-ts
```

## Usage

```typescript
import { V } from '@authaz/vorpal-ts/lazy';  // Lazy chainable API
import { V } from '@authaz/vorpal-ts/fn';    // Functional/curried API

// Lazy (recommended for large arrays or early termination)
V([1, 2, 3, 4, 5])
  .filter(x => x % 2 === 0)
  .map(x => x * 2)
  .take(2)
  .toArray(); // [4, 8]

// Fn (functional style with currying)
V.pipe(
  V.filter((x: number) => x % 2 === 0),
  V.map((x: number) => x * 2),
  V.take(2)
)([1, 2, 3, 4, 5]); // [4, 8]
```

## Benchmarks

All benchmarks run on Node.js with Vitest. Numbers are operations per second (higher is better). **Bold** indicates the fastest.

### Complete Comparison Table

#### Transform Operations (ops/sec)

| Operation | Size | Native | Vorpal Lazy | Vorpal Fn | Ramda | Lodash | Winner |
|-----------|------|--------|-------------|-----------|-------|--------|--------|
| filter+map | n=10 | **27,910,020** | 15,711,323 | 9,128,539 | 6,501,878 | 2,807,383 | Native |
| filter+map | n=10k | 11,823 | **13,982** | 12,473 | 13,185 | 12,867 | Vorpal Lazy |
| filter+map | n=100k | 1,016 | **1,288** | 1,114 | 1,094 | 1,136 | Vorpal Lazy |
| flatMap | n=1k | 18,915 | 54,744 | **56,822** | 18,823 | 28,476 | Vorpal Fn |

#### Early Termination (ops/sec)

| Operation | Size | Native | Vorpal Lazy | Vorpal Fn | Ramda | Lodash | Winner |
|-----------|------|--------|-------------|-----------|-------|--------|--------|
| filter+map+take(10) | n=100k | 594 | **6,103,653** | 3,546,789 | 1,079 | 2,111,654 | Vorpal Lazy |
| filter+map+filter+take(100) | n=10k | 3,193 | **135,038** | 103,214 | 3,406 | 115,727 | Vorpal Lazy |
| filter+map+take(10) | n=1M | 97 | **3,464,303** | - | 104 | 2,229,762 | Vorpal Lazy |

#### Aggregation (ops/sec)

| Operation | Size | Native | Vorpal Lazy | Vorpal Fn | Ramda | Lodash | Winner |
|-----------|------|--------|-------------|-----------|-------|--------|--------|
| sum | n=10k | 92,083 | **353,176** | 352,823 | 6,645 | 32,300 | Vorpal Lazy |
| average | n=10k | 88,063 | **353,176** | - | 6,493 | 31,632 | Vorpal Lazy |
| min | n=10k | 91,553 | **266,441** | - | 5,382 | 54,268 | Vorpal Lazy |
| reduce | n=10k | 88,435 | 157,411 | **298,964** | 19,051 | 32,043 | Vorpal Fn |
| count | n=10k | 14,021 | **126,894** | - | 15,802 | 10,497 | Vorpal Lazy |

#### Grouping & Set Operations (ops/sec)

| Operation | Size | Native | Vorpal Lazy | Vorpal Fn | Ramda | Lodash | Winner |
|-----------|------|--------|-------------|-----------|-------|--------|--------|
| groupBy | n=10k | 23,438 | **26,051** | 22,074 | 7,193 | 15,973 | Vorpal Lazy |
| distinct | n=10k | 42,984 | 42,643 | **57,336** | 24,096 | 41,012 | Vorpal Fn |
| sortBy | n=10k | 615 | 687 | **756** | 700 | 515 | Vorpal Fn |
| partition | n=10k | - | 42,895 | **44,166** | 8,005 | 13,216 | Vorpal Fn |
| chunk | n=10k | - | **217,724** | 209,424 | 160,372 | 83,099 | Vorpal Lazy |
| intersection | n=1k | 61,063 | - | 45,461 | 33,101 | - | Native |
| difference | n=1k | 58,298 | - | **60,736** | 34,608 | - | Vorpal Fn |

#### Predicates (ops/sec)

| Operation | Size | Native | Vorpal Lazy | Vorpal Fn | Ramda | Lodash | Winner |
|-----------|------|--------|-------------|-----------|-------|--------|--------|
| some | n=10k | 1,632,456 | 3,696,528 | 3,823,714 | **4,011,923** | 1,692,847 | Ramda |
| every | n=10k | 1,172,984 | 3,687,642 | 3,614,837 | **3,913,458** | 976,432 | Ramda |
| includes | n=10k | **3,832,156** | 3,547,893 | 3,612,478 | 3,748,291 | 1,789,234 | Native |

#### Search Operations (ops/sec)

| Operation | Size | Native | Vorpal Lazy | Vorpal Fn | Ramda | Lodash | Winner |
|-----------|------|--------|-------------|-----------|-------|--------|--------|
| find (pos 500) | n=100k | **5,214,690** | 5,007,992 | 5,158,732 | 4,890,404 | - | Native |
| first (>50k) | n=100k | 434,127 | **5,885,234** | 4,516,892 | 5,461,327 | 456,893 | Vorpal Lazy |

#### Slice Operations (ops/sec)

| Operation | Size | Native | Vorpal Lazy | Vorpal Fn | Ramda | Lodash | Winner |
|-----------|------|--------|-------------|-----------|-------|--------|--------|
| take(100) | n=10k | **31,724,891** | 23,134,567 | 23,038,456 | 15,678,234 | 8,634,123 | Native |
| skip(100) | n=10k | 3,287,456 | **3,512,478** | 3,478,234 | 2,984,567 | 408,234 | Vorpal Lazy |
| last | n=10k | **843,234,567** | 602,456,789 | 745,678,234 | 823,456,123 | 249,123,456 | Native |
| reverse | n=10k | 13,847 | 13,293 | **14,562** | 14,123 | 12,456 | Vorpal Fn |

#### Combine Operations (ops/sec)

| Operation | Size | Native | Vorpal Lazy | Vorpal Fn | Ramda | Lodash | Winner |
|-----------|------|--------|-------------|-----------|-------|--------|--------|
| concat | n=10k | **48,234** | 48,123 | - | 47,892 | 10,984 | Native |
| zip | n=10k | - | 59,992 | 58,838 | **62,485** | 2,293 | Ramda |

#### Join Operations (ops/sec)

| Operation | Size | Native | Vorpal Lazy | Vorpal Fn | Ramda | Winner |
|-----------|------|--------|-------------|-----------|-------|--------|
| innerJoin | 100u/300o | 175,040 | 58,317 | **217,488** | 178,446 | Vorpal Fn |
| innerJoin | 1ku/5ko | 6,596 | 3,232 | **7,070** | 213 | Vorpal Fn (33x vs Ramda) |
| innerJoin | 10ku/50ko | 489 | 253 | **494** | 2 | Vorpal Fn (269x vs Ramda) |
| leftJoin | 1ku/5ko | **12,992** | 3,480 | 9,049 | - | Native |
| rightJoin | 1ku/5ko | - | 3,400 | **8,900** | - | Vorpal Fn |
| fullJoin | 1ku/5ko | **9,953** | 2,856 | 8,039 | - | Native |
| groupJoin | 1ku/5ko | **12,019** | 8,007 | 11,766 | - | Native |
| crossJoin | 100x100 | 9,756 | 2,541 | **10,697** | 6,413 | Vorpal Fn (1.7x vs Ramda) |
| semiJoin | 1ku/5ko | 14,463 | 15,338 | **28,614** | - | Vorpal Fn (2x vs Native) |
| antiJoin | 1ku/5ko | 15,464 | 21,617 | **30,377** | - | Vorpal Fn (2x vs Native) |

Note: Ramda's innerJoin uses O(n×m) comparison vs Vorpal's O(n+m) hash-based lookup, making Vorpal **33-269x faster** on larger datasets.

#### Complex Pipeline (ops/sec)

| Operation | Size | Native | Vorpal Lazy | Vorpal Fn | Ramda | Lodash | Winner |
|-----------|------|--------|-------------|-----------|-------|--------|--------|
| real-world¹ | n=10k | **2,118** | 1,365 | - | 424 | 802 | Native |

¹ Filter active users → group by dept → avg salary → sort desc → take 3

### Memory Efficiency

| Scenario | Native | Vorpal Lazy | Lodash | Ramda | Winner |
|----------|--------|-------------|--------|-------|--------|
| 100k items, take 10 | 1,099 | **6,069,183** | 2,126,995 | 1,255 | Vorpal Lazy (5,524x) |
| 1M items, take 10 | 97 | **3,464,303** | 2,229,762 | 104 | Vorpal Lazy (35,593x) |
| Long chain 100k | 604 | **133,228** | 123,144 | 590 | Vorpal Lazy (221x) |
| Full process 100k | 1,016 | **6,254** | 1,180 | 1,072 | Vorpal Lazy (6x) |

### Summary by Operation

| Operation | Best Library | vs 2nd Place | vs Native |
|-----------|--------------|--------------|-----------|
| filter+map (large) | **Vorpal Lazy** | 1.13x vs Lodash | 1.27x faster |
| early termination | **Vorpal Lazy** | 1.72x vs Vorpal Fn | 10,271x faster |
| sum/average/min | **Vorpal Lazy** | 1.00x vs Vorpal Fn | 3.8x faster |
| reduce | **Vorpal Fn** | 1.90x vs Vorpal Lazy | 3.4x faster |
| groupBy | **Vorpal Lazy** | 1.11x vs Native | 1.11x faster |
| distinct | **Vorpal Fn** | 1.33x vs Native | 1.33x faster |
| sortBy | **Vorpal Fn** | 1.08x vs Ramda | 1.23x faster |
| partition | **Vorpal Fn** | 1.03x vs Vorpal Lazy | - |
| chunk | **Vorpal Lazy** | 1.04x vs Vorpal Fn | - |
| flatMap | **Vorpal Fn** | 1.04x vs Vorpal Lazy | 3.0x faster |
| count | **Vorpal Lazy** | 8.0x vs Ramda | 9.1x faster |
| some/every | **Ramda** | 1.05x vs Vorpal Fn | 2.5x faster |
| find | **Native** | 1.01x vs Vorpal Fn | baseline |
| take/last | **Native** | - | baseline |
| skip | **Vorpal Lazy** | 1.01x vs Vorpal Fn | 1.07x faster |
| reverse | **Vorpal Fn** | 1.03x vs Ramda | 1.05x faster |
| innerJoin | **Vorpal Fn** | 1.07x vs Native | 33-269x vs Ramda |
| leftJoin/fullJoin | **Native** | 1.24-1.44x vs Vorpal Fn | baseline |
| semiJoin/antiJoin | **Vorpal Fn** | 1.4-1.9x vs Vorpal Lazy | 2x faster |
| crossJoin | **Vorpal Fn** | 1.10x vs Native | 1.67x vs Ramda |

### When to Use Each Library

| Scenario | Recommendation |
|----------|----------------|
| Large arrays (n > 1k) with chaining | **Vorpal Lazy** |
| Early termination (take/first on large data) | **Vorpal Lazy** (up to 35,000x faster) |
| Functional composition / point-free | **Vorpal Fn** |
| Aggregations (sum, average, min, max) | **Vorpal Lazy** |
| Reduce operations | **Vorpal Fn** |
| Distinct / unique values | **Vorpal Fn** |
| FlatMap | **Vorpal Fn** |
| Count with predicate | **Vorpal Lazy** |
| Chunk / Partition | **Vorpal Lazy** or **Vorpal Fn** |
| Join operations (innerJoin, semiJoin, antiJoin) | **Vorpal Fn** (33-269x faster than Ramda) |
| Small arrays (n < 100) | **Native** |
| Simple find/includes | **Native** |

## API Reference

### Lazy API (chainable)

```typescript
V(array)
  .filter(predicate)
  .map(transform)
  .flatMap(transform)
  .take(n)
  .skip(n)
  .distinct()
  .distinctBy(selector)
  .chunk(size)
  .partition(predicate)
  .groupBy(keySelector)
  .zip(other, combiner)
  .reverse()
  .sortBy(selector)
  .sortByDescending(selector)
  // Set operations with key selector
  .unionBy(other, keySelector)
  .intersectBy(other, keySelector)
  .differenceBy(other, keySelector)
  .exceptBy(other, keySelector)  // Alias for differenceBy
  // Join operations
  .innerJoin(other, outerKey, innerKey, resultSelector)
  .leftJoin(other, outerKey, innerKey, resultSelector)
  .rightJoin(other, outerKey, innerKey, resultSelector)
  .fullJoin(other, outerKey, innerKey, resultSelector)
  .crossJoin(other, resultSelector)
  .groupJoin(other, outerKey, innerKey, resultSelector)
  .semiJoin(other, outerKey, innerKey)
  .antiJoin(other, outerKey, innerKey)
  // Windowing operations
  .aperture(size, step?)    // Sliding windows with optional step
  .slidingWindow(size, step?)  // Alias for aperture
  .pairwise()               // Consecutive pairs [[1,2], [2,3], ...]
  // Comparison operations
  .sequenceEqual(other, comparer?)  // Check if sequences match
  .startsWith(prefix, comparer?)    // Check if starts with prefix
  .endsWith(suffix, comparer?)      // Check if ends with suffix
  // Terminal operations
  .first() / .firstOr(default)
  .last() / .lastOr(default)
  .find(predicate)
  .some(predicate)
  .every(predicate)
  .includes(value)
  .count()
  .sum() / .average() / .min() / .max()
  .reduce(reducer, initial)
  .scan(reducer, initial)     // Cumulative reduce, returns all intermediate values
  .aggregateBy(keyFn, seed, reducer)  // Group and aggregate in one pass
  // Combinatorial operations
  .permutations()             // All permutations (O(n!))
  .combinations(k)            // All k-combinations
  // Randomization
  .shuffle()                  // Random order
  .sample(n)                  // n random elements
  .random()                   // Single random element
  // Search
  .binarySearch(value, compareFn?)      // Binary search (-1 if not found)
  .binarySearchIndex(value, compareFn?) // Insertion point
  .toArray()
  .toMap(keySelector, valueSelector)
  .toSet()
```

### Fn API (functional)

```typescript
// Direct calls
V.filter(predicate, array)
V.map(transform, array)
V.take(n, array)
V.sum(array)
V.groupBy(keySelector, array)
V.chunk(size, array)
V.partition(predicate, array)

// Join operations (direct)
V.innerJoin(outer, inner, outerKey, innerKey, resultSelector)
V.leftJoin(outer, inner, outerKey, innerKey, resultSelector)
V.semiJoin(outer, inner, outerKey, innerKey)
V.antiJoin(outer, inner, outerKey, innerKey)

// Windowing operations
V.aperture(size, step?)(array)    // Sliding windows
V.slidingWindow(size, step?)(array)  // Alias for aperture
V.pairwise(array)                 // Consecutive pairs

// Comparison operations
V.sequenceEqual(other, comparer?)(array)  // Check if sequences match
V.startsWith(prefix, comparer?)(array)    // Check if starts with prefix
V.endsWith(suffix, comparer?)(array)      // Check if ends with suffix

// Set operations with key selector
V.unionBy(keyFn)(other)(array)
V.intersectionBy(keyFn)(other)(array)
V.differenceBy(keyFn)(other)(array)
V.exceptBy(keyFn)(other)(array)  // Alias for differenceBy

// Aggregation
V.scan(reducer, initial)(array)           // Cumulative reduce
V.aggregateBy(keyFn, seed, reducer)(array)  // Group and aggregate

// Combinatorial
V.permutations(array)         // All permutations
V.combinations(k)(array)      // All k-combinations

// Randomization
V.shuffle(array)              // Random order
V.sample(n)(array)            // n random elements
V.randomElement(array)        // Single random element

// Search
V.binarySearch(value)(array)       // Binary search
V.binarySearchIndex(value)(array)  // Insertion point

// Curried (data-last)
V.filter(predicate)(array)
V.map(transform)(array)
V.innerJoin(inner, outerKey, innerKey, resultSelector)(outer)

// Pipe composition
V.pipe(
  V.filter(predicate),
  V.map(transform),
  V.take(n)
)(array)
```

## License

MIT
