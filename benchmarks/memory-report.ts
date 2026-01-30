/**
 * Memory Usage Report
 *
 * Run with: npx tsx --expose-gc benchmarks/memory-report.ts
 *
 * This measures actual memory allocation for different approaches.
 */

import { V as VLazy } from '../src/lazy/index.js';
import { V as VFn } from '../src/fn/index.js';
import _ from 'lodash';
import * as R from 'ramda';

// Force garbage collection
const gc = (globalThis as { gc?: () => void }).gc;
if (!gc) {
  console.error('Run with --expose-gc flag: npx tsx --expose-gc benchmarks/memory-report.ts');
  process.exit(1);
}

interface MemoryResult {
  name: string;
  heapUsedDelta: number;
  externalDelta: number;
  peakHeap: number;
  resultSize: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function measureMemory(name: string, fn: () => unknown[], iterations = 5): MemoryResult {
  // Warm up
  for (let i = 0; i < 3; i++) {
    fn();
    gc!();
  }

  let totalHeapDelta = 0;
  let totalExternalDelta = 0;
  let peakHeap = 0;
  let resultSize = 0;

  for (let i = 0; i < iterations; i++) {
    gc!();
    const before = process.memoryUsage();

    const result = fn();
    resultSize = result.length;

    const after = process.memoryUsage();

    totalHeapDelta += after.heapUsed - before.heapUsed;
    totalExternalDelta += after.external - before.external;
    peakHeap = Math.max(peakHeap, after.heapUsed);

    gc!();
  }

  return {
    name,
    heapUsedDelta: Math.round(totalHeapDelta / iterations),
    externalDelta: Math.round(totalExternalDelta / iterations),
    peakHeap,
    resultSize,
  };
}

function printResults(title: string, results: MemoryResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80));

  // Sort by heap usage
  results.sort((a, b) => a.heapUsedDelta - b.heapUsedDelta);

  const baseline = results[0]!.heapUsedDelta;

  console.log('\n%-35s %15s %15s %10s'.replace(/%(\d+)s/g, (_, n) => `%${n}s`));
  console.log('Name'.padEnd(35) + 'Heap Delta'.padStart(15) + 'vs Best'.padStart(15) + 'Result'.padStart(10));
  console.log('-'.repeat(75));

  for (const r of results) {
    const ratio = baseline > 0 ? (r.heapUsedDelta / baseline).toFixed(2) + 'x' : 'N/A';
    console.log(
      r.name.padEnd(35) +
      formatBytes(r.heapUsedDelta).padStart(15) +
      ratio.padStart(15) +
      r.resultSize.toString().padStart(10)
    );
  }
}

// Test data
console.log('Generating test data...');
const arr100 = Array.from({ length: 100 }, (_, i) => i);
const arr1k = Array.from({ length: 1_000 }, (_, i) => i);
const arr10k = Array.from({ length: 10_000 }, (_, i) => i);
const arr100k = Array.from({ length: 100_000 }, (_, i) => i);
const arr1m = Array.from({ length: 1_000_000 }, (_, i) => i);
console.log('Done.\n');

// Scenario A: Filter + Map on 100 items (small array)
{
  const results: MemoryResult[] = [];

  results.push(measureMemory('Native', () =>
    arr100.filter(x => x % 2 === 0).map(x => x * 2)
  ));

  results.push(measureMemory('Vorpal Lazy', () =>
    VLazy(arr100).filter(x => x % 2 === 0).map(x => x * 2).toArray()
  ));

  results.push(measureMemory('Vorpal Fn pipe', () =>
    VFn.pipe(
      VFn.filter((x: number) => x % 2 === 0),
      VFn.map((x: number) => x * 2)
    )(arr100)
  ));

  results.push(measureMemory('Lodash', () =>
    _.chain(arr100).filter(x => x % 2 === 0).map(x => x * 2).value()
  ));

  results.push(measureMemory('Ramda', () =>
    R.pipe(
      R.filter((x: number) => x % 2 === 0),
      R.map((x: number) => x * 2)
    )(arr100)
  ));

  printResults('Scenario A: filter().map() on 100 items', results);
}

// Scenario B: Filter + Map + Take(5) on 100 items
{
  const results: MemoryResult[] = [];

  results.push(measureMemory('Native', () =>
    arr100.filter(x => x % 2 === 0).map(x => x * 2).slice(0, 5)
  ));

  results.push(measureMemory('Vorpal Lazy', () =>
    VLazy(arr100).filter(x => x % 2 === 0).map(x => x * 2).take(5).toArray()
  ));

  results.push(measureMemory('Vorpal Fn pipe (auto-transducer)', () =>
    VFn.pipe(
      VFn.filter((x: number) => x % 2 === 0),
      VFn.map((x: number) => x * 2),
      VFn.take(5)
    )(arr100)
  ));

  results.push(measureMemory('Lodash', () =>
    _.chain(arr100).filter(x => x % 2 === 0).map(x => x * 2).take(5).value()
  ));

  results.push(measureMemory('Ramda', () =>
    R.pipe(
      R.filter((x: number) => x % 2 === 0),
      R.map((x: number) => x * 2),
      R.take(5)
    )(arr100)
  ));

  printResults('Scenario B: filter().map().take(5) on 100 items', results);
}

// Scenario C: Filter + Map on 1,000 items
{
  const results: MemoryResult[] = [];

  results.push(measureMemory('Native', () =>
    arr1k.filter(x => x % 2 === 0).map(x => x * 2)
  ));

  results.push(measureMemory('Vorpal Lazy', () =>
    VLazy(arr1k).filter(x => x % 2 === 0).map(x => x * 2).toArray()
  ));

  results.push(measureMemory('Lodash', () =>
    _.chain(arr1k).filter(x => x % 2 === 0).map(x => x * 2).value()
  ));

  results.push(measureMemory('Ramda', () =>
    R.pipe(
      R.filter((x: number) => x % 2 === 0),
      R.map((x: number) => x * 2)
    )(arr1k)
  ));

  printResults('Scenario C: filter().map() on 1,000 items', results);
}

// Scenario D: Filter + Map + Take(10) on 1,000 items
{
  const results: MemoryResult[] = [];

  results.push(measureMemory('Native', () =>
    arr1k.filter(x => x % 2 === 0).map(x => x * 2).slice(0, 10)
  ));

  results.push(measureMemory('Vorpal Lazy', () =>
    VLazy(arr1k).filter(x => x % 2 === 0).map(x => x * 2).take(10).toArray()
  ));

  results.push(measureMemory('Lodash', () =>
    _.chain(arr1k).filter(x => x % 2 === 0).map(x => x * 2).take(10).value()
  ));

  results.push(measureMemory('Ramda', () =>
    R.pipe(
      R.filter((x: number) => x % 2 === 0),
      R.map((x: number) => x * 2),
      R.take(10)
    )(arr1k)
  ));

  printResults('Scenario D: filter().map().take(10) on 1,000 items', results);
}

// Scenario E: Filter + Map on 10,000 items
{
  const results: MemoryResult[] = [];

  results.push(measureMemory('Native', () =>
    arr10k.filter(x => x % 2 === 0).map(x => x * 2)
  ));

  results.push(measureMemory('Vorpal Lazy', () =>
    VLazy(arr10k).filter(x => x % 2 === 0).map(x => x * 2).toArray()
  ));

  results.push(measureMemory('Lodash', () =>
    _.chain(arr10k).filter(x => x % 2 === 0).map(x => x * 2).value()
  ));

  results.push(measureMemory('Ramda', () =>
    R.pipe(
      R.filter((x: number) => x % 2 === 0),
      R.map((x: number) => x * 2)
    )(arr10k)
  ));

  printResults('Scenario E: filter().map() on 10,000 items', results);
}

// Scenario F: Filter + Map + Take(10) on 10,000 items
{
  const results: MemoryResult[] = [];

  results.push(measureMemory('Native', () =>
    arr10k.filter(x => x % 2 === 0).map(x => x * 2).slice(0, 10)
  ));

  results.push(measureMemory('Vorpal Lazy', () =>
    VLazy(arr10k).filter(x => x % 2 === 0).map(x => x * 2).take(10).toArray()
  ));

  results.push(measureMemory('Lodash', () =>
    _.chain(arr10k).filter(x => x % 2 === 0).map(x => x * 2).take(10).value()
  ));

  results.push(measureMemory('Ramda', () =>
    R.pipe(
      R.filter((x: number) => x % 2 === 0),
      R.map((x: number) => x * 2),
      R.take(10)
    )(arr10k)
  ));

  printResults('Scenario F: filter().map().take(10) on 10,000 items', results);
}

// Scenario 1: Filter + Map + Take(10) on 100k items
{
  const results: MemoryResult[] = [];

  results.push(measureMemory('Native', () =>
    arr100k.filter(x => x % 2 === 0).map(x => x * 2).slice(0, 10)
  ));

  results.push(measureMemory('Vorpal Lazy', () =>
    VLazy(arr100k).filter(x => x % 2 === 0).map(x => x * 2).take(10).toArray()
  ));

  results.push(measureMemory('Vorpal Fn pipe (auto-transducer)', () =>
    VFn.pipe(
      VFn.filter((x: number) => x % 2 === 0),
      VFn.map((x: number) => x * 2),
      VFn.take(10)
    )(arr100k)
  ));

  results.push(measureMemory('Lodash', () =>
    _.chain(arr100k).filter(x => x % 2 === 0).map(x => x * 2).take(10).value()
  ));

  results.push(measureMemory('Ramda', () =>
    R.pipe(
      R.filter((x: number) => x % 2 === 0),
      R.map((x: number) => x * 2),
      R.take(10)
    )(arr100k)
  ));

  printResults('Scenario 1: filter().map().take(10) on 100k items', results);
}

// Scenario 2: Long chain on 100k items
{
  const results: MemoryResult[] = [];

  results.push(measureMemory('Native', () =>
    arr100k
      .filter(x => x % 2 === 0)
      .map(x => x * 2)
      .filter(x => x > 1000)
      .map(x => x + 1)
      .slice(0, 100)
  ));

  results.push(measureMemory('Vorpal Lazy', () =>
    VLazy(arr100k)
      .filter(x => x % 2 === 0)
      .map(x => x * 2)
      .filter(x => x > 1000)
      .map(x => x + 1)
      .take(100)
      .toArray()
  ));

  results.push(measureMemory('Lodash', () =>
    _.chain(arr100k)
      .filter(x => x % 2 === 0)
      .map(x => x * 2)
      .filter(x => x > 1000)
      .map(x => x + 1)
      .take(100)
      .value()
  ));

  results.push(measureMemory('Ramda', () =>
    R.pipe(
      R.filter((x: number) => x % 2 === 0),
      R.map((x: number) => x * 2),
      R.filter((x: number) => x > 1000),
      R.map((x: number) => x + 1),
      R.take(100)
    )(arr100k)
  ));

  printResults('Scenario 2: Long chain (4 ops) + take(100) on 100k items', results);
}

// Scenario 3: Full processing (no early termination)
{
  const results: MemoryResult[] = [];

  results.push(measureMemory('Native', () =>
    arr100k.filter(x => x % 2 === 0).map(x => x * 2)
  ));

  results.push(measureMemory('Vorpal Lazy', () =>
    VLazy(arr100k).filter(x => x % 2 === 0).map(x => x * 2).toArray()
  ));

  results.push(measureMemory('Vorpal Fn pipe', () =>
    VFn.pipe(
      VFn.filter((x: number) => x % 2 === 0),
      VFn.map((x: number) => x * 2)
    )(arr100k)
  ));

  results.push(measureMemory('Lodash', () =>
    _.chain(arr100k).filter(x => x % 2 === 0).map(x => x * 2).value()
  ));

  results.push(measureMemory('Ramda', () =>
    R.pipe(
      R.filter((x: number) => x % 2 === 0),
      R.map((x: number) => x * 2)
    )(arr100k)
  ));

  printResults('Scenario 3: filter().map() on 100k items (no early termination)', results);
}

// Scenario 4: 1M items with take(10)
{
  const results: MemoryResult[] = [];

  results.push(measureMemory('Native', () =>
    arr1m.filter(x => x % 2 === 0).map(x => x * 2).slice(0, 10)
  ));

  results.push(measureMemory('Vorpal Lazy', () =>
    VLazy(arr1m).filter(x => x % 2 === 0).map(x => x * 2).take(10).toArray()
  ));

  results.push(measureMemory('Vorpal Fn pipe (auto-transducer)', () =>
    VFn.pipe(
      VFn.filter((x: number) => x % 2 === 0),
      VFn.map((x: number) => x * 2),
      VFn.take(10)
    )(arr1m)
  ));

  results.push(measureMemory('Lodash', () =>
    _.chain(arr1m).filter(x => x % 2 === 0).map(x => x * 2).take(10).value()
  ));

  results.push(measureMemory('Ramda', () =>
    R.pipe(
      R.filter((x: number) => x % 2 === 0),
      R.map((x: number) => x * 2),
      R.take(10)
    )(arr1m)
  ));

  printResults('Scenario 4: filter().map().take(10) on 1M items', results);
}

console.log('\n' + '='.repeat(80));
console.log('Notes:');
console.log('- Lower heap delta = less memory allocated');
console.log('- Lazy evaluation should excel at early termination scenarios');
console.log('- "vs Best" shows ratio compared to most memory-efficient approach');
console.log('='.repeat(80));
