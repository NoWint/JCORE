---
kind: jcore
id: JCORE-2026-0002
title:
  en: "PEYT Chat: A Local-First Desktop Messaging and Collaboration Architecture over Delta Chat"
  zh: "PEYT Chat：基于 Delta Chat 的本地优先桌面消息与协作架构"
abstract:
  en: "PEYT Chat is a cross-platform desktop messaging and collaboration application built by combining Delta Chat Core, Tauri 2, Rust, TypeScript, and SQLite. This technical research note presents its architecture and privacy boundary. The system delegates account management, message transport, encryption, and SecureJoin operations to Delta Chat Core; a Rust/Tauri process exposes a command and event interface to a WebView; SQLite stores application-level workspaces, channels, cards, notifications, and knowledge metadata; and application-level JSON envelopes extend ordinary chat messages with collaboration semantics. The design is local-first in the sense that message data and collaboration state are persisted in the client and the main user interface does not require a central application server, while optional remote LLM providers remain an explicit data-egress path. The note contributes an implementation-oriented architecture description, a threat-oriented privacy analysis, and a reproducibility checklist. It does not claim an independent cryptographic audit or a controlled performance benchmark."
  zh: "PEYT Chat 是一款结合 Delta Chat Core、Tauri 2、Rust、TypeScript 与 SQLite 构建的跨平台桌面消息与协作应用。本文从系统架构与隐私边界两个方面记录其实现：账号管理、消息传输、加密与 SecureJoin 操作由 Delta Chat Core 承担；Rust/Tauri 主进程向 WebView 暴露命令与事件接口；SQLite 保存工作区、频道、卡片、通知与知识元数据；应用层 JSON 信封则在普通聊天消息之上扩展协作语义。该设计具有本地优先特征，消息数据与协作状态主要持久化在客户端，主界面不依赖中心化应用服务器；同时，远端 LLM 提供商被明确视为可能的数据出口。本文给出面向实现的架构说明、面向威胁的隐私分析与可复现检查清单，但不宣称完成独立密码学审计或受控性能基准测试。"
keywords:
  - en: local-first systems
    zh: 本地优先系统
  - en: Delta Chat
    zh: Delta Chat
  - en: end-to-end encryption
    zh: 端到端加密
  - en: Tauri
    zh: Tauri
  - en: privacy engineering
    zh: 隐私工程
  - en: desktop collaboration
    zh: 桌面协作
  - en: event-driven architecture
    zh: 事件驱动架构
bodyLanguage: en
renderMode: structured
sourceFormat: manual
sourceFiles:
  - path: https://github.com/NoWint/PleaseEnterYourTextCommunity
    label: PEYT Chat source repository
    kind: source
  - path: https://github.com/NoWint/PleaseEnterYourTextCommunity/blob/main/docs/architecture.md
    label: PEYT Chat architecture documentation
    kind: supplementary
  - path: https://github.com/chatmail/core
    label: Delta Chat Core source repository
    kind: supplementary
conversion:
  status: converted
  importer: jcore@0.1.0
  outputChecksum: "47f729d36fd4827e76a5f1437042bc70c81b4beb60d750c6d5bc0271fb430838"
  reportPath: import-report.json
authors:
  - authorId: nowint
    order: 1
    corresponding: true
articleType: research-note
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
  holder: NoWint
  statement: This article is released under the Creative Commons Attribution 4.0 International license.
code: https://github.com/NoWint/PleaseEnterYourTextCommunity
demo: false
---
