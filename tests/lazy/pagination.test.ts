import { describe, it, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('VorpalLazy Pagination Operations', () => {
  const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  describe('page', () => {
    it('should get first page', () => {
      expect(V(data).page(1, 5)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should get middle page', () => {
      expect(V(data).page(2, 5)).toEqual([6, 7, 8, 9, 10]);
    });

    it('should get last page', () => {
      expect(V(data).page(3, 5)).toEqual([11, 12, 13, 14, 15]);
    });

    it('should return empty for page beyond range', () => {
      expect(V(data).page(4, 5)).toEqual([]);
    });

    it('should return empty for invalid page', () => {
      expect(V(data).page(0, 5)).toEqual([]);
      expect(V(data).page(-1, 5)).toEqual([]);
    });

    it('should work with chained operations', () => {
      const result = V(data)
        .filter(x => x % 2 === 0)
        .page(1, 3);
      expect(result).toEqual([2, 4, 6]);
    });
  });

  describe('paginate', () => {
    it('should return first page with metadata', () => {
      const result = V(data).paginate(1, 5);
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

    it('should return middle page with metadata', () => {
      const result = V(data).paginate(2, 5);
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
      const result = V(data).paginate(3, 5);
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

    it('should clamp invalid page numbers', () => {
      expect(V(data).paginate(10, 5).page).toBe(3);
      expect(V(data).paginate(0, 5).page).toBe(1);
    });

    it('should handle empty array', () => {
      const result = V<number>([]).paginate(1, 5);
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should work with chained operations', () => {
      const result = V(data)
        .filter(x => x % 2 === 0)
        .paginate(1, 3);
      expect(result.items).toEqual([2, 4, 6]);
      expect(result.total).toBe(7); // 7 even numbers
      expect(result.totalPages).toBe(3);
    });
  });
});
