import { describe, it, expect } from 'vitest';
import { page, paginate } from '../../src/fn/index.js';

describe('V.fn Pagination Operations', () => {
  const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  describe('page', () => {
    it('should get first page (curried)', () => {
      expect(page(1, 5)(data)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should get first page (direct)', () => {
      expect(page(1, 5, data)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should get middle page', () => {
      expect(page(2, 5, data)).toEqual([6, 7, 8, 9, 10]);
    });

    it('should get last page (partial)', () => {
      expect(page(3, 5, data)).toEqual([11, 12, 13, 14, 15]);
    });

    it('should return empty for page beyond range', () => {
      expect(page(4, 5, data)).toEqual([]);
    });

    it('should return empty for page 0', () => {
      expect(page(0, 5, data)).toEqual([]);
    });

    it('should return empty for negative page', () => {
      expect(page(-1, 5, data)).toEqual([]);
    });

    it('should return empty for pageSize 0', () => {
      expect(page(1, 0, data)).toEqual([]);
    });

    it('should handle page size larger than array', () => {
      expect(page(1, 100, data)).toEqual(data);
    });

    it('should work with empty array', () => {
      expect(page(1, 5, [])).toEqual([]);
    });
  });

  describe('paginate', () => {
    it('should return first page with metadata (curried)', () => {
      const result = paginate(1, 5)(data);
      expect(result).toEqual({
        items: [1, 2, 3, 4, 5],
        page: 1,
        pageSize: 5,
        total: 15,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('should return first page with metadata (direct)', () => {
      const result = paginate(1, 5, data);
      expect(result.items).toEqual([1, 2, 3, 4, 5]);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(false);
    });

    it('should return middle page with metadata', () => {
      const result = paginate(2, 5, data);
      expect(result).toEqual({
        items: [6, 7, 8, 9, 10],
        page: 2,
        pageSize: 5,
        total: 15,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('should return last page with metadata', () => {
      const result = paginate(3, 5, data);
      expect(result).toEqual({
        items: [11, 12, 13, 14, 15],
        page: 3,
        pageSize: 5,
        total: 15,
        totalPages: 3,
        hasNext: false,
        hasPrev: true,
      });
    });

    it('should clamp page number to valid range (too high)', () => {
      const result = paginate(10, 5, data);
      expect(result.page).toBe(3); // clamped to last page
      expect(result.items).toEqual([11, 12, 13, 14, 15]);
    });

    it('should clamp page number to valid range (too low)', () => {
      const result = paginate(0, 5, data);
      expect(result.page).toBe(1); // clamped to first page
      expect(result.items).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle empty array', () => {
      const result = paginate(1, 5, []);
      expect(result).toEqual({
        items: [],
        page: 1,
        pageSize: 5,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should handle single page', () => {
      const result = paginate(1, 20, data);
      expect(result).toEqual({
        items: data,
        page: 1,
        pageSize: 20,
        total: 15,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should handle pageSize of 1', () => {
      const result = paginate(3, 1, data);
      expect(result).toEqual({
        items: [3],
        page: 3,
        pageSize: 1,
        total: 15,
        totalPages: 15,
        hasNext: true,
        hasPrev: true,
      });
    });
  });
});
