import { writable } from "svelte/store";

const ZOOM_KEY = "markz-content-zoom";
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.1;

function getStoredZoom(): number {
  if (typeof localStorage === "undefined") return 1.0;
  const raw = localStorage.getItem(ZOOM_KEY);
  if (!raw) return 1.0;
  const parsed = parseFloat(raw);
  if (isNaN(parsed)) return 1.0;
  return clamp(parsed);
}

function clamp(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(z * 100) / 100));
}

function saveZoom(z: number) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(ZOOM_KEY, String(z));
  }
}

const initialZoom = getStoredZoom();

const zoomWritable = writable<number>(initialZoom);

export const contentZoomStore = {
  subscribe: zoomWritable.subscribe,
  set: (z: number) => {
    const clamped = clamp(z);
    saveZoom(clamped);
    zoomWritable.set(clamped);
  },
  reset: () => {
    contentZoomStore.set(1.0);
  },
  increase: () => {
    let current = 1.0;
    zoomWritable.subscribe((z) => { current = z; })();
    contentZoomStore.set(current + ZOOM_STEP);
  },
  decrease: () => {
    let current = 1.0;
    zoomWritable.subscribe((z) => { current = z; })();
    contentZoomStore.set(current - ZOOM_STEP);
  },
};
