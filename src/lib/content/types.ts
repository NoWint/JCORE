import type {
  ArticleMetadata,
  Author,
  ExternalArticleMetadata,
  IssueMetadata,
  Selection
} from './contracts';

export type ArticleRecord = ArticleMetadata & {
  body: string;
};

export type ExternalArticleRecord = ExternalArticleMetadata & {
  body: string;
};

export type AuthorRecord = Author;
export type IssueRecord = IssueMetadata;
export type SelectionRecord = Selection;

export interface CollectionIndex {
  articles: ArticleRecord[];
  externalArticles: ExternalArticleRecord[];
  authors: AuthorRecord[];
  issues: IssueRecord[];
  selections: SelectionRecord[];
}
