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

All benchmarks run on Node.js with Vitest. Numbers are operations per second (higher is better).

### Filter + Map

| Size | Native | Vorpal Lazy | Vorpal Fn | Ramda | Lodash |
|------|--------|-------------|-----------|-------|--------|
| n=10 | **27.9M** | 15.7M | 9.1M | 6.5M | 2.8M |
| n=10k | 11.8k | **14.0k** | 12.5k | 13.2k | 12.9k |
| n=100k | 1.0k | **1.3k** | 1.1k | 1.1k | 1.1k |

### Early Termination (filter+map+take 10 from 100k)

| Library | ops/sec | vs Native |
|---------|---------|-----------|
| **Vorpal Lazy** | **6.1M** | **10,271x faster** |
| Vorpal Fn pipe | 3.5M | 5,657x faster |
| Lodash chain | 2.1M | 2,890x faster |
| Ramda | 1.1k | - |
| Native | 594 | baseline |

### Chained Operations (filter+map+filter+take 100 on 10k)

| Library | ops/sec | vs Native |
|---------|---------|-----------|
| **Vorpal Lazy** | **135k** | **42x faster** |
| Lodash | 116k | 36x faster |
| Vorpal Fn pipe | 103k | 32x faster |
| Ramda | 3.4k | 1.1x faster |
| Native | 3.2k | baseline |

### Aggregation

| Operation | Vorpal Lazy | Vorpal Fn | Native | Ramda | Lodash |
|-----------|-------------|-----------|--------|-------|--------|
| **Sum** (n=10k) | **353k** | 352k | 100k | 16k | 32k |
| **Average** (n=10k) | **353k** | - | 88k | 6.5k | 32k |
| **Min** (n=10k) | **266k** | - | 92k | 5.4k | 54k |
| **Reduce** (n=10k) | 157k | **299k** | 88k | 19k | 32k |

### Grouping & Set Operations

| Operation | Vorpal Lazy | Vorpal Fn | Native | Ramda | Lodash |
|-----------|-------------|-----------|--------|-------|--------|
| **GroupBy** (n=10k) | **26k** | 22k | 23k | 7.2k | 16k |
| **Distinct** (n=10k) | 43k | **57k** | 43k | 24k | 41k |
| **SortBy** (n=10k) | 687 | **756** | 615 | 700 | 515 |
| **Partition** (n=10k) | 43k | **44k** | - | 8.0k | 13k |
| **Chunk** (n=10k) | **218k** | 209k | - | 160k | 83k |

### Set Operations (n=1k)

| Operation | Vorpal Fn | Native Set | Ramda |
|-----------|-----------|------------|-------|
| **Intersection** | 45k | **61k** | 33k |
| **Difference** | **61k** | 58k | 35k |

### Predicates

| Operation | Vorpal Lazy | Vorpal Fn | Native | Ramda | Lodash |
|-----------|-------------|-----------|--------|-------|--------|
| **Some** (n=10k) | 3.7M | 3.8M | 1.6M | **4.0M** | 1.7M |
| **Every** (n=10k) | 3.7M | 3.6M | 1.2M | **3.9M** | 980k |
| **Includes** (n=10k) | 3.5M | 3.6M | **3.8M** | 3.7M | 1.8M |

### Find & Search

| Operation | Vorpal Lazy | Vorpal Fn | Native | Ramda | Lodash |
|-----------|-------------|-----------|--------|-------|--------|
| **Find** (n=100k, pos 500) | 5.0M | 5.2M | **5.2M** | 4.9M | - |
| **First** (n=100k, >50k) | **5.9M** | 4.5M | 0.4M | 5.5M | 0.5M |

### Array Operations

| Operation | Vorpal Lazy | Vorpal Fn | Native | Ramda | Lodash |
|-----------|-------------|-----------|--------|-------|--------|
| **Take 10** (n=1k) | 26M | 29M | **43M** | 34M | 12M |
| **Skip 10** (n=1k) | **3.5M** | 3.5M | 3.4M | 3.0M | 410k |
| **Last** (n=1k) | 639M | 743M | **843M** | 823M | 249M |
| **Reverse** (n=1k) | 308k | **357k** | 332k | 346k | 301k |
| **Concat** (n=10k) | **48k** | - | 48k | 48k | 11k |
| **Zip** (n=1k) | **626k** | 588k | - | 624k | 23k |

### FlatMap (n=1k nested arrays)

| Library | ops/sec |
|---------|---------|
| **Vorpal Fn** | **57k** |
| Vorpal Lazy | 54k |
| Native | 19k |
| Ramda | 19k |
| Lodash | 28k |

### Count with Predicate (n=10k)

| Library | ops/sec |
|---------|---------|
| **Vorpal Lazy** | **127k** |
| Native filter.length | 14k |
| Ramda filter.length | 16k |
| Lodash countBy | 11k |

### Complex Pipeline (real-world scenario)

Filter active users age≥30 → group by dept → avg salary → sort desc → take 3

| Library | ops/sec |
|---------|---------|
| **Native** | **2.1k** |
| Vorpal Lazy | 1.4k |
| Lodash | 809 |
| Ramda | 425 |

### Memory Efficiency

#### Filter+Map+Take 10 on 100k items

| Library | ops/sec | Items Processed |
|---------|---------|-----------------|
| **Vorpal Lazy** | **6.1M** | ~20 |
| Lodash chain | 2.1M | ~20 |
| Ramda | 1.3k | 100,000 |
| Native | 1.1k | 100,000 |

#### 1M items with early termination (take 10)

| Library | ops/sec | Items Processed |
|---------|---------|-----------------|
| **Vorpal Lazy** | **3.5M** | ~20 |
| Lodash chain | 2.2M | ~20 |
| Ramda | 104 | 1,000,000 |
| Native | 97 | 1,000,000 |

**Vorpal Lazy is 35,593x faster than Native** when early termination matters on 1M items.

#### Long chain on 100k items (filter+map+filter+map+take 100)

| Library | ops/sec |
|---------|---------|
| **Vorpal Lazy** | **133k** |
| Lodash | 123k |
| Native | 604 |
| Ramda | 590 |

#### Full array processing (no early termination, 100k items)

| Library | ops/sec |
|---------|---------|
| **Vorpal Lazy** | **6.3k** |
| Lodash | 1.2k |
| Native | 1.0k |
| Ramda | 1.1k |

## Summary

| Scenario | Best Choice | Why |
|----------|-------------|-----|
| Large arrays (n>1k) | **Vorpal Lazy** | Fastest filter+map, lazy evaluation |
| Early termination | **Vorpal Lazy** | Up to 35,000x faster than eager libs |
| Functional composition | **Vorpal Fn** | Curried functions, pipe support |
| Aggregations (sum/avg/min) | **Vorpal Lazy** | 3-50x faster than alternatives |
| Reduce | **Vorpal Fn** | 3x faster than Native, 15x faster than Ramda |
| Distinct | **Vorpal Fn** | 1.3x faster than Native Set |
| FlatMap | **Vorpal Fn** | 3x faster than Native |
| Count | **Vorpal Lazy** | 8-12x faster than alternatives |
| Chunk/Partition | **Vorpal** | 2-5x faster than Lodash/Ramda |
| Small arrays (n<100) | **Native** | Minimal overhead |

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
  .first() / .firstOr(default)
  .last() / .lastOr(default)
  .find(predicate)
  .some(predicate)
  .every(predicate)
  .includes(value)
  .count()
  .sum() / .average() / .min() / .max()
  .reduce(reducer, initial)
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

// Curried (data-last)
V.filter(predicate)(array)
V.map(transform)(array)

// Pipe composition
V.pipe(
  V.filter(predicate),
  V.map(transform),
  V.take(n)
)(array)
```

## License

MIT
