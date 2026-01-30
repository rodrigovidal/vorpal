import { describe, it, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('VorpalLazy Windowing Operations', () => {
  describe('aperture', () => {
    it('should return sliding windows of given size', () => {
      const result = V([1, 2, 3, 4, 5]).aperture(3).toArray();
      expect(result).toEqual([[1, 2, 3], [2, 3, 4], [3, 4, 5]]);
    });

    it('should return pairs for size 2', () => {
      const result = V([1, 2, 3, 4]).aperture(2).toArray();
      expect(result).toEqual([[1, 2], [2, 3], [3, 4]]);
    });

    it('should return empty for size > array length', () => {
      const result = V([1, 2]).aperture(5).toArray();
      expect(result).toEqual([]);
    });

    it('should return empty for size <= 0', () => {
      expect(V([1, 2, 3]).aperture(0).toArray()).toEqual([]);
      expect(V([1, 2, 3]).aperture(-1).toArray()).toEqual([]);
    });

    it('should handle size equal to array length', () => {
      const result = V([1, 2, 3]).aperture(3).toArray();
      expect(result).toEqual([[1, 2, 3]]);
    });

    it('should work with step parameter', () => {
      const result = V([1, 2, 3, 4, 5, 6]).aperture(2, 2).toArray();
      expect(result).toEqual([[1, 2], [3, 4], [5, 6]]);
    });

    it('should work with step > 1', () => {
      const result = V([1, 2, 3, 4, 5, 6, 7]).aperture(3, 2).toArray();
      expect(result).toEqual([[1, 2, 3], [3, 4, 5], [5, 6, 7]]);
    });

    it('should work with step > size', () => {
      const result = V([1, 2, 3, 4, 5, 6, 7, 8, 9]).aperture(2, 3).toArray();
      expect(result).toEqual([[1, 2], [4, 5], [7, 8]]);
    });

    it('should return empty for step <= 0', () => {
      expect(V([1, 2, 3]).aperture(2, 0).toArray()).toEqual([]);
      expect(V([1, 2, 3]).aperture(2, -1).toArray()).toEqual([]);
    });
  });

  describe('slidingWindow', () => {
    it('should be an alias for aperture', () => {
      const result = V([1, 2, 3, 4, 5]).slidingWindow(3).toArray();
      expect(result).toEqual([[1, 2, 3], [2, 3, 4], [3, 4, 5]]);
    });

    it('should work with step parameter', () => {
      const result = V([1, 2, 3, 4, 5, 6]).slidingWindow(2, 2).toArray();
      expect(result).toEqual([[1, 2], [3, 4], [5, 6]]);
    });
  });

  describe('pairwise', () => {
    it('should return consecutive pairs', () => {
      const result = V([1, 2, 3, 4]).pairwise().toArray();
      expect(result).toEqual([[1, 2], [2, 3], [3, 4]]);
    });

    it('should return single pair for 2 elements', () => {
      const result = V([1, 2]).pairwise().toArray();
      expect(result).toEqual([[1, 2]]);
    });

    it('should return empty for single element', () => {
      const result = V([1]).pairwise().toArray();
      expect(result).toEqual([]);
    });

    it('should return empty for empty array', () => {
      const result = V<number>([]).pairwise().toArray();
      expect(result).toEqual([]);
    });

    it('should work with strings', () => {
      const result = V(['a', 'b', 'c']).pairwise().toArray();
      expect(result).toEqual([['a', 'b'], ['b', 'c']]);
    });

    it('should work with objects', () => {
      const a = { id: 1 };
      const b = { id: 2 };
      const c = { id: 3 };
      const result = V([a, b, c]).pairwise().toArray();
      expect(result).toEqual([[a, b], [b, c]]);
    });
  });
});

describe('VorpalLazy Comparison Operations', () => {
  describe('sequenceEqual', () => {
    it('should return true for equal sequences', () => {
      expect(V([1, 2, 3]).sequenceEqual([1, 2, 3])).toBe(true);
    });

    it('should return false for different sequences', () => {
      expect(V([1, 2, 3]).sequenceEqual([1, 2, 4])).toBe(false);
    });

    it('should return false for different lengths', () => {
      expect(V([1, 2]).sequenceEqual([1, 2, 3])).toBe(false);
      expect(V([1, 2, 3]).sequenceEqual([1, 2])).toBe(false);
    });

    it('should return true for empty sequences', () => {
      expect(V<number>([]).sequenceEqual([])).toBe(true);
    });

    it('should work with custom comparer', () => {
      const arr1 = [{ id: 1 }, { id: 2 }];
      const arr2 = [{ id: 1 }, { id: 2 }];
      expect(V(arr1).sequenceEqual(arr2, (a, b) => a.id === b.id)).toBe(true);
    });

    it('should fail with custom comparer on different values', () => {
      const arr1 = [{ id: 1 }, { id: 2 }];
      const arr2 = [{ id: 1 }, { id: 3 }];
      expect(V(arr1).sequenceEqual(arr2, (a, b) => a.id === b.id)).toBe(false);
    });

    it('should work with case-insensitive comparison', () => {
      const cmp = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
      expect(V(['A', 'B', 'C']).sequenceEqual(['a', 'b', 'c'], cmp)).toBe(true);
    });
  });

  describe('startsWith', () => {
    it('should return true when sequence starts with prefix', () => {
      expect(V([1, 2, 3, 4]).startsWith([1, 2])).toBe(true);
    });

    it('should return false when sequence does not start with prefix', () => {
      expect(V([1, 2, 3, 4]).startsWith([2, 3])).toBe(false);
    });

    it('should return true for empty prefix', () => {
      expect(V([1, 2, 3]).startsWith([])).toBe(true);
    });

    it('should return false when prefix is longer than sequence', () => {
      expect(V([1, 2]).startsWith([1, 2, 3])).toBe(false);
    });

    it('should return true when prefix equals sequence', () => {
      expect(V([1, 2, 3]).startsWith([1, 2, 3])).toBe(true);
    });

    it('should work with custom comparer', () => {
      const cmp = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
      expect(V(['A', 'B', 'C']).startsWith(['a', 'b'], cmp)).toBe(true);
    });

    it('should return true for empty sequence with empty prefix', () => {
      expect(V<number>([]).startsWith([])).toBe(true);
    });
  });

  describe('endsWith', () => {
    it('should return true when sequence ends with suffix', () => {
      expect(V([1, 2, 3, 4]).endsWith([3, 4])).toBe(true);
    });

    it('should return false when sequence does not end with suffix', () => {
      expect(V([1, 2, 3, 4]).endsWith([2, 3])).toBe(false);
    });

    it('should return true for empty suffix', () => {
      expect(V([1, 2, 3]).endsWith([])).toBe(true);
    });

    it('should return false when suffix is longer than sequence', () => {
      expect(V([1, 2]).endsWith([1, 2, 3])).toBe(false);
    });

    it('should return true when suffix equals sequence', () => {
      expect(V([1, 2, 3]).endsWith([1, 2, 3])).toBe(true);
    });

    it('should work with custom comparer', () => {
      const cmp = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
      expect(V(['A', 'B', 'C']).endsWith(['b', 'c'], cmp)).toBe(true);
    });

    it('should return true for empty sequence with empty suffix', () => {
      expect(V<number>([]).endsWith([])).toBe(true);
    });
  });
});
