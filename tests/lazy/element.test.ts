import { describe, test, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('first', () => {
  test('returns first element', () => {
    expect(V([1, 2, 3]).first()).toBe(1);
  });

  test('returns first matching element', () => {
    expect(V([1, 2, 3, 4, 5]).first(x => x > 3)).toBe(4);
  });

  test('returns undefined on empty sequence', () => {
    expect(V([]).first()).toBeUndefined();
  });

  test('returns undefined when no element matches predicate', () => {
    expect(V([1, 2, 3]).first(x => x > 10)).toBeUndefined();
  });
});

describe('last', () => {
  test('returns last element', () => {
    expect(V([1, 2, 3]).last()).toBe(3);
  });

  test('returns last matching element', () => {
    expect(V([1, 2, 3, 4, 5]).last(x => x < 4)).toBe(3);
  });

  test('returns undefined on empty sequence', () => {
    expect(V([]).last()).toBeUndefined();
  });

  test('returns undefined when no element matches predicate', () => {
    expect(V([1, 2, 3]).last(x => x > 10)).toBeUndefined();
  });
});

describe('single', () => {
  test('returns the only element', () => {
    expect(V([42]).single()).toBe(42);
  });

  test('returns the only matching element', () => {
    expect(V([1, 2, 3]).single(x => x === 2)).toBe(2);
  });

  test('returns undefined on empty sequence', () => {
    expect(V([]).single()).toBeUndefined();
  });

  test('returns undefined when more than one element', () => {
    expect(V([1, 2]).single()).toBeUndefined();
  });

  test('returns undefined when more than one match', () => {
    expect(V([1, 2, 2, 3]).single(x => x === 2)).toBeUndefined();
  });
});

describe('at', () => {
  test('returns element at index', () => {
    expect(V([10, 20, 30]).at(1)).toBe(20);
  });

  test('returns first element at index 0', () => {
    expect(V([10, 20, 30]).at(0)).toBe(10);
  });

  test('returns undefined for negative index', () => {
    expect(V([1, 2, 3]).at(-1)).toBeUndefined();
  });

  test('returns undefined for index beyond length', () => {
    expect(V([1, 2, 3]).at(5)).toBeUndefined();
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
