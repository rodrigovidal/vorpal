import { describe, test, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('concat', () => {
  test('concatenates two sequences', () => {
    expect(V([1, 2]).concat([3, 4]).toArray()).toEqual([1, 2, 3, 4]);
  });

  test('works with empty sequences', () => {
    expect(V([1, 2]).concat([]).toArray()).toEqual([1, 2]);
    expect(V([]).concat([3, 4]).toArray()).toEqual([3, 4]);
  });

  test('preserves duplicates', () => {
    expect(V([1, 2]).concat([2, 3]).toArray()).toEqual([1, 2, 2, 3]);
  });
});

describe('union', () => {
  test('combines and removes duplicates', () => {
    expect(V([1, 2, 3]).union([2, 3, 4]).toArray()).toEqual([1, 2, 3, 4]);
  });

  test('removes duplicates from first sequence too', () => {
    expect(V([1, 1, 2]).union([2, 3]).toArray()).toEqual([1, 2, 3]);
  });
});

describe('intersect', () => {
  test('returns common elements', () => {
    expect(V([1, 2, 3, 4]).intersect([2, 4, 6]).toArray()).toEqual([2, 4]);
  });

  test('returns empty for no overlap', () => {
    expect(V([1, 2]).intersect([3, 4]).toArray()).toEqual([]);
  });

  test('removes duplicates', () => {
    expect(V([1, 1, 2, 2]).intersect([1, 2]).toArray()).toEqual([1, 2]);
  });
});

describe('difference', () => {
  test('returns elements not in second sequence', () => {
    expect(V([1, 2, 3, 4]).difference([2, 4]).toArray()).toEqual([1, 3]);
  });

  test('returns all when no overlap', () => {
    expect(V([1, 2]).difference([3, 4]).toArray()).toEqual([1, 2]);
  });

  test('removes duplicates', () => {
    expect(V([1, 1, 2, 2, 3]).difference([2]).toArray()).toEqual([1, 3]);
  });
});

describe('without', () => {
  test('removes specified elements', () => {
    expect(V([1, 2, 3, 4, 5]).without([2, 4]).toArray()).toEqual([1, 3, 5]);
  });

  test('removes all occurrences', () => {
    expect(V([1, 2, 1, 3, 1]).without([1]).toArray()).toEqual([2, 3]);
  });

  test('handles empty exclusion list', () => {
    expect(V([1, 2, 3]).without([]).toArray()).toEqual([1, 2, 3]);
  });
});

describe('symmetricDifference', () => {
  test('returns elements in either but not both', () => {
    expect(V([1, 2, 3, 4]).symmetricDifference([3, 4, 5, 6]).toArray()).toEqual([1, 2, 5, 6]);
  });

  test('handles no overlap', () => {
    expect(V([1, 2]).symmetricDifference([3, 4]).toArray()).toEqual([1, 2, 3, 4]);
  });

  test('handles complete overlap', () => {
    expect(V([1, 2]).symmetricDifference([1, 2]).toArray()).toEqual([]);
  });
});
