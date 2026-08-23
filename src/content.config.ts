import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  articleMetadataSchema,
  authorSchema,
  externalArticleMetadataSchema,
  issueMetadataSchema,
  selectionSchema
} from './lib/content/contracts';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/articles' }),
  schema: articleMetadataSchema
});

const externalArticles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/external-articles' }),
  schema: externalArticleMetadataSchema
});

const authors = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: './content/authors' }),
  schema: authorSchema
});

const issues = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: './content/issues' }),
  schema: issueMetadataSchema
});

const selections = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: './content/selections' }),
  schema: selectionSchema
});

export const collections = {
  articles,
  externalArticles,
  authors,
  issues,
  selections
};
