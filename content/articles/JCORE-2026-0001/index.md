---
kind: jcore
id: JCORE-2026-0001
title:
  en: "ChatMail Deploy for ANY Linux: A Docker-Based Deployment Architecture for Non-Debian Systems"
  zh: "ChatMail ANY Linux 部署：面向非 Debian 系统的 Docker 部署架构"
abstract:
  en: "ChatMail Relay is designed for Debian/Ubuntu and relies heavily on Debian-specific mechanisms (apt, dpkg, policy-rc.d, and the www-data user). This project provides a Docker-based grafting solution for RHEL-family distributions, Arch, and other Linux systems without modifying ChatMail's core code."
  zh: "ChatMail Relay 为 Debian/Ubuntu 设计，深度依赖 Debian 特有机制（apt、dpkg、policy-rc.d、www-data 用户等）。本项目提供一套 Docker 容器化“嫁接”方案，让你能在 RHEL 系、Arch 或其他 Linux 发行版上运行它，而无需修改 ChatMail 核心代码。"
keywords:
  - en: ChatMail Relay
    zh: ChatMail Relay
  - en: Delta Chat
    zh: Delta Chat
  - en: Docker
    zh: Docker
  - en: Linux deployment
    zh: Linux 部署
  - en: mail infrastructure
    zh: 邮件基础设施
bodyLanguage: en
renderMode: structured
sourceFormat: markdown
sourceFiles:
  - path: https://github.com/TiantianYZJ/ChatMail-ANY-Linux-Deploy/blob/main/README.md
    label: Original project README
    kind: source
  - path: https://github.com/TiantianYZJ/ChatMail-ANY-Linux-Deploy/blob/main/README.zh-CN.md
    label: Original Chinese project README
    kind: source
  - path: https://github.com/TiantianYZJ/ChatMail-ANY-Linux-Deploy
    label: Source repository
    kind: supplementary
conversion:
  status: converted
  importer: jcore@0.1.0
  outputChecksum: "7041145acf35cafb08cebc7691998388c1da00e7ab32d021b5f31bd14d33fc90"
  reportPath: import-report.json
authors:
  - authorId: tiantianyzj
    order: 1
    corresponding: true
articleType: research-note
status: published
volume: 1
issue: 1
year: 2026
dates:
  received: 2026-08-02
  accepted: 2026-08-18
  published: 2026-08-20
events:
  - type: submitted
    date: 2026-08-02
  - type: revised
    date: 2026-08-12
  - type: accepted
    date: 2026-08-18
  - type: version-of-record
    date: 2026-08-20
license:
  id: mit
  url: https://opensource.org/license/mit/
  holder: TiantianYZJ; chatmail and delta chat teams
  statement: Original README content from the MIT-licensed ChatMail-ANY-Linux-Deploy project, with source attribution preserved.
code: https://github.com/TiantianYZJ/ChatMail-ANY-Linux-Deploy
demo: false
---
