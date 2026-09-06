import { DEFAULTS } from './core/constants.ts';
import type { LabelSettings } from './core/types.ts';

/** Allow four text rows when long part numbers wrap on a 22 × 9 mm label. */
export const EXPORT_SETTINGS: Readonly<LabelSettings> = Object.freeze({
  ...DEFAULTS,
  fontMin: 1.5,
});
