export interface CrossrefMetadata {
  title: string;
  authors: string[];
  containerTitle?: string;
  published?: string;
  url?: string;
}

export async function resolveCrossref(doi: string): Promise<CrossrefMetadata> {
  const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) {
    throw new Error(`Crossref request failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    message?: {
      title?: string[];
      author?: Array<{ family?: string; given?: string }>;
      'container-title'?: string[];
      published?: { 'date-parts'?: number[][] };
      URL?: string;
    };
  };
  const message = payload.message;
  if (!message) {
    throw new Error('Crossref response has no message object');
  }

  const dateParts = message.published?.['date-parts']?.[0] ?? [];
  const published = dateParts.length > 0 ? dateParts.map(String).join('-') : undefined;

  return {
    title: message.title?.[0] ?? doi,
    authors: (message.author ?? []).map((author) => `${author.given ?? ''} ${author.family ?? ''}`.trim()),
    containerTitle: message['container-title']?.[0],
    published,
    url: message.URL
  };
}
