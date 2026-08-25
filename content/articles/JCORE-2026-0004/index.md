---
kind: jcore
id: JCORE-2026-0004
title:
  en: "The Implementation of LDFC in Vredrs 0.1.5"
  zh: "Vredrs 0.1.5 中 LDFC 的实现"
abstract:
  en: "This paper describes LDFC, a conservative garbage collector implemented in the Vredrs 0.1.5 dynamically typed virtual machine. LDFC combines conservative stack and register scanning with False-Root Aging Theory, lazy epoch reset, card-table write barriers, incremental sweeping, epoch-based reclamation, and Defensive Re-verification Demotion (DRD). The implementation uses a packed atomic object-header state, a chunked object table, direct slot-index object identifiers, and a destruct queue with backpressure. The paper explains the synchronous and concurrent collection paths, the parent-marking barrier rule that avoids stale-child roots, and the Tolerant Generational Collection (TGC) extension. Reported measurements include 9.7% write-barrier overhead, a 1.4x slowdown relative to a no-GC baseline, 8.8-9.7 microsecond p50 pauses for heaps from 10,000 to 500,000 objects in the reported configuration, and a 2.1x TGC throughput improvement. The results are implementation measurements rather than an independent security proof or a general benchmark across virtual machines."
  zh: "本文介绍 LDFC：一种实现于动态类型虚拟机 Vredrs 0.1.5 中的保守式垃圾回收器。LDFC 将栈和寄存器的保守扫描与 False-Root Aging Theory、惰性纪元重置、卡表写屏障、增量清扫、基于纪元的回收以及 Defensive Re-verification Demotion（DRD）结合起来。实现采用打包的原子对象头状态、分块对象表、基于槽位索引的对象标识，以及带背压的析构队列。本文说明同步和并发回收路径、用于避免陈旧子对象根的父对象标记规则，以及 Tolerant Generational Collection（TGC）扩展。报告的测量包括 9.7% 的写屏障开销、相对无 GC 基线 1.4 倍的减速、在所报告配置下 10,000 至 500,000 对象堆上的 8.8-9.7 微秒 p50 停顿，以及 2.1 倍的 TGC 吞吐提升。结果是实现测量，并不等同于独立安全证明或跨虚拟机通用基准。"
keywords:
  - en: LDFC
    zh: LDFC
  - en: Vredrs
    zh: Vredrs
  - en: conservative scanning
    zh: 保守扫描
  - en: lazy epoch reset
    zh: 惰性纪元重置
  - en: card-table barrier
    zh: 卡表屏障
  - en: generational garbage collection
    zh: 分代垃圾回收
bodyLanguage: en
renderMode: structured
sourceFormat: pdf
sourceFiles:
  - path: /sources/JCORE-2026-0004/LDFC_Implementation_Vredrs_0_1_5.pdf
    label: Original PDF
    kind: pdf
conversion:
  status: converted
  importer: jcore@0.1.0-manual-pdf
  outputChecksum: "899515b03f489d98ddebeff08d192c9a1e49b5b55427ff186805571d8ec2aaa3"
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
license:
  id: cc-by-4.0
  url: https://creativecommons.org/licenses/by/4.0/
  holder: Anonymous
  statement: This article is released under the Creative Commons Attribution 4.0 International license. The author is listed as Anonymous at the author's request.
demo: false
---
