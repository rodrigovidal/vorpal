import { describe, test, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('VorpalLazy base', () => {
  test('V wraps array and is iterable', () => {
    const result = V([1, 2, 3]);
    expect([...result]).toEqual([1, 2, 3]);
  });

  test('toArray returns array copy', () => {
    const source = [1, 2, 3];
    const result = V(source).toArray();
    expect(result).toEqual([1, 2, 3]);
    expect(result).not.toBe(source);
  });

  test('V accepts any iterable', () => {
    const set = new Set([1, 2, 3]);
    expect(V(set).toArray()).toEqual([1, 2, 3]);
  });

  test('toSet returns Set', () => {
    expect(V([1, 2, 2, 3]).toSet()).toEqual(new Set([1, 2, 3]));
  });

  test('toMap creates Map with selectors', () => {
    const items = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
    const map = V(items).toMap(x => x.id, x => x.name);
    expect(map.get(1)).toBe('a');
    expect(map.get(2)).toBe('b');
  });
});
