import { describe, test, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('chunk', () => {
  test('splits into fixed-size chunks', () => {
    expect(V([1, 2, 3, 4, 5]).chunk(2).toArray()).toEqual([[1, 2], [3, 4], [5]]);
  });

  test('handles exact division', () => {
    expect(V([1, 2, 3, 4]).chunk(2).toArray()).toEqual([[1, 2], [3, 4]]);
  });

  test('handles chunk size larger than sequence', () => {
    expect(V([1, 2]).chunk(5).toArray()).toEqual([[1, 2]]);
  });

  test('handles empty sequence', () => {
    expect(V([]).chunk(3).toArray()).toEqual([]);
  });

  test('handles chunk size of 1', () => {
    expect(V([1, 2, 3]).chunk(1).toArray()).toEqual([[1], [2], [3]]);
  });
});

describe('partition', () => {
  test('splits by predicate', () => {
    const [evens, odds] = V([1, 2, 3, 4, 5]).partition(x => x % 2 === 0);
    expect(evens).toEqual([2, 4]);
    expect(odds).toEqual([1, 3, 5]);
  });

  test('handles all matching', () => {
    const [matches, rest] = V([2, 4, 6]).partition(x => x % 2 === 0);
    expect(matches).toEqual([2, 4, 6]);
    expect(rest).toEqual([]);
  });

  test('handles none matching', () => {
    const [matches, rest] = V([1, 3, 5]).partition(x => x % 2 === 0);
    expect(matches).toEqual([]);
    expect(rest).toEqual([1, 3, 5]);
  });

  test('handles empty sequence', () => {
    const [matches, rest] = V([]).partition((x: number) => x > 0);
    expect(matches).toEqual([]);
    expect(rest).toEqual([]);
  });
});

describe('forEach', () => {
  test('executes action on each element', () => {
    const results: number[] = [];
    V([1, 2, 3]).forEach(x => results.push(x));
    expect(results).toEqual([1, 2, 3]);
  });

  test('provides index to action', () => {
    const results: string[] = [];
    V(['a', 'b', 'c']).forEach((x, i) => results.push(`${i}:${x}`));
    expect(results).toEqual(['0:a', '1:b', '2:c']);
  });

  test('handles empty sequence', () => {
    let called = false;
    V([]).forEach(() => { called = true; });
    expect(called).toBe(false);
  });
});
