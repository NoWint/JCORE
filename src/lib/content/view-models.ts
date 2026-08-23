import type { ArticleRecord, ExternalArticleRecord, IssueRecord } from './types';
import type { Locale } from '../i18n';
import { formatDate, localize } from '../i18n';
import { makeRoute } from '../routes';

export interface ArticleCardViewModel {
  id: string;
  url: string;
  title: string;
  authors: string[];
  articleType: string;
  publishedAt: string;
  keywords: string[];
  ownershipLabel: string;
  isExternal: boolean;
  demo: boolean;
}

export function toArticleCard(
  article: ArticleRecord | ExternalArticleRecord,
  locale: Locale,
  base = ''
): ArticleCardViewModel {
  const isExternal = article.kind === 'external';
  const path = isExternal
    ? `articles/external/${(article as ExternalArticleRecord).slug}`
    : `articles/${(article as ArticleRecord).id}`;
  const authors = isExternal
    ? (article as ExternalArticleRecord).contributors.map((contributor) => contributor.name)
    : (article as ArticleRecord).authors
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((ref) => ref.authorId);

  return {
    id: isExternal ? (article as ExternalArticleRecord).slug : (article as ArticleRecord).id,
    url: makeRoute(locale, path, base),
    title: localize(article.title, locale),
    authors,
    articleType: article.kind === 'external' ? 'external-article' : (article as ArticleRecord).articleType,
    publishedAt: formatDate(
      isExternal
        ? (article as ExternalArticleRecord).originalPublicationDate
        : (article as ArticleRecord).dates.published,
      locale
    ),
    keywords: article.keywords.map((keyword) => localize(keyword, locale)),
    ownershipLabel: isExternal ? 'External Open-Access Article' : 'JCORE Article',
    isExternal,
    demo: 'demo' in article ? Boolean(article.demo) : false
  };
}

export interface IssueCardViewModel {
  id: string;
  url: string;
  title: string;
  year: number;
  demo: boolean;
}

export function toIssueCard(issue: IssueRecord, locale: Locale, base = ''): IssueCardViewModel {
  return {
    id: issue.id,
    url: makeRoute(locale, `issues/${issue.id}`, base),
    title: localize(issue.title, locale),
    year: issue.year,
    demo: issue.demo
  };
}
