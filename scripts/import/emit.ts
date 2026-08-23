import { serializeFrontmatter, serializeImportReport } from './report';
import type { ImportArtifacts, ImportReport } from './types';
import type { StagingArea } from './writer';

export async function emitImport(report: ImportReport, staging: StagingArea, targetRoot: string): Promise<ImportArtifacts> {
  if (report.status !== 'success') {
    throw new Error('Cannot emit a failed import report');
  }

  const targetDir = `${targetRoot}/${report.manifest.targetSlug}`;
  const indexContent = serializeFrontmatter(report.normalized.metadata);
  const reportContent = serializeImportReport(report);

  await staging.write('index.md', indexContent);
  await staging.write('body.md', report.normalized.body);
  await staging.write('import-report.json', reportContent);

  for (const asset of report.normalized.assets) {
    await staging.write(`assets/${asset.path}`, asset.data);
  }

  await staging.commit(targetDir);

  return {
    targetDir,
    files: [
      { path: 'index.md', content: indexContent },
      { path: 'body.md', content: report.normalized.body },
      { path: 'import-report.json', content: reportContent }
    ],
    assets: report.normalized.assets
  };
}
