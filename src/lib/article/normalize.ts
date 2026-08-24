import {
  makeDiagnostic,
  type Diagnostic,
} from "../../../scripts/validate/diagnostics";

export interface NormalizedArticleBody {
  markdown: string;
  diagnostics: Diagnostic[];
}

export function normalizeSourceId(value: string): string {
  return value
    .trim()
    .replace(/^#/, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function cleanHeadingText(value: string): string {
  return value
    .replace(/[*_`]/g, "")
    .replace(/\{[^}]*\}/g, "")
    .trim();
}

function splitSimpleCells(row: string): string[] {
  return row
    .trim()
    .split(/\s{2,}/)
    .map((cell) => cell.trim())
    .filter(Boolean);
}

function countDashGroups(line: string): number {
  return line
    .trim()
    .split(/\s+/)
    .filter((part) => /^-+$/.test(part)).length;
}

function isPandocGridBorder(line: string): boolean {
  return /^\s*\+(?:[-:=]+\+)+\s*$/.test(line);
}

function isPandocGridRow(line: string): boolean {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isPandocGridStructuralLine(line: string): boolean {
  return /^\s*[+|:=\-\s]+\s*$/.test(line) && /[+|]/.test(line);
}

function gridBoundaryPositions(lines: string[]): number[] {
  return (
    lines
      .filter(isPandocGridBorder)
      .map((line) =>
        [...line].flatMap((character, index) =>
          character === "+" ? [index] : [],
        ),
      )
      .sort((left, right) => right.length - left.length)[0] ?? []
  );
}

function splitPandocPipeRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return null;
  }

  const cells: string[] = [];
  let cell = "";
  let escaped = false;
  for (const character of trimmed.slice(1, -1)) {
    if (character === "|" && !escaped) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }
    cell += character;
    escaped = character === "\\" && !escaped;
    if (character !== "\\") {
      escaped = false;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function parsePandocGridRow(line: string, boundaries: number[]): string[] {
  const pipeCells = splitPandocPipeRow(line);
  if (pipeCells) {
    return pipeCells;
  }

  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    return line.slice(start + 1, end).trim();
  });
}

function formatMarkdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

interface TableDecoration {
  targetMarker?: string;
  caption?: string;
  nextIndex: number;
}

function isTableTargetMarker(line: string): boolean {
  return /^\s*<span data-jcore-target-id="[^"]+" aria-hidden="true"><\/span>\s*$/.test(
    line,
  );
}

function consumeTableDecoration(
  lines: string[],
  start: number,
): TableDecoration {
  let cursor = start;
  while (!lines[cursor]?.trim()) {
    cursor += 1;
  }

  const targetMarker = isTableTargetMarker(lines[cursor])
    ? lines[cursor]
    : undefined;
  if (targetMarker) {
    cursor += 1;
    while (!lines[cursor]?.trim()) {
      cursor += 1;
    }
  }

  const caption = lines[cursor]?.match(/^\s*:\s+(.+?)\s*$/);
  if (!caption) {
    return { nextIndex: start };
  }

  const text = caption[1].replace(/\{#[^}]*\}/g, "").trim();
  return {
    targetMarker,
    caption: text || undefined,
    nextIndex: cursor + 1,
  };
}

function convertPandocGridTables(markdown: string): string {
  const lines = markdown.split("\n");
  const output: string[] = [];
  let index = 0;

  while (index < lines.length) {
    if (!isPandocGridBorder(lines[index])) {
      output.push(lines[index]);
      index += 1;
      continue;
    }

    const block: string[] = [];
    let cursor = index;
    while (
      cursor < lines.length &&
      (isPandocGridStructuralLine(lines[cursor]) ||
        isPandocGridRow(lines[cursor]))
    ) {
      block.push(lines[cursor]);
      cursor += 1;
    }

    const boundaries = gridBoundaryPositions(block);
    const rows = block
      .filter(isPandocGridRow)
      .map((line) => parsePandocGridRow(line, boundaries))
      .filter((row) => row.some((cell) => cell.length > 0));

    if (boundaries.length < 2 || rows.length === 0) {
      output.push(lines[index]);
      index += 1;
      continue;
    }

    const width = Math.max(
      boundaries.length - 1,
      ...rows.map((row) => row.length),
    );
    const normalizedRows = rows.map((row) =>
      Array.from({ length: width }, (_, cellIndex) =>
        formatMarkdownCell(row[cellIndex] ?? ""),
      ),
    );
    const decoration = consumeTableDecoration(lines, cursor);
    if (decoration.targetMarker) {
      output.push(decoration.targetMarker);
    }
    output.push(`| ${normalizedRows[0].join(" | ")} |`);
    output.push(`| ${normalizedRows[0].map(() => "---").join(" | ")} |`);
    for (const row of normalizedRows.slice(1)) {
      output.push(`| ${row.join(" | ")} |`);
    }
    if (decoration.caption) {
      output.push("");
      output.push(`*${decoration.caption}*`);
    }
    index = decoration.nextIndex;
  }

  return output.join("\n");
}

function convertPandocSimpleTables(markdown: string): string {
  const lines = markdown.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const next = i + 1 < lines.length ? lines[i + 1] : "";
    const isSeparator = /^\s*(?:-+\s+)+-+\s*$/.test(next);
    const noPipes = !line.includes("|");

    if (line.trim() && noPipes && isSeparator) {
      const headerCells = splitSimpleCells(line);
      const separators = countDashGroups(next);
      if (headerCells.length > 0 && headerCells.length === separators) {
        const tableStart = out.length;
        out.push(`| ${headerCells.join(" | ")} |`);
        out.push(`| ${headerCells.map(() => "---").join(" | ")} |`);
        i += 2;

        while (i < lines.length) {
          const bodyLine = lines[i];
          const trimmed = bodyLine.trim();
          if (!trimmed) {
            break;
          }
          if (isTableTargetMarker(bodyLine) || /^:\s/.test(trimmed)) {
            break;
          }
          const cells = splitSimpleCells(bodyLine);
          if (cells.length === headerCells.length) {
            out.push(`| ${cells.join(" | ")} |`);
          } else {
            out.push(bodyLine);
          }
          i += 1;
        }
        const decoration = consumeTableDecoration(lines, i);
        if (decoration.targetMarker) {
          out.splice(tableStart, 0, decoration.targetMarker);
        }
        if (decoration.caption) {
          out.push("");
          out.push(`*${decoration.caption}*`);
        }
        i = decoration.nextIndex;
        continue;
      }
    }

    out.push(line);
    i += 1;
  }

  return out.join("\n");
}

function normalizeLabelMarkers(lines: string[]): string[] {
  const output: string[] = [];

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+?)\s+\{#([^}]+)\}\s*$/);
    if (heading) {
      const id = normalizeSourceId(heading[3]);
      output.push(`<!-- jcore-heading-id:${id} -->`);
      output.push(`${heading[1]} ${heading[2].trim()}`);
      continue;
    }

    const labelled = line.match(/^(.*?)\s*\{#([^\s}]+)(?:\s+[^}]*)?\}\s*$/);
    if (labelled) {
      const id = normalizeSourceId(labelled[2]);
      output.push(
        `<span data-jcore-target-id="${id}" aria-hidden="true"></span>`,
      );
      output.push(labelled[1].trimEnd());
      continue;
    }

    output.push(line);
  }

  return output;
}

function stripPandocDivFences(lines: string[]): string[] {
  return lines.filter((line) => !/^\s*:{3,}(?:\s+.*)?\s*$/.test(line));
}

function isolateDisplayMath(markdown: string): string {
  const prepared = markdown
    .replace(
      /([^\n])([ \t]*)\$\$[ \t]*(?=\\begin\{(?:align|equation)\*?\})/g,
      (_match, prefix: string) => `${prefix}\n$$\n`,
    )
    .replace(/\$\$\s*(?=\\begin\{(?:align|equation)\*?\})/g, () => "$$\n")
    .replace(
      /(\\end\{(?:align|equation)\*?\})\s*\$\$/g,
      (_match, environment: string) => `${environment}\n$$\n`,
    );

  return prepared.replace(
    /(^|\n)(\s*\\begin\{(?:align|equation)\*?\}[\s\S]*?\\end\{(?:align|equation)\*?\})/gm,
    (
      match,
      prefix: string,
      environment: string,
      offset: number,
      input: string,
    ) => {
      const before = input.slice(0, offset + prefix.length);
      const after = input.slice(offset + match.length);
      if (before.endsWith("$$\n") || /^\s*\$\$/.test(after)) {
        return match;
      }
      return `${prefix}$$\n${environment}\n$$`;
    },
  );
}

export function normalizeArticleBody(markdown: string): NormalizedArticleBody {
  const diagnostics: Diagnostic[] = [];
  const withLabels = normalizeLabelMarkers(
    markdown.replace(/\r\n/g, "\n").split("\n"),
  );
  const withoutDivs = stripPandocDivFences(withLabels);
  let body = withoutDivs.join("\n").replaceAll("\u00a0", " ");

  body = body.replace(/^\s*UTF8gbsn\s*$/gm, "");
  body = body.replace(/^\s*maketitle[^\n]*$/gm, "");
  body = body.replace(/^\s*thanks[^\n]*$/gm, "");
  body = body.replace(/\[([^\]]+)\]\{[.#][^}]*\}/g, "$1");
  body = body.replace(/\{[.#][^}]*\}/g, "");
  body = body.replace(/\{reference-type="[^"]*"\s*reference="[^"]*"\}/g, "");
  body = body.replace(/\{reference-type="[^"]*"\}/g, "");
  body = body.replace(/\[@[^\]]*\]/g, "");
  body = body.replace(/(?<![A-Za-z0-9])@[A-Za-z0-9_:.-]+/g, "");
  body = body.replace(/\\\$/g, "$");
  body = body.replace(/\s+,\)/g, ")");
  body = isolateDisplayMath(body);
  body = convertPandocGridTables(body);
  body = convertPandocSimpleTables(body);

  if (
    /\\begin\{(?:align|equation)\*?\}/.test(body) &&
    !/\$\$[\s\S]*\\begin\{/.test(body)
  ) {
    diagnostics.push(
      makeDiagnostic(
        "display-math-isolation",
        "warning",
        "article-render",
        "body.md",
        "A display math environment remained inline after normalization",
        "Review the equation wrapper in the source body",
        "math",
      ),
    );
  }

  if (/:::\s/.test(body)) {
    diagnostics.push(
      makeDiagnostic(
        "pandoc-fence",
        "error",
        "article-render",
        "body.md",
        "Pandoc div fence remained after normalization",
        "Remove the remaining fence or update the normalizer",
        "pandoc",
      ),
    );
  }

  return {
    markdown: body.trim(),
    diagnostics,
  };
}
