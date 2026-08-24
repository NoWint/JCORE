import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { parse as parseYaml, stringify } from 'yaml';

type ApiEntry = {
  id: string;
  title: string;
  summary: string;
  published: string;
  author: Array<{ name: string }>;
};

type ImportReport = {
  normalized: {
    renderMode: 'structured' | 'source-fallback';
    sourceFormat: 'latex' | 'pdf' | 'jats' | 'markdown' | 'doi';
    conversion: {
      status: 'converted' | 'fallback';
      importer: string;
      outputChecksum: string;
      reportPath: string;
    };
  };
};

const corpus = {
  'adam-method-stochastic-optimization': {
    arxiv: '1412.6980',
    venue: 'International Conference on Learning Representations (ICLR 2015)',
    keywords: ['optimization', 'stochastic optimization', 'neural networks']
  },
  'deep-residual-learning-image-recognition': {
    arxiv: '1512.03385',
    venue: 'IEEE Conference on Computer Vision and Pattern Recognition (CVPR 2016)',
    keywords: ['residual networks', 'computer vision', 'image recognition']
  },
  'batch-normalization-deep-network-training': {
    arxiv: '1502.03167',
    venue: 'International Conference on Machine Learning (ICML 2015)',
    keywords: ['batch normalization', 'deep learning', 'optimization']
  },
  'vision-transformer': {
    arxiv: '2010.11929',
    venue: 'International Conference on Learning Representations (ICLR 2021)',
    keywords: ['transformer', 'computer vision', 'image classification']
  },
  'language-models-few-shot-learners': {
    arxiv: '2005.14165',
    venue: 'Advances in Neural Information Processing Systems (NeurIPS 2020)',
    keywords: ['language models', 'few-shot learning', 'scaling']
  },
  'retrieval-augmented-generation': {
    arxiv: '2005.11401',
    venue: 'Advances in Neural Information Processing Systems (NeurIPS 2020)',
    keywords: ['retrieval-augmented generation', 'language models', 'knowledge-intensive NLP']
  },
  'lora-low-rank-adaptation': {
    arxiv: '2106.09685',
    venue: 'International Conference on Learning Representations (ICLR 2022)',
    keywords: ['parameter-efficient fine-tuning', 'low-rank adaptation', 'large language models']
  },
  'direct-preference-optimization': {
    arxiv: '2305.18290',
    venue: 'Advances in Neural Information Processing Systems (NeurIPS 2023)',
    keywords: ['preference optimization', 'language model alignment', 'reinforcement learning from human feedback']
  },
  'mamba-linear-time-sequence-modeling': {
    arxiv: '2312.00752',
    venue: 'Conference on Language Modeling (COLM 2024)',
    keywords: ['state space models', 'sequence modeling', 'efficient inference']
  },
  'deepseek-r1-reasoning': {
    arxiv: '2501.12948',
    venue: 'Nature (2025), with an earlier arXiv technical report',
    keywords: ['reasoning', 'reinforcement learning', 'large language models']
  },
  'switch-transformers-sparse-models': {
    arxiv: '2101.03961',
    venue: 'Journal of Machine Learning Research (2022)',
    keywords: ['mixture of experts', 'sparse models', 'transformer']
  },
  'denoising-diffusion-probabilistic-models': {
    arxiv: '2006.11239',
    venue: 'Advances in Neural Information Processing Systems (NeurIPS 2020)',
    keywords: ['diffusion models', 'generative modeling', 'image synthesis']
  },
  'latent-diffusion-models': {
    arxiv: '2112.10752',
    venue: 'IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR 2022)',
    keywords: ['latent diffusion', 'image synthesis', 'text-to-image generation']
  },
  'tvm-optimizing-compiler': {
    arxiv: '1802.04799',
    venue: 'USENIX Symposium on Operating Systems Design and Implementation (OSDI 2018)',
    keywords: ['deep learning compiler', 'operator optimization', 'hardware acceleration']
  },
  'mlir-compiler-infrastructure': {
    arxiv: '2002.11054',
    venue: 'IEEE/ACM International Symposium on Code Generation and Optimization (CGO 2021)',
    keywords: ['compiler infrastructure', 'intermediate representation', 'machine learning systems']
  },
  'ansor-tensor-programs': {
    arxiv: '2006.06762',
    venue: 'USENIX Symposium on Operating Systems Design and Implementation (OSDI 2020)',
    keywords: ['tensor programs', 'auto-tuning', 'deep learning compiler']
  },
  'clip-visual-language-supervision': {
    arxiv: '2103.00020',
    venue: 'International Conference on Machine Learning (ICML 2021)',
    keywords: ['vision-language models', 'contrastive learning', 'zero-shot learning']
  }
} as const;

const stagingRoots = [
  '/tmp/jcore-import-staging-20260824b',
  '/tmp/jcore-import-staging-20260824c'
];

const parser = new XMLParser({ ignoreAttributes: false });

function asArray<T>(value: T | T[] | undefined): T[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function cleanBody(body: string): string {
  return body
    .replace(/!\[([^\]]*)\]\([^)]*\)(?:\{[^}]*\})?/g, (_match, caption: string) =>
      caption.trim() ? `> Figure: ${caption.trim()}` : ''
    )
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function fallbackBody(title: string, abstract: string, officialUrl: string): string {
  return [
    '# Abstract',
    '',
    abstract.trim(),
    '',
    '## Source fallback',
    '',
    `The structured conversion for **${title}** was not accepted by the LaTeX preflight. JCORE keeps the original paper available through the official source link so that the publication record remains useful without presenting a partially converted document as complete full text.`,
    '',
    `Official source: ${officialUrl}`
  ].join('\n');
}

function findStaging(slug: string): string | undefined {
  for (const root of stagingRoots) {
    const candidate = join(root, slug);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

async function main(): Promise<void> {
  const xml = await readFile('/tmp/jcore-arxiv-metadata-all.xml', 'utf8');
  const parsed = parser.parse(xml) as { feed?: { entry?: ApiEntry | ApiEntry[] } };
  const entries = new Map(
    asArray(parsed.feed?.entry).map((entry) => [entry.id.match(/\/abs\/([^v]+)(?:v\d+)?$/)?.[1], entry])
  );

  for (const [slug, config] of Object.entries(corpus)) {
    const entry = entries.get(config.arxiv);
    if (!entry) throw new Error(`Missing arXiv metadata for ${config.arxiv}`);
    const staging = findStaging(slug);
    if (!staging) {
      console.warn(`Skipping ${slug}: no successful staging record is available`);
      continue;
    }
    const report = JSON.parse(await readFile(join(staging, 'import-report.json'), 'utf8')) as ImportReport;
    const manifest = parseYaml(
      await readFile(join(process.cwd(), 'sources', 'manifests', `${slug}.yaml`), 'utf8')
    ) as {
      retrievalDate: string;
      expectedChecksum: string;
      rights: {
        licenseId: string;
        licenseUrl: string;
        copyrightHolder: string;
        statement: string;
        evidenceUrl: string;
        permitsRedistribution: boolean;
      };
      importerVersion: string;
    };
    const title = entry.title.replace(/\s+/g, ' ').trim();
    const abstract = entry.summary.replace(/\s+/g, ' ').trim();
    const officialUrl = `https://arxiv.org/abs/${config.arxiv}`;
    const fallback = report.normalized.renderMode === 'source-fallback';
    const pdfPath = `/sources/${slug}/${slug}.pdf`;
    const sourceFiles = fallback
      ? [{ path: pdfPath, label: 'Original PDF', kind: 'pdf' as const }]
      : [];
    const metadata = {
      kind: 'external' as const,
      slug,
      title: { en: title },
      abstract: { en: abstract },
      keywords: config.keywords.map((keyword) => ({ en: keyword })),
      bodyLanguage: 'en' as const,
      renderMode: report.normalized.renderMode,
      sourceFormat: report.normalized.sourceFormat,
      sourceFiles,
      conversion: report.normalized.conversion,
      contributors: asArray(entry.author).map((author) => ({ name: author.name.trim() })),
      originalVenue: config.venue,
      originalPublisher: 'arXiv',
      originalPublicationDate: entry.published.slice(0, 10),
      identifiers: { arxiv: config.arxiv },
      officialUrl,
      rights: {
        license: { id: manifest.rights.licenseId, url: manifest.rights.licenseUrl },
        copyrightHolder: manifest.rights.copyrightHolder,
        statement: manifest.rights.statement,
        evidenceUrl: manifest.rights.evidenceUrl,
        permitsRedistribution: manifest.rights.permitsRedistribution
      },
      provenance: {
        sourceFormat: report.normalized.sourceFormat,
        retrievalDate: manifest.retrievalDate,
        checksum: manifest.expectedChecksum,
        sourcePackagePath: `sources/latex/${config.arxiv}`,
        importer: manifest.importerVersion
      },
      ...(fallback ? { pdf: pdfPath } : {}),
      notPublishedByJCORE: true as const
    };
    const target = join(process.cwd(), 'content', 'external-articles', slug);
    await mkdir(target, { recursive: true });
    await writeFile(join(target, 'index.md'), `---\n${stringify(metadata, { sortMapEntries: true })}---\n`);
    const body = fallback
      ? fallbackBody(title, abstract, officialUrl)
      : cleanBody(await readFile(join(staging, 'body.md'), 'utf8'));
    await writeFile(join(target, 'body.md'), `${body}\n`);
    await cp(join(staging, 'import-report.json'), join(target, 'import-report.json'));
  }
}

void main();
