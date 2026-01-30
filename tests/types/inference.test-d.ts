import { describe, expectTypeOf, test } from 'vitest';
import type { Predicate, TypeGuard, Selector, KeySelector, Comparer, EqualityComparer } from '../../src/core/types.js';

describe('Core Types', () => {
  test('Predicate accepts item and index', () => {
    const pred: Predicate<number> = (item, index) => item > index;
    expectTypeOf(pred).toBeFunction();
    expectTypeOf(pred).parameters.toEqualTypeOf<[number, number]>();
    expectTypeOf(pred).returns.toEqualTypeOf<boolean>();
  });

  test('TypeGuard narrows type', () => {
    const guard: TypeGuard<unknown, string> = (item): item is string => typeof item === 'string';
    expectTypeOf(guard).toBeFunction();
  });

  test('Selector transforms type', () => {
    const sel: Selector<{ name: string }, string> = (item) => item.name;
    expectTypeOf(sel).returns.toEqualTypeOf<string>();
  });

  test('KeySelector extracts key', () => {
    const keySel: KeySelector<{ id: number }, number> = (item) => item.id;
    expectTypeOf(keySel).returns.toEqualTypeOf<number>();
  });
});
