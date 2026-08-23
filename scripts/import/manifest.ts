import { z } from 'zod';
import { slugSchema, urlStringSchema } from '../../src/lib/content/contracts';

export const importManifestSchema = z
  .object({
    sourceType: z.enum(['latex', 'jats', 'doi']),
    articleKind: z.enum(['jcore', 'external']),
    targetSlug: slugSchema,
    officialIdentifier: z.string().min(1),
    officialUrl: urlStringSchema,
    sourcePackagePath: z.string().min(1).optional(),
    expectedChecksum: z.string().regex(/^[a-f0-9]{64}$/, 'Checksum must be a SHA-256 hex digest').optional(),
    retrievalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Retrieval date must use YYYY-MM-DD'),
    rights: z
      .object({
        licenseId: z.string().min(1),
        licenseUrl: urlStringSchema,
        copyrightHolder: z.string().min(1),
        statement: z.string().min(1),
        evidenceUrl: urlStringSchema,
        permitsRedistribution: z.boolean()
      })
      .strict(),
    importerVersion: z.string().min(1)
  })
  .strict();

export type ImportManifest = z.infer<typeof importManifestSchema>;
