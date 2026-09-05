import { createTranslator } from '../src/i18n/index.ts';
import { LabelError } from '../src/core/errors.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, LIMITS } from '../src/core/constants.ts';
import { downloadProject, readProjectFile } from '../src/browser/project-files.ts';

test('import TXT zachowuje polskie znaki, puste pola i ustawienia', async () => {
  const file = new File(['\uFEFFŻółć\r\n\r\n10 kΩ'], 'etykiety.txt');
  const project = await readProjectFile(file, DEFAULTS);
  assert.deepEqual(project.labels, ['Żółć', '', '10 kΩ']);
  assert.deepEqual(project.settings, DEFAULTS);
});

test('import JSON sprawdza schemat i odtwarza zapisany projekt', async () => {
  const project = { version: 1, settings: { ...DEFAULTS, skip: 3 }, labels: ['A', '', 'B'] };
  const file = new File([JSON.stringify(project)], 'projekt.JSON');
  assert.deepEqual(await readProjectFile(file, DEFAULTS), project);
  await assert.rejects(readProjectFile(new File(['{"version":2}'], 'projekt.json'), DEFAULTS));
  await assert.rejects(readProjectFile(new File(['{broken'], 'projekt.json'), DEFAULTS));
});

test('import odrzuca zbyt duży plik przed odczytem', async () => {
  const file = new File([new Uint8Array(LIMITS.importBytes + 1)], 'etykiety.txt');
  await assert.rejects(
    readProjectFile(file, DEFAULTS),
    (error: unknown) => error instanceof LabelError && error.code === 'fileSize',
  );
});

test('project downloads use the selected language without changing saved data', async () => {
  const project = { version: 1 as const, settings: { ...DEFAULTS }, labels: ['Śruba M3', ''] };
  for (const [locale, filename] of [
    ['en', 'labels.json'],
    ['pl', 'etykiety.json'],
  ] as const) {
    const downloads: { blob: Blob; name: string }[] = [];
    downloadProject(project, createTranslator(locale), (blob, name) =>
      downloads.push({ blob, name }),
    );
    assert.equal(downloads.length, 1);
    const saved = downloads[0];
    assert.ok(saved);
    assert.equal(saved.name, filename);
    assert.equal(saved.blob.type, 'application/json');
    assert.deepEqual(JSON.parse(await saved.blob.text()), project);
  }
});

test('SVG filenames translate both the first page and later pages', () => {
  for (const [locale, prefix] of [
    ['en', 'labels'],
    ['pl', 'etykiety'],
  ] as const) {
    const t = createTranslator(locale);
    for (const page of [1, 2, 10]) {
      assert.equal(t('export.sheetFilename', { page }), `${prefix}-${page}.svg`);
    }
  }
});
