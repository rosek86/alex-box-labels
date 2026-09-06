import { LabelError } from './errors.ts';
import { LIMITS } from './constants.ts';

export function validateLabels(labels: unknown): string[] {
  if (!Array.isArray(labels) || labels.length > LIMITS.labels)
    throw new LabelError('tooManyLabels', { max: LIMITS.labels });
  return Array.from(labels, (text: unknown) => {
    if (typeof text !== 'string' || text.length > LIMITS.characters)
      throw new LabelError('labelText', { max: LIMITS.characters });
    return text.replace(/\r\n?/g, '\n');
  });
}

/** The editor keeps one physical line per label; escaped newlines belong to that label. */
export function formatEditorText(labels: readonly string[]): string {
  return labels.map((label) => label.replace(/\\/g, '\\\\').replace(/\n/g, '\\n')).join('\n');
}

export function parseEditorText(text: string): string[] {
  return validateLabels(
    (text === ''
      ? []
      : text
          .replace(/^\uFEFF/, '')
          .replace(/\r\n?/g, '\n')
          .split('\n')
    ).map((label) =>
      label.replace(/\\(\\|n)/g, (_, escaped: string) => (escaped === 'n' ? '\n' : '\\')),
    ),
  );
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
