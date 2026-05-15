import { invoke } from "@tauri-apps/api/core";

let initialized = false;

export function initDebugLogging() {
  if (initialized) return;
  initialized = true;

  // Global error handlers
  window.onerror = (msg, url, line, col, err) => {
    invoke("log_frontend", {
      level: "error",
      message: `[window.onerror] ${msg} at ${url}:${line}:${col} ${err?.stack || ""}`,
    }).catch(() => {});
    return false;
  };

  window.onunhandledrejection = (event) => {
    invoke("log_frontend", {
      level: "error",
      message: `[unhandledrejection] ${event.reason?.stack || event.reason || ""}`,
    }).catch(() => {});
  };

  // Startup trace — use raw console to avoid recursion issues
  console.info("=== MarkZ startup ===");
  console.info(`UserAgent: ${navigator.userAgent}`);
  console.info(`Platform: ${navigator.platform}`);
  console.info(`Location: ${window.location.href}`);
}

export function startupCheckpoint(label: string) {
  console.info(`[startup] ${label}`);
  invoke("log_frontend", { level: "info", message: `[startup] ${label}` }).catch(() => {});
}
