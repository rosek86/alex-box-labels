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

test('the default cutting block is centred and neighbouring labels touch', () => {
  const layout = createLayout(LABEL_PRESETS.bolts, DEFAULTS);
  const slots = layout.pages[0];
  assert.ok(slots);
  const first = slots[0];
  const second = slots[1];
  const nextRow = slots[7];
  const last = slots.at(-1);
  assert.ok(first && second && nextRow && last);
  assert.equal(first.x, 28);
  assert.equal(first.y, 45);
  assert.equal(first.x + DEFAULTS.labelWidth, second.x);
  assert.equal(first.y + DEFAULTS.labelHeight, nextRow.y);
  assert.equal(210 - last.x - DEFAULTS.labelWidth, first.x);
  assert.equal(297 - last.y - DEFAULTS.labelHeight, first.y);
});
