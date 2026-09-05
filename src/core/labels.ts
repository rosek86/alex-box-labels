import { LabelError } from './errors.ts';
import { LIMITS } from './constants.ts';

export function validateLabels(labels: unknown): string[] {
  if (!Array.isArray(labels) || labels.length > LIMITS.labels)
    throw new LabelError('tooManyLabels', { max: LIMITS.labels });
  return Array.from(labels, (text: unknown) => {
    if (typeof text !== 'string' || text.length > LIMITS.characters || /[\r\n]/.test(text))
      throw new LabelError('labelText', { max: LIMITS.characters });
    return text;
  });
}

export function parseText(text: string): string[] {
  return validateLabels(
    text === ''
      ? []
      : text
          .replace(/^\uFEFF/, '')
          .replace(/\r\n?/g, '\n')
          .split('\n'),
  );
}
