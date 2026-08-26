---
kind: jcore
id: JCORE-2026-0003
title:
  en: "Safe Conservative GC is What You Need"
  zh: "Safe Conservative GC is What You Need"
abstract:
  en: "Conservative garbage collection scans the full thread state—stack and registers—for values that resemble pointers, avoiding the bookkeeping that precise rooting demands. It has been the workhorse of legacy runtimes since Boehm’s 1993 paper, because it trades a little sloppiness for a great deal of simplicity. This paper presents False-Root Aging Theory, which bounds false-root retention through a non-renewable lease and punitive age, distinguishes trace-confirmed from conservative marks, and preserves trace-reachable objects under explicit assumptions. It develops extrinsic, intrinsic, and hybrid lease instantiations, introduces Defensive Re-verification Demotion (DRD) and the Unified Hybrid Lease (UHL), and derives finite convergence bounds for transient, oscillating, and persistent false roots. Experiments in a virtual machine report the predicted convergence behavior, sub-10 microsecond stop-the-world pauses across the tested heap sizes, and zero observed use-after-free under true concurrent marking. The guarantees remain conditional on state observability, cooperative safepoints, GC-aware allocation, and a monotonic epoch clock."
  zh: "保守式垃圾回收扫描完整线程状态——包括栈和寄存器——寻找看似指针的值，从而避免精确根映射所需的簿记工作。它自 Boehm 1993 年的工作以来一直是遗留运行时的常用方案，以少量不精确换取实现简洁。本文提出 False-Root Aging Theory，通过不可续租的租约与惩罚性年龄限制错误根的保留时间，区分堆追踪确认标记与保守推测标记，并在明确假设下保护由堆追踪可达的对象。本文给出外置、内置和混合租约三种实例化方式，引入 Defensive Re-verification Demotion（DRD）与 Unified Hybrid Lease（UHL），并推导瞬时、振荡和持久错误根的有限收敛界。虚拟机实验报告了预测的收敛行为、所测堆规模下低于 10 微秒的停顿，以及真实并发标记过程中未观察到 use-after-free。相关保证仍依赖状态可观测性、协作式安全点、GC 感知分配和单调纪元时钟等条件。"
keywords:
  - en: conservative garbage collection
    zh: 保守式垃圾回收
  - en: false roots
    zh: 错误根
  - en: garbage collection safety
    zh: 垃圾回收安全
  - en: epoch-based reclamation
    zh: 基于纪元的回收
  - en: memory reclamation
    zh: 内存回收
  - en: runtime systems
    zh: 运行时系统
bodyLanguage: en
renderMode: structured
sourceFormat: pdf
sourceFiles:
  - path: /sources/JCORE-2026-0003/Safe_Conservative_GC_Theory.pdf
    label: Original PDF
    kind: pdf
conversion:
  status: converted
  importer: jcore@0.1.0-manual-pdf
  outputChecksum: "8ff6038b603e2c196a490d018d2257e9546f8a797323d0bd60ff0921c57ba0b3"
  reportPath: import-report.json
authors:
  - authorId: anonymous
    order: 1
    corresponding: true
articleType: research-article
status: published
volume: 1
issue: 1
year: 2026
dates:
  received: 2026-08-24
  accepted: 2026-08-24
  published: 2026-08-24
events:
  - type: submitted
    date: 2026-08-24
  - type: accepted
    date: 2026-08-24
  - type: version-of-record
    date: 2026-08-24
  - type: revised
    date: 2026-08-26
    note:
      en: "Updated manuscript PDF uploaded."
      zh: "已上传更新后的论文 PDF。"
license:
  id: cc-by-4.0
  url: https://creativecommons.org/licenses/by/4.0/
  holder: Anonymous
  statement: This article is released under the Creative Commons Attribution 4.0 International license. The author is listed as Anonymous at the author's request.
demo: false
---
