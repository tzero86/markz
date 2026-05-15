import { writable } from "svelte/store";

export interface CursorPosition {
  line: number;
  column: number;
}

export const cursorPosition = writable<CursorPosition>({ line: 1, column: 1 });
