import { getExternalArticles, getPublishedArticles } from '../content/queries';
import type { ArticleRecord, ExternalArticleRecord } from '../content/types';

export function getRelatedArticles(
  record: ArticleRecord | ExternalArticleRecord,
  limit = 3
): Array<ArticleRecord | ExternalArticleRecord> {
  const others: Array<ArticleRecord | ExternalArticleRecord> = [
    ...getPublishedArticles(),
    ...getExternalArticles()
  ].filter((candidate) => {
    if (record.kind === 'external') {
      return candidate.kind !== 'external' || candidate.slug !== record.slug;
    }
    return candidate.kind !== 'jcore' || candidate.id !== record.id;
  });

  const recordKeywords = new Set(record.keywords.map((keyword) => keyword.en.toLowerCase()));
  return others
    .sort((a, b) => {
      const aScore = a.keywords.filter((keyword) => recordKeywords.has(keyword.en.toLowerCase())).length;
      const bScore = b.keywords.filter((keyword) => recordKeywords.has(keyword.en.toLowerCase())).length;
      return bScore - aScore;
    })
    .slice(0, limit);
}
