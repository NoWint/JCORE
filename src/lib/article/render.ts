import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

export interface Heading {
  level: number;
  text: string;
  id: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  for (const match of markdown.matchAll(/^(#{1,3})\s+(.+)$/gm)) {
    const text = match[2].replace(/[*_`]/g, '').trim();
    headings.push({
      level: match[1].length,
      text,
      id: slugify(text)
    });
  }
  return headings;
}

export async function renderArticleBody(markdown: string, base = ''): Promise<string> {
  const prefixed = markdown
    .replace(/\]\((\/figures\/)/g, `](${base}$1`)
    .replace(/(src|href)="(\/figures\/)/g, `$1="${base}$2`);

  const file = await unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex)
    .use(rehypeStringify)
    .process(prefixed);

  return String(file);
}
