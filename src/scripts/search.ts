interface PagefindEntry {
  data(): Promise<{ url: string; meta?: { title?: string }; content?: string }>;
}

interface PagefindApi {
  search(query: string): Promise<{ results: PagefindEntry[] }>;
}

interface SearchWindow extends Window {
  __pagefind?: PagefindApi;
}

async function getPagefind(): Promise<PagefindApi> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const api = (window as SearchWindow).__pagefind;
    if (api) {
      return api;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Pagefind failed to initialize');
}

export async function initSearch(
  locale: string,
  form: HTMLFormElement,
  results: HTMLElement
): Promise<void> {
  const input = form.querySelector<HTMLInputElement>('input[type="search"]');
  if (!input) {
    return;
  }

  const run = async () => {
    const query = input.value.trim();
    if (!query) {
      results.innerHTML = '';
      return;
    }

    const pagefind = await getPagefind();
    const search = await pagefind.search(query);
    const entries = await Promise.all(search.results.slice(0, 20).map((result) => result.data()));
    const filtered = entries.filter(
      (entry) => entry.url.includes(`/${locale}/`) && !entry.url.includes(`/${locale}/search/`)
    );

    if (filtered.length === 0) {
      results.innerHTML = '<p class="search-empty">No results found.</p>';
      return;
    }

    results.innerHTML = filtered
      .map(
        (entry) =>
          `<article class="search-result"><h2><a href="${entry.url}">${entry.meta?.title ?? entry.url}</a></h2></article>`
      )
      .join('');
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  input.addEventListener('input', () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => void run(), 200);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void run();
  });
}
