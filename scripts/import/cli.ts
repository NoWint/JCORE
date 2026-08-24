import { access, cp, mkdir, readFile, readdir, rm, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parse as parseYaml } from 'yaml';
import { DoiAdapter } from './adapters/doi';
import { JatsAdapter } from './adapters/jats';
import { LatexAdapter } from './adapters/latex';
import { MarkdownAdapter } from './adapters/markdown';
import { PdfAdapter } from './adapters/pdf';
import { emitFallbackImport, emitImport } from './emit';
import { importManifestSchema, type ImportManifest } from './manifest';
import { discoverDoi, loadSourceFromPath } from './source-discovery';
import { runImport } from './run-import';
import { formatDiagnostic, type Diagnostic } from '../validate/diagnostics';
import type { ImportSource, ImportSourceType, SourceAdapter } from './types';
import { createStagingArea } from './writer';

const execFileAsync = promisify(execFile);
const HELP = `Usage: npm run jcore -- <command> [options]

Commands:
  inspect <input> [--json]
  import <input> --manifest <file> [--staging <dir>]
  validate <path>
  promote <staged-record> [--content-root <dir>] [--public-root <dir>] [--force]
  report <record> [--json]
`;

export interface CliIo {
  stdout?: (message: string) => void;
  stderr?: (message: string) => void;
}

const output = (io: CliIo, message: string): void => (io.stdout ?? console.log)(message);
const errorOutput = (io: CliIo, message: string): void => (io.stderr ?? console.error)(message);

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function sourceTypeFromExtension(inputPath: string): ImportSourceType | undefined {
  const lower = inputPath.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'markdown';
  if (lower.endsWith('.xml')) return 'jats';
  if (lower.endsWith('.tex')) return 'latex';
  if (/^(?:10\.\d{4,9}\/\S+|arxiv:\S+|\d{4}\.\d{4,5})$/i.test(inputPath)) return 'doi';
  return undefined;
}

export async function detectSourceType(inputPath: string): Promise<ImportSourceType> {
  const byExtension = sourceTypeFromExtension(inputPath);
  if (byExtension) {
    return byExtension;
  }

  if (/\.(?:tar|tar\.gz|tgz)$/i.test(inputPath)) {
    const source = await loadSourceFromPath(inputPath);
    if (source.files.some((file) => file.path.toLowerCase().endsWith('.xml'))) return 'jats';
    if (source.files.some((file) => /\.(?:md|markdown)$/i.test(file.path))) return 'markdown';
    return 'latex';
  }

  const inputStat = await stat(inputPath);
  if (!inputStat.isDirectory()) {
    throw new Error(`Cannot detect source type for ${inputPath}`);
  }

  const entries = await readdir(inputPath, { recursive: true });
  const paths = entries.map(String);
  if (paths.some((path) => path.toLowerCase().endsWith('.xml'))) return 'jats';
  if (paths.some((path) => path.toLowerCase().endsWith('.tex'))) return 'latex';
  if (paths.some((path) => /\.(?:md|markdown)$/i.test(path))) return 'markdown';
  if (paths.some((path) => path.toLowerCase().endsWith('.pdf'))) return 'pdf';
  throw new Error(`Cannot detect source type for directory ${inputPath}`);
}

function parseArgs(args: string[]): { positionals: string[]; flags: Map<string, string | true> } {
  const positionals: string[] = [];
  const flags = new Map<string, string | true>();
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (!value.startsWith('--')) {
      positionals.push(value);
      continue;
    }
    const name = value.slice(2);
    const next = args[index + 1];
    if (next && !next.startsWith('--')) {
      flags.set(name, next);
      index += 1;
    } else {
      flags.set(name, true);
    }
  }
  return { positionals, flags };
}

async function readManifest(path: string, input: string, detectedType: ImportSourceType): Promise<ImportManifest> {
  const raw = parseYaml(await readFile(resolve(path), 'utf8')) as Record<string, unknown>;
  const withSource = {
    ...raw,
    sourceType: raw.sourceType ?? detectedType,
    sourcePackagePath:
      raw.sourcePackagePath ??
      (detectedType === 'doi' ? undefined : resolve(input))
  };
  const result = importManifestSchema.safeParse(withSource);
  if (!result.success) {
    throw new Error(`Invalid import manifest: ${result.error.message}`);
  }
  return result.data;
}

function sourceAdapter(
  sourceType: ImportSourceType,
  doiResolution?: Awaited<ReturnType<typeof discoverDoi>>
): SourceAdapter<unknown> {
  const latex = new LatexAdapter();
  const jats = new JatsAdapter();
  if (sourceType === 'latex') return latex;
  if (sourceType === 'jats') return jats;
  if (sourceType === 'markdown') return new MarkdownAdapter();
  if (sourceType === 'pdf') return new PdfAdapter();
  return new DoiAdapter(
    doiResolution ? new Map([[doiResolution.identifier, doiResolution]]) : new Map(),
    latex,
    jats
  );
}

async function loadCliSource(
  manifest: ImportManifest,
  input: string
): Promise<{ source: ImportSource; resolution?: Awaited<ReturnType<typeof discoverDoi>> }> {
  if (manifest.sourceType === 'doi') {
    const resolution = await discoverDoi(manifest);
    return { source: resolution.source, resolution };
  }
  return {
    source: await loadSourceFromPath(manifest.sourcePackagePath ?? resolve(input))
  };
}

function inspectionManifest(sourceType: ImportSourceType): ImportManifest {
  return {
    sourceType,
    articleKind: 'external',
    targetSlug: 'inspection',
    officialIdentifier: 'inspection',
    officialUrl: 'https://example.com/inspection',
    retrievalDate: '2026-08-24',
    rights: {
      licenseId: 'inspection',
      licenseUrl: 'https://example.com/license',
      copyrightHolder: 'Inspection',
      statement: 'Inspection only.',
      evidenceUrl: 'https://example.com/inspection',
      permitsRedistribution: true
    },
    importerVersion: 'inspection'
  };
}

async function inspectInput(input: string): Promise<Record<string, unknown>> {
  const sourceType = await detectSourceType(input);
  if (sourceType === 'doi') {
    return { input, sourceType, converter: { networkResolution: 'available' } };
  }
  const source = await loadSourceFromPath(input);
  const adapter = sourceAdapter(sourceType);
  const diagnostics = await adapter.inspect(inspectionManifest(sourceType), source);
  const rootCandidates = source.files
    .map((file) => file.path)
    .filter((path) => /\.(?:tex|xml|md|markdown|pdf)$/i.test(path));
  let pdftotextAvailable: boolean;
  try {
    await execFileAsync('pdftotext', ['-v']);
    pdftotextAvailable = true;
  } catch {
    pdftotextAvailable = false;
  }
  return {
    input: resolve(input),
    sourceType,
    packagePath: source.packagePath,
    checksum: source.checksum,
    files: source.files.map((file) => file.path),
    rootCandidates,
    converter: { pdftotext: pdftotextAvailable },
    diagnostics
  };
}

async function importInput(input: string, flags: Map<string, string | true>, io: CliIo): Promise<number> {
  const manifestPath = flags.get('manifest');
  if (typeof manifestPath !== 'string') {
    errorOutput(io, 'import requires --manifest <file>');
    return 2;
  }
  const detectedType = await detectSourceType(input);
  const manifest = await readManifest(manifestPath, input, detectedType);
  const { source, resolution } = await loadCliSource(manifest, input);
  const report = await runImport(manifest, {
    async loadSource() {
      return source;
    },
    getAdapter() {
      return sourceAdapter(manifest.sourceType, resolution);
    }
  });

  if (report.status === 'failure') {
    report.diagnostics.forEach((diagnostic) => errorOutput(io, formatDiagnostic(diagnostic)));
    return 1;
  }

  const stagingRoot =
    typeof flags.get('staging') === 'string' ? resolve(flags.get('staging') as string) : join(process.cwd(), '.jcore', 'staging');
  const staging = await createStagingArea();
  try {
    if (report.normalized.renderMode === 'source-fallback') {
      await emitFallbackImport(report, source, staging, stagingRoot);
    } else {
      await emitImport(report, staging, stagingRoot, source);
    }
    output(
      io,
      `${report.normalized.renderMode === 'source-fallback' ? 'Fallback' : 'Imported'} ${report.manifest.targetSlug} -> ${join(stagingRoot, report.manifest.targetSlug)}`
    );
    return 0;
  } finally {
    await staging.cleanup();
  }
}

export async function promoteRecord(
  stagedRecord: string,
  targetDir: string,
  options: { publicRoot?: string; force?: boolean } = {}
): Promise<void> {
  const sourceRecord = resolve(stagedRecord);
  const destination = resolve(targetDir);
  if (!(await pathExists(sourceRecord))) {
    throw new Error(`Staged record does not exist at ${sourceRecord}`);
  }
  if ((await pathExists(destination)) && !options.force) {
    throw new Error(`Cannot promote record: target already exists at ${destination}`);
  }
  if (options.force) {
    await rm(destination, { recursive: true, force: true });
  }
  await mkdir(destination, { recursive: true });
  await cp(sourceRecord, destination, { recursive: true, force: true });

  const sourceDir = join(sourceRecord, 'source');
  if (options.publicRoot && (await pathExists(sourceDir))) {
    const publicTarget = join(resolve(options.publicRoot), basename(destination));
    if (options.force) {
      await rm(publicTarget, { recursive: true, force: true });
    }
    await mkdir(publicTarget, { recursive: true });
    await cp(sourceDir, publicTarget, { recursive: true, force: true });
  }
}

async function validateRecord(recordPath: string, io: CliIo): Promise<number> {
  const reportPath = join(resolve(recordPath), 'import-report.json');
  if (!(await pathExists(reportPath))) {
    errorOutput(io, `Missing import-report.json at ${reportPath}`);
    return 1;
  }
  const report = JSON.parse(await readFile(reportPath, 'utf8')) as {
    status: 'success' | 'failure';
    normalized?: { renderMode?: string; sourceFiles?: Array<{ path: string }> };
    diagnostics?: Diagnostic[];
  };
  if (report.status !== 'success') {
    report.diagnostics?.forEach((diagnostic) => errorOutput(io, formatDiagnostic(diagnostic)));
    return 1;
  }
  if (report.normalized?.renderMode === 'source-fallback' && !(await pathExists(join(resolve(recordPath), 'source')))) {
    errorOutput(io, 'Fallback record is missing its preserved source directory');
    return 1;
  }
  output(io, `Valid import record: ${resolve(recordPath)}`);
  return 0;
}

async function printReport(recordPath: string, json: boolean, io: CliIo): Promise<number> {
  const reportPath = join(resolve(recordPath), 'import-report.json');
  if (!(await pathExists(reportPath))) {
    errorOutput(io, `Missing import-report.json at ${reportPath}`);
    return 1;
  }
  const contents = await readFile(reportPath, 'utf8');
  if (json) {
    output(io, contents);
    return 0;
  }
  const report = JSON.parse(contents) as {
    status: string;
    normalized?: { renderMode?: string; conversion?: { importer?: string } };
    diagnostics?: Diagnostic[];
  };
  output(io, `Status: ${report.status}`);
  if (report.normalized?.renderMode) output(io, `Render mode: ${report.normalized.renderMode}`);
  if (report.normalized?.conversion?.importer) output(io, `Importer: ${report.normalized.conversion.importer}`);
  report.diagnostics?.forEach((diagnostic) => output(io, formatDiagnostic(diagnostic)));
  return report.status === 'failure' ? 1 : 0;
}

export async function runCli(argv: string[], io: CliIo = {}): Promise<number> {
  const command = argv[0];
  if (!command || command === '--help' || command === 'help') {
    output(io, HELP);
    return 0;
  }
  const { positionals, flags } = parseArgs(argv.slice(1));
  try {
    if (command === 'inspect') {
      const input = positionals[0];
      if (!input) throw new Error('inspect requires an input path or identifier');
      const result = await inspectInput(input);
      if (flags.get('json') === true) output(io, JSON.stringify(result, null, 2));
      else {
        output(io, `Source type: ${result.sourceType}`);
        output(io, `Checksum: ${result.checksum ?? 'not available'}`);
        output(io, `Files: ${(result.files as string[] | undefined)?.join(', ') ?? 'not available'}`);
        (result.diagnostics as Diagnostic[] | undefined)?.forEach((diagnostic) =>
          output(io, formatDiagnostic(diagnostic))
        );
      }
      return 0;
    }
    if (command === 'import') {
      const input = positionals[0];
      if (!input) throw new Error('import requires an input path or identifier');
      return await importInput(input, flags, io);
    }
    if (command === 'validate') {
      const input = positionals[0];
      if (!input) throw new Error('validate requires a staged record path');
      return await validateRecord(input, io);
    }
    if (command === 'report') {
      const input = positionals[0];
      if (!input) throw new Error('report requires a staged record path');
      return await printReport(input, flags.get('json') === true, io);
    }
    if (command === 'promote') {
      const input = positionals[0];
      if (!input) throw new Error('promote requires a staged record path');
      const contentRoot =
        typeof flags.get('content-root') === 'string'
          ? resolve(flags.get('content-root') as string)
          : join(process.cwd(), 'content', 'external-articles');
      const target = join(contentRoot, basename(resolve(input)));
      await promoteRecord(input, target, {
        publicRoot: typeof flags.get('public-root') === 'string' ? (flags.get('public-root') as string) : undefined,
        force: flags.get('force') === true
      });
      output(io, `Promoted ${input} -> ${target}`);
      return 0;
    }
    throw new Error(`Unknown command ${command}`);
  } catch (error) {
    errorOutput(io, error instanceof Error ? error.message : String(error));
    return 1;
  }
}
