import test from 'node:test';
import assert from 'node:assert/strict';
import { LABEL_PRESETS } from '../src/data/presets.ts';
import { DEFAULTS } from '../src/core/constants.ts';
import { createLayout } from '../src/core/layout.ts';

test('the single screw example fills exactly one default A4 sheet without gaps or duplicates', () => {
  assert.deepEqual(Object.keys(LABEL_PRESETS), ['bolts']);
  const labels = LABEL_PRESETS.bolts;
  const layout = createLayout(labels, DEFAULTS);
  assert.equal(labels.length, 161);
  assert.equal(new Set(labels).size, labels.length);
  assert.equal(layout.capacity, labels.length);
  assert.equal(layout.pages.length, 1);
  assert.ok(layout.pages[0]?.every((slot) => slot.text?.trim()));
});
