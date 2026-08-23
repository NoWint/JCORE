import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { makeDiagnostic, type Diagnostic } from '../../validate/diagnostics';

const execFile = promisify(execFileCallback);

export interface LatexConvertInput {
  rootDocument: string;
  files: Array<{ path: string; data: Uint8Array }>;
}

export interface LatexConverter {
  convert(input: LatexConvertInput): Promise<{ body: string; diagnostics: Diagnostic[] }>;
}

export class PandocLatexConverter implements LatexConverter {
  constructor(private readonly pandocPath = 'pandoc') {}

  async convert(input: LatexConvertInput): Promise<{ body: string; diagnostics: Diagnostic[] }> {
    const workingDir = await mkdtemp(join(tmpdir(), 'jcore-pandoc-'));

    try {
      for (const file of input.files) {
        const target = join(workingDir, file.path);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, file.data);
      }

      const output = join(workingDir, 'normalized.md');
      await execFile(
        this.pandocPath,
        [
          input.rootDocument,
          '--from=latex',
          '--to=markdown+tex_math_dollars',
          '--wrap=none',
          `--resource-path=${workingDir}`,
          `--output=${output}`
        ],
        { cwd: workingDir }
      );

      const body = (await readFile(output, 'utf8')).trim();
      return { body, diagnostics: [] };
    } catch (error) {
      return {
        body: '',
        diagnostics: [
          makeDiagnostic(
            'pandoc-conversion-failed',
            'error',
            'latex',
            input.rootDocument,
            error instanceof Error ? error.message : String(error),
            'Fix the LaTeX source and retry the conversion',
            input.rootDocument
          )
        ]
      };
    } finally {
      await rm(workingDir, { recursive: true, force: true });
    }
  }
}
