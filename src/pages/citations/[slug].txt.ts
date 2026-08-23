import { getExternalArticleBySlug, getArticleById, getExternalArticles, getPublishedArticles } from '../../lib/content/queries';
import { formatPlainCitation } from '../../lib/citations';
import type { Locale } from '../../lib/i18n';

export function getStaticPaths() {
  return [
    ...getPublishedArticles().map((article) => ({ params: { slug: article.id } })),
    ...getExternalArticles().map((article) => ({ params: { slug: article.slug } }))
  ];
}

export function GET({ params }: { params: { slug: string } }) {
  const record = getArticleById(params.slug) ?? getExternalArticleBySlug(params.slug);
  if (!record) {
    return new Response('Not found', { status: 404 });
  }
  const citation = formatPlainCitation(record, 'en' as Locale);
  return new Response(citation, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
