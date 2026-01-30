import { describe, test, expect } from 'vitest';
import {
  V,
  entries,
  keys,
  values,
  fromMap,
  fromPairs,
  mapValues,
  filterObj,
  pick,
  omit,
  invert,
  prop,
  path,
  assoc,
  dissoc,
  has,
  merge,
  mergeDeep,
  evolve,
} from '../../src/lazy/index.js';

describe('entries', () => {
  test('wraps object entries', () => {
    expect(entries({ a: 1, b: 2 }).toArray()).toEqual([['a', 1], ['b', 2]]);
  });

  test('works with empty object', () => {
    expect(entries({}).toArray()).toEqual([]);
  });

  test('chains with other operations', () => {
    const result = entries({ a: 1, b: 2, c: 3 })
      .filter(([, v]) => v > 1)
      .toArray();
    expect(result).toEqual([['b', 2], ['c', 3]]);
  });
});

describe('keys', () => {
  test('wraps object keys', () => {
    expect(keys({ a: 1, b: 2 }).toArray()).toEqual(['a', 'b']);
  });

  test('works with empty object', () => {
    expect(keys({}).toArray()).toEqual([]);
  });
});

describe('values', () => {
  test('wraps object values', () => {
    expect(values({ a: 1, b: 2 }).toArray()).toEqual([1, 2]);
  });

  test('chains with operations', () => {
    expect(values({ a: 1, b: 2, c: 3 }).filter(x => x > 1).toArray()).toEqual([2, 3]);
  });
});

describe('fromMap', () => {
  test('wraps Map entries', () => {
    const map = new Map([['a', 1], ['b', 2]]);
    expect(fromMap(map).toArray()).toEqual([['a', 1], ['b', 2]]);
  });

  test('chains with operations', () => {
    const map = new Map([['a', 1], ['b', 2], ['c', 3]]);
    const result = fromMap(map)
      .filter(([, v]) => v > 1)
      .map(([k, v]) => `${k}:${v}`)
      .toArray();
    expect(result).toEqual(['b:2', 'c:3']);
  });
});

describe('fromPairs', () => {
  test('converts pairs to object', () => {
    expect(fromPairs([['a', 1], ['b', 2]])).toEqual({ a: 1, b: 2 });
  });

  test('handles numeric keys', () => {
    expect(fromPairs([[1, 'a'], [2, 'b']])).toEqual({ '1': 'a', '2': 'b' });
  });

  test('later pairs override earlier', () => {
    expect(fromPairs([['a', 1], ['a', 2]])).toEqual({ a: 2 });
  });
});

describe('V().fromPairs / toObject', () => {
  test('converts wrapped pairs to object', () => {
    expect(V([['a', 1], ['b', 2]] as [string, number][]).fromPairs()).toEqual({ a: 1, b: 2 });
  });

  test('toObject is alias for fromPairs', () => {
    expect(V([['x', 10]] as [string, number][]).toObject()).toEqual({ x: 10 });
  });

  test('works in chain', () => {
    const result = entries({ a: 1, b: 2, c: 3 })
      .filter(([, v]) => v > 1)
      .fromPairs();
    expect(result).toEqual({ b: 2, c: 3 });
  });
});

describe('mapValues', () => {
  test('maps over object values', () => {
    expect(mapValues(x => x * 2, { a: 1, b: 2 })).toEqual({ a: 2, b: 4 });
  });

  test('provides key to callback', () => {
    expect(mapValues((v, k) => `${k}:${v}`, { a: 1, b: 2 })).toEqual({ a: 'a:1', b: 'b:2' });
  });

  test('works with empty object', () => {
    expect(mapValues(x => x, {})).toEqual({});
  });
});

describe('filterObj', () => {
  test('filters object by value', () => {
    expect(filterObj(v => v > 1, { a: 1, b: 2, c: 3 })).toEqual({ b: 2, c: 3 });
  });

  test('filters by key', () => {
    expect(filterObj((_, k) => k !== 'b', { a: 1, b: 2, c: 3 })).toEqual({ a: 1, c: 3 });
  });

  test('returns empty when nothing matches', () => {
    expect(filterObj(v => v > 10, { a: 1, b: 2 })).toEqual({});
  });
});

describe('pick', () => {
  test('picks specified keys', () => {
    expect(pick(['a', 'c'], { a: 1, b: 2, c: 3 })).toEqual({ a: 1, c: 3 });
  });

  test('ignores non-existent keys', () => {
    expect(pick(['a', 'd' as keyof { a: number; b: number }], { a: 1, b: 2 })).toEqual({ a: 1 });
  });

  test('returns empty for empty keys', () => {
    expect(pick([], { a: 1, b: 2 })).toEqual({});
  });
});

describe('omit', () => {
  test('omits specified keys', () => {
    expect(omit(['b'], { a: 1, b: 2, c: 3 })).toEqual({ a: 1, c: 3 });
  });

  test('ignores non-existent keys', () => {
    expect(omit(['d' as keyof { a: number; b: number }], { a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  });

  test('returns copy for empty keys', () => {
    expect(omit([], { a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  });
});

describe('invert', () => {
  test('swaps keys and values', () => {
    expect(invert({ a: 'x', b: 'y' })).toEqual({ x: 'a', y: 'b' });
  });

  test('handles numeric values', () => {
    expect(invert({ a: 1, b: 2 })).toEqual({ '1': 'a', '2': 'b' });
  });

  test('later keys win for duplicate values', () => {
    expect(invert({ a: 'x', b: 'x' })).toEqual({ x: 'b' });
  });
});

describe('prop', () => {
  test('gets property value', () => {
    expect(prop('a', { a: 1, b: 2 })).toBe(1);
  });

  test('returns undefined for missing property', () => {
    expect(prop('c' as keyof { a: number }, { a: 1 })).toBeUndefined();
  });
});

describe('path', () => {
  test('gets nested property', () => {
    expect(path(['a', 'b', 'c'], { a: { b: { c: 42 } } })).toBe(42);
  });

  test('returns undefined for missing path', () => {
    expect(path(['a', 'x', 'c'], { a: { b: { c: 42 } } })).toBeUndefined();
  });

  test('handles array indices', () => {
    expect(path(['a', 0, 'b'], { a: [{ b: 1 }, { b: 2 }] })).toBe(1);
  });

  test('returns undefined for null in path', () => {
    expect(path(['a', 'b'], { a: null })).toBeUndefined();
  });
});

describe('assoc', () => {
  test('sets property immutably', () => {
    const obj = { a: 1, b: 2 };
    const result = assoc('c', 3, obj);
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
    expect(obj).toEqual({ a: 1, b: 2 }); // original unchanged
  });

  test('overwrites existing property', () => {
    expect(assoc('a', 10, { a: 1, b: 2 })).toEqual({ a: 10, b: 2 });
  });
});

describe('dissoc', () => {
  test('removes property immutably', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = dissoc('b', obj);
    expect(result).toEqual({ a: 1, c: 3 });
    expect(obj).toEqual({ a: 1, b: 2, c: 3 }); // original unchanged
  });
});

describe('has', () => {
  test('returns true for existing property', () => {
    expect(has('a', { a: 1 })).toBe(true);
  });

  test('returns false for missing property', () => {
    expect(has('b', { a: 1 })).toBe(false);
  });

  test('works with undefined values', () => {
    expect(has('a', { a: undefined })).toBe(true);
  });
});

describe('merge', () => {
  test('merges two objects', () => {
    expect(merge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  test('later objects override earlier', () => {
    expect(merge({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 3, c: 4 });
  });

  test('merges multiple objects', () => {
    expect(merge({ a: 1 }, { b: 2 }, { c: 3 })).toEqual({ a: 1, b: 2, c: 3 });
  });
});

describe('mergeDeep', () => {
  test('deep merges nested objects', () => {
    const target = { a: { b: 1, c: 2 }, d: 3 };
    const source = { a: { b: 10, e: 5 }, f: 6 };
    expect(mergeDeep(target, source)).toEqual({ a: { b: 10, c: 2, e: 5 }, d: 3, f: 6 });
  });

  test('does not mutate original', () => {
    const target = { a: { b: 1 } };
    const source = { a: { c: 2 } };
    mergeDeep(target, source);
    expect(target).toEqual({ a: { b: 1 } });
  });

  test('overwrites arrays (does not merge them)', () => {
    expect(mergeDeep({ a: [1, 2] }, { a: [3] })).toEqual({ a: [3] });
  });
});

describe('evolve', () => {
  test('applies transformations to keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = evolve({ a: x => x * 10, c: x => x + 100 }, obj);
    expect(result).toEqual({ a: 10, b: 2, c: 103 });
  });

  test('ignores missing keys in transformations', () => {
    const obj = { a: 1 };
    const result = evolve({ b: (x: number) => x * 2 } as Record<string, (x: number) => number>, obj);
    expect(result).toEqual({ a: 1 });
  });

  test('does not mutate original', () => {
    const obj = { a: 1 };
    evolve({ a: x => x * 10 }, obj);
    expect(obj).toEqual({ a: 1 });
  });
});

describe('round-trip conversions', () => {
  test('object -> entries -> fromPairs -> object', () => {
    const original = { a: 1, b: 2, c: 3 };
    const result = entries(original).fromPairs();
    expect(result).toEqual(original);
  });

  test('map -> fromMap -> toMap', () => {
    const original = new Map([['a', 1], ['b', 2]]);
    const result = fromMap(original).toMap(([k]) => k, ([, v]) => v);
    expect(result).toEqual(original);
  });

  test('filter and transform object', () => {
    const obj = { alice: 30, bob: 25, carol: 35 };
    const result = entries(obj)
      .filter(([, age]) => age >= 30)
      .map(([name, age]) => [name, age + 1] as [string, number])
      .fromPairs();
    expect(result).toEqual({ alice: 31, carol: 36 });
  });
});
