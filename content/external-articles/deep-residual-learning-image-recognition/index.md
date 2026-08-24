---
abstract:
  en: Deeper neural networks are more difficult to train. We present a residual
    learning framework to ease the training of networks that are substantially
    deeper than those used previously. We explicitly reformulate the layers as
    learning residual functions with reference to the layer inputs, instead of
    learning unreferenced functions. We provide comprehensive empirical evidence
    showing that these residual networks are easier to optimize, and can gain
    accuracy from considerably increased depth. On the ImageNet dataset we
    evaluate residual nets with a depth of up to 152 layers---8x deeper than VGG
    nets but still having lower complexity. An ensemble of these residual nets
    achieves 3.57% error on the ImageNet test set. This result won the 1st place
    on the ILSVRC 2015 classification task. We also present analysis on CIFAR-10
    with 100 and 1000 layers. The depth of representations is of central
    importance for many visual recognition tasks. Solely due to our extremely
    deep representations, we obtain a 28% relative improvement on the COCO
    object detection dataset. Deep residual nets are foundations of our
    submissions to ILSVRC & COCO 2015 competitions, where we also won the 1st
    places on the tasks of ImageNet detection, ImageNet localization, COCO
    detection, and COCO segmentation.
bodyLanguage: en
contributors:
  - name: Kaiming He
  - name: Xiangyu Zhang
  - name: Shaoqing Ren
  - name: Jian Sun
conversion:
  importer: jcore-import@0.1.0
  outputChecksum: 20660c197cb24af6db4770f9c710abe720af1386735d5c50f9bf26656b392e90
  reportPath: import-report.json
  status: fallback
identifiers:
  arxiv: "1512.03385"
keywords:
  - en: residual networks
  - en: computer vision
  - en: image recognition
kind: external
notPublishedByJCORE: true
officialUrl: https://arxiv.org/abs/1512.03385
originalPublicationDate: 2015-12-10
originalPublisher: arXiv
originalVenue: IEEE Conference on Computer Vision and Pattern Recognition (CVPR 2016)
pdf: /sources/deep-residual-learning-image-recognition/deep-residual-learning-image-recognition.pdf
provenance:
  checksum: ecd6268ca1ed6d3754092ac761267cd1edd8e2ff74f4ccd1c2a4455319cabeb7
  importer: jcore-import@0.1.0
  retrievalDate: 2026-08-24
  sourceFormat: latex
  sourcePackagePath: sources/latex/1512.03385
renderMode: source-fallback
rights:
  copyrightHolder: The Authors
  evidenceUrl: https://arxiv.org/abs/1512.03385
  license:
    id: arxiv-nonexclusive-distrib
    url: https://arxiv.org/licenses/nonexclusive-distrib/1.0/
  permitsRedistribution: true
  statement: Redistributed under the arXiv non-exclusive distribution license for
    scholarly use.
slug: deep-residual-learning-image-recognition
sourceFiles:
  - kind: pdf
    label: Original PDF
    path: /sources/deep-residual-learning-image-recognition/deep-residual-learning-image-recognition.pdf
sourceFormat: latex
title:
  en: Deep Residual Learning for Image Recognition
---
