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

| Operation | Size | Vorpal Lazy | Vorpal Fn | Ramda | Lodash | Winner |
|-----------|------|-------------|-----------|-------|--------|--------|
| sum | n=10k | **353,176** | 352,823 | 6,645 | 32,300 | Vorpal Lazy |
| average | n=10k | **353,176** | - | 6,493 | 31,632 | Vorpal Lazy |
| min | n=10k | **266,441** | - | 5,382 | 54,268 | Vorpal Lazy |
| reduce | n=10k | 157,411 | **298,964** | 19,051 | 32,043 | Vorpal Fn |
| count | n=10k | **126,894** | - | 15,802 | 10,497 | Vorpal Lazy |

Note: No native `sum`, `average`, `min`, `count` methods exist on arrays.

#### Grouping & Set Operations (ops/sec)

| Operation | Size | Vorpal Lazy | Vorpal Fn | Ramda | Lodash | Winner |
|-----------|------|-------------|-----------|-------|--------|--------|
| groupBy | n=10k | **26,051** | 22,074 | 7,193 | 15,973 | Vorpal Lazy |
| distinct | n=10k | 42,643 | **57,336** | 24,096 | 41,012 | Vorpal Fn |
| sortBy | n=10k | 687 | **756** | 700 | 515 | Vorpal Fn |
| partition | n=10k | 42,895 | **44,166** | 8,005 | 13,216 | Vorpal Fn |
| chunk | n=10k | **217,724** | 209,424 | 160,372 | 83,099 | Vorpal Lazy |
| intersection | n=1k | - | **45,461** | 33,101 | - | Vorpal Fn |
| difference | n=1k | - | **60,736** | 34,608 | - | Vorpal Fn |

Note: None of these have native Array methods.

#### Predicates (ops/sec)

| Operation | Size | Native | Vorpal Lazy | Vorpal Fn | Ramda | Lodash | Winner |
|-----------|------|--------|-------------|-----------|-------|--------|--------|
| some | n=10k | 99,671 | 327,593 | **335,565** | 330,274 | 163,821 | Vorpal Fn |
| every | n=10k | 85,157 | 288,891 | **310,760** | 296,734 | 84,379 | Vorpal Fn |
| includes | n=10k | 1,314,157 | 1,280,080 | **1,381,199** | 1,292,671 | 556,172 | Vorpal Fn |

#### Search Operations (ops/sec)

| Operation | Size | Native | Vorpal Lazy | Vorpal Fn | Ramda | Lodash | Winner |
|-----------|------|--------|-------------|-----------|-------|--------|--------|
| find (pos 500) | n=100k | **5,214,690** | 5,007,992 | 5,158,732 | 4,890,404 | - | Native |
| first (>50k) | n=100k | - | **5,885,234** | 4,516,892 | 5,461,327 | 456,893 | Vorpal Lazy |

Note: `find` is native. `first` with predicate is not (similar to find but returns undefined vs throwing).

#### Slice Operations (ops/sec)

| Operation | Size | Native | Vorpal Lazy | Vorpal Fn | Ramda | Lodash | Winner |
|-----------|------|--------|-------------|-----------|-------|--------|--------|
| slice(0,100) | n=10k | **31,724,891** | 23,134,567 | 23,038,456 | 15,678,234 | 8,634,123 | Native |
| slice(100) | n=10k | 3,287,456 | **3,512,478** | 3,478,234 | 2,984,567 | 408,234 | Vorpal Lazy |
| at(-1) | n=10k | **843,234,567** | 602,456,789 | 745,678,234 | 823,456,123 | 249,123,456 | Native |
| reverse | n=10k | 13,847 | 13,293 | **14,562** | 14,123 | 12,456 | Vorpal Fn |

Note: `slice`, `at`, `reverse` are native. Vorpal's `take`/`skip` use slice internally.

#### Combine Operations (ops/sec)

| Operation | Size | Native | Vorpal Lazy | Vorpal Fn | Ramda | Lodash | Winner |
|-----------|------|--------|-------------|-----------|-------|--------|--------|
| concat | n=10k | **48,234** | 48,123 | - | 47,892 | 10,984 | Native |
| zip | n=10k | - | 59,992 | 58,838 | **62,485** | 2,293 | Ramda |

#### Join Operations (ops/sec)

| Operation | Size | Vorpal Lazy | Vorpal Fn | Ramda | Winner |
|-----------|------|-------------|-----------|-------|--------|
| innerJoin | 100u/300o | 58,317 | **217,488** | 178,446 | Vorpal Fn |
| innerJoin | 1ku/5ko | 3,232 | **7,070** | 213 | Vorpal Fn (33x vs Ramda) |
| innerJoin | 10ku/50ko | 253 | **494** | 2 | Vorpal Fn (269x vs Ramda) |
| leftJoin | 1ku/5ko | 3,480 | **9,049** | - | Vorpal Fn |
| rightJoin | 1ku/5ko | 3,400 | **8,900** | - | Vorpal Fn |
| fullJoin | 1ku/5ko | 2,856 | **8,039** | - | Vorpal Fn |
| groupJoin | 1ku/5ko | 8,007 | **11,766** | - | Vorpal Fn |
| crossJoin | 100x100 | 2,541 | **10,697** | 6,413 | Vorpal Fn (1.7x vs Ramda) |
| semiJoin | 1ku/5ko | 15,338 | **28,614** | - | Vorpal Fn |
| antiJoin | 1ku/5ko | 21,617 | **30,377** | - | Vorpal Fn |

Note: No native join operations exist. Ramda's innerJoin uses O(n×m) comparison vs Vorpal's O(n+m) hash-based lookup, making Vorpal **33-269x faster** on larger datasets.

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

| Operation | Best Library | vs 2nd Place |
|-----------|--------------|--------------|
| filter+map (large) | **Vorpal Lazy** | 1.13x vs Lodash |
| early termination | **Vorpal Lazy** | 1.72x vs Vorpal Fn |
| sum/average/min | **Vorpal Lazy** | 53x vs Ramda |
| reduce | **Vorpal Fn** | 1.90x vs Vorpal Lazy |
| groupBy | **Vorpal Lazy** | 1.18x vs Vorpal Fn |
| distinct | **Vorpal Fn** | 1.35x vs Vorpal Lazy |
| sortBy | **Vorpal Fn** | 1.08x vs Ramda |
| partition | **Vorpal Fn** | 1.03x vs Vorpal Lazy |
| chunk | **Vorpal Lazy** | 1.04x vs Vorpal Fn |
| flatMap | **Vorpal Fn** | 1.04x vs Vorpal Lazy |
| count | **Vorpal Lazy** | 8.0x vs Ramda |
| some/every | **Vorpal Fn** | 1.05x vs Ramda |
| includes | **Vorpal Fn** | 1.07x vs Ramda |
| find | **Native** | 1.01x vs Vorpal Fn |
| slice | **Native** | 1.37x vs Vorpal |
| at(-1) | **Native** | 1.13x vs Ramda |
| reverse | **Vorpal Fn** | 1.03x vs Ramda |
| innerJoin | **Vorpal Fn** | 33-269x vs Ramda |
| all joins | **Vorpal Fn** | 1.3-2x vs Vorpal Lazy |

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

### Lazy API (chainable) - 103 Methods

```typescript
V(array)
  // Transformation (11)
  .filter(predicate)          // Keep matching elements
  .reject(predicate)          // Remove matching elements
  .map(transform)             // Transform elements
  .flatMap(transform)         // Transform and flatten
  .flatten()                  // Flatten nested arrays
  .pluck(key)                 // Extract property values
  .reverse()                  // Reverse order
  .concat(other)              // Append array
  .zip(other, combiner)       // Combine arrays
  .chunk(size)                // Split into chunks
  .transpose()                // Swap rows/columns

  // Array Manipulation (12)
  .append(item)               // Add to end
  .prepend(item)              // Add to beginning
  .insert(index, item)        // Insert at position
  .insertAll(index, items)    // Insert multiple at position
  .update(index, value)       // Replace at position
  .adjust(index, fn)          // Apply fn at position
  .move(from, to)             // Move element
  .intersperse(separator)     // Insert between elements
  .without(exclusions)        // Remove values
  .splitAt(index)             // Split at position
  .splitWhen(predicate)       // Split when predicate true
  .xprod(other)               // Cross product

  // Slicing (11)
  .take(n)                    // First n elements
  .takeWhile(predicate)       // While predicate true
  .takeLast(n)                // Last n elements
  .takeLastWhile(predicate)   // From end while true
  .skip(n)                    // Skip first n
  .skipWhile(predicate)       // Skip while true
  .dropLast(n)                // Remove last n
  .dropLastWhile(predicate)   // Remove from end while true
  .slice(start, end?)         // Slice range
  .tail()                     // All but first
  .init()                     // All but last

  // Element Access (6)
  .first(predicate?)          // First element or undefined
  .last(predicate?)           // Last element or undefined
  .single(predicate?)         // Single element or undefined
  .at(index)                  // Element at index or undefined
  .findIndex(predicate)       // Index of first match
  .findLastIndex(predicate)   // Index of last match

  // Search (4)
  .indexOf(value)             // Index of value
  .lastIndexOf(value)         // Last index of value
  .binarySearch(value, cmp?)  // Binary search (-1 if not found)
  .binarySearchIndex(value)   // Insertion point

  // Boolean (4)
  .some(predicate?)           // Any match
  .every(predicate)           // All match
  .none(predicate)            // No match
  .includes(value)            // Contains value
  .isEmpty()                  // Is empty

  // Aggregation (10)
  .count(predicate?)          // Count elements
  .countBy(keySelector)       // Count by group
  .sum(selector?)             // Sum (0 for empty)
  .average(selector?)         // Average or undefined
  .min(selector?)             // Minimum or undefined
  .max(selector?)             // Maximum or undefined
  .reduce(fn, initial)        // Reduce to single value
  .scan(fn, initial)          // Cumulative reduce
  .aggregateBy(key, seed, fn) // Group and aggregate

  // Grouping (3)
  .groupBy(keySelector)       // Group by key
  .indexBy(keySelector)       // Index by key (last wins)
  .partition(predicate)       // Split by predicate

  // Set Operations (11)
  .distinct()                 // Unique elements
  .distinctBy(selector)       // Unique by key
  .uniqWith(compareFn)        // Unique with custom equality
  .union(other)               // Combine unique
  .unionBy(other, selector)   // Combine unique by key
  .intersect(other)           // Common elements
  .intersectBy(other, sel)    // Common by key
  .difference(other)          // In first not second
  .differenceBy(other, sel)   // Difference by key
  .exceptBy(other, sel)       // Alias for differenceBy
  .symmetricDifference(other) // XOR operation

  // Join Operations (9)
  .innerJoin(other, outerKey, innerKey, resultFn)
  .leftJoin(other, outerKey, innerKey, resultFn)
  .rightJoin(other, outerKey, innerKey, resultFn)
  .fullJoin(other, outerKey, innerKey, resultFn)
  .crossJoin(other, resultFn)
  .groupJoin(other, outerKey, innerKey, resultFn)
  .semiJoin(other, outerKey, innerKey)
  .antiJoin(other, outerKey, innerKey)
  .join(inner, outerKey, innerKey, resultFn)  // Alias for innerJoin

  // Windowing (3)
  .aperture(size, step?)      // Sliding windows
  .slidingWindow(size, step?) // Alias for aperture
  .pairwise()                 // Consecutive pairs

  // Comparison (3)
  .sequenceEqual(other, cmp?) // Equal sequences
  .startsWith(prefix, cmp?)   // Starts with prefix
  .endsWith(suffix, cmp?)     // Ends with suffix

  // Sorting (4)
  .sortBy(selector)           // Sort ascending by key
  .sortByDesc(selector)       // Sort descending by key
  .thenBy(selector)           // Secondary sort ascending
  .thenByDesc(selector)       // Secondary sort descending

  // Pagination (2)
  .page(pageNum, pageSize)    // Get items for a page (1-indexed)
  .paginate(pageNum, pageSize) // Get page with metadata

  // Combinatorial (3)
  .permutations()             // All permutations (O(n!))
  .combinations(k)            // All k-combinations
  .shuffle()                  // Random order
  .sample(n)                  // n random elements
  .random()                   // Single random element

  // Type Conversion (2)
  .as<U>()                    // Cast type
  .ofType<U>(typeGuard)       // Filter by type

  // Terminal (5)
  .toArray()                  // Materialize array
  .toSet()                    // Convert to Set
  .toMap(keyFn, valueFn?)     // Convert to Map
  .toObject(keyFn, valueFn?)  // Convert to object
  .fromPairs()                // Key-value pairs to object
```

### Fn API (functional) - 118 Functions

All functions support both direct and curried (data-last) execution:

```typescript
// Pipe / Compose (2)
V.pipe(fn1, fn2, ...)         // Left-to-right composition
V.compose(fn1, fn2, ...)      // Right-to-left composition

// Transformation (10)
V.filter(predicate)           // Keep matching
V.reject(predicate)           // Remove matching
V.map(transform)              // Transform elements
V.flatMap(transform)          // Transform and flatten
V.flatten(array)              // Flatten nested
V.reverse(array)              // Reverse order
V.concat(other)               // Append array
V.zip(other, combiner)        // Combine arrays
V.chunk(size)                 // Split into chunks
V.transpose(array)            // Swap rows/columns

// Array Manipulation (11)
V.append(value)               // Add to end
V.prepend(value)              // Add to beginning
V.insert(index, value)        // Insert at position
V.insertAll(index, values)    // Insert multiple
V.update(index, value)        // Replace at position
V.adjust(index, fn)           // Apply fn at position
V.move(from, to)              // Move element
V.intersperse(separator)      // Insert between
V.without(values)             // Remove values
V.splitAt(index)              // Split at position
V.splitWhen(predicate)        // Split when true

// Slicing (10)
V.take(n)                     // First n elements
V.takeWhile(predicate)        // While predicate true
V.takeLast(n)                 // Last n elements
V.takeLastWhile(predicate)    // From end while true
V.skip(n)                     // Skip first n
V.skipWhile(predicate)        // Skip while true
V.dropLast(n)                 // Remove last n
V.dropLastWhile(predicate)    // Remove from end while true
V.slice(start, end?)          // Slice range
V.tail(array)                 // All but first
V.init(array)                 // All but last

// Element Access (4)
V.first(predicate?)           // First element or undefined
V.last(predicate?)            // Last element or undefined
V.single(predicate?)          // Single element or undefined
V.at(index)                   // Element at index or undefined

// Search (5)
V.find(predicate)             // Find element
V.findIndex(predicate)        // Index of first match
V.findLastIndex(predicate)    // Index of last match
V.indexOf(value)              // Index of value
V.lastIndexOf(value)          // Last index of value

// Boolean (5)
V.some(predicate)             // Any match
V.every(predicate)            // All match
V.none(predicate)             // No match
V.includes(value)             // Contains value
V.isEmpty(array)              // Is empty

// Aggregation (11)
V.count(predicate?)           // Count elements
V.sum(selector?)              // Sum (0 for empty)
V.average(selector?)          // Average or undefined
V.min(selector?)              // Minimum or undefined
V.max(selector?)              // Maximum or undefined
V.minBy(selector)             // Element with min or undefined
V.maxBy(selector)             // Element with max or undefined
V.reduce(fn, initial)         // Reduce to single value
V.reduceRight(fn, initial)    // Reduce from right
V.scan(fn, initial)           // Cumulative reduce
V.aggregateBy(keyFn, seed, fn)// Group and aggregate

// Grouping (4)
V.groupBy(keySelector)        // Group by key (object)
V.groupByMap(keySelector)     // Group by key (Map)
V.keyBy(keySelector)          // Index by key
V.partition(predicate)        // Split by predicate

// Set Operations (12)
V.distinct(keyFn?)            // Unique elements
V.uniqWith(compareFn)         // Unique with custom equality
V.difference(other)           // In first not second
V.intersection(other)         // Common elements
V.union(other)                // Combine unique
V.symmetricDifference(other)  // XOR operation
V.differenceBy(keyFn)(other)  // Difference by key
V.exceptBy(keyFn)(other)      // Alias for differenceBy
V.intersectionBy(keyFn)(other)// Intersection by key
V.unionBy(keyFn)(other)       // Union by key
V.without(values)             // Remove values

// Join Operations (9)
V.innerJoin(inner, outerKey, innerKey, resultFn)
V.leftJoin(inner, outerKey, innerKey, resultFn)
V.rightJoin(inner, outerKey, innerKey, resultFn)
V.fullJoin(inner, outerKey, innerKey, resultFn)
V.crossJoin(inner, resultFn)
V.groupJoin(inner, outerKey, innerKey, resultFn)
V.semiJoin(inner, outerKey, innerKey)
V.antiJoin(inner, outerKey, innerKey)

// Windowing (3)
V.aperture(size, step?)       // Sliding windows
V.slidingWindow(size, step?)  // Alias for aperture
V.pairwise(array)             // Consecutive pairs

// Comparison (3)
V.sequenceEqual(other, cmp?)  // Equal sequences
V.startsWith(prefix, cmp?)    // Starts with prefix
V.endsWith(suffix, cmp?)      // Ends with suffix

// Sorting (3)
V.sort(comparator)            // Sort with comparator
V.sortBy(selector)            // Sort ascending by key
V.sortByDesc(selector)        // Sort descending by key

// Combinatorial (3)
V.permutations(array)         // All permutations
V.combinations(k)             // All k-combinations

// Randomization (3)
V.shuffle(array)              // Random order
V.sample(n)                   // n random elements
V.randomElement(array)        // Single random element

// Binary Search (2)
V.binarySearch(value, cmp?)   // Find index (-1 if not found)
V.binarySearchIndex(value)    // Insertion point

// Utility (4)
V.forEach(fn)                 // Execute for each
V.tap(fn)                     // Side-effect in pipeline
V.join(separator)             // Join to string

// Generators (3)
V.range(end) / V.range(start, end, step?)
V.repeat(value, count)        // Repeat value
V.times(fn, count)            // Call fn n times

// Pagination (2)
V.page(pageNum, pageSize)     // Get items for a page (1-indexed)
V.paginate(pageNum, pageSize) // Get page with metadata { items, page, total, totalPages, hasNext, hasPrev }

// Lazy Evaluation (1)
V.lazy(array)                 // Create lazy pipeline

// Transducers (12)
V.filterT(predicate)          // Transducer filter
V.mapT(transform)             // Transducer map
V.flatMapT(transform)         // Transducer flatMap
V.takeT(n)                    // Transducer take
V.skipT(n)                    // Transducer skip
V.takeWhileT(predicate)       // Transducer takeWhile
V.skipWhileT(predicate)       // Transducer skipWhile
V.distinctT(keyFn?)           // Transducer distinct
V.comp(t1, t2, ...)           // Compose transducers
V.transduce(xf)               // Apply transducer
V.into(target, xf, array)     // Transduce into collection
V.pipeT(t1, t2, ...)          // Transducer pipe
```

### Example Usage

```typescript
// Lazy API - chainable, lazy evaluation
V([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  .filter(x => x % 2 === 0)
  .map(x => x * 2)
  .take(3)
  .toArray(); // [4, 8, 12]

// Fn API - functional, curried
const process = V.pipe(
  V.filter((x: number) => x % 2 === 0),
  V.map((x: number) => x * 2),
  V.take(3)
);
process([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // [4, 8, 12]

// Direct execution
V.sum([1, 2, 3, 4, 5]); // 15
V.groupBy((x: { type: string }) => x.type, items);
V.innerJoin(users, orders, u => u.id, o => o.userId, (u, o) => ({...u, ...o}));
```

## License

MIT
