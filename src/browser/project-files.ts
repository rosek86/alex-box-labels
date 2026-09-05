import type { Translate } from '../i18n/index.ts';
import { LabelError } from '../core/errors.ts';
import { LIMITS } from '../core/constants.ts';
import { parseText } from '../core/labels.ts';
import { parseProject } from '../core/project.ts';
import type { LabelProject, LabelSettings } from '../core/types.ts';

export async function readProjectFile(file: File, settings: LabelSettings): Promise<LabelProject> {
  if (file.size > LIMITS.importBytes) throw new LabelError('fileSize');
  const text = (await file.text()).replace(/^\uFEFF/, '');
  const value: unknown = file.name.toLowerCase().endsWith('.json')
    ? JSON.parse(text)
    : { version: 1, settings, labels: parseText(text) };
  return parseProject(value);
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function downloadProject(
  project: LabelProject,
  t: Translate,
  save: (blob: Blob, filename: string) => void = download,
): void {
  save(
    new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }),
    t('export.projectFilename'),
  );
}

function exportSheet(svg: SVGSVGElement, number: number, t: Translate): void {
  const copy = svg.cloneNode(true);
  if (!(copy instanceof SVGSVGElement)) throw new LabelError('copySheet');
  copy.querySelectorAll('.preview-guide, .overflow-guide').forEach((node) => node.remove());
  download(
    new Blob([new XMLSerializer().serializeToString(copy)], {
      type: 'image/svg+xml;charset=utf-8',
    }),
    t('export.sheetFilename', { page: number }),
  );
}

export function downloadSheets(container: HTMLElement, t: Translate): void {
  const sheets = [...container.querySelectorAll('svg')];
  const [first] = sheets;
  if (!first) return;
  if (sheets.length === 1) return exportSheet(first, 1, t);

  const chooser = document.createElement('dialog');
  const title = document.createElement('h2');
  title.id = 'export-dialog-title';
  title.textContent = t('export.heading');
  chooser.setAttribute('aria-labelledby', title.id);
  chooser.append(title);
  sheets.forEach((svg, index) => {
    const button = document.createElement('button');
    button.textContent = t('export.page', { page: index + 1 });
    button.addEventListener('click', () => exportSheet(svg, index + 1, t));
    chooser.append(button);
  });
  const close = document.createElement('button');
  close.textContent = t('actions.close');
  close.addEventListener('click', () => chooser.close());
  chooser.append(close);
  chooser.addEventListener('close', () => chooser.remove());
  document.body.append(chooser);
  chooser.showModal();
}
