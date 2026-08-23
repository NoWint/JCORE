import type { DoiResolution } from '../../../../../scripts/import/types';

const sourceFiles = [
  {
    path: 'main.tex',
    data: new TextEncoder().encode(
      [
        '\\documentclass{article}',
        '\\title{Fixture Article}',
        '\\author{Jane Doe}',
        '\\begin{document}',
        '\\section{Introduction}',
        'Text with a citation \\cite{fixture2026}.',
        '\\includegraphics{figure.svg}',
        '\\bibliography{refs}',
        '\\end{document}'
      ].join('\n')
    )
  },
  {
    path: 'refs.bib',
    data: new TextEncoder().encode('@article{fixture2026,\n  title = {Fixture Article},\n  author = {Doe, Jane},\n  year = {2026}\n}\n')
  },
  {
    path: 'figure.svg',
    data: new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>')
  }
];

export const validResolution: DoiResolution = {
  identifier: '1706.03762',
  metadata: {
    title: 'Fixture Article',
    authors: ['Jane Doe'],
    abstract: 'Fixture abstract.'
  },
  source: {
    packagePath: 'arxiv:1706.03762',
    checksum: 'a'.repeat(64),
    files: sourceFiles
  },
  sourceFormat: 'latex',
  rootDocument: 'main.tex',
  checksum: 'a'.repeat(64),
  retrievalDate: '2026-08-23',
  rights: {
    licenseId: 'arxiv-nonexclusive-distrib',
    licenseUrl: 'https://arxiv.org/licenses/nonexclusive-distrib/1.0/',
    copyrightHolder: 'The Authors',
    statement: 'Redistribution permitted under the arXiv non-exclusive license.',
    evidenceUrl: 'https://arxiv.org/abs/1706.03762',
    permitsRedistribution: true
  },
  status: 'full-text',
  diagnostics: []
};
