import { describe, it, expect } from 'vitest';
import {
  innerJoin,
  leftJoin,
  rightJoin,
  fullJoin,
  crossJoin,
  groupJoin,
  semiJoin,
  antiJoin,
} from '../../src/fn/index.js';

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

describe('V.fn Join Operations', () => {
  describe('innerJoin', () => {
    it('should work with direct execution', () => {
      const result = innerJoin(
        users,
        orders,
        u => u.id,
        o => o.userId,
        (u, o) => ({ name: u.name, product: o.product })
      );

      expect(result).toEqual([
        { name: 'Alice', product: 'Book' },
        { name: 'Alice', product: 'Pen' },
        { name: 'Bob', product: 'Laptop' },
      ]);
    });

    it('should work with curried execution', () => {
      const joinWithOrders = innerJoin<User, Order, number, { name: string; product: string }>(
        orders,
        u => u.id,
        o => o.userId,
        (u, o) => ({ name: u.name, product: o.product })
      );

      const result = joinWithOrders(users);

      expect(result).toEqual([
        { name: 'Alice', product: 'Book' },
        { name: 'Alice', product: 'Pen' },
        { name: 'Bob', product: 'Laptop' },
      ]);
    });
  });

  describe('leftJoin', () => {
    it('should work with direct execution', () => {
      const result = leftJoin(
        users,
        orders,
        u => u.id,
        o => o.userId,
        (u, o) => ({ name: u.name, product: o?.product })
      );

      expect(result).toEqual([
        { name: 'Alice', product: 'Book' },
        { name: 'Alice', product: 'Pen' },
        { name: 'Bob', product: 'Laptop' },
        { name: 'Charlie', product: undefined },
      ]);
    });

    it('should work with curried execution', () => {
      const joinWithOrders = leftJoin<User, Order, number, { name: string; product: string | undefined }>(
        orders,
        u => u.id,
        o => o.userId,
        (u, o) => ({ name: u.name, product: o?.product })
      );

      const result = joinWithOrders(users);

      expect(result).toEqual([
        { name: 'Alice', product: 'Book' },
        { name: 'Alice', product: 'Pen' },
        { name: 'Bob', product: 'Laptop' },
        { name: 'Charlie', product: undefined },
      ]);
    });
  });

  describe('rightJoin', () => {
    it('should work with direct execution', () => {
      const result = rightJoin(
        users,
        orders,
        u => u.id,
        o => o.userId,
        (u, o) => ({ name: u?.name, product: o.product })
      );

      expect(result).toEqual([
        { name: 'Alice', product: 'Book' },
        { name: 'Alice', product: 'Pen' },
        { name: 'Bob', product: 'Laptop' },
        { name: undefined, product: 'Phone' },
      ]);
    });

    it('should work with curried execution', () => {
      const joinWithOrders = rightJoin<User, Order, number, { name: string | undefined; product: string }>(
        orders,
        u => u.id,
        o => o.userId,
        (u, o) => ({ name: u?.name, product: o.product })
      );

      const result = joinWithOrders(users);

      expect(result).toEqual([
        { name: 'Alice', product: 'Book' },
        { name: 'Alice', product: 'Pen' },
        { name: 'Bob', product: 'Laptop' },
        { name: undefined, product: 'Phone' },
      ]);
    });
  });

  describe('fullJoin', () => {
    it('should work with direct execution', () => {
      const result = fullJoin(
        users,
        orders,
        u => u.id,
        o => o.userId,
        (u, o) => ({ name: u?.name, product: o?.product })
      );

      expect(result).toEqual([
        { name: 'Alice', product: 'Book' },
        { name: 'Alice', product: 'Pen' },
        { name: 'Bob', product: 'Laptop' },
        { name: 'Charlie', product: undefined },
        { name: undefined, product: 'Phone' },
      ]);
    });

    it('should work with curried execution', () => {
      const joinWithOrders = fullJoin<User, Order, number, { name: string | undefined; product: string | undefined }>(
        orders,
        u => u.id,
        o => o.userId,
        (u, o) => ({ name: u?.name, product: o?.product })
      );

      const result = joinWithOrders(users);

      expect(result).toEqual([
        { name: 'Alice', product: 'Book' },
        { name: 'Alice', product: 'Pen' },
        { name: 'Bob', product: 'Laptop' },
        { name: 'Charlie', product: undefined },
        { name: undefined, product: 'Phone' },
      ]);
    });
  });

  describe('crossJoin', () => {
    const colors = ['red', 'blue'];
    const sizes = ['S', 'M'];

    it('should work with direct execution', () => {
      const result = crossJoin(colors, sizes, (c, s) => `${c}-${s}`);

      expect(result).toEqual(['red-S', 'red-M', 'blue-S', 'blue-M']);
    });

    it('should work with curried execution', () => {
      const joinWithSizes = crossJoin<string, string, string>(
        sizes,
        (c, s) => `${c}-${s}`
      );

      const result = joinWithSizes(colors);

      expect(result).toEqual(['red-S', 'red-M', 'blue-S', 'blue-M']);
    });
  });

  describe('groupJoin', () => {
    it('should work with direct execution', () => {
      const result = groupJoin(
        users,
        orders,
        u => u.id,
        o => o.userId,
        (u, os) => ({ name: u.name, products: os.map(o => o.product) })
      );

      expect(result).toEqual([
        { name: 'Alice', products: ['Book', 'Pen'] },
        { name: 'Bob', products: ['Laptop'] },
        { name: 'Charlie', products: [] },
      ]);
    });

    it('should work with curried execution', () => {
      const joinWithOrders = groupJoin<User, Order, number, { name: string; orderCount: number }>(
        orders,
        u => u.id,
        o => o.userId,
        (u, os) => ({ name: u.name, orderCount: os.length })
      );

      const result = joinWithOrders(users);

      expect(result).toEqual([
        { name: 'Alice', orderCount: 2 },
        { name: 'Bob', orderCount: 1 },
        { name: 'Charlie', orderCount: 0 },
      ]);
    });
  });

  describe('semiJoin', () => {
    it('should work with direct execution', () => {
      const result = semiJoin(
        users,
        orders,
        u => u.id,
        o => o.userId
      );

      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });

    it('should work with curried execution', () => {
      const joinWithOrders = semiJoin<User, Order, number>(
        orders,
        u => u.id,
        o => o.userId
      );

      const result = joinWithOrders(users);

      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });
  });

  describe('antiJoin', () => {
    it('should work with direct execution', () => {
      const result = antiJoin(
        users,
        orders,
        u => u.id,
        o => o.userId
      );

      expect(result).toEqual([{ id: 3, name: 'Charlie' }]);
    });

    it('should work with curried execution', () => {
      const joinWithOrders = antiJoin<User, Order, number>(
        orders,
        u => u.id,
        o => o.userId
      );

      const result = joinWithOrders(users);

      expect(result).toEqual([{ id: 3, name: 'Charlie' }]);
    });
  });
});
