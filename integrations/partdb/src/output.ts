import { lstat, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { LIMITS } from './core/constants.ts';
import type { LabelProject } from './core/types.ts';
import type { Selection } from './partdb/selection.ts';

interface ExportReport {
  count: number;
  selection: Selection;
  warnings: string[];
}

interface OutputOptions {
  filename: string;
  overwrite: boolean;
  inputs: readonly (string | undefined)[];
}

async function checkDestination(path: string, overwrite: boolean): Promise<void> {
  const existing = await lstat(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (existing && (!overwrite || !existing.isFile())) {
    throw new Error(
      `Destination already exists: ${path}. Use --force only to replace regular files.`,
    );
  }
}

/** Validate both destinations before writing either file. */
export async function writeExport(
  project: LabelProject,
  reportData: ExportReport,
  options: OutputOptions,
): Promise<{ output: string; report: string }> {
  const json = JSON.stringify(project, null, 2) + '\n';
  if (Buffer.byteLength(json) > LIMITS.importBytes) {
    throw new Error('Output exceeds the application import size limit.');
  }

  const output = resolve(options.filename);
  if (!output.endsWith('.json')) throw new Error('--output must end in .json.');
  const report = output.slice(0, -5) + '.report.json';

  for (const input of options.inputs) {
    if (input && [output, report].includes(resolve(input))) {
      throw new Error('Output must not overwrite an input file.');
    }
  }
  for (const path of [output, report]) {
    await checkDestination(path, options.overwrite);
  }

  await mkdir(dirname(output), { recursive: true });
  // Exclusive creation prevents accidentally replacing a previous export.
  const flag = options.overwrite ? 'w' : 'wx';
  await writeFile(output, json, { flag });
  await writeFile(report, JSON.stringify(reportData, null, 2) + '\n', { flag });
  return { output, report };
}
