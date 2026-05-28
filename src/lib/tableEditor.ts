export interface TableData {
  header: string[];
  rows: string[][];
  alignments: ("left" | "center" | "right" | null)[];
}

const TABLE_RE = /^\|?\s*([^|]+?)\s*\|/gm;
const ALIGN_RE = /^\|?\s*:?-+:?\s*\|/;

function parseAlignment(cell: string): "left" | "center" | "right" | null {
  const trimmed = cell.trim();
  const left = trimmed.startsWith(":");
  const right = trimmed.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return null;
}

function splitRow(line: string): string[] {
  // Remove leading/trailing pipes and split
  const trimmed = line.trim();
  const inner = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed;
  const inner2 = inner.endsWith("|") ? inner.slice(0, -1) : inner;
  return inner2.split("|").map((c) => c.trim());
}

export function findTable(markdown: string, tableIndex: number): { table: TableData; start: number; end: number } | null {
  const lines = markdown.split("\n");
  let currentIdx = -1;
  let tableStart = -1;
  let tableEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // A table starts with a line that looks like a table row
    if (line.includes("|") && !line.trim().startsWith("```")) {
      if (tableStart === -1) {
        tableStart = i;
      }
      tableEnd = i;
    } else {
      if (tableStart !== -1) {
        currentIdx++;
        if (currentIdx === tableIndex) {
          const tableLines = lines.slice(tableStart, tableEnd + 1);
          const table = parseTableLines(tableLines);
          if (table) {
            const startPos = lines.slice(0, tableStart).join("\n").length + (tableStart > 0 ? 1 : 0);
            const endPos = lines.slice(0, tableEnd + 1).join("\n").length;
            return { table, start: startPos, end: endPos };
          }
        }
        tableStart = -1;
        tableEnd = -1;
      }
    }
  }

  // Handle table at end of document
  if (tableStart !== -1) {
    currentIdx++;
    if (currentIdx === tableIndex) {
      const tableLines = lines.slice(tableStart, tableEnd + 1);
      const table = parseTableLines(tableLines);
      if (table) {
        const startPos = lines.slice(0, tableStart).join("\n").length + (tableStart > 0 ? 1 : 0);
        const endPos = markdown.length;
        return { table, start: startPos, end: endPos };
      }
    }
  }

  return null;
}

function parseTableLines(lines: string[]): TableData | null {
  if (lines.length < 2) return null;

  const header = splitRow(lines[0]);
  if (header.length === 0) return null;

  // Second line should be the separator
  const alignLine = lines[1];
  if (!ALIGN_RE.test(alignLine)) return null;
  const alignments = splitRow(alignLine).map(parseAlignment);

  // Pad alignments to match header length
  while (alignments.length < header.length) alignments.push(null);

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    rows.push(splitRow(lines[i]));
  }

  return { header, rows, alignments };
}

export function tableToMarkdown(table: TableData): string {
  const colCount = table.header.length;

  function padCell(cell: string, width: number): string {
    return " " + cell.padEnd(width, " ") + " ";
  }

  function rowToMarkdown(cells: string[]): string {
    return "|" + cells.map((c) => " " + c + " ").join("|") + "|";
  }

  function alignmentToCell(align: "left" | "center" | "right" | null, width: number): string {
    const dashes = "-".repeat(Math.max(3, width));
    if (align === "center") return ":" + dashes.slice(2) + ":";
    if (align === "right") return dashes.slice(1) + ":";
    if (align === "left") return ":" + dashes.slice(1);
    return dashes;
  }

  const headerRow = rowToMarkdown(table.header);

  // Separator row
  const sepCells = table.alignments.slice(0, colCount).map((a, i) => {
    const width = Math.max(3, table.header[i]?.length ?? 3);
    return alignmentToCell(a, width);
  });
  const sepRow = "|" + sepCells.join("|") + "|";

  const bodyRows = table.rows.map((r) => {
    const padded = r.slice(0, colCount);
    while (padded.length < colCount) padded.push("");
    return rowToMarkdown(padded);
  });

  return [headerRow, sepRow, ...bodyRows].join("\n");
}

export function addRow(table: TableData, afterIndex?: number): TableData {
  const newRow = new Array(table.header.length).fill("");
  const idx = afterIndex !== undefined ? afterIndex + 1 : table.rows.length;
  const rows = [...table.rows];
  rows.splice(idx, 0, newRow);
  return { ...table, rows };
}

export function removeRow(table: TableData, index: number): TableData {
  const rows = [...table.rows];
  rows.splice(index, 1);
  return { ...table, rows };
}

export function addColumn(table: TableData, afterIndex?: number): TableData {
  const idx = afterIndex !== undefined ? afterIndex + 1 : table.header.length;
  const header = [...table.header];
  header.splice(idx, 0, "");
  const alignments = [...table.alignments];
  alignments.splice(idx, 0, null);
  const rows = table.rows.map((r) => {
    const newRow = [...r];
    newRow.splice(idx, 0, "");
    return newRow;
  });
  return { ...table, header, alignments, rows };
}

export function removeColumn(table: TableData, index: number): TableData {
  const header = [...table.header];
  header.splice(index, 1);
  const alignments = [...table.alignments];
  alignments.splice(index, 1);
  const rows = table.rows.map((r) => {
    const newRow = [...r];
    newRow.splice(index, 1);
    return newRow;
  });
  return { ...table, header, alignments, rows };
}
