import { bench, describe } from 'vitest';
import { V as VLazy } from '../src/lazy/index.js';
import * as VFn from '../src/fn/index.js';
import _ from 'lodash';
import * as R from 'ramda';

// Test data
const small = Array.from({ length: 100 }, (_, i) => i);
const medium = Array.from({ length: 10_000 }, (_, i) => i);
const large = Array.from({ length: 100_000 }, (_, i) => i);

// ==================== Pagination ====================

describe('Pagination: page(2, 100) on 10k items', () => {
  bench('Native slice', () => {
    const page = 2, size = 100;
    medium.slice((page - 1) * size, page * size);
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).page(2, 100);
  });

  bench('Vorpal Fn', () => {
    VFn.page(2, 100, medium);
  });

  bench('Lodash drop+take', () => {
    _.take(_.drop(medium, 100), 100);
  });
});

describe('Pagination: paginate(5, 100) on 10k items', () => {
  bench('Native (manual metadata)', () => {
    const pageNum = 5, pageSize = 100;
    const total = medium.length;
    const totalPages = Math.ceil(total / pageSize);
    const items = medium.slice((pageNum - 1) * pageSize, pageNum * pageSize);
    ({ items, page: pageNum, pageSize, total, totalPages, hasNext: pageNum < totalPages, hasPrev: pageNum > 1 });
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).paginate(5, 100);
  });

  bench('Vorpal Fn', () => {
    VFn.paginate(5, 100, medium);
  });
});

// ==================== Tail / Init ====================

describe('tail (all but first) on 10k items', () => {
  bench('Native slice(1)', () => {
    medium.slice(1);
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).tail().toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.tail(medium);
  });

  bench('Lodash tail', () => {
    _.tail(medium);
  });

  bench('Ramda tail', () => {
    R.tail(medium);
  });
});

describe('init (all but last) on 10k items', () => {
  bench('Native slice(0, -1)', () => {
    medium.slice(0, -1);
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).init().toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.init(medium);
  });

  bench('Lodash initial', () => {
    _.initial(medium);
  });

  bench('Ramda init', () => {
    R.init(medium);
  });
});

// ==================== Take/Drop Last ====================

describe('takeLast(100) on 10k items', () => {
  bench('Native slice(-100)', () => {
    medium.slice(-100);
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).takeLast(100).toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.takeLast(100, medium);
  });

  bench('Lodash takeRight', () => {
    _.takeRight(medium, 100);
  });

  bench('Ramda takeLast', () => {
    R.takeLast(100, medium);
  });
});

describe('dropLast(100) on 10k items', () => {
  bench('Native slice(0, -100)', () => {
    medium.slice(0, -100);
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).dropLast(100).toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.dropLast(100, medium);
  });

  bench('Lodash dropRight', () => {
    _.dropRight(medium, 100);
  });

  bench('Ramda dropLast', () => {
    R.dropLast(100, medium);
  });
});

// ==================== Append / Prepend ====================

describe('append on 10k items', () => {
  bench('Native spread', () => {
    [...medium, 999];
  });

  bench('Native concat', () => {
    medium.concat([999]);
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).append(999).toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.append(999, medium);
  });

  bench('Ramda append', () => {
    R.append(999, medium);
  });
});

describe('prepend on 10k items', () => {
  bench('Native spread', () => {
    [999, ...medium];
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).prepend(999).toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.prepend(999, medium);
  });

  bench('Ramda prepend', () => {
    R.prepend(999, medium);
  });
});

// ==================== Insert / Update / Adjust ====================

describe('insert at middle on 10k items', () => {
  bench('Native splice (mutating copy)', () => {
    const copy = medium.slice();
    copy.splice(5000, 0, 999);
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).insert(5000, 999).toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.insert(5000, 999, medium);
  });

  bench('Ramda insert', () => {
    R.insert(5000, 999, medium);
  });
});

describe('update at index on 10k items', () => {
  bench('Native (spread + slice)', () => {
    [...medium.slice(0, 5000), 999, ...medium.slice(5001)];
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).update(5000, 999).toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.update(5000, 999, medium);
  });

  bench('Ramda update', () => {
    R.update(5000, 999, medium);
  });
});

describe('adjust at index on 10k items', () => {
  const double = (x: number) => x * 2;

  bench('Native (map with index check)', () => {
    medium.map((x, i) => i === 5000 ? double(x) : x);
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).adjust(5000, double).toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.adjust(5000, double, medium);
  });

  bench('Ramda adjust', () => {
    R.adjust(5000, double, medium);
  });
});

// ==================== Without / Reject ====================

describe('without([specific values]) on 10k items', () => {
  const toRemove = [100, 200, 300, 400, 500];

  bench('Native filter', () => {
    const set = new Set(toRemove);
    medium.filter(x => !set.has(x));
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).without(toRemove).toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.without(toRemove, medium);
  });

  bench('Lodash without', () => {
    _.without(medium, ...toRemove);
  });

  bench('Ramda without', () => {
    R.without(toRemove, medium);
  });
});

describe('reject (opposite of filter) on 10k items', () => {
  const isEven = (x: number) => x % 2 === 0;

  bench('Native filter(!pred)', () => {
    medium.filter(x => !isEven(x));
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).reject(isEven).toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.reject(isEven, medium);
  });

  bench('Lodash reject', () => {
    _.reject(medium, isEven);
  });

  bench('Ramda reject', () => {
    R.reject(isEven, medium);
  });
});

// ==================== None ====================

describe('none (no elements match) on 10k items', () => {
  const isNegative = (x: number) => x < 0;

  bench('Native !some', () => {
    !medium.some(isNegative);
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).none(isNegative);
  });

  bench('Vorpal Fn', () => {
    VFn.none(isNegative, medium);
  });

  bench('Ramda none', () => {
    R.none(isNegative, medium);
  });
});

// ==================== Split Operations ====================

describe('splitAt(5000) on 10k items', () => {
  bench('Native slice x2', () => {
    [medium.slice(0, 5000), medium.slice(5000)];
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).splitAt(5000);
  });

  bench('Vorpal Fn', () => {
    VFn.splitAt(5000, medium);
  });

  bench('Ramda splitAt', () => {
    R.splitAt(5000, medium);
  });
});

describe('splitWhen on 10k items', () => {
  const isOver5000 = (x: number) => x > 5000;

  bench('Native (find index + slice)', () => {
    const idx = medium.findIndex(isOver5000);
    [medium.slice(0, idx), medium.slice(idx)];
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).splitWhen(isOver5000);
  });

  bench('Vorpal Fn', () => {
    VFn.splitWhen(isOver5000, medium);
  });

  bench('Ramda splitWhen', () => {
    R.splitWhen(isOver5000, medium);
  });
});

// ==================== Intersperse ====================

describe('intersperse on 1k items', () => {
  const smallish = Array.from({ length: 1000 }, (_, i) => i);

  bench('Native flatMap', () => {
    smallish.flatMap((x, i) => i === 0 ? [x] : [0, x]);
  });

  bench('Vorpal Lazy', () => {
    VLazy(smallish).intersperse(0).toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.intersperse(0, smallish);
  });

  bench('Ramda intersperse', () => {
    R.intersperse(0, smallish);
  });
});

// ==================== Transpose ====================

describe('transpose 100x100 matrix', () => {
  const matrix = Array.from({ length: 100 }, (_, i) =>
    Array.from({ length: 100 }, (_, j) => i * 100 + j)
  );

  bench('Native nested loop', () => {
    const rows = matrix.length;
    const cols = matrix[0]!.length;
    const result: number[][] = [];
    for (let j = 0; j < cols; j++) {
      const row: number[] = [];
      for (let i = 0; i < rows; i++) {
        row.push(matrix[i]![j]!);
      }
      result.push(row);
    }
  });

  bench('Vorpal Lazy', () => {
    VLazy(matrix).transpose().toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.transpose(matrix);
  });

  bench('Ramda transpose', () => {
    R.transpose(matrix);
  });
});

// ==================== Symmetric Difference ====================

describe('symmetricDifference on 5k vs 5k items', () => {
  const arr1 = Array.from({ length: 5000 }, (_, i) => i);
  const arr2 = Array.from({ length: 5000 }, (_, i) => i + 2500);

  bench('Native (filter x2 + concat)', () => {
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const diff1 = arr1.filter(x => !set2.has(x));
    const diff2 = arr2.filter(x => !set1.has(x));
    [...diff1, ...diff2];
  });

  bench('Vorpal Lazy', () => {
    VLazy(arr1).symmetricDifference(arr2).toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.symmetricDifference(arr1, arr2);
  });

  bench('Ramda symmetricDifference', () => {
    R.symmetricDifference(arr1, arr2);
  });
});

// ==================== FindLastIndex ====================

describe('findLastIndex on 10k items', () => {
  const isEven = (x: number) => x % 2 === 0;

  bench('Native findLastIndex', () => {
    medium.findLastIndex(isEven);
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).findLastIndex(isEven);
  });

  bench('Vorpal Fn', () => {
    VFn.findLastIndex(isEven, medium);
  });

  bench('Lodash findLastIndex', () => {
    _.findLastIndex(medium, isEven);
  });
});

// ==================== Move ====================

describe('move element on 10k items', () => {
  bench('Native splice x2', () => {
    const copy = medium.slice();
    const [item] = copy.splice(100, 1);
    copy.splice(9000, 0, item!);
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).move(100, 9000).toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.move(100, 9000, medium);
  });

  bench('Ramda move', () => {
    R.move(100, 9000, medium);
  });
});

// ==================== UniqWith ====================

describe('uniqWith (custom equality) on 1k items', () => {
  const items = Array.from({ length: 1000 }, (_, i) => ({ id: i % 100, value: i }));
  const eqById = (a: typeof items[0], b: typeof items[0]) => a.id === b.id;

  bench('Native (O(n²) loop)', () => {
    const result: typeof items = [];
    for (const item of items) {
      if (!result.some(r => eqById(r, item))) {
        result.push(item);
      }
    }
  });

  bench('Vorpal Fn', () => {
    VFn.uniqWith(eqById, items);
  });

  bench('Lodash uniqWith', () => {
    _.uniqWith(items, eqById);
  });

  bench('Ramda uniqWith', () => {
    R.uniqWith(eqById, items);
  });
});

// ==================== TakeLastWhile / DropLastWhile ====================

describe('takeLastWhile on 10k items', () => {
  const isOverHalf = (x: number) => x > 5000;

  bench('Native (reverse + takeWhile + reverse)', () => {
    const reversed = medium.slice().reverse();
    const result: number[] = [];
    for (const x of reversed) {
      if (!isOverHalf(x)) break;
      result.push(x);
    }
    result.reverse();
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).takeLastWhile(isOverHalf).toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.takeLastWhile(isOverHalf, medium);
  });

  bench('Ramda takeLastWhile', () => {
    R.takeLastWhile(isOverHalf, medium);
  });
});

describe('dropLastWhile on 10k items', () => {
  const isOverHalf = (x: number) => x > 5000;

  bench('Native (find last index + slice)', () => {
    let endIndex = medium.length;
    for (let i = medium.length - 1; i >= 0; i--) {
      if (!isOverHalf(medium[i]!)) break;
      endIndex = i;
    }
    medium.slice(0, endIndex);
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).dropLastWhile(isOverHalf).toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.dropLastWhile(isOverHalf, medium);
  });

  bench('Ramda dropLastWhile', () => {
    R.dropLastWhile(isOverHalf, medium);
  });
});
