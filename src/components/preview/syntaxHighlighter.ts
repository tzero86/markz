import type { HLJSApi, LanguageFn } from "highlight.js";

let hljsPromise: Promise<HLJSApi> | null = null;

async function getHljs(): Promise<HLJSApi> {
  if (!hljsPromise) {
    hljsPromise = import("highlight.js/lib/common").then((m) => m.default ?? (m as unknown as HLJSApi));
  }
  return await hljsPromise;
}

/** `lib/common` carries the 36 languages that dominate real documents. Every
 *  other language is imported the first time a fence asks for it, so the long
 *  tail sits on disk as chunks instead of ~800 KB of always-parsed JavaScript.
 *  These have to be `import()` calls: a static import would put every one of
 *  them in the eager graph, which is the cost this table exists to avoid. */
const LAZY_LANGUAGES: Record<string, () => Promise<{ default: LanguageFn }>> = {
  accesslog: () => import("highlight.js/lib/languages/accesslog"),
  actionscript: () => import("highlight.js/lib/languages/actionscript"),
  ada: () => import("highlight.js/lib/languages/ada"),
  apache: () => import("highlight.js/lib/languages/apache"),
  applescript: () => import("highlight.js/lib/languages/applescript"),
  arduino: () => import("highlight.js/lib/languages/arduino"),
  asciidoc: () => import("highlight.js/lib/languages/asciidoc"),
  aspectj: () => import("highlight.js/lib/languages/aspectj"),
  autohotkey: () => import("highlight.js/lib/languages/autohotkey"),
  autoit: () => import("highlight.js/lib/languages/autoit"),
  awk: () => import("highlight.js/lib/languages/awk"),
  basic: () => import("highlight.js/lib/languages/basic"),
  bnf: () => import("highlight.js/lib/languages/bnf"),
  capnproto: () => import("highlight.js/lib/languages/capnproto"),
  clojure: () => import("highlight.js/lib/languages/clojure"),
  "clojure-repl": () => import("highlight.js/lib/languages/clojure-repl"),
  cmake: () => import("highlight.js/lib/languages/cmake"),
  coffeescript: () => import("highlight.js/lib/languages/coffeescript"),
  coq: () => import("highlight.js/lib/languages/coq"),
  crystal: () => import("highlight.js/lib/languages/crystal"),
  d: () => import("highlight.js/lib/languages/d"),
  dart: () => import("highlight.js/lib/languages/dart"),
  delphi: () => import("highlight.js/lib/languages/delphi"),
  django: () => import("highlight.js/lib/languages/django"),
  dns: () => import("highlight.js/lib/languages/dns"),
  dockerfile: () => import("highlight.js/lib/languages/dockerfile"),
  dos: () => import("highlight.js/lib/languages/dos"),
  ebnf: () => import("highlight.js/lib/languages/ebnf"),
  elixir: () => import("highlight.js/lib/languages/elixir"),
  elm: () => import("highlight.js/lib/languages/elm"),
  erb: () => import("highlight.js/lib/languages/erb"),
  erlang: () => import("highlight.js/lib/languages/erlang"),
  "erlang-repl": () => import("highlight.js/lib/languages/erlang-repl"),
  fortran: () => import("highlight.js/lib/languages/fortran"),
  fsharp: () => import("highlight.js/lib/languages/fsharp"),
  gherkin: () => import("highlight.js/lib/languages/gherkin"),
  glsl: () => import("highlight.js/lib/languages/glsl"),
  gradle: () => import("highlight.js/lib/languages/gradle"),
  groovy: () => import("highlight.js/lib/languages/groovy"),
  haml: () => import("highlight.js/lib/languages/haml"),
  handlebars: () => import("highlight.js/lib/languages/handlebars"),
  haskell: () => import("highlight.js/lib/languages/haskell"),
  haxe: () => import("highlight.js/lib/languages/haxe"),
  http: () => import("highlight.js/lib/languages/http"),
  julia: () => import("highlight.js/lib/languages/julia"),
  "julia-repl": () => import("highlight.js/lib/languages/julia-repl"),
  latex: () => import("highlight.js/lib/languages/latex"),
  lisp: () => import("highlight.js/lib/languages/lisp"),
  livescript: () => import("highlight.js/lib/languages/livescript"),
  llvm: () => import("highlight.js/lib/languages/llvm"),
  mathematica: () => import("highlight.js/lib/languages/mathematica"),
  matlab: () => import("highlight.js/lib/languages/matlab"),
  moonscript: () => import("highlight.js/lib/languages/moonscript"),
  nestedtext: () => import("highlight.js/lib/languages/nestedtext"),
  nginx: () => import("highlight.js/lib/languages/nginx"),
  nim: () => import("highlight.js/lib/languages/nim"),
  nix: () => import("highlight.js/lib/languages/nix"),
  "node-repl": () => import("highlight.js/lib/languages/node-repl"),
  nsis: () => import("highlight.js/lib/languages/nsis"),
  ocaml: () => import("highlight.js/lib/languages/ocaml"),
  openscad: () => import("highlight.js/lib/languages/openscad"),
  pgsql: () => import("highlight.js/lib/languages/pgsql"),
  powershell: () => import("highlight.js/lib/languages/powershell"),
  processing: () => import("highlight.js/lib/languages/processing"),
  profile: () => import("highlight.js/lib/languages/profile"),
  prolog: () => import("highlight.js/lib/languages/prolog"),
  properties: () => import("highlight.js/lib/languages/properties"),
  protobuf: () => import("highlight.js/lib/languages/protobuf"),
  puppet: () => import("highlight.js/lib/languages/puppet"),
  q: () => import("highlight.js/lib/languages/q"),
  qml: () => import("highlight.js/lib/languages/qml"),
  reasonml: () => import("highlight.js/lib/languages/reasonml"),
  routeros: () => import("highlight.js/lib/languages/routeros"),
  sas: () => import("highlight.js/lib/languages/sas"),
  scala: () => import("highlight.js/lib/languages/scala"),
  scheme: () => import("highlight.js/lib/languages/scheme"),
  smalltalk: () => import("highlight.js/lib/languages/smalltalk"),
  sml: () => import("highlight.js/lib/languages/sml"),
  stan: () => import("highlight.js/lib/languages/stan"),
  stata: () => import("highlight.js/lib/languages/stata"),
  stylus: () => import("highlight.js/lib/languages/stylus"),
  tap: () => import("highlight.js/lib/languages/tap"),
  tcl: () => import("highlight.js/lib/languages/tcl"),
  thrift: () => import("highlight.js/lib/languages/thrift"),
  twig: () => import("highlight.js/lib/languages/twig"),
  vala: () => import("highlight.js/lib/languages/vala"),
  vbscript: () => import("highlight.js/lib/languages/vbscript"),
  "vbscript-html": () => import("highlight.js/lib/languages/vbscript-html"),
  verilog: () => import("highlight.js/lib/languages/verilog"),
  vhdl: () => import("highlight.js/lib/languages/vhdl"),
  vim: () => import("highlight.js/lib/languages/vim"),
  x86asm: () => import("highlight.js/lib/languages/x86asm"),
  xquery: () => import("highlight.js/lib/languages/xquery"),
};

/** Fence spellings that resolve to nothing on their own, mapped to the language
 *  that should be loaded for them. hljs knows most short forms (`js`, `ts`,
 *  `yml`, `rs`, `html`, `c++`, `objc`) as aliases of languages it already has;
 *  these are the ones it does not. Spellings with `+`/`#` never reach this table
 *  because the class name is parsed the way hljs parses it — see below. */
const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  shellscript: "bash",
  yml: "yaml",
  rs: "rust",
  html: "xml",
  "c++": "cpp",
  cpp: "cpp",
  docker: "dockerfile",
  objc: "objectivec",
};

const languageLoads = new Map<string, Promise<boolean>>();

/** Registers a non-common language at most once per session. Failures are cached
 *  as well: a fence naming a language nothing provides must stay quiet, and it
 *  must not re-attempt the import on every highlight pass. */
function ensureLanguage(hljs: HLJSApi, name: string): Promise<boolean> {
  if (hljs.getLanguage(name)) return Promise.resolve(true);

  const pending = languageLoads.get(name);
  if (pending) return pending;

  const load = LAZY_LANGUAGES[name];
  if (!load) return Promise.resolve(false);

  const registration = load()
    .then((mod) => {
      hljs.registerLanguage(name, mod.default);
      return true;
    })
    .catch(() => false);
  languageLoads.set(name, registration);
  return registration;
}

/** hljs re-derives the language from the element's own class name, so the fence
 *  spelling is what has to resolve in the end. Match the way it will: its
 *  `[\w-]+` stops at `+`/`#`, which is why `c++` and `c#` end up as `c`. */
const FENCE_LANGUAGE_RE = /^(?:lang|language)-([\w-]+)/i;

async function highlightBlock(el: HTMLElement) {
  if (el.dataset.highlighted) return;
  const hljs = await getHljs();

  const fence = FENCE_LANGUAGE_RE.exec(el.className)?.[1];
  if (!fence) {
    hljs.highlightElement(el);
    el.dataset.highlighted = "true";
    return;
  }

  let language = hljs.getLanguage(fence) ? fence : null;
  if (!language) {
    const moduleName = LANGUAGE_ALIASES[fence] ?? fence;
    if (await ensureLanguage(hljs, moduleName)) {
      language = hljs.getLanguage(fence) ? fence : moduleName;
    }
  }

  if (!language) {
    // Plain text is better than a wrong guess, and hljs warns before it falls
    // back to autodetection. Leave the block unmarked so a later pass can pick
    // it up if the language ever becomes available.
    return;
  }

  if (language !== fence) {
    el.classList.remove(`language-${fence}`);
    el.classList.add(`language-${language}`);
  }

  hljs.highlightElement(el);
  el.dataset.highlighted = "true";
}

let currentHljsTheme: "light" | "dark" | null = null;

export async function setHljsTheme(theme: "light" | "dark") {
  if (currentHljsTheme === theme) return;
  currentHljsTheme = theme;

  // Ensure the library is loaded before swapping styles.
  await getHljs();

  if (theme === "dark") {
    await import("highlight.js/styles/github-dark.css");
  } else {
    await import("highlight.js/styles/github.css");
  }
}

export async function highlightCodeBlocks(container: HTMLElement) {
  const blocks = Array.from(container.querySelectorAll("pre code[class^='language-']"));
  for (const block of blocks) {
    const el = block as HTMLElement;
    if (el.classList.contains("language-mermaid")) continue;
    await highlightBlock(el);
  }
}

/** Highlight code blocks in small batches, yielding to the browser between
 *  batches so the main thread stays responsive during large documents. */
export async function highlightCodeBlocksChunked(
  container: HTMLElement,
  batchSize = 5
) {
  const blocks = Array.from(
    container.querySelectorAll<HTMLElement>("pre code[class^='language-']")
  );
  for (let i = 0; i < blocks.length; i += batchSize) {
    if (i > 0) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    const end = Math.min(i + batchSize, blocks.length);
    for (let j = i; j < end; j++) {
      const el = blocks[j];
      if (el.classList.contains("language-mermaid")) continue;
      await highlightBlock(el);
    }
  }
}
