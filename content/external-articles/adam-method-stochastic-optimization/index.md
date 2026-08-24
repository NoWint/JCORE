---
abstract:
  en: We introduce Adam, an algorithm for first-order gradient-based optimization
    of stochastic objective functions, based on adaptive estimates of
    lower-order moments. The method is straightforward to implement, is
    computationally efficient, has little memory requirements, is invariant to
    diagonal rescaling of the gradients, and is well suited for problems that
    are large in terms of data and/or parameters. The method is also appropriate
    for non-stationary objectives and problems with very noisy and/or sparse
    gradients. The hyper-parameters have intuitive interpretations and typically
    require little tuning. Some connections to related algorithms, on which Adam
    was inspired, are discussed. We also analyze the theoretical convergence
    properties of the algorithm and provide a regret bound on the convergence
    rate that is comparable to the best known results under the online convex
    optimization framework. Empirical results demonstrate that Adam works well
    in practice and compares favorably to other stochastic optimization methods.
    Finally, we discuss AdaMax, a variant of Adam based on the infinity norm.
bodyLanguage: en
contributors:
  - name: Diederik P. Kingma
  - name: Jimmy Ba
conversion:
  importer: jcore-import@0.1.0
  outputChecksum: b0ef7253257804653dd1b3d5c42d01303b39f597f9c768ef35f7b9d2d7a30c4e
  reportPath: import-report.json
  status: fallback
identifiers:
  arxiv: "1412.6980"
keywords:
  - en: optimization
  - en: stochastic optimization
  - en: neural networks
kind: external
notPublishedByJCORE: true
officialUrl: https://arxiv.org/abs/1412.6980
originalPublicationDate: 2014-12-22
originalPublisher: arXiv
originalVenue: International Conference on Learning Representations (ICLR 2015)
pdf: /sources/adam-method-stochastic-optimization/adam-method-stochastic-optimization.pdf
provenance:
  checksum: 3499c4f2ac6a422bef260b8ae51b0418a775ff5b0462550c9373231fe83867e9
  importer: jcore-import@0.1.0
  retrievalDate: 2026-08-24
  sourceFormat: latex
  sourcePackagePath: sources/latex/1412.6980
renderMode: source-fallback
rights:
  copyrightHolder: The Authors
  evidenceUrl: https://arxiv.org/abs/1412.6980
  license:
    id: arxiv-nonexclusive-distrib
    url: https://arxiv.org/licenses/nonexclusive-distrib/1.0/
  permitsRedistribution: true
  statement: Redistributed under the arXiv non-exclusive distribution license for
    scholarly use.
slug: adam-method-stochastic-optimization
sourceFiles:
  - kind: pdf
    label: Original PDF
    path: /sources/adam-method-stochastic-optimization/adam-method-stochastic-optimization.pdf
sourceFormat: latex
title:
  en: "Adam: A Method for Stochastic Optimization"
---
