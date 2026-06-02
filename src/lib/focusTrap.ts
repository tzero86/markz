export function trapFocus(container: HTMLElement): { destroy: () => void } {
  const focusable = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0] as HTMLElement;
  const last = focusable[focusable.length - 1] as HTMLElement;
  function handler(e: KeyboardEvent) {
    if (e.key !== "Tab") return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }
  container.addEventListener("keydown", handler);
  first?.focus();
  return { destroy: () => container.removeEventListener("keydown", handler) };
}
