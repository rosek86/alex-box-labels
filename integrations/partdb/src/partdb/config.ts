import { isRecord } from '../core/validation.ts';

export interface ExportConfig {
  manufacturers: Record<string, string>;
  suppliers: Record<string, string>;
  supplierPriority: string[];
}

export const DEFAULT_CONFIG: ExportConfig = {
  manufacturers: { 'Texas Instruments': 'TI', STMicroelectronics: 'ST', 'Analog Devices': 'ADI' },
  suppliers: {
    'Digi-Key': 'D',
    DigiKey: 'D',
    Mouser: 'M',
    'Mouser Electronics': 'M',
    TME: 'T',
    Farnell: 'F',
    LCSC: 'L',
  },
  supplierPriority: ['D', 'M', 'T', 'F', 'L'],
};

function isSingleLineText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !/[\r\n]/.test(value);
}

function parseDictionary(
  value: unknown,
  key: 'manufacturers' | 'suppliers',
): Record<string, string> {
  const entries = value ?? {};
  if (!isRecord(entries)) throw new Error(`Invalid ${key} dictionary.`);

  const dictionary = new Map(Object.entries(DEFAULT_CONFIG[key]));
  for (const [name, alias] of Object.entries(entries)) {
    if (!name.trim() || !isSingleLineText(alias)) {
      throw new Error(`Invalid ${key} dictionary.`);
    }
    dictionary.set(name, alias);
  }
  return Object.fromEntries(dictionary);
}

export function parseConfig(value: unknown): ExportConfig {
  if (!isRecord(value)) throw new Error('Configuration must be an object.');
  for (const key of Object.keys(value)) {
    if (!['manufacturers', 'suppliers', 'supplierPriority'].includes(key)) {
      throw new Error(`Unknown configuration key: ${key}`);
    }
  }

  const priority = value.supplierPriority ?? DEFAULT_CONFIG.supplierPriority;
  if (!Array.isArray(priority) || !priority.length || !priority.every(isSingleLineText)) {
    throw new Error('supplierPriority must contain supplier codes.');
  }

  return {
    manufacturers: parseDictionary(value.manufacturers, 'manufacturers'),
    suppliers: parseDictionary(value.suppliers, 'suppliers'),
    supplierPriority: [...priority],
  };
}
