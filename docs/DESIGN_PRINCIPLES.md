# Vorpal Design Principles

## Error Handling Strategy: Safe by Default

Vorpal follows a **"fail gracefully, never throw"** approach. All functions return safe, predictable values instead of throwing exceptions.

### Philosophy

1. **No exceptions in user code** - Exceptions should be rare and indicate programmer errors, not data conditions
2. **Predictable return types** - Functions always return the documented type, no surprises
3. **Chainable by design** - Safe returns enable fluid method chaining without try/catch
4. **Consistent behavior** - Same pattern across all function categories

### Two Categories of Functions

| Category | Empty/Invalid Behavior | Examples |
|----------|------------------------|----------|
| **Transformations** | Return empty array `[]` | `filter`, `map`, `take`, `skip`, `page`, `slice` |
| **Accessors/Aggregations** | Return `undefined` | `first`, `last`, `single`, `at`, `min`, `max`, `average` |

### 1. Transformation Functions

These always return a valid array, never throw or return undefined:

```typescript
page(-1, 5, arr)        // → [] (invalid page number)
take(0, arr)            // → [] (take nothing)
filter(x => false, arr) // → [] (nothing matches)
skip(1000, [1,2,3])     // → [] (skip past end)
chunk(0, arr)           // → [] (invalid chunk size)
```

**Rationale**: Invalid inputs produce empty results. The operation is still defined, just yields nothing. This enables safe chaining.

### 2. Accessor & Aggregation Functions

These return `T | undefined` for element access, and `number | undefined` for numeric aggregations:

```typescript
// Element access - returns T | undefined
first([])              // → undefined
last([])               // → undefined
single([1, 2])         // → undefined (more than one element)
single([])             // → undefined (no elements)
at(10, [1, 2, 3])      // → undefined (out of range)
find(x => x > 10, arr) // → undefined (no match)

// Aggregations - returns number | undefined
min([])                // → undefined
max([])                // → undefined
average([])            // → undefined
```

**Rationale**: `undefined` is the natural JavaScript way to represent "no value". It enables simple conditional checks and optional chaining.

### Why No Throwing?

1. **Type safety**: Return type accurately reflects all possible outcomes
2. **Composability**: No need for try/catch in chains
3. **Performance**: No exception overhead in hot paths
4. **Predictability**: Behavior is consistent and documented
5. **JavaScript idiom**: `undefined` is the standard "no value" representation

```typescript
// Clean pattern with safe returns
const value = V.first(arr) ?? defaultValue;
const result = V([1,2,3]).first(x => x > 10) ?? 0;

// Vs throwing approach requiring try/catch
try {
  const value = V.first(arr);
} catch (e) {
  const value = defaultValue;
}
```

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

### 5. No Exceptions in Any Path

Exceptions are slow. Use return values:

```typescript
// ✅ Good: return undefined for missing
return arr.length > 0 ? arr[0] : undefined;

// ❌ Bad: throw
if (arr.length === 0) throw new Error("Empty");
return arr[0];
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

### 3. Optional Return Types Are Explicit

```typescript
// Type signature clearly shows possibility of undefined
function first<T>(arr: readonly T[]): T | undefined;
function min(arr: readonly number[]): number | undefined;
```

## Summary

| Principle | Implementation |
|-----------|----------------|
| Never throw | All functions return safe values |
| Transformations → `[]` | Empty array for invalid/empty inputs |
| Accessors → `undefined` | Undefined for missing elements |
| Aggregations → `undefined` | Undefined for empty sequences |
| Fast paths | Direct calls avoid function creation |
| Pre-compute | Curried versions pre-compute constants |
| Type safety | Return types reflect all outcomes |
