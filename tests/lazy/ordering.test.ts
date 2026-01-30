import { describe, test, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('sortBy', () => {
  test('sorts by key ascending', () => {
    const items = [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }];
    const result = V(items).sortBy(x => x.name).toArray();
    expect(result.map(x => x.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  test('sorts numbers correctly', () => {
    expect(V([3, 1, 4, 1, 5]).sortBy(x => x).toArray()).toEqual([1, 1, 3, 4, 5]);
  });

  test('is stable sort', () => {
    const items = [
      { name: 'A', order: 1 },
      { name: 'B', order: 1 },
      { name: 'C', order: 1 },
    ];
    const result = V(items).sortBy(x => x.order).toArray();
    expect(result.map(x => x.name)).toEqual(['A', 'B', 'C']);
  });
});

describe('sortByDesc', () => {
  test('sorts by key descending', () => {
    expect(V([1, 3, 2]).sortByDesc(x => x).toArray()).toEqual([3, 2, 1]);
  });

  test('sorts strings descending', () => {
    const items = [{ name: 'Alice' }, { name: 'Charlie' }, { name: 'Bob' }];
    const result = V(items).sortByDesc(x => x.name).toArray();
    expect(result.map(x => x.name)).toEqual(['Charlie', 'Bob', 'Alice']);
  });
});

describe('reverse', () => {
  test('reverses element order', () => {
    expect(V([1, 2, 3, 4, 5]).reverse().toArray()).toEqual([5, 4, 3, 2, 1]);
  });

  test('works with empty sequence', () => {
    expect(V([]).reverse().toArray()).toEqual([]);
  });

  test('works with single element', () => {
    expect(V([42]).reverse().toArray()).toEqual([42]);
  });
});
