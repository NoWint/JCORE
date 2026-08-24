---
abstract:
  en: While large-scale unsupervised language models (LMs) learn broad world
    knowledge and some reasoning skills, achieving precise control of their
    behavior is difficult due to the completely unsupervised nature of their
    training. Existing methods for gaining such steerability collect human
    labels of the relative quality of model generations and fine-tune the
    unsupervised LM to align with these preferences, often with reinforcement
    learning from human feedback (RLHF). However, RLHF is a complex and often
    unstable procedure, first fitting a reward model that reflects the human
    preferences, and then fine-tuning the large unsupervised LM using
    reinforcement learning to maximize this estimated reward without drifting
    too far from the original model. In this paper we introduce a new
    parameterization of the reward model in RLHF that enables extraction of the
    corresponding optimal policy in closed form, allowing us to solve the
    standard RLHF problem with only a simple classification loss. The resulting
    algorithm, which we call Direct Preference Optimization (DPO), is stable,
    performant, and computationally lightweight, eliminating the need for
    sampling from the LM during fine-tuning or performing significant
    hyperparameter tuning. Our experiments show that DPO can fine-tune LMs to
    align with human preferences as well as or better than existing methods.
    Notably, fine-tuning with DPO exceeds PPO-based RLHF in ability to control
    sentiment of generations, and matches or improves response quality in
    summarization and single-turn dialogue while being substantially simpler to
    implement and train.
bodyLanguage: en
contributors:
  - name: Rafael Rafailov
  - name: Archit Sharma
  - name: Eric Mitchell
  - name: Stefano Ermon
  - name: Christopher D. Manning
  - name: Chelsea Finn
conversion:
  importer: jcore-import@0.1.0
  outputChecksum: aa514a16bfd56cc6ea66c6bacca9c9ea43dc7b248b822bada11fcb08efe8277f
  reportPath: import-report.json
  status: converted
identifiers:
  arxiv: "2305.18290"
keywords:
  - en: preference optimization
  - en: language model alignment
  - en: reinforcement learning from human feedback
kind: external
notPublishedByJCORE: true
officialUrl: https://arxiv.org/abs/2305.18290
originalPublicationDate: 2023-05-29
originalPublisher: arXiv
originalVenue: Advances in Neural Information Processing Systems (NeurIPS 2023)
provenance:
  checksum: ba993bff346aa741e5b33b3f3ad438ea15e54cd2d44ca5d00dbbf94375519ed7
  importer: jcore-import@0.1.0
  retrievalDate: 2026-08-24
  sourceFormat: latex
  sourcePackagePath: sources/latex/2305.18290
renderMode: structured
rights:
  copyrightHolder: The Authors
  evidenceUrl: https://arxiv.org/abs/2305.18290
  license:
    id: arxiv-nonexclusive-distrib
    url: https://arxiv.org/licenses/nonexclusive-distrib/1.0/
  permitsRedistribution: true
  statement: Redistributed under the arXiv non-exclusive distribution license for
    scholarly use.
slug: direct-preference-optimization
sourceFiles: []
sourceFormat: latex
title:
  en: "Direct Preference Optimization: Your Language Model is Secretly a Reward
    Model"
---
