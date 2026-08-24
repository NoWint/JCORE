import type { Diagnostic } from '../../../scripts/validate/diagnostics';

export interface Heading {
  level: number;
  text: string;
  id: string;
}

export type MediaKind = 'image' | 'embed' | 'video';

export interface MediaReference {
  src: string;
  kind: MediaKind;
}

export interface ArticleReference {
  target: string;
  source: string;
}

export interface ArticleStructure {
  headings: Heading[];
  ids: Set<string>;
  references: ArticleReference[];
}

export interface ArticleRenderOptions {
  base?: string;
}

export interface ArticleRenderReport {
  html: string;
  headings: Heading[];
  media: MediaReference[];
  diagnostics: Diagnostic[];
}
