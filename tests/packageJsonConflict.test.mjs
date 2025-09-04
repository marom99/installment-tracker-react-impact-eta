import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('package.json contains no merge conflict markers and parses', () => {
  const raw = fs.readFileSync('package.json', 'utf8');
  // Should not contain Git conflict markers
  assert.ok(!raw.includes('<<<<<<<') && !raw.includes('=======') && !raw.includes('>>>>>>>'),
    'package.json contains unresolved merge conflict markers');

  // Should be valid JSON
  assert.doesNotThrow(() => JSON.parse(raw), 'package.json is not valid JSON');
});

