# LLM-Powered Features Assessment

> **Date:** 2026-05-31  
> **Scope:** Evaluate local, offline LLM integration for a markdown editor targeting engineers.  
> **Constraint:** Must respect offline-first, zero-telemetry design philosophy.

---

## 1. Executive Summary

Small local models (2–4B parameters) can meaningfully enhance a markdown editor **without** compromising the offline-first ethos. The sweet spot is **assistance, not replacement** — the user writes; the LLM suggests, polishes, and accelerates.

**Recommended approach:** Two-tier integration:
1. **Tier 1 (Immediate):** Ollama auto-detection — zero bundle bloat, user-controlled, fully offline.
2. **Tier 2 (Future):** Optional bundled tiny model (Gemma 4 2B or Qwen3 1.7B) via `candle` in Rust — ~2GB download, true offline guarantee.

**Avoid:** Cloud APIs (violates zero-telemetry), large models (>7B — too slow on CPU), anything that feels like "AI wrote this for you."

---

## 2. Model Landscape (Local-First)

| Model | Params | Size (Q4_K_M) | Speed* | Strengths | Weaknesses |
|-------|--------|---------------|--------|-----------|------------|
| **Gemma 4 2B** | 2B | ~1.4 GB | 25–40 tok/s | Fast, safe, Google-aligned | Less creative, shorter context |
| **Qwen3 1.7B/4B** | 1.7–4B | ~1.1–2.5 GB | 30–50 tok/s | Multilingual, great coding | English nuance slightly weaker |
| **Phi-4-mini** | 3.8B | ~2.2 GB | 20–35 tok/s | Excellent reasoning, Microsoft | Slightly slower, newer ecosystem |
| **Llama 3.2 1B/3B** | 1–3B | ~0.7–2.0 GB | 35–55 tok/s | Mature, broad support | 1B is too weak; 3B is good |
| **DeepSeek-R1-Distill-Qwen 1.5B/7B** | 1.5–7B | ~1.0–4.5 GB | 25–40 tok/s | Chain-of-thought reasoning | 1.5B is weak; 7B is slow on CPU |
| **SmolLM2 1.7B** | 1.7B | ~1.0 GB | 40–60 tok/s | Ultra-fast, tiny | Weaker prose quality |

*Speed on modern laptop CPU (Ryzen 9 / Intel i7), 8 threads, Q4_K_M quantization.

**Recommendation for bundled model:** **Qwen3 4B** or **Gemma 4 2B**. Both are fast enough for interactive use, small enough to bundle as an optional download, and competent at the tasks we need (rewriting, summarizing, expanding outlines).

---

## 3. Integration Architecture

### Option A: Ollama Auto-Detection (Recommended First)

```
[App] ──HTTP──► [Ollama localhost:11434] ──► [User's chosen model]
```

**Pros:**
- Zero binary bloat — app stays ~5MB.
- User controls model, temperature, context length.
- Works with any GGUF model the user has installed.
- Fully offline if Ollama is local.

**Cons:**
- Requires separate Ollama installation.
- Not "batteries included" — out-of-box experience lacks LLM features.

**Implementation:**
- Probe `http://localhost:11434/api/tags` on startup.
- If available, show LLM features in UI.
- Use `POST /api/generate` with streaming for real-time suggestions.
- Cache last-used model name in settings.

### Option B: Bundled Model via `candle` (Rust)

```
[App] ──Rust IPC──► [candle runtime] ──► [Bundled GGUF weights]
```

**Pros:**
- True offline guarantee — no external dependencies.
- Unified with existing Rust-first architecture.
- Can use GPU via CUDA/Metal if available.

**Cons:**
- Adds ~1.5–2.5GB to installer/download size.
- `candle` GGUF support is newer than `llama.cpp` (Ollama's backend).
- Build complexity — cross-compiling with CUDA/Metal is non-trivial.

**Implementation:**
- Add `candle-core`, `candle-nn`, `candle-transformers` to workspace.
- Download model weights on first run (or bundle them).
- Expose Tauri command: `generate_text(prompt, max_tokens, temperature)`.

### Option C: WebGPU in Frontend (Not Recommended)

- ONNX Runtime Web or WebLLM in the WebView.
- WebGPU support is spotty across platforms and WebView versions.
- Larger memory footprint in renderer process.
- **Verdict:** Too fragile for a production desktop app.

### Hybrid Recommendation

```
Phase 1: Ollama integration (1–2 days)
  └─ Probe, chat, rewrite, summarize
  
Phase 2: Bundled model as fallback (1 week)
  └─ candle-based runtime
  └─ Download-on-demand weights
  
Phase 3: Model-agnostic abstraction (2 days)
  └─ Unified "LLM provider" interface
  └─ Ollama | candle | future providers
```

---

## 4. Feature Candidates (Prioritized)

### P0 — High Impact, Low Complexity

#### 4.1 Inline Rewrite / Rephrase
**What:** Select text → right-click → "Rewrite as…" (concise, formal, technical, casual).
**Prompt:** `Rewrite the following text to be more {style}. Keep the meaning identical. Output only the rewritten text, no preamble:\n\n{text}`
**UI:** Inline diff view (like Git diff) showing original → proposed.
**Model size needed:** 2B+ (Gemma 2B handles this well).
**Value:** Engineers rewrite docs constantly. This saves minutes per session.

#### 4.2 Continue Writing
**What:** Cursor at end of paragraph → `Ctrl+Shift+Space` → LLM suggests continuation.
**Prompt:** `Continue the following markdown document. Maintain the same style, tone, and formatting. Output only the continuation, no preamble:\n\n{context}`
**UI:** Ghost text (gray, italic) after cursor. Tab to accept, Esc to dismiss.
**Model size needed:** 2B+.
**Value:** Breaks writer's block. Especially useful for RFCs/ADRs where you know what to say but not how.

#### 4.3 Expand Outline
**What:** Select bullet/outline → "Expand to prose."
**Prompt:** `Expand the following outline into full prose paragraphs. Maintain markdown formatting. Output only the expanded text:\n\n{outline}`
**UI:** Replace selection or insert below.
**Model size needed:** 3B+ (needs coherence across multiple paragraphs).
**Value:** Turn meeting notes into formal docs instantly.

#### 4.4 Summarize Selection / Document
**What:** Select text → "Summarize" or status bar button for whole doc.
**Prompt:** `Summarize the following text in 2–3 sentences. Output only the summary:\n\n{text}`
**UI:** Inline ghost text below selection, or copy to clipboard.
**Model size needed:** 2B+.
**Value:** Quick TL;DRs for long docs, PR descriptions from commit messages.

### P1 — Medium Impact, Medium Complexity

#### 4.5 Smart Title Generation
**What:** Analyze document content → suggest titles.
**Prompt:** `Suggest 3 concise, descriptive titles for the following markdown document. Output one per line:\n\n{doc}`
**UI:** Small dropdown in title bar or tab tooltip.
**Model size needed:** 2B+.

#### 4.6 Generate Code Block
**What:** Type ```` ```rust // fibonacci ```` → LLM fills the code block.
**Prompt:** `Write a {language} code block that implements: {description}. Output only the code inside the block, no markdown fences:\n\n{description}`
**UI:** Auto-trigger inside code fence comments, or explicit command.
**Model size needed:** 3B+ (coding quality matters).

#### 4.7 Fix Grammar / Style
**What:** Beyond spellcheck — detect awkward phrasing, passive voice, inconsistent tense.
**Prompt:** `Review the following text for grammar, style, and clarity issues. List each issue with a suggested fix. Format: "Issue: ... Suggestion: ..."\n\n{text}`
**UI:** Inline diagnostics (like lint) with quick-fix buttons.
**Model size needed:** 3B+.

#### 4.8 Auto-Generate Alt Text
**What:** On image paste/drop, suggest `alt` text.
**Prompt:** `Describe this image in one concise sentence suitable as markdown alt text.` (Requires vision model — see §6)
**UI:** Pre-fill alt text field in image paste dialog.
**Value:** Accessibility compliance with zero effort.

#### 4.9 Link Suggestion
**What:** Detect unlinked terms that match existing WikiLinks or headings → suggest links.
**Prompt:** `Given the following document and a list of available wiki pages, suggest which terms should be turned into [[WikiLinks]]. Output as a JSON array of {term, target}:\n\nDoc: {doc}\nPages: {pages}`
**UI:** Underline suggestions, `Ctrl+.` to accept.
**Model size needed:** 2B+.

#### 4.10 Table Generation
**What:** Type "Create a table comparing Rust and Go" → generates markdown table.
**Prompt:** `Generate a markdown table for: {description}. Output only the markdown table, no preamble.`
**UI:** Command palette action or inline command.
**Model size needed:** 2B+.

### P2 — Nice to Have, Higher Complexity

#### 4.11 Document Review / Checklist
**What:** "Review this RFC" → checks for missing sections, unclear requirements, TODOs without owners.
**Prompt:** `Review the following RFC/ADR document. Identify: (1) missing standard sections, (2) unclear requirements, (3) TODOs without assignees, (4) undefined acronyms. Output a structured checklist.`
**UI:** Modal with checklist, click to jump to line.
**Model size needed:** 4B+.

#### 4.12 Translation
**What:** Translate selection or document to another language.
**Prompt:** `Translate the following markdown to {language}. Preserve all markdown formatting, code blocks, and frontmatter. Output only the translated text:`
**UI:** "Copy as Translated" in Copy dropdown.
**Model size needed:** 4B+ (Qwen3 excels here).

#### 4.13 Smart Snippet Expansion
**What:** Type `rfc` → LLM expands into a full RFC template *pre-filled* with inferred context (author from Git, date, title from H1).
**Prompt:** `Generate an RFC template pre-filled with: title={title}, author={author}, date={date}. Use the standard RFC format.`
**UI:** Same snippet system, but LLM-enhanced.

#### 4.14 Meeting Notes → Action Items
**What:** Paste raw meeting notes → extract action items with owners and deadlines.
**Prompt:** `Extract action items from the following meeting notes. Format as markdown checklist with assignee and due date if mentioned:\n\n{notes}`
**UI:** New document or insert at cursor.

---

## 5. UI Integration Points

| Feature | Trigger | UI Location | Visual Treatment |
|---------|---------|-------------|-----------------|
| Continue Writing | `Ctrl+Shift+Space` | Inline ghost text | Gray italic, Tab to accept |
| Rewrite | Right-click selection | Context menu → submenu | Inline diff (green/red) |
| Summarize | `Ctrl+Shift+S` or status bar | Modal or inline below | Collapsible blockquote |
| Expand Outline | `Ctrl+Shift+E` | Replace selection | Flash animation on insert |
| Title Suggest | `Ctrl+Shift+T` | Dropdown under title bar | 3 options, arrow keys |
| Code Gen | Inside ` ```lang // desc` | Auto-trigger on Enter | Gray ghost code |
| Grammar Fix | Real-time or `F8` | Inline diagnostic | Yellow squiggle + lightbulb |
| Alt Text | On image paste | Pre-filled input field | Suggested text highlighted |
| Link Suggest | Real-time | Underline + tooltip | Dashed blue underline |
| Table Gen | Command palette | Insert at cursor | Flash + auto-focus first cell |
| Doc Review | Command palette | Side panel (like outline) | Checklist with line links |
| Translation | Copy dropdown | Modal with language select | Side-by-side preview |

**Key UX principle:** LLM suggestions should feel like **smart autocomplete**, not a chatbot. No sidebar chat panel. No modal dialogs for simple actions. Inline, contextual, dismissible.

---

## 6. Vision Models (Future Consideration)

Alt text generation requires a **vision-language model** (VLM). Options:

| Model | Size | Notes |
|-------|------|-------|
| **LLaVA-Phi-3** | 4B | Small VLM, runs on CPU. Quality is mediocre. |
| **Moondream2** | 1.6B | Tiny, fast. Good enough for simple alt text. |
| **Qwen2-VL 2B** | 2B | Excellent quality for size. Requires transformers. |

**Verdict:** Defer. VLM integration is significantly more complex (image encoding, larger model) and the ROI is lower than text-only features. Revisit in Phase 5+.

---

## 7. Technical Implementation Plan

### Phase 1: Ollama Integration (2–3 days)

```rust
// src-tauri/src/commands/llm.rs
#[tauri::command]
pub async fn llm_generate(
    prompt: String,
    model: Option<String>,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
) -> Result<String, String> {
    // Call Ollama HTTP API
}

#[tauri::command]
pub async fn llm_available() -> Result<Vec<String>, String> {
    // List installed models
}
```

```typescript
// src/lib/llm.ts
export async function generate(prompt: string, options?: LlmOptions): Promise<string>;
export async function listModels(): Promise<string[]>;
export async function isLlmAvailable(): Promise<boolean>;
```

- Add "AI Assistant" settings section: model selection, temperature, max tokens.
- Add `llm:generate` command palette entry.
- Implement inline ghost text using CodeMirror's `showTooltip` or custom decoration.
- Implement inline diff view for rewrites.

### Phase 2: Core Features (3–5 days)

- Continue Writing (ghost text)
- Rewrite / Rephrase (context menu + inline diff)
- Summarize (command palette + status bar)
- Expand Outline (command palette)

### Phase 3: Polish (2–3 days)

- Title suggestion
- Code block generation
- Grammar/style check
- Table generation
- All with proper E2E tests

### Phase 4: Bundled Model (1 week, deferred)

- Integrate `candle` for standalone runtime.
- Download model weights on first use.
- Fallback to Ollama if available and user prefers it.

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Ollama not installed → features silently missing | High | Medium | Clear "Enable AI" prompt with install link; don't hide features entirely |
| Slow generation on CPU → poor UX | Medium | High | Streaming response (token-by-token); cancel button; timeout (10s) |
| Hallucinated rewrites → user distrust | Medium | High | Always show diff; never auto-apply; undo works |
| Model bias / safety issues | Low | Medium | Use aligned models (Gemma, Qwen); allow user to review before apply |
| Binary bloat (bundled model) | Medium | High | Make optional download; not bundled in base installer |
| Prompt injection from document content | Low | Medium | Sanitize prompts; use structured templates; never execute generated code |
| Privacy concern (even local models) | Low | Low | Document clearly: "100% local, no data leaves your machine" |

---

## 9. Competitive Positioning

| Tool | LLM Integration | Offline? | Notes |
|------|----------------|----------|-------|
| **Obsidian** | Plugins (Copilot, Smart Connections) | Optional | Requires setup, plugin ecosystem |
| **Notion** | Built-in AI | No | Cloud-only, subscription |
| **Cursor** | Built-in (Claude/GPT) | No | Code editor, not markdown |
| **VS Code + extensions** | Copilot, Continue | No (Copilot) | Heavy IDE, not doc-focused |
| **MarkZ (proposed)** | Local LLM via Ollama | **Yes** | First offline-first doc editor with native LLM |

**Differentiator:** MarkZ would be the **only offline-first markdown editor with built-in LLM assistance**. This is a genuine competitive moat — no other tool in this category offers local AI without plugins or cloud.

---

## 10. Go/No-Go Recommendation

**GO — with Phase 1 (Ollama) only.**

Rationale:
- Low risk: Ollama is mature, no build complexity.
- High value: Even basic rewrite/continue/summarize are daily-use features for engineers.
- Fits brand: "AI that respects your privacy" is a powerful message.
- Incremental: Can ship Phase 1, gather feedback, then decide on bundled model.

**Defer Phase 4 (bundled model)** until user base justifies the binary size and maintenance cost.

---

*End of assessment. Revisit when model landscape changes or user feedback demands deeper integration.*
