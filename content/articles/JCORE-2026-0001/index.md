---
kind: jcore
id: JCORE-2026-0001
title:
  en: "ChatMail Deploy for ANY Linux: A Docker-Based Deployment Architecture for Non-Debian Systems"
  zh: "ChatMail ANY Linux 部署：面向非 Debian 系统的 Docker 部署架构"
abstract:
  en: "This technical note documents a practical deployment architecture for ChatMail Relay on non-Debian Linux distributions. The approach keeps Debian-dependent mail services inside a Debian 12 container while running Python services, static binaries, DNS, and certificate automation on the host, joining both sides through bind-mounted volumes and Unix sockets."
  zh: "本文档记录一种在非 Debian Linux 发行版上部署 ChatMail Relay 的实践架构：将依赖 Debian 的邮件服务运行在 Debian 12 容器中，同时让 Python 服务、静态二进制程序、DNS 与证书自动化运行在宿主机，并通过绑定挂载目录与 Unix socket 连接两侧。"
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
  - path: https://github.com/TiantianYZJ/ChatMail-ANY-Linux-Deploy
    label: Source repository
    kind: supplementary
conversion:
  status: converted
  importer: jcore@0.1.0
  outputChecksum: "0f7f3839faa346f5fc3d0d7ce8b496ba973b8c48b7822b1a801a072554ec400d"
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
  statement: Adapted from the MIT-licensed ChatMail-ANY-Linux-Deploy project with source attribution preserved.
code: https://github.com/TiantianYZJ/ChatMail-ANY-Linux-Deploy
demo: false
---
