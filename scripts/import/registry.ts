export interface RegistryEntry {
  targetSlug: string;
  sourceChecksum: string;
  outputChecksum: string;
  importerVersion: string;
  createdAt: string;
}

export class ImportRegistry {
  private readonly entries = new Map<string, RegistryEntry>();

  constructor(entries: Iterable<RegistryEntry> = []) {
    for (const entry of entries) {
      this.entries.set(entry.targetSlug, entry);
    }
  }

  register(entry: RegistryEntry): void {
    const existing = this.entries.get(entry.targetSlug);
    if (existing && (existing.sourceChecksum !== entry.sourceChecksum || existing.importerVersion !== entry.importerVersion)) {
      throw new Error(
        `Import conflict for ${entry.targetSlug}: source checksum or importer version changed without a new target`
      );
    }
    this.entries.set(entry.targetSlug, entry);
  }

  has(targetSlug: string): boolean {
    return this.entries.has(targetSlug);
  }

  toJSON(): string {
    return JSON.stringify(
      [...this.entries.values()].sort((a, b) => a.targetSlug.localeCompare(b.targetSlug)),
      null,
      2
    );
  }
}
