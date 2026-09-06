import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS } from '../src/core/constants.ts';
import { validateSettings } from '../src/core/settings.ts';
import { parseText, parseEditorText, formatEditorText } from '../src/core/labels.ts';
import { createLayout } from '../src/core/layout.ts';
import { wrapText, fitText } from '../src/core/text.ts';
import { parseProject } from '../src/core/project.ts';
import type { MeasureText } from '../src/core/types.ts';

const measure: MeasureText = (text, size) => Array.from(text).length * size * 0.5;

test('domyślny układ: 7 kolumn, 23 wiersze i 161 pól', () => {
  const grid = validateSettings(DEFAULTS);
  assert.deepEqual([grid.columns, grid.rows, grid.capacity], [7, 23, 161]);
});
test('etykiety dotykające prawej i dolnej granicy nie przepadają', () => {
  const grid = validateSettings({
    labelWidth: 105,
    labelHeight: 99,
    gapX: 0,
    gapY: 0,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0,
  });
  assert.equal(grid.capacity, 6);
});
test('stronicowanie zachowuje kolejność, puste opisy i pominięte pola', () => {
  const labels = Array.from({ length: 170 }, (_, i) => (i === 3 ? '' : `Opis ${i}`));
  const layout = createLayout(labels, { skip: 5 });
  assert.equal(layout.pages.length, 2);
  assert.ok(layout.pages[0]!.slice(0, 5).every((slot) => slot.text === null));
  assert.deepEqual(
    layout.pages
      .flat()
      .filter((slot) => slot.text !== null)
      .map((slot) => slot.text),
    labels,
  );
  assert.equal(layout.pages[1]![13]!.text, 'Opis 169');
  assert.equal(layout.pages[1]![14]!.text, null);
});
test('pełna strona nie tworzy dodatkowej pustej strony', () => {
  assert.equal(createLayout(Array(161).fill('R'), DEFAULTS).pages.length, 1);
  assert.equal(createLayout(Array(160).fill('R'), { skip: 1 }).pages.length, 1);
  assert.equal(createLayout([], { skip: 1 }).pages.length, 0);
});
test('TXT zachowuje puste pola, obsługuje BOM oraz CRLF', () => {
  assert.deepEqual(parseText('\uFEFFA\r\n\r\nB\r\n'), ['A', '', 'B', '']);
  assert.deepEqual(parseText(''), []);
});
test('przesunięcie jest stosowane do współrzędnych, bez zmiany siatki', () => {
  const result = createLayout(['A'], { offsetX: -2, offsetY: 1 });
  assert.equal(result.capacity, 161);
  assert.equal(result.pages[0]![0]!.x, 26);
  assert.equal(result.pages[0]![0]!.y, 46);
});
test('niepoprawne konfiguracje są odrzucane przed renderowaniem', () => {
  for (const settings of [
    { labelWidth: 0 },
    { gapY: -1 },
    { marginTop: 300 },
    { offsetX: -29 },
    { offsetY: 50 },
    { skip: 161 },
    { skip: 1.5 },
    { padding: 4.5 },
    { fontMin: 4 },
    { fontMax: 21 },
    { borders: 'true' },
    { labelHeight: NaN },
    { labelWidth: Infinity },
    { labelWidth: '22' },
  ]) {
    assert.throws(() => validateSettings(settings), JSON.stringify(settings));
  }
});
test('zbyt duże projekty mają ograniczenie zasobów', () => {
  assert.throws(() => createLayout(Array(5001).fill('A'), DEFAULTS));
  assert.throws(() => createLayout(Array(101).fill('A'), { labelWidth: 150, labelHeight: 200 }));
  assert.throws(() =>
    validateSettings({ labelWidth: 1, labelHeight: 1, padding: 0, gapX: 0, gapY: 0 }),
  );
});
test('zawijanie zachowuje pełną treść długiego identyfikatora', () => {
  const text = 'STM32F103C8T6';
  const lines = wrapText(text, 2, 5, measure);
  assert.deepEqual(lines, ['STM32', 'F103C', '8T6']);
  assert.equal(lines?.join(''), text);
});
test('zawijanie obsługuje słowa i Unicode bez rozcinania par surogatów', () => {
  assert.deepEqual(wrapText('  Żółć  10 kΩ ', 2, 7, measure), ['Żółć 10', 'kΩ']);
  assert.deepEqual(wrapText('🔧🔧🔧', 2, 2, measure), ['🔧🔧', '🔧']);
});
test('dobór czcionki uwzględnia wysokość, padding i kroki 0,1 mm', () => {
  const s = { ...DEFAULTS, labelWidth: 12, labelHeight: 5, padding: 1 };
  const result = fitText('ABCDEFGH', s, measure);
  assert.ok(result);
  assert.ok(Math.abs(result.size - 2.5) < 1e-7);
  assert.ok(result.lines.length * result.lineHeight <= 3 + 1e-7);
  assert.ok(result.lines.every((line) => measure(line, result.size) <= 10));
});
test('za długi opis zgłasza brak dopasowania zamiast obcięcia', () => {
  assert.equal(fitText('A'.repeat(1000), DEFAULTS, measure), null);
  assert.equal(wrapText('W', 3, 1, measure), null);
});
test('pusty opis nie generuje tekstu zastępczego', () => {
  assert.deepEqual(fitText('', DEFAULTS, measure)?.lines, []);
});
test('format projektu przechodzi pełny cykl JSON', () => {
  const project = { version: 1, settings: DEFAULTS, labels: ['ATMEGA 328P', '', 'Żółć <&>'] };
  assert.deepEqual(parseProject(JSON.parse(JSON.stringify(project))), project);
});
test('import nie akceptuje obiektów zamiast opisów ani obcej wersji', () => {
  for (const value of [
    null,
    {},
    { version: 2, settings: {}, labels: [] },
    { version: 1, settings: {}, labels: [{}] },
    { version: 1, settings: [], labels: [] },
    { version: 1, settings: {}, labels: ['x'.repeat(1001)] },
  ]) {
    assert.throws(() => parseProject(value));
  }
});

test('multiline labels survive JSON, editor and layout without adding slots', () => {
  const labels = ['TI\nNE555P\nM:595-NE555P', '', 'literal \\n and \\path', 'trailing\n'];
  const project = parseProject(
    JSON.parse(JSON.stringify({ version: 1, settings: DEFAULTS, labels })),
  );
  assert.deepEqual(parseEditorText(formatEditorText(project.labels)), labels);
  assert.equal(createLayout(project.labels).pages[0]?.[1]?.text, '');
  assert.deepEqual(wrapText(labels[0]!, 2, 20.4, measure), ['TI', 'NE555P', 'M:595-NE555P']);
  assert.deepEqual(wrapText('A\n\nB', 2, 20, measure), ['A', '', 'B']);
  assert.ok(fitText(labels[0]!, DEFAULTS, measure));
  assert.equal(fitText('A\nB\nC\nD', DEFAULTS, measure), null);
});

test('saved projects retain their explicit margins and gaps', () => {
  const settings = {
    ...DEFAULTS,
    gapX: 1,
    gapY: 1,
    marginLeft: 21,
    marginRight: 21,
    marginTop: 29.7,
    marginBottom: 29.7,
  };
  const project = parseProject({ version: 1, settings, labels: ['M3', 'M4'] });
  assert.deepEqual(project.settings, settings);
  const layout = createLayout(project.labels, project.settings);
  assert.equal(layout.capacity, 161);
  assert.equal(layout.pages[0]?.[0]?.x, 21);
  assert.equal(layout.pages[0]?.[1]?.x, 44);
});
