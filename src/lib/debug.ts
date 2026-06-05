import { invoke } from "@tauri-apps/api/core";
import { debugLogStore } from "./debugLogStore";

let initialized = false;

export function initDebugLogging() {
  if (initialized) return;
  initialized = true;

  // Global error handlers
  window.onerror = (msg, url, line, col, err) => {
    const detail = `[window.onerror] ${msg} at ${url}:${line}:${col} ${err?.stack || ""}`;
    debugLogStore.add("error", "frontend", detail);
    invoke("log_frontend", { level: "error", message: detail }).catch(() => {});
    return false;
  };

  window.onunhandledrejection = (event) => {
    const detail = `[unhandledrejection] ${event.reason?.stack || event.reason || ""}`;
    debugLogStore.add("error", "frontend", detail);
    invoke("log_frontend", { level: "error", message: detail }).catch(() => {});
  };

  // Startup trace — use raw console to avoid recursion issues
  console.info("=== MarkZ startup ===");
  console.info(`UserAgent: ${navigator.userAgent}`);
  console.info(`Platform: ${navigator.platform}`);
  console.info(`Location: ${window.location.href}`);
}

export function startupCheckpoint(label: string) {
  console.info(`[startup] ${label}`);
  debugLogStore.add("info", "startup", label);
  invoke("log_frontend", { level: "info", message: `[startup] ${label}` }).catch(() => {});
}

/** Re-export convenience helpers from the store */
export {
  logOperation,
  logOperationResult,
  logOperationStart,
  logOperationEnd,
  logError,
  logWarn,
} from "./debugLogStore";
