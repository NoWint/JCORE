<div align="center">

# ChatMail Deploy for ANY Linux

在**任意非 Debian/Ubuntu 的 Linux** 上，使用 Docker 部署 [ChatMail Relay](https://github.com/chatmail/relay)——一个面向 [Delta Chat](https://delta.chat) 的端到端加密邮件中继服务器。

[English](README.md) | 简体中文

</div>

---

## 这是什么？

[ChatMail Relay](https://github.com/chatmail/relay) 为 Debian/Ubuntu 设计，深度依赖 Debian 特有机制（`apt`、`dpkg`、`policy-rc.d`、`www-data` 用户等）。本项目提供一套 **Docker 容器化"嫁接"方案**，让你能在 RHEL 系（阿里云 Linux、Rocky、CentOS、Fedora）、Arch 或任何其他 Linux 发行版上运行它——**无需修改 ChatMail 核心代码**。

- **Debian 依赖的服务**（Dovecot、Postfix、Nginx、OpenDKIM、fcgiwrap）运行在 Debian 12 容器内
- **宿主机原生服务**（chatmaild Python venv、filtermail、iroh-relay、mtail、unbound、certbot）直接跑在宿主机
- 两侧通过 **bind mount 文件卷和 Unix socket** 通信

已在 **阿里云 Linux 3**（RHEL 8 系）上实战验证，[踩坑指南](docs/PITFALLS.md) 记录了部署中遇到的每一个问题。

## 特性

- ✅ 一键部署脚本（`deploy.sh`）
- ✅ 适用于 RHEL 系 / Arch / 任意有 Docker + systemd 的 Linux
- ✅ `certbot` 替代 `acmetool` 管理 Let's Encrypt 证书
- ✅ 保留你现有的 Web 服务器（如宝塔 nginx）占用 80/443
- ✅ DNS 未就绪时自动回退到自签名证书
- ✅ 完整 Delta Chat 集成（IMAP/SMTP/DKIM/推送就绪）
- ✅ 双语文档（English / 简体中文）

## 架构

```
┌──────────────────────────────────────────────────────────┐
│                    宿主机（任意 Linux）                     │
│                                                           │
│  ┌────────────────── Docker (Debian 12) ───────────────┐  │
│  │  Dovecot    (IMAP/LMTP 邮件存储)                     │  │
│  │  Postfix    (SMTP 收发)                              │  │
│  │  Nginx      (仅内部: 127.0.0.1:10234)                │  │
│  │  OpenDKIM   (DKIM 签名)                              │  │
│  │  fcgiwrap   (CGI 账号创建 /new)                      │  │
│  └───────────────┬─────────────────────────────────────┘  │
│                  │ 文件卷 + Unix socket                    │
│                  ▼                                         │
│  ┌─────────────── 宿主机原生服务 ───────────────────┐     │
│  │  Python venv: doveauth / chatmail-metadata /      │     │
│  │                lastlogin / chatmail-expire         │     │
│  │  二进制:      filtermail / iroh-relay / mtail      │     │
│  │  系统包:      unbound (DNS) / certbot (ACME)       │     │
│  └────────────────────────────────────────────────────┘     │
│                                                           │
│  可选：你自己的 Web 服务器（宝塔 nginx、Apache...）        │
│  接管 80/443，把 /new 代理到容器                          │
└──────────────────────────────────────────────────────────┘
```

### 为什么用这种"嫁接"方案？

| 决策 | 理由 |
|---|---|
| 容器化 Dovecot/Postfix/Nginx/OpenDKIM | 依赖 Debian apt 包，避免重写源码 |
| chatmaild Python 服务宿主机原生 | 纯 Python，无需容器化 |
| 静态二进制宿主机原生 | filtermail/iroh-relay/mtail 是免编译二进制 |
| `certbot` 替代 `acmetool` | acmetool 不在 RHEL 仓库；certbot 是标准 |
| 宿主机 Web 服务器保留 80/443 | 保留你的网站，把 ChatMail 路径代理到容器 |
| 容器 nginx 只监听 127.0.0.1:10234 | 避免与宿主机端口冲突 |

### Unix socket 共享（核心难点）

ChatMail 的 Dovecot 认证依赖宿主机 Python 服务（doveauth/metadata/lastlogin）通过 Unix socket 通信。容器内 Dovecot 通过共享目录访问：

```
/home/vmail/run/doveauth/doveauth.socket           ← 认证
/home/vmail/run/chatmail-metadata/metadata.socket  ← IMAP METADATA
/home/vmail/run/chatmail-lastlogin/lastlogin.socket ← 登录时间
```

**为什么不用 `/run`**：容器内 `/run` 是 tmpfs，且宿主机 systemd 用 `RuntimeDirectory` 管理这些目录，导致 bind mount 失效。改用 `/home/vmail/run`（真实磁盘目录）后彻底解决。

## 快速开始

### 前置条件

- 一台有 Docker + systemd 的 Linux 服务器（已在阿里云 Linux 3 / RHEL 8 系验证）
- 一个域名，有 DNS 管理权限
- 防火墙 / 安全组放行端口（见下文）

### 第一步：上传代码

```bash
# 本地执行
scp -r /path/to/ChatMail root@<服务器IP>:/root/
```

### 第二步：运行部署脚本

```bash
cd /root/ChatMail
bash deploy/aliyun/deploy.sh your-domain.com --email admin@your-mail.com
```

脚本自动执行 9 步：系统初始化 → 生成 `chatmail.ini` → 构建 Docker 镜像 → 安装 chatmaild venv → 下载二进制 → 生成服务配置 → certbot TLS → unbound DNS → 启动服务。

### 第三步：配置 DNS

| 类型 | 主机记录 | 值 |
|---|---|---|
| A | `@` | 服务器公网 IP |
| A | `imap` | 服务器公网 IP |
| A | `smtp` | 服务器公网 IP |
| A | `mail` | 服务器公网 IP |
| A | `autoconfig` | 服务器公网 IP |
| MX | `@` | `your-domain.com.`（优先级 10） |
| CNAME | `www` | `your-domain.com.` |
| CNAME | `mta-sts` | `your-domain.com.` |
| TXT | `@` | `v=spf1 a ~all` |
| TXT | `_dmarc` | `v=DMARC1;p=reject;adkim=s;aspf=s` |

> **`autoconfig` 是 Delta Chat 创建账号的必需项。** 客户端使用 `dcaccount:your-domain.com`（或扫二维码）时，Delta Chat core 会拉取 autoconfig XML 来得知 IMAP/SMTP 服务器——它优先尝试 `https://autoconfig.your-domain.com/mail/config-v1.1.xml`，然后 `https://your-domain.com/.well-known/autoconfig/mail/config-v1.1.xml`。两者都不可达则账号创建失败。XML 由 genconfig.py 生成到 `/var/www/html/.well-known/autoconfig/mail/config-v1.1.xml`；宿主机 nginx 需直接服务它（见 [chatmail-proxy.conf](deploy/aliyun/chatmail-proxy.conf)）。

### 第四步：放行防火墙 / 安全组端口

| 协议 | 端口 | 用途 |
|---|---|---|
| TCP | 25 | SMTP |
| TCP | 143 / 993 | IMAP |
| TCP | 465 / 587 | SMTPS / Submission |
| TCP | 80 / 443 | HTTP / HTTPS |
| TCP | 3340 | iroh-relay（Delta Chat 实时推送） |

### 第五步：TLS 证书

等 DNS 生效后（`dig @8.8.8.8 your-domain.com +short` 能解析），申请**包含所有子域名**的证书：

```bash
fuser -k 80/tcp 2>/dev/null; sleep 2; \
certbot certonly --standalone --force-renewal \
  -d your-domain.com -d www.your-domain.com -d mta-sts.your-domain.com \
  -d imap.your-domain.com -d smtp.your-domain.com \
  --email admin@your-mail.com --agree-tos --non-interactive; \
systemctl restart nginx 2>/dev/null; docker exec chatmail nginx 2>/dev/null || true
```

> **为什么证书必须包含 imap/smtp**：Delta Chat 默认连接 `imap.域名` 和 `smtp.域名`。若证书不含这些 SAN，客户端会因主机名不匹配拒绝连接。

将证书同步到服务读取的路径：

```bash
mkdir -p /var/lib/acme/live/your-domain.com
ln -sf /etc/letsencrypt/live/your-domain.com/fullchain.pem /var/lib/acme/live/your-domain.com/fullchain
ln -sf /etc/letsencrypt/live/your-domain.com/privkey.pem /var/lib/acme/live/your-domain.com/privkey
```

> 若 certbot 生成的是 `your-domain.com-0001` 目录（因旧证书存在），把上述目录名换成 `your-domain.com-0001`。

### 第六步：宿主机 Web 服务器代理（可选）

如果你保留现有 Web 服务器（如宝塔 nginx）占用 80/443，把 [chatmail-proxy.conf](chatmail-proxy.conf) 的内容加入你的站点配置：

```bash
cat /root/ChatMail/deploy/aliyun/chatmail-proxy.conf
```

粘贴到服务器配置中，然后 `nginx -t && nginx -s reload`。

> **创建 Delta Chat 账号前**，先验证 autoconfig 正常——否则"通过二维码/链接添加"会失败：
>
> ```bash
> curl -s https://your-domain.com/.well-known/autoconfig/mail/config-v1.1.xml | head
> curl -s http://autoconfig.your-domain.com/config-v1.1.xml | head
> ```
>
> 两者都应返回 XML `<clientConfig>` 块。若不行见 PITFALLS #19。

## 用 Delta Chat 连接

1. 打开 Delta Chat → 添加账号 → **已有账号**（不是创建新账号）
2. 填写：
   - 邮箱：`<用户名>@your-domain.com`（通过 `curl -X POST http://127.0.0.1:10234/new` 获取）
   - 密码：返回的密码
   - IMAP/SMTP 服务器：`imap.your-domain.com` / `smtp.your-domain.com`

验证 `/new` 正常：

```bash
curl -X POST http://127.0.0.1:10234/new
# → {"email":"xxxx@your-domain.com","password":"..."}
```

## 外部发信：走 SMTP 中继（国内云必需）

阿里云 ECS（及多数国内云厂商）在**网络层硬封出站 TCP 25 端口**——客服明确**任何人都无法解封**（见 PITFALLS #22）。你的服务器能**收**任何地方的邮件（监听 25/465/993），但**无法直接发到外部邮箱**（Gmail/163/QQ 等），因为 MTA→MTA 投递固定走 25。

同域互发（`user1@your-domain.com` → `user2@your-domain.com`）不受影响：走本地 Dovecot LMTP，不出服务器。

外部发信需通过提供加密 SMTP 端口的中继转发。已验证的方案是**阿里云邮件推送（DirectMail）**：

```bash
# 在 /etc/postfix/main.cf（宿主机侧；容器通过只读挂载读取）
postconf -e "relayhost = [smtpdm.aliyun.com]:80"
postconf -e "smtp_tls_security_level = encrypt"
postconf -e "smtp_sasl_auth_enable = yes"
postconf -e "smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd"
postconf -e "smtp_sasl_security_options = noanonymous"
postconf -e "smtp_generic_maps = regexp:/etc/postfix/generic"
```

```bash
# 凭据（宿主机）
echo "smtpdm.aliyun.com noreply@your-domain.com:你的SMTP密码" > /etc/postfix/sasl_passwd
chmod 600 /etc/postfix/sasl_passwd && postmap /etc/postfix/sasl_passwd

# 把所有外部发件人改写成中继账号（DirectMail 要求 MAIL FROM == 认证账号，见 #26）
echo "/^.+@your-domain\.com$/ noreply@your-domain.com" > /etc/postfix/generic
docker exec chatmail postfix reload
```

三个中继专属的坑要格外注意：
- **用 80 端口（STARTTLS），别用 465** —— DirectMail 的隐式 TLS 握手后断连（#23）
- **`smtp_generic_maps` 必须用 `regexp:`** —— `hash:` 只做精确键匹配，正则永不命中（#25）
- **DirectMail 拒绝「发件人 ≠ 认证账号」**，报 `436 "MAIL FROM" doesn't conform with authentication`（#26）

测试真实中继发送：

```bash
docker exec chatmail sh -c 'echo "relay test $(date)" | sendmail recipient@external.com'
docker exec chatmail sh -c 'tail -3 /var/log/mail.log | grep -E "status="'
# → ... relay=smtpdm.aliyun.com ... status=sent
```

## 踩坑记录

实战部署中遇到的每个问题都记录在 [docs/PITFALLS.md](docs/PITFALLS.md)——**26 条**，每条都是 **现象 → 根因 → 解决方案**。要点：

1. CRLF 换行符破坏 `/new`（`python3\r`）
2. `/run` tmpfs 破坏 Docker socket 共享
3. 把宿主机 `nginx.conf` 挂载进容器导致端口冲突
4. 国内 Docker DNS 解析失败
5. editable 安装的 venv 丢失 `chatmaild` 模块
6. 缺邮箱目录导致 `chatmail-metadata` 崩溃循环
7. 证书 SAN 缺少 `imap`/`smtp` 子域名
8. 阿里云 `epel-aliyuncs-release` 与 `epel-release` 冲突
9. 国内网络无法下载自定义 Dovecot `.deb`
10. 云安全组与宿主机 `firewalld` 双重防火墙
11. 宿主机 postfix 占着 25 端口 → 容器 postfix 起不来（#21）
12. 出站 25 端口被云厂商硬封，无法解封（#22）
13. 邮件推送中继：465 握手后断 → 用 80 STARTTLS（#23）
14. `no mechanism available`：缺 SASL 插件 + chroot（#24）
15. `smtp_generic_maps` 必须用 `regexp:` 而非 `hash:`（#25）
16. 中继报 436「MAIL FROM 与认证账号不符」（#26）

## 部署验证

部署完成后，按 [逐步验证清单](docs/VERIFICATION.md) 检查——10 个步骤逐层隔离问题（服务 → socket → 端口 → 证书 → 外部可达性 → 真实登录），附带一键健康检查脚本。

## 日常维护

### 更新 relay 代码

```bash
# 服务器上拉取新代码后
cd /root/ChatMail
docker rm -f chatmail 2>/dev/null
cd docker && bash build.sh && cd ..
bash deploy/aliyun/deploy.sh your-domain.com --email admin@your-mail.com
```

> `deploy.sh` 幂等，会跳过已完成步骤，重复运行基本只是重建并重启容器。

### 续期证书（certbot 每天自动续期）

```bash
certbot renew                      # 手动触发一次续期
systemctl list-timers certbot      # 确认续期定时器
```

续期后 hook 会自动重载服务；若手动续期，需手动重载：

```bash
docker exec chatmail doveadm reload
docker exec chatmail postfix reload
docker exec chatmail nginx -s reload
```

### 备份

最小必要备份（设计上不保留隐私数据）：

```bash
tar czf /root/chatmail-backup-$(date +%F).tar.gz \
  /home/vmail/run \
  /usr/local/lib/chatmaild/chatmail.ini \
  /etc/dkimkeys /etc/letsencrypt /var/lib/acme
```

> 邮件内容会按策略自动删除（默认 20 天），需要备份的是配置、DKIM 密钥和证书。

### 容器内修改是临时的

任何 `docker exec` 的修改（比如 `sed` 修 `/usr/lib/cgi-bin/newemail.py`）在 `docker restart` 后会丢失。要永久生效必须改源码 + 重建镜像（见 PITFALLS #14、#18）。

## 项目结构

| 文件 | 作用 |
|---|---|
| `docker/Dockerfile` | Debian 12 镜像：Dovecot/Postfix/Nginx/OpenDKIM/fcgiwrap + chatmaild |
| `docker/entrypoint.sh` | 容器入口：目录、证书、newemail.py、服务 |
| `docker/build.sh` | Docker DNS/镜像加速配置 + 构建 |
| `deploy/aliyun/deploy.sh` | 一键部署脚本（9 步） |
| `deploy/aliyun/genconfig.py` | 渲染服务配置模板 |
| `deploy/aliyun/chatmail-proxy.conf` | 宿主机 Nginx 代理片段 |
| `deploy/aliyun/docs/PITFALLS.md` | 实战踩坑记录（26 条） |
| `deploy/aliyun/docs/VERIFICATION.md` | 部署验证清单 |
| `deploy/aliyun/README.md` | English version |
| `deploy/aliyun/README.zh-CN.md` | 本文件 |

## 对上游的修改

相对上游 [chatmail/relay](https://github.com/chatmail/relay) 修改的文件：

| 文件 | 修改内容 |
|---|---|
| `cmdeploy/src/cmdeploy/service/doveauth.service.f` | socket 路径 → `/home/vmail/run/doveauth/`，删除 `RuntimeDirectory` |
| `cmdeploy/src/cmdeploy/service/chatmail-metadata.service.f` | 同上 |
| `cmdeploy/src/cmdeploy/service/lastlogin.service.f` | 同上 |
| `cmdeploy/src/cmdeploy/dovecot/auth.conf` | auth socket 路径 |
| `cmdeploy/src/cmdeploy/dovecot/dovecot.conf.j2` | metadata/lastlogin socket 路径 |
| `cmdeploy/src/cmdeploy/postfix/main.cf.j2` | banner 移除 `(Debian/GNU)` |
| `cmdeploy/src/cmdeploy/nginx/nginx.conf.j2` | `www-data` → `nginx` |

## 许可证

[MIT](../../LICENSE)
