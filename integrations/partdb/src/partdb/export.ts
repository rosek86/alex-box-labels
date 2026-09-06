import { PartDbClient, type ApiObject } from './client.ts';
import type { ExportConfig } from './config.ts';

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}
function alias(name: string, dictionary: Record<string, string>): string {
  // Later user entries override defaults, including spelling/case variants.
  return (
    Object.entries(dictionary)
      .reverse()
      .find(([key]) => normalize(key) === normalize(name))?.[1] ?? name
  );
}
function field(object: ApiObject | null, ...keys: string[]): string {
  for (const key of keys) {
    const value = object?.[key];
    if (typeof value === 'string' && value.trim()) return value.replace(/\s+/g, ' ').trim();
  }
  return '';
}

interface SupplierOffer {
  code: string;
  number: string;
}

async function readOffers(
  client: PartDbClient,
  relations: unknown[],
  config: ExportConfig,
): Promise<SupplierOffer[]> {
  const offers: SupplierOffer[] = [];
  for (const relation of relations) {
    const offer = await client.resolve(relation);
    if (offer?.obsolete === true) continue;
    const vendor = await client.resolve(offer?.supplier);
    const name = field(vendor, 'name');
    const number = field(offer, 'supplierpartnr', 'supplierPartNr');
    if (name && number) offers.push({ code: alias(name, config.suppliers), number });
  }

  return offers;
}

function supplierRank(code: string, priority: readonly string[]): number {
  const index = priority.indexOf(code);
  return index < 0 ? priority.length : index;
}

export async function makeLabels(
  client: PartDbClient,
  parts: ApiObject[],
  config: ExportConfig,
  supplier?: string,
): Promise<{ labels: string[]; warnings: string[] }> {
  const labels: string[] = [];
  const warnings: string[] = [];
  for (const part of parts) {
    const reference = String(part.id ?? part['@id'] ?? '?');
    const warn = (message: string) => warnings.push(`Part ${reference}: ${message}`);
    const manufacturer = await client.resolve(part.manufacturer);
    const manufacturerName = field(manufacturer, 'name');
    if (!manufacturerName) warn('manufacturer missing.');
    let mpn = field(part, 'manufacturer_product_number', 'manufacturerProductNumber');
    if (!mpn) {
      mpn = field(part, 'name');
      warn('MPN missing; using the part name.');
    }
    if (!mpn) throw new Error(`Part ${reference} has neither MPN nor name.`);
    if (!Array.isArray(part.orderdetails))
      throw new Error(`Part ${reference}: orderdetails missing; check the installed API schema.`);
    const offers = await readOffers(client, part.orderdetails, config);
    const candidates = offers.filter((offer) => !supplier || offer.code === supplier);
    candidates.sort(
      (a, b) =>
        supplierRank(a.code, config.supplierPriority) -
          supplierRank(b.code, config.supplierPriority) ||
        a.code.localeCompare(b.code, 'en') ||
        a.number.localeCompare(b.number, 'en'),
    );
    const chosen = candidates[0];
    if (!chosen)
      warn(
        supplier
          ? `no active supplier number for ${supplier}; supplier line omitted.`
          : 'no active supplier number; supplier line omitted.',
      );
    if (chosen && candidates.length > 1)
      warn(`selected ${chosen.code}:${chosen.number} from ${candidates.length} offers.`);
    labels.push(
      [
        manufacturerName ? alias(manufacturerName, config.manufacturers) : '',
        mpn,
        chosen ? `${chosen.code}:${chosen.number}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }
  return { labels, warnings };
}
