import { describe, test, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('first', () => {
  test('returns first element', () => {
    expect(V([1, 2, 3]).first()).toBe(1);
  });

  test('returns first matching element', () => {
    expect(V([1, 2, 3, 4, 5]).first(x => x > 3)).toBe(4);
  });

  test('throws on empty sequence', () => {
    expect(() => V([]).first()).toThrow('Sequence contains no elements');
  });

  test('throws when no element matches predicate', () => {
    expect(() => V([1, 2, 3]).first(x => x > 10)).toThrow('Sequence contains no matching element');
  });
});

describe('firstOr', () => {
  test('returns first element', () => {
    expect(V([1, 2, 3]).firstOr(0)).toBe(1);
  });

  test('returns first matching element', () => {
    expect(V([1, 2, 3, 4, 5]).firstOr(0, x => x > 3)).toBe(4);
  });

  test('returns default for empty sequence', () => {
    expect(V([]).firstOr(42)).toBe(42);
  });

  test('returns default when no element matches', () => {
    expect(V([1, 2, 3]).firstOr(99, x => x > 10)).toBe(99);
  });
});

describe('last', () => {
  test('returns last element', () => {
    expect(V([1, 2, 3]).last()).toBe(3);
  });

  test('returns last matching element', () => {
    expect(V([1, 2, 3, 4, 5]).last(x => x < 4)).toBe(3);
  });

  test('throws on empty sequence', () => {
    expect(() => V([]).last()).toThrow('Sequence contains no elements');
  });
});

describe('lastOr', () => {
  test('returns last element', () => {
    expect(V([1, 2, 3]).lastOr(0)).toBe(3);
  });

  test('returns default for empty sequence', () => {
    expect(V([]).lastOr(42)).toBe(42);
  });

  test('returns last matching element', () => {
    expect(V([1, 2, 3, 4, 5]).lastOr(0, x => x < 4)).toBe(3);
  });
});

describe('single', () => {
  test('returns the only element', () => {
    expect(V([42]).single()).toBe(42);
  });

  test('returns the only matching element', () => {
    expect(V([1, 2, 3]).single(x => x === 2)).toBe(2);
  });

  test('throws on empty sequence', () => {
    expect(() => V([]).single()).toThrow('Sequence contains no elements');
  });

  test('throws when more than one element', () => {
    expect(() => V([1, 2]).single()).toThrow('Sequence contains more than one element');
  });

  test('throws when more than one match', () => {
    expect(() => V([1, 2, 2, 3]).single(x => x === 2)).toThrow('Sequence contains more than one matching element');
  });
});

describe('at', () => {
  test('returns element at index', () => {
    expect(V([10, 20, 30]).at(1)).toBe(20);
  });

  test('returns first element at index 0', () => {
    expect(V([10, 20, 30]).at(0)).toBe(10);
  });

  test('throws for negative index', () => {
    expect(() => V([1, 2, 3]).at(-1)).toThrow('Index out of range');
  });

  test('throws for index beyond length', () => {
    expect(() => V([1, 2, 3]).at(5)).toThrow('Index out of range');
  });
});

describe('findIndex', () => {
  test('returns index of first matching element', () => {
    expect(V([1, 2, 3, 4, 5]).findIndex(x => x > 3)).toBe(3);
  });

  test('returns -1 if no match', () => {
    expect(V([1, 2, 3]).findIndex(x => x > 10)).toBe(-1);
  });
});

describe('findLastIndex', () => {
  test('returns index of last matching element', () => {
    expect(V([1, 2, 3, 2, 1]).findLastIndex(x => x === 2)).toBe(3);
  });

  test('returns -1 if no match', () => {
    expect(V([1, 2, 3]).findLastIndex(x => x > 10)).toBe(-1);
  });
});

describe('indexOf', () => {
  test('returns index of element', () => {
    expect(V(['a', 'b', 'c']).indexOf('b')).toBe(1);
  });

  test('returns -1 if not found', () => {
    expect(V(['a', 'b', 'c']).indexOf('x')).toBe(-1);
  });

  test('returns first occurrence', () => {
    expect(V([1, 2, 1, 2]).indexOf(2)).toBe(1);
  });
});

describe('lastIndexOf', () => {
  test('returns last index of element', () => {
    expect(V([1, 2, 1, 2]).lastIndexOf(2)).toBe(3);
  });

  test('returns -1 if not found', () => {
    expect(V([1, 2, 3]).lastIndexOf(5)).toBe(-1);
  });
});
