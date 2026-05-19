import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { confirm } from "@tauri-apps/plugin-dialog";
import { get } from "svelte/store";
import { writable } from "svelte/store";
import { tabStore } from "./tabStore";

export const updateAvailable = writable(false);
export const updateDownloading = writable(false);
export const updateReady = writable(false);
export const updateError = writable<string | null>(null);
export const updateVersion = writable<string | null>(null);
export const updateStatus = writable<string>("idle"); // idle | checking | available | downloading | ready | up-to-date | error

let currentUpdate: Update | null = null;

export async function checkForUpdate(): Promise<Update | null> {
  updateError.set(null);
  updateStatus.set("checking");

  try {
    const update = await check();
    if (update?.available) {
      currentUpdate = update;
      updateAvailable.set(true);
      updateVersion.set(update.version);
      updateStatus.set("available");
      return update;
    } else {
      updateAvailable.set(false);
      updateReady.set(false);
      updateVersion.set(null);
      updateStatus.set("up-to-date");
      return null;
    }
  } catch (e) {
    updateError.set(String(e));
    updateStatus.set("error");
    return null;
  }
}

export async function downloadUpdate() {
  if (!currentUpdate) return;

  updateDownloading.set(true);
  updateStatus.set("downloading");
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
    updateStatus.set("ready");
  } catch (e) {
    updateError.set(String(e));
    updateStatus.set("error");
  } finally {
    updateDownloading.set(false);
  }
}

export async function installAndRestart() {
  if (!currentUpdate) return;
  try {
    // Already downloaded during silent check; just relaunch
    await relaunch();
  } catch (e) {
    console.error("Relaunch failed:", e);
    updateError.set("Failed to restart app. Please close and reopen manually.");
  }
}

export async function confirmAndRestart() {
  if (!currentUpdate) return;

  if (tabStore.hasDirtyTabs()) {
    const proceed = await confirm(
      "You have unsaved changes in one or more tabs that will be lost if you restart now.\n\nRestart anyway?",
      { title: "Update Ready — Unsaved Changes", kind: "warning" }
    );
    if (!proceed) return;
  }

  await installAndRestart();
}

export async function confirmAndDownload() {
  if (!currentUpdate) return;

  const confirmed = await confirm(
    `Update v${currentUpdate.version} is available. Download and install it now?`,
    { title: "Update Available", kind: "info" }
  );
  if (!confirmed) return;

  if (tabStore.hasDirtyTabs()) {
    const proceed = await confirm(
      "You have unsaved changes in one or more tabs that will be lost if you update now.\n\nUpdate anyway?",
      { title: "Unsaved Changes", kind: "warning" }
    );
    if (!proceed) return;
  }

  await downloadUpdate();
}

export async function silentUpdateCheck() {
  const update = await checkForUpdate();
  if (update) {
    await downloadUpdate();
  }
}
