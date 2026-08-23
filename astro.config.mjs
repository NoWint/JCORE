import { defineConfig } from 'astro/config';

const customSite = process.env.PUBLIC_SITE_URL ?? process.env.SITE_URL;
const site = customSite ?? 'https://nowint.github.io/JCORE';
const base = customSite
  ? new URL(customSite).pathname.replace(/\/+$/, '')
  : '/JCORE';

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto'
  }
});
