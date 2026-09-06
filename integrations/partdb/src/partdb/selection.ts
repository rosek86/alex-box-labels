import { PartDbClient, type ApiObject } from './client.ts';
import { LIMITS } from '../core/constants.ts';

export interface Selection {
  ids?: string[];
  category?: string;
  location?: string;
  all?: boolean;
}

export async function selectParts(
  client: PartDbClient,
  selection: Selection,
): Promise<ApiObject[]> {
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
  if (!selection.category && !selection.location && !selection.all)
    throw new Error('Choose --ids, --category, --location or --all.');
  const parts = await client.collection(`api/parts?${query}`);
  // Item responses include order details that collection responses can omit.
  const details: ApiObject[] = [];
  for (const part of parts) {
    const id = part['@id'] ?? (typeof part.id === 'number' ? `api/parts/${part.id}` : undefined);
    if (typeof id !== 'string') throw new Error('Part has no API identifier.');
    details.push(await client.get(id));
  }
  return details;
}
