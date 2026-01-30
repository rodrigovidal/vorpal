import { describe, it, expect } from 'vitest';
import {
  tail,
  init,
  takeLast,
  dropLast,
  takeLastWhile,
  dropLastWhile,
  append,
  prepend,
  insert,
  insertAll,
  update,
  adjust,
  move,
  intersperse,
  splitAt,
  splitWhen,
  without,
  symmetricDifference,
  transpose,
  none,
  reject,
  findLastIndex,
  single,
  uniqWith,
} from '../../src/fn/index.js';

describe('V.fn Array Manipulation Operations', () => {
  describe('tail', () => {
    it('should return all elements except first', () => {
      expect(tail([1, 2, 3, 4])).toEqual([2, 3, 4]);
    });

    it('should return empty for single element', () => {
      expect(tail([1])).toEqual([]);
    });

    it('should return empty for empty array', () => {
      expect(tail([])).toEqual([]);
    });
  });

  describe('init', () => {
    it('should return all elements except last', () => {
      expect(init([1, 2, 3, 4])).toEqual([1, 2, 3]);
    });

    it('should return empty for single element', () => {
      expect(init([1])).toEqual([]);
    });

    it('should return empty for empty array', () => {
      expect(init([])).toEqual([]);
    });
  });

  describe('takeLast', () => {
    it('should take last n elements (curried)', () => {
      expect(takeLast(2)([1, 2, 3, 4])).toEqual([3, 4]);
    });

    it('should take last n elements (direct)', () => {
      expect(takeLast(2, [1, 2, 3, 4])).toEqual([3, 4]);
    });

    it('should return all if n >= length', () => {
      expect(takeLast(10, [1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('should return empty for n <= 0', () => {
      expect(takeLast(0, [1, 2, 3])).toEqual([]);
    });
  });

  describe('dropLast', () => {
    it('should drop last n elements (curried)', () => {
      expect(dropLast(2)([1, 2, 3, 4])).toEqual([1, 2]);
    });

    it('should drop last n elements (direct)', () => {
      expect(dropLast(2, [1, 2, 3, 4])).toEqual([1, 2]);
    });

    it('should return empty if n >= length', () => {
      expect(dropLast(10, [1, 2, 3])).toEqual([]);
    });

    it('should return all for n <= 0', () => {
      expect(dropLast(0, [1, 2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe('takeLastWhile', () => {
    it('should take from end while predicate is true', () => {
      expect(takeLastWhile((x: number) => x > 2)([1, 2, 3, 4])).toEqual([3, 4]);
    });

    it('should return empty if first from end fails', () => {
      expect(takeLastWhile((x: number) => x > 10)([1, 2, 3])).toEqual([]);
    });

    it('should return all if all pass', () => {
      expect(takeLastWhile((x: number) => x > 0)([1, 2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe('dropLastWhile', () => {
    it('should drop from end while predicate is true', () => {
      expect(dropLastWhile((x: number) => x > 2)([1, 2, 3, 4])).toEqual([1, 2]);
    });

    it('should return all if first from end fails', () => {
      expect(dropLastWhile((x: number) => x > 10)([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('should return empty if all pass', () => {
      expect(dropLastWhile((x: number) => x > 0)([1, 2, 3])).toEqual([]);
    });
  });

  describe('append', () => {
    it('should append element (curried)', () => {
      expect(append(4)([1, 2, 3])).toEqual([1, 2, 3, 4]);
    });

    it('should append element (direct)', () => {
      expect(append(4, [1, 2, 3])).toEqual([1, 2, 3, 4]);
    });

    it('should work with empty array', () => {
      expect(append(1, [])).toEqual([1]);
    });
  });

  describe('prepend', () => {
    it('should prepend element (curried)', () => {
      expect(prepend(0)([1, 2, 3])).toEqual([0, 1, 2, 3]);
    });

    it('should prepend element (direct)', () => {
      expect(prepend(0, [1, 2, 3])).toEqual([0, 1, 2, 3]);
    });

    it('should work with empty array', () => {
      expect(prepend(1, [])).toEqual([1]);
    });
  });

  describe('insert', () => {
    it('should insert at index (curried)', () => {
      expect(insert(1, 'x')(['a', 'b', 'c'])).toEqual(['a', 'x', 'b', 'c']);
    });

    it('should insert at index (direct)', () => {
      expect(insert(1, 'x', ['a', 'b', 'c'])).toEqual(['a', 'x', 'b', 'c']);
    });

    it('should insert at beginning', () => {
      expect(insert(0, 'x', ['a', 'b'])).toEqual(['x', 'a', 'b']);
    });

    it('should insert at end', () => {
      expect(insert(2, 'x', ['a', 'b'])).toEqual(['a', 'b', 'x']);
    });
  });

  describe('insertAll', () => {
    it('should insert multiple at index (curried)', () => {
      expect(insertAll(1, ['x', 'y'])(['a', 'b', 'c'])).toEqual(['a', 'x', 'y', 'b', 'c']);
    });

    it('should insert multiple at index (direct)', () => {
      expect(insertAll(1, ['x', 'y'], ['a', 'b', 'c'])).toEqual(['a', 'x', 'y', 'b', 'c']);
    });
  });

  describe('update', () => {
    it('should update at index (curried)', () => {
      expect(update(1, 'x')(['a', 'b', 'c'])).toEqual(['a', 'x', 'c']);
    });

    it('should update at index (direct)', () => {
      expect(update(1, 'x', ['a', 'b', 'c'])).toEqual(['a', 'x', 'c']);
    });

    it('should support negative index', () => {
      expect(update(-1, 'x', ['a', 'b', 'c'])).toEqual(['a', 'b', 'x']);
    });

    it('should return unchanged for out of bounds', () => {
      expect(update(10, 'x', ['a', 'b'])).toEqual(['a', 'b']);
    });
  });

  describe('adjust', () => {
    it('should apply function at index (curried)', () => {
      expect(adjust(1, (x: string) => x.toUpperCase())(['a', 'b', 'c'])).toEqual(['a', 'B', 'c']);
    });

    it('should apply function at index (direct)', () => {
      expect(adjust(1, (x: string) => x.toUpperCase(), ['a', 'b', 'c'])).toEqual(['a', 'B', 'c']);
    });

    it('should support negative index', () => {
      expect(adjust(-1, (x: number) => x * 2, [1, 2, 3])).toEqual([1, 2, 6]);
    });
  });

  describe('move', () => {
    it('should move element (curried)', () => {
      expect(move(0, 2)(['a', 'b', 'c', 'd'])).toEqual(['b', 'c', 'a', 'd']);
    });

    it('should move element (direct)', () => {
      expect(move(0, 2, ['a', 'b', 'c', 'd'])).toEqual(['b', 'c', 'a', 'd']);
    });

    it('should move backwards', () => {
      expect(move(3, 1, ['a', 'b', 'c', 'd'])).toEqual(['a', 'd', 'b', 'c']);
    });
  });

  describe('intersperse', () => {
    it('should insert separator (curried)', () => {
      expect(intersperse('-')(['a', 'b', 'c'])).toEqual(['a', '-', 'b', '-', 'c']);
    });

    it('should insert separator (direct)', () => {
      expect(intersperse('-', ['a', 'b', 'c'])).toEqual(['a', '-', 'b', '-', 'c']);
    });

    it('should handle single element', () => {
      expect(intersperse('-', ['a'])).toEqual(['a']);
    });

    it('should handle empty array', () => {
      expect(intersperse('-', [])).toEqual([]);
    });
  });

  describe('splitAt', () => {
    it('should split at index (curried)', () => {
      expect(splitAt(2)([1, 2, 3, 4, 5])).toEqual([[1, 2], [3, 4, 5]]);
    });

    it('should split at index (direct)', () => {
      expect(splitAt(2, [1, 2, 3, 4, 5])).toEqual([[1, 2], [3, 4, 5]]);
    });

    it('should handle split at 0', () => {
      expect(splitAt(0, [1, 2, 3])).toEqual([[], [1, 2, 3]]);
    });

    it('should handle split beyond length', () => {
      expect(splitAt(10, [1, 2, 3])).toEqual([[1, 2, 3], []]);
    });
  });

  describe('splitWhen', () => {
    it('should split when predicate is true (curried)', () => {
      expect(splitWhen((x: number) => x > 3)([1, 2, 3, 4, 5])).toEqual([[1, 2, 3], [4, 5]]);
    });

    it('should split when predicate is true (direct)', () => {
      expect(splitWhen((x: number) => x > 3, [1, 2, 3, 4, 5])).toEqual([[1, 2, 3], [4, 5]]);
    });

    it('should return all in first if never true', () => {
      expect(splitWhen((x: number) => x > 10, [1, 2, 3])).toEqual([[1, 2, 3], []]);
    });
  });

  describe('without', () => {
    it('should remove values (curried)', () => {
      expect(without([2, 4])([1, 2, 3, 4, 5])).toEqual([1, 3, 5]);
    });

    it('should remove values (direct)', () => {
      expect(without([2, 4], [1, 2, 3, 4, 5])).toEqual([1, 3, 5]);
    });

    it('should handle values not in array', () => {
      expect(without([10, 20], [1, 2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe('symmetricDifference', () => {
    it('should return XOR (curried)', () => {
      expect(symmetricDifference([2, 3, 4])([1, 2, 3])).toEqual([1, 4]);
    });

    it('should return XOR (direct)', () => {
      expect(symmetricDifference([1, 2, 3], [2, 3, 4])).toEqual([1, 4]);
    });

    it('should handle no overlap', () => {
      expect(symmetricDifference([1, 2], [3, 4])).toEqual([1, 2, 3, 4]);
    });

    it('should handle full overlap', () => {
      expect(symmetricDifference([1, 2], [1, 2])).toEqual([]);
    });
  });

  describe('transpose', () => {
    it('should transpose 2D array', () => {
      expect(transpose([[1, 2, 3], [4, 5, 6]])).toEqual([[1, 4], [2, 5], [3, 6]]);
    });

    it('should handle jagged arrays', () => {
      expect(transpose([[1, 2], [3, 4, 5]])).toEqual([[1, 3], [2, 4], [5]]);
    });

    it('should handle empty array', () => {
      expect(transpose([])).toEqual([]);
    });
  });
});

describe('V.fn Additional Boolean Operations', () => {
  describe('none', () => {
    it('should return true if no element matches (curried)', () => {
      expect(none((x: number) => x > 5)([1, 2, 3])).toBe(true);
    });

    it('should return true if no element matches (direct)', () => {
      expect(none((x: number) => x > 5, [1, 2, 3])).toBe(true);
    });

    it('should return false if any element matches', () => {
      expect(none((x: number) => x > 2, [1, 2, 3])).toBe(false);
    });

    it('should return true for empty array', () => {
      expect(none((x: number) => x > 0, [])).toBe(true);
    });
  });

  describe('reject', () => {
    it('should filter out matching elements (curried)', () => {
      expect(reject((x: number) => x % 2 === 0)([1, 2, 3, 4])).toEqual([1, 3]);
    });

    it('should filter out matching elements (direct)', () => {
      expect(reject((x: number) => x % 2 === 0, [1, 2, 3, 4])).toEqual([1, 3]);
    });

    it('should return all if none match', () => {
      expect(reject((x: number) => x > 10, [1, 2, 3])).toEqual([1, 2, 3]);
    });
  });
});

describe('V.fn Additional Search Operations', () => {
  describe('findLastIndex', () => {
    it('should find last matching index (curried)', () => {
      expect(findLastIndex((x: number) => x % 2 === 0)([1, 2, 3, 4, 5])).toBe(3);
    });

    it('should find last matching index (direct)', () => {
      expect(findLastIndex((x: number) => x % 2 === 0, [1, 2, 3, 4, 5])).toBe(3);
    });

    it('should return -1 if not found', () => {
      expect(findLastIndex((x: number) => x > 10, [1, 2, 3])).toBe(-1);
    });
  });

  describe('single', () => {
    it('should return single element', () => {
      expect(single([42])).toBe(42);
    });

    it('should throw for empty array', () => {
      expect(() => single([])).toThrow('Sequence contains no elements');
    });

    it('should throw for multiple elements', () => {
      expect(() => single([1, 2])).toThrow('Sequence contains more than one element');
    });

    it('should work with predicate (curried)', () => {
      expect(single((x: number) => x > 2)([1, 2, 3])).toBe(3);
    });

    it('should work with predicate (direct)', () => {
      expect(single((x: number) => x > 2, [1, 2, 3])).toBe(3);
    });

    it('should throw if multiple match predicate', () => {
      expect(() => single((x: number) => x > 1, [1, 2, 3])).toThrow('Sequence contains more than one matching element');
    });
  });
});

describe('V.fn Additional Set Operations', () => {
  describe('uniqWith', () => {
    it('should dedupe with custom equality (curried)', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 1 }];
      expect(uniqWith<{ id: number }>((a, b) => a.id === b.id)(items)).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should dedupe with custom equality (direct)', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 1 }];
      expect(uniqWith((a: { id: number }, b: { id: number }) => a.id === b.id, items)).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should handle no duplicates', () => {
      expect(uniqWith((a: number, b: number) => a === b, [1, 2, 3])).toEqual([1, 2, 3]);
    });
  });
});
