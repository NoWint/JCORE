import { XMLParser } from 'fast-xml-parser';
import { makeDiagnostic, type Diagnostic } from '../../validate/diagnostics';

export interface JatsAuthor {
  surname: string;
  givenNames: string;
  affId?: string;
}

export interface JatsLicense {
  reference?: string;
  statement?: string;
}

export interface ParsedJats {
  title: string;
  authors: JatsAuthor[];
  affiliations: Record<string, string>;
  abstract: string;
  keywords: string[];
  doi?: string;
  license?: JatsLicense;
  hasLicense: boolean;
  bodyMarkdown: string;
  references: string[];
  ids: string[];
  xrefs: Array<{ rid: string; sourcePath: string }>;
  assets: Array<{ href: string; sourcePath: string }>;
  diagnostics: Diagnostic[];
}

type UnknownRecord = Record<string, unknown>;

function asArray(value: unknown): UnknownRecord[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? (value as UnknownRecord[]) : [value as UnknownRecord];
}

function text(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value && typeof value === 'object' && '#text' in value) {
    return String((value as UnknownRecord)['#text']).trim();
  }
  return '';
}

function attr(value: unknown, name: string): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const candidate = (value as UnknownRecord)[name];
  return candidate === undefined ? undefined : String(candidate);
}

function stripMarkup(value: string): string {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function tableToMarkdown(table: UnknownRecord): string {
  const rows: string[][] = [];
  const trs = asArray(table.tr);
  for (const tr of trs) {
    const cells = [...asArray(tr.th), ...asArray(tr.td)].map((cell) => text(cell).replace(/\n/g, ' '));
    rows.push(cells);
  }
  if (rows.length === 0) {
    return '';
  }
  const header = rows[0];
  const separator = header.map(() => '---');
  const body = rows.slice(1).map((row) => `| ${row.join(' | ')} |`);
  return [`| ${header.join(' | ')} |`, `| ${separator.join(' | ')} |`, ...body].join('\n');
}

interface MarkdownContext {
  footnotes: string[];
  level: number;
}

function nodeToMarkdown(node: UnknownRecord, type: string, context: MarkdownContext): string {
  switch (type) {
    case 'sec': {
      const heading = text(node.title);
      const prefix = '#'.repeat(Math.min(context.level, 6));
      const inner = Object.entries(node)
        .filter(([key]) => !key.startsWith('@_') && key !== 'title')
        .flatMap(([childType, child]) =>
          asArray(child).map((childNode) => nodeToMarkdown(childNode, childType, { ...context, level: context.level + 1 }))
        )
        .join('\n');
      return `${prefix} ${heading}\n\n${inner}`.trim();
    }
    case 'title':
      return '';
    case 'p': {
      const xrefs = asArray(node.xref)
        .map((xref) => {
          const rid = attr(xref, '@_rid');
          return rid ? `[^${rid}]` : '';
        })
        .join('');
      return `${text(node)}${xrefs}`;
    }
    case 'disp-formula':
      return `$$\n${text(node)}\n$$`;
    case 'inline-formula':
      return `$${text(node)}$`;
    case 'fig': {
      const graphic = asArray(node.graphic)[0] ?? asArray(node['inline-graphic'])[0];
      const href = attr(graphic, '@_href') ?? attr(graphic, '@_xlink:href') ?? '';
      const caption = text((node.caption as UnknownRecord | undefined)?.p ?? node.caption);
      return href ? `![${caption}](${href})` : '';
    }
    case 'table-wrap': {
      const table = asArray(node.table)[0];
      const caption = text((node.caption as UnknownRecord | undefined)?.p ?? node.caption);
      const markdown = table ? tableToMarkdown(table as UnknownRecord) : '';
      return `${markdown}\n\n*${caption}*`.trim();
    }
    case 'preformat':
      return `\`\`\`\n${text(node)}\n\`\`\``;
    case 'fn': {
      const id = attr(node, '@_id') ?? 'fn';
      context.footnotes.push(`[^${id}]: ${text(node.p ?? node)}`);
      return '';
    }
    case 'xref': {
      const rid = attr(node, '@_rid');
      return rid ? `[^${rid}]` : text(node);
    }
    case 'list': {
      const items = asArray(node['list-item']).map((item) => text(item)).filter(Boolean);
      return items.map((item) => `- ${item}`).join('\n');
    }
    default:
      return Object.entries(node)
        .filter(([key]) => !key.startsWith('@_'))
        .flatMap(([childType, child]) =>
          asArray(child).map((childNode) => nodeToMarkdown(childNode, childType, context))
        )
        .join('\n');
  }
}

function collectStructuralData(value: unknown, ids: string[], xrefs: ParsedJats['xrefs'], assets: ParsedJats['assets'], path: string): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStructuralData(item, ids, xrefs, assets, path);
    }
    return;
  }
  if (!value || typeof value !== 'object') {
    return;
  }

  const record = value as UnknownRecord;
  const id = attr(record, '@_id');
  if (id) {
    ids.push(id);
  }
  if (typeof record.xref === 'object') {
    const rid = attr(record.xref, '@_rid');
    if (rid) {
      xrefs.push({ rid, sourcePath: path });
    }
  }
  if (typeof record.graphic === 'object') {
    const href = attr(record.graphic, '@_href') ?? attr(record.graphic, '@_xlink:href');
    if (href) {
      assets.push({ href, sourcePath: path });
    }
  }
  if (typeof record['inline-graphic'] === 'object') {
    const href = attr(record['inline-graphic'], '@_href') ?? attr(record['inline-graphic'], '@_xlink:href');
    if (href) {
      assets.push({ href, sourcePath: path });
    }
  }

  for (const [key, child] of Object.entries(record)) {
    if (!key.startsWith('@_')) {
      collectStructuralData(child, ids, xrefs, assets, `${path}/${key}`);
    }
  }
}

function referencesFromBack(back: unknown): string[] {
  const record = (back ?? {}) as UnknownRecord;
  const refLists = asArray(record['ref-list']);
  return refLists.flatMap((refList) =>
    asArray(refList.ref).map((ref) => {
      const citation = ref['mixed-citation'] ?? ref.citation ?? ref;
      return stripMarkup(text(citation));
    })
  );
}

export function parseJatsXml(xml: string, sourcePath: string): ParsedJats {
  const diagnostics: Diagnostic[] = [];

  if (/<!DOCTYPE[^>]+(SYSTEM|PUBLIC)/i.test(xml)) {
    diagnostics.push(
      makeDiagnostic(
        'external-dtd',
        'error',
        'jats',
        sourcePath,
        'JATS document declares an external DTD or entity',
        'Remove the external DTD declaration before import',
        'doctype'
      )
    );
  }

  let parsed: UnknownRecord | null = null;
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseTagValue: false,
      parseAttributeValue: false,
      trimValues: true,
      processEntities: false,
      allowBooleanAttributes: false
    });
    parsed = parser.parse(xml) as UnknownRecord;
  } catch (error) {
    diagnostics.push(
      makeDiagnostic(
        'xml-invalid',
        'error',
        'jats',
        sourcePath,
        error instanceof Error ? error.message : String(error),
        'Fix the XML before import',
        'document'
      )
    );
  }

  const article = (parsed?.article ?? parsed?.['jats:article'] ?? {}) as UnknownRecord;
  const meta = ((article.front as UnknownRecord | undefined)?.['article-meta'] ?? {}) as UnknownRecord;
  const title = text((meta['title-group'] as UnknownRecord | undefined)?.['article-title']);
  const authors = asArray((meta['contrib-group'] as UnknownRecord | undefined)?.contrib).map((contrib) => {
    const name = (contrib.name ?? {}) as UnknownRecord;
    const xref = asArray(contrib.xref)[0];
    return {
      surname: text(name.surname),
      givenNames: text(name['given-names']),
      affId: attr(xref, '@_rid')
    };
  });
  const affiliations: Record<string, string> = {};
  for (const aff of asArray(meta.aff)) {
    const id = attr(aff, '@_id');
    if (id) {
      affiliations[id] = stripMarkup(text(aff));
    }
  }
  const abstract = stripMarkup(text(meta.abstract));
  const keywords = asArray(meta['kwd-group']).flatMap((group) => asArray(group.kwd).map((keyword) => text(keyword)));
  const articleIds = asArray(meta['article-id']);
  const doi = articleIds.find((articleId) => attr(articleId, '@_pub-id-type') === 'doi');
  const permissions = (meta.permissions ?? {}) as UnknownRecord;
  const license = (permissions.license ?? {}) as UnknownRecord;
  const licenseReference =
    text(license['ali:license_ref']) || text(license['license_ref']) || text(license['licenseRef']) || undefined;
  const licenseStatement = text(license['license-p']) || undefined;
  const hasLicense = Boolean(licenseReference || licenseStatement || Object.keys(license).length > 0);
  const ids: string[] = [];
  const xrefs: ParsedJats['xrefs'] = [];
  const assets: ParsedJats['assets'] = [];
  collectStructuralData(article, ids, xrefs, assets, sourcePath);

  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  for (const duplicate of duplicateIds) {
    diagnostics.push(
      makeDiagnostic(
        'duplicate-id',
        'error',
        'jats',
        sourcePath,
        `Duplicate JATS id ${duplicate}`,
        'Give every XML id a unique value',
        duplicate
      )
    );
  }

  for (const xref of xrefs) {
    if (!ids.includes(xref.rid)) {
      diagnostics.push(
        makeDiagnostic(
          'bad-xref',
          'error',
          'jats',
          xref.sourcePath,
          `Xref points to missing id ${xref.rid}`,
          'Fix the xref target or add the id',
          xref.rid
        )
      );
    }
  }

  const context: MarkdownContext = { footnotes: [], level: 1 };
  const body = (article.body ?? {}) as UnknownRecord;
  const bodyMarkdown = Object.entries(body)
    .filter(([key]) => !key.startsWith('@_'))
    .flatMap(([type, value]) =>
      asArray(value)
        .map((node) => nodeToMarkdown(node, type, context))
        .join('\n')
    )
    .join('\n')
    .trim();
  const footnoteBlock = context.footnotes.length > 0 ? `\n\n${context.footnotes.join('\n\n')}` : '';
  const references = referencesFromBack(article.back);
  const referenceBlock =
    references.length > 0
      ? `\n\n## References\n\n${references.map((reference, index) => `${index + 1}. ${reference}`).join('\n')}`
      : '';

  return {
    title,
    authors,
    affiliations,
    abstract,
    keywords,
    doi: doi ? text(doi) : undefined,
    license: {
      reference: licenseReference,
      statement: licenseStatement
    },
    hasLicense,
    bodyMarkdown: `${bodyMarkdown}${footnoteBlock}${referenceBlock}`,
    references,
    ids,
    xrefs,
    assets,
    diagnostics
  };
}
