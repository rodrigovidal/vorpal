import { describe, it, expect } from 'vitest';
import { V } from '../../src/lazy/index.js';

interface User {
  id: number;
  name: string;
}

interface Order {
  userId: number;
  product: string;
}

const users: User[] = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
];

const orders: Order[] = [
  { userId: 1, product: 'Book' },
  { userId: 1, product: 'Pen' },
  { userId: 2, product: 'Laptop' },
  { userId: 4, product: 'Phone' }, // No matching user
];

describe('VorpalLazy Join Operations', () => {
  describe('innerJoin', () => {
    it('should return matches where keys exist in both sequences', () => {
      const result = V(users)
        .innerJoin(
          orders,
          u => u.id,
          o => o.userId,
          (u, o) => ({ name: u.name, product: o.product })
        )
        .toArray();

      expect(result).toEqual([
        { name: 'Alice', product: 'Book' },
        { name: 'Alice', product: 'Pen' },
        { name: 'Bob', product: 'Laptop' },
      ]);
    });

    it('should return empty when no matches', () => {
      const result = V([{ id: 99, name: 'Nobody' }])
        .innerJoin(
          orders,
          u => u.id,
          o => o.userId,
          (u, o) => ({ name: u.name, product: o.product })
        )
        .toArray();

      expect(result).toEqual([]);
    });

    it('should handle empty outer sequence', () => {
      const result = V<User>([])
        .innerJoin(
          orders,
          u => u.id,
          o => o.userId,
          (u, o) => ({ name: u.name, product: o.product })
        )
        .toArray();

      expect(result).toEqual([]);
    });

    it('should handle empty inner sequence', () => {
      const result = V(users)
        .innerJoin(
          [] as Order[],
          u => u.id,
          o => o.userId,
          (u, o) => ({ name: u.name, product: o.product })
        )
        .toArray();

      expect(result).toEqual([]);
    });
  });

  describe('leftJoin', () => {
    it('should return all from left with matches from right', () => {
      const result = V(users)
        .leftJoin(
          orders,
          u => u.id,
          o => o.userId,
          (u, o) => ({ name: u.name, product: o?.product })
        )
        .toArray();

      expect(result).toEqual([
        { name: 'Alice', product: 'Book' },
        { name: 'Alice', product: 'Pen' },
        { name: 'Bob', product: 'Laptop' },
        { name: 'Charlie', product: undefined },
      ]);
    });

    it('should include all left elements even with no matches', () => {
      const result = V(users)
        .leftJoin(
          [] as Order[],
          u => u.id,
          o => o.userId,
          (u, o) => ({ name: u.name, hasOrder: o !== undefined })
        )
        .toArray();

      expect(result).toEqual([
        { name: 'Alice', hasOrder: false },
        { name: 'Bob', hasOrder: false },
        { name: 'Charlie', hasOrder: false },
      ]);
    });
  });

  describe('rightJoin', () => {
    it('should return all from right with matches from left', () => {
      const result = V(users)
        .rightJoin(
          orders,
          u => u.id,
          o => o.userId,
          (u, o) => ({ name: u?.name, product: o.product })
        )
        .toArray();

      expect(result).toEqual([
        { name: 'Alice', product: 'Book' },
        { name: 'Alice', product: 'Pen' },
        { name: 'Bob', product: 'Laptop' },
        { name: undefined, product: 'Phone' },
      ]);
    });

    it('should include all right elements even with no matches', () => {
      const result = V<User>([])
        .rightJoin(
          orders,
          u => u.id,
          o => o.userId,
          (u, o) => ({ hasUser: u !== undefined, product: o.product })
        )
        .toArray();

      expect(result).toEqual([
        { hasUser: false, product: 'Book' },
        { hasUser: false, product: 'Pen' },
        { hasUser: false, product: 'Laptop' },
        { hasUser: false, product: 'Phone' },
      ]);
    });
  });

  describe('fullJoin', () => {
    it('should return all elements from both sequences', () => {
      const result = V(users)
        .fullJoin(
          orders,
          u => u.id,
          o => o.userId,
          (u, o) => ({ name: u?.name, product: o?.product })
        )
        .toArray();

      expect(result).toEqual([
        { name: 'Alice', product: 'Book' },
        { name: 'Alice', product: 'Pen' },
        { name: 'Bob', product: 'Laptop' },
        { name: 'Charlie', product: undefined },
        { name: undefined, product: 'Phone' },
      ]);
    });

    it('should handle disjoint sets', () => {
      const left = [{ id: 1 }, { id: 2 }];
      const right = [{ id: 3 }, { id: 4 }];

      const result = V(left)
        .fullJoin(
          right,
          l => l.id,
          r => r.id,
          (l, r) => ({ left: l?.id, right: r?.id })
        )
        .toArray();

      expect(result).toEqual([
        { left: 1, right: undefined },
        { left: 2, right: undefined },
        { left: undefined, right: 3 },
        { left: undefined, right: 4 },
      ]);
    });
  });

  describe('crossJoin', () => {
    it('should return cartesian product', () => {
      const colors = ['red', 'blue'];
      const sizes = ['S', 'M'];

      const result = V(colors)
        .crossJoin(sizes, (c, s) => `${c}-${s}`)
        .toArray();

      expect(result).toEqual(['red-S', 'red-M', 'blue-S', 'blue-M']);
    });

    it('should handle empty outer', () => {
      const result = V<string>([])
        .crossJoin(['S', 'M'], (c, s) => `${c}-${s}`)
        .toArray();

      expect(result).toEqual([]);
    });

    it('should handle empty inner', () => {
      const result = V(['red', 'blue'])
        .crossJoin([] as string[], (c, s) => `${c}-${s}`)
        .toArray();

      expect(result).toEqual([]);
    });
  });

  describe('groupJoin', () => {
    it('should group all matching inner elements for each outer element', () => {
      const result = V(users)
        .groupJoin(
          orders,
          u => u.id,
          o => o.userId,
          (u, os) => ({ name: u.name, products: os.map(o => o.product) })
        )
        .toArray();

      expect(result).toEqual([
        { name: 'Alice', products: ['Book', 'Pen'] },
        { name: 'Bob', products: ['Laptop'] },
        { name: 'Charlie', products: [] },
      ]);
    });

    it('should return empty arrays for unmatched outer elements', () => {
      const result = V([{ id: 99, name: 'Nobody' }])
        .groupJoin(
          orders,
          u => u.id,
          o => o.userId,
          (u, os) => ({ name: u.name, orderCount: os.length })
        )
        .toArray();

      expect(result).toEqual([{ name: 'Nobody', orderCount: 0 }]);
    });
  });

  describe('semiJoin', () => {
    it('should return outer elements that have matches in inner', () => {
      const result = V(users)
        .semiJoin(
          orders,
          u => u.id,
          o => o.userId
        )
        .toArray();

      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });

    it('should return empty when no matches', () => {
      const result = V([{ id: 99, name: 'Nobody' }])
        .semiJoin(
          orders,
          u => u.id,
          o => o.userId
        )
        .toArray();

      expect(result).toEqual([]);
    });

    it('should return all when all match', () => {
      const ordersForAll = [
        { userId: 1, product: 'A' },
        { userId: 2, product: 'B' },
        { userId: 3, product: 'C' },
      ];

      const result = V(users)
        .semiJoin(
          ordersForAll,
          u => u.id,
          o => o.userId
        )
        .toArray();

      expect(result).toEqual(users);
    });
  });

  describe('antiJoin', () => {
    it('should return outer elements that have NO matches in inner', () => {
      const result = V(users)
        .antiJoin(
          orders,
          u => u.id,
          o => o.userId
        )
        .toArray();

      expect(result).toEqual([{ id: 3, name: 'Charlie' }]);
    });

    it('should return all when no matches', () => {
      const result = V(users)
        .antiJoin(
          [{ userId: 99, product: 'X' }],
          u => u.id,
          o => o.userId
        )
        .toArray();

      expect(result).toEqual(users);
    });

    it('should return empty when all match', () => {
      const ordersForAll = [
        { userId: 1, product: 'A' },
        { userId: 2, product: 'B' },
        { userId: 3, product: 'C' },
      ];

      const result = V(users)
        .antiJoin(
          ordersForAll,
          u => u.id,
          o => o.userId
        )
        .toArray();

      expect(result).toEqual([]);
    });
  });

  describe('deprecated join method', () => {
    it('should work as alias for innerJoin', () => {
      const result = V(users)
        .join(
          orders,
          u => u.id,
          o => o.userId,
          (u, o) => ({ name: u.name, product: o.product })
        )
        .toArray();

      expect(result).toEqual([
        { name: 'Alice', product: 'Book' },
        { name: 'Alice', product: 'Pen' },
        { name: 'Bob', product: 'Laptop' },
      ]);
    });
  });
});
