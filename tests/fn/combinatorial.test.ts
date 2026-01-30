import { describe, it, expect } from 'vitest';
import {
  permutations,
  combinations,
  shuffle,
  sample,
  randomElement,
  binarySearch,
  binarySearchIndex,
} from '../../src/fn/index.js';

describe('V.fn Combinatorial Operations', () => {
  describe('permutations', () => {
    it('should return all permutations', () => {
      const result = permutations([1, 2, 3]);
      expect(result).toHaveLength(6);
      expect(result).toContainEqual([1, 2, 3]);
      expect(result).toContainEqual([2, 1, 3]);
      expect(result).toContainEqual([3, 2, 1]);
    });

    it('should handle empty array', () => {
      expect(permutations([])).toEqual([[]]);
    });

    it('should handle single element', () => {
      expect(permutations([1])).toEqual([[1]]);
    });
  });

  describe('combinations', () => {
    it('should work with curried execution', () => {
      const result = combinations<number>(2)([1, 2, 3, 4]);
      expect(result).toHaveLength(6);
      expect(result).toContainEqual([1, 2]);
      expect(result).toContainEqual([3, 4]);
    });

    it('should work with direct execution', () => {
      const result = combinations(2, [1, 2, 3]);
      expect(result).toHaveLength(3);
      expect(result).toContainEqual([1, 2]);
      expect(result).toContainEqual([1, 3]);
      expect(result).toContainEqual([2, 3]);
    });

    it('should return empty for k=0', () => {
      expect(combinations(0, [1, 2, 3])).toEqual([[]]);
    });

    it('should return empty for k > length', () => {
      expect(combinations(5, [1, 2])).toEqual([]);
    });
  });
});

describe('V.fn Randomization Operations', () => {
  describe('shuffle', () => {
    it('should return array with same elements', () => {
      const result = shuffle([1, 2, 3, 4, 5]);
      expect(result).toHaveLength(5);
      expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle empty array', () => {
      expect(shuffle([])).toEqual([]);
    });
  });

  describe('sample', () => {
    it('should work with curried execution', () => {
      const result = sample<number>(3)([1, 2, 3, 4, 5]);
      expect(result).toHaveLength(3);
      expect(new Set(result).size).toBe(3);
    });

    it('should work with direct execution', () => {
      const result = sample(2, [1, 2, 3, 4, 5]);
      expect(result).toHaveLength(2);
    });

    it('should return empty for n <= 0', () => {
      expect(sample(0, [1, 2, 3])).toEqual([]);
    });
  });

  describe('randomElement', () => {
    it('should return element from array', () => {
      const result = randomElement([1, 2, 3, 4, 5]);
      expect([1, 2, 3, 4, 5]).toContain(result);
    });

    it('should return undefined for empty array', () => {
      expect(randomElement([])).toBeUndefined();
    });
  });
});

describe('V.fn Search Operations', () => {
  describe('binarySearch', () => {
    const sorted = [1, 3, 5, 7, 9];

    it('should work with curried execution', () => {
      expect(binarySearch<number>(5)(sorted)).toBe(2);
      expect(binarySearch<number>(4)(sorted)).toBe(-1);
    });

    it('should work with direct execution', () => {
      expect(binarySearch(7, undefined, sorted)).toBe(3);
    });

    it('should work with custom comparator (curried)', () => {
      const items = [{ id: 1 }, { id: 3 }, { id: 5 }];
      const search = binarySearch({ id: 3 }, (a, b) => a.id - b.id);
      expect(search(items)).toBe(1);
    });

    it('should return -1 for empty array', () => {
      expect(binarySearch<number>(5)([])).toBe(-1);
    });
  });

  describe('binarySearchIndex', () => {
    const sorted = [1, 3, 5, 7, 9];

    it('should work with curried execution', () => {
      expect(binarySearchIndex<number>(5)(sorted)).toBe(2);
      expect(binarySearchIndex<number>(4)(sorted)).toBe(2);
    });

    it('should return insertion point for missing element', () => {
      expect(binarySearchIndex<number>(0)(sorted)).toBe(0);
      expect(binarySearchIndex<number>(10)(sorted)).toBe(5);
    });

    it('should work with direct execution', () => {
      expect(binarySearchIndex(6, undefined, sorted)).toBe(3);
    });
  });
});
