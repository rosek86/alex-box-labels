import { LabelError } from './errors.ts';
import { validateSettings } from './settings.ts';
import { validateLabels } from './labels.ts';
import { LIMITS } from './constants.ts';
import type { LabelLayout } from './types.ts';

export function createLayout(labels: readonly string[], input: unknown = {}): LabelLayout {
  validateLabels(labels);
  const grid = validateSettings(input);
  const { settings, capacity, columns } = grid;
  const pageCount = labels.length ? Math.ceil((labels.length + settings.skip) / capacity) : 0;
  if (pageCount > LIMITS.pages || pageCount * capacity > LIMITS.totalSlots)
    throw new LabelError('projectSize', { pages: LIMITS.pages, slots: LIMITS.totalSlots });
  const pages = Array.from({ length: pageCount }, (_, pageIndex) => {
    return Array.from({ length: capacity }, (_, slot) => {
      const index = pageIndex * capacity + slot - settings.skip;
      return {
        x:
          settings.marginLeft +
          settings.offsetX +
          (slot % columns) * (settings.labelWidth + settings.gapX),
        y:
          settings.marginTop +
          settings.offsetY +
          Math.floor(slot / columns) * (settings.labelHeight + settings.gapY),
        index,
        text: index >= 0 && index < labels.length ? (labels[index] ?? null) : null,
      };
    });
  });
  return { ...grid, pages };
}
