export interface LabelSettings {
  labelWidth: number;
  labelHeight: number;
  gapX: number;
  gapY: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  offsetX: number;
  offsetY: number;
  padding: number;
  fontMin: number;
  fontMax: number;
  skip: number;
  borders: boolean;
}

export type NumericSetting = Exclude<keyof LabelSettings, 'borders'>;

export interface LabelProject {
  version: 1;
  settings: LabelSettings;
  labels: string[];
}

export interface Grid {
  settings: LabelSettings;
  columns: number;
  rows: number;
  capacity: number;
}

export interface LabelSlot {
  x: number;
  y: number;
  index: number;
  /** null means an unused slot; an empty string is an intentionally blank label. */
  text: string | null;
}

export interface LabelLayout extends Grid {
  pages: LabelSlot[][];
}

/** Width in SVG user units (millimetres), measured at the given font size. */
export type MeasureText = (text: string, fontSize: number) => number;

export interface FittedText {
  lines: string[];
  size: number;
  lineHeight: number;
}
