import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNumber } from './utils.mjs';

test('parseNumber handles negative numbers', () => {
  assert.strictEqual(parseNumber('-123'), -123);
});

test('parseNumber handles currency symbols', () => {
  assert.strictEqual(parseNumber('Rp12,345'), 12345);
});

test('parseNumber handles multiple decimal points', () => {
  assert.strictEqual(parseNumber('1.2.3'), 1.2);
});

test('parseNumber handles misplaced hyphens', () => {
  assert.strictEqual(parseNumber('5-5'), 5);
});
