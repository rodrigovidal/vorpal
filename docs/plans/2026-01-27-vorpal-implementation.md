# Vorpal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a high-performance TypeScript LINQ-style library with lazy and eager evaluation modes.

**Architecture:** Wrapper function `V()` returns either `VorpalLazy<T>` or `VorpalEager<T>` depending on import. Lazy uses generators and operation fusion; eager computes immediately. Both share core types.

**Tech Stack:** TypeScript 5.x, Vitest, ESM-only, TypeDoc

---

## Phase 1: Project Scaffolding

### Task 1: Initialize npm package

**Files:**
- Create: `package.json`

**Step 1: Create package.json**

```bash
npm init -y
```

**Step 2: Update package.json with correct configuration**

Edit `package.json`:

```json
{
  "name": "vorpal",
  "version": "0.1.0",
  "description": "High-performance TypeScript LINQ-style array manipulation",
  "type": "module",
  "exports": {
    "./lazy": {
      "types": "./dist/lazy/index.d.ts",
      "import": "./dist/lazy/index.js"
    },
    "./eager": {
      "types": "./dist/eager/index.d.ts",
      "import": "./dist/eager/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "bench": "vitest bench",
    "docs": "typedoc"
  },
  "keywords": ["linq", "array", "functional", "lazy", "typescript"],
  "license": "MIT",
  "devDependencies": {},
  "engines": {
    "node": ">=18"
  }
}
```

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: initialize npm package"
```

---

### Task 2: Install dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install dev dependencies**

```bash
npm install -D typescript vitest @vitest/coverage-v8 typedoc
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add dev dependencies"
```

---

### Task 3: Configure TypeScript

**Files:**
- Create: `tsconfig.json`

**Step 1: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests", "benchmarks"]
}
```

**Step 2: Commit**

```bash
git add tsconfig.json
git commit -m "chore: configure TypeScript with strict settings"
```

---

### Task 4: Configure Vitest

**Files:**
- Create: `vitest.config.ts`

**Step 1: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts'],
    },
  },
});
```

**Step 2: Commit**

```bash
git add vitest.config.ts
git commit -m "chore: configure Vitest"
```

---

### Task 5: Create directory structure

**Files:**
- Create: `src/core/.gitkeep`
- Create: `src/lazy/.gitkeep`
- Create: `src/eager/.gitkeep`
- Create: `tests/.gitkeep`
- Create: `benchmarks/.gitkeep`

**Step 1: Create directories**

```bash
mkdir -p src/core src/lazy/operators src/eager/operators tests/lazy tests/eager tests/types benchmarks
touch src/core/.gitkeep src/lazy/.gitkeep src/eager/.gitkeep tests/.gitkeep benchmarks/.gitkeep
```

**Step 2: Commit**

```bash
git add .
git commit -m "chore: create directory structure"
```

---

## Phase 2: Core Types

### Task 6: Create core type definitions

**Files:**
- Create: `src/core/types.ts`
- Create: `tests/types/inference.test-d.ts`

**Step 1: Write type tests first**

Create `tests/types/inference.test-d.ts`:

```typescript
import { describe, expectTypeOf, test } from 'vitest';
import type { Predicate, TypeGuard, Selector, KeySelector, Comparer, EqualityComparer } from '../../src/core/types.js';

describe('Core Types', () => {
  test('Predicate accepts item and index', () => {
    const pred: Predicate<number> = (item, index) => item > index;
    expectTypeOf(pred).toBeFunction();
    expectTypeOf(pred).parameters.toEqualTypeOf<[number, number]>();
    expectTypeOf(pred).returns.toEqualTypeOf<boolean>();
  });

  test('TypeGuard narrows type', () => {
    const guard: TypeGuard<unknown, string> = (item): item is string => typeof item === 'string';
    expectTypeOf(guard).toBeFunction();
  });

  test('Selector transforms type', () => {
    const sel: Selector<{ name: string }, string> = (item) => item.name;
    expectTypeOf(sel).returns.toEqualTypeOf<string>();
  });

  test('KeySelector extracts key', () => {
    const keySel: KeySelector<{ id: number }, number> = (item) => item.id;
    expectTypeOf(keySel).returns.toEqualTypeOf<number>();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/types/inference.test-d.ts
```

Expected: FAIL (module not found)

**Step 3: Create types.ts**

Create `src/core/types.ts`:

```typescript
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
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/types/inference.test-d.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/core/types.ts tests/types/inference.test-d.ts
git commit -m "feat(core): add core type definitions"
```

---

### Task 7: Create core index export

**Files:**
- Create: `src/core/index.ts`

**Step 1: Create index.ts**

```typescript
export type {
  Predicate,
  TypeGuard,
  Selector,
  KeySelector,
  Comparer,
  EqualityComparer,
  Grouping,
  Action,
} from './types.js';
```

**Step 2: Verify build**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/core/index.ts
git commit -m "feat(core): add core index export"
```

---

## Phase 3: Lazy Implementation - Base Class

### Task 8: Create VorpalLazy base class with iterator

**Files:**
- Create: `src/lazy/VorpalLazy.ts`
- Create: `tests/lazy/base.test.ts`

**Step 1: Write failing test**

Create `tests/lazy/base.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { V } from '../src/lazy/index.js';

describe('VorpalLazy base', () => {
  test('V wraps array and is iterable', () => {
    const result = V([1, 2, 3]);
    expect([...result]).toEqual([1, 2, 3]);
  });

  test('toArray returns array copy', () => {
    const source = [1, 2, 3];
    const result = V(source).toArray();
    expect(result).toEqual([1, 2, 3]);
    expect(result).not.toBe(source);
  });

  test('V accepts any iterable', () => {
    const set = new Set([1, 2, 3]);
    expect(V(set).toArray()).toEqual([1, 2, 3]);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/lazy/base.test.ts
```

Expected: FAIL (module not found)

**Step 3: Create VorpalLazy.ts**

Create `src/lazy/VorpalLazy.ts`:

```typescript
/**
 * Lazy evaluation wrapper for iterables.
 * Operations are deferred until a terminal method is called.
 */
export class VorpalLazy<T> implements Iterable<T> {
  protected readonly source: Iterable<T>;

  constructor(source: Iterable<T>) {
    this.source = source;
  }

  /**
   * Returns an iterator over the elements.
   */
  [Symbol.iterator](): Iterator<T> {
    return this.source[Symbol.iterator]();
  }

  /**
   * Evaluates the sequence and returns an array.
   */
  toArray(): T[] {
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
}
```

**Step 4: Create lazy index.ts**

Create `src/lazy/index.ts`:

```typescript
import { VorpalLazy } from './VorpalLazy.js';

/**
 * Creates a lazy evaluation wrapper for the given iterable.
 * @param source - The source iterable to wrap
 * @returns A VorpalLazy instance
 */
export function V<T>(source: Iterable<T>): VorpalLazy<T> {
  return new VorpalLazy(source);
}

export { VorpalLazy };
```

**Step 5: Run test to verify it passes**

```bash
npm test -- tests/lazy/base.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/lazy/VorpalLazy.ts src/lazy/index.ts tests/lazy/base.test.ts
git commit -m "feat(lazy): add VorpalLazy base class with iteration"
```

---

## Phase 4: Lazy Operators - Filtering

### Task 9: Implement where operator

**Files:**
- Modify: `src/lazy/VorpalLazy.ts`
- Create: `tests/lazy/filtering.test.ts`

**Step 1: Write failing test**

Create `tests/lazy/filtering.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('where', () => {
  test('filters elements by predicate', () => {
    const result = V([1, 2, 3, 4, 5]).where(x => x > 3).toArray();
    expect(result).toEqual([4, 5]);
  });

  test('provides index to predicate', () => {
    const result = V(['a', 'b', 'c']).where((_, i) => i % 2 === 0).toArray();
    expect(result).toEqual(['a', 'c']);
  });

  test('is lazy - does not iterate until terminal', () => {
    let iterationCount = 0;
    const source = {
      *[Symbol.iterator]() {
        for (let i = 0; i < 5; i++) {
          iterationCount++;
          yield i;
        }
      }
    };
    const query = V(source).where(x => x > 2);
    expect(iterationCount).toBe(0);
    query.toArray();
    expect(iterationCount).toBe(5);
  });

  test('type narrows with type guard', () => {
    const mixed: (string | number)[] = [1, 'two', 3, 'four'];
    const numbers = V(mixed)
      .where((x): x is number => typeof x === 'number')
      .toArray();
    expect(numbers).toEqual([1, 3]);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/lazy/filtering.test.ts
```

Expected: FAIL (where is not a function)

**Step 3: Implement where**

Add to `src/lazy/VorpalLazy.ts`:

```typescript
import type { Predicate, TypeGuard } from '../core/types.js';

// Add these methods to VorpalLazy class:

  /**
   * Filters elements based on a predicate.
   */
  where(predicate: Predicate<T>): VorpalLazy<T>;
  where<U extends T>(guard: TypeGuard<T, U>): VorpalLazy<U>;
  where(predicate: Predicate<T>): VorpalLazy<T> {
    return new VorpalLazy(whereIterator(this.source, predicate));
  }

// Add outside class:

function* whereIterator<T>(source: Iterable<T>, predicate: Predicate<T>): Generator<T> {
  let index = 0;
  for (const item of source) {
    if (predicate(item, index++)) {
      yield item;
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/lazy/filtering.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lazy/VorpalLazy.ts tests/lazy/filtering.test.ts
git commit -m "feat(lazy): add where operator with type guard support"
```

---

### Task 10: Implement take and skip operators

**Files:**
- Modify: `src/lazy/VorpalLazy.ts`
- Modify: `tests/lazy/filtering.test.ts`

**Step 1: Write failing tests**

Add to `tests/lazy/filtering.test.ts`:

```typescript
describe('take', () => {
  test('takes first n elements', () => {
    expect(V([1, 2, 3, 4, 5]).take(3).toArray()).toEqual([1, 2, 3]);
  });

  test('takes all if n > length', () => {
    expect(V([1, 2]).take(5).toArray()).toEqual([1, 2]);
  });

  test('takes none if n <= 0', () => {
    expect(V([1, 2, 3]).take(0).toArray()).toEqual([]);
    expect(V([1, 2, 3]).take(-1).toArray()).toEqual([]);
  });

  test('is lazy - stops iteration early', () => {
    let iterationCount = 0;
    const source = {
      *[Symbol.iterator]() {
        for (let i = 0; i < 100; i++) {
          iterationCount++;
          yield i;
        }
      }
    };
    V(source).take(3).toArray();
    expect(iterationCount).toBe(3);
  });
});

describe('skip', () => {
  test('skips first n elements', () => {
    expect(V([1, 2, 3, 4, 5]).skip(2).toArray()).toEqual([3, 4, 5]);
  });

  test('skips all if n >= length', () => {
    expect(V([1, 2]).skip(5).toArray()).toEqual([]);
  });

  test('skips none if n <= 0', () => {
    expect(V([1, 2, 3]).skip(0).toArray()).toEqual([1, 2, 3]);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/lazy/filtering.test.ts
```

Expected: FAIL

**Step 3: Implement take and skip**

Add to `src/lazy/VorpalLazy.ts`:

```typescript
  /**
   * Returns the first n elements.
   */
  take(count: number): VorpalLazy<T> {
    return new VorpalLazy(takeIterator(this.source, count));
  }

  /**
   * Skips the first n elements.
   */
  skip(count: number): VorpalLazy<T> {
    return new VorpalLazy(skipIterator(this.source, count));
  }

// Add iterators:

function* takeIterator<T>(source: Iterable<T>, count: number): Generator<T> {
  if (count <= 0) return;
  let taken = 0;
  for (const item of source) {
    yield item;
    if (++taken >= count) return;
  }
}

function* skipIterator<T>(source: Iterable<T>, count: number): Generator<T> {
  let skipped = 0;
  for (const item of source) {
    if (skipped >= count) {
      yield item;
    } else {
      skipped++;
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/lazy/filtering.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lazy/VorpalLazy.ts tests/lazy/filtering.test.ts
git commit -m "feat(lazy): add take and skip operators"
```

---

### Task 11: Implement takeWhile and skipWhile operators

**Files:**
- Modify: `src/lazy/VorpalLazy.ts`
- Modify: `tests/lazy/filtering.test.ts`

**Step 1: Write failing tests**

Add to `tests/lazy/filtering.test.ts`:

```typescript
describe('takeWhile', () => {
  test('takes while predicate is true', () => {
    expect(V([1, 2, 3, 4, 1]).takeWhile(x => x < 4).toArray()).toEqual([1, 2, 3]);
  });

  test('takes none if first fails', () => {
    expect(V([5, 1, 2]).takeWhile(x => x < 3).toArray()).toEqual([]);
  });

  test('provides index', () => {
    expect(V([0, 1, 2, 3]).takeWhile((x, i) => x === i).toArray()).toEqual([0, 1, 2, 3]);
  });
});

describe('skipWhile', () => {
  test('skips while predicate is true', () => {
    expect(V([1, 2, 3, 4, 1]).skipWhile(x => x < 3).toArray()).toEqual([3, 4, 1]);
  });

  test('skips none if first fails', () => {
    expect(V([5, 1, 2]).skipWhile(x => x < 3).toArray()).toEqual([5, 1, 2]);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/lazy/filtering.test.ts
```

Expected: FAIL

**Step 3: Implement takeWhile and skipWhile**

Add to `src/lazy/VorpalLazy.ts`:

```typescript
  /**
   * Returns elements while predicate is true.
   */
  takeWhile(predicate: Predicate<T>): VorpalLazy<T> {
    return new VorpalLazy(takeWhileIterator(this.source, predicate));
  }

  /**
   * Skips elements while predicate is true.
   */
  skipWhile(predicate: Predicate<T>): VorpalLazy<T> {
    return new VorpalLazy(skipWhileIterator(this.source, predicate));
  }

// Add iterators:

function* takeWhileIterator<T>(source: Iterable<T>, predicate: Predicate<T>): Generator<T> {
  let index = 0;
  for (const item of source) {
    if (!predicate(item, index++)) return;
    yield item;
  }
}

function* skipWhileIterator<T>(source: Iterable<T>, predicate: Predicate<T>): Generator<T> {
  let index = 0;
  let yielding = false;
  for (const item of source) {
    if (yielding) {
      yield item;
    } else if (!predicate(item, index++)) {
      yielding = true;
      yield item;
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/lazy/filtering.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lazy/VorpalLazy.ts tests/lazy/filtering.test.ts
git commit -m "feat(lazy): add takeWhile and skipWhile operators"
```

---

### Task 12: Implement distinct and distinctBy operators

**Files:**
- Modify: `src/lazy/VorpalLazy.ts`
- Modify: `tests/lazy/filtering.test.ts`

**Step 1: Write failing tests**

Add to `tests/lazy/filtering.test.ts`:

```typescript
describe('distinct', () => {
  test('removes duplicates', () => {
    expect(V([1, 2, 2, 3, 1, 3]).distinct().toArray()).toEqual([1, 2, 3]);
  });

  test('preserves order of first occurrence', () => {
    expect(V([3, 1, 2, 1, 3]).distinct().toArray()).toEqual([3, 1, 2]);
  });

  test('works with objects by reference', () => {
    const a = { id: 1 };
    const b = { id: 2 };
    expect(V([a, b, a]).distinct().toArray()).toEqual([a, b]);
  });
});

describe('distinctBy', () => {
  test('removes duplicates by key', () => {
    const items = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
      { id: 1, name: 'c' },
    ];
    const result = V(items).distinctBy(x => x.id).toArray();
    expect(result).toEqual([{ id: 1, name: 'a' }, { id: 2, name: 'b' }]);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/lazy/filtering.test.ts
```

Expected: FAIL

**Step 3: Implement distinct and distinctBy**

Add to `src/lazy/VorpalLazy.ts`:

```typescript
import type { Predicate, TypeGuard, KeySelector } from '../core/types.js';

  /**
   * Returns distinct elements.
   */
  distinct(): VorpalLazy<T> {
    return new VorpalLazy(distinctIterator(this.source));
  }

  /**
   * Returns elements with distinct keys.
   */
  distinctBy<K>(keySelector: KeySelector<T, K>): VorpalLazy<T> {
    return new VorpalLazy(distinctByIterator(this.source, keySelector));
  }

// Add iterators:

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
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/lazy/filtering.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lazy/VorpalLazy.ts tests/lazy/filtering.test.ts
git commit -m "feat(lazy): add distinct and distinctBy operators"
```

---

## Phase 5: Lazy Operators - Projection

### Task 13: Implement select operator

**Files:**
- Modify: `src/lazy/VorpalLazy.ts`
- Create: `tests/lazy/projection.test.ts`

**Step 1: Write failing test**

Create `tests/lazy/projection.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('select', () => {
  test('transforms each element', () => {
    expect(V([1, 2, 3]).select(x => x * 2).toArray()).toEqual([2, 4, 6]);
  });

  test('provides index', () => {
    expect(V(['a', 'b', 'c']).select((x, i) => `${i}:${x}`).toArray())
      .toEqual(['0:a', '1:b', '2:c']);
  });

  test('changes type', () => {
    const result = V([{ name: 'Alice' }, { name: 'Bob' }])
      .select(x => x.name)
      .toArray();
    expect(result).toEqual(['Alice', 'Bob']);
  });

  test('is lazy', () => {
    let count = 0;
    const query = V([1, 2, 3]).select(x => { count++; return x; });
    expect(count).toBe(0);
    query.toArray();
    expect(count).toBe(3);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/lazy/projection.test.ts
```

Expected: FAIL

**Step 3: Implement select**

Add to `src/lazy/VorpalLazy.ts`:

```typescript
import type { Predicate, TypeGuard, KeySelector, Selector } from '../core/types.js';

  /**
   * Projects each element into a new form.
   */
  select<R>(selector: Selector<T, R>): VorpalLazy<R> {
    return new VorpalLazy(selectIterator(this.source, selector));
  }

// Add iterator:

function* selectIterator<T, R>(source: Iterable<T>, selector: Selector<T, R>): Generator<R> {
  let index = 0;
  for (const item of source) {
    yield selector(item, index++);
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/lazy/projection.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lazy/VorpalLazy.ts tests/lazy/projection.test.ts
git commit -m "feat(lazy): add select operator"
```

---

### Task 14: Implement selectMany operator

**Files:**
- Modify: `src/lazy/VorpalLazy.ts`
- Modify: `tests/lazy/projection.test.ts`

**Step 1: Write failing test**

Add to `tests/lazy/projection.test.ts`:

```typescript
describe('selectMany', () => {
  test('flattens nested iterables', () => {
    const result = V([[1, 2], [3, 4], [5]]).selectMany(x => x).toArray();
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  test('transforms then flattens', () => {
    const data = [{ tags: ['a', 'b'] }, { tags: ['c'] }];
    const result = V(data).selectMany(x => x.tags).toArray();
    expect(result).toEqual(['a', 'b', 'c']);
  });

  test('provides index', () => {
    const result = V(['ab', 'cd']).selectMany((s, i) =>
      [...s].map(c => `${i}:${c}`)
    ).toArray();
    expect(result).toEqual(['0:a', '0:b', '1:c', '1:d']);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/lazy/projection.test.ts
```

Expected: FAIL

**Step 3: Implement selectMany**

Add to `src/lazy/VorpalLazy.ts`:

```typescript
  /**
   * Projects each element to an iterable and flattens.
   */
  selectMany<R>(selector: Selector<T, Iterable<R>>): VorpalLazy<R> {
    return new VorpalLazy(selectManyIterator(this.source, selector));
  }

// Add iterator:

function* selectManyIterator<T, R>(source: Iterable<T>, selector: Selector<T, Iterable<R>>): Generator<R> {
  let index = 0;
  for (const item of source) {
    yield* selector(item, index++);
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/lazy/projection.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lazy/VorpalLazy.ts tests/lazy/projection.test.ts
git commit -m "feat(lazy): add selectMany operator"
```

---

### Task 15: Implement cast and ofType operators

**Files:**
- Modify: `src/lazy/VorpalLazy.ts`
- Modify: `tests/lazy/projection.test.ts`

**Step 1: Write failing test**

Add to `tests/lazy/projection.test.ts`:

```typescript
describe('cast', () => {
  test('casts element type', () => {
    const anys: unknown[] = [1, 2, 3];
    const numbers = V(anys).cast<number>().toArray();
    expect(numbers).toEqual([1, 2, 3]);
  });
});

describe('ofType', () => {
  test('filters and narrows by type guard', () => {
    const mixed: unknown[] = [1, 'two', 3, 'four', 5];
    const strings = V(mixed)
      .ofType((x): x is string => typeof x === 'string')
      .toArray();
    expect(strings).toEqual(['two', 'four']);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/lazy/projection.test.ts
```

Expected: FAIL

**Step 3: Implement cast and ofType**

Add to `src/lazy/VorpalLazy.ts`:

```typescript
  /**
   * Casts elements to a different type (unsafe).
   */
  cast<U>(): VorpalLazy<U> {
    return new VorpalLazy(this.source as Iterable<unknown> as Iterable<U>);
  }

  /**
   * Filters elements by type guard.
   */
  ofType<U>(guard: (item: unknown) => item is U): VorpalLazy<U> {
    return new VorpalLazy(
      whereIterator(this.source as Iterable<unknown>, guard) as Generator<U>
    );
  }
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/lazy/projection.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lazy/VorpalLazy.ts tests/lazy/projection.test.ts
git commit -m "feat(lazy): add cast and ofType operators"
```

---

*Continue with remaining phases: Ordering, Aggregation, Element Access, Grouping, Set Operations, Joining, Quantifiers, Partitioning, then Eager implementation, benchmarks, and docs.*

---

## Remaining Tasks Summary

**Phase 6: Ordering** (Tasks 16-18)
- orderBy, orderByDescending, VorpalOrdered class
- thenBy, thenByDescending
- reverse

**Phase 7: Aggregation** (Tasks 19-21)
- count, sum, average
- min, max
- aggregate (reduce)

**Phase 8: Element Access** (Tasks 22-24)
- first, firstOrDefault
- last, lastOrDefault
- single, elementAt

**Phase 9: Grouping** (Tasks 25-26)
- groupBy
- groupJoin

**Phase 10: Set Operations** (Tasks 27-29)
- concat, union
- intersect, except

**Phase 11: Joining** (Tasks 30-32)
- join
- zip

**Phase 12: Quantifiers** (Tasks 33-34)
- any, all
- contains

**Phase 13: Partitioning** (Tasks 35-36)
- chunk
- partition

**Phase 14: Eager Implementation** (Tasks 37-40)
- VorpalEager base class
- Port all operators to eager mode
- Add forEach terminal

**Phase 15: Performance** (Tasks 41-44)
- Operation fusion
- Fast paths
- Object pooling
- Batch processing

**Phase 16: Testing & Benchmarks** (Tasks 45-47)
- Type inference tests
- Integration tests
- Benchmark suite

**Phase 17: Documentation** (Tasks 48-50)
- TSDoc comments
- TypeDoc setup
- Interactive playground
