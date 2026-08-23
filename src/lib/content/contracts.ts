import { z } from 'zod';

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a lowercase kebab-case slug');

export const urlStringSchema = z.string().refine((value) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}, 'Must be a valid absolute URL');

export const localizedTextSchema = z
  .object({
    en: z.string().min(1),
    zh: z.string().optional()
  })
  .strict();

const orcidSchema = z
  .string()
  .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, 'ORCID must use 0000-0000-0000-0000 format');

export const affiliationSchema = z
  .object({
    id: slugSchema,
    name: localizedTextSchema,
    department: localizedTextSchema.optional(),
    city: z.string().optional(),
    country: z.string().optional()
  })
  .strict();

export const authorRefSchema = z
  .object({
    authorId: z.string().min(1),
    order: z.number().int().positive(),
    corresponding: z.boolean().optional(),
    equalContribution: z.boolean().optional()
  })
  .strict();

export const publicationEventSchema = z
  .object({
    type: z.enum(['submitted', 'revised', 'accepted', 'version-of-record']),
    date: z.coerce.date(),
    note: localizedTextSchema.optional()
  })
  .strict();

export const licenseSchema = z
  .object({
    id: z.string().min(1),
    url: urlStringSchema,
    holder: z.string().min(1),
    statement: z.string().min(1)
  })
  .strict();

export const rightsSchema = z
  .object({
    license: z
      .object({
        id: z.string().min(1),
        url: urlStringSchema
      })
      .strict(),
    copyrightHolder: z.string().min(1),
    statement: z.string().min(1),
    evidenceUrl: urlStringSchema,
    permitsRedistribution: z.boolean()
  })
  .strict();

export const provenanceSchema = z
  .object({
    sourceFormat: z.enum(['latex', 'jats', 'markdown', 'manual']),
    retrievalDate: z.coerce.date(),
    checksum: z.string().regex(/^[a-f0-9]{64}$/, 'Checksum must be a SHA-256 hex digest'),
    sourcePackagePath: z.string().min(1),
    importer: z.string().min(1)
  })
  .strict();

const orderedAuthors = z
  .array(authorRefSchema)
  .min(1)
  .refine(
    (authors) => new Set(authors.map((author) => author.order)).size === authors.length,
    'Author orders must be unique'
  )
  .refine(
    (authors) => new Set(authors.map((author) => author.authorId)).size === authors.length,
    'An author can appear only once per article'
  );

export const articleMetadataSchema = z
  .object({
    kind: z.literal('jcore'),
    id: z
      .string()
      .regex(/^JCORE-\d{4}-\d{4}$/, 'JCORE articles use stable IDs like JCORE-2026-0001'),
    title: localizedTextSchema,
    abstract: localizedTextSchema,
    keywords: z.array(localizedTextSchema).min(1),
    bodyLanguage: z.enum(['en', 'zh']),
    authors: orderedAuthors,
    articleType: z.enum(['research-article', 'review-article', 'research-note', 'replication-study']),
    status: z.literal('published'),
    volume: z.number().int().positive(),
    issue: z.number().int().positive(),
    year: z.number().int().positive(),
    dates: z
      .object({
        received: z.coerce.date(),
        accepted: z.coerce.date(),
        published: z.coerce.date()
      })
      .strict()
      .refine(
        (dates) => dates.received <= dates.accepted && dates.accepted <= dates.published,
        'Received, accepted, and published dates must be in order'
      ),
    events: z.array(publicationEventSchema).default([]),
    license: licenseSchema,
    doi: z.string().min(1).optional(),
    pdf: z.string().optional(),
    code: z.string().optional(),
    dataset: z.string().optional(),
    supplementary: z
      .array(
        z
          .object({
            label: z.string().min(1),
            url: urlStringSchema
          })
          .strict()
      )
      .optional(),
    demo: z.boolean()
  })
  .strict();

export const externalArticleMetadataSchema = z
  .object({
    kind: z.literal('external'),
    slug: slugSchema,
    title: localizedTextSchema,
    abstract: localizedTextSchema,
    keywords: z.array(localizedTextSchema).min(1),
    bodyLanguage: z.enum(['en', 'zh']),
    contributors: z
      .array(
        z
          .object({
            name: z.string().min(1),
            affiliation: z.string().optional(),
            orcid: orcidSchema.optional()
          })
          .strict()
      )
      .min(1),
    originalVenue: z.string().min(1),
    originalPublisher: z.string().optional(),
    originalPublicationDate: z.coerce.date(),
    identifiers: z
      .object({
        doi: z.string().min(1).optional(),
        arxiv: z.string().min(1).optional()
      })
      .strict()
      .refine((identifiers) => Boolean(identifiers.doi || identifiers.arxiv), 'Provide a DOI or arXiv identifier'),
    officialUrl: urlStringSchema,
    rights: rightsSchema,
    provenance: provenanceSchema,
    pdf: z.string().optional(),
    notPublishedByJCORE: z.literal(true)
  })
  .strict();

export const authorSchema = z
  .object({
    kind: z.literal('author'),
    id: slugSchema,
    name: localizedTextSchema,
    affiliations: z.array(affiliationSchema).min(1),
    bio: localizedTextSchema.optional(),
    orcid: orcidSchema.optional(),
    links: z
      .object({
        github: urlStringSchema.optional(),
        website: urlStringSchema.optional()
      })
      .strict()
      .optional(),
    researchInterests: z.array(localizedTextSchema).optional(),
    demo: z.boolean()
  })
  .strict();

export const issueMetadataSchema = z
  .object({
    kind: z.literal('issue'),
    id: slugSchema,
    volume: z.number().int().positive(),
    issue: z.number().int().positive(),
    year: z.number().int().positive(),
    title: localizedTextSchema,
    editorial: localizedTextSchema.optional(),
    published: z.coerce.date(),
    demo: z.boolean()
  })
  .strict();

export const selectionSchema = z
  .object({
    kind: z.literal('selection'),
    id: slugSchema,
    title: localizedTextSchema,
    externalArticleSlug: slugSchema,
    editorialNote: localizedTextSchema,
    order: z.number().int().min(0)
  })
  .strict();

export type LocalizedText = z.infer<typeof localizedTextSchema>;
export type ArticleMetadata = z.infer<typeof articleMetadataSchema>;
export type ExternalArticleMetadata = z.infer<typeof externalArticleMetadataSchema>;
export type Author = z.infer<typeof authorSchema>;
export type IssueMetadata = z.infer<typeof issueMetadataSchema>;
export type Selection = z.infer<typeof selectionSchema>;
export type PublicationEvent = z.infer<typeof publicationEventSchema>;
export type Rights = z.infer<typeof rightsSchema>;
export type Provenance = z.infer<typeof provenanceSchema>;
