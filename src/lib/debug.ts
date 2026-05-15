import { trace, debug, info, warn, error } from "@tauri-apps/plugin-log";

let initialized = false;

function forwardConsole(fnName: "log" | "debug" | "info" | "warn" | "error", logger: (msg: string) => Promise<void>) {
  const original = (console as any)[fnName];
  (console as any)[fnName] = (...args: any[]) => {
    original(...args);
    const message = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    logger(message).catch(() => {});
  };
}

export function initDebugLogging() {
  if (initialized) return;
  initialized = true;

  // Forward browser console to Rust/file logger
  forwardConsole("log", trace);
  forwardConsole("debug", debug);
  forwardConsole("info", info);
  forwardConsole("warn", warn);
  forwardConsole("error", error);

  // Global error handlers
  window.onerror = (msg, url, line, col, err) => {
    error(`[window.onerror] ${msg} at ${url}:${line}:${col} ${err?.stack || ""}`).catch(() => {});
    return false;
  };

  window.onunhandledrejection = (event) => {
    error(`[unhandledrejection] ${event.reason?.stack || event.reason || ""}`).catch(() => {});
  };

  // Startup trace — these log messages will show us exactly how far init gets
  info("=== MarkZ startup ===");
  info(`UserAgent: ${navigator.userAgent}`);
  info(`Platform: ${navigator.platform}`);
  info(`Location: ${window.location.href}`);
}

export function startupCheckpoint(label: string) {
  info(`[startup] ${label}`);
}
