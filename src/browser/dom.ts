import { LabelError } from '../core/errors.ts';
export function requiredElement<T extends Element>(selector: string, constructor: new () => T): T {
  const element = document.querySelector(selector);
  if (!(element instanceof constructor)) {
    throw new LabelError('missingElement', { element: selector });
  }
  return element;
}

export function svgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Readonly<Record<string, string | number>> = {},
  text?: string,
): SVGElementTagNameMap[K] {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  if (text !== undefined) element.textContent = text;
  return element;
}
