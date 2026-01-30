import { describe, it, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('VorpalLazy Combinatorial Operations', () => {
  describe('permutations', () => {
    it('should return all permutations', () => {
      const result = V([1, 2, 3]).permutations().toArray();
      expect(result).toHaveLength(6); // 3! = 6
      expect(result).toContainEqual([1, 2, 3]);
      expect(result).toContainEqual([1, 3, 2]);
      expect(result).toContainEqual([2, 1, 3]);
      expect(result).toContainEqual([2, 3, 1]);
      expect(result).toContainEqual([3, 1, 2]);
      expect(result).toContainEqual([3, 2, 1]);
    });

    it('should handle empty array', () => {
      const result = V<number>([]).permutations().toArray();
      expect(result).toEqual([[]]);
    });

    it('should handle single element', () => {
      const result = V([1]).permutations().toArray();
      expect(result).toEqual([[1]]);
    });

    it('should handle two elements', () => {
      const result = V([1, 2]).permutations().toArray();
      expect(result).toHaveLength(2);
      expect(result).toContainEqual([1, 2]);
      expect(result).toContainEqual([2, 1]);
    });
  });

  describe('combinations', () => {
    it('should return all k-combinations', () => {
      const result = V([1, 2, 3, 4]).combinations(2).toArray();
      expect(result).toHaveLength(6); // C(4,2) = 6
      expect(result).toContainEqual([1, 2]);
      expect(result).toContainEqual([1, 3]);
      expect(result).toContainEqual([1, 4]);
      expect(result).toContainEqual([2, 3]);
      expect(result).toContainEqual([2, 4]);
      expect(result).toContainEqual([3, 4]);
    });

    it('should return empty array for k=0', () => {
      const result = V([1, 2, 3]).combinations(0).toArray();
      expect(result).toEqual([[]]);
    });

    it('should return empty array for k > length', () => {
      const result = V([1, 2]).combinations(5).toArray();
      expect(result).toEqual([]);
    });

    it('should return single combination for k = length', () => {
      const result = V([1, 2, 3]).combinations(3).toArray();
      expect(result).toEqual([[1, 2, 3]]);
    });

    it('should return empty for negative k', () => {
      const result = V([1, 2, 3]).combinations(-1).toArray();
      expect(result).toEqual([]);
    });

    it('should handle k=1', () => {
      const result = V([1, 2, 3]).combinations(1).toArray();
      expect(result).toEqual([[1], [2], [3]]);
    });
  });
});

describe('VorpalLazy Randomization Operations', () => {
  describe('shuffle', () => {
    it('should return array with same elements', () => {
      const original = [1, 2, 3, 4, 5];
      const result = V(original).shuffle().toArray();
      expect(result).toHaveLength(5);
      expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle empty array', () => {
      const result = V<number>([]).shuffle().toArray();
      expect(result).toEqual([]);
    });

    it('should handle single element', () => {
      const result = V([1]).shuffle().toArray();
      expect(result).toEqual([1]);
    });
  });

  describe('sample', () => {
    it('should return n random elements', () => {
      const result = V([1, 2, 3, 4, 5]).sample(3).toArray();
      expect(result).toHaveLength(3);
      // All elements should be from original array
      result.forEach(x => expect([1, 2, 3, 4, 5]).toContain(x));
      // Elements should be unique
      expect(new Set(result).size).toBe(3);
    });

    it('should return all elements if n >= length', () => {
      const result = V([1, 2, 3]).sample(5).toArray();
      expect(result).toHaveLength(3);
      expect(result.sort()).toEqual([1, 2, 3]);
    });

    it('should return empty for n <= 0', () => {
      expect(V([1, 2, 3]).sample(0).toArray()).toEqual([]);
      expect(V([1, 2, 3]).sample(-1).toArray()).toEqual([]);
    });
  });

  describe('random', () => {
    it('should return single random element', () => {
      const result = V([1, 2, 3, 4, 5]).random();
      expect([1, 2, 3, 4, 5]).toContain(result);
    });

    it('should return undefined for empty array', () => {
      const result = V<number>([]).random();
      expect(result).toBeUndefined();
    });

    it('should return the only element for single element array', () => {
      const result = V([42]).random();
      expect(result).toBe(42);
    });
  });
});

describe('VorpalLazy Search Operations', () => {
  describe('binarySearch', () => {
    const sorted = [1, 3, 5, 7, 9, 11, 13];

    it('should find element in sorted array', () => {
      expect(V(sorted).binarySearch(7)).toBe(3);
      expect(V(sorted).binarySearch(1)).toBe(0);
      expect(V(sorted).binarySearch(13)).toBe(6);
    });

    it('should return -1 for missing element', () => {
      expect(V(sorted).binarySearch(4)).toBe(-1);
      expect(V(sorted).binarySearch(0)).toBe(-1);
      expect(V(sorted).binarySearch(14)).toBe(-1);
    });

    it('should handle empty array', () => {
      expect(V<number>([]).binarySearch(5)).toBe(-1);
    });

    it('should handle single element array', () => {
      expect(V([5]).binarySearch(5)).toBe(0);
      expect(V([5]).binarySearch(3)).toBe(-1);
    });

    it('should work with custom comparator', () => {
      const items = [{ id: 1 }, { id: 3 }, { id: 5 }, { id: 7 }];
      const result = V(items).binarySearch(
        { id: 5 },
        (a, b) => a.id - b.id
      );
      expect(result).toBe(2);
    });

    it('should work with strings', () => {
      const sorted = ['apple', 'banana', 'cherry', 'date'];
      expect(V(sorted).binarySearch('cherry')).toBe(2);
      expect(V(sorted).binarySearch('fig')).toBe(-1);
    });
  });

  describe('binarySearchIndex', () => {
    const sorted = [1, 3, 5, 7, 9];

    it('should return index of existing element', () => {
      expect(V(sorted).binarySearchIndex(5)).toBe(2);
    });

    it('should return insertion point for missing element', () => {
      expect(V(sorted).binarySearchIndex(4)).toBe(2);
      expect(V(sorted).binarySearchIndex(0)).toBe(0);
      expect(V(sorted).binarySearchIndex(10)).toBe(5);
    });

    it('should handle empty array', () => {
      expect(V<number>([]).binarySearchIndex(5)).toBe(0);
    });

    it('should work with custom comparator', () => {
      const items = [{ id: 1 }, { id: 3 }, { id: 5 }];
      const result = V(items).binarySearchIndex(
        { id: 4 },
        (a, b) => a.id - b.id
      );
      expect(result).toBe(2);
    });
  });
});
