import { bench, describe } from 'vitest';
import { V as VLazy } from '../src/lazy/index.js';
import { V as VFn } from '../src/fn/index.js';
import _ from 'lodash';
import * as R from 'ramda';

// Test data
const small = Array.from({ length: 10 }, (_, i) => i);
const medium = Array.from({ length: 10_000 }, (_, i) => i);
const large = Array.from({ length: 100_000 }, (_, i) => i);

describe('Filter + Map (small array, n=10)', () => {
  bench('Native', () => {
    small.filter(x => x % 2 === 0).map(x => x * 2);
  });

  bench('Vorpal Lazy', () => {
    VLazy(small).filter(x => x % 2 === 0).map(x => x * 2).toArray();
  });

  bench('Vorpal Fn pipe', () => {
    VFn.pipe(
      VFn.filter((x: number) => x % 2 === 0),
      VFn.map((x: number) => x * 2)
    )(small);
  });

  bench('Lodash', () => {
    _.chain(small).filter(x => x % 2 === 0).map(x => x * 2).value();
  });

  bench('Ramda', () => {
    R.pipe(R.filter((x: number) => x % 2 === 0), R.map((x: number) => x * 2))(small);
  });
});

describe('Filter + Map (medium array, n=10,000)', () => {
  bench('Native', () => {
    medium.filter(x => x % 2 === 0).map(x => x * 2);
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium).filter(x => x % 2 === 0).map(x => x * 2).toArray();
  });

  bench('Vorpal Fn pipe', () => {
    VFn.pipe(
      VFn.filter((x: number) => x % 2 === 0),
      VFn.map((x: number) => x * 2)
    )(medium);
  });

  bench('Lodash', () => {
    _.chain(medium).filter(x => x % 2 === 0).map(x => x * 2).value();
  });

  bench('Ramda', () => {
    R.pipe(R.filter((x: number) => x % 2 === 0), R.map((x: number) => x * 2))(medium);
  });
});

describe('Filter + Map (large array, n=100,000)', () => {
  bench('Native', () => {
    large.filter(x => x % 2 === 0).map(x => x * 2);
  });

  bench('Vorpal Lazy', () => {
    VLazy(large).filter(x => x % 2 === 0).map(x => x * 2).toArray();
  });

  bench('Vorpal Fn pipe', () => {
    VFn.pipe(
      VFn.filter((x: number) => x % 2 === 0),
      VFn.map((x: number) => x * 2)
    )(large);
  });

  bench('Lodash', () => {
    _.chain(large).filter(x => x % 2 === 0).map(x => x * 2).value();
  });

  bench('Ramda', () => {
    R.pipe(R.filter((x: number) => x % 2 === 0), R.map((x: number) => x * 2))(large);
  });
});

describe('Early Termination: Filter + Map + Take(10) on 100k items', () => {
  bench('Native (no early termination)', () => {
    large.filter(x => x % 2 === 0).map(x => x * 2).slice(0, 10);
  });

  bench('Vorpal Lazy (early termination)', () => {
    VLazy(large).filter(x => x % 2 === 0).map(x => x * 2).take(10).toArray();
  });

  bench('Vorpal Fn pipe (auto-transducer)', () => {
    VFn.pipe(
      VFn.filter((x: number) => x % 2 === 0),
      VFn.map((x: number) => x * 2),
      VFn.take(10)
    )(large);
  });

  bench('Lodash (no early termination)', () => {
    _.chain(large).filter(x => x % 2 === 0).map(x => x * 2).take(10).value();
  });

  bench('Ramda (no early termination)', () => {
    R.pipe(
      R.filter((x: number) => x % 2 === 0),
      R.map((x: number) => x * 2),
      R.take(10)
    )(large);
  });
});

describe('Chain: Filter + Map + Filter + Take(100)', () => {
  bench('Native', () => {
    medium
      .filter(x => x % 2 === 0)
      .map(x => x * 2)
      .filter(x => x > 100)
      .slice(0, 100);
  });

  bench('Vorpal Lazy', () => {
    VLazy(medium)
      .filter(x => x % 2 === 0)
      .map(x => x * 2)
      .filter(x => x > 100)
      .take(100)
      .toArray();
  });

  bench('Vorpal Fn pipe', () => {
    VFn.pipe(
      VFn.filter((x: number) => x % 2 === 0),
      VFn.map((x: number) => x * 2),
      VFn.filter((x: number) => x > 100),
      VFn.take(100)
    )(medium);
  });

  bench('Lodash', () => {
    _.chain(medium)
      .filter(x => x % 2 === 0)
      .map(x => x * 2)
      .filter(x => x > 100)
      .take(100)
      .value();
  });

  bench('Ramda', () => {
    R.pipe(
      R.filter((x: number) => x % 2 === 0),
      R.map((x: number) => x * 2),
      R.filter((x: number) => x > 100),
      R.take(100)
    )(medium);
  });
});

describe('Aggregation: Sum', () => {
  bench('Native reduce', () => {
    medium.reduce((acc, x) => acc + x, 0);
  });

  bench('Vorpal Lazy sum', () => {
    VLazy(medium).sum();
  });

  bench('Vorpal Fn sum', () => {
    VFn.sum(medium);
  });

  bench('Lodash sum', () => {
    _.sum(medium);
  });

  bench('Ramda sum', () => {
    R.sum(medium);
  });
});

describe('GroupBy', () => {
  const items = medium.map(i => ({ category: i % 10, value: i }));

  bench('Native (manual)', () => {
    const groups = new Map<number, typeof items>();
    for (const item of items) {
      if (!groups.has(item.category)) groups.set(item.category, []);
      groups.get(item.category)!.push(item);
    }
    [...groups.entries()];
  });

  bench('Vorpal Lazy groupBy', () => {
    VLazy(items).groupBy(x => x.category).toArray();
  });

  bench('Vorpal Fn groupBy', () => {
    VFn.groupBy((x: typeof items[0]) => x.category, items);
  });

  bench('Lodash groupBy', () => {
    _.groupBy(items, x => x.category);
  });

  bench('Ramda groupBy', () => {
    R.groupBy(x => String(x.category), items);
  });
});

describe('Distinct / Uniq', () => {
  const withDupes = medium.map(i => i % 1000); // Many duplicates

  bench('Native Set', () => {
    [...new Set(withDupes)];
  });

  bench('Vorpal Lazy distinct', () => {
    VLazy(withDupes).distinct().toArray();
  });

  bench('Vorpal Fn distinct', () => {
    VFn.distinct(withDupes);
  });

  bench('Lodash uniq', () => {
    _.uniq(withDupes);
  });

  bench('Ramda uniq', () => {
    R.uniq(withDupes);
  });
});

describe('OrderBy / SortBy', () => {
  const shuffled = [...medium].sort(() => Math.random() - 0.5);

  bench('Native sort', () => {
    [...shuffled].sort((a, b) => a - b);
  });

  bench('Vorpal Lazy sortBy', () => {
    VLazy(shuffled).sortBy(x => x).toArray();
  });

  bench('Vorpal Fn sortBy', () => {
    VFn.sortBy((x: number) => x, shuffled);
  });

  bench('Lodash sortBy', () => {
    _.sortBy(shuffled, x => x);
  });

  bench('Ramda sortBy', () => {
    R.sortBy(R.identity, shuffled);
  });
});

describe('Find first matching', () => {
  bench('Native find', () => {
    large.find(x => x > 50000);
  });

  bench('Vorpal Lazy first', () => {
    VLazy(large).first(x => x > 50000);
  });

  bench('Vorpal Fn find', () => {
    VFn.find((x: number) => x > 50000, large);
  });

  bench('Lodash find', () => {
    _.find(large, x => x > 50000);
  });

  bench('Ramda find', () => {
    R.find((x: number) => x > 50000, large);
  });
});

describe('FlatMap / Chain', () => {
  const nested = medium.slice(0, 1000).map(i => [i, i * 2, i * 3]);

  bench('Native flatMap', () => {
    nested.flatMap(x => x);
  });

  bench('Vorpal Lazy flatMap', () => {
    VLazy(nested).flatMap(x => x).toArray();
  });

  bench('Vorpal Fn flatMap', () => {
    VFn.flatMap((x: number[]) => x, nested);
  });

  bench('Lodash flatMap', () => {
    _.flatMap(nested, x => x);
  });

  bench('Ramda chain', () => {
    R.chain(R.identity, nested);
  });
});

describe('Complex Pipeline: Real-world scenario', () => {
  interface User {
    id: number;
    name: string;
    age: number;
    department: string;
    salary: number;
    active: boolean;
  }

  const users: User[] = medium.map(i => ({
    id: i,
    name: `User${i}`,
    age: 20 + (i % 50),
    department: ['Engineering', 'Sales', 'Marketing', 'HR'][i % 4]!,
    salary: 30000 + (i % 100) * 1000,
    active: i % 3 !== 0,
  }));

  bench('Native', () => {
    const grouped = new Map<string, number[]>();
    for (const u of users) {
      if (u.active && u.age >= 30) {
        if (!grouped.has(u.department)) grouped.set(u.department, []);
        grouped.get(u.department)!.push(u.salary);
      }
    }
    [...grouped.entries()].map(([dept, salaries]) => ({
      department: dept,
      avgSalary: salaries.reduce((a, b) => a + b, 0) / salaries.length,
    })).sort((a, b) => b.avgSalary - a.avgSalary).slice(0, 3);
  });

  bench('Vorpal Lazy', () => {
    VLazy(users)
      .filter(u => u.active && u.age >= 30)
      .groupBy(u => u.department)
      .map(g => ({
        department: g.key,
        avgSalary: VLazy(g.values).average(u => u.salary),
      }))
      .sortByDesc(x => x.avgSalary)
      .take(3)
      .toArray();
  });

  bench('Lodash', () => {
    _.chain(users)
      .filter(u => u.active && u.age >= 30)
      .groupBy(u => u.department)
      .map((group, dept) => ({
        department: dept,
        avgSalary: _.meanBy(group, 'salary'),
      }))
      .orderBy('avgSalary', 'desc')
      .take(3)
      .value();
  });

  bench('Ramda', () => {
    R.pipe(
      R.filter((u: User) => u.active && u.age >= 30),
      R.groupBy((u: User) => u.department),
      R.toPairs,
      R.map(([dept, group]: [string, User[]]) => ({
        department: dept,
        avgSalary: R.mean(R.map((u: User) => u.salary, group)),
      })),
      R.sortBy((x: { avgSalary: number }) => -x.avgSalary),
      R.take(3)
    )(users);
  });
});

describe('Average', () => {
  bench('Native reduce', () => {
    const sum = medium.reduce((a, b) => a + b, 0);
    sum / medium.length;
  });

  bench('Vorpal Lazy average', () => {
    VLazy(medium).average();
  });

  bench('Lodash mean', () => {
    _.mean(medium);
  });

  bench('Ramda mean', () => {
    R.mean(medium);
  });
});

describe('Min / Max', () => {
  bench('Native Math.min', () => {
    Math.min(...medium);
  });

  bench('Vorpal Lazy min', () => {
    VLazy(medium).min();
  });

  bench('Lodash min', () => {
    _.min(medium);
  });

  bench('Ramda reduce min', () => {
    R.reduce(R.min, Infinity, medium);
  });
});

describe('Some / Any', () => {
  bench('Native some', () => {
    medium.some(x => x > 9000);
  });

  bench('Vorpal Lazy some', () => {
    VLazy(medium).some(x => x > 9000);
  });

  bench('Vorpal Fn some', () => {
    VFn.some((x: number) => x > 9000, medium);
  });

  bench('Lodash some', () => {
    _.some(medium, x => x > 9000);
  });

  bench('Ramda any', () => {
    R.any((x: number) => x > 9000, medium);
  });
});

describe('Every / All', () => {
  bench('Native every', () => {
    medium.every(x => x >= 0);
  });

  bench('Vorpal Lazy every', () => {
    VLazy(medium).every(x => x >= 0);
  });

  bench('Vorpal Fn every', () => {
    VFn.every((x: number) => x >= 0, medium);
  });

  bench('Lodash every', () => {
    _.every(medium, x => x >= 0);
  });

  bench('Ramda all', () => {
    R.all((x: number) => x >= 0, medium);
  });
});

describe('Includes / Contains', () => {
  bench('Native includes', () => {
    medium.includes(5000);
  });

  bench('Vorpal Lazy includes', () => {
    VLazy(medium).includes(5000);
  });

  bench('Vorpal Fn includes', () => {
    VFn.includes(5000, medium);
  });

  bench('Lodash includes', () => {
    _.includes(medium, 5000);
  });

  bench('Ramda includes', () => {
    R.includes(5000, medium);
  });
});

describe('Reduce', () => {
  bench('Native reduce', () => {
    medium.reduce((acc, x) => acc + x * 2, 0);
  });

  bench('Vorpal Lazy reduce', () => {
    VLazy(medium).reduce(0, (acc, x) => acc + x * 2);
  });

  bench('Vorpal Fn reduce', () => {
    VFn.reduce((acc: number, x: number) => acc + x * 2, 0, medium);
  });

  bench('Lodash reduce', () => {
    _.reduce(medium, (acc, x) => acc + x * 2, 0);
  });

  bench('Ramda reduce', () => {
    R.reduce((acc: number, x: number) => acc + x * 2, 0, medium);
  });
});

describe('Chunk', () => {
  bench('Vorpal Lazy chunk', () => {
    VLazy(medium).chunk(100).toArray();
  });

  bench('Vorpal Fn chunk', () => {
    VFn.chunk(100, medium);
  });

  bench('Lodash chunk', () => {
    _.chunk(medium, 100);
  });

  bench('Ramda splitEvery', () => {
    R.splitEvery(100, medium);
  });
});

describe('Reverse', () => {
  bench('Native reverse (copy)', () => {
    [...medium].reverse();
  });

  bench('Vorpal Lazy reverse', () => {
    VLazy(medium).reverse().toArray();
  });

  bench('Vorpal Fn reverse', () => {
    VFn.reverse(medium);
  });

  bench('Lodash reverse', () => {
    _.reverse([...medium]);
  });

  bench('Ramda reverse', () => {
    R.reverse(medium);
  });
});

describe('Concat', () => {
  const other = Array.from({ length: 1000 }, (_, i) => i + 10000);

  bench('Native concat', () => {
    medium.concat(other);
  });

  bench('Vorpal Lazy concat', () => {
    VLazy(medium).concat(other).toArray();
  });

  bench('Lodash concat', () => {
    _.concat(medium, other);
  });

  bench('Ramda concat', () => {
    R.concat(medium, other);
  });
});

describe('Zip', () => {
  const other = Array.from({ length: 10000 }, (_, i) => i * 10);

  bench('Vorpal Lazy zip', () => {
    VLazy(medium).zip(other, (a, b) => a + b).toArray();
  });

  bench('Vorpal Fn zip', () => {
    VFn.zip(medium, other, (a: number, b: number) => a + b);
  });

  bench('Lodash zipWith', () => {
    _.zipWith(medium, other, (a, b) => a + b);
  });

  bench('Ramda zipWith', () => {
    R.zipWith((a: number, b: number) => a + b, medium, other);
  });
});

describe('Take / Slice', () => {
  bench('Native slice', () => {
    medium.slice(0, 100);
  });

  bench('Vorpal Lazy take', () => {
    VLazy(medium).take(100).toArray();
  });

  bench('Vorpal Fn take', () => {
    VFn.take(100, medium);
  });

  bench('Lodash take', () => {
    _.take(medium, 100);
  });

  bench('Ramda take', () => {
    R.take(100, medium);
  });
});

describe('Skip / Drop', () => {
  bench('Native slice', () => {
    medium.slice(100);
  });

  bench('Vorpal Lazy skip', () => {
    VLazy(medium).skip(100).toArray();
  });

  bench('Vorpal Fn skip', () => {
    VFn.skip(100, medium);
  });

  bench('Lodash drop', () => {
    _.drop(medium, 100);
  });

  bench('Ramda drop', () => {
    R.drop(100, medium);
  });
});

describe('Last element', () => {
  bench('Native at(-1)', () => {
    medium.at(-1);
  });

  bench('Vorpal Lazy last', () => {
    VLazy(medium).last();
  });

  bench('Vorpal Fn last', () => {
    VFn.last(medium);
  });

  bench('Lodash last', () => {
    _.last(medium);
  });

  bench('Ramda last', () => {
    R.last(medium);
  });
});

describe('Count with predicate', () => {
  bench('Native filter.length', () => {
    medium.filter(x => x % 2 === 0).length;
  });

  bench('Vorpal Lazy count', () => {
    VLazy(medium).count(x => x % 2 === 0);
  });

  bench('Lodash countBy + sum', () => {
    _.sumBy(_.filter(medium, x => x % 2 === 0), () => 1);
  });

  bench('Ramda filter.length', () => {
    R.filter((x: number) => x % 2 === 0, medium).length;
  });
});

describe('Partition', () => {
  bench('Vorpal Lazy partition', () => {
    VLazy(medium).partition(x => x % 2 === 0);
  });

  bench('Vorpal Fn partition', () => {
    VFn.partition((x: number) => x % 2 === 0, medium);
  });

  bench('Lodash partition', () => {
    _.partition(medium, x => x % 2 === 0);
  });

  bench('Ramda partition', () => {
    R.partition((x: number) => x % 2 === 0, medium);
  });
});
