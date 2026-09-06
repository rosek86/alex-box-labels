import { LabelError } from './errors.ts';
import { DEFAULTS, NUMERIC_SETTINGS, PAGE, EPSILON, LIMITS } from './constants.ts';
import { isRecord } from './validation.ts';
import type { Grid, LabelSettings } from './types.ts';

export function validateSettings(input: unknown = {}): Grid {
  if (!isRecord(input)) throw new LabelError('settingsObject');
  const settings: LabelSettings = { ...DEFAULTS };
  for (const key of NUMERIC_SETTINGS) {
    const value = input[key] === undefined ? DEFAULTS[key] : input[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new LabelError('numbers');
    }
    settings[key] = value;
  }
  const borders = input.borders === undefined ? DEFAULTS.borders : input.borders;
  if (typeof borders !== 'boolean') throw new LabelError('borders');
  settings.borders = borders;
  if (
    settings.labelWidth < 1 ||
    settings.labelHeight < 1 ||
    settings.labelWidth > PAGE.width ||
    settings.labelHeight > PAGE.height
  )
    throw new LabelError('labelSize');
  for (const key of [
    'gapX',
    'gapY',
    'marginLeft',
    'marginRight',
    'marginTop',
    'marginBottom',
    'padding',
  ] as const) {
    if (settings[key] < 0) throw new LabelError('negativeSpacing');
  }
  if (settings.padding * 2 >= Math.min(settings.labelWidth, settings.labelHeight))
    throw new LabelError('padding');
  if (settings.fontMin < 0.5 || settings.fontMax > 20 || settings.fontMax < settings.fontMin)
    throw new LabelError('fontRange');
  const columns = Math.floor(
    (PAGE.width - settings.marginLeft - settings.marginRight + settings.gapX + EPSILON) /
      (settings.labelWidth + settings.gapX),
  );
  const rows = Math.floor(
    (PAGE.height - settings.marginTop - settings.marginBottom + settings.gapY + EPSILON) /
      (settings.labelHeight + settings.gapY),
  );
  if (columns < 1 || rows < 1) throw new LabelError('noLabelsFit');
  const capacity = columns * rows;
  if (capacity > LIMITS.slotsPerPage)
    throw new LabelError('tooManySlots', { max: LIMITS.slotsPerPage });
  if (!Number.isInteger(settings.skip) || settings.skip < 0 || settings.skip >= capacity)
    throw new LabelError('skip', { max: capacity - 1 });
  const left = settings.marginLeft + settings.offsetX;
  const top = settings.marginTop + settings.offsetY;
  if (
    left < -EPSILON ||
    top < -EPSILON ||
    left + columns * settings.labelWidth + (columns - 1) * settings.gapX > PAGE.width + EPSILON ||
    top + rows * settings.labelHeight + (rows - 1) * settings.gapY > PAGE.height + EPSILON
  ) {
    throw new LabelError('offset');
  }
  return { settings: settings, columns, rows, capacity };
}
