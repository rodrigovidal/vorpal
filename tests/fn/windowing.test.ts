import { describe, it, expect } from 'vitest';
import {
  aperture,
  slidingWindow,
  pairwise,
  sequenceEqual,
  startsWith,
  endsWith,
} from '../../src/fn/index.js';

describe('V.fn Windowing Operations', () => {
  describe('aperture', () => {
    it('should work with curried execution', () => {
      const result = aperture<number>(3)([1, 2, 3, 4, 5]);
      expect(result).toEqual([[1, 2, 3], [2, 3, 4], [3, 4, 5]]);
    });

    it('should work with step parameter (curried)', () => {
      const result = aperture<number>(2, 2)([1, 2, 3, 4, 5, 6]);
      expect(result).toEqual([[1, 2], [3, 4], [5, 6]]);
    });

    it('should work with direct execution', () => {
      const result = aperture(3, 1, [1, 2, 3, 4, 5]);
      expect(result).toEqual([[1, 2, 3], [2, 3, 4], [3, 4, 5]]);
    });

    it('should return empty for size > array length', () => {
      expect(aperture<number>(5)([1, 2])).toEqual([]);
    });

    it('should return empty for size <= 0', () => {
      expect(aperture<number>(0)([1, 2, 3])).toEqual([]);
      expect(aperture<number>(-1)([1, 2, 3])).toEqual([]);
    });

    it('should work with step > size', () => {
      const result = aperture<number>(2, 3)([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(result).toEqual([[1, 2], [4, 5], [7, 8]]);
    });
  });

  describe('slidingWindow', () => {
    it('should be an alias for aperture', () => {
      const result = slidingWindow<number>(3)([1, 2, 3, 4, 5]);
      expect(result).toEqual([[1, 2, 3], [2, 3, 4], [3, 4, 5]]);
    });

    it('should work with step parameter', () => {
      const result = slidingWindow<number>(2, 2)([1, 2, 3, 4, 5, 6]);
      expect(result).toEqual([[1, 2], [3, 4], [5, 6]]);
    });
  });

  describe('pairwise', () => {
    it('should return consecutive pairs', () => {
      const result = pairwise([1, 2, 3, 4]);
      expect(result).toEqual([[1, 2], [2, 3], [3, 4]]);
    });

    it('should return single pair for 2 elements', () => {
      const result = pairwise([1, 2]);
      expect(result).toEqual([[1, 2]]);
    });

    it('should return empty for single element', () => {
      const result = pairwise([1]);
      expect(result).toEqual([]);
    });

    it('should return empty for empty array', () => {
      const result = pairwise<number>([]);
      expect(result).toEqual([]);
    });

    it('should work with strings', () => {
      const result = pairwise(['a', 'b', 'c']);
      expect(result).toEqual([['a', 'b'], ['b', 'c']]);
    });
  });
});

describe('V.fn Comparison Operations', () => {
  describe('sequenceEqual', () => {
    it('should work with direct execution', () => {
      expect(sequenceEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(sequenceEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    });

    it('should work with curried execution', () => {
      const equalsTo123 = sequenceEqual<number>([1, 2, 3]);
      expect(equalsTo123([1, 2, 3])).toBe(true);
      expect(equalsTo123([1, 2, 4])).toBe(false);
    });

    it('should return false for different lengths', () => {
      expect(sequenceEqual([1, 2], [1, 2, 3])).toBe(false);
      expect(sequenceEqual([1, 2, 3], [1, 2])).toBe(false);
    });

    it('should return true for empty sequences', () => {
      expect(sequenceEqual<number>([], [])).toBe(true);
    });

    it('should work with custom comparer (direct)', () => {
      const arr1 = [{ id: 1 }, { id: 2 }];
      const arr2 = [{ id: 1 }, { id: 2 }];
      expect(sequenceEqual(arr1, arr2, (a, b) => a.id === b.id)).toBe(true);
    });

    it('should work with custom comparer (curried)', () => {
      const cmp = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
      const equalsIgnoreCase = sequenceEqual<string>(['A', 'B', 'C'], cmp);
      expect(equalsIgnoreCase(['a', 'b', 'c'])).toBe(true);
      expect(equalsIgnoreCase(['x', 'y', 'z'])).toBe(false);
    });
  });

  describe('startsWith', () => {
    it('should work with direct execution', () => {
      expect(startsWith([1, 2, 3, 4], [1, 2])).toBe(true);
      expect(startsWith([1, 2, 3, 4], [2, 3])).toBe(false);
    });

    it('should work with curried execution', () => {
      const startsWithAB = startsWith<string>(['A', 'B']);
      expect(startsWithAB(['A', 'B', 'C'])).toBe(true);
      expect(startsWithAB(['X', 'Y', 'Z'])).toBe(false);
    });

    it('should return true for empty prefix', () => {
      expect(startsWith([1, 2, 3], [])).toBe(true);
    });

    it('should return false when prefix is longer', () => {
      expect(startsWith([1, 2], [1, 2, 3])).toBe(false);
    });

    it('should work with custom comparer (direct)', () => {
      const cmp = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
      expect(startsWith(['A', 'B', 'C'], ['a', 'b'], cmp)).toBe(true);
    });

    it('should work with custom comparer (curried)', () => {
      const cmp = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
      const startsWithAB = startsWith<string>(['a', 'b'], cmp);
      expect(startsWithAB(['A', 'B', 'C'])).toBe(true);
    });
  });

  describe('endsWith', () => {
    it('should work with direct execution', () => {
      expect(endsWith([1, 2, 3, 4], [3, 4])).toBe(true);
      expect(endsWith([1, 2, 3, 4], [2, 3])).toBe(false);
    });

    it('should work with curried execution', () => {
      const endsWithCD = endsWith<string>(['C', 'D']);
      expect(endsWithCD(['A', 'B', 'C', 'D'])).toBe(true);
      expect(endsWithCD(['X', 'Y', 'Z'])).toBe(false);
    });

    it('should return true for empty suffix', () => {
      expect(endsWith([1, 2, 3], [])).toBe(true);
    });

    it('should return false when suffix is longer', () => {
      expect(endsWith([1, 2], [1, 2, 3])).toBe(false);
    });

    it('should work with custom comparer (direct)', () => {
      const cmp = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
      expect(endsWith(['A', 'B', 'C'], ['b', 'c'], cmp)).toBe(true);
    });

    it('should work with custom comparer (curried)', () => {
      const cmp = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
      const endsWithBC = endsWith<string>(['b', 'c'], cmp);
      expect(endsWithBC(['A', 'B', 'C'])).toBe(true);
    });
  });
});
