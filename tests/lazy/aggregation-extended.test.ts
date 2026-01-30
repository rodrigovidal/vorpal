import { describe, it, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('VorpalLazy Extended Aggregation Operations', () => {
  describe('aggregateBy', () => {
    interface Employee {
      name: string;
      dept: string;
      salary: number;
    }

    const employees: Employee[] = [
      { name: 'Alice', dept: 'eng', salary: 100 },
      { name: 'Bob', dept: 'eng', salary: 150 },
      { name: 'Charlie', dept: 'sales', salary: 80 },
      { name: 'Diana', dept: 'sales', salary: 90 },
      { name: 'Eve', dept: 'hr', salary: 70 },
    ];

    it('should aggregate by key with sum', () => {
      const result = V(employees).aggregateBy(
        e => e.dept,
        () => 0,
        (acc, e) => acc + e.salary
      );

      expect(result.get('eng')).toBe(250);
      expect(result.get('sales')).toBe(170);
      expect(result.get('hr')).toBe(70);
    });

    it('should aggregate by key with count and sum', () => {
      const result = V(employees).aggregateBy(
        e => e.dept,
        () => ({ total: 0, count: 0 }),
        (acc, e) => ({ total: acc.total + e.salary, count: acc.count + 1 })
      );

      expect(result.get('eng')).toEqual({ total: 250, count: 2 });
      expect(result.get('sales')).toEqual({ total: 170, count: 2 });
      expect(result.get('hr')).toEqual({ total: 70, count: 1 });
    });

    it('should handle empty sequence', () => {
      const result = V<Employee>([]).aggregateBy(
        e => e.dept,
        () => 0,
        (acc, e) => acc + e.salary
      );

      expect(result.size).toBe(0);
    });

    it('should work with array aggregation', () => {
      const result = V(employees).aggregateBy(
        e => e.dept,
        () => [] as string[],
        (acc, e) => [...acc, e.name]
      );

      expect(result.get('eng')).toEqual(['Alice', 'Bob']);
      expect(result.get('sales')).toEqual(['Charlie', 'Diana']);
      expect(result.get('hr')).toEqual(['Eve']);
    });

    it('should work with min/max aggregation', () => {
      const result = V(employees).aggregateBy(
        e => e.dept,
        () => ({ min: Infinity, max: -Infinity }),
        (acc, e) => ({
          min: Math.min(acc.min, e.salary),
          max: Math.max(acc.max, e.salary),
        })
      );

      expect(result.get('eng')).toEqual({ min: 100, max: 150 });
      expect(result.get('sales')).toEqual({ min: 80, max: 90 });
    });
  });
});

describe('VorpalLazy Extended Set Operations with Key Selector', () => {
  interface Item {
    id: number;
    name: string;
  }

  const items1: Item[] = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' },
  ];

  const items2: Item[] = [
    { id: 2, name: 'Bobby' },
    { id: 3, name: 'Chuck' },
    { id: 4, name: 'Diana' },
  ];

  describe('unionBy', () => {
    it('should return union by key', () => {
      const result = V(items1).unionBy(items2, x => x.id).toArray();

      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
        { id: 4, name: 'Diana' },
      ]);
    });

    it('should prefer first sequence items', () => {
      const result = V(items1).unionBy(items2, x => x.id).toArray();

      // Bob from items1 should be kept, not Bobby from items2
      const item2 = result.find(x => x.id === 2);
      expect(item2?.name).toBe('Bob');
    });

    it('should handle empty sequences', () => {
      expect(V<Item>([]).unionBy(items2, x => x.id).toArray()).toEqual(items2);
      expect(V(items1).unionBy([], x => x.id).toArray()).toEqual(items1);
    });

    it('should handle disjoint sequences', () => {
      const a = [{ id: 1, name: 'A' }];
      const b = [{ id: 2, name: 'B' }];
      const result = V(a).unionBy(b, x => x.id).toArray();
      expect(result).toEqual([{ id: 1, name: 'A' }, { id: 2, name: 'B' }]);
    });
  });

  describe('intersectBy', () => {
    it('should return intersection by key', () => {
      const result = V(items1).intersectBy(items2, x => x.id).toArray();

      expect(result).toEqual([
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]);
    });

    it('should keep first sequence items', () => {
      const result = V(items1).intersectBy(items2, x => x.id).toArray();

      // Bob from items1 should be kept, not Bobby from items2
      const item2 = result.find(x => x.id === 2);
      expect(item2?.name).toBe('Bob');
    });

    it('should handle empty sequences', () => {
      expect(V<Item>([]).intersectBy(items2, x => x.id).toArray()).toEqual([]);
      expect(V(items1).intersectBy([], x => x.id).toArray()).toEqual([]);
    });

    it('should handle disjoint sequences', () => {
      const a = [{ id: 1, name: 'A' }];
      const b = [{ id: 2, name: 'B' }];
      const result = V(a).intersectBy(b, x => x.id).toArray();
      expect(result).toEqual([]);
    });
  });

  describe('differenceBy', () => {
    it('should return difference by key', () => {
      const result = V(items1).differenceBy(items2, x => x.id).toArray();

      expect(result).toEqual([{ id: 1, name: 'Alice' }]);
    });

    it('should handle empty sequences', () => {
      expect(V<Item>([]).differenceBy(items2, x => x.id).toArray()).toEqual([]);
      expect(V(items1).differenceBy([], x => x.id).toArray()).toEqual(items1);
    });

    it('should handle fully overlapping sequences', () => {
      const result = V(items1).differenceBy(items1, x => x.id).toArray();
      expect(result).toEqual([]);
    });
  });

  describe('exceptBy (alias)', () => {
    it('should work same as differenceBy', () => {
      const result = V(items1).exceptBy(items2, x => x.id).toArray();
      expect(result).toEqual([{ id: 1, name: 'Alice' }]);
    });
  });
});
