import {
  makeDiagnostic,
  type Diagnostic,
} from "../../../scripts/validate/diagnostics";
import { cleanHeadingText, normalizeSourceId } from "./normalize";
import type { ArticleReference, ArticleStructure, Heading } from "./types";

function slugify(value: string): string {
  return (
    normalizeSourceId(value)
      .replace(/[^a-z0-9\u4e00-\u9fff_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

function uniqueId(candidate: string, used: Set<string>): string {
  const base = candidate || "section";
  let id = base;
  let suffix = 2;
  while (used.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(id);
  return id;
}

function parseReferenceTargets(markdown: string): ArticleReference[] {
  const references: ArticleReference[] = [];
  for (const match of markdown.matchAll(
    /\]\(#([^)]+)\)|href=["']#([^"']+)["']/g,
  )) {
    const target = normalizeSourceId(match[1] ?? match[2] ?? "");
    if (target) {
      references.push({ target, source: match[0] });
    }
  }
  return references;
}

export function indexArticleBody(
  markdown: string,
): ArticleStructure & { diagnostics: Diagnostic[] } {
  const headings: Heading[] = [];
  const ids = new Set<string>();
  const diagnostics: Diagnostic[] = [];
  let pendingHeadingId: string | undefined;
  let fencedCode: { marker: "`" | "~"; length: number } | undefined;

  for (const line of markdown.split("\n")) {
    const fence = line.match(/^\s*(`{3,}|~{3,})/);
    if (fencedCode) {
      if (
        fence &&
        fence[1][0] === fencedCode.marker &&
        fence[1].length >= fencedCode.length
      ) {
        fencedCode = undefined;
      }
      continue;
    }
    if (fence) {
      fencedCode = {
        marker: fence[1][0] as "`" | "~",
        length: fence[1].length,
      };
      continue;
    }

    for (const rawId of line.matchAll(/(?:^|\s)id=["']([^"']+)["']/g)) {
      ids.add(normalizeSourceId(rawId[1]));
    }

    const headingMarker = line.match(/<!--\s*jcore-heading-id:([^\s]+)\s*-->/);
    if (headingMarker) {
      pendingHeadingId = normalizeSourceId(headingMarker[1]);
      continue;
    }

    const targetMarker = line.match(
      /<!--\s*jcore-target-id:([^\s]+)\s*-->|data-jcore-target-id=["']([^"']+)["']/,
    );
    if (targetMarker) {
      const requestedId = normalizeSourceId(
        targetMarker[1] ?? targetMarker[2] ?? "",
      );
      const id = uniqueId(requestedId, ids);
      if (id !== requestedId) {
        diagnostics.push(
          makeDiagnostic(
            "duplicate-id",
            "warning",
            "article-render",
            "body.md",
            `Duplicate explicit id ${requestedId} was renamed to ${id}`,
            "Review references to the duplicated source label",
            requestedId,
          ),
        );
      }
      continue;
    }

    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match) {
      continue;
    }

    const text = cleanHeadingText(match[2]);
    const requestedId = pendingHeadingId ?? slugify(text);
    const id = uniqueId(requestedId, ids);
    if (pendingHeadingId && id !== pendingHeadingId) {
      diagnostics.push(
        makeDiagnostic(
          "duplicate-id",
          "warning",
          "article-render",
          "body.md",
          `Duplicate explicit id ${pendingHeadingId} was renamed to ${id}`,
          "Review references to the duplicated source label",
          pendingHeadingId,
        ),
      );
    }
    headings.push({ level: match[1].length, text, id });
    pendingHeadingId = undefined;
  }

  return {
    headings,
    ids,
    references: parseReferenceTargets(markdown),
    diagnostics,
  };
}
