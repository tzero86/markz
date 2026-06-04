<script lang="ts">
  import { onMount } from "svelte";
  import { ExternalLink } from "@lucide/svelte";
  import { getVersion } from "@tauri-apps/api/app";
  import {
    checkForUpdate,
    confirmAndDownload,
    confirmAndRestart,
    updateStatus,
    updateVersion,
    updateError,
  } from "../../../lib/updater";
  import logo from "../../../assets/logo.png";

  let {
    searching,
    sectionMatches,
  }: {
    searching: boolean;
    sectionMatches: (terms: string[]) => boolean;
  } = $props();

  let appVersion = $state<string>("");

  onMount(() => {
    getVersion().then((v) => (appVersion = v)).catch(() => (appVersion = ""));
  });

  async function handleCheckUpdate() {
    const update = await checkForUpdate();
    if (update) {
      await confirmAndDownload();
    }
  }

  function statusLabel(status: string): string {
    switch (status) {
      case "idle": return "Idle";
      case "checking": return "Checking for updates…";
      case "available": return "Update available";
      case "downloading": return "Downloading update…";
      case "ready": return "Update ready — restart to apply";
      case "up-to-date": return "You're on the latest version";
      case "error": return "Update check failed";
      default: return status;
    }
  }
</script>

{#if !searching || sectionMatches(["about", "version", "update", "credits", "features", "tech"])}
  <div class="settings-section about-content">
    <div class="about-logo">
      <img src={logo} alt="MarkZ logo" class="about-logo-img" />
      <span class="logo-text">MarkZ</span>
      <span class="logo-version">v{appVersion}</span>
    </div>
    <p class="about-description">
      A dual-pane Markdown editor for engineers.
    </p>

    <div class="about-updates">
      <span
        class="update-status"
        class:ready={$updateStatus === "ready"}
        class:error={$updateStatus === "error"}
      >
        {statusLabel($updateStatus)}
        {#if $updateVersion && ($updateStatus === "available" || $updateStatus === "downloading" || $updateStatus === "ready")}
          <span class="update-version">(v{$updateVersion})</span>
        {/if}
      </span>
      {#if $updateStatus === "ready"}
        <button class="update-btn primary" onclick={confirmAndRestart}>Restart</button>
      {:else if $updateStatus === "downloading" || $updateStatus === "checking"}
        <button class="update-btn" disabled>Checking…</button>
      {:else}
        <button class="update-btn" onclick={handleCheckUpdate}>Check</button>
      {/if}
    </div>

    <div class="about-links">
      <a
        href="https://github.com/tzero86/markz"
        target="_blank"
        rel="noopener"
        class="about-link"
      >
        <ExternalLink size={14} strokeWidth={2} />
        GitHub
      </a>
    </div>

    <div class="tech-grid">
      <span class="tech-badge">Tauri</span>
      <span class="tech-badge">Svelte 5</span>
      <span class="tech-badge">CodeMirror 6</span>
      <span class="tech-badge">Rust</span>
      <span class="tech-badge">TypeScript</span>
      <span class="tech-badge">Vite</span>
    </div>

    <p class="about-credits">
      Built by <a href="https://github.com/tzero86" target="_blank" rel="noopener">tzero86</a>. Powered by open source — thank you to
      <a href="https://tauri.app" target="_blank" rel="noopener">Tauri</a>,
      <a href="https://svelte.dev" target="_blank" rel="noopener">Svelte</a>,
      <a href="https://codemirror.net" target="_blank" rel="noopener">CodeMirror</a>,
      <a href="https://katex.org" target="_blank" rel="noopener">KaTeX</a>,
      <a href="https://mermaid.js.org" target="_blank" rel="noopener">Mermaid</a>,
      and <a href="https://docx-rs.rs" target="_blank" rel="noopener">docx-rs</a>.
    </p>

    {#if $updateError}
      <p class="update-error">{$updateError}</p>
    {/if}
  </div>
{/if}
