import { describe, test, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('some', () => {
  test('returns true if sequence has elements', () => {
    expect(V([1, 2, 3]).some()).toBe(true);
  });

  test('returns false for empty sequence', () => {
    expect(V([]).some()).toBe(false);
  });

  test('returns true if any element matches predicate', () => {
    expect(V([1, 2, 3, 4, 5]).some(x => x > 4)).toBe(true);
  });

  test('returns false if no element matches predicate', () => {
    expect(V([1, 2, 3]).some(x => x > 10)).toBe(false);
  });

  test('short-circuits on first match', () => {
    let count = 0;
    V([1, 2, 3, 4, 5]).some(x => { count++; return x === 2; });
    expect(count).toBe(2);
  });
});

describe('every', () => {
  test('returns true if all elements match predicate', () => {
    expect(V([2, 4, 6]).every(x => x % 2 === 0)).toBe(true);
  });

  test('returns false if any element fails predicate', () => {
    expect(V([2, 4, 5, 6]).every(x => x % 2 === 0)).toBe(false);
  });

  test('returns true for empty sequence', () => {
    expect(V([]).every(x => x > 0)).toBe(true);
  });

  test('short-circuits on first failure', () => {
    let count = 0;
    V([1, 2, 3, 4, 5]).every(x => { count++; return x < 3; });
    expect(count).toBe(3);
  });
});

describe('includes', () => {
  test('returns true if element exists', () => {
    expect(V([1, 2, 3]).includes(2)).toBe(true);
  });

  test('returns false if element not found', () => {
    expect(V([1, 2, 3]).includes(5)).toBe(false);
  });

  test('returns false for empty sequence', () => {
    expect(V([]).includes(1)).toBe(false);
  });

  test('uses strict equality', () => {
    expect(V([1, 2, 3]).includes('2' as unknown as number)).toBe(false);
  });

  test('short-circuits on match', () => {
    let count = 0;
    const source = {
      *[Symbol.iterator]() {
        for (let i = 1; i <= 5; i++) {
          count++;
          yield i;
        }
      }
    };
    V(source).includes(3);
    expect(count).toBe(3);
  });
});

describe('none', () => {
  test('returns true if no elements match', () => {
    expect(V([1, 2, 3]).none(x => x > 10)).toBe(true);
  });

  test('returns false if any element matches', () => {
    expect(V([1, 2, 3]).none(x => x === 2)).toBe(false);
  });

  test('returns true for empty sequence', () => {
    expect(V([]).none(x => x > 0)).toBe(true);
  });
});

describe('isEmpty', () => {
  test('returns true for empty sequence', () => {
    expect(V([]).isEmpty()).toBe(true);
  });

  test('returns false for non-empty sequence', () => {
    expect(V([1]).isEmpty()).toBe(false);
  });
});
