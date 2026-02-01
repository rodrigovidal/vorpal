# Vorpal Design Principles

## Error Handling Strategy

Vorpal follows a **"fail gracefully where possible, throw only when mathematically undefined"** approach.

### Three Categories of Functions

| Category | Behavior | Examples |
|----------|----------|----------|
| **Transformations** | Return empty array for invalid inputs | `page`, `take`, `filter`, `skip`, `slice` |
| **Accessors** | Throw when element doesn't exist | `first`, `last`, `single`, `at` |
| **Aggregations** | Throw on empty (undefined result) | `min`, `max`, `average`, `sum` |

### 1. Transformation Functions (Graceful)

These always return a valid array, never throw:

```typescript
page(-1, 5, arr)     // → [] (invalid page)
take(0, arr)         // → [] (take nothing)
filter(x => false, arr) // → [] (nothing matches)
skip(1000, [1,2,3])  // → [] (skip past end)
```

**Rationale**: Invalid inputs produce empty results. The operation is still defined, just yields nothing.

### 2. Accessor Functions (Throw + Safe Alternative)

These throw when no element exists, but provide safe alternatives:

```typescript
// Throwing versions (use when you KNOW element exists)
first([])           // throws: "Sequence contains no elements"
last([])            // throws: "Sequence contains no elements"
single([1, 2])      // throws: "Sequence contains more than one element"
at(10, [1, 2, 3])   // throws: "Index out of range"

// Safe alternatives (use when element may not exist)
firstOr(0, [])      // → 0 (returns default)
lastOr(0, [])       // → 0 (returns default)
find(x => x > 10, arr) // → undefined (returns undefined, not throw)
```

**Rationale**: Returning `undefined` would change the return type and force null checks everywhere. Throwing is explicit. Safe alternatives exist when you need them.

### 3. Aggregation Functions (Throw)

These throw on empty because the result is mathematically undefined:

```typescript
min([])      // throws: "Sequence contains no elements"
max([])      // throws: "Sequence contains no elements"
average([])  // throws: "Sequence contains no elements"
```

**Rationale**: What's `min([])`? `Infinity`? `NaN`? `0`? All are misleading. Throwing makes the undefined case explicit.

## Performance Principles

### 1. Single Branch Validation

```typescript
// ✅ Good: single branch
return pageNum > 0 && pageSize > 0
  ? arr.slice(start, end)
  : [];

// ❌ Bad: multiple branches
if (pageNum < 1) return [];
if (pageSize < 1) return [];
return arr.slice(start, end);
```

### 2. Trust Native Methods

Native `slice`, `splice`, etc. handle edge cases gracefully:

```typescript
// slice handles out-of-bounds gracefully
arr.slice(1000, 2000)  // → [] (not throw)
arr.slice(-100)        // → last 100 or all if < 100
```

### 3. Fast Path for Direct Calls

Avoid function creation overhead for direct (non-curried) calls:

```typescript
export function page<T>(pageNum: number, pageSize: number, arr?: readonly T[]) {
  // Fast path: direct call - no intermediate function
  if (arr !== undefined) {
    return pageNum > 0 && pageSize > 0
      ? arr.slice((pageNum - 1) * pageSize, pageNum * pageSize) as T[]
      : [];
  }
  // Curried path: create function once
  if (pageNum < 1 || pageSize < 1) return () => [] as T[];
  const start = (pageNum - 1) * pageSize;
  const end = pageNum * pageSize;
  return (arr: readonly T[]): T[] => arr.slice(start, end) as T[];
}
```

### 4. Pre-compute in Curried Path

When returning a curried function, pre-compute what you can:

```typescript
// ✅ Good: pre-compute start/end
const start = (pageNum - 1) * pageSize;
const end = pageNum * pageSize;
return (arr) => arr.slice(start, end);

// ❌ Bad: compute on each call
return (arr) => arr.slice((pageNum - 1) * pageSize, pageNum * pageSize);
```

### 5. No Exceptions in Hot Path

Exceptions are slow. Use return values:

```typescript
// ✅ Good: return empty for invalid
return pageNum > 0 ? arr.slice(...) : [];

// ❌ Bad: throw in common path
if (pageNum < 1) throw new RangeError("Invalid page");
```

## Type Safety

### 1. Preserve Types Through Chains

```typescript
V([1, 2, 3])
  .filter(x => x > 1)    // VorpalLazy<number>
  .map(x => x.toString()) // VorpalLazy<string>
  .toArray()              // string[]
```

### 2. Readonly Input, Mutable Output

```typescript
// Accept readonly to be permissive
function take<T>(n: number, arr: readonly T[]): T[]

// Return mutable for convenience
const result = take(5, arr);
result.push(6);  // ✅ allowed
```

## Current Implementation Status

### Safe Alternatives Available

| Throwing | Safe Alternative | Status |
|----------|------------------|--------|
| `first()` | `firstOr()` | ✅ |
| `last()` | `lastOr()` | ✅ |
| `at()` | N/A (returns `undefined`) | ✅ |
| `find()` | N/A (returns `undefined`) | ✅ |
| `single()` | - | ❌ Missing `singleOr` |
| `min()` | - | ⚠️ No safe alt (throws on empty) |
| `max()` | - | ⚠️ No safe alt (throws on empty) |
| `average()` | - | ⚠️ No safe alt (throws on empty) |

### Potential Additions

```typescript
// Could add these safe alternatives:
singleOr(defaultValue, arr)     // → default if 0 or >1 elements
minOr(defaultValue, arr)        // → default if empty
maxOr(defaultValue, arr)        // → default if empty
averageOr(defaultValue, arr)    // → default if empty
```

## Consistency Checklist

- [x] Transformation functions return `[]` for invalid inputs
- [x] Accessor functions `first`/`last` have safe (`*Or`) versions
- [ ] `single` needs `singleOr` alternative
- [ ] Consider `minOr`/`maxOr`/`averageOr` for empty-safe aggregations
- [x] Direct calls avoid function creation overhead
- [x] Curried versions pre-compute constants
- [x] No exceptions in transformation hot paths
