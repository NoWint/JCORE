---
abstract:
  en: In deep learning, models typically reuse the same parameters for all inputs.
    Mixture of Experts (MoE) defies this and instead selects different
    parameters for each incoming example. The result is a sparsely-activated
    model -- with outrageous numbers of parameters -- but a constant
    computational cost. However, despite several notable successes of MoE,
    widespread adoption has been hindered by complexity, communication costs and
    training instability -- we address these with the Switch Transformer. We
    simplify the MoE routing algorithm and design intuitive improved models with
    reduced communication and computational costs. Our proposed training
    techniques help wrangle the instabilities and we show large sparse models
    may be trained, for the first time, with lower precision (bfloat16) formats.
    We design models based off T5-Base and T5-Large to obtain up to 7x increases
    in pre-training speed with the same computational resources. These
    improvements extend into multilingual settings where we measure gains over
    the mT5-Base version across all 101 languages. Finally, we advance the
    current scale of language models by pre-training up to trillion parameter
    models on the "Colossal Clean Crawled Corpus" and achieve a 4x speedup over
    the T5-XXL model.
bodyLanguage: en
contributors:
  - name: William Fedus
  - name: Barret Zoph
  - name: Noam Shazeer
conversion:
  importer: jcore-import@0.1.0
  outputChecksum: c70bf432406b38f88f98b82353c25529306dd2626c2e3308ec5bacec0e6e3bce
  reportPath: import-report.json
  status: converted
identifiers:
  arxiv: "2101.03961"
keywords:
  - en: mixture of experts
  - en: sparse models
  - en: transformer
kind: external
notPublishedByJCORE: true
officialUrl: https://arxiv.org/abs/2101.03961
originalPublicationDate: 2021-01-11
originalPublisher: arXiv
originalVenue: Journal of Machine Learning Research (2022)
provenance:
  checksum: c186dfa27e3ef8ba57f35daab85b444a12ed36b4d826383851c32d812e1765f4
  importer: jcore-import@0.1.0
  retrievalDate: 2026-08-24
  sourceFormat: latex
  sourcePackagePath: sources/latex/2101.03961
renderMode: structured
rights:
  copyrightHolder: The Authors
  evidenceUrl: https://arxiv.org/abs/2101.03961
  license:
    id: arxiv-nonexclusive-distrib
    url: https://arxiv.org/licenses/nonexclusive-distrib/1.0/
  permitsRedistribution: true
  statement: Redistributed under the arXiv non-exclusive distribution license for
    scholarly use.
slug: switch-transformers-sparse-models
sourceFiles: []
sourceFormat: latex
title:
  en: "Switch Transformers: Scaling to Trillion Parameter Models with Simple and
    Efficient Sparsity"
---
