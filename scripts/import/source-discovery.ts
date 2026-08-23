import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import * as tar from 'tar';
import { checksumData } from './checksum';
import { resolveArxiv } from './clients/arxiv';
import { resolveCrossref } from './clients/crossref';
import type { ImportManifest } from './manifest';
import type { DoiResolution, ImportSource } from './types';

async function filesFromDirectory(directory: string): Promise<ImportSource['files']> {
  const files: ImportSource['files'] = [];
  const entries = await readdir(directory, { recursive: true });
  for (const entry of entries) {
    const fullPath = join(directory, String(entry));
    if ((await stat(fullPath)).isFile()) {
      files.push({ path: String(entry), data: new Uint8Array(await readFile(fullPath)) });
    }
  }
  return files;
}

async function filesFromTar(data: Uint8Array): Promise<ImportSource['files']> {
  const root = await mkdtemp(join(tmpdir(), 'jcore-arxiv-'));
  const archive = join(root, 'source.tar');
  const extractDir = join(root, 'extracted');
  try {
    await writeFile(archive, data);
    await mkdir(extractDir, { recursive: true });
    await tar.x({ file: archive, cwd: extractDir });
    const files: ImportSource['files'] = [];
    const entries = await readdir(extractDir, { recursive: true });
    for (const entry of entries) {
      const fullPath = join(extractDir, String(entry));
      if ((await stat(fullPath)).isFile()) {
        files.push({ path: relative(extractDir, fullPath), data: new Uint8Array(await readFile(fullPath)) });
      }
    }
    return files;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function loadSource(manifest: ImportManifest): Promise<ImportSource | undefined> {
  if (manifest.sourcePackagePath) {
    return {
      packagePath: manifest.sourcePackagePath,
      checksum: checksumData(JSON.stringify(await filesFromDirectory(manifest.sourcePackagePath))),
      files: await filesFromDirectory(manifest.sourcePackagePath)
    };
  }

  if (manifest.officialIdentifier.startsWith('arXiv:') || /^\d{4}\.\d{4,5}$/.test(manifest.officialIdentifier)) {
    const id = manifest.officialIdentifier.replace(/^arXiv:/, '');
    const response = await fetch(`https://export.arxiv.org/e-print/${id}`);
    if (!response.ok) {
      throw new Error(`arXiv source download failed with ${response.status}`);
    }
    const data = new Uint8Array(await response.arrayBuffer());
    return {
      packagePath: `arxiv:${id}`,
      checksum: checksumData(data),
      files: await filesFromTar(data)
    };
  }

  return undefined;
}

export async function discoverDoi(manifest: ImportManifest): Promise<DoiResolution> {
  const isArxiv = manifest.officialIdentifier.startsWith('arXiv:') || /^\d{4}\.\d{4,5}$/.test(manifest.officialIdentifier);
  const metadata = isArxiv
    ? await resolveArxiv(manifest.officialIdentifier.replace(/^arXiv:/, ''))
    : await resolveCrossref(manifest.officialIdentifier);
  const source = await loadSource(manifest);

  if (!source) {
    return {
      identifier: manifest.officialIdentifier,
      metadata: {
        title: metadata.title,
        authors: metadata.authors,
        abstract: '',
        venue: undefined,
        published: metadata.published
      },
      source: { packagePath: '', checksum: '', files: [] },
      sourceFormat: 'latex',
      checksum: '',
      retrievalDate: manifest.retrievalDate,
      rights: manifest.rights,
      status: 'metadata-only',
      diagnostics: []
    };
  }

  return {
    identifier: manifest.officialIdentifier,
    metadata: {
      title: metadata.title,
      authors: metadata.authors,
      abstract: '',
      published: metadata.published
    },
    source,
    sourceFormat: source.files.some((file) => file.path.endsWith('.xml')) ? 'jats' : 'latex',
    rootDocument: source.files.some((file) => file.path.endsWith('.xml')) ? undefined : 'main.tex',
    checksum: source.checksum,
    retrievalDate: manifest.retrievalDate,
    rights: manifest.rights,
    status: 'full-text',
    diagnostics: []
  };
}
