import { describe, it, expect } from "vitest";
import {
  parseTableSource,
  tableToMarkdown,
  addRow,
  removeRow,
  addColumn,
  removeColumn,
} from "./tableEditor";

const firstTable = `| A | B |
|---|---|
| 1 | 2 |
| 3 | 4 |`;

const secondTable = `| X | Y | Z |
|---|---|---|
| a | b | c |`;

describe("parseTableSource", () => {
  it("parses a basic table and its rows", () => {
    const table = parseTableSource(firstTable);
    expect(table).not.toBeNull();
    expect(table!.header).toEqual(["A", "B"]);
    expect(table!.rows).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("parses alignment markers into alignments", () => {
    const table = parseTableSource(`| A | B | C |
|:--|--:|:-:|
| 1 | 2 | 3 |`);
    expect(table).not.toBeNull();
    expect(table!.alignments).toEqual(["left", "right", "center"]);
  });

  it("returns null for a prose paragraph containing a pipe", () => {
    expect(parseTableSource("Here is a | pipe in prose.")).toBeNull();
    expect(parseTableSource("some prose | with a pipe\nmore prose, no delimiter row")).toBeNull();
  });

  it("ignores a trailing newline", () => {
    expect(parseTableSource(firstTable + "\n")).toEqual(parseTableSource(firstTable));
  });
});

describe("tableEditor", () => {
  it("round-trips a table", () => {
    const table = parseTableSource(firstTable);
    expect(table).not.toBeNull();
    const md = tableToMarkdown(table!);
    expect(md).toContain("| A | B |");
    expect(md).toContain("| 1 | 2 |");
    expect(md).toContain("| 3 | 4 |");
  });

  it("adds a row", () => {
    const table = parseTableSource(firstTable)!;
    const updated = addRow(table, 0);
    expect(updated.rows.length).toBe(3);
    expect(updated.rows[1]).toEqual(["", ""]);
  });

  it("removes a row", () => {
    const table = parseTableSource(firstTable)!;
    const updated = removeRow(table, 0);
    expect(updated.rows.length).toBe(1);
    expect(updated.rows[0]).toEqual(["3", "4"]);
  });

  it("adds a column", () => {
    const table = parseTableSource(firstTable)!;
    const updated = addColumn(table, 0);
    expect(updated.header.length).toBe(3);
    expect(updated.rows[0].length).toBe(3);
  });

  it("removes a column", () => {
    const table = parseTableSource(secondTable)!;
    const updated = removeColumn(table, 1);
    expect(updated.header).toEqual(["X", "Z"]);
    expect(updated.rows[0]).toEqual(["a", "c"]);
  });
});
