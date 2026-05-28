import { describe, it, expect } from "vitest";

// Importing the module should not throw — this catches runtime errors
// like the EditorView type-only import bug.
describe("markdownLinter module", () => {
  it("imports without throwing", async () => {
    const mod = await import("./markdownLinter");
    expect(mod.markdownLinter).toBeDefined();
    expect(mod.spellcheckFacet).toBeDefined();
  });
});
