import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS } from '../src/core/constants.ts';
import { createLayout } from '../src/core/layout.ts';
import { createOutlines, createLabelFrames, LABEL_FRAME_WIDTH } from '../src/core/outlines.ts';

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

test('each cut label retains a complete frame with a 0.3 mm clear cutting lane', () => {
  const layout = createLayout(Array<string>(161).fill('M3'), DEFAULTS);
  const page = layout.pages[0];
  assert.ok(page);
  const frames = createLabelFrames(page, layout.settings);
  assert.equal(frames.length, 161);
  const halfStroke = LABEL_FRAME_WIDTH / 2;
  frames.forEach((frame, index) => {
    const slot = page[index];
    assert.ok(slot);
    assert.ok(frame.x - halfStroke > slot.x);
    assert.ok(frame.y - halfStroke > slot.y);
    assert.ok(frame.x + frame.width + halfStroke < slot.x + DEFAULTS.labelWidth);
    assert.ok(frame.y + frame.height + halfStroke < slot.y + DEFAULTS.labelHeight);
    const right = frames[index + 1];
    if (right && (index + 1) % layout.columns !== 0) {
      const laneStart = frame.x + frame.width + halfStroke;
      const laneEnd = right.x - halfStroke;
      close(laneEnd - laneStart, 0.3);
      close((laneEnd + laneStart) / 2, slot.x + DEFAULTS.labelWidth);
    }
    const below = frames[index + layout.columns];
    if (below) {
      const laneStart = frame.y + frame.height + halfStroke;
      const laneEnd = below.y - halfStroke;
      close(laneEnd - laneStart, 0.3);
      close((laneEnd + laneStart) / 2, slot.y + DEFAULTS.labelHeight);
    }
  });
});

test('blank and skipped labels have no frame, including on partially used sheets', () => {
  const layout = createLayout(['A', '', 'B'], { skip: 1 });
  const page = layout.pages[0];
  assert.ok(page);
  const frames = createLabelFrames(page, layout.settings);
  assert.equal(frames.length, 2);
  close(frames[0]!.x, page[1]!.x + 0.2);
  close(frames[1]!.x, page[3]!.x + 0.2);
  assert.deepEqual(
    createLabelFrames(
      page.map((slot) => ({ ...slot, text: null })),
      layout.settings,
    ),
    [],
  );
});

test('custom sheet gaps widen the clear space without connecting individual frames', () => {
  const layout = createLayout(['A', 'B'], { gapX: 1 });
  const frames = createLabelFrames(layout.pages[0]!, layout.settings);
  assert.equal(frames.length, 2);
  close(frames[1]!.x - (frames[0]!.x + frames[0]!.width) - LABEL_FRAME_WIDTH, 1.3);
});

test('preview boundaries do not extend through blank or skipped slots', () => {
  const layout = createLayout(['A', '', 'B'], { skip: 1 });
  const page = layout.pages[0];
  assert.ok(page);
  const lines = createOutlines(page, layout.settings);
  assert.equal(lines.length, 8);
  const blank = page[2];
  assert.ok(blank);
  assert.ok(
    lines.every(
      (line) =>
        line.y1 !== line.y2 || line.x2 <= blank.x || line.x1 >= blank.x + DEFAULTS.labelWidth,
    ),
  );
  assert.deepEqual(
    createOutlines(
      page.map((slot) => ({ ...slot, text: null })),
      layout.settings,
    ),
    [],
  );
});

test('custom gaps keep distinct boundaries, including a gap on only one axis', () => {
  for (const gapX of [0, 1]) {
    const layout = createLayout(['A', 'B'], { gapX, gapY: 1 });
    const page = layout.pages[0];
    assert.ok(page);
    const lines = createOutlines(page, layout.settings);
    assert.equal(lines.length, gapX ? 8 : 5);
  }
});

test('floating point coordinates do not duplicate a shared boundary', () => {
  const settings = { ...DEFAULTS, labelWidth: 0.1, labelHeight: 1 };
  const slots = [
    { x: 0.1 + 0.2, y: 1, index: 0, text: 'A' },
    { x: 0.4, y: 1, index: 1, text: 'B' },
  ];
  assert.equal(createOutlines(slots, settings).length, 5);
});
