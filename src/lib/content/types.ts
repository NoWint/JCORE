import type {
  ArticleMetadata,
  Author,
  ExternalArticleMetadata,
  IssueMetadata,
  Selection
} from './contracts';
import type { Locale } from '../i18n';
import type { Diagnostic } from '../../../scripts/validate/diagnostics';

export type LocalizedBody = Partial<Record<Locale, string>>;

export type ArticleRecord = ArticleMetadata & {
  body: string;
  bodyByLocale?: LocalizedBody;
  conversionDiagnostics?: Diagnostic[];
};

export type ExternalArticleRecord = ExternalArticleMetadata & {
  body: string;
  bodyByLocale?: LocalizedBody;
  conversionDiagnostics?: Diagnostic[];
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
