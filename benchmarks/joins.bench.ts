import { bench, describe } from 'vitest';
import { V as VLazy } from '../src/lazy/index.js';
import { V as VFn } from '../src/fn/index.js';
import * as R from 'ramda';
import _ from 'lodash';

// Test data
interface User {
  id: number;
  name: string;
  department: string;
}

interface Order {
  userId: number;
  product: string;
  amount: number;
}

// Small dataset (100 users, 300 orders)
const smallUsers: User[] = Array.from({ length: 100 }, (_, i) => ({
  id: i,
  name: `User${i}`,
  department: ['Engineering', 'Sales', 'Marketing', 'HR'][i % 4]!,
}));

const smallOrders: Order[] = Array.from({ length: 300 }, (_, i) => ({
  userId: i % 80, // 80% of users have orders
  product: `Product${i}`,
  amount: 100 + i,
}));

// Medium dataset (1000 users, 5000 orders)
const mediumUsers: User[] = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  name: `User${i}`,
  department: ['Engineering', 'Sales', 'Marketing', 'HR'][i % 4]!,
}));

const mediumOrders: Order[] = Array.from({ length: 5000 }, (_, i) => ({
  userId: i % 800,
  product: `Product${i}`,
  amount: 100 + i,
}));

// Large dataset (10000 users, 50000 orders)
const largeUsers: User[] = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  name: `User${i}`,
  department: ['Engineering', 'Sales', 'Marketing', 'HR'][i % 4]!,
}));

const largeOrders: Order[] = Array.from({ length: 50000 }, (_, i) => ({
  userId: i % 8000,
  product: `Product${i}`,
  amount: 100 + i,
}));

// Native implementation helpers
function nativeInnerJoin<T, I, K, R>(
  outer: T[],
  inner: I[],
  outerKey: (t: T) => K,
  innerKey: (i: I) => K,
  result: (t: T, i: I) => R
): R[] {
  const lookup = new Map<K, I[]>();
  for (const item of inner) {
    const key = innerKey(item);
    if (!lookup.has(key)) lookup.set(key, []);
    lookup.get(key)!.push(item);
  }
  const results: R[] = [];
  for (const o of outer) {
    const matches = lookup.get(outerKey(o));
    if (matches) {
      for (const i of matches) {
        results.push(result(o, i));
      }
    }
  }
  return results;
}

function nativeLeftJoin<T, I, K, R>(
  outer: T[],
  inner: I[],
  outerKey: (t: T) => K,
  innerKey: (i: I) => K,
  result: (t: T, i: I | undefined) => R
): R[] {
  const lookup = new Map<K, I[]>();
  for (const item of inner) {
    const key = innerKey(item);
    if (!lookup.has(key)) lookup.set(key, []);
    lookup.get(key)!.push(item);
  }
  const results: R[] = [];
  for (const o of outer) {
    const matches = lookup.get(outerKey(o));
    if (matches && matches.length > 0) {
      for (const i of matches) {
        results.push(result(o, i));
      }
    } else {
      results.push(result(o, undefined));
    }
  }
  return results;
}

describe('Inner Join (small: 100 users, 300 orders)', () => {
  bench('Native', () => {
    nativeInnerJoin(
      smallUsers,
      smallOrders,
      u => u.id,
      o => o.userId,
      (u, o) => ({ name: u.name, product: o.product })
    );
  });

  bench('Vorpal Lazy', () => {
    VLazy(smallUsers)
      .innerJoin(
        smallOrders,
        u => u.id,
        o => o.userId,
        (u, o) => ({ name: u.name, product: o.product })
      )
      .toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.innerJoin(
      smallUsers,
      smallOrders,
      u => u.id,
      o => o.userId,
      (u, o) => ({ name: u.name, product: o.product })
    );
  });

  bench('Ramda (innerJoin)', () => {
    R.innerJoin(
      (u: User, o: Order) => u.id === o.userId,
      smallUsers,
      smallOrders
    );
  });
});

describe('Inner Join (medium: 1k users, 5k orders)', () => {
  bench('Native', () => {
    nativeInnerJoin(
      mediumUsers,
      mediumOrders,
      u => u.id,
      o => o.userId,
      (u, o) => ({ name: u.name, product: o.product })
    );
  });

  bench('Vorpal Lazy', () => {
    VLazy(mediumUsers)
      .innerJoin(
        mediumOrders,
        u => u.id,
        o => o.userId,
        (u, o) => ({ name: u.name, product: o.product })
      )
      .toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.innerJoin(
      mediumUsers,
      mediumOrders,
      u => u.id,
      o => o.userId,
      (u, o) => ({ name: u.name, product: o.product })
    );
  });

  bench('Ramda (innerJoin)', () => {
    R.innerJoin(
      (u: User, o: Order) => u.id === o.userId,
      mediumUsers,
      mediumOrders
    );
  });
});

describe('Inner Join (large: 10k users, 50k orders)', () => {
  bench('Native', () => {
    nativeInnerJoin(
      largeUsers,
      largeOrders,
      u => u.id,
      o => o.userId,
      (u, o) => ({ name: u.name, product: o.product })
    );
  });

  bench('Vorpal Lazy', () => {
    VLazy(largeUsers)
      .innerJoin(
        largeOrders,
        u => u.id,
        o => o.userId,
        (u, o) => ({ name: u.name, product: o.product })
      )
      .toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.innerJoin(
      largeUsers,
      largeOrders,
      u => u.id,
      o => o.userId,
      (u, o) => ({ name: u.name, product: o.product })
    );
  });

  bench('Ramda (innerJoin)', () => {
    R.innerJoin(
      (u: User, o: Order) => u.id === o.userId,
      largeUsers,
      largeOrders
    );
  });
});

describe('Left Join (medium: 1k users, 5k orders)', () => {
  bench('Native', () => {
    nativeLeftJoin(
      mediumUsers,
      mediumOrders,
      u => u.id,
      o => o.userId,
      (u, o) => ({ name: u.name, product: o?.product })
    );
  });

  bench('Vorpal Lazy', () => {
    VLazy(mediumUsers)
      .leftJoin(
        mediumOrders,
        u => u.id,
        o => o.userId,
        (u, o) => ({ name: u.name, product: o?.product })
      )
      .toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.leftJoin(
      mediumUsers,
      mediumOrders,
      u => u.id,
      o => o.userId,
      (u, o) => ({ name: u.name, product: o?.product })
    );
  });
});

describe('Group Join (medium: 1k users, 5k orders)', () => {
  bench('Native (manual)', () => {
    const lookup = new Map<number, Order[]>();
    for (const o of mediumOrders) {
      if (!lookup.has(o.userId)) lookup.set(o.userId, []);
      lookup.get(o.userId)!.push(o);
    }
    mediumUsers.map(u => ({
      name: u.name,
      orders: lookup.get(u.id) ?? [],
    }));
  });

  bench('Vorpal Lazy', () => {
    VLazy(mediumUsers)
      .groupJoin(
        mediumOrders,
        u => u.id,
        o => o.userId,
        (u, os) => ({ name: u.name, orders: os })
      )
      .toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.groupJoin(
      mediumUsers,
      mediumOrders,
      u => u.id,
      o => o.userId,
      (u, os) => ({ name: u.name, orders: os })
    );
  });
});

describe('Semi Join (medium: 1k users, 5k orders)', () => {
  bench('Native', () => {
    const orderUserIds = new Set(mediumOrders.map(o => o.userId));
    mediumUsers.filter(u => orderUserIds.has(u.id));
  });

  bench('Vorpal Lazy', () => {
    VLazy(mediumUsers)
      .semiJoin(mediumOrders, u => u.id, o => o.userId)
      .toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.semiJoin(mediumUsers, mediumOrders, u => u.id, o => o.userId);
  });
});

describe('Anti Join (medium: 1k users, 5k orders)', () => {
  bench('Native', () => {
    const orderUserIds = new Set(mediumOrders.map(o => o.userId));
    mediumUsers.filter(u => !orderUserIds.has(u.id));
  });

  bench('Vorpal Lazy', () => {
    VLazy(mediumUsers)
      .antiJoin(mediumOrders, u => u.id, o => o.userId)
      .toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.antiJoin(mediumUsers, mediumOrders, u => u.id, o => o.userId);
  });
});

describe('Cross Join (small: 100x100)', () => {
  const colors = Array.from({ length: 100 }, (_, i) => `color${i}`);
  const sizes = Array.from({ length: 100 }, (_, i) => `size${i}`);

  bench('Native', () => {
    const result: string[] = [];
    for (const c of colors) {
      for (const s of sizes) {
        result.push(`${c}-${s}`);
      }
    }
    return result;
  });

  bench('Vorpal Lazy', () => {
    VLazy(colors)
      .crossJoin(sizes, (c, s) => `${c}-${s}`)
      .toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.crossJoin(colors, sizes, (c, s) => `${c}-${s}`);
  });

  bench('Ramda xprod', () => {
    R.xprod(colors, sizes).map(([c, s]) => `${c}-${s}`);
  });
});

describe('Full Join (medium: 1k users, 5k orders)', () => {
  bench('Native (manual)', () => {
    const innerLookup = new Map<number, Order[]>();
    for (const o of mediumOrders) {
      if (!innerLookup.has(o.userId)) innerLookup.set(o.userId, []);
      innerLookup.get(o.userId)!.push(o);
    }
    const matchedKeys = new Set<number>();
    const result: { name?: string; product?: string }[] = [];

    for (const u of mediumUsers) {
      const matches = innerLookup.get(u.id);
      if (matches && matches.length > 0) {
        matchedKeys.add(u.id);
        for (const o of matches) {
          result.push({ name: u.name, product: o.product });
        }
      } else {
        result.push({ name: u.name, product: undefined });
      }
    }

    for (const [key, orders] of innerLookup) {
      if (!matchedKeys.has(key)) {
        for (const o of orders) {
          result.push({ name: undefined, product: o.product });
        }
      }
    }
    return result;
  });

  bench('Vorpal Lazy', () => {
    VLazy(mediumUsers)
      .fullJoin(
        mediumOrders,
        u => u.id,
        o => o.userId,
        (u, o) => ({ name: u?.name, product: o?.product })
      )
      .toArray();
  });

  bench('Vorpal Fn', () => {
    VFn.fullJoin(
      mediumUsers,
      mediumOrders,
      u => u.id,
      o => o.userId,
      (u, o) => ({ name: u?.name, product: o?.product })
    );
  });
});
