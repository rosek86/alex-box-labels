import { LabelError } from '../core/errors.ts';
import { formatEditorText } from '../core/labels.ts';
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
  editor.value = formatEditorText(project.labels);
  applySettings(project.settings, form);
}

export function applySettings(settings: Readonly<LabelSettings>, form: HTMLFormElement): void {
  for (const key of NUMERIC_SETTINGS) {
    settingInput(form, key).value = String(settings[key]);
  }
  settingInput(form, 'borders').checked = settings.borders;
}
