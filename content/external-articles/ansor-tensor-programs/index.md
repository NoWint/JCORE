---
abstract:
  en: High-performance tensor programs are crucial to guarantee efficient
    execution of deep neural networks. However, obtaining performant tensor
    programs for different operators on various hardware platforms is
    notoriously challenging. Currently, deep learning systems rely on
    vendor-provided kernel libraries or various search strategies to get
    performant tensor programs. These approaches either require significant
    engineering effort to develop platform-specific optimization code or fall
    short of finding high-performance programs due to restricted search space
    and ineffective exploration strategy. We present Ansor, a tensor program
    generation framework for deep learning applications. Compared with existing
    search strategies, Ansor explores many more optimization combinations by
    sampling programs from a hierarchical representation of the search space.
    Ansor then fine-tunes the sampled programs with evolutionary search and a
    learned cost model to identify the best programs. Ansor can find
    high-performance programs that are outside the search space of existing
    state-of-the-art approaches. In addition, Ansor utilizes a task scheduler to
    simultaneously optimize multiple subgraphs in deep neural networks. We show
    that Ansor improves the execution performance of deep neural networks
    relative to the state-of-the-art on the Intel CPU, ARM CPU, and NVIDIA GPU
    by up to $3.8\times$, $2.6\times$, and $1.7\times$, respectively.
bodyLanguage: en
contributors:
  - name: Lianmin Zheng
  - name: Chengfan Jia
  - name: Minmin Sun
  - name: Zhao Wu
  - name: Cody Hao Yu
  - name: Ameer Haj-Ali
  - name: Yida Wang
  - name: Jun Yang
  - name: Danyang Zhuo
  - name: Koushik Sen
  - name: Joseph E. Gonzalez
  - name: Ion Stoica
conversion:
  importer: jcore-import@0.1.0
  outputChecksum: 1489381372928d0a67eda075ffc78855d7248a6a53541762d7f026c841a651d1
  reportPath: import-report.json
  status: converted
identifiers:
  arxiv: "2006.06762"
keywords:
  - en: tensor programs
  - en: auto-tuning
  - en: deep learning compiler
kind: external
notPublishedByJCORE: true
officialUrl: https://arxiv.org/abs/2006.06762
originalPublicationDate: 2020-06-11
originalPublisher: arXiv
originalVenue: USENIX Symposium on Operating Systems Design and Implementation (OSDI 2020)
provenance:
  checksum: 2c1d1683235a3927e22f2b6a688697fff595df086faa4f5185f812435b4328e7
  importer: jcore-import@0.1.0
  retrievalDate: 2026-08-24
  sourceFormat: latex
  sourcePackagePath: sources/latex/2006.06762
renderMode: structured
rights:
  copyrightHolder: The Authors
  evidenceUrl: https://arxiv.org/abs/2006.06762
  license:
    id: arxiv-nonexclusive-distrib
    url: https://arxiv.org/licenses/nonexclusive-distrib/1.0/
  permitsRedistribution: true
  statement: Redistributed under the arXiv non-exclusive distribution license for
    scholarly use.
slug: ansor-tensor-programs
sourceFiles: []
sourceFormat: latex
title:
  en: "Ansor: Generating High-Performance Tensor Programs for Deep Learning"
---
