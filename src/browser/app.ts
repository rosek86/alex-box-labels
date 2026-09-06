import { DEFAULTS } from '../core/constants.ts';
import { createLayout } from '../core/layout.ts';
import { createLabelEditor, enablePanelResize } from './label-editor.ts';
import { createTranslator, resolveLocale, translateError } from '../i18n/index.ts';
import { populateLanguages, restoreLocale, saveLocale, translateDocument } from './language.ts';
import type { LabelProject } from '../core/types.ts';
import { LABEL_PRESETS } from '../data/presets.ts';
import { requiredElement } from './dom.ts';
import { applySettings, readSettings } from './settings-form.ts';
import { renderPreview } from './render.ts';
import { downloadProject, downloadSheets, readProjectFile } from './project-files.ts';
import { restoreProject, saveProject } from './storage.ts';

const editor = requiredElement('#labels', HTMLTextAreaElement);
const form = requiredElement('#settings', HTMLFormElement);
const pages = requiredElement('#pages', HTMLDivElement);
const errorBox = requiredElement('#error', HTMLParagraphElement);
const status = requiredElement('#status', HTMLParagraphElement);
const stats = requiredElement('#stats', HTMLSpanElement);
const printButton = requiredElement('#print', HTMLButtonElement);
const svgButton = requiredElement('#export-svg', HTMLButtonElement);
const importInput = requiredElement('#import', HTMLInputElement);
const languageSelect = requiredElement('#language', HTMLSelectElement);
let locale = restoreLocale();
let t = createTranslator(locale);
populateLanguages(languageSelect);
languageSelect.value = locale;
translateDocument(locale, t);
let renderTimer: number | undefined;
let revision = 0;
const labelEditor = createLabelEditor(
  editor,
  () => t,
  queueRender,
  (index) => highlightLabel(index, true),
);
enablePanelResize();
const helpDialog = requiredElement('#help-dialog', HTMLDialogElement);
requiredElement('#help', HTMLButtonElement).addEventListener('click', () => helpDialog.showModal());

function highlightLabel(index: number, scroll = false): void {
  pages.querySelector('.selected-label')?.classList.remove('selected-label');
  const guide = pages.querySelector<SVGRectElement>(`[data-label-index="${index}"]`);
  guide?.classList.add('selected-label');
  // Keep the selection visible above text and overflow warnings.
  if (guide) guide.parentNode?.appendChild(guide);
  if (scroll) guide?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function showError(message: string): void {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

function setPrintable(printable: boolean): void {
  document.body.dataset.printable = String(printable);
  printButton.disabled = !printable;
  svgButton.disabled = !printable;
}

function render(): LabelProject | null {
  window.clearTimeout(renderTimer);
  setPrintable(false);
  showError('');
  stats.textContent = '';
  try {
    const labels = labelEditor.read();
    const layout = createLayout(labels, readSettings(form));
    const project: LabelProject = { version: 1, settings: layout.settings, labels };
    const overflow = renderPreview(pages, layout, t);
    highlightLabel(labelEditor.active());
    const count = labels.filter((label) => label.trim()).length;
    stats.textContent = t('preview.stats', {
      count,
      columns: layout.columns,
      rows: layout.rows,
      pages: layout.pages.length,
    });
    if (overflow.length > 0) {
      showError(
        t('preview.overflow', {
          labels: overflow.slice(0, 20).join(', ') + (overflow.length > 20 ? '…' : ''),
        }),
      );
    }
    setPrintable(count > 0 && overflow.length === 0);
    try {
      saveProject(project);
      status.textContent = count ? t('status.saved') : t('status.empty');
    } catch {
      status.textContent = t('status.storageUnavailable');
    }
    return project;
  } catch (error) {
    pages.replaceChildren();
    showError(translateError(error, t));
    status.textContent = t('status.fixSettings');
    return null;
  }
}

function queueRender(): void {
  revision++;
  window.clearTimeout(renderTimer);
  setPrintable(false);
  renderTimer = window.setTimeout(render, 180);
}

languageSelect.addEventListener('change', () => {
  locale = resolveLocale(languageSelect.value);
  t = createTranslator(locale);
  saveLocale(locale);
  translateDocument(locale, t);
  labelEditor.refreshLanguage();
  render();
});

requiredElement('#cutting-layout', HTMLButtonElement).addEventListener('click', () => {
  revision++;
  applySettings(DEFAULTS, form);
  render();
});
form.addEventListener('input', queueRender);
form.addEventListener('submit', (event) => event.preventDefault());
requiredElement('#load-preset', HTMLButtonElement).addEventListener('click', () => {
  revision++;
  labelEditor.set(LABEL_PRESETS.bolts);
  render();
});
requiredElement('#clear-list', HTMLButtonElement).addEventListener('click', () => {
  revision++;
  labelEditor.set([]);
  render();
});
printButton.addEventListener('click', () => {
  render();
  if (!printButton.disabled) window.print();
});
window.addEventListener('beforeprint', () => {
  render();
});
requiredElement('#export-json', HTMLButtonElement).addEventListener('click', () => {
  const project = render();
  if (project) downloadProject(project, t);
});
svgButton.addEventListener('click', () => {
  render();
  if (!svgButton.disabled) downloadSheets(pages, t);
});
importInput.addEventListener('change', async () => {
  const file = importInput.files?.[0];
  if (!file) return;
  render();
  const importRevision = ++revision;
  try {
    const project = await readProjectFile(file, readSettings(form));
    if (importRevision !== revision) return;
    labelEditor.set(project.labels);
    applySettings(project.settings, form);
    render();
  } catch (error) {
    if (importRevision === revision)
      showError(t('import.failed', { reason: translateError(error, t) }));
  } finally {
    if (importRevision === revision) importInput.value = '';
  }
});

function initialize(): void {
  let initial: LabelProject = {
    version: 1,
    settings: { ...DEFAULTS },
    labels: [...LABEL_PRESETS.bolts],
  };
  let restoreWarning = '';
  try {
    initial = restoreProject() ?? initial;
  } catch {
    restoreWarning = t('status.restoreFailed');
  }
  labelEditor.set(initial.labels);
  applySettings(initial.settings, form);
  render();
  if (restoreWarning) status.textContent = restoreWarning;
}

initialize();
