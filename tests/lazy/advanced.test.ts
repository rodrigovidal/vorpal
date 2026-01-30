import { describe, test, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('aperture', () => {
  test('creates sliding windows of n elements', () => {
    expect(V([1, 2, 3, 4, 5]).aperture(2).toArray()).toEqual([[1, 2], [2, 3], [3, 4], [4, 5]]);
  });

  test('creates windows of size 3', () => {
    expect(V([1, 2, 3, 4, 5]).aperture(3).toArray()).toEqual([[1, 2, 3], [2, 3, 4], [3, 4, 5]]);
  });

  test('returns empty if size > length', () => {
    expect(V([1, 2]).aperture(5).toArray()).toEqual([]);
  });

  test('returns empty for size <= 0', () => {
    expect(V([1, 2, 3]).aperture(0).toArray()).toEqual([]);
  });
});

describe('scan', () => {
  test('returns intermediate reduce values', () => {
    expect(V([1, 2, 3, 4]).scan((acc, x) => acc + x, 0).toArray()).toEqual([0, 1, 3, 6, 10]);
  });

  test('works with string concatenation', () => {
    expect(V(['a', 'b', 'c']).scan((acc, x) => acc + x, '').toArray()).toEqual(['', 'a', 'ab', 'abc']);
  });

  test('returns just seed for empty sequence', () => {
    expect(V([]).scan((acc: number, x: number) => acc + x, 0).toArray()).toEqual([0]);
  });
});

describe('intersperse', () => {
  test('inserts separator between elements', () => {
    expect(V([1, 2, 3]).intersperse(0).toArray()).toEqual([1, 0, 2, 0, 3]);
  });

  test('handles single element', () => {
    expect(V([1]).intersperse(0).toArray()).toEqual([1]);
  });

  test('handles empty sequence', () => {
    expect(V([]).intersperse(0).toArray()).toEqual([]);
  });
});

describe('splitAt', () => {
  test('splits at index', () => {
    expect(V([1, 2, 3, 4, 5]).splitAt(2)).toEqual([[1, 2], [3, 4, 5]]);
  });

  test('splits at 0', () => {
    expect(V([1, 2, 3]).splitAt(0)).toEqual([[], [1, 2, 3]]);
  });

  test('splits at end', () => {
    expect(V([1, 2, 3]).splitAt(3)).toEqual([[1, 2, 3], []]);
  });

  test('handles negative index', () => {
    expect(V([1, 2, 3, 4, 5]).splitAt(-2)).toEqual([[1, 2, 3], [4, 5]]);
  });
});

describe('splitWhen', () => {
  test('splits when predicate becomes true', () => {
    expect(V([1, 2, 3, 4, 5]).splitWhen(x => x === 3)).toEqual([[1, 2], [3, 4, 5]]);
  });

  test('returns all in first if no match', () => {
    expect(V([1, 2, 3]).splitWhen(x => x > 10)).toEqual([[1, 2, 3], []]);
  });

  test('returns all in second if first matches', () => {
    expect(V([1, 2, 3]).splitWhen(x => x === 1)).toEqual([[], [1, 2, 3]]);
  });
});

describe('transpose', () => {
  test('transposes rows and columns', () => {
    expect(V([[1, 2, 3], [4, 5, 6]]).transpose().toArray()).toEqual([[1, 4], [2, 5], [3, 6]]);
  });

  test('handles uneven rows', () => {
    expect(V([[1, 2], [3, 4, 5]]).transpose().toArray()).toEqual([[1, 3], [2, 4], [undefined, 5]]);
  });

  test('handles empty', () => {
    expect(V([]).transpose().toArray()).toEqual([]);
  });
});

describe('xprod', () => {
  test('returns cartesian product', () => {
    expect(V([1, 2]).xprod(['a', 'b']).toArray()).toEqual([
      [1, 'a'], [1, 'b'], [2, 'a'], [2, 'b']
    ]);
  });

  test('handles empty first', () => {
    expect(V([]).xprod([1, 2]).toArray()).toEqual([]);
  });

  test('handles empty second', () => {
    expect(V([1, 2]).xprod([]).toArray()).toEqual([]);
  });
});

describe('uniqWith', () => {
  test('removes duplicates with custom equality', () => {
    const items = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }, { id: 1, name: 'c' }];
    const result = V(items).uniqWith((a, b) => a.id === b.id).toArray();
    expect(result).toEqual([{ id: 1, name: 'a' }, { id: 2, name: 'b' }]);
  });

  test('uses equality function correctly', () => {
    expect(V([1, -1, 2, -2]).uniqWith((a, b) => Math.abs(a) === Math.abs(b)).toArray()).toEqual([1, 2]);
  });
});

describe('prepend', () => {
  test('adds element to start', () => {
    expect(V([2, 3, 4]).prepend(1).toArray()).toEqual([1, 2, 3, 4]);
  });

  test('works on empty', () => {
    expect(V([]).prepend(1).toArray()).toEqual([1]);
  });
});

describe('append', () => {
  test('adds element to end', () => {
    expect(V([1, 2, 3]).append(4).toArray()).toEqual([1, 2, 3, 4]);
  });

  test('works on empty', () => {
    expect(V([]).append(1).toArray()).toEqual([1]);
  });
});

describe('adjust', () => {
  test('applies function to element at index', () => {
    expect(V([1, 2, 3]).adjust(1, x => x * 10).toArray()).toEqual([1, 20, 3]);
  });

  test('adjusts first element', () => {
    expect(V([1, 2, 3]).adjust(0, x => x + 100).toArray()).toEqual([101, 2, 3]);
  });

  test('adjusts last element', () => {
    expect(V([1, 2, 3]).adjust(2, x => x * 2).toArray()).toEqual([1, 2, 6]);
  });

  test('returns unchanged if index out of bounds', () => {
    expect(V([1, 2, 3]).adjust(5, x => x * 10).toArray()).toEqual([1, 2, 3]);
  });

  test('returns unchanged for negative index', () => {
    expect(V([1, 2, 3]).adjust(-1, x => x * 10).toArray()).toEqual([1, 2, 3]);
  });
});

describe('update', () => {
  test('replaces element at index', () => {
    expect(V([1, 2, 3]).update(1, 99).toArray()).toEqual([1, 99, 3]);
  });

  test('updates first element', () => {
    expect(V([1, 2, 3]).update(0, 0).toArray()).toEqual([0, 2, 3]);
  });

  test('updates last element', () => {
    expect(V([1, 2, 3]).update(2, 10).toArray()).toEqual([1, 2, 10]);
  });

  test('returns unchanged if index out of bounds', () => {
    expect(V([1, 2, 3]).update(5, 99).toArray()).toEqual([1, 2, 3]);
  });
});

describe('insert', () => {
  test('inserts element at index', () => {
    expect(V([1, 2, 3]).insert(1, 99).toArray()).toEqual([1, 99, 2, 3]);
  });

  test('inserts at beginning', () => {
    expect(V([1, 2, 3]).insert(0, 0).toArray()).toEqual([0, 1, 2, 3]);
  });

  test('inserts at end', () => {
    expect(V([1, 2, 3]).insert(3, 4).toArray()).toEqual([1, 2, 3, 4]);
  });

  test('appends if index beyond end', () => {
    expect(V([1, 2, 3]).insert(10, 99).toArray()).toEqual([1, 2, 3, 99]);
  });

  test('works on empty', () => {
    expect(V([]).insert(0, 1).toArray()).toEqual([1]);
  });
});

describe('insertAll', () => {
  test('inserts multiple elements at index', () => {
    expect(V([1, 4, 5]).insertAll(1, [2, 3]).toArray()).toEqual([1, 2, 3, 4, 5]);
  });

  test('inserts at beginning', () => {
    expect(V([3, 4]).insertAll(0, [1, 2]).toArray()).toEqual([1, 2, 3, 4]);
  });

  test('inserts at end', () => {
    expect(V([1, 2]).insertAll(2, [3, 4]).toArray()).toEqual([1, 2, 3, 4]);
  });

  test('appends if index beyond end', () => {
    expect(V([1, 2]).insertAll(10, [3, 4]).toArray()).toEqual([1, 2, 3, 4]);
  });

  test('works on empty source', () => {
    expect(V([]).insertAll(0, [1, 2]).toArray()).toEqual([1, 2]);
  });

  test('handles empty items to insert', () => {
    expect(V([1, 2, 3]).insertAll(1, []).toArray()).toEqual([1, 2, 3]);
  });
});

describe('move', () => {
  test('moves element forward', () => {
    expect(V([1, 2, 3, 4, 5]).move(0, 2).toArray()).toEqual([2, 3, 1, 4, 5]);
  });

  test('moves element backward', () => {
    expect(V([1, 2, 3, 4, 5]).move(3, 1).toArray()).toEqual([1, 4, 2, 3, 5]);
  });

  test('move to same position', () => {
    expect(V([1, 2, 3]).move(1, 1).toArray()).toEqual([1, 2, 3]);
  });

  test('returns unchanged for invalid from', () => {
    expect(V([1, 2, 3]).move(10, 1).toArray()).toEqual([1, 2, 3]);
  });

  test('clamps to to end', () => {
    expect(V([1, 2, 3]).move(0, 10).toArray()).toEqual([2, 3, 1]);
  });

  test('clamps to to beginning', () => {
    expect(V([1, 2, 3]).move(2, -5).toArray()).toEqual([3, 1, 2]);
  });
});
