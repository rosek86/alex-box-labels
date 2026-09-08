import { PartDbClient, type ApiObject } from './client.ts';
import { LIMITS } from '../core/constants.ts';

export interface Selection {
  ids?: string[];
  category?: string;
  location?: string;
  all?: boolean;
  fromId?: number;
  toId?: number;
}

export async function selectParts(
  client: PartDbClient,
  selection: Selection,
): Promise<ApiObject[]> {
  for (const bound of [selection.fromId, selection.toId]) {
    if (bound !== undefined && (!Number.isSafeInteger(bound) || bound < 1)) {
      throw new Error('ID bounds must be positive safe integers.');
    }
  }
  const hasRange = selection.fromId !== undefined || selection.toId !== undefined;
  if (hasRange && (selection.ids || selection.all)) {
    throw new Error('Use ID bounds without --ids or --all.');
  }
  if (
    selection.fromId !== undefined &&
    selection.toId !== undefined &&
    selection.fromId > selection.toId
  ) {
    throw new Error('--from-id must not exceed --to-id.');
  }
  if (selection.ids) {
    if (selection.ids.length > LIMITS.labels)
      throw new Error('Export exceeds the 5000 part limit.');
    const parts: ApiObject[] = [];
    for (const id of selection.ids) parts.push(await client.get(`api/parts/${id}`));
    return parts;
  }
  const query = new URLSearchParams({ 'order[id]': 'asc', itemsPerPage: '100' });
  if (selection.category) query.set('category', selection.category);
  if (selection.location) query.set('storage_location', selection.location);
  if (!selection.category && !selection.location && !selection.all && !hasRange)
    throw new Error('Choose --ids, --category, --location or --all.');
  const parts = await client.collection(`api/parts?${query}`);
  // Item responses include order details that collection responses can omit.
  const details: ApiObject[] = [];
  for (const part of parts) {
    if (hasRange) {
      const number = Number(
        part.id ??
          (typeof part['@id'] === 'string' ? part['@id'].match(/\/(\d+)$/)?.[1] : undefined),
      );
      if (!Number.isSafeInteger(number) || number < 1)
        throw new Error('Part has no valid numeric ID.');
      if (number < (selection.fromId ?? 1) || number > (selection.toId ?? Number.MAX_SAFE_INTEGER))
        continue;
    }
    const id = part['@id'] ?? (typeof part.id === 'number' ? `api/parts/${part.id}` : undefined);
    if (typeof id !== 'string') throw new Error('Part has no API identifier.');
    details.push(await client.get(id));
  }
  return details;
}
