import { describe, test, expect } from 'vitest';
import { repeat, times, range, unfold } from '../../src/lazy/index.js';

describe('repeat', () => {
  test('creates array with n copies of value', () => {
    expect(repeat('x', 3).toArray()).toEqual(['x', 'x', 'x']);
  });

  test('works with objects', () => {
    const obj = { a: 1 };
    const result = repeat(obj, 2).toArray();
    expect(result).toEqual([{ a: 1 }, { a: 1 }]);
    expect(result[0]).toBe(result[1]); // Same reference
  });

  test('returns empty for count 0', () => {
    expect(repeat('x', 0).toArray()).toEqual([]);
  });

  test('returns empty for negative count', () => {
    expect(repeat('x', -5).toArray()).toEqual([]);
  });
});

describe('times', () => {
  test('calls function n times with index', () => {
    expect(times(i => i * 2, 5).toArray()).toEqual([0, 2, 4, 6, 8]);
  });

  test('creates array of length n', () => {
    expect(times(() => 'a', 4).toArray()).toEqual(['a', 'a', 'a', 'a']);
  });

  test('returns empty for count 0', () => {
    expect(times(i => i, 0).toArray()).toEqual([]);
  });

  test('returns empty for negative count', () => {
    expect(times(i => i, -3).toArray()).toEqual([]);
  });
});

describe('range', () => {
  test('generates range from 0 to n with single arg', () => {
    expect(range(5).toArray()).toEqual([0, 1, 2, 3, 4]);
  });

  test('generates range from start to end', () => {
    expect(range(2, 6).toArray()).toEqual([2, 3, 4, 5]);
  });

  test('generates descending range', () => {
    expect(range(5, 1).toArray()).toEqual([5, 4, 3, 2]);
  });

  test('uses custom step', () => {
    expect(range(0, 10, 2).toArray()).toEqual([0, 2, 4, 6, 8]);
  });

  test('uses negative step', () => {
    expect(range(10, 0, -3).toArray()).toEqual([10, 7, 4, 1]);
  });

  test('returns empty for zero step', () => {
    expect(range(0, 5, 0).toArray()).toEqual([]);
  });

  test('returns empty if start equals end', () => {
    expect(range(5, 5).toArray()).toEqual([]);
  });

  test('handles single value 0', () => {
    expect(range(0).toArray()).toEqual([]);
  });
});

describe('unfold', () => {
  test('generates fibonacci sequence', () => {
    const fib = unfold(
      ([a, b]) => (a < 50 ? [a, [b, a + b] as [number, number]] : undefined),
      [0, 1] as [number, number]
    );
    expect(fib.toArray()).toEqual([0, 1, 1, 2, 3, 5, 8, 13, 21, 34]);
  });

  test('generates countdown', () => {
    const countdown = unfold(
      n => (n > 0 ? [n, n - 1] : undefined),
      5
    );
    expect(countdown.toArray()).toEqual([5, 4, 3, 2, 1]);
  });

  test('generates empty for immediate undefined', () => {
    const empty = unfold(() => undefined, 0);
    expect(empty.toArray()).toEqual([]);
  });

  test('generates powers of 2', () => {
    const powers = unfold(
      n => (n <= 64 ? [n, n * 2] : undefined),
      1
    );
    expect(powers.toArray()).toEqual([1, 2, 4, 8, 16, 32, 64]);
  });
});
