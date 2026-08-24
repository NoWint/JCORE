---
abstract:
  en: Foundation models, now powering most of the exciting applications in deep
    learning, are almost universally based on the Transformer architecture and
    its core attention module. Many subquadratic-time architectures such as
    linear attention, gated convolution and recurrent models, and structured
    state space models (SSMs) have been developed to address Transformers'
    computational inefficiency on long sequences, but they have not performed as
    well as attention on important modalities such as language. We identify that
    a key weakness of such models is their inability to perform content-based
    reasoning, and make several improvements. First, simply letting the SSM
    parameters be functions of the input addresses their weakness with discrete
    modalities, allowing the model to selectively propagate or forget
    information along the sequence length dimension depending on the current
    token. Second, even though this change prevents the use of efficient
    convolutions, we design a hardware-aware parallel algorithm in recurrent
    mode. We integrate these selective SSMs into a simplified end-to-end neural
    network architecture without attention or even MLP blocks (Mamba). Mamba
    enjoys fast inference (5$\times$ higher throughput than Transformers) and
    linear scaling in sequence length, and its performance improves on real data
    up to million-length sequences. As a general sequence model backbone, Mamba
    achieves state-of-the-art performance across several modalities such as
    language, audio, and genomics. On language modeling, our Mamba-3B model
    outperforms Transformers of the same size and matches Transformers twice its
    size, both in pretraining and downstream evaluation.
bodyLanguage: en
contributors:
  - name: Albert Gu
  - name: Tri Dao
conversion:
  importer: jcore-import@0.1.0
  outputChecksum: 190f9e311390638ccdd30a083f2695ddd915618d69c610aeaaa12751f6546acb
  reportPath: import-report.json
  status: fallback
identifiers:
  arxiv: "2312.00752"
keywords:
  - en: state space models
  - en: sequence modeling
  - en: efficient inference
kind: external
notPublishedByJCORE: true
officialUrl: https://arxiv.org/abs/2312.00752
originalPublicationDate: 2023-12-01
originalPublisher: arXiv
originalVenue: Conference on Language Modeling (COLM 2024)
pdf: /sources/mamba-linear-time-sequence-modeling/mamba-linear-time-sequence-modeling.pdf
provenance:
  checksum: 31c1b9ce2f80d34074a56ddcda4860bb3e3046a66d6b3c65c069676d1c2243c6
  importer: jcore-import@0.1.0
  retrievalDate: 2026-08-24
  sourceFormat: latex
  sourcePackagePath: sources/latex/2312.00752
renderMode: source-fallback
rights:
  copyrightHolder: The Authors
  evidenceUrl: https://arxiv.org/abs/2312.00752
  license:
    id: arxiv-nonexclusive-distrib
    url: https://arxiv.org/licenses/nonexclusive-distrib/1.0/
  permitsRedistribution: true
  statement: Redistributed under the arXiv non-exclusive distribution license for
    scholarly use.
slug: mamba-linear-time-sequence-modeling
sourceFiles:
  - kind: pdf
    label: Original PDF
    path: /sources/mamba-linear-time-sequence-modeling/mamba-linear-time-sequence-modeling.pdf
sourceFormat: latex
title:
  en: "Mamba: Linear-Time Sequence Modeling with Selective State Spaces"
---
