import { serializeFrontmatter, serializeImportReport } from './report';
import type { ImportArtifacts, ImportReport, ImportSource } from './types';
import type { StagingArea } from './writer';

async function emitSuccessfulImport(
  report: Extract<ImportReport, { status: 'success' }>,
  source: ImportSource | undefined,
  staging: StagingArea,
  targetRoot: string
): Promise<ImportArtifacts> {
  const targetDir = `${targetRoot}/${report.manifest.targetSlug}`;
  const indexContent = serializeFrontmatter(report.normalized.metadata);
  const reportContent = serializeImportReport(report);
  const files: Array<{ path: string; content: string }> = [{ path: 'index.md', content: indexContent }];

  await staging.write('index.md', indexContent);
  if (report.normalized.renderMode !== 'source-fallback') {
    await staging.write('body.md', report.normalized.body);
    files.push({ path: 'body.md', content: report.normalized.body });
  }
  await staging.write('import-report.json', reportContent);
  files.push({ path: 'import-report.json', content: reportContent });

  for (const asset of report.normalized.assets) {
    await staging.write(`assets/${asset.path}`, asset.data);
  }

  const sourceFiles: string[] = [];
  for (const sourceFile of source?.files ?? []) {
    const targetPath = `source/${sourceFile.path}`;
    await staging.write(targetPath, sourceFile.data);
    sourceFiles.push(targetPath);
  }

  await staging.commit(targetDir);

  return {
    targetDir,
    files,
    assets: report.normalized.assets,
    sourceFiles
  };
}

export async function emitImport(
  report: ImportReport,
  staging: StagingArea,
  targetRoot: string,
  source?: ImportSource
): Promise<ImportArtifacts> {
  if (report.status !== 'success') {
    throw new Error('Cannot emit a failed import report');
  }
  return emitSuccessfulImport(report, source, staging, targetRoot);
}

export async function emitFallbackImport(
  report: ImportReport,
  source: ImportSource,
  staging: StagingArea,
  targetRoot: string
): Promise<ImportArtifacts> {
  if (report.status !== 'success' || report.normalized.renderMode !== 'source-fallback') {
    throw new Error('Cannot emit a non-fallback import as a fallback bundle');
  }
  return emitSuccessfulImport(report, source, staging, targetRoot);
}
