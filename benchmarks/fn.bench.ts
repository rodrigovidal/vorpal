/**
 * Benchmarks for Vorpal Function-Based API
 *
 * Compares V.fn() style against:
 * - Native JavaScript
 * - Ramda (similar functional style)
 * - Vorpal Lazy (wrapper-based)
 */

import { describe, bench } from 'vitest';
import { V } from '../src/fn/index.js';
import { V as VLazy } from '../src/lazy/index.js';
import * as R from 'ramda';

// Test data
const arr100 = Array.from({ length: 100 }, (_, i) => i);
const arr1k = Array.from({ length: 1_000 }, (_, i) => i);
const arr10k = Array.from({ length: 10_000 }, (_, i) => i);
const arr100k = Array.from({ length: 100_000 }, (_, i) => i);

// ==================== Simple Operations ====================

describe('V.fn: Last element (n=1000)', () => {
  bench('Native', () => {
    arr1k.at(-1);
  });

  bench('Vorpal Fn', () => {
    V.last(arr1k);
  });

  bench('Vorpal Lazy', () => {
    VLazy(arr1k).last();
  });

  bench('Ramda', () => {
    R.last(arr1k);
  });
});

describe('V.fn: Take (n=1000, take 10)', () => {
  bench('Native', () => {
    arr1k.slice(0, 10);
  });

  bench('Vorpal Fn', () => {
    V.take(10, arr1k);
  });

  bench('Vorpal Lazy', () => {
    VLazy(arr1k).take(10).toArray();
  });

  bench('Ramda', () => {
    R.take(10, arr1k);
  });
});

describe('V.fn: Skip (n=1000, skip 10)', () => {
  bench('Native', () => {
    arr1k.slice(10);
  });

  bench('Vorpal Fn', () => {
    V.skip(10, arr1k);
  });

  bench('Vorpal Lazy', () => {
    VLazy(arr1k).skip(10).toArray();
  });

  bench('Ramda', () => {
    R.drop(10, arr1k);
  });
});

describe('V.fn: Reverse (n=1000)', () => {
  bench('Native', () => {
    [...arr1k].reverse();
  });

  bench('Vorpal Fn', () => {
    V.reverse(arr1k);
  });

  bench('Vorpal Lazy', () => {
    VLazy(arr1k).reverse().toArray();
  });

  bench('Ramda', () => {
    R.reverse(arr1k);
  });
});

describe('V.fn: Sum (n=10000)', () => {
  bench('Native', () => {
    arr10k.reduce((a, b) => a + b, 0);
  });

  bench('Vorpal Fn', () => {
    V.sum(arr10k);
  });

  bench('Vorpal Lazy', () => {
    VLazy(arr10k).sum();
  });

  bench('Ramda', () => {
    R.sum(arr10k);
  });
});

describe('V.fn: Every (n=10000)', () => {
  bench('Native', () => {
    arr10k.every(x => x >= 0);
  });

  bench('Vorpal Fn', () => {
    V.every(x => x >= 0, arr10k);
  });

  bench('Vorpal Lazy', () => {
    VLazy(arr10k).every(x => x >= 0);
  });

  bench('Ramda', () => {
    R.all(x => x >= 0, arr10k);
  });
});

describe('V.fn: Zip (n=1000)', () => {
  const other = arr1k.map(x => x * 10);

  bench('Vorpal Fn', () => {
    V.zip(arr1k, other, (a, b) => a + b);
  });

  bench('Vorpal Lazy', () => {
    VLazy(arr1k).zip(other, (a, b) => a + b).toArray();
  });

  bench('Ramda', () => {
    R.zipWith((a: number, b: number) => a + b, arr1k, other);
  });
});

// ==================== Pipe Operations ====================

describe('V.fn: Pipe filter+map (n=10000)', () => {
  bench('Native', () => {
    arr10k.filter(x => x % 2 === 0).map(x => x * 2);
  });

  bench('Vorpal Fn pipe (auto-transducer)', () => {
    V.pipe(
      V.filter((x: number) => x % 2 === 0),
      V.map((x: number) => x * 2)
    )(arr10k);
  });

  bench('Vorpal Fn pipeT (explicit)', () => {
    V.pipeT(
      V.filterT((x: number) => x % 2 === 0),
      V.mapT((x: number) => x * 2)
    )(arr10k);
  });

  bench('Vorpal Fn direct', () => {
    V.map((x: number) => x * 2, V.filter((x: number) => x % 2 === 0, arr10k));
  });

  bench('Vorpal Lazy', () => {
    VLazy(arr10k).filter(x => x % 2 === 0).map(x => x * 2).toArray();
  });

  bench('Ramda', () => {
    R.pipe(
      R.filter((x: number) => x % 2 === 0),
      R.map((x: number) => x * 2)
    )(arr10k);
  });
});

describe('V.fn: Pipe filter+map+take (n=100000)', () => {
  bench('Native (no early term)', () => {
    arr100k.filter(x => x % 2 === 0).map(x => x * 2).slice(0, 10);
  });

  bench('Vorpal Fn pipe (auto-transducer)', () => {
    V.pipe(
      V.filter((x: number) => x % 2 === 0),
      V.map((x: number) => x * 2),
      V.take(10)
    )(arr100k);
  });

  bench('Vorpal Fn pipeT (explicit)', () => {
    V.pipeT(
      V.filterT((x: number) => x % 2 === 0),
      V.mapT((x: number) => x * 2),
      V.takeT(10)
    )(arr100k);
  });

  bench('Vorpal Fn lazy', () => {
    V.lazy(arr100k)
      .filter(x => x % 2 === 0)
      .map(x => x * 2)
      .take(10)
      .toArray();
  });

  bench('Vorpal Lazy', () => {
    VLazy(arr100k).filter(x => x % 2 === 0).map(x => x * 2).take(10).toArray();
  });

  bench('Ramda (no early term)', () => {
    R.pipe(
      R.filter((x: number) => x % 2 === 0),
      R.map((x: number) => x * 2),
      R.take(10)
    )(arr100k);
  });
});

// ==================== Grouping Operations ====================

describe('V.fn: GroupBy (n=10000)', () => {
  bench('Native', () => {
    const groups: Record<number, number[]> = {};
    for (const x of arr10k) {
      const key = x % 10;
      if (!groups[key]) groups[key] = [];
      groups[key].push(x);
    }
    return groups;
  });

  bench('Vorpal Fn', () => {
    V.groupBy((x: number) => x % 10, arr10k);
  });

  bench('Vorpal Lazy', () => {
    VLazy(arr10k).groupBy(x => x % 10);
  });

  bench('Ramda', () => {
    R.groupBy((x: number) => String(x % 10), arr10k);
  });
});

describe('V.fn: Distinct (n=10000)', () => {
  const withDupes = arr10k.map(x => x % 1000);

  bench('Native Set', () => {
    [...new Set(withDupes)];
  });

  bench('Vorpal Fn', () => {
    V.distinct(withDupes);
  });

  bench('Vorpal Lazy', () => {
    VLazy(withDupes).distinct().toArray();
  });

  bench('Ramda', () => {
    R.uniq(withDupes);
  });
});

describe('V.fn: SortBy (n=10000)', () => {
  const data = arr10k.map(x => ({ id: x, value: Math.random() }));

  bench('Native', () => {
    [...data].sort((a, b) => a.value - b.value);
  });

  bench('Vorpal Fn', () => {
    V.sortBy((x: { value: number }) => x.value, data);
  });

  bench('Vorpal Lazy', () => {
    VLazy(data).sortBy(x => x.value).toArray();
  });

  bench('Ramda', () => {
    R.sortBy((x: { value: number }) => x.value, data);
  });
});

// ==================== Find Operations ====================

describe('V.fn: Find (n=100000, target at position 500)', () => {
  bench('Native', () => {
    arr100k.find(x => x === 500);
  });

  bench('Vorpal Fn', () => {
    V.find((x: number) => x === 500, arr100k);
  });

  bench('Vorpal Lazy', () => {
    VLazy(arr100k).first(x => x === 500);
  });

  bench('Ramda', () => {
    R.find((x: number) => x === 500, arr100k);
  });
});

// ==================== Set Operations ====================

describe('V.fn: Intersection (n=1000)', () => {
  const a = Array.from({ length: 1000 }, (_, i) => i);
  const b = Array.from({ length: 1000 }, (_, i) => i + 500);

  bench('Native Set', () => {
    const setB = new Set(b);
    a.filter(x => setB.has(x));
  });

  bench('Vorpal Fn', () => {
    V.intersection(a, b);
  });

  bench('Ramda', () => {
    R.intersection(a, b);
  });
});

describe('V.fn: Difference (n=1000)', () => {
  const a = Array.from({ length: 1000 }, (_, i) => i);
  const b = Array.from({ length: 1000 }, (_, i) => i + 500);

  bench('Native Set', () => {
    const setB = new Set(b);
    a.filter(x => !setB.has(x));
  });

  bench('Vorpal Fn', () => {
    V.difference(a, b);
  });

  bench('Ramda', () => {
    R.difference(a, b);
  });
});

// ==================== Complex Pipeline ====================

describe('V.fn: Complex pipeline (n=10000)', () => {
  const users = arr10k.map((i) => ({
    id: i,
    name: `User${i}`,
    age: 20 + (i % 50),
    department: ['eng', 'sales', 'hr', 'ops'][i % 4],
    salary: 50000 + (i % 100) * 1000,
  }));

  bench('Native', () => {
    users
      .filter(u => u.department === 'eng')
      .filter(u => u.age >= 30)
      .map(u => ({ name: u.name, salary: u.salary }))
      .sort((a, b) => b.salary - a.salary)
      .slice(0, 10);
  });

  bench('Vorpal Fn pipe', () => {
    V.pipe(
      V.filter((u: typeof users[0]) => u.department === 'eng'),
      V.filter((u: typeof users[0]) => u.age >= 30),
      V.map((u: typeof users[0]) => ({ name: u.name, salary: u.salary })),
      V.sortByDesc((u: { salary: number }) => u.salary),
      V.take(10)
    )(users);
  });

  bench('Vorpal Lazy', () => {
    VLazy(users)
      .filter(u => u.department === 'eng')
      .filter(u => u.age >= 30)
      .map(u => ({ name: u.name, salary: u.salary }))
      .sortByDescending(u => u.salary)
      .take(10)
      .toArray();
  });

  bench('Ramda', () => {
    R.pipe(
      R.filter((u: typeof users[0]) => u.department === 'eng'),
      R.filter((u: typeof users[0]) => u.age >= 30),
      R.map((u: typeof users[0]) => ({ name: u.name, salary: u.salary })),
      R.sortBy((u: { salary: number }) => -u.salary),
      R.take(10)
    )(users);
  });
});
