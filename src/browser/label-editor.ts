import { formatEditorText, parseEditorText, validateLabels } from '../core/labels.ts';
import type { Translate } from '../i18n/index.ts';
import { requiredElement } from './dom.ts';

export function createLabelEditor(
  text: HTMLTextAreaElement,
  translate: () => Translate,
  changed: () => void,
  selected: (index: number) => void,
) {
  const list = requiredElement('#label-list', HTMLDivElement);
  const mode = requiredElement('#editor-mode', HTMLSelectElement);
  const textPanel = requiredElement('#text-editor', HTMLDivElement);
  const listPanel = requiredElement('#list-editor', HTMLDivElement);
  const add = requiredElement('#add-label', HTMLButtonElement);
  let labels: string[] = [];
  let textSnapshot = '';
  let active = -1;

  function resize(field: HTMLTextAreaElement): void {
    field.style.height = 'auto';
    field.style.height = `${Math.max(40, field.scrollHeight)}px`;
  }
  function draw(): void {
    const fragment = document.createDocumentFragment();
    labels.forEach((value, index) => {
      const row = document.createElement('div');
      row.className = 'label-entry';
      const field = document.createElement('textarea');
      field.id = `label-entry-${index}`;
      field.setAttribute('aria-label', translate()('labels.item', { number: index + 1 }));
      field.value = value;
      field.rows = Math.max(1, value.split('\n').length);
      field.spellcheck = false;
      field.addEventListener('focus', () => {
        active = index;
        list.querySelector('.is-selected')?.classList.remove('is-selected');
        row.classList.add('is-selected');
        selected(index);
      });
      field.addEventListener('input', () => {
        labels[index] = field.value;
        resize(field);
        changed();
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', translate()('labels.remove', { number: index + 1 }));
      remove.addEventListener('click', () => {
        labels.splice(index, 1);
        active = -1;
        draw();
        changed();
        const fields = list.querySelectorAll('textarea');
        (fields[Math.min(index, fields.length - 1)] ?? add).focus();
      });
      row.append(field, remove);
      fragment.append(row);
    });
    list.replaceChildren(fragment);
    if (!listPanel.hidden) list.querySelectorAll('textarea').forEach(resize);
  }
  mode.addEventListener('change', () => {
    if (mode.value === 'text') {
      textSnapshot = formatEditorText(labels);
      text.value = textSnapshot;
    } else {
      try {
        if (text.value !== textSnapshot) labels = parseEditorText(text.value);
      } catch {
        mode.value = 'text';
        changed();
        return;
      }
    }
    textPanel.hidden = mode.value !== 'text';
    listPanel.hidden = mode.value !== 'list';
    if (mode.value === 'list') draw();
    changed();
  });
  text.addEventListener('input', changed);
  add.addEventListener('click', () => {
    labels.push('');
    draw();
    changed();
    list
      .querySelectorAll('textarea')
      .item(labels.length - 1)
      ?.focus();
  });
  new ResizeObserver(() => {
    if (!listPanel.hidden) list.querySelectorAll('textarea').forEach(resize);
  }).observe(list);

  return {
    read: () =>
      validateLabels(
        mode.value === 'text' && text.value !== textSnapshot ? parseEditorText(text.value) : labels,
      ),
    set(values: readonly string[]) {
      labels = [...values];
      active = -1;
      textSnapshot = formatEditorText(labels);
      text.value = textSnapshot;
      draw();
    },
    refreshLanguage: draw,
    active: () => active,
  };
}

export function enablePanelResize(): void {
  const handle = requiredElement('#panel-resize', HTMLDivElement);
  const main = requiredElement('main', HTMLElement);
  let dragging = false;
  function setWidth(width: number): void {
    const value = Math.round(Math.max(280, Math.min(width, window.innerWidth * 0.65)));
    main.style.setProperty('--panel-width', `${value}px`);
    handle.setAttribute('aria-valuenow', String(value));
  }
  handle.addEventListener('pointerdown', (event) => {
    dragging = true;
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  handle.addEventListener('pointermove', (event) => {
    if (dragging) setWidth(event.clientX - main.getBoundingClientRect().left);
  });
  handle.addEventListener('lostpointercapture', () => {
    dragging = false;
  });
  handle.addEventListener('pointerup', () => {
    dragging = false;
  });
  handle.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = Number(handle.getAttribute('aria-valuenow'));
    setWidth(
      event.key === 'Home'
        ? 280
        : event.key === 'End'
          ? window.innerWidth * 0.65
          : current + (event.key === 'ArrowLeft' ? -20 : 20),
    );
  });
}
