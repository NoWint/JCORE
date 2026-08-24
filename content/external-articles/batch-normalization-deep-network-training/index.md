---
abstract:
  en: "Training Deep Neural Networks is complicated by the fact that the
    distribution of each layer's inputs changes during training, as the
    parameters of the previous layers change. This slows down the training by
    requiring lower learning rates and careful parameter initialization, and
    makes it notoriously hard to train models with saturating nonlinearities. We
    refer to this phenomenon as internal covariate shift, and address the
    problem by normalizing layer inputs. Our method draws its strength from
    making normalization a part of the model architecture and performing the
    normalization for each training mini-batch. Batch Normalization allows us to
    use much higher learning rates and be less careful about initialization. It
    also acts as a regularizer, in some cases eliminating the need for Dropout.
    Applied to a state-of-the-art image classification model, Batch
    Normalization achieves the same accuracy with 14 times fewer training steps,
    and beats the original model by a significant margin. Using an ensemble of
    batch-normalized networks, we improve upon the best published result on
    ImageNet classification: reaching 4.9% top-5 validation error (and 4.8% test
    error), exceeding the accuracy of human raters."
bodyLanguage: en
contributors:
  - name: Sergey Ioffe
  - name: Christian Szegedy
conversion:
  importer: jcore-import@0.1.0
  outputChecksum: 5ed0529d9b9d69183ed665d93d613a04e540bf966c51571a9f74a2a66d354cf3
  reportPath: import-report.json
  status: converted
identifiers:
  arxiv: "1502.03167"
keywords:
  - en: batch normalization
  - en: deep learning
  - en: optimization
kind: external
notPublishedByJCORE: true
officialUrl: https://arxiv.org/abs/1502.03167
originalPublicationDate: 2015-02-11
originalPublisher: arXiv
originalVenue: International Conference on Machine Learning (ICML 2015)
provenance:
  checksum: e99b4b2b73e4de165cfca8afa55449a58cef9bd3ef0bfcf095617b50c1e42263
  importer: jcore-import@0.1.0
  retrievalDate: 2026-08-24
  sourceFormat: latex
  sourcePackagePath: sources/latex/1502.03167
renderMode: structured
rights:
  copyrightHolder: The Authors
  evidenceUrl: https://arxiv.org/abs/1502.03167
  license:
    id: arxiv-nonexclusive-distrib
    url: https://arxiv.org/licenses/nonexclusive-distrib/1.0/
  permitsRedistribution: true
  statement: Redistributed under the arXiv non-exclusive distribution license for
    scholarly use.
slug: batch-normalization-deep-network-training
sourceFiles: []
sourceFormat: latex
title:
  en: "Batch Normalization: Accelerating Deep Network Training by Reducing
    Internal Covariate Shift"
---
