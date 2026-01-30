import { describe, test, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('count', () => {
  test('counts all elements', () => {
    expect(V([1, 2, 3, 4, 5]).count()).toBe(5);
  });

  test('counts elements matching predicate', () => {
    expect(V([1, 2, 3, 4, 5]).count(x => x > 3)).toBe(2);
  });

  test('returns 0 for empty sequence', () => {
    expect(V([]).count()).toBe(0);
  });
});

describe('sum', () => {
  test('sums numbers directly', () => {
    expect(V([1, 2, 3, 4, 5]).sum()).toBe(15);
  });

  test('sums with selector', () => {
    const items = [{ value: 10 }, { value: 20 }, { value: 30 }];
    expect(V(items).sum(x => x.value)).toBe(60);
  });

  test('returns 0 for empty sequence', () => {
    expect(V([]).sum()).toBe(0);
  });
});

describe('average', () => {
  test('calculates average of numbers', () => {
    expect(V([1, 2, 3, 4, 5]).average()).toBe(3);
  });

  test('calculates average with selector', () => {
    const items = [{ score: 80 }, { score: 90 }, { score: 100 }];
    expect(V(items).average(x => x.score)).toBe(90);
  });

  test('returns NaN for empty sequence', () => {
    expect(V([]).average()).toBeNaN();
  });
});

describe('min', () => {
  test('finds minimum value', () => {
    expect(V([3, 1, 4, 1, 5]).min()).toBe(1);
  });

  test('finds minimum with selector', () => {
    const items = [{ age: 30 }, { age: 20 }, { age: 40 }];
    expect(V(items).min(x => x.age)).toBe(20);
  });

  test('returns undefined for empty sequence', () => {
    expect(V([]).min()).toBeUndefined();
  });
});

describe('max', () => {
  test('finds maximum value', () => {
    expect(V([3, 1, 4, 1, 5]).max()).toBe(5);
  });

  test('finds maximum with selector', () => {
    const items = [{ age: 30 }, { age: 20 }, { age: 40 }];
    expect(V(items).max(x => x.age)).toBe(40);
  });

  test('returns undefined for empty sequence', () => {
    expect(V([]).max()).toBeUndefined();
  });
});

describe('reduce', () => {
  test('reduces with seed and accumulator', () => {
    const result = V([1, 2, 3, 4]).reduce(10, (acc, x) => acc + x);
    expect(result).toBe(20); // 10 + 1 + 2 + 3 + 4
  });

  test('works with string accumulation', () => {
    const result = V(['a', 'b', 'c']).reduce('', (acc, x) => acc + x);
    expect(result).toBe('abc');
  });

  test('returns seed for empty sequence', () => {
    const result = V([]).reduce(42, (acc, x) => acc + x);
    expect(result).toBe(42);
  });

  test('builds complex objects', () => {
    const items = [{ key: 'a', value: 1 }, { key: 'b', value: 2 }];
    const result = V(items).reduce({} as Record<string, number>, (acc, item) => {
      acc[item.key] = item.value;
      return acc;
    });
    expect(result).toEqual({ a: 1, b: 2 });
  });
});
