import { snapshotSchema, type FixturePort, type Config } from './engine';

function control<T extends HTMLElement>(root: HTMLElement, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Fixture control is absent: ${selector}`);
  return element;
}

export function createFixturePort(root: HTMLElement, cancelPending: () => void): FixturePort {
  return {
    read() {
      const input = root.querySelector<HTMLInputElement>('input[name="title"]');
      const select = root.querySelector<HTMLSelectElement>('select[name="room"]');
      const form = root.querySelector<HTMLFormElement>('form');
      const record = root.querySelector<HTMLElement>('[data-record-id]');
      const roles = [...root.querySelectorAll<HTMLElement>('button,input,select,[role],tr[data-record-id]')].map(element => {
        const implicit = { BUTTON: 'button', INPUT: 'textbox', SELECT: 'combobox', TR: 'row' }[element.tagName as 'BUTTON' | 'INPUT' | 'SELECT' | 'TR'];
        return `${element.getAttribute('role') ?? implicit}:${element.getAttribute('aria-label') ?? element.textContent?.trim() ?? ''}`;
      });
      return snapshotSchema.parse({
        phase: root.dataset.phase,
        dialogOpen: Boolean(root.querySelector('[role="dialog"]')),
        formValid: form ? form.checkValidity() && (input?.value.trim().length ?? 0) >= 3 : null,
        inputTitle: input?.value ?? root.dataset.title,
        inputRoom: select?.value ?? root.dataset.room,
        recordId: record?.dataset.recordId ?? null,
        recordTitle: record?.querySelector('[data-field="title"]')?.textContent ?? null,
        recordRoom: record?.dataset.room ?? null,
        toast: root.querySelector<HTMLElement>('[data-toast]')?.dataset.toast ?? 'none', roles,
      });
    },
    click(name) {
      const button = [...root.querySelectorAll<HTMLButtonElement>('button')].find(element => (element.getAttribute('aria-label') ?? element.textContent?.trim()) === name);
      if (!button || button.disabled) return false;
      button.click(); return true;
    },
    fill(value) {
      const input = control<HTMLInputElement>(root, 'input[name="title"]');
      if (input.disabled) throw new Error('Title field is disabled.');
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    },
    select(value: Config['room']) {
      const select = control<HTMLSelectElement>(root, 'select[name="room"]');
      if (select.disabled) throw new Error('Room field is disabled.');
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    },
    submit() {
      const input = control<HTMLInputElement>(root, 'input[name="title"]');
      const form = control<HTMLFormElement>(root, 'form');
      if (input.value.trim().length < 3) throw new Error('Reservation title needs at least three non-whitespace characters.');
      if (!form.checkValidity()) throw new Error('The reservation form contains an invalid field.');
      const submit = control<HTMLButtonElement>(root, 'button[type="submit"]');
      if (submit.disabled) throw new Error('Save is already pending.');
      submit.click();
    },
    cancelPending,
  };
}
