# Introduction

ChatMail Relay provides an end-to-end encrypted email relay for Delta Chat, but
its upstream deployment model is closely tied to Debian and Ubuntu mechanisms
such as `apt`, `dpkg`, `policy-rc.d`, and the `www-data` user. This technical
note describes a deployment approach for RHEL-family distributions, Arch, and
other Linux systems that provide Docker and systemd without changing ChatMail's
core code.

The implementation is based on the open-source
[ChatMail-ANY-Linux-Deploy project](https://github.com/TiantianYZJ/ChatMail-ANY-Linux-Deploy).
It is documented as an operational research note rather than a claim of an
independent benchmark or formal security audit.

## Deployment Architecture

The design separates services by their operating-system assumptions. Dovecot,
Postfix, Nginx, OpenDKIM, and fcgiwrap run in a Debian 12 Docker container,
where their Debian-oriented packages and service conventions remain available.
The host runs the native Python services, `filtermail`, `iroh-relay`, `mtail`,
Unbound, and Certbot.

The two environments communicate through bind-mounted directories and Unix
sockets:

| Layer | Main responsibilities | Runtime |
| --- | --- | --- |
| Debian service container | IMAP, LMTP, SMTP, internal HTTP, DKIM, account creation | Docker |
| Linux host | ChatMail Python services, filtering, relay, DNS, TLS automation | systemd and host packages |
| Existing web server | Public ports 80/443 and optional proxy rules | Host-managed |

Keeping the container Nginx on `127.0.0.1:10234` avoids taking over ports already
used by a host control panel or another web server. The host proxy can expose
the account-creation endpoint and the Delta Chat autoconfiguration document
without moving the rest of the host's web workload.

## Unix Socket Boundary

The most sensitive integration boundary is Dovecot authentication. Host-side
Python services expose sockets under a persistent directory:

```text
/home/vmail/run/doveauth/doveauth.socket
/home/vmail/run/chatmail-metadata/metadata.socket
/home/vmail/run/chatmail-lastlogin/lastlogin.socket
```

The deployment uses `/home/vmail/run` instead of `/run`. The latter is commonly
a tmpfs managed by the host or a container, so a service can appear healthy
while its socket disappears across a restart or cannot be shared through a
bind mount. A persistent directory gives systemd and Docker a common,
observable boundary.

## Installation Workflow

The deployment script performs the following sequence:

1. Initialize the host and create the ChatMail configuration.
2. Build the Debian-based service image.
3. Install the ChatMail Python virtual environment.
4. Download architecture-specific binaries.
5. Render service and proxy configuration.
6. Issue TLS certificates with Certbot.
7. Configure Unbound and start the services.

The basic command is:

```bash
cd /root/ChatMail
bash deploy/aliyun/deploy.sh your-domain.com --email admin@your-mail.com
```

DNS must point the root, mail, IMAP, SMTP, and autoconfig names to the server.
The MX record points to the mail domain, while SPF, DKIM, and DMARC records
provide the policy layer for delivery. Delta Chat account creation also depends
on the autoconfiguration XML being reachable at the documented well-known
path.

## Operational Constraints

The architecture is particularly useful on cloud providers where outbound TCP
port 25 is blocked. In that environment the server can receive mail and handle
in-domain delivery, but external delivery requires an authenticated SMTP relay
over an allowed encrypted port. The source project documents an Aliyun
DirectMail configuration using STARTTLS on port 80, sender rewriting, and
Postfix SASL credentials.

Several failure modes deserve explicit checks:

- A CRLF shebang can prevent the account-creation CGI from starting.
- Host and container services can conflict if both claim port 25 or public HTTP.
- Missing certificate subject-alternative names for `imap` and `smtp` cause
  Delta Chat hostname verification failures.
- Mounting host configuration files over container configuration can create
  port and service conflicts.
- A `hash:` Postfix map does not perform the regular-expression matching
  required by sender rewriting; the map type must match the rule.

## Verification Checklist

After deployment, verification should proceed from local services to external
reachability:

```bash
curl -X POST http://127.0.0.1:10234/new
curl -s https://your-domain.com/.well-known/autoconfig/mail/config-v1.1.xml
systemctl --failed
docker ps
```

The source repository includes a longer checklist covering sockets, ports,
certificates, DNS, relay reachability, account creation, and a real Delta Chat
login. These checks are important because a successful container start alone
does not prove that the host Python services, TLS names, proxy paths, and mail
transport agree.

## Conclusion

ChatMail-ANY-Linux-Deploy demonstrates a pragmatic grafting strategy: preserve
the upstream Debian service environment where package assumptions matter, move
portable services to the host, and make the boundary explicit through stable
volumes and Unix sockets. The result is a repeatable deployment path for
non-Debian Linux systems while keeping the existing host web server and
cloud-specific networking constraints visible.

The implementation, deployment scripts, pitfalls guide, and verification
checklist are maintained in the
[TiantianYZJ/ChatMail-ANY-Linux-Deploy repository](https://github.com/TiantianYZJ/ChatMail-ANY-Linux-Deploy),
licensed under the MIT License.
