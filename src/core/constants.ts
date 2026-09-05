import type { LabelSettings, NumericSetting } from './types.ts';

export const PAGE = { width: 210, height: 297 } as const;
export const EPSILON = 1e-7;
export const LIMITS = {
  labels: 5000,
  characters: 1000,
  slotsPerPage: 2000,
  pages: 100,
  totalSlots: 20_000,
  importBytes: 2 * 1024 * 1024,
} as const;

export const NUMERIC_SETTINGS = [
  'labelWidth',
  'labelHeight',
  'gapX',
  'gapY',
  'marginLeft',
  'marginRight',
  'marginTop',
  'marginBottom',
  'offsetX',
  'offsetY',
  'padding',
  'fontMin',
  'fontMax',
  'skip',
] as const satisfies readonly NumericSetting[];

export const DEFAULTS: Readonly<LabelSettings> = Object.freeze({
  labelWidth: 22,
  labelHeight: 9,
  gapX: 0,
  gapY: 0,
  marginLeft: 28,
  marginRight: 28,
  marginTop: 45,
  marginBottom: 45,
  offsetX: 0,
  offsetY: 0,
  padding: 0.8,
  fontMin: 2,
  fontMax: 3,
  skip: 0,
  borders: true,
});
