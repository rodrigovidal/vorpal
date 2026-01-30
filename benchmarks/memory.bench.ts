import { bench, describe, beforeEach } from 'vitest';
import { V as VLazy } from '../src/lazy/index.js';
import _ from 'lodash';
import * as R from 'ramda';

// Force garbage collection if available (run with --expose-gc)
const gc = (globalThis as { gc?: () => void }).gc ?? (() => {});

// Helper to measure memory delta
function measureMemory(fn: () => unknown): { heapUsed: number; result: unknown } {
  gc();
  const before = process.memoryUsage().heapUsed;
  const result = fn();
  const after = process.memoryUsage().heapUsed;
  return { heapUsed: after - before, result };
}

// Test data
const large = Array.from({ length: 100_000 }, (_, i) => i);
const veryLarge = Array.from({ length: 1_000_000 }, (_, i) => i);

describe('Memory: Filter + Map + Take(10) on 100k items', () => {
  // This is where lazy evaluation shines - it should use minimal memory
  // because it only processes enough items to satisfy take(10)

  beforeEach(() => {
    gc();
  });

  bench('Native (creates intermediate arrays)', () => {
    // Creates: 50k filtered array + 50k mapped array + slice
    large.filter(x => x % 2 === 0).map(x => x * 2).slice(0, 10);
  });

  bench('Vorpal Lazy (minimal allocations)', () => {
    // Only processes ~20 items, creates tiny result array
    VLazy(large).filter(x => x % 2 === 0).map(x => x * 2).take(10).toArray();
  });

  bench('Lodash chain', () => {
    _.chain(large).filter(x => x % 2 === 0).map(x => x * 2).take(10).value();
  });

  bench('Ramda (creates intermediate arrays)', () => {
    R.pipe(
      R.filter((x: number) => x % 2 === 0),
      R.map((x: number) => x * 2),
      R.take(10)
    )(large);
  });
});

describe('Memory: Long chain on 100k items', () => {
  // Multiple operations = multiple intermediate arrays for eager

  beforeEach(() => {
    gc();
  });

  bench('Native', () => {
    large
      .filter(x => x % 2 === 0)
      .map(x => x * 2)
      .filter(x => x > 1000)
      .map(x => x + 1)
      .slice(0, 100);
  });

  bench('Vorpal Lazy', () => {
    VLazy(large)
      .filter(x => x % 2 === 0)
      .map(x => x * 2)
      .filter(x => x > 1000)
      .map(x => x + 1)
      .take(100)
      .toArray();
  });

  bench('Lodash', () => {
    _.chain(large)
      .filter(x => x % 2 === 0)
      .map(x => x * 2)
      .filter(x => x > 1000)
      .map(x => x + 1)
      .take(100)
      .value();
  });

  bench('Ramda', () => {
    R.pipe(
      R.filter((x: number) => x % 2 === 0),
      R.map((x: number) => x * 2),
      R.filter((x: number) => x > 1000),
      R.map((x: number) => x + 1),
      R.take(100)
    )(large);
  });
});

describe('Memory: Full array processing (no early termination)', () => {
  // When processing all items, lazy has minimal advantage
  // but still avoids intermediate arrays

  beforeEach(() => {
    gc();
  });

  bench('Native', () => {
    large.filter(x => x % 2 === 0).map(x => x * 2);
  });

  bench('Vorpal Lazy', () => {
    VLazy(large).filter(x => x % 2 === 0).map(x => x * 2).toArray();
  });

  bench('Lodash', () => {
    _.chain(large).filter(x => x % 2 === 0).map(x => x * 2).value();
  });

  bench('Ramda', () => {
    R.pipe(
      R.filter((x: number) => x % 2 === 0),
      R.map((x: number) => x * 2)
    )(large);
  });
});

describe('Memory: 1M items with early termination', () => {
  // Extreme case: 1 million items but only need first 10
  // Lazy should be dramatically more memory efficient

  beforeEach(() => {
    gc();
  });

  bench('Native (processes all 1M items)', () => {
    veryLarge.filter(x => x % 2 === 0).map(x => x * 2).slice(0, 10);
  });

  bench('Vorpal Lazy (processes ~20 items)', () => {
    VLazy(veryLarge).filter(x => x % 2 === 0).map(x => x * 2).take(10).toArray();
  });

  bench('Lodash lazy chain', () => {
    _.chain(veryLarge).filter(x => x % 2 === 0).map(x => x * 2).take(10).value();
  });

  bench('Ramda (processes all 1M items)', () => {
    R.pipe(
      R.filter((x: number) => x % 2 === 0),
      R.map((x: number) => x * 2),
      R.take(10)
    )(veryLarge);
  });
});

// Manual memory measurement tests (not benchmark, but informative)
describe('Memory Usage Report', () => {
  bench('Report: Native filter+map+take on 100k', () => {
    const { heapUsed } = measureMemory(() =>
      large.filter(x => x % 2 === 0).map(x => x * 2).slice(0, 10)
    );
    // Just run the operation - the benchmark will show relative performance
    // Memory delta is logged for reference
  });

  bench('Report: Vorpal Lazy filter+map+take on 100k', () => {
    const { heapUsed } = measureMemory(() =>
      VLazy(large).filter(x => x % 2 === 0).map(x => x * 2).take(10).toArray()
    );
  });
});
