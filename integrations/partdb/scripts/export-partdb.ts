import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { writeExport } from '../src/output.ts';
import { PartDbClient } from '../src/partdb/client.ts';
import { makeLabels } from '../src/partdb/export.ts';
import { parseConfig } from '../src/partdb/config.ts';
import { selectParts } from '../src/partdb/selection.ts';
import { parseProject } from '../src/core/project.ts';
import { EXPORT_SETTINGS } from '../src/label-settings.ts';

const HELP = `Export PART-DB labels (Node 26)

node --env-file=.env scripts/export-partdb.ts --category 12

Environment: PARTDB_URL (installation root), PARTDB_TOKEN (read-only token)
Selection: --ids 1,2,3 | --category 12 | --location 7 | --all
ID range: --from-id 71 [--to-id 100] (inclusive; either bound can be omitted)
Category and location can be combined (intersection).
Options:
  --supplier M                 Use only this supplier code (otherwise configured priority)
  --config partdb.config.json   Alias dictionaries and supplier priority
  --template local/sheet.json   Reuse an exported label project's sheet settings
  --output exports/labels.json  Destination (default)
  --force                      Replace existing output and report
  --help

A sibling .report.json records warnings. Review the imported sheet before printing.
`;

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      ids: { type: 'string' },
      'from-id': { type: 'string' },
      'to-id': { type: 'string' },
      category: { type: 'string' },
      location: { type: 'string' },
      all: { type: 'boolean' },
      supplier: { type: 'string' },
      config: { type: 'string' },
      template: { type: 'string' },
      output: { type: 'string', default: 'exports/labels.json' },
      force: { type: 'boolean' },
      help: { type: 'boolean' },
    },
  });
  if (values.help) {
    console.log(HELP);
    return;
  }
  const hasRange = values['from-id'] !== undefined || values['to-id'] !== undefined;
  const selectors = [values.ids, values.category || values.location || hasRange, values.all].filter(
    Boolean,
  );
  if (selectors.length !== 1) throw new Error('Choose --ids, --category/--location, or --all.');
  for (const key of ['ids', 'category', 'location'] as const) {
    if (values[key] !== undefined && !/^[1-9]\d*(,[1-9]\d*)*$/.test(values[key]))
      throw new Error(`--${key} requires positive IDs separated by commas.`);
  }
  for (const key of ['from-id', 'to-id'] as const) {
    const value = values[key];
    if (
      value !== undefined &&
      (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))
    ) {
      throw new Error(`--${key} requires a positive integer.`);
    }
  }
  const base = process.env.PARTDB_URL;
  const token = process.env.PARTDB_TOKEN;
  if (!base || !token)
    throw new Error('Set PARTDB_URL and PARTDB_TOKEN in .env or the environment.');
  const config = parseConfig(
    values.config ? JSON.parse(await readFile(values.config, 'utf8')) : {},
  );
  if (values.supplier !== undefined && !Object.values(config.suppliers).includes(values.supplier))
    throw new Error('--supplier must match a configured supplier code.');
  const settings = values.template
    ? parseProject(JSON.parse(await readFile(values.template, 'utf8'))).settings
    : { ...EXPORT_SETTINGS };
  const client = new PartDbClient(base, token);
  const selection = {
    ...(values['from-id'] !== undefined ? { fromId: Number(values['from-id']) } : {}),
    ...(values['to-id'] !== undefined ? { toId: Number(values['to-id']) } : {}),
    ...(values.ids ? { ids: [...new Set(values.ids.split(','))] } : {}),
    ...(values.category ? { category: values.category } : {}),
    ...(values.location ? { location: values.location } : {}),
    ...(values.all ? { all: true } : {}),
  };
  const parts = await selectParts(client, selection);
  if (!parts.length) throw new Error('No parts matched the selection; no files written.');
  const { labels, warnings } = await makeLabels(client, parts, config, values.supplier);
  const project = parseProject({ version: 1, settings, labels });
  const { output, report } = await writeExport(
    project,
    { count: labels.length, selection, warnings },
    {
      filename: values.output ?? 'exports/labels.json',
      overwrite: values.force ?? false,
      inputs: [values.config, values.template, '.env'],
    },
  );
  console.log(
    `Exported ${labels.length} labels to ${output}. ${warnings.length} warnings in ${report}.`,
  );
}

try {
  await main();
} catch (error) {
  // Never print request headers or response bodies (which may include credentials).
  console.error(error instanceof Error ? error.message : 'PART-DB export failed.');
  process.exitCode = 1;
}
