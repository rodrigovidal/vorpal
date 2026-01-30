import { describe, test, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('map', () => {
  test('transforms each element', () => {
    expect(V([1, 2, 3]).map(x => x * 2).toArray()).toEqual([2, 4, 6]);
  });

  test('provides index', () => {
    expect(V(['a', 'b', 'c']).map((x, i) => `${i}:${x}`).toArray())
      .toEqual(['0:a', '1:b', '2:c']);
  });

  test('changes type', () => {
    const result = V([{ name: 'Alice' }, { name: 'Bob' }])
      .map(x => x.name)
      .toArray();
    expect(result).toEqual(['Alice', 'Bob']);
  });

  test('is lazy', () => {
    let count = 0;
    const query = V([1, 2, 3]).map(x => { count++; return x; });
    expect(count).toBe(0);
    query.toArray();
    expect(count).toBe(3);
  });
});

describe('flatMap', () => {
  test('flattens nested iterables', () => {
    const result = V([[1, 2], [3, 4], [5]]).flatMap(x => x).toArray();
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  test('transforms then flattens', () => {
    const data = [{ tags: ['a', 'b'] }, { tags: ['c'] }];
    const result = V(data).flatMap(x => x.tags).toArray();
    expect(result).toEqual(['a', 'b', 'c']);
  });

  test('provides index', () => {
    const result = V(['ab', 'cd']).flatMap((s, i) =>
      [...s].map(c => `${i}:${c}`)
    ).toArray();
    expect(result).toEqual(['0:a', '0:b', '1:c', '1:d']);
  });
});

describe('as', () => {
  test('casts element type', () => {
    const anys: unknown[] = [1, 2, 3];
    const numbers = V(anys).as<number>().toArray();
    expect(numbers).toEqual([1, 2, 3]);
  });
});

describe('ofType', () => {
  test('filters and narrows by type guard', () => {
    const mixed: unknown[] = [1, 'two', 3, 'four', 5];
    const strings = V(mixed)
      .ofType((x): x is string => typeof x === 'string')
      .toArray();
    expect(strings).toEqual(['two', 'four']);
  });
});

describe('flatten', () => {
  test('flattens one level deep', () => {
    expect(V([[1, 2], [3, 4], [5]]).flatten().toArray()).toEqual([1, 2, 3, 4, 5]);
  });

  test('flattens deeply by default', () => {
    expect(V([[1, [2, 3]], [[4], 5]]).flatten().toArray()).toEqual([1, 2, 3, 4, 5]);
  });

  test('handles empty arrays', () => {
    expect(V([[], [1], []]).flatten().toArray()).toEqual([1]);
  });

  test('handles non-array elements', () => {
    expect(V([1, [2, 3], 4]).flatten().toArray()).toEqual([1, 2, 3, 4]);
  });
});

describe('pluck', () => {
  test('extracts property from each object', () => {
    const items = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }];
    expect(V(items).pluck('name').toArray()).toEqual(['Alice', 'Bob']);
  });

  test('returns undefined for missing properties', () => {
    const items = [{ a: 1 }, { b: 2 }] as { a?: number; b?: number }[];
    expect(V(items).pluck('a').toArray()).toEqual([1, undefined]);
  });
});
