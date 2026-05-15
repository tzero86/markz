import { check, type Update } from "@tauri-apps/plugin-updater";
import { writable } from "svelte/store";

export const updateAvailable = writable(false);
export const updateDownloading = writable(false);
export const updateReady = writable(false);
export const updateError = writable<string | null>(null);

let currentUpdate: Update | null = null;

export async function checkForUpdate(silent = true) {
  updateError.set(null);

  try {
    const update = await check();
    if (update) {
      currentUpdate = update;
      updateAvailable.set(true);
      if (!silent) {
        // Auto-download in background
        downloadUpdate();
      }
    } else {
      updateAvailable.set(false);
      updateReady.set(false);
    }
    return update;
  } catch (e) {
    updateError.set(String(e));
    return null;
  }
}

export async function downloadUpdate() {
  if (!currentUpdate) return;

  updateDownloading.set(true);
  try {
    await currentUpdate.downloadAndInstall((event) => {
      switch (event.event) {
        case "Started":
          console.log("Download started", event.data.contentLength);
          break;
        case "Progress":
          console.log("Download progress", event.data.chunkLength);
          break;
        case "Finished":
          console.log("Download finished");
          break;
      }
    });
    updateReady.set(true);
    updateAvailable.set(false);
  } catch (e) {
    updateError.set(String(e));
  } finally {
    updateDownloading.set(false);
  }
}

export async function installAndRestart() {
  if (currentUpdate) {
    await currentUpdate.downloadAndInstall();
  }
}

export async function silentUpdateCheck() {
  const update = await checkForUpdate(true);
  if (update) {
    await downloadUpdate();
  }
}
