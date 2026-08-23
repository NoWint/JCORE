import { XMLParser } from 'fast-xml-parser';

export interface ArxivMetadata {
  title: string;
  authors: string[];
  published?: string;
  url: string;
}

export async function resolveArxiv(id: string): Promise<ArxivMetadata> {
  const response = await fetch(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new Error(`arXiv request failed with ${response.status}`);
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true
  });
  const payload = parser.parse(await response.text()) as {
    feed?: { entry?: Record<string, unknown> };
  };
  const entry = payload.feed?.entry ?? {};

  return {
    title: String((entry.title as string | undefined) ?? id).trim(),
    authors: Array.isArray(entry.author)
      ? entry.author.map((author) => String((author as { name?: string }).name ?? '').trim())
      : entry.author
        ? [String((entry.author as { name?: string }).name ?? '').trim()]
        : [],
    published: String((entry.published as string | undefined) ?? '').trim() || undefined,
    url: `https://arxiv.org/abs/${id}`
  };
}
