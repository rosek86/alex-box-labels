import { LabelError } from './errors.ts';
import { createLayout } from './layout.ts';
import { validateLabels } from './labels.ts';
import { isRecord } from './validation.ts';
import type { LabelProject } from './types.ts';

/** The JSON boundary: never trust types asserted by an imported file or API. */
export function parseProject(value: unknown): LabelProject {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.settings)) {
    throw new LabelError('projectFormat');
  }
  const labels = validateLabels(value.labels);
  const { settings } = createLayout(labels, value.settings);
  return { version: 1, settings, labels };
}
