import { getExternalArticleBySlug, getArticleById, getExternalArticles, getPublishedArticles } from '../../lib/content/queries';
import { formatBibTeX } from '../../lib/citations';

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
  return new Response(formatBibTeX(record), { headers: { 'Content-Type': 'application/x-bibtex; charset=utf-8' } });
}
