import { useLayoutEffect, type RefObject } from 'react';

const FOCUSABLE = 'button, input, select, textarea, a[href], [tabindex], [contenteditable="true"]';

function visibleFocusable(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(element =>
    element.tabIndex >= 0 && !element.matches(':disabled') &&
    !element.closest('[hidden], [inert], [aria-hidden="true"]') &&
    element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== 'hidden'
  );
}

/** Capture entry focus, contain Tab navigation and restore focus after a dialog closes. */
export function useDialogFocus(
  ref: RefObject<HTMLDivElement | null>, open: boolean, initialSelector?: string
): void {
  useLayoutEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const preferred = initialSelector ? dialog.querySelector<HTMLElement>(initialSelector) : null;
    (preferred ?? visibleFocusable(dialog)[0] ?? dialog).focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const elements = visibleFocusable(dialog);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', trap);
    return () => {
      window.removeEventListener('keydown', trap);
      if (previous?.isConnected && previous.getClientRects().length > 0) previous.focus();
      else document.getElementById('main-content')?.focus();
    };
  }, [ref, open, initialSelector]);
}
