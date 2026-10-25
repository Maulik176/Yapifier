// Flow types by pasting through the clipboard, then puts your old clipboard
// back about half a second later. Text boxes handle the paste themselves: plain
// text is used as is, rich text is reduced to its words, and "" means the paste
// brought no text at all (the caller says so instead of silently doing nothing).
import type { ClipboardEvent } from "react";

export function takePaste(e: ClipboardEvent<HTMLTextAreaElement>): { next: string; caret: number } | null {
  let incoming = e.clipboardData.getData("text/plain");
  if (!incoming.trim()) {
    const html = e.clipboardData.getData("text/html");
    if (html) incoming = new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
  }
  e.preventDefault();
  if (!incoming.trim()) return null;
  const el = e.currentTarget;
  const start = el.selectionStart;
  return { next: el.value.slice(0, start) + incoming + el.value.slice(el.selectionEnd), caret: start + incoming.length };
}

// Put the caret back after React has written the new value.
export function placeCaret(el: HTMLTextAreaElement, caret: number) {
  requestAnimationFrame(() => el.setSelectionRange(caret, caret));
}
