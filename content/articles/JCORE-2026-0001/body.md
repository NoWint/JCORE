<div align="center">

# ChatMail Deploy for ANY Linux

Deploy the [ChatMail Relay](https://github.com/chatmail/relay) — an end-to-end encrypted email relay for [Delta Chat](https://delta.chat) — on **any non-Debian/Ubuntu Linux** using Docker.

English | [简体中文](README.zh-CN.md)

</div>

---

## What is this?

[ChatMail Relay](https://github.com/chatmail/relay) is designed for Debian/Ubuntu and relies heavily on Debian-specific mechanisms (`apt`, `dpkg`, `policy-rc.d`, the `www-data` user, etc.). This project provides a **Docker-based "grafting" solution** that lets you run it on RHEL-family (Alibaba Cloud Linux, Rocky, CentOS, Fedora), Arch, or any other Linux distribution — **without modifying ChatMail's core code**.

- **Debian-dependent services** (Dovecot, Postfix, Nginx, OpenDKIM, fcgiwrap) run inside a Debian 12 container.
- **Native services** (chatmaild Python venv, filtermail, iroh-relay, mtail, unbound, certbot) run directly on the host.
- The two sides communicate through **bind-mounted file volumes and Unix sockets**.

Field-tested on **Alibaba Cloud Linux 3** (RHEL 8 based), with a [pitfalls guide](docs/PITFALLS.md) covering every issue encountered.

## Features

- ✅ One-command deployment script (`deploy.sh`)
- ✅ Works on RHEL-family / Arch / any Linux with Docker + systemd
- ✅ `certbot` replaces `acmetool` for Let's Encrypt
- ✅ Keep your existing web server (e.g. BT-Panel Nginx) on port 80/443
- ✅ Automatic self-signed cert fallback before DNS is ready
- ✅ Full Delta Chat integration (IMAP/SMTP/DKIM/push-ready)
- ✅ Bilingual docs (English / 简体中文)

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Host (any Linux)                      │
│                                                           │
│  ┌────────────────── Docker (Debian 12) ───────────────┐  │
│  │  Dovecot    (IMAP/LMTP mail storage)                │  │
│  │  Postfix    (SMTP send/receive)                     │  │
│  │  Nginx      (internal only: 127.0.0.1:10234)        │  │
│  │  OpenDKIM   (DKIM signing)                          │  │
│  │  fcgiwrap   (CGI account creation /new)             │  │
│  └───────────────┬─────────────────────────────────────┘  │
│                  │ volumes + Unix sockets                 │
│                  ▼                                         │
│  ┌─────────────── Native host services ───────────────┐   │
│  │  Python venv: doveauth / chatmail-metadata /        │   │
│  │                lastlogin / chatmail-expire          │   │
│  │  Binaries:   filtermail / iroh-relay / mtail        │   │
│  │  Packages:   unbound (DNS) / certbot (ACME)         │   │
│  └────────────────────────────────────────────────────┘   │
│                                                           │
│  Optional: your own web server (BT-Panel, Apache, ...)    │
│  handles 80/443 and proxies /new to the container         │
└──────────────────────────────────────────────────────────┘
```

### Why this "grafting" approach?

| Decision | Rationale |
|---|---|
| Containerize Dovecot/Postfix/Nginx/OpenDKIM | They depend on Debian `apt` packages; avoids rewriting source |
| Run chatmaild Python services natively | Pure Python, no containerization needed |
| Run static binaries natively | filtermail/iroh-relay/mtail are prebuilt, arch-specific |
| `certbot` instead of `acmetool` | acmetool is absent from RHEL repos; certbot is the standard |
| Keep host web server on 80/443 | Preserve your existing website; proxy ChatMail paths to the container |
| Container Nginx on 127.0.0.1:10234 only | Avoids port conflicts with the host |

### Unix socket sharing (the tricky part)

ChatMail's Dovecot authentication depends on host Python services (doveauth/metadata/lastlogin) communicating over Unix sockets. The container's Dovecot reaches them through a shared directory:

```
/home/vmail/run/doveauth/doveauth.socket           ← authentication
/home/vmail/run/chatmail-metadata/metadata.socket  ← IMAP METADATA
/home/vmail/run/chatmail-lastlogin/lastlogin.socket ← login tracking
```

**Why not `/run`?** Inside a container `/run` is a tmpfs, and host systemd manages these dirs via `RuntimeDirectory`, which breaks bind mounts. Moving sockets to `/home/vmail/run` (a real disk dir) fixes it.

## Getting Started

### Prerequisites

- A Linux server with Docker + systemd (tested on Alibaba Cloud Linux 3, RHEL 8 based)
- A domain with DNS management access
- Firewall / security-group ports opened (see below)

### Step 1: Upload the code

```bash
# from your local machine
scp -r /path/to/ChatMail root@<server-ip>:/root/
```

### Step 2: Run the deploy script

```bash
cd /root/ChatMail
bash deploy/aliyun/deploy.sh your-domain.com --email admin@your-mail.com
```

The script performs 9 steps: system init → generate `chatmail.ini` → build Docker image → install chatmaild venv → download binaries → generate service configs → certbot TLS → unbound DNS → start services.

### Step 3: Configure DNS

| Type | Host | Value |
|---|---|---|
| A | `@` | server public IP |
| A | `imap` | server public IP |
| A | `smtp` | server public IP |
| A | `mail` | server public IP |
| A | `autoconfig` | server public IP |
| MX | `@` | `your-domain.com.` (priority 10) |
| CNAME | `www` | `your-domain.com.` |
| CNAME | `mta-sts` | `your-domain.com.` |
| TXT | `@` | `v=spf1 a ~all` |
| TXT | `_dmarc` | `v=DMARC1;p=reject;adkim=s;aspf=s` |

> **`autoconfig` is required for Delta Chat account creation.** When a client uses `dcaccount:your-domain.com` (or scans a QR), Delta Chat core fetches an autoconfig XML to learn the IMAP/SMTP servers — it tries `https://autoconfig.your-domain.com/mail/config-v1.1.xml` first, then `https://your-domain.com/.well-known/autoconfig/mail/config-v1.1.xml`. If neither resolves, account setup fails. The XML is generated into `/var/www/html/.well-known/autoconfig/mail/config-v1.1.xml`; make sure your host nginx serves it directly (see [chatmail-proxy.conf](deploy/aliyun/chatmail-proxy.conf)).

### Step 4: Open ports in firewall / security group

| Protocol | Port | Purpose |
|---|---|---|
| TCP | 25 | SMTP |
| TCP | 143 / 993 | IMAP |
| TCP | 465 / 587 | SMTPS / Submission |
| TCP | 80 / 443 | HTTP / HTTPS |
| TCP | 3340 | iroh-relay (Delta Chat realtime push) |

### Step 5: TLS certificate

Wait until DNS propagates (`dig @8.8.8.8 your-domain.com +short` resolves), then issue a certificate covering **all subdomains**:

```bash
fuser -k 80/tcp 2>/dev/null; sleep 2; \
certbot certonly --standalone --force-renewal \
  -d your-domain.com -d www.your-domain.com -d mta-sts.your-domain.com \
  -d imap.your-domain.com -d smtp.your-domain.com \
  --email admin@your-mail.com --agree-tos --non-interactive; \
systemctl restart nginx 2>/dev/null; docker exec chatmail nginx 2>/dev/null || true
```

> **Why must the cert include imap/smtp?** Delta Chat connects to `imap.域名` and `smtp.域名` by default. Without these SANs, clients reject the cert on hostname mismatch.

Sync the cert to the paths services read:

```bash
mkdir -p /var/lib/acme/live/your-domain.com
ln -sf /etc/letsencrypt/live/your-domain.com/fullchain.pem /var/lib/acme/live/your-domain.com/fullchain
ln -sf /etc/letsencrypt/live/your-domain.com/privkey.pem /var/lib/acme/live/your-domain.com/privkey
```

> If certbot produced `your-domain.com-0001` (because an older cert existed), use that directory name instead.

### Step 6: Host web server proxy (optional)

If you keep your existing web server (e.g. BT-Panel Nginx) on 80/443, add the [chatmail-proxy.conf](chatmail-proxy.conf) rules to your site config:

```bash
cat /root/ChatMail/deploy/aliyun/chatmail-proxy.conf
```

Paste into your server config, then `nginx -t && nginx -s reload`.

> **Before creating a Delta Chat account**, verify autoconfig works — otherwise "add transport from QR" fails:
>
> ```bash
> curl -s https://your-domain.com/.well-known/autoconfig/mail/config-v1.1.xml | head
> curl -s http://autoconfig.your-domain.com/config-v1.1.xml | head
> ```
>
> Both should return an XML `<clientConfig>` block. See PITFALLS #19 if not.

## Connecting with Delta Chat

1. Open Delta Chat → Add account → **I have an account already** (not "create new")
2. Fill in:
   - Email: `<username>@your-domain.com` (obtain via `curl -X POST http://127.0.0.1:10234/new`)
   - Password: the returned password
   - IMAP/SMTP server: `imap.your-domain.com` / `smtp.your-domain.com`

Verify `/new` works:

```bash
curl -X POST http://127.0.0.1:10234/new
# → {"email":"xxxx@your-domain.com","password":"..."}
```

## External delivery via SMTP relay (required on mainland-China clouds)

Aliyun ECS (and most mainland-China vendors) **block outbound TCP 25 at the network layer — nobody can unblock it** (see PITFALLS #22). Your server can receive mail from anywhere (it listens on 25/465/993), but it **cannot directly send to external mailboxes** (Gmail/163/QQ…), because MTA→MTA delivery uses port 25.

In-domain mail (`user1@your-domain.com` → `user2@your-domain.com`) is unaffected: it goes through local Dovecot LMTP, never leaving the box.

For external delivery, relay through a provider that offers an encrypted SMTP port. The proven setup is **Aliyun DirectMail**:

```bash
# in /etc/postfix/main.cf (host side; the container reads it via a ro bind-mount)
postconf -e "relayhost = [smtpdm.aliyun.com]:80"
postconf -e "smtp_tls_security_level = encrypt"
postconf -e "smtp_sasl_auth_enable = yes"
postconf -e "smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd"
postconf -e "smtp_sasl_security_options = noanonymous"
postconf -e "smtp_generic_maps = regexp:/etc/postfix/generic"
```

```bash
# credentials (host)
echo "smtpdm.aliyun.com noreply@your-domain.com:YOUR_SMTP_PASSWORD" > /etc/postfix/sasl_passwd
chmod 600 /etc/postfix/sasl_passwd && postmap /etc/postfix/sasl_passwd

# rewrite every external sender to the relay account (DirectMail requires
# MAIL FROM == authenticated account, see PITFALLS #26)
echo "/^.+@your-domain\.com$/ noreply@your-domain.com" > /etc/postfix/generic
docker exec chatmail postfix reload
```

Watch for the three relay-specific pitfalls:
- **Use port 80 (STARTTLS), not 465** — DirectMail's implicit-TLS drops after the handshake (#23).
- **`smtp_generic_maps` must be `regexp:`** — `hash:` does exact-key lookups and never matches the regex (#25).
- **DirectMail rejects senders ≠ the authenticated account** with `436 "MAIL FROM" doesn't conform with authentication` (#26).

Test a real relay send:

```bash
docker exec chatmail sh -c 'echo "relay test $(date)" | sendmail recipient@external.com'
docker exec chatmail sh -c 'tail -3 /var/log/mail.log | grep -E "status="'
# → ... relay=smtpdm.aliyun.com ... status=sent
```

## Pitfalls

Every issue we hit during the field deployment is documented in [docs/PITFALLS.md](docs/PITFALLS.md) — **26** entries, each with **Symptom → Root cause → Fix**. Highlights:

1. CRLF shebang breaking `/new` (`python3\r`)
2. `/run` tmpfs breaking Docker socket sharing
3. Mounting host `nginx.conf` into the container causing port conflicts
4. Docker DNS resolution failures in China
5. Editable-install venv losing the `chatmaild` module
6. Missing maildir causing `chatmail-metadata` crash-loop
7. Cert SANs missing `imap`/`smtp` subdomains
8. Aliyun `epel-aliyuncs-release` conflicting with `epel-release`
9. China network blocking custom Dovecot `.deb` downloads
10. Cloud security group vs host `firewalld` (double firewall)
11. Host postfix holding port 25 → container postfix won't start (#21)
12. Outbound port 25 hard-blocked by the cloud vendor (#22)
13. DirectMail relay: 465 handshake drop → use port 80 STARTTLS (#23)
14. `no mechanism available`: missing SASL plugins + chroot (#24)
15. `smtp_generic_maps` must be `regexp:`, not `hash:` (#25)
16. Relay 436 "MAIL FROM" doesn't conform with authentication (#26)

## Verification

After deploying, run through the [step-by-step verification checklist](docs/VERIFICATION.md) — 10 checks that isolate each layer (services → sockets → ports → certs → external reachability → real login). Includes a one-shot health check script.

## Maintenance

### Update the relay code

```bash
# after pulling new code to the server
cd /root/ChatMail
docker rm -f chatmail 2>/dev/null
cd docker && bash build.sh && cd ..
bash deploy/aliyun/deploy.sh your-domain.com --email admin@your-mail.com
```

> `deploy.sh` skips already-completed steps (idempotent), so re-running it mostly just rebuilds and restarts.

### Renew TLS (certbot auto-renews daily)

```bash
certbot renew                      # manually run a renewal
systemctl list-timers certbot      # verify the renewal timer
```

After renewal, the post-hook reloads services; if you manually renewed, reload:

```bash
docker exec chatmail doveadm reload
docker exec chatmail postfix reload
docker exec chatmail nginx -s reload
```

### Backup

Minimal viable backup (no private data is kept by design):

```bash
tar czf /root/chatmail-backup-$(date +%F).tar.gz \
  /home/vmail/run \
  /usr/local/lib/chatmaild/chatmail.ini \
  /etc/dkimkeys /etc/letsencrypt /var/lib/acme
```

> Mail content is auto-deleted (20 days default), so there's little to back up; the important state is the config, DKIM keys, and certs.

### Container-internal fixes are ephemeral

Any change made with `docker exec` (e.g. `sed` on `/usr/lib/cgi-bin/newemail.py`) is lost on `docker restart`. To make it permanent, change the source file + rebuild the image (see PITFALLS #14, #18).

## Project Layout

| File | Purpose |
|---|---|
| `docker/Dockerfile` | Debian 12 image: Dovecot/Postfix/Nginx/OpenDKIM/fcgiwrap + chatmaild |
| `docker/entrypoint.sh` | Container entrypoint: dirs, certs, newemail.py, services |
| `docker/build.sh` | Docker DNS/mirror config + image build |
| `deploy/aliyun/deploy.sh` | One-shot deployment script (9 steps) |
| `deploy/aliyun/genconfig.py` | Renders service config templates |
| `deploy/aliyun/chatmail-proxy.conf` | Host Nginx proxy snippet |
| `deploy/aliyun/docs/PITFALLS.md` | Field-tested issues & fixes (26) |
| `deploy/aliyun/docs/VERIFICATION.md` | Post-deploy verification checklist |
| `deploy/aliyun/README.md` | This file |
| `deploy/aliyun/README.zh-CN.md` | 简体中文版 |

## Upstream Modifications

Files modified relative to upstream [chatmail/relay](https://github.com/chatmail/relay):

| File | Change |
|---|---|
| `cmdeploy/src/cmdeploy/service/doveauth.service.f` | socket path → `/home/vmail/run/doveauth/`, removed `RuntimeDirectory` |
| `cmdeploy/src/cmdeploy/service/chatmail-metadata.service.f` | same |
| `cmdeploy/src/cmdeploy/service/lastlogin.service.f` | same |
| `cmdeploy/src/cmdeploy/dovecot/auth.conf` | auth socket path |
| `cmdeploy/src/cmdeploy/dovecot/dovecot.conf.j2` | metadata/lastlogin socket paths |
| `cmdeploy/src/cmdeploy/postfix/main.cf.j2` | banner without `(Debian/GNU)` |
| `cmdeploy/src/cmdeploy/nginx/nginx.conf.j2` | `www-data` → `nginx` |

## License

[MIT](../../LICENSE)
