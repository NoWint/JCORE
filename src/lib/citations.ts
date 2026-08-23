import type { ArticleRecord, ExternalArticleRecord } from './content/types';
import { localize, type Locale } from './i18n';

type CitationRecord = ArticleRecord | ExternalArticleRecord;

function authors(record: CitationRecord): string {
  if (record.kind === 'external') {
    return record.contributors.map((contributor) => contributor.name).join(', ');
  }
  return record.authors
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((author) => author.authorId)
    .join(', ');
}

export function formatPlainCitation(record: CitationRecord, locale: Locale): string {
  const title = localize(record.title, locale);
  if (record.kind === 'external') {
    const year = record.originalPublicationDate.getFullYear();
    const identifier = record.identifiers.arxiv
      ? `arXiv:${record.identifiers.arxiv}`
      : `DOI:${record.identifiers.doi ?? ''}`;
    return `${authors(record)}. "${title}." ${record.originalVenue}, ${year}. ${identifier}. External open-access article; not published by JCORE.`;
  }
  return `${authors(record)}. "${title}." JCORE, vol. ${record.volume}, no. ${record.issue}, ${record.year}. ${
    record.demo ? 'Demonstration article.' : ''
  }`.trim();
}

export function formatBibTeX(record: CitationRecord): string {
  const key = record.kind === 'external' ? record.slug : record.id;
  const title = record.title.en.replace(/[{}]/g, '');
  if (record.kind === 'external') {
    return [
      `@misc{${key},`,
      `  title = {${title}},`,
      `  author = {${record.contributors.map((contributor) => contributor.name).join(' and ')}},`,
      `  year = {${record.originalPublicationDate.getFullYear()}},`,
      `  howpublished = {${record.originalVenue}},`,
      `  url = {${record.officialUrl}},`,
      `  note = {External open-access article. Not published by JCORE.},`,
      `}`
    ].join('\n');
  }
  return [
    `@article{${key},`,
    `  title = {${title}},`,
    `  author = {${record.authors.map((author) => author.authorId).join(' and ')}},`,
    `  journal = {JCORE},`,
    `  year = {${record.year}},`,
    `  volume = {${record.volume}},`,
    `  number = {${record.issue}}${record.demo ? ',' : ''}`,
    ...(record.demo ? [`  note = {Demonstration article.}`] : []),
    `}`
  ].join('\n');
}

export function formatRIS(record: CitationRecord): string {
  const lines = ['TY  - JOUR'];
  const title = record.title.en;
  if (record.kind === 'external') {
    lines.push('TY  - ELEC', `TI  - ${title}`);
    for (const contributor of record.contributors) {
      lines.push(`AU  - ${contributor.name}`);
    }
    lines.push(`JO  - ${record.originalVenue}`, `PY  - ${record.originalPublicationDate.getFullYear()}`, `UR  - ${record.officialUrl}`);
  } else {
    lines.push(`TI  - ${title}`);
    for (const author of record.authors.slice().sort((a, b) => a.order - b.order)) {
      lines.push(`AU  - ${author.authorId}`);
    }
    lines.push('JO  - JCORE', `VL  - ${record.volume}`, `IS  - ${record.issue}`, `PY  - ${record.year}`);
  }
  lines.push('ER  - ');
  return lines.join('\n');
}
