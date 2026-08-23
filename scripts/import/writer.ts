import { access, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export interface StagingArea {
  root: string;
  write(relativePath: string, content: string | Uint8Array): Promise<void>;
  commit(targetDir: string): Promise<void>;
  cleanup(): Promise<void>;
}

export async function createStagingArea(prefix = 'jcore-import-'): Promise<StagingArea> {
  const root = await mkdtemp(join(tmpdir(), prefix));

  return {
    root,
    async write(relativePath, content) {
      const fullPath = join(root, relativePath);
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, content);
    },
    async commit(targetDir) {
      if (await exists(targetDir)) {
        throw new Error(`Cannot commit import: target already exists at ${targetDir}`);
      }
      await mkdir(dirname(targetDir), { recursive: true });
      await rename(root, targetDir);
    },
    async cleanup() {
      await rm(root, { recursive: true, force: true });
    }
  };
}
