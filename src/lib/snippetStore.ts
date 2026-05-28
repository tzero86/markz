export interface Snippet {
  trigger: string;
  description: string;
  body: string;
}

// Default engineering-doc snippets built into the app.
// In the future these can be loaded from a config file.
const DEFAULT_SNIPPETS: Snippet[] = [
  {
    trigger: "rfc",
    description: "RFC header template",
    body: `# RFC-$1: $2

## Status

Proposed

## Context

$3

## Decision

$4

## Consequences

$5
`,
  },
  {
    trigger: "adr",
    description: "ADR header template",
    body: `# ADR-$1: $2

## Status

Proposed

## Context

$3

## Decision

We will $4

## Consequences

$5
`,
  },
  {
    trigger: "todo",
    description: "TODO item",
    body: "- [ ] $1",
  },
  {
    trigger: "link",
    description: "Markdown link",
    body: "[$1]($2)",
  },
  {
    trigger: "img",
    description: "Markdown image",
    body: "![$1]($2)",
  },
  {
    trigger: "code",
    description: "Fenced code block",
    body: "\`\`\`$1\n$2\n\`\`\`",
  },
  {
    trigger: "table",
    description: "Markdown table",
    body: "| $1 | $2 |\n|---|---|\n| $3 | $4 |",
  },
  {
    trigger: "frontmatter",
    description: "YAML frontmatter",
    body: `---
title: $1
date: \${TODAY}
author: $2
tags: [$3]
---
`,
  },
];

function getToday(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

export function getSnippets(): Snippet[] {
  return DEFAULT_SNIPPETS.map((s) => ({
    ...s,
    body: s.body.replace(/\${TODAY}/g, getToday()),
  }));
}

export function findSnippet(trigger: string): Snippet | undefined {
  return getSnippets().find((s) => s.trigger === trigger);
}

export interface SnippetTabStop {
  from: number;
  to: number;
  placeholder?: string;
}

export function parseSnippetBody(body: string): {
  text: string;
  tabStops: SnippetTabStop[];
} {
  const tabStops: SnippetTabStop[] = [];
  let text = "";
  let i = 0;
  while (i < body.length) {
    if (body[i] === "$" && i + 1 < body.length) {
      if (body[i + 1] === "{" && body.indexOf("}", i + 2) !== -1) {
        const endBrace = body.indexOf("}", i + 2);
        const inner = body.slice(i + 2, endBrace);
        const colonIdx = inner.indexOf(":");
        const num = colonIdx !== -1 ? inner.slice(0, colonIdx) : inner;
        const placeholder = colonIdx !== -1 ? inner.slice(colonIdx + 1) : undefined;
        const from = text.length;
        if (placeholder) {
          text += placeholder;
        }
        tabStops.push({ from, to: text.length, placeholder });
        i = endBrace + 1;
        continue;
      }
      if (/\d/.test(body[i + 1])) {
        let numEnd = i + 1;
        while (numEnd < body.length && /\d/.test(body[numEnd])) {
          numEnd++;
        }
        const from = text.length;
        tabStops.push({ from, to: from });
        i = numEnd;
        continue;
      }
    }
    text += body[i];
    i++;
  }
  return { text, tabStops };
}
