import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseProject } from '../src/core/project.ts';

test('CLI exports importable JSON, reuses settings, protects files and reports API failures', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'partdb-cli-'));
  try {
    const template = join(dir, 'template.json');
    await writeFile(template, JSON.stringify({ version: 1, settings: { skip: 2 }, labels: [] }));
    const mock = `globalThis.fetch = async (url, options) => {
      if (options.headers.Authorization !== 'Bearer fixture-secret') throw new Error('Missing token');
      const id = new URL(url).pathname.split('/').at(-1);
      return new Response(JSON.stringify({ id: Number(id), name: 'NE555P', manufacturer_product_number: 'NE555P', manufacturer: {name: 'Texas Instruments'}, orderdetails: [{supplier: {name: 'Mouser'}, supplierpartnr: '595-NE555P'}] }), {status: id === '99' ? 401 : 200});
    };`;
    const output = join(dir, 'labels.json');
    const report = join(dir, 'labels.report.json');
    const run = (...args: string[]) =>
      spawnSync(
        process.execPath,
        [
          '--import',
          `data:text/javascript,${encodeURIComponent(mock)}`,
          fileURLToPath(new URL('../scripts/export-partdb.ts', import.meta.url)),
          ...args,
        ],
        {
          cwd: dir,
          encoding: 'utf8',
          env: {
            ...process.env,
            PARTDB_URL: 'http://fixture.test/',
            PARTDB_TOKEN: 'fixture-secret',
          },
        },
      );
    const args = ['--ids', '2,1,2', '--supplier', 'M', '--template', template, '--output', output];
    const success = run(...args);
    assert.equal(success.status, 0, success.stderr);
    const raw = await readFile(output, 'utf8');
    const project = parseProject(JSON.parse(raw));
    assert.equal(project.settings.skip, 2);
    assert.equal(project.settings.fontMin, 2, 'Explicit templates retain their font limit');
    assert.deepEqual(project.labels, ['TI\nNE555P\nM:595-NE555P', 'TI\nNE555P\nM:595-NE555P']);
    assert.deepEqual(JSON.parse(await readFile(report, 'utf8')).selection.ids, ['2', '1']);
    assert.doesNotMatch(raw + (await readFile(report, 'utf8')), /fixture-secret/);
    assert.equal(run(...args).status, 1);
    assert.equal(await readFile(output, 'utf8'), raw);
    assert.equal(run(...args, '--force').status, 0);
    await rm(output);
    assert.equal(run(...args).status, 1, 'An existing report must not leave a new orphan output');
    await assert.rejects(access(output));
    const failed = run('--ids', '99', '--output', join(dir, 'failed.json'));
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /HTTP 401/);
    await assert.rejects(access(join(dir, 'failed.json')));
    assert.equal(run('--ids', '1', '--all').status, 1);
    assert.equal(run('--ids', '../1').status, 1);
    assert.equal(run('--help').status, 0);
    const compact = join(dir, 'compact.json');
    assert.equal(run('--ids', '1', '--output', compact).status, 0);
    assert.equal(parseProject(JSON.parse(await readFile(compact, 'utf8'))).settings.fontMin, 1.5);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
