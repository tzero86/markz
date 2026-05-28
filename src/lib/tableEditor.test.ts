import { describe, it, expect } from "vitest";
import { findTable, tableToMarkdown, addRow, removeRow, addColumn, removeColumn } from "./tableEditor";

describe("tableEditor", () => {
  const sampleMd = `# Doc

| A | B |
|---|---|
| 1 | 2 |
| 3 | 4 |

Some text.

| X | Y | Z |
|---|---|---|
| a | b | c |
`;

  it("finds the first table", () => {
    const result = findTable(sampleMd, 0);
    expect(result).not.toBeNull();
    expect(result!.table.header).toEqual(["A", "B"]);
    expect(result!.table.rows).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("finds the second table", () => {
    const result = findTable(sampleMd, 1);
    expect(result).not.toBeNull();
    expect(result!.table.header).toEqual(["X", "Y", "Z"]);
    expect(result!.table.rows).toEqual([["a", "b", "c"]]);
  });

  it("returns null for missing table", () => {
    expect(findTable(sampleMd, 2)).toBeNull();
  });

  it("round-trips a table", () => {
    const result = findTable(sampleMd, 0);
    expect(result).not.toBeNull();
    const md = tableToMarkdown(result!.table);
    expect(md).toContain("| A | B |");
    expect(md).toContain("| 1 | 2 |");
    expect(md).toContain("| 3 | 4 |");
  });

  it("adds a row", () => {
    const result = findTable(sampleMd, 0);
    const updated = addRow(result!.table, 0);
    expect(updated.rows.length).toBe(3);
    expect(updated.rows[1]).toEqual(["", ""]);
  });

  it("removes a row", () => {
    const result = findTable(sampleMd, 0);
    const updated = removeRow(result!.table, 0);
    expect(updated.rows.length).toBe(1);
    expect(updated.rows[0]).toEqual(["3", "4"]);
  });

  it("adds a column", () => {
    const result = findTable(sampleMd, 0);
    const updated = addColumn(result!.table, 0);
    expect(updated.header.length).toBe(3);
    expect(updated.rows[0].length).toBe(3);
  });

  it("removes a column", () => {
    const result = findTable(sampleMd, 1);
    const updated = removeColumn(result!.table, 1);
    expect(updated.header).toEqual(["X", "Z"]);
    expect(updated.rows[0]).toEqual(["a", "c"]);
  });

  it("preserves alignments", () => {
    const md = `| A | B |
|:--|--:|:-:|
| 1 | 2 | 3 |
`;
    const result = findTable(md, 0);
    expect(result).not.toBeNull();
    expect(result!.table.alignments).toEqual(["left", "right", "center"]);
  });
});
