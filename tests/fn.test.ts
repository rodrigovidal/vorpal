/**
 * Tests for Vorpal Function-Based API
 */

import { describe, it, expect } from 'vitest';
import { V, pipe, filter, map, take, sum, first, last, reduce, groupBy, distinct, sortBy, lazy } from '../src/fn/index.js';

describe('V namespace', () => {
  it('should have all functions available', () => {
    expect(typeof V.pipe).toBe('function');
    expect(typeof V.filter).toBe('function');
    expect(typeof V.map).toBe('function');
    expect(typeof V.reduce).toBe('function');
    expect(typeof V.sum).toBe('function');
    expect(typeof V.first).toBe('function');
    expect(typeof V.last).toBe('function');
    expect(typeof V.groupBy).toBe('function');
    expect(typeof V.distinct).toBe('function');
    expect(typeof V.sortBy).toBe('function');
    expect(typeof V.lazy).toBe('function');
  });
});

describe('pipe', () => {
  it('should compose functions left to right', () => {
    const result = V.pipe(
      V.filter((x: number) => x % 2 === 0),
      V.map((x: number) => x * 2),
      V.take(3)
    )([1, 2, 3, 4, 5, 6, 7, 8]);

    expect(result).toEqual([4, 8, 12]);
  });

  it('should work with single function', () => {
    const result = V.pipe(V.map((x: number) => x * 2))([1, 2, 3]);
    expect(result).toEqual([2, 4, 6]);
  });
});

describe('compose', () => {
  it('should compose functions right to left', () => {
    const result = V.compose(
      V.take<number>(3),
      V.map((x: number) => x * 2),
      V.filter((x: number) => x % 2 === 0)
    )([1, 2, 3, 4, 5, 6, 7, 8]);

    expect(result).toEqual([4, 8, 12]);
  });
});

describe('filter', () => {
  it('should filter with curried form', () => {
    const evens = V.filter((x: number) => x % 2 === 0);
    expect(evens([1, 2, 3, 4, 5])).toEqual([2, 4]);
  });

  it('should filter with direct form', () => {
    expect(V.filter((x: number) => x > 2, [1, 2, 3, 4])).toEqual([3, 4]);
  });

  it('should pass index to predicate', () => {
    const result = V.filter((_, i: number) => i % 2 === 0, ['a', 'b', 'c', 'd']);
    expect(result).toEqual(['a', 'c']);
  });
});

describe('map', () => {
  it('should map with curried form', () => {
    const double = V.map((x: number) => x * 2);
    expect(double([1, 2, 3])).toEqual([2, 4, 6]);
  });

  it('should map with direct form', () => {
    expect(V.map((x: number) => x * 2, [1, 2, 3])).toEqual([2, 4, 6]);
  });

  it('should pass index to selector', () => {
    const result = V.map((x: string, i: number) => `${i}:${x}`, ['a', 'b', 'c']);
    expect(result).toEqual(['0:a', '1:b', '2:c']);
  });
});

describe('flatMap', () => {
  it('should flatMap with curried form', () => {
    const result = V.flatMap((x: number) => [x, x * 2])([1, 2, 3]);
    expect(result).toEqual([1, 2, 2, 4, 3, 6]);
  });

  it('should flatMap with direct form', () => {
    const result = V.flatMap((x: number) => [x, x], [1, 2]);
    expect(result).toEqual([1, 1, 2, 2]);
  });
});

describe('take / skip', () => {
  it('should take first n elements', () => {
    expect(V.take(3, [1, 2, 3, 4, 5])).toEqual([1, 2, 3]);
    expect(V.take(3)([1, 2, 3, 4, 5])).toEqual([1, 2, 3]);
  });

  it('should skip first n elements', () => {
    expect(V.skip(2, [1, 2, 3, 4, 5])).toEqual([3, 4, 5]);
    expect(V.skip(2)([1, 2, 3, 4, 5])).toEqual([3, 4, 5]);
  });

  it('should takeWhile predicate is true', () => {
    expect(V.takeWhile((x: number) => x < 4, [1, 2, 3, 4, 5])).toEqual([1, 2, 3]);
  });

  it('should skipWhile predicate is true', () => {
    expect(V.skipWhile((x: number) => x < 3, [1, 2, 3, 4, 5])).toEqual([3, 4, 5]);
  });
});

describe('first / last', () => {
  it('should get first element', () => {
    expect(V.first([1, 2, 3])).toBe(1);
  });

  it('should get first matching element', () => {
    expect(V.first((x: number) => x > 2, [1, 2, 3, 4])).toBe(3);
    expect(V.first((x: number) => x > 2)([1, 2, 3, 4])).toBe(3);
  });

  it('should return undefined on empty array', () => {
    expect(V.first([])).toBeUndefined();
  });

  it('should get last element', () => {
    expect(V.last([1, 2, 3])).toBe(3);
  });

  it('should get last matching element', () => {
    expect(V.last((x: number) => x < 3, [1, 2, 3, 4])).toBe(2);
  });

  it('should return undefined on empty array for last', () => {
    expect(V.last([])).toBeUndefined();
  });
});

describe('find / findIndex', () => {
  it('should find element', () => {
    expect(V.find((x: number) => x > 2, [1, 2, 3, 4])).toBe(3);
    expect(V.find((x: number) => x > 10, [1, 2, 3])).toBeUndefined();
  });

  it('should find index', () => {
    expect(V.findIndex((x: number) => x > 2, [1, 2, 3, 4])).toBe(2);
    expect(V.findIndex((x: number) => x > 10, [1, 2, 3])).toBe(-1);
  });

  it('should find indexOf', () => {
    expect(V.indexOf(3, [1, 2, 3, 4])).toBe(2);
    expect(V.indexOf(10, [1, 2, 3])).toBe(-1);
  });
});

describe('every / some / includes', () => {
  it('should check every', () => {
    expect(V.every((x: number) => x > 0, [1, 2, 3])).toBe(true);
    expect(V.every((x: number) => x > 1, [1, 2, 3])).toBe(false);
  });

  it('should check some', () => {
    expect(V.some((x: number) => x > 2, [1, 2, 3])).toBe(true);
    expect(V.some((x: number) => x > 10, [1, 2, 3])).toBe(false);
  });

  it('should check includes', () => {
    expect(V.includes(2, [1, 2, 3])).toBe(true);
    expect(V.includes(10, [1, 2, 3])).toBe(false);
  });

  it('should check isEmpty', () => {
    expect(V.isEmpty([])).toBe(true);
    expect(V.isEmpty([1])).toBe(false);
  });
});

describe('aggregations', () => {
  it('should sum numbers', () => {
    expect(V.sum([1, 2, 3, 4])).toBe(10);
  });

  it('should sum with selector', () => {
    expect(V.sum((x: { v: number }) => x.v, [{ v: 1 }, { v: 2 }, { v: 3 }])).toBe(6);
  });

  it('should average numbers', () => {
    expect(V.average([1, 2, 3, 4])).toBe(2.5);
  });

  it('should find min', () => {
    expect(V.min([3, 1, 4, 1, 5])).toBe(1);
  });

  it('should find max', () => {
    expect(V.max([3, 1, 4, 1, 5])).toBe(5);
  });

  it('should find minBy', () => {
    const result = V.minBy((x: { v: number }) => x.v, [{ v: 3 }, { v: 1 }, { v: 2 }]);
    expect(result).toEqual({ v: 1 });
  });

  it('should find maxBy', () => {
    const result = V.maxBy((x: { v: number }) => x.v, [{ v: 3 }, { v: 1 }, { v: 2 }]);
    expect(result).toEqual({ v: 3 });
  });

  it('should count elements', () => {
    expect(V.count([1, 2, 3, 4])).toBe(4);
  });

  it('should count with predicate', () => {
    expect(V.count((x: number) => x % 2 === 0, [1, 2, 3, 4])).toBe(2);
  });

  it('should reduce', () => {
    expect(V.reduce((acc, x) => acc + x, 0, [1, 2, 3, 4])).toBe(10);
    expect(V.reduce((acc: number, x: number) => acc + x, 0)([1, 2, 3])).toBe(6);
  });
});

describe('groupBy', () => {
  it('should group by key', () => {
    const result = V.groupBy((x: number) => x % 2, [1, 2, 3, 4, 5]);
    expect(result).toEqual({ 0: [2, 4], 1: [1, 3, 5] });
  });

  it('should work with curried form', () => {
    const byMod3 = V.groupBy((x: number) => x % 3);
    expect(byMod3([1, 2, 3, 4, 5, 6])).toEqual({ 0: [3, 6], 1: [1, 4], 2: [2, 5] });
  });
});

describe('distinct', () => {
  it('should remove duplicates', () => {
    expect(V.distinct([1, 2, 2, 3, 1, 4])).toEqual([1, 2, 3, 4]);
  });

  it('should remove duplicates by key', () => {
    const result = V.distinct((x: { id: number }) => x.id, [
      { id: 1, v: 'a' },
      { id: 2, v: 'b' },
      { id: 1, v: 'c' },
    ]);
    expect(result).toEqual([{ id: 1, v: 'a' }, { id: 2, v: 'b' }]);
  });
});

describe('sortBy', () => {
  it('should sort by key ascending', () => {
    const result = V.sortBy((x: number) => x, [3, 1, 4, 1, 5]);
    expect(result).toEqual([1, 1, 3, 4, 5]);
  });

  it('should sort by key descending', () => {
    const result = V.sortByDesc((x: number) => x, [3, 1, 4, 1, 5]);
    expect(result).toEqual([5, 4, 3, 1, 1]);
  });

  it('should sort objects', () => {
    const result = V.sortBy(
      (x: { age: number }) => x.age,
      [{ age: 30 }, { age: 20 }, { age: 25 }]
    );
    expect(result).toEqual([{ age: 20 }, { age: 25 }, { age: 30 }]);
  });
});

describe('set operations', () => {
  it('should compute difference', () => {
    expect(V.difference([1, 2, 3], [2, 3, 4])).toEqual([1]);
    expect(V.difference([2, 3, 4])([1, 2, 3])).toEqual([1]);
  });

  it('should compute intersection', () => {
    expect(V.intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
    expect(V.intersection([2, 3, 4])([1, 2, 3])).toEqual([2, 3]);
  });

  it('should compute union', () => {
    expect(V.union([1, 2, 3], [2, 3, 4])).toEqual([1, 2, 3, 4]);
    expect(V.union([2, 3, 4])([1, 2, 3])).toEqual([1, 2, 3, 4]);
  });
});

describe('reverse / concat / zip', () => {
  it('should reverse array', () => {
    expect(V.reverse([1, 2, 3])).toEqual([3, 2, 1]);
  });

  it('should concat arrays', () => {
    expect(V.concat([1, 2], [3, 4])).toEqual([1, 2, 3, 4]);
    expect(V.concat([3, 4])([1, 2])).toEqual([1, 2, 3, 4]);
  });

  it('should zip arrays', () => {
    expect(V.zip([1, 2, 3], [4, 5, 6], (a, b) => a + b)).toEqual([5, 7, 9]);
    expect(V.zip([4, 5, 6], (a: number, b: number) => a + b)([1, 2, 3])).toEqual([5, 7, 9]);
  });

  it('should zip with shorter array', () => {
    expect(V.zip([1, 2], [4, 5, 6], (a, b) => a + b)).toEqual([5, 7]);
  });
});

describe('chunk / flatten', () => {
  it('should chunk array', () => {
    expect(V.chunk(2, [1, 2, 3, 4, 5])).toEqual([[1, 2], [3, 4], [5]]);
    expect(V.chunk(2)([1, 2, 3, 4])).toEqual([[1, 2], [3, 4]]);
  });

  it('should flatten array', () => {
    expect(V.flatten([[1, 2], [3, 4], [5]])).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('partition', () => {
  it('should partition array', () => {
    const [evens, odds] = V.partition((x: number) => x % 2 === 0, [1, 2, 3, 4, 5]);
    expect(evens).toEqual([2, 4]);
    expect(odds).toEqual([1, 3, 5]);
  });
});

describe('generators', () => {
  it('should create range', () => {
    expect(V.range(5)).toEqual([0, 1, 2, 3, 4]);
    expect(V.range(1, 5)).toEqual([1, 2, 3, 4]);
    expect(V.range(0, 10, 2)).toEqual([0, 2, 4, 6, 8]);
  });

  it('should repeat value', () => {
    expect(V.repeat('x', 3)).toEqual(['x', 'x', 'x']);
  });

  it('should call function n times', () => {
    expect(V.times(i => i * 2, 4)).toEqual([0, 2, 4, 6]);
  });
});

describe('lazy evaluation', () => {
  it('should support lazy filter+map+take', () => {
    const result = V.lazy([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      .filter(x => x % 2 === 0)
      .map(x => x * 2)
      .take(3)
      .toArray();

    expect(result).toEqual([4, 8, 12]);
  });

  it('should support lazy first', () => {
    const result = V.lazy([1, 2, 3, 4, 5])
      .filter(x => x > 2)
      .first();

    expect(result).toBe(3);
  });

  it('should support lazy distinct', () => {
    const result = V.lazy([1, 2, 2, 3, 1, 4])
      .distinct()
      .toArray();

    expect(result).toEqual([1, 2, 3, 4]);
  });

  it('should support lazy reduce', () => {
    const result = V.lazy([1, 2, 3, 4])
      .filter(x => x % 2 === 0)
      .reduce((acc, x) => acc + x, 0);

    expect(result).toBe(6);
  });

  it('should support early termination', () => {
    let count = 0;
    const arr = Array.from({ length: 1000 }, (_, i) => i);

    V.lazy(arr)
      .filter(x => {
        count++;
        return x % 2 === 0;
      })
      .take(5)
      .toArray();

    // Should only check ~10 elements, not all 1000
    expect(count).toBeLessThan(20);
  });

  it('should be iterable', () => {
    const pipeline = V.lazy([1, 2, 3]).map(x => x * 2);
    const result = [...pipeline];
    expect(result).toEqual([2, 4, 6]);
  });
});

describe('utility functions', () => {
  it('should tap into pipeline', () => {
    const logged: number[][] = [];
    const result = V.pipe(
      V.filter((x: number) => x > 1),
      V.tap((arr: readonly number[]) => logged.push([...arr])),
      V.map((x: number) => x * 2)
    )([1, 2, 3]);

    expect(result).toEqual([4, 6]);
    expect(logged).toEqual([[2, 3]]);
  });

  it('should join array', () => {
    expect(V.join(', ', [1, 2, 3])).toBe('1, 2, 3');
    expect(V.join('-')(['a', 'b', 'c'])).toBe('a-b-c');
  });

  it('should get element at index', () => {
    expect(V.at(1, [1, 2, 3])).toBe(2);
    expect(V.at(-1)([1, 2, 3])).toBe(3);
  });
});

describe('direct exports', () => {
  it('should export individual functions for tree-shaking', () => {
    expect(typeof pipe).toBe('function');
    expect(typeof filter).toBe('function');
    expect(typeof map).toBe('function');
    expect(typeof take).toBe('function');
    expect(typeof sum).toBe('function');
    expect(typeof first).toBe('function');
    expect(typeof last).toBe('function');
    expect(typeof reduce).toBe('function');
    expect(typeof groupBy).toBe('function');
    expect(typeof distinct).toBe('function');
    expect(typeof sortBy).toBe('function');
    expect(typeof lazy).toBe('function');
  });

  it('should work the same as V.namespace', () => {
    expect(filter((x: number) => x > 1, [1, 2, 3])).toEqual(V.filter((x: number) => x > 1, [1, 2, 3]));
    expect(map((x: number) => x * 2, [1, 2])).toEqual(V.map((x: number) => x * 2, [1, 2]));
    expect(sum([1, 2, 3])).toBe(V.sum([1, 2, 3]));
  });
});
