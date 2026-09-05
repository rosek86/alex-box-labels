import {
  DEFAULT_LOCALE,
  isMessageKey,
  locales,
  resolveLocale,
  type Locale,
  type Translate,
} from '../i18n/index.ts';

const STORAGE_KEY = 'box-labels.locale.v1';

export function restoreLocale(storage?: Pick<Storage, 'getItem'>): Locale {
  try {
    return resolveLocale((storage ?? localStorage).getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function saveLocale(locale: Locale, storage?: Pick<Storage, 'setItem'>): void {
  try {
    (storage ?? localStorage).setItem(STORAGE_KEY, locale);
  } catch {
    /* The switch remains usable when browser storage is disabled. */
  }
}

export function populateLanguages(select: HTMLSelectElement): void {
  select.replaceChildren(
    ...Object.entries(locales).map(([code, locale]) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = locale.name;
      option.lang = code;
      return option;
    }),
  );
}

export function translateDocument(locale: Locale, t: Translate): void {
  document.documentElement.lang = locale;
  for (const attribute of ['data-i18n', 'data-i18n-aria-label'] as const) {
    for (const element of document.querySelectorAll(`[${attribute}]`)) {
      const key = element.getAttribute(attribute);
      if (!key || !isMessageKey(key)) throw new Error(`Unknown translation key: ${key}`);
      if (attribute === 'data-i18n') element.textContent = t(key);
      else element.setAttribute('aria-label', t(key));
    }
  }
}
