---
abstract:
  en: An important paradigm of natural language processing consists of large-scale
    pre-training on general domain data and adaptation to particular tasks or
    domains. As we pre-train larger models, full fine-tuning, which retrains all
    model parameters, becomes less feasible. Using GPT-3 175B as an example --
    deploying independent instances of fine-tuned models, each with 175B
    parameters, is prohibitively expensive. We propose Low-Rank Adaptation, or
    LoRA, which freezes the pre-trained model weights and injects trainable rank
    decomposition matrices into each layer of the Transformer architecture,
    greatly reducing the number of trainable parameters for downstream tasks.
    Compared to GPT-3 175B fine-tuned with Adam, LoRA can reduce the number of
    trainable parameters by 10,000 times and the GPU memory requirement by 3
    times. LoRA performs on-par or better than fine-tuning in model quality on
    RoBERTa, DeBERTa, GPT-2, and GPT-3, despite having fewer trainable
    parameters, a higher training throughput, and, unlike adapters, no
    additional inference latency. We also provide an empirical investigation
    into rank-deficiency in language model adaptation, which sheds light on the
    efficacy of LoRA. We release a package that facilitates the integration of
    LoRA with PyTorch models and provide our implementations and model
    checkpoints for RoBERTa, DeBERTa, and GPT-2 at
    https://github.com/microsoft/LoRA.
bodyLanguage: en
contributors:
  - name: Edward J. Hu
  - name: Yelong Shen
  - name: Phillip Wallis
  - name: Zeyuan Allen-Zhu
  - name: Yuanzhi Li
  - name: Shean Wang
  - name: Lu Wang
  - name: Weizhu Chen
conversion:
  importer: jcore-import@0.1.0
  outputChecksum: 51ef61942319a92168c0858cce95a55829381a54bc4e02447d14886874ebe6c5
  reportPath: import-report.json
  status: converted
identifiers:
  arxiv: "2106.09685"
keywords:
  - en: parameter-efficient fine-tuning
  - en: low-rank adaptation
  - en: large language models
kind: external
notPublishedByJCORE: true
officialUrl: https://arxiv.org/abs/2106.09685
originalPublicationDate: 2021-06-17
originalPublisher: arXiv
originalVenue: International Conference on Learning Representations (ICLR 2022)
provenance:
  checksum: 933a57bbdd31610115b0ce8e83b56a158e7369588a4030aca4bc71bdb6effc42
  importer: jcore-import@0.1.0
  retrievalDate: 2026-08-24
  sourceFormat: latex
  sourcePackagePath: sources/latex/2106.09685
renderMode: structured
rights:
  copyrightHolder: The Authors
  evidenceUrl: https://arxiv.org/abs/2106.09685
  license:
    id: arxiv-nonexclusive-distrib
    url: https://arxiv.org/licenses/nonexclusive-distrib/1.0/
  permitsRedistribution: true
  statement: Redistributed under the arXiv non-exclusive distribution license for
    scholarly use.
slug: lora-low-rank-adaptation
sourceFiles: []
sourceFormat: latex
title:
  en: "LoRA: Low-Rank Adaptation of Large Language Models"
---
