---
abstract:
  en: State-of-the-art computer vision systems are trained to predict a fixed set
    of predetermined object categories. This restricted form of supervision
    limits their generality and usability since additional labeled data is
    needed to specify any other visual concept. Learning directly from raw text
    about images is a promising alternative which leverages a much broader
    source of supervision. We demonstrate that the simple pre-training task of
    predicting which caption goes with which image is an efficient and scalable
    way to learn SOTA image representations from scratch on a dataset of 400
    million (image, text) pairs collected from the internet. After pre-training,
    natural language is used to reference learned visual concepts (or describe
    new ones) enabling zero-shot transfer of the model to downstream tasks. We
    study the performance of this approach by benchmarking on over 30 different
    existing computer vision datasets, spanning tasks such as OCR, action
    recognition in videos, geo-localization, and many types of fine-grained
    object classification. The model transfers non-trivially to most tasks and
    is often competitive with a fully supervised baseline without the need for
    any dataset specific training. For instance, we match the accuracy of the
    original ResNet-50 on ImageNet zero-shot without needing to use any of the
    1.28 million training examples it was trained on. We release our code and
    pre-trained model weights at https://github.com/OpenAI/CLIP.
bodyLanguage: en
contributors:
  - name: Alec Radford
  - name: Jong Wook Kim
  - name: Chris Hallacy
  - name: Aditya Ramesh
  - name: Gabriel Goh
  - name: Sandhini Agarwal
  - name: Girish Sastry
  - name: Amanda Askell
  - name: Pamela Mishkin
  - name: Jack Clark
  - name: Gretchen Krueger
  - name: Ilya Sutskever
conversion:
  importer: jcore-import@0.1.0
  outputChecksum: 8d49e4fc9563ac359f5d8369c949f1e1a31d94bd0e462bc41ef3705712395efb
  reportPath: import-report.json
  status: converted
identifiers:
  arxiv: "2103.00020"
keywords:
  - en: vision-language models
  - en: contrastive learning
  - en: zero-shot learning
kind: external
notPublishedByJCORE: true
officialUrl: https://arxiv.org/abs/2103.00020
originalPublicationDate: 2021-02-26
originalPublisher: arXiv
originalVenue: International Conference on Machine Learning (ICML 2021)
provenance:
  checksum: 91ad3d791c9dfab41ee155cd6b4546725ffa873729d3903c8aa4b2e5567ee623
  importer: jcore-import@0.1.0
  retrievalDate: 2026-08-24
  sourceFormat: latex
  sourcePackagePath: sources/latex/2103.00020
renderMode: structured
rights:
  copyrightHolder: The Authors
  evidenceUrl: https://arxiv.org/abs/2103.00020
  license:
    id: arxiv-nonexclusive-distrib
    url: https://arxiv.org/licenses/nonexclusive-distrib/1.0/
  permitsRedistribution: true
  statement: Redistributed under the arXiv non-exclusive distribution license for
    scholarly use.
slug: clip-visual-language-supervision
sourceFiles: []
sourceFormat: latex
title:
  en: Learning Transferable Visual Models From Natural Language Supervision
---
