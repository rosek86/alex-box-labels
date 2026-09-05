import { parseProject } from '../core/project.ts';
import type { LabelProject } from '../core/types.ts';

const STORAGE_KEY = 'box-labels.project.v1';

export function restoreProject(): LabelProject | null {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? parseProject(JSON.parse(saved)) : null;
}

export function saveProject(project: LabelProject): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
}
