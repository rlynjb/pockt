import type { RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

export function focusFirstDialogControl(panel: HTMLElement | null) {
  const first = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
  first?.focus();
}

export function trapDialogTab(event: React.KeyboardEvent, panelRef: RefObject<HTMLElement | null>) {
  if (event.key !== "Tab") return;

  const controls = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);
  if (controls.length === 0) return;

  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
