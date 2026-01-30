import { describe, test, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('groupBy', () => {
  test('groups by key', () => {
    const items = [
      { category: 'fruit', name: 'apple' },
      { category: 'vegetable', name: 'carrot' },
      { category: 'fruit', name: 'banana' },
    ];
    const groups = V(items).groupBy(x => x.category).toArray();

    expect(groups.length).toBe(2);
    expect(groups.find(g => g.key === 'fruit')?.values.map(x => x.name)).toEqual(['apple', 'banana']);
    expect(groups.find(g => g.key === 'vegetable')?.values.map(x => x.name)).toEqual(['carrot']);
  });

  test('groups with value selector', () => {
    const items = [
      { category: 'A', value: 1 },
      { category: 'B', value: 2 },
      { category: 'A', value: 3 },
    ];
    const groups = V(items).groupBy(x => x.category, x => x.value).toArray();

    expect(groups.find(g => g.key === 'A')?.values).toEqual([1, 3]);
    expect(groups.find(g => g.key === 'B')?.values).toEqual([2]);
  });

  test('preserves insertion order of keys', () => {
    const items = [{ k: 'b' }, { k: 'a' }, { k: 'c' }, { k: 'a' }];
    const keys = V(items).groupBy(x => x.k).toArray().map(g => g.key);
    expect(keys).toEqual(['b', 'a', 'c']);
  });

  test('handles empty sequence', () => {
    const groups = V([]).groupBy((x: { k: string }) => x.k).toArray();
    expect(groups).toEqual([]);
  });
});

describe('countBy', () => {
  test('counts occurrences by key', () => {
    const items = ['a', 'b', 'a', 'c', 'b', 'a'];
    expect(V(items).countBy(x => x)).toEqual({ a: 3, b: 2, c: 1 });
  });

  test('counts by computed key', () => {
    const items = [1, 2, 3, 4, 5, 6];
    expect(V(items).countBy(x => x % 2 === 0 ? 'even' : 'odd')).toEqual({ odd: 3, even: 3 });
  });
});

describe('indexBy', () => {
  test('creates object indexed by key', () => {
    const items = [{ id: 'a', value: 1 }, { id: 'b', value: 2 }];
    const result = V(items).indexBy(x => x.id);
    expect(result).toEqual({
      a: { id: 'a', value: 1 },
      b: { id: 'b', value: 2 },
    });
  });

  test('last value wins for duplicate keys', () => {
    const items = [{ id: 'a', v: 1 }, { id: 'a', v: 2 }];
    expect(V(items).indexBy(x => x.id)).toEqual({ a: { id: 'a', v: 2 } });
  });
});
