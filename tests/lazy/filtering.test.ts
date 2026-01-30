import { describe, test, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

describe('filter', () => {
  test('filters elements by predicate', () => {
    const result = V([1, 2, 3, 4, 5]).filter(x => x > 3).toArray();
    expect(result).toEqual([4, 5]);
  });

  test('provides index to predicate', () => {
    const result = V(['a', 'b', 'c']).filter((_, i) => i % 2 === 0).toArray();
    expect(result).toEqual(['a', 'c']);
  });

  test('is lazy - does not iterate until terminal', () => {
    let iterationCount = 0;
    const source = {
      *[Symbol.iterator]() {
        for (let i = 0; i < 5; i++) {
          iterationCount++;
          yield i;
        }
      }
    };
    const query = V(source).filter(x => x > 2);
    expect(iterationCount).toBe(0);
    query.toArray();
    expect(iterationCount).toBe(5);
  });

  test('type narrows with type guard', () => {
    const mixed: (string | number)[] = [1, 'two', 3, 'four'];
    const numbers = V(mixed)
      .filter((x): x is number => typeof x === 'number')
      .toArray();
    expect(numbers).toEqual([1, 3]);
  });
});

describe('take', () => {
  test('takes first n elements', () => {
    expect(V([1, 2, 3, 4, 5]).take(3).toArray()).toEqual([1, 2, 3]);
  });

  test('takes all if n > length', () => {
    expect(V([1, 2]).take(5).toArray()).toEqual([1, 2]);
  });

  test('takes none if n <= 0', () => {
    expect(V([1, 2, 3]).take(0).toArray()).toEqual([]);
    expect(V([1, 2, 3]).take(-1).toArray()).toEqual([]);
  });

  test('is lazy - stops iteration early', () => {
    let iterationCount = 0;
    const source = {
      *[Symbol.iterator]() {
        for (let i = 0; i < 100; i++) {
          iterationCount++;
          yield i;
        }
      }
    };
    V(source).take(3).toArray();
    expect(iterationCount).toBe(3);
  });
});

describe('skip', () => {
  test('skips first n elements', () => {
    expect(V([1, 2, 3, 4, 5]).skip(2).toArray()).toEqual([3, 4, 5]);
  });

  test('skips all if n >= length', () => {
    expect(V([1, 2]).skip(5).toArray()).toEqual([]);
  });

  test('skips none if n <= 0', () => {
    expect(V([1, 2, 3]).skip(0).toArray()).toEqual([1, 2, 3]);
  });
});

describe('takeWhile', () => {
  test('takes while predicate is true', () => {
    expect(V([1, 2, 3, 4, 1]).takeWhile(x => x < 4).toArray()).toEqual([1, 2, 3]);
  });

  test('takes none if first fails', () => {
    expect(V([5, 1, 2]).takeWhile(x => x < 3).toArray()).toEqual([]);
  });

  test('provides index', () => {
    expect(V([0, 1, 2, 3]).takeWhile((x, i) => x === i).toArray()).toEqual([0, 1, 2, 3]);
  });
});

describe('skipWhile', () => {
  test('skips while predicate is true', () => {
    expect(V([1, 2, 3, 4, 1]).skipWhile(x => x < 3).toArray()).toEqual([3, 4, 1]);
  });

  test('skips none if first fails', () => {
    expect(V([5, 1, 2]).skipWhile(x => x < 3).toArray()).toEqual([5, 1, 2]);
  });
});

describe('distinct', () => {
  test('removes duplicates', () => {
    expect(V([1, 2, 2, 3, 1, 3]).distinct().toArray()).toEqual([1, 2, 3]);
  });

  test('preserves order of first occurrence', () => {
    expect(V([3, 1, 2, 1, 3]).distinct().toArray()).toEqual([3, 1, 2]);
  });

  test('works with objects by reference', () => {
    const a = { id: 1 };
    const b = { id: 2 };
    expect(V([a, b, a]).distinct().toArray()).toEqual([a, b]);
  });
});

describe('distinctBy', () => {
  test('removes duplicates by key', () => {
    const items = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
      { id: 1, name: 'c' },
    ];
    const result = V(items).distinctBy(x => x.id).toArray();
    expect(result).toEqual([{ id: 1, name: 'a' }, { id: 2, name: 'b' }]);
  });
});

describe('reject', () => {
  test('keeps elements that do not match predicate', () => {
    expect(V([1, 2, 3, 4, 5]).reject(x => x > 3).toArray()).toEqual([1, 2, 3]);
  });

  test('is opposite of filter', () => {
    const data = [1, 2, 3, 4, 5];
    const pred = (x: number) => x % 2 === 0;
    expect(V(data).reject(pred).toArray()).toEqual(data.filter(x => !pred(x, 0)));
  });
});

describe('tail', () => {
  test('returns all except first element', () => {
    expect(V([1, 2, 3, 4]).tail().toArray()).toEqual([2, 3, 4]);
  });

  test('returns empty for single element', () => {
    expect(V([1]).tail().toArray()).toEqual([]);
  });

  test('returns empty for empty sequence', () => {
    expect(V([]).tail().toArray()).toEqual([]);
  });
});

describe('init', () => {
  test('returns all except last element', () => {
    expect(V([1, 2, 3, 4]).init().toArray()).toEqual([1, 2, 3]);
  });

  test('returns empty for single element', () => {
    expect(V([1]).init().toArray()).toEqual([]);
  });

  test('returns empty for empty sequence', () => {
    expect(V([]).init().toArray()).toEqual([]);
  });
});

describe('takeLast', () => {
  test('takes n elements from end', () => {
    expect(V([1, 2, 3, 4, 5]).takeLast(2).toArray()).toEqual([4, 5]);
  });

  test('takes all if n > length', () => {
    expect(V([1, 2]).takeLast(5).toArray()).toEqual([1, 2]);
  });

  test('takes none if n <= 0', () => {
    expect(V([1, 2, 3]).takeLast(0).toArray()).toEqual([]);
  });
});

describe('dropLast', () => {
  test('drops n elements from end', () => {
    expect(V([1, 2, 3, 4, 5]).dropLast(2).toArray()).toEqual([1, 2, 3]);
  });

  test('drops all if n >= length', () => {
    expect(V([1, 2]).dropLast(5).toArray()).toEqual([]);
  });

  test('drops none if n <= 0', () => {
    expect(V([1, 2, 3]).dropLast(0).toArray()).toEqual([1, 2, 3]);
  });
});

describe('takeLastWhile', () => {
  test('takes from end while predicate is true', () => {
    expect(V([1, 2, 3, 4, 5]).takeLastWhile(x => x > 3).toArray()).toEqual([4, 5]);
  });

  test('takes none if last element fails', () => {
    expect(V([1, 2, 3]).takeLastWhile(x => x < 0).toArray()).toEqual([]);
  });
});

describe('dropLastWhile', () => {
  test('drops from end while predicate is true', () => {
    expect(V([1, 2, 3, 4, 5]).dropLastWhile(x => x > 3).toArray()).toEqual([1, 2, 3]);
  });

  test('drops none if last element fails', () => {
    expect(V([1, 2, 3]).dropLastWhile(x => x < 0).toArray()).toEqual([1, 2, 3]);
  });
});

describe('slice', () => {
  test('returns slice from start to end', () => {
    expect(V([1, 2, 3, 4, 5]).slice(1, 4).toArray()).toEqual([2, 3, 4]);
  });

  test('returns from start if no end', () => {
    expect(V([1, 2, 3, 4, 5]).slice(2).toArray()).toEqual([3, 4, 5]);
  });

  test('handles negative indices', () => {
    expect(V([1, 2, 3, 4, 5]).slice(-2).toArray()).toEqual([4, 5]);
  });
});
