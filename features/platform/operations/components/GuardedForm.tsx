'use client';

import { useEffect, useRef, type ComponentProps } from 'react';

// Forms on this page with edits that haven't been saved yet.
const dirtyForms = new Set<string>();
let listening = false;

function confirmLeave(event: MouseEvent) {
  if (!dirtyForms.size || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
  const url = new URL(link.href, window.location.href);
  // Moving within the page (an anchor) doesn't lose anything.
  if (url.origin === window.location.origin && url.pathname === window.location.pathname && url.search === window.location.search) return;
  if (!window.confirm('You have unsaved changes. Leave without saving them?')) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function warnBeforeUnload(event: BeforeUnloadEvent) {
  if (!dirtyForms.size) return;
  event.preventDefault();
  event.returnValue = '';
}

function listen() {
  if (listening) return;
  listening = true;
  document.addEventListener('click', confirmLeave, true);
  window.addEventListener('beforeunload', warnBeforeUnload);
}

function editableFields(form: HTMLFormElement) {
  return Array.from(form.elements).filter((element): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
    (element instanceof HTMLInputElement && element.name !== '' && !['hidden', 'password', 'file', 'submit', 'button', 'checkbox', 'radio'].includes(element.type))
    || ((element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) && element.name !== ''));
}

/**
 * A form that warns before leaving with unsaved edits and, when `restoreDraft` is set (the
 * page came back with an error after this form was submitted), refills the text it last
 * submitted. Drafts live only in this browser tab's session storage, are cleared once the page
 * loads without an error, and never include passwords, files or hidden values. With
 * `keepDraft={false}` (feed links, calendar contents) the form is only guarded, never stored.
 */
export function GuardedForm({ draftKey, restoreDraft = false, keepDraft = true, children, onInput, onSubmit, ...props }: ComponentProps<'form'> & { draftKey: string; restoreDraft?: boolean; keepDraft?: boolean }) {
  const ref = useRef<HTMLFormElement>(null);
  const storageKey = `platform-draft:${draftKey}`;

  useEffect(() => {
    listen();
    const form = ref.current;
    try {
      const saved = restoreDraft ? JSON.parse(window.sessionStorage.getItem(storageKey) || 'null') : null;
      if (saved && form) {
        for (const field of editableFields(form)) {
          if (typeof saved[field.name] === 'string') field.value = saved[field.name];
        }
      }
      if (!restoreDraft) window.sessionStorage.removeItem(storageKey);
    } catch {
      // Storage unavailable: the form still works, just without draft recovery.
    }
    return () => { dirtyForms.delete(draftKey); };
  }, [draftKey, restoreDraft, storageKey]);

  return <form
    ref={ref}
    {...props}
    onInput={(event) => { dirtyForms.add(draftKey); onInput?.(event); }}
    onSubmit={(event) => {
      onSubmit?.(event);
      if (event.defaultPrevented) return;
      dirtyForms.delete(draftKey);
      const form = ref.current;
      // Forms that carry feed links or calendar contents only guard against leaving; nothing is kept.
      if (!form || !keepDraft) return;
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(editableFields(form).map((field) => [field.name, field.value]))));
      } catch {
        // Ignore: no draft recovery without storage.
      }
    }}
  >{children}</form>;
}
