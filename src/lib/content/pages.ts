export interface PageEntryShape {
  id: string;
  data: {
    title?: { en?: string; zh?: string };
    description?: { en?: string; zh?: string };
  };
  rendered?: { html?: string };
}

export function findPage<T extends PageEntryShape>(pages: T[], slug: string, locale: string): T | undefined {
  return pages.find((candidate) => {
    const fileName = candidate.id.replace(/\\/g, '/').split('/').pop() ?? '';
    return fileName.startsWith(slug) && fileName.endsWith(locale);
  });
}
