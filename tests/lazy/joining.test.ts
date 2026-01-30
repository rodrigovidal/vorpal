import { describe, test, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('join', () => {
  test('joins two sequences by key', () => {
    const outer = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
    const inner = [{ userId: 1, score: 100 }, { userId: 2, score: 90 }, { userId: 1, score: 85 }];

    const result = V(outer).join(
      inner,
      o => o.id,
      i => i.userId,
      (o, i) => ({ name: o.name, score: i.score })
    ).toArray();

    expect(result).toEqual([
      { name: 'Alice', score: 100 },
      { name: 'Alice', score: 85 },
      { name: 'Bob', score: 90 },
    ]);
  });

  test('returns empty when no matches', () => {
    const outer = [{ id: 1 }];
    const inner = [{ id: 2 }];

    const result = V(outer).join(inner, o => o.id, i => i.id, (o, i) => o).toArray();
    expect(result).toEqual([]);
  });

  test('handles empty sequences', () => {
    const result = V([{ id: 1 }]).join([], o => o.id, (i: { id: number }) => i.id, (o, i) => o).toArray();
    expect(result).toEqual([]);
  });
});

describe('zip', () => {
  test('combines elements pairwise', () => {
    const result = V([1, 2, 3]).zip(['a', 'b', 'c'], (n, s) => `${n}${s}`).toArray();
    expect(result).toEqual(['1a', '2b', '3c']);
  });

  test('stops at shorter sequence', () => {
    const result = V([1, 2, 3, 4]).zip(['a', 'b'], (n, s) => `${n}${s}`).toArray();
    expect(result).toEqual(['1a', '2b']);
  });

  test('handles empty sequences', () => {
    const result = V([]).zip([1, 2, 3], (a: never, b: number) => b).toArray();
    expect(result).toEqual([]);
  });
});
