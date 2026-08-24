---
abstract:
  en: By decomposing the image formation process into a sequential application of
    denoising autoencoders, diffusion models (DMs) achieve state-of-the-art
    synthesis results on image data and beyond. Additionally, their formulation
    allows for a guiding mechanism to control the image generation process
    without retraining. However, since these models typically operate directly
    in pixel space, optimization of powerful DMs often consumes hundreds of GPU
    days and inference is expensive due to sequential evaluations. To enable DM
    training on limited computational resources while retaining their quality
    and flexibility, we apply them in the latent space of powerful pretrained
    autoencoders. In contrast to previous work, training diffusion models on
    such a representation allows for the first time to reach a near-optimal
    point between complexity reduction and detail preservation, greatly boosting
    visual fidelity. By introducing cross-attention layers into the model
    architecture, we turn diffusion models into powerful and flexible generators
    for general conditioning inputs such as text or bounding boxes and
    high-resolution synthesis becomes possible in a convolutional manner. Our
    latent diffusion models (LDMs) achieve a new state of the art for image
    inpainting and highly competitive performance on various tasks, including
    unconditional image generation, semantic scene synthesis, and
    super-resolution, while significantly reducing computational requirements
    compared to pixel-based DMs. Code is available at
    https://github.com/CompVis/latent-diffusion .
bodyLanguage: en
contributors:
  - name: Robin Rombach
  - name: Andreas Blattmann
  - name: Dominik Lorenz
  - name: Patrick Esser
  - name: Björn Ommer
conversion:
  importer: jcore-import@0.1.0
  outputChecksum: 22fb603f9d767bfbdc8588d4709333ea449208bf308cd95af5efe79958b729ad
  reportPath: import-report.json
  status: converted
identifiers:
  arxiv: "2112.10752"
keywords:
  - en: latent diffusion
  - en: image synthesis
  - en: text-to-image generation
kind: external
notPublishedByJCORE: true
officialUrl: https://arxiv.org/abs/2112.10752
originalPublicationDate: 2021-12-20
originalPublisher: arXiv
originalVenue: IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR 2022)
provenance:
  checksum: 647bfb447342cb90105462bbded81cb258fdb0f7fccb70a034a3f118ae5cfce8
  importer: jcore-import@0.1.0
  retrievalDate: 2026-08-24
  sourceFormat: latex
  sourcePackagePath: sources/latex/2112.10752
renderMode: structured
rights:
  copyrightHolder: The Authors
  evidenceUrl: https://arxiv.org/abs/2112.10752
  license:
    id: arxiv-nonexclusive-distrib
    url: https://arxiv.org/licenses/nonexclusive-distrib/1.0/
  permitsRedistribution: true
  statement: Redistributed under the arXiv non-exclusive distribution license for
    scholarly use.
slug: latent-diffusion-models
sourceFiles: []
sourceFormat: latex
title:
  en: High-Resolution Image Synthesis with Latent Diffusion Models
---
