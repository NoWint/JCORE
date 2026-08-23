import type { ArticleRecord, ExternalArticleRecord, IssueRecord } from './types';
import { getRepository } from './repository';

export function getPublishedArticles(): ArticleRecord[] {
  return getRepository().articles;
}

export function getArticleById(id: string): ArticleRecord | undefined {
  return getPublishedArticles().find((article) => article.id === id);
}

export function getExternalArticles(): ExternalArticleRecord[] {
  return getRepository().externalArticles;
}

export function getExternalArticleBySlug(slug: string): ExternalArticleRecord | undefined {
  return getExternalArticles().find((article) => article.slug === slug);
}

export function getAuthors() {
  return getRepository().authors;
}

export function getAuthorById(id: string) {
  return getAuthors().find((author) => author.id === id);
}

export function getIssues(): IssueRecord[] {
  return getRepository().issues;
}

export function getIssueById(id: string): IssueRecord | undefined {
  return getIssues().find((issue) => issue.id === id);
}

export function getSelections() {
  return getRepository().selections;
}

export function getArticlesForAuthor(authorId: string): ArticleRecord[] {
  return getPublishedArticles().filter((article) => article.authors.some((author) => author.authorId === authorId));
}

export function getArticlesForIssue(issueId: string): ArticleRecord[] {
  const issue = getIssueById(issueId);
  if (!issue) {
    return [];
  }
  return getPublishedArticles().filter(
    (article) => article.volume === issue.volume && article.issue === issue.issue
  );
}

export function getFeaturedExternalArticles(): ExternalArticleRecord[] {
  const selections = getSelections();
  return selections
    .sort((a, b) => a.order - b.order)
    .map((selection) => getExternalArticleBySlug(selection.externalArticleSlug))
    .filter((article): article is ExternalArticleRecord => Boolean(article));
}
