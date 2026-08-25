---
kind: jcore
id: JCORE-2026-0003
title:
  en: "Safe Conservative GC is What You Need"
  zh: "Safe Conservative GC is What You Need"
abstract:
  en: "Conservative garbage collection avoids compiler-maintained precise root maps by scanning stacks and registers for values that resemble heap pointers, but false roots can retain garbage indefinitely. This paper presents False-Root Aging Theory, which bounds false-root retention through a non-renewable lease and punitive age, distinguishes trace-confirmed from conservative marks, and preserves trace-reachable objects under explicit assumptions. It develops extrinsic, intrinsic, and hybrid lease instantiations, introduces Defensive Re-verification Demotion (DRD) as a two-safepoint confirmation protocol, and derives finite convergence bounds for transient and oscillating false roots. The intrinsic mechanism is unbounded for a persistent false root in isolation; the hybrid lease closes that boundary at the cost of an address-keyed table and an ABA hazard. Experiments in a virtual machine report the predicted convergence behavior, sub-25 microsecond stop-the-world pauses in the reported configurations, and zero observed use-after-free in the tested workloads. The guarantees remain conditional on state observability, cooperative safepoints, GC-aware allocation, and a monotonic epoch clock."
  zh: "保守式垃圾回收通过扫描栈和寄存器中看似堆指针的值，避免依赖编译器维护精确根映射，但错误根可能使垃圾对象无限期存活。本文提出 False-Root Aging Theory，通过不可续租的租约与惩罚性年龄限制错误根的保留时间，区分堆追踪确认标记与保守扫描标记，并在明确假设下保护可由堆追踪到达的对象。本文给出外置租约、内置租约和混合租约三种实例化方式，引入 Defensive Re-verification Demotion（DRD）双安全点确认协议，并推导瞬时与振荡错误根的有限收敛界。单独的内置机制无法限制每周期都出现的持久错误根；混合租约以地址索引表和相应 ABA 风险为代价关闭该边界。虚拟机实验报告了预测的收敛行为、所测配置下低于 25 微秒的停顿，以及测试工作负载中未观察到 use-after-free。相关保证仍依赖状态可观测性、协作式安全点、GC 感知分配和单调纪元时钟等条件。"
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
license:
  id: cc-by-4.0
  url: https://creativecommons.org/licenses/by/4.0/
  holder: Anonymous
  statement: This article is released under the Creative Commons Attribution 4.0 International license. The author is listed as Anonymous at the author's request.
demo: false
---
