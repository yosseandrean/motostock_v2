/**
 * Minimal RFC 4180-style CSV reader/writer.
 *
 * The reader handles quoted fields (embedded commas, escaped quotes, and
 * newlines inside quotes) and a final row with no trailing newline. The
 * writer quotes any field containing a comma, quote, or newline.
 */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // Ignore CR so CRLF line endings parse as a single break.
    } else {
      field += c;
    }
  }

  // A final row without a trailing newline is still a row.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((field) => {
          if (/[",\n\r]/.test(field)) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        })
        .join(","),
    )
    .join("\n");
}
