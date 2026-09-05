import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { en, type MessageKey } from '../src/i18n/en.ts';
import {
  createTranslator,
  DEFAULT_LOCALE,
  isMessageKey,
  locales,
  resolveLocale,
  translateError,
} from '../src/i18n/index.ts';
import { restoreLocale, saveLocale } from '../src/browser/language.ts';
import { LabelError } from '../src/core/errors.ts';
import { validateSettings } from '../src/core/settings.ts';

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

test('all locales have complete dictionaries and matching interpolation parameters', () => {
  for (const { messages } of Object.values(locales)) {
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(en).sort());
    for (const key of Object.keys(en) as MessageKey[]) {
      assert.ok(messages[key].trim(), key);
      assert.deepEqual(placeholders(messages[key]), placeholders(en[key]), key);
    }
  }
});

test('English is the default regardless of missing or unsupported preferences', () => {
  assert.equal(DEFAULT_LOCALE, 'en');
  for (const value of [null, undefined, '', 'de', 'constructor', '__proto__', {}]) {
    assert.equal(resolveLocale(value), 'en');
  }
  assert.equal(resolveLocale('pl'), 'pl');
  assert.equal(resolveLocale('en'), 'en');
});

test('language preference survives reloads and storage failures are harmless', () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
  assert.equal(restoreLocale(storage), 'en');
  saveLocale('pl', storage);
  assert.equal(restoreLocale(storage), 'pl');
  saveLocale('en', storage);
  assert.equal(restoreLocale(storage), 'en');
  const blockedStorage = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  assert.equal(restoreLocale(blockedStorage), 'en');
  assert.doesNotThrow(() => saveLocale('pl', blockedStorage));
});

test('dynamic messages translate counts, including zero, without changing input text', () => {
  const english = createTranslator('en');
  const polish = createTranslator('pl');
  assert.equal(
    english('preview.stats', { count: 0, columns: 7, rows: 23, pages: 0 }),
    'Labels: 0 · Grid: 7 × 23 · Pages: 0',
  );
  assert.equal(polish('export.page', { page: 2 }), 'Strona 2');
  assert.equal(english('export.page', { page: 2 }), 'Page 2');
  assert.throws(() => english('export.page'), /Missing translation parameter/);
  const literal = '<script>{page}</script>';
  assert.equal(
    english('import.failed', { reason: literal }),
    `Could not import the file: ${literal}`,
  );
});

test('a domain error can be translated again after switching language', () => {
  let failure: unknown;
  try {
    validateSettings({ skip: 200 });
  } catch (error) {
    failure = error;
  }
  assert.ok(failure instanceof LabelError);
  assert.equal(failure.code, 'skip');
  assert.deepEqual(failure.parameters, { max: 160 });
  assert.match(translateError(failure, createTranslator('en')), /from 0 to 160/);
  assert.match(translateError(failure, createTranslator('pl')), /od 0 do 160/);
  assert.equal(
    translateError(new SyntaxError('runtime-specific message'), createTranslator('en')),
    en['error.invalidJson'],
  );
  assert.equal(
    translateError(new Error('private details'), createTranslator('pl')),
    locales.pl.messages['error.unexpected'],
  );
});

test('HTML starts in English and every translation marker refers to a known key', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<html lang="en">/);
  assert.match(html, /id="language"/);
  assert.match(html, /value="en" lang="en">English/);
  for (const match of html.matchAll(/data-i18n(?:-aria-label)?="([^"]+)"/g)) {
    assert.ok(match[1]);
    assert.ok(isMessageKey(match[1]), match[1]);
  }
  // Translatable spans live inside labels; translating them cannot replace form controls.
  assert.doesNotMatch(html, /<(?:textarea|input|select)\b[^>]*\sdata-i18n=/);
});
