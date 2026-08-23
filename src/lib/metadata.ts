import { alternateLinks, canonicalForRecord } from './routes';
import { localize, type Locale } from './i18n';
import type { ArticleRecord, ExternalArticleRecord } from './content/types';

type CitationRecord = ArticleRecord | ExternalArticleRecord;

export interface ScholarlyMetadata {
  title: string;
  description: string;
  canonical: URL;
  alternates: Array<{ lang: string; href: URL }>;
  jsonLd: Record<string, unknown>;
  citation: Record<string, string | string[]>;
}

export function buildArticleMetadata(record: CitationRecord, locale: Locale, site: URL): ScholarlyMetadata {
  const canonical = canonicalForRecord(record, site, locale);
  const title = localize(record.title, locale);
  const description = localize(record.abstract, locale);
  const isExternal = record.kind === 'external';
  const authorNames = isExternal
    ? record.contributors.map((contributor) => contributor.name)
    : record.authors
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((author) => author.authorId);
  const published = isExternal
    ? record.originalPublicationDate.toISOString().slice(0, 10)
    : record.dates.published.toISOString().slice(0, 10);
  const venue = isExternal ? record.originalVenue : 'JCORE';

  return {
    title,
    description,
    canonical,
    alternates: alternateLinks(record, site),
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ScholarlyArticle',
      '@id': canonical.href,
      name: title,
      headline: title,
      description,
      author: authorNames.map((name) => ({ '@type': 'Person', name })),
      datePublished: published,
      isPartOf: { '@type': 'Periodical', name: venue },
      license: isExternal ? record.rights.license.url : record.license.url
    },
    citation: {
      citation_title: title,
      citation_author: authorNames,
      citation_publication_date: published,
      citation_journal_title: venue,
      ...(record.kind === 'jcore'
        ? { citation_volume: String(record.volume), citation_issue: String(record.issue) }
        : { citation_arxiv_id: record.identifiers.arxiv ?? '' })
    }
  };
}
