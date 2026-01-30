import { describe, it, expect } from 'vitest';
import {
  scan,
  aggregateBy,
  unionBy,
  intersectionBy,
  differenceBy,
  exceptBy,
} from '../../src/fn/index.js';

describe('V.fn scan', () => {
  it('should return cumulative values with curried execution', () => {
    const result = scan((acc: number, x: number) => acc + x, 0)([1, 2, 3, 4]);
    expect(result).toEqual([0, 1, 3, 6, 10]);
  });

  it('should work with direct execution', () => {
    const result = scan((acc: number, x: number) => acc + x, 0, [1, 2, 3, 4]);
    expect(result).toEqual([0, 1, 3, 6, 10]);
  });

  it('should handle empty array', () => {
    const result = scan((acc: number, x: number) => acc + x, 0)([]);
    expect(result).toEqual([0]);
  });

  it('should work with string concatenation', () => {
    const result = scan((acc: string, x: string) => acc + x, '')(['a', 'b', 'c']);
    expect(result).toEqual(['', 'a', 'ab', 'abc']);
  });

  it('should work with object accumulation', () => {
    const result = scan(
      (acc: { sum: number }, x: number) => ({ sum: acc.sum + x }),
      { sum: 0 }
    )([1, 2, 3]);
    expect(result).toEqual([{ sum: 0 }, { sum: 1 }, { sum: 3 }, { sum: 6 }]);
  });
});

describe('V.fn aggregateBy', () => {
  interface Employee {
    name: string;
    dept: string;
    salary: number;
  }

  const employees: Employee[] = [
    { name: 'Alice', dept: 'eng', salary: 100 },
    { name: 'Bob', dept: 'eng', salary: 150 },
    { name: 'Charlie', dept: 'sales', salary: 80 },
  ];

  it('should work with curried execution', () => {
    const aggregator = aggregateBy(
      (e: Employee) => e.dept,
      () => 0,
      (acc: number, e: Employee) => acc + e.salary
    );

    const result = aggregator(employees);

    expect(result.get('eng')).toBe(250);
    expect(result.get('sales')).toBe(80);
  });

  it('should work with direct execution', () => {
    const result = aggregateBy(
      (e: Employee) => e.dept,
      () => ({ total: 0, count: 0 }),
      (acc, e) => ({ total: acc.total + e.salary, count: acc.count + 1 }),
      employees
    );

    expect(result.get('eng')).toEqual({ total: 250, count: 2 });
    expect(result.get('sales')).toEqual({ total: 80, count: 1 });
  });

  it('should handle empty array', () => {
    const result = aggregateBy(
      (e: Employee) => e.dept,
      () => 0,
      (acc, e) => acc + e.salary,
      []
    );
    expect(result.size).toBe(0);
  });
});

describe('V.fn set operations with key selector', () => {
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
    it('should work with fully curried execution', () => {
      const unionById = unionBy((x: Item) => x.id);
      const unionWith2 = unionById(items2);
      const result = unionWith2(items1);

      expect(result.map(x => x.id)).toEqual([1, 2, 3, 4]);
    });

    it('should work with partially curried execution', () => {
      const unionById = unionBy((x: Item) => x.id, items2);
      const result = unionById(items1);

      expect(result.map(x => x.id)).toEqual([1, 2, 3, 4]);
    });

    it('should work with direct execution', () => {
      const result = unionBy((x: Item) => x.id, items2, items1);

      expect(result.map(x => x.id)).toEqual([1, 2, 3, 4]);
    });
  });

  describe('intersectionBy', () => {
    it('should work with fully curried execution', () => {
      const intersectById = intersectionBy((x: Item) => x.id);
      const intersectWith2 = intersectById(items2);
      const result = intersectWith2(items1);

      expect(result.map(x => x.id)).toEqual([2, 3]);
    });

    it('should work with direct execution', () => {
      const result = intersectionBy((x: Item) => x.id, items2, items1);

      expect(result.map(x => x.id)).toEqual([2, 3]);
    });
  });

  describe('differenceBy', () => {
    it('should work with fully curried execution', () => {
      const diffById = differenceBy((x: Item) => x.id);
      const diffWith2 = diffById(items2);
      const result = diffWith2(items1);

      expect(result).toEqual([{ id: 1, name: 'Alice' }]);
    });

    it('should work with direct execution', () => {
      const result = differenceBy((x: Item) => x.id, items2, items1);

      expect(result).toEqual([{ id: 1, name: 'Alice' }]);
    });
  });

  describe('exceptBy (alias)', () => {
    it('should work same as differenceBy', () => {
      const result = exceptBy((x: Item) => x.id, items2, items1);
      expect(result).toEqual([{ id: 1, name: 'Alice' }]);
    });
  });
});
