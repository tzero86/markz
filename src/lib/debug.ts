import { invoke } from "@tauri-apps/api/core";

let initialized = false;

function forwardConsole(fnName: "log" | "debug" | "info" | "warn" | "error", level: string) {
  const original = (console as any)[fnName];
  (console as any)[fnName] = (...args: any[]) => {
    original(...args);
    const message = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    invoke("log_frontend", { level, message }).catch(() => {});
  };
}

export function initDebugLogging() {
  if (initialized) return;
  initialized = true;

  // Forward browser console to Rust/file logger
  forwardConsole("log", "trace");
  forwardConsole("debug", "debug");
  forwardConsole("info", "info");
  forwardConsole("warn", "warn");
  forwardConsole("error", "error");

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

  // Startup trace
  info("=== MarkZ startup ===");
  info(`UserAgent: ${navigator.userAgent}`);
  info(`Platform: ${navigator.platform}`);
  info(`Location: ${window.location.href}`);
}

export function startupCheckpoint(label: string) {
  invoke("log_frontend", { level: "info", message: `[startup] ${label}` }).catch(() => {});
}

function info(message: string) {
  console.info(message);
  invoke("log_frontend", { level: "info", message }).catch(() => {});
}
