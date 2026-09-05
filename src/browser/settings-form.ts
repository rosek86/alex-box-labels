import { LabelError } from '../core/errors.ts';
import { DEFAULTS, NUMERIC_SETTINGS } from '../core/constants.ts';
import type { LabelProject, LabelSettings } from '../core/types.ts';

function settingInput(form: HTMLFormElement, key: keyof LabelSettings): HTMLInputElement {
  const input = form.elements.namedItem(key);
  if (!(input instanceof HTMLInputElement)) {
    throw new LabelError('missingElement', { element: key });
  }
  return input;
}

export function readSettings(form: HTMLFormElement): LabelSettings {
  const settings = { ...DEFAULTS };
  for (const key of NUMERIC_SETTINGS) {
    settings[key] = settingInput(form, key).valueAsNumber;
  }
  settings.borders = settingInput(form, 'borders').checked;
  return settings;
}

export function applyProject(
  project: LabelProject,
  editor: HTMLTextAreaElement,
  form: HTMLFormElement,
): void {
  editor.value = project.labels.join('\n');
  for (const key of NUMERIC_SETTINGS) {
    settingInput(form, key).value = String(project.settings[key]);
  }
  settingInput(form, 'borders').checked = project.settings.borders;
}
