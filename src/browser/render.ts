import type { Translate } from '../i18n/index.ts';
import { LabelError } from '../core/errors.ts';
import { fitText } from '../core/text.ts';
import { createOutlines, createLabelFrames, LABEL_FRAME_WIDTH } from '../core/outlines.ts';
import { PAGE } from '../core/constants.ts';
import type { LabelLayout, LabelSlot, MeasureText } from '../core/types.ts';
import { svgElement } from './dom.ts';

interface TextCheck {
  text: SVGTextElement;
  slot: LabelSlot;
  svg: SVGSVGElement;
  rect: { x: number; y: number; width: number; height: number };
}

/** Renders the complete preview and returns the one-based indices that overflow. */
export function renderPreview(container: HTMLElement, layout: LabelLayout, t: Translate): number[] {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) throw new LabelError('canvas');
  context.font = '100px Verdana, sans-serif';
  const settings = layout.settings;
  const overflow: number[] = [];
  const cache = new Map<string, number>();
  const measure: MeasureText = (text, size) => {
    if (!cache.has(text)) cache.set(text, context.measureText(text).width / 100);
    return (cache.get(text) ?? 0) * size;
  };
  const fragment = document.createDocumentFragment();
  const textChecks: TextCheck[] = [];
  layout.pages.forEach((slots, pageIndex) => {
    const figure = document.createElement('figure');
    figure.className = 'sheet';
    const caption = document.createElement('figcaption');
    caption.textContent = t('preview.caption', { page: pageIndex + 1, pages: layout.pages.length });
    const svg = svgElement('svg', {
      width: `${PAGE.width}mm`,
      height: `${PAGE.height}mm`,
      viewBox: `0 0 ${PAGE.width} ${PAGE.height}`,
      role: 'img',
      'aria-label': t('preview.sheet', { page: pageIndex + 1 }),
    });
    const defs = svgElement('defs');
    svg.append(defs);
    // Keep the cutting lane between populated frames white, including in the preview.
    const previewSlots = settings.borders ? slots.filter((slot) => !slot.text?.trim()) : slots;
    for (const line of createOutlines(previewSlots, settings, { includeEmpty: true })) {
      svg.append(svgElement('line', { ...line, class: 'preview-guide' }));
    }
    if (settings.borders) {
      for (const frame of createLabelFrames(slots, settings)) {
        svg.append(
          svgElement('rect', {
            ...frame,
            fill: 'none',
            stroke: 'black',
            'stroke-width': LABEL_FRAME_WIDTH,
          }),
        );
      }
    }
    for (const slot of slots) {
      const rect = {
        x: slot.x,
        y: slot.y,
        width: settings.labelWidth,
        height: settings.labelHeight,
      };
      if (slot.text !== null) {
        svg.append(
          svgElement('rect', {
            ...rect,
            class: 'preview-guide selection-guide',
            'data-label-index': slot.index,
          }),
        );
      }
      if (slot.text === null || !slot.text.trim()) continue;
      const fitted = fitText(slot.text, settings, measure);
      if (!fitted) {
        overflow.push(slot.index + 1);
        svg.append(svgElement('rect', { ...rect, class: 'overflow-guide' }));
        svg.append(
          svgElement(
            'text',
            {
              x: slot.x + settings.labelWidth / 2,
              y: slot.y + settings.labelHeight / 2,
              'font-size': Math.min(2, settings.labelHeight / 2),
              'text-anchor': 'middle',
              fill: '#a52b10',
            },
            `! ${slot.index + 1}`,
          ),
        );
        continue;
      }
      const clipId = `clip-${pageIndex}-${slot.index}`;
      const clip = svgElement('clipPath', { id: clipId });
      clip.append(svgElement('rect', rect));
      defs.append(clip);
      const text = svgElement('text', {
        'font-family': 'Verdana, sans-serif',
        'font-size': fitted.size,
        'text-anchor': 'middle',
        fill: 'black',
        'clip-path': `url(#${clipId})`,
      });
      const x = slot.x + settings.labelWidth / 2;
      fitted.lines.forEach((line, index) =>
        text.append(svgElement('tspan', { x, y: index * fitted.lineHeight }, line)),
      );
      svg.append(text);
      textChecks.push({ text, slot, svg, rect });
    }
    figure.append(caption, svg);
    fragment.append(figure);
  });
  container.replaceChildren(fragment);
  // Centrowanie według faktycznego obrysu czcionki, także dla wielu wierszy.
  for (const { text, slot, svg, rect } of textChecks) {
    const bbox = text.getBBox();
    const delta = slot.y + (settings.labelHeight - bbox.height) / 2 - bbox.y;
    for (const span of text.children)
      span.setAttribute('y', String(Number(span.getAttribute('y')) + delta));
    if (
      bbox.width > settings.labelWidth - 2 * settings.padding + 0.01 ||
      bbox.height > settings.labelHeight - 2 * settings.padding + 0.01
    ) {
      overflow.push(slot.index + 1);
      const warning = svgElement('rect', { ...rect, class: 'overflow-guide' });
      svg.insertBefore(warning, text);
    }
  }

  return overflow;
}
