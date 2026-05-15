export class ScrollSyncController {
  private lock = false;
  private rafId: number | null = null;

  sync(source: HTMLElement, target: HTMLElement) {
    if (this.lock) return;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      const sourceMax = source.scrollHeight - source.clientHeight;
      const targetMax = target.scrollHeight - target.clientHeight;

      if (sourceMax > 0 && targetMax > 0) {
        const ratio = source.scrollTop / sourceMax;
        const newScrollTop = ratio * targetMax;
        if (Math.abs(target.scrollTop - newScrollTop) > 1) {
          target.scrollTop = newScrollTop;
        }
      }

      this.rafId = null;
      this.lock = true;
      requestAnimationFrame(() => {
        this.lock = false;
      });
    });
  }
}

export const scrollSync = new ScrollSyncController();
