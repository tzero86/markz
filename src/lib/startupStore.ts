import { writable } from "svelte/store";

/** Tracks whether the app has finished its initial startup sequence
 *  (session restore, pending OS file opens, etc.). UI work that would
 *  otherwise render transient startup state — especially the preview pane —
 *  can gate itself on this store to avoid wasted/blocked renders. */
export const startupComplete = writable(false);
