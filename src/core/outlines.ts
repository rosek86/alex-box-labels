import { EPSILON } from './constants.ts';
import type { LabelSettings, LabelSlot } from './types.ts';

export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const LABEL_FRAME_INSET = 0.2;
export const LABEL_FRAME_WIDTH = 0.1;

export interface LabelFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Each frame stays entirely inside its label after cutting along the slot boundary.
 * At zero gap, neighbouring frames leave 0.3 mm of clear paper for one knife cut.
 */
export function createLabelFrames(
  slots: readonly LabelSlot[],
  settings: Readonly<LabelSettings>,
): LabelFrame[] {
  return slots
    .filter((slot) => slot.text?.trim())
    .map((slot) => ({
      x: slot.x + LABEL_FRAME_INSET,
      y: slot.y + LABEL_FRAME_INSET,
      width: settings.labelWidth - 2 * LABEL_FRAME_INSET,
      height: settings.labelHeight - 2 * LABEL_FRAME_INSET,
    }));
}

interface EdgeGroup {
  axis: 'horizontal' | 'vertical';
  position: number;
  intervals: { start: number; end: number }[];
}

/** Merge collinear slot edges for the preview-only grid. */
export function createOutlines(
  slots: readonly LabelSlot[],
  settings: Readonly<LabelSettings>,
  options: { includeEmpty?: boolean } = {},
): LineSegment[] {
  const groups = new Map<string, EdgeGroup>();
  function add(axis: EdgeGroup['axis'], position: number, start: number, end: number): void {
    const key = `${axis}:${Math.round(position / EPSILON)}`;
    let group = groups.get(key);
    if (!group) {
      group = { axis, position, intervals: [] };
      groups.set(key, group);
    }
    group.intervals.push({ start, end });
  }

  for (const slot of slots) {
    if (!options.includeEmpty && !slot.text?.trim()) continue;
    const right = slot.x + settings.labelWidth;
    const bottom = slot.y + settings.labelHeight;
    add('horizontal', slot.y, slot.x, right);
    add('horizontal', bottom, slot.x, right);
    add('vertical', slot.x, slot.y, bottom);
    add('vertical', right, slot.y, bottom);
  }

  const lines: LineSegment[] = [];
  for (const { axis, position, intervals } of groups.values()) {
    intervals.sort((a, b) => a.start - b.start);
    const merged: { start: number; end: number }[] = [];
    for (const interval of intervals) {
      const previous = merged.at(-1);
      if (previous && interval.start <= previous.end + EPSILON) {
        previous.end = Math.max(previous.end, interval.end);
      } else {
        merged.push({ ...interval });
      }
    }
    for (const { start, end } of merged) {
      lines.push(
        axis === 'horizontal'
          ? { x1: start, y1: position, x2: end, y2: position }
          : { x1: position, y1: start, x2: position, y2: end },
      );
    }
  }
  return lines;
}
