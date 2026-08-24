---
abstract:
  en: Large pre-trained language models have been shown to store factual knowledge
    in their parameters, and achieve state-of-the-art results when fine-tuned on
    downstream NLP tasks. However, their ability to access and precisely
    manipulate knowledge is still limited, and hence on knowledge-intensive
    tasks, their performance lags behind task-specific architectures.
    Additionally, providing provenance for their decisions and updating their
    world knowledge remain open research problems. Pre-trained models with a
    differentiable access mechanism to explicit non-parametric memory can
    overcome this issue, but have so far been only investigated for extractive
    downstream tasks. We explore a general-purpose fine-tuning recipe for
    retrieval-augmented generation (RAG) -- models which combine pre-trained
    parametric and non-parametric memory for language generation. We introduce
    RAG models where the parametric memory is a pre-trained seq2seq model and
    the non-parametric memory is a dense vector index of Wikipedia, accessed
    with a pre-trained neural retriever. We compare two RAG formulations, one
    which conditions on the same retrieved passages across the whole generated
    sequence, the other can use different passages per token. We fine-tune and
    evaluate our models on a wide range of knowledge-intensive NLP tasks and set
    the state-of-the-art on three open domain QA tasks, outperforming parametric
    seq2seq models and task-specific retrieve-and-extract architectures. For
    language generation tasks, we find that RAG models generate more specific,
    diverse and factual language than a state-of-the-art parametric-only seq2seq
    baseline.
bodyLanguage: en
contributors:
  - name: Patrick Lewis
  - name: Ethan Perez
  - name: Aleksandra Piktus
  - name: Fabio Petroni
  - name: Vladimir Karpukhin
  - name: Naman Goyal
  - name: Heinrich Küttler
  - name: Mike Lewis
  - name: Wen-tau Yih
  - name: Tim Rocktäschel
  - name: Sebastian Riedel
  - name: Douwe Kiela
conversion:
  importer: jcore-import@0.1.0
  outputChecksum: 993ef864d2efa0625cdbe59d0a1ea8430395d56d66297772a0317e3042c5989b
  reportPath: import-report.json
  status: converted
identifiers:
  arxiv: "2005.11401"
keywords:
  - en: retrieval-augmented generation
  - en: language models
  - en: knowledge-intensive NLP
kind: external
notPublishedByJCORE: true
officialUrl: https://arxiv.org/abs/2005.11401
originalPublicationDate: 2020-05-22
originalPublisher: arXiv
originalVenue: Advances in Neural Information Processing Systems (NeurIPS 2020)
provenance:
  checksum: 3c5a331ef882f097eca61d0359345a96df783cd0349d55f33b5b91f39625d895
  importer: jcore-import@0.1.0
  retrievalDate: 2026-08-24
  sourceFormat: latex
  sourcePackagePath: sources/latex/2005.11401
renderMode: structured
rights:
  copyrightHolder: The Authors
  evidenceUrl: https://arxiv.org/abs/2005.11401
  license:
    id: arxiv-nonexclusive-distrib
    url: https://arxiv.org/licenses/nonexclusive-distrib/1.0/
  permitsRedistribution: true
  statement: Redistributed under the arXiv non-exclusive distribution license for
    scholarly use.
slug: retrieval-augmented-generation
sourceFiles: []
sourceFormat: latex
title:
  en: Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks
---
