import { EPSILON } from './constants.ts';
import type { FittedText, LabelSettings, MeasureText } from './types.ts';

export function wrapText(
  text: string,
  size: number,
  width: number,
  measure: MeasureText,
): string[] | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const joined = line ? `${line} ${word}` : word;
    if (measure(joined, size) <= width + EPSILON) {
      line = joined;
      continue;
    }
    if (line) {
      lines.push(line);
      line = '';
    }
    for (const character of Array.from(word)) {
      if (measure(character, size) > width + EPSILON) return null;
      if (line && measure(line + character, size) > width + EPSILON) {
        lines.push(line);
        line = '';
      }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function fitText(
  text: string,
  settings: Readonly<LabelSettings>,
  measure: MeasureText,
): FittedText | null {
  const width = settings.labelWidth - 2 * settings.padding;
  const height = settings.labelHeight - 2 * settings.padding;
  const steps = Math.ceil((settings.fontMax - settings.fontMin) / 0.1);
  for (let step = 0; step <= steps; step++) {
    const size = Math.max(settings.fontMin, settings.fontMax - step * 0.1);
    const lines = wrapText(text, size, width, measure);
    if (lines && lines.length * size * 1.2 <= height + EPSILON)
      return { lines, size, lineHeight: size * 1.2 };
  }
  return null;
}
