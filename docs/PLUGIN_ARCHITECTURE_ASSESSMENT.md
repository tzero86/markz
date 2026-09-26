# MarkZ — Plugin Architecture Assessment

> **Version measured:** v0.8.77. All figures below were produced by building the app and measuring the emitted chunk graph; the method is reproducible and documented in [Appendix A](#appendix-a--measurement-method). This document is the detailed analysis behind the one-line `ROADMAP.md:253-257` entry "Plugin architecture (internal only)" — it does not restate that roadmap item, it scopes it.

The frontend is already ~90% code-split correctly: the eager entry chunk has zero static imports of any heavy dependency, and KaTeX, Mermaid, and highlight.js are all behind dynamic `import()`. That means a plugin system is the wrong tool for almost everything on the table. The real wins are narrower and cheaper: (a) shrink the eager entry chunk, which is still 1042 KB raw / 345 KB gzip; (b) trim the highlight.js full bundle, which registers 192 languages to deliver the 36 in `lib/common`; (c) make the *loading* of features that already default to OFF conditional — `@replit/codemirror-vim` is 10.7% of the entry's source weight for a feature most users never turn on; and (d) introduce Cargo features for the Rust side, which currently has ZERO `[features]` tables anywhere.

---

## 1. Current state

### Eager vs. lazy, as built

| Chunk | Raw | Gzip | Status |
|---|---|---|---|
| `index-<hash>.js` (entry) | 1042 KB | 345 KB | **eager** — referenced from `dist/index.html` |
| highlight.js | 947 KB | 301 KB | lazy (`import()`) |
| mermaid.core | 578 KB | 134 KB | lazy (`import()`) |
| katex | 255 KB | 75 KB | lazy (`import()`) |
| docxPrep | 19 KB | 7 KB | lazy (`import()`) |
| ~34 mermaid diagram chunks | — | — | lazy, dynamic children of `mermaid.core` |
| **Total shipped `dist/`** | **6.17 MB** | — | 56 JS files, 59 font files |

The entry chunk contains **zero** static imports of heavy deps. Verified: the entry has 0 `from"./..."` static refs; its only chunk refs are 4 `import()` calls. The frontend code-splitting discipline is real and should not be undone.

### Eager entry composition

Attributed from sourcemap `sourcesContent`, as a share of the 2921 KB of source contributing to the entry:

| Package | Source KB | Share |
|---|---|---|
| app code (`src/`) | 547 | 18.7% |
| `@codemirror/view` | 477 | 16.3% |
| `svelte` | 359 | 12.3% |
| **`@replit/codemirror-vim`** | **314** | **10.7%** |
| `@codemirror/state` | 142 | — |
| `@codemirror/language` | 100 | — |
| `@lucide/svelte` | 99 | — |
| `@codemirror/autocomplete` | 88 | — |
| `@lezer/markdown` | 85 | — |
| `@codemirror/commands` | 82 | — |
| `@lezer/common` | 81 | — |
| **`@lezer/javascript`** | **79** | **2.7%** |
| `dompurify` | 74 | — |
| `@lezer/lr` | 70 | — |
| `@codemirror/search` | 48 | — |
| `@replit/codemirror-minimap` | 45 | — |
| `@codemirror/lint` | 36 | — |
| `@lezer/highlight` | 29 | — |
| **`@codemirror/lang-html`** | **25** | — |
| `@tauri-apps/api` | 24 | — |
| `@codemirror/lang-markdown` | 21 | — |
| **`@lezer/html`** | **20** | — |
| **`@codemirror/lang-javascript`** | **20** | — |
| **`@lezer/css`** | **18** | — |
| **`@codemirror/lang-css`** | **16** | — |

**Critical sub-finding.** The HTML/JS/CSS language packages above are *not* imported by app code. A grep for `lang-html|lang-javascript|lang-css|@lezer/javascript|@lezer/html|@lezer/css` across `src/` returns **zero matches**. They are pulled in transitively by `@codemirror/lang-markdown`, whose package.json declares `@codemirror/lang-html` as a hard dependency (it needs it for fenced-code-block parsing). So roughly 79 KB of lezer sources ride along unavoidably — that cost is not addressable without forking or patching `@codemirror/lang-markdown`, and is out of scope.

### Eager code that should not be

| Finding | Evidence |
|---|---|
| `@replit/codemirror-minimap` statically imported; runtime-gated by Compartment, default off | `src/components/editor/codemirror.ts:11`; gate at `codemirror.ts:248`, compartment at `codemirror.ts:74` |
| `@replit/codemirror-vim` statically imported; runtime-gated by Compartment, default off | `src/components/editor/codemirror.ts:28`; compartment at `codemirror.ts:77`, default off at `crates/markz-config/src/lib.rs:91` |
| ~16 top-level components (all modals/panels) statically imported into the entry | `src/App.svelte:6-30` |
| highlight.js imported as the **full** bundle, all ~190 languages | `src/components/preview/syntaxHighlighter.ts:7`; theme CSS at `syntaxHighlighter.ts:22-25` |
| `docxPrep` statically imports mermaid + katex, duplicating the memoized renderers' copies | `src/lib/docxPrep.ts:1-4` vs `src/components/preview/mathRenderer.ts:8` and `src/components/preview/mermaidRenderer.ts:14` |

`docxPrep` itself is reached only via `await import("../../lib/docxPrep")` at `src/components/layout/TitleBar.svelte:193`, so it lands in its own 19 KB chunk — the duplication is contained to that chunk rather than the entry, but mermaid and katex are still pulled twice in total.

### Dead weight

- `codemirror` ^6.0.1 (`package.json:34`) and `@tauri-apps/plugin-fs` ^2.0.0 (`package.json:31`) are declared but have **zero imports** anywhere in `src/` or `e2e/`. `codemirror` is a metapackage that shadows nothing but misleads anyone auditing the dependency list.
- The `$lib` alias (`vite.config.ts:9-11`, `tsconfig.json:18`) is never used — zero `$lib/` imports.

### Rust side

- **ZERO Cargo features exist anywhere in the workspace.** No `[features]` table in any of the 7 manifests, no `#[cfg(feature = ...)]` anywhere. All conditional compilation is target-based only: `#[cfg(windows)]`, `#[cfg(desktop)]`, `#[cfg(target_os)]`, `#[cfg(test)]`. This is greenfield.
- 49 Tauri commands in a single `generate_handler!` at `src-tauri/src/lib.rs:303-354`. Per-module counts: documents 9, workspace 8, convert 6, templates 5, watcher 4, backlinks 3, pandoc 3, session 3, git 2, settings 2, tts 2, app 1, logging 1, presentation 1.
- Always-on heavy deps, in every build regardless of settings: `git2` 0.20 (`src-tauri/src/commands/git.rs`; declared `src-tauri/Cargo.toml:44` — bundles `libgit2-sys`, compiles vendored C), `notify` 7 (`src-tauri/src/commands/watcher.rs`; declared `src-tauri/Cargo.toml:42`), `ureq` 3 native-tls + `tungstenite` 0.29 + `sha2` + `uuid` for Edge TTS (`src-tauri/src/edge_tts_crate.rs`; declared `src-tauri/Cargo.toml:29-32`), `docx-rs` 0.4 and `image` 0.25 in `markz-convert`.
- **In-repo precedent to follow:** `crates/markz-convert/Cargo.toml:17` is the only manifest that already trims a dep's feature set — `image = { version = "0.25", default-features = false, features = ["png","jpeg","gif","bmp","tiff"] }`. The pattern and the tolerance for it already exist in the codebase.

### Runtime and startup

- `src/App.svelte:374-440` `finishStartup()` is strictly sequential: loadSettings → getSession → restoreSession → take_pending_open → openDocumentByPath → fire-and-forget loadWorkspace → watch_open_files. The splash is removed in a `finally` block (`src/App.svelte:434-438`), so directory scans never block first paint.
- The app already self-instruments each of those steps into `debugLogStore` with per-step timings (`src/App.svelte:381`, `src/App.svelte:431`). **That is the built-in measurement hook** — use it rather than adding new telemetry.
- `src/components/preview/PreviewPane.svelte:695-698`: `onMount` calls `checkPandoc()` (`PreviewPane.svelte:680-684`), which spawns `pandoc --version` over IPC (`pandoc_available`) on **every** preview mount, and again on every `markz:settings-changed` event.

### Pre-existing security debt (flagged, not in scope)

- `src-tauri/tauri.conf.json:37-40` defines an inline capability granting `core:default`, `dialog:default`, `updater:default`, while `src-tauri/capabilities/default.json:8-10` grants only `core:default`. Two competing defaults; the file-based one is a strict subset. Note the architectural plan (`docs/MarkZ_Architectural_Plan.md:280-284`) lists `dialog` and `updater` as shipped plugins, so the inline set is the intended one and the file is the stale duplicate — but resolve it deliberately, not by deletion.
- `src-tauri/tauri.conf.json:29` sets `csp = null`. This matters for §6: any plugin-style architecture inherits a CSP-less webview.

---

## 2. Cost model

Conflating these three axes is the main planning error. A change can be a large win on one and zero on the others.

| Axis | What it is | What it hurts | Which features are on it |
|---|---|---|---|
| **1. Eager cost** | Bytes parsed and compiled on every cold start. **Only the entry chunk counts.** | Startup time | vim, minimap, modal components, app code, CodeMirror core |
| **2. Resident cost** | Heap retained *after* the lazy chunk has loaded. KaTeX, mermaid, and hljs stay resident once loaded. | RAM for the session | highlight.js, mermaid, KaTeX |
| **3. Disk / binary cost** | Installer size and Rust binary size. | Download and install; compile time for the Rust side | highlight.js (disk), git2 / notify / tungstenite / docx-rs (binary) |

Two consequences drive the entire recommendation:

- **An already-lazy feature costs nothing at startup.** KaTeX (255 KB) and mermaid (578 KB) are behind `import()`; they cost disk and, once used, RAM. Making them "optional" saves only the disk axis and the rare resident cost. It buys nothing on axis 1.
- **An eager feature costs startup even when disabled.** vim (314 KB source) and minimap (45 KB source) are in the entry chunk whether or not the user turns them on. Their default is OFF (`markz-config:73`, `markz-config:91`), so the default user pays for them. This is the asymmetry worth exploiting.

Rule of thumb for triage: **fix eager first, resident second, disk third** — except where a feature is pure-disk (highlight.js, Rust deps), where the ordering inverts because there is no eager cost to recover.

---

## 3. Tier 1 — Zero-risk wins

Already measured via A/B builds that stubbed the dependency and rebuilt (method in [Appendix A](#appendix-a--measurement-method)).

| Change | Eager entry delta (raw) | Eager entry delta (gzip) | Total dist delta |
|---|---|---|---|
| Remove `@replit/codemirror-vim` from eager graph | **−124 KB** | **−39 KB** | −0.12 MB |
| Remove `@replit/codemirror-minimap` from eager graph | **−16 KB** | **−5 KB** | −0.01 MB |
| Both | **−143 KB** | **−45 KB** | −0.14 MB |
| highlight.js: full bundle → `lib/common` (36 langs) | 0 (already lazy) | 0 | **−0.77 MB** (947K→159K raw, 301K→52K gz) |
| highlight.js: full bundle → `lib/core` + 10 explicit langs | 0 (already lazy) | 0 | **−0.86 MB** (947K→68K raw, 301K→22K gz) |

**Key insight: vim is the single biggest eager win, and it defaults OFF.** 10.7% of the entry's source weight for a feature most users never enable.

**Caveat, stated plainly.** The vim and minimap A/B builds used stub modules, so **−124 KB / −16 KB are upper bounds** on the win. A real dynamic-import refactor *relocates* the code to a lazy chunk rather than deleting it. The realistic eager saving carries over unchanged (the code is no longer in the entry), but total dist size stays roughly flat rather than shrinking. Do not book the dist-side figure as a permanent reduction.

**highlight.js trade-off, stated plainly.** `lib/common` covers 36 common languages and keeps an unregistered language highlighting correctly. `lib/core` + an explicit 10-language list is the smallest option, but **any language you forget renders unhighlighted** — a silent, content-dependent regression that no existing test will catch. Recommendation: **`lib/common` as the default**, plus per-language lazy registration for the long tail (register a language on first sighting, from a static map of `hljs/lib/languages/*`). That gets most of the `lib/core` win without the correctness cliff. The `lib/common` figure is a different kind of win from the vim figure: it is real subsetting, and it reduces disk **and** resident memory.

---

## 4. Tier 2 — Runtime-gated features

Each of these already has a `Settings` field or a natural gate. The work is to make the *loading* conditional, not to invent a new flag.

| Target | Gate that already exists | Change |
|---|---|---|
| **Vim** | `vim_mode` default false (`markz-config:91`); Compartment at `codemirror.ts:77`; `setVimMode` at `codemirror.ts:410-413` | `import()` `@replit/codemirror-vim` on first enable. **Keep the Compartment** so subsequent toggles stay instant after the first load. The first enable becomes async — surface that in the settings toggle rather than letting it silently no-op. |
| **Minimap** | `show_minimap` default false (`markz-config:73`); Compartment at `codemirror.ts:74`; wired at `codemirror.ts:248` | Same pattern. |
| **Modal/overlay components** | None needed — they are closed by default | `PresentationMode.svelte` (only used on F5, imported at `src/App.svelte:12`), `GitDiffModal` (`:11`), `SettingsModal` (`:16`), `TemplateBrowser` (`:17`), `SaveTemplateDialog` (`:18`), `SearchPanel` (`:19`), `DebugPanel` (`:20`), `CommandPalette` (`:27`). Together these are the bulk of the static import list at `src/App.svelte:6-30`. **Modal/overlay components are the ideal lazy targets** because their cost when closed is zero, and the closed state is the default state. |
| **Pandoc probe** | `pandoc_path` default `None` (`markz-config:87`) | Move `checkPandoc()` off `onMount`. Probe when the user opens an export menu, or when the export section of Settings becomes visible. Today it spawns a subprocess on every preview mount (`PreviewPane.svelte:695-698`) and again on every `markz:settings-changed` event. |
| **TTS** | `tts_engine` default `"online"` (`markz-config:83`) | This is a **binary-size** concern, not a runtime one: the Edge TTS code (`src-tauri/src/edge_tts_crate.rs`) only executes when TTS is invoked, so it costs nothing at startup. The dep weight is `tungstenite` + `ureq` + `sha2` + `uuid` (`src-tauri/Cargo.toml:29-32`) in every binary. Address via Cargo features (§5), not runtime gating. |
| **docxPrep duplication** | None needed | `docxPrep.ts:1-4` statically imports mermaid, katex, katex CSS, and html-to-image. Convert the mermaid/katex paths to reuse the memoized renderers at `mathRenderer.ts:8` and `mermaidRenderer.ts:14` so the two libraries are not pulled twice. |

---

## 5. Tier 3 — Compile-time feature flags

Greenfield. The workspace has no `[features]` table anywhere and no `#[cfg(feature = ...)]` anywhere.

### The pattern, precisely

1. Add a `[features]` table to `src-tauri/Cargo.toml` and to the affected `crates/*/Cargo.toml` manifests.
2. Mark heavy dependencies `optional = true`, and wire each to a feature: `git2 = { version = "0.20", optional = true }`, plus `[features] git = ["dep:git2"]`.
3. Mark the corresponding module declarations and the `generate_handler!` entries `#[cfg(feature = "git")]` — the handler list is a single macro invocation at `src-tauri/src/lib.rs:303-354`, so this is mechanical, but it touches 49 command registrations' worth of module wiring.
4. Set `default = [...]` to include all features, so every normal build is byte-for-byte behaviourally identical to today.
5. Follow the existing in-repo precedent for dep trimming: `crates/markz-convert/Cargo.toml:17`.

### Proposed initial feature set

| Feature | Gates | Drops |
|---|---|---|
| `tts` | `src-tauri/src/edge_tts_crate.rs`, `commands/tts.rs` | `tungstenite`, `sha2`, `uuid`, app-level `ureq` |
| `git` | `commands/git.rs` | `git2` + the vendored `libgit2-sys` C build |
| `watcher` | `commands/watcher.rs` | `notify` |
| `docx` | `markz-convert` docx-rs, `export_to_docx` | `docx-rs` |
| `remote-images` | `ureq` in `markz-convert`; gates `embed_remote_images` (default already false, `markz-config:77`) | `ureq` + native-tls |
| `pandoc` | `commands/pandoc.rs` | — (gates code, not a dep) |

### Release-process decision, and the recommendation

**Cargo features change the shipped artifact.** This needs an explicit decision before any of it is written: one binary with everything, or a second `markz-slim` artifact?

**Recommendation: keep ONE default build with all features.** Add a `minimal` feature set and document `--no-default-features --features minimal` for anyone who wants it, but do not ship two binaries. Reasons:

- No user-facing loss, no support matrix explosion, no "works in slim, not in full" bug reports.
- The flags still earn their keep as **code hygiene** — they make the heavy-dependency surface explicit and documented instead of implicit — and as a **future-distribution** mechanism if that day ever comes.
- **Be honest about what this actually buys:** for a desktop app shipped as one installer, compile-time features mainly help **binary size** and **compile time**, not runtime RAM. The Rust code is resident either way once linked into the binary. The runtime win here is zero.

Where it *is* a real win: `git2` 0.20's vendored `libgit2-sys` C build is the single biggest compile-time cost in the workspace, so `--no-default-features` is meaningful for anyone building from source.

---

## 6. Explicitly NOT worth plugin-ifying

This section exists to prevent wasted work. Each item below was measured and rejected.

| Subsystem | Why not | Evidence |
|---|---|---|
| **KaTeX** | Already lazy, so it costs nothing at startup. Making it "optional" saves only the disk axis. Math in technical docs is core content. | `mathRenderer.ts:8`; 255 KB raw / 75 KB gz |
| **Mermaid** | Already lazy, and the 34 per-diagram chunks are already split — `$def.mermaid` / diagram-specific loading is already optimal. Mermaid diagrams are core to the "engineer" positioning. | `mermaidRenderer.ts:14`; `mermaid.core` 578 KB / 134 KB gz + ~34 dynamic chunks |
| **Converters (JIRA / Confluence / Slack / GitHub)** | These *are* the product's reason to exist. They are AST-first, and heavily tested. Making them optional would gut the value proposition for a few hundred KB of binary and essentially zero runtime cost — they are pure Rust functions behind a thin command. | `README.md:61-69`; `crates/markz-convert/tests/integration.rs` (55 tests) |
| **A general user-facing plugin system** | Already rejected in the roadmap, and that call is correct. A plugin system adds a stable API surface, a compatibility matrix, a sandbox/security story (note `csp = null` at `tauri.conf.json:29` today), and a documentation burden — **all for zero performance benefit**, because the performance problem here is chunk boundaries and dep feature sets, neither of which a plugin API addresses. | `ROADMAP.md:280` ("Architecture not ready; user base too small") |
| **Preview rendering core / `pulldown-cmark`** | Core. Not optional. | `MarkZ_Architectural_Plan.md:134-156` |
| **Spellcheck** | Default ON and small; an always-wanted editor feature. Gating it would add a flag for a few KB. Low value. | `markz-config:88` |

**The load-bearing distinction:** internal feature flags are **not** a plugin system. A plugin system is a stable, documented, versioned extension point for third parties. Feature flags are an internal build- and load-time mechanism with no API surface, no compatibility promise, and no security boundary. Confusing the two is what makes "plugin-ify" a red herring here: every win in this document comes from dynamic `import()`, dependency subsetting, and Cargo features — **none of which require a plugin architecture.** The engineer positioning that §6 protects is also the reason the converter rejections are not negotiable.

The one legitimate residue is `ROADMAP.md:253-257` ("converters, templates, and snippets load from a well-defined plugin interface"). That is a **code-organisation** goal — putting converters, templates, and snippets behind a common internal interface so the set is enumerable and replaceable. It is worth doing on maintainability grounds, and it is worth doing separately from and after the performance work in §7. It should not be bundled with the perf work, because bundling it makes a small, safe, high-value change look large and risky, and it would be the one most likely to stall.

---

## 7. Recommended sequencing

Ordered by value/risk ratio. Every flag added here must default to **current** behaviour.

| # | Work | Why | Effort | Risk | Measurable win |
|---|---|---|---|---|---|
| 1 | highlight.js full bundle → `lib/common` (`syntaxHighlighter.ts:7`), plus per-language lazy registration for the long tail | Highest value/risk ratio in the document. One-line import change, no runtime gate, real disk *and* resident saving | S | Low | **−0.77 MB** dist; 301 KB gz → 52 KB gz |
| 2 | Drop unused deps `codemirror` and `@tauri-apps/plugin-fs` from `package.json` (`package.json:34`, `package.json:31`) | Zero imports in `src/` or `e2e/`. Cuts install time and `node_modules`, and removes a misleading metapackage from the audit surface | S | Low | install time, `node_modules` size |
| 3 | Lazy-load the modal/overlay components listed in §4 (`src/App.svelte:6-30`) | Zero cost when closed, and closed is the default. Includes `PresentationMode` (F5-only) | S–M | Medium | **Unmeasured** — expected to be material given these are 16 of the entry's top-level components. Measure with the `debugLogStore` startup timings already in `src/App.svelte:381` |
| 4 | Lazy-load vim + minimap via the existing Compartments (`codemirror.ts:11`, `codemirror.ts:28`) | Measured, and vim is the single biggest eager item at 10.7% of entry source weight while defaulting OFF | M | Medium | **−143 KB** eager / **−45 KB** gzip (measured upper bound; total dist roughly flat) |
| 5 | Fix the docxPrep double-import of mermaid + katex (`docxPrep.ts:1-4`) | Removes a genuine duplication; small and self-contained | S | Low | Code dedup; smaller docxPrep chunk |
| 6 | Gate the pandoc probe behind actual export-UI interaction (`PreviewPane.svelte:695-698`) | Stops spawning `pandoc --version` on every preview mount and every settings change | S | Low | One fewer subprocess per preview mount |
| 7 | Introduce Cargo `[features]` (§5) | Binary size and compile time. Touches the most code for the smallest user-visible payoff | L | Medium | Binary size + compile time only. **Do this LAST** |
| 8 | Optional: add `manualChunks` to `vite.config.ts` | Makes the entry/lazy boundary explicit and silences the ~500 KB chunk-size warnings | S | Low | Build-output clarity, not performance |

Items 1–6 are independent and can proceed in parallel across owners. Item 7 must follow them, because it touches `generate_handler!` and will conflict with any concurrent work in `src-tauri/`.

### Outcome (shipped in v0.8.78)

Items 1–7 were all implemented and verified. Measured on the release build: entry chunk **1067 kB → 862 kB** raw (356 kB → 294 kB gzip), total frontend **6.17 MB → 5.79 MB**. Verification: 286/286 Playwright tests, 98/98 vitest, 278 Rust tests, and `cargo check -p markz --no-default-features` clean.

Item 8 (`manualChunks`) was **deliberately not done.** The remaining >500 kB warnings all come from mermaid's own diagram chunks (25 of them, plus `wardley` and `cytoscape`), which are already lazy and already split per diagram. `manualChunks` would rename and regroup them without moving a single byte out of the entry chunk, so it would trade a real, if noisy, build message for churn across the chunk graph and no user-visible gain. Revisit only if the warnings themselves start costing something.

The unmeasured item 3 win is now measured: making the seven overlays lazy is part of the 205 kB raw entry reduction above, alongside vim and minimap.

---

## 8. Risks and test constraints

- **`e2e/tauri-mock.ts` can fail silently.** It is 1647 lines and stubs every IPC command by name, with two near-duplicate response maps (~L575-908 and ~L1360-1586). Removing a command requires updating it, and an unhandled command only logs `console.warn("[E2E Mock] Unhandled command")`. **A removed command may therefore fail silently in e2e rather than loudly.** Every command removed in §5 needs a matching, deliberate edit here.
- **`e2e/app.spec.ts:308-311` asserts ZERO console errors on startup.** A lazy-load that throws, or a component that logs, fails this. Every lazy component in §4 item 3 must have its dynamic import wired so that no error surfaces before first interaction — including a deliberate pre-`import` failure path that stays silent.
- **Verified test counts:** 17 e2e spec files / **286** Playwright tests, and 11 vitest files / **98** unit tests (measured via `npx playwright test --list` and `npx vitest run`). The heaviest areas are workspace (`e2e/workspace.spec.ts`), app shell (35, `e2e/app.spec.ts`), editor (22, `e2e/editor.spec.ts`), and workspace-tree (11). Anything lazy-loaded in these paths must have its flag default to **current** behaviour.
- **`src/lib/docxPrep.test.ts` (9 tests) statically imports `docxPrep`.** Any change to that module's import shape in §7 item 5 must keep it importable **synchronously** for vitest — otherwise the fix silently converts the module to dynamic-only and the unit tests stop resolving the symbol.
- **310 transitive Rust crates in `Cargo.lock`.** The heavy ones: `libgit2-sys`, `openssl-sys`, `regex`, `image`, `docx-rs`, `git2`, `notify`. Any Cargo feature work has a large blast radius in `Cargo.lock` churn even when the code change is small.
- **Security debt, flagged not fixed:** the capability conflict between `tauri.conf.json:37-40` and `capabilities/default.json:8-10`, and `csp = null` at `tauri.conf.json:29`. Both are pre-existing and out of scope for this work — but §6 is the wrong place to build a plugin system until the CSP is set.

### CI gap — fix this first

`.github/workflows/ci.yml` runs `cargo test --workspace` (on ubuntu + windows) and `npx playwright test`, but the `test-frontend` job runs **only** `npm run build` (ci.yml:54). **All 98 vitest unit tests are therefore never executed in CI.** Compounding it, `package.json` has no `test` or `test:unit` script at all, so vitest can only be invoked manually as `npx vitest`.

Consequence: every refactor in §7 is verified by e2e alone until this is fixed, and the docxPrep unit tests in particular would never run. **Add a vitest step to `test-frontend` and a `test:unit` script as a prerequisite for trusting any of this work.** It is a smaller, higher-leverage change than anything in §7.

---

## Appendix A — Measurement method

Reproducible; all scaffolding was removed afterward and the repo was left clean.

1. **Baseline.** `npx vite build` on the repo at v0.8.77. Entry `index-CQIytqKV.js`, **1042 KB raw / 345 KB gzip**. Total `dist/`: **56 JS + 59 font files, 6.17 MB**.
2. **Chunk graph.** Enumerated every `dist-perf/assets/*.js` and extracted its `import("./…")` and `from"./…"` references. Result: the entry has **0** static `from` refs and exactly **4** dynamic `import()` targets; all mermaid diagram chunks are dynamic children of `mermaid.core`.
3. **Entry composition.** Built with `--sourcemap`, then aggregated `sourcesContent` lengths per `node_modules` package to attribute the entry across its 240 contributing source files. **Caveat:** the map's `mappings` field in this build is index-only, so byte-exact attribution was not possible. `sourcesContent` length is a **proportional proxy**, and the A/B builds in step 4 are the authoritative numbers — treat the §1 composition table as a ranking of contributors, not a byte ledger.
4. **A/B.** A throwaway Vite config aliased individual deps to tiny stub modules (created outside the repo, in a temp dir) and rebuilt. Entry size was read from the `<script>` tag in each build's `index.html` — **not** by "largest `index-*.js`", which misidentifies the entry whenever the highlight.js chunk is also named `index-*`. All scaffolding and stub directories were deleted afterward.
5. **Interpretation caveat.** The A/B used stubs, so each delta is the **maximum** attributable saving for that dependency. A production dynamic-import refactor relocates code to a lazy chunk rather than deleting it: **eager savings carry over, total dist size stays roughly flat.** The highlight.js figures are different in kind — they are real subsetting wins that reduce both disk and resident memory.
