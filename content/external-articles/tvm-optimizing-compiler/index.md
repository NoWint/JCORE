---
abstract:
  en: There is an increasing need to bring machine learning to a wide diversity of
    hardware devices. Current frameworks rely on vendor-specific operator
    libraries and optimize for a narrow range of server-class GPUs. Deploying
    workloads to new platforms -- such as mobile phones, embedded devices, and
    accelerators (e.g., FPGAs, ASICs) -- requires significant manual effort. We
    propose TVM, a compiler that exposes graph-level and operator-level
    optimizations to provide performance portability to deep learning workloads
    across diverse hardware back-ends. TVM solves optimization challenges
    specific to deep learning, such as high-level operator fusion, mapping to
    arbitrary hardware primitives, and memory latency hiding. It also automates
    optimization of low-level programs to hardware characteristics by employing
    a novel, learning-based cost modeling method for rapid exploration of code
    optimizations. Experimental results show that TVM delivers performance
    across hardware back-ends that are competitive with state-of-the-art,
    hand-tuned libraries for low-power CPU, mobile GPU, and server-class GPUs.
    We also demonstrate TVM's ability to target new accelerator back-ends, such
    as the FPGA-based generic deep learning accelerator. The system is open
    sourced and in production use inside several major companies.
bodyLanguage: en
contributors:
  - name: Tianqi Chen
  - name: Thierry Moreau
  - name: Ziheng Jiang
  - name: Lianmin Zheng
  - name: Eddie Yan
  - name: Meghan Cowan
  - name: Haichen Shen
  - name: Leyuan Wang
  - name: Yuwei Hu
  - name: Luis Ceze
  - name: Carlos Guestrin
  - name: Arvind Krishnamurthy
conversion:
  importer: jcore-import@0.1.0
  outputChecksum: 377fea1b975e7c3fd3831ed0d25dd4c212612f166ca3b95d43439be2101d2da7
  reportPath: import-report.json
  status: fallback
identifiers:
  arxiv: "1802.04799"
keywords:
  - en: deep learning compiler
  - en: operator optimization
  - en: hardware acceleration
kind: external
notPublishedByJCORE: true
officialUrl: https://arxiv.org/abs/1802.04799
originalPublicationDate: 2018-02-12
originalPublisher: arXiv
originalVenue: USENIX Symposium on Operating Systems Design and Implementation (OSDI 2018)
pdf: /sources/tvm-optimizing-compiler/tvm-optimizing-compiler.pdf
provenance:
  checksum: 2394252b6dd952b17b90ff3f755cadaab79614ba0d297b248cc553c6c0c18989
  importer: jcore-import@0.1.0
  retrievalDate: 2026-08-24
  sourceFormat: latex
  sourcePackagePath: sources/latex/1802.04799
renderMode: source-fallback
rights:
  copyrightHolder: The Authors
  evidenceUrl: https://arxiv.org/abs/1802.04799
  license:
    id: arxiv-nonexclusive-distrib
    url: https://arxiv.org/licenses/nonexclusive-distrib/1.0/
  permitsRedistribution: true
  statement: Redistributed under the arXiv non-exclusive distribution license for
    scholarly use.
slug: tvm-optimizing-compiler
sourceFiles:
  - kind: pdf
    label: Original PDF
    path: /sources/tvm-optimizing-compiler/tvm-optimizing-compiler.pdf
sourceFormat: latex
title:
  en: "TVM: An Automated End-to-End Optimizing Compiler for Deep Learning"
---
