import { en, type MessageKey, type Messages } from './en.ts';
import { pl } from './pl.ts';
import { LabelError, type MessageParameters } from '../core/errors.ts';

export const locales = {
  en: { name: 'English', messages: en },
  pl: { name: 'Polski', messages: pl },
} satisfies Record<string, { name: string; messages: Messages }>;
export type Locale = keyof typeof locales;
export const DEFAULT_LOCALE: Locale = 'en';
export type Translate = (key: MessageKey, parameters?: MessageParameters) => string;

export function resolveLocale(value: unknown): Locale {
  return typeof value === 'string' && Object.hasOwn(locales, value)
    ? (value as Locale)
    : DEFAULT_LOCALE;
}

export function isMessageKey(value: string): value is MessageKey {
  return Object.hasOwn(en, value);
}

export function createTranslator(locale: Locale): Translate {
  const messages: Messages = locales[locale].messages;
  return (key, parameters = {}) =>
    messages[key].replace(/\{(\w+)\}/g, (_, name: string) => {
      const value = parameters[name];
      if (value === undefined) throw new Error(`Missing translation parameter: ${key}.${name}`);
      return String(value);
    });
}

export function translateError(error: unknown, t: Translate): string {
  if (error instanceof LabelError) return t(`error.${error.code}`, error.parameters);
  if (error instanceof SyntaxError) return t('error.invalidJson');
  return t('error.unexpected');
}
