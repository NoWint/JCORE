# Introduction

Most contemporary chat and collaboration products place the application server
at the center of identity, message routing, history, search, and task state.
This arrangement is convenient, but it also concentrates metadata, availability
requirements, and trust in one operator. PEYT Chat explores a different
composition: a desktop client built on Delta Chat Core for encrypted messaging,
with a local Rust application layer for workspaces, channels, cards, notifications,
and optional intelligent assistants.

This note describes PEYT Chat as an implementation artifact rather than as a new
cryptographic protocol. The central engineering decision is to keep the
cryptographic and mail-transport substrate in Delta Chat Core while placing
product-specific coordination in a separate application layer. The result is a
client that can present chat and collaboration views without introducing a
second central message service.

The note makes three contributions:

1. It reconstructs the system architecture and data-flow boundaries of the
   current PEYT Chat source tree.
2. It analyzes the privacy implications of delegated encryption, local
   persistence, SecureJoin onboarding, native notifications, plugins, and
   optional remote LLM inference.
3. It records a reproducibility and limitation profile so that implemented
   behavior is not confused with planned work or an independent security claim.

## Scope and Method

The description is based on a source-level audit of the PEYT Chat repository,
its architecture and API documents, and the Delta Chat Core submodule. The
repository head at inspection was
`c60ae3107a2ab6f868dc7999c01dd78c1c9d3f83`; the checked-out Delta Chat Core
submodule was `bbcfa5e40e22b7de09e1a93099850bf9b977292a`. The working tree also
contained uncommitted changes, so this note describes the inspected source tree
rather than a frozen release artifact.

The method combines module inspection with behavior tracing across command
handlers, database migrations, event forwarding, front-end dispatch, and local
tests. It does not report throughput, latency, battery consumption, message
delivery rate, or cryptographic strength. Those measurements require a fixed
release, controlled network conditions, a defined device matrix, and an
independent security review.

## Design Requirements

PEYT Chat can be understood through six requirements.

| Requirement | Design response | Boundary |
| --- | --- | --- |
| Reuse a mature secure messaging substrate | Delegate account, message, contact, group, encryption, and SecureJoin operations to Delta Chat Core | `src-tauri/src/commands.rs` to `core/` |
| Keep application state close to the user | Store collaboration projections and UI preferences locally | SQLite and `localStorage` |
| Keep the interface reactive | Forward core events instead of polling the message database for every update | Rust event task to `dc-event` |
| Extend chat into collaboration | Model workspaces, channels, cards, roles, pins, and activity as application data | `Db` plus message envelopes |
| Support automation without coupling it to the UI | Run Bot accounts and drivers in the Rust process | `BotService` and `drivers/*` |
| Make external computation visible | Treat remote LLM APIs, GitHub, plugin registries, and native notifications as explicit egress surfaces | Settings and integration modules |

The requirements are deliberately compositional. The application layer may grow
without changing the message encryption implementation, while the messaging
layer can continue to serve a simple chat client when collaboration features are
not used.

## System Architecture

![Figure 1: PEYT Chat process and data-flow architecture.](/figures/JCORE-2026-0002/architecture.svg)

*Figure 1. The WebView handles presentation and interaction. The Rust/Tauri
process owns application state and adapters. Delta Chat Core owns the account
and message substrate; SQLite owns application-level projections.*

### Process and Module Boundaries

PEYT Chat is packaged as a Tauri desktop application. The WebView contains a
Vite-built TypeScript single-page interface. The Rust process owns the
`AppState`, registers Tauri commands, starts background tasks, and mediates access
to the Delta Chat accounts, application SQLite database, plugin manager, bot
runtime, GitHub client, and intelligence services.

The main state object has four properties that are important for reasoning about
ownership:

- `accounts` is an asynchronous, shared Delta Chat `Accounts` manager.
- `current_id` identifies the active account in the application layer.
- `db` is an asynchronous wrapper around a SQLite connection.
- `bots`, `plugins`, `bot_tools`, `github`, `intelligence`, and `knowledge`
  provide optional application services.

This boundary avoids placing database handles, filesystem paths, or credentials
directly in the WebView. The front end requests operations through Tauri
commands, and the Rust side converts results into serializable DTOs. The
approach also gives the application one place to enforce account selection,
ownership checks, error translation, and access to local files.

### Data Ownership

The application uses three storage domains. Their separation is more important
than the particular table names.

| Storage domain | Primary contents | Ownership rule |
| --- | --- | --- |
| Delta Chat Core account store | Accounts, contacts, chats, messages, message state, cryptographic material, and blobs | Managed through Core APIs |
| PEYT SQLite database | Workspaces, channels, roles, pins, cards, inbox events, activities, bot records, knowledge records, and settings | Managed by `src-tauri/src/db.rs` |
| WebView preferences | Current page, selected workspace and chat, theme, view preferences, and local UI history | Managed by TypeScript persistence helpers |

The application database references conversations by Delta Chat `chat_id`, but
does not replace the Core message store. This is a projection pattern: a
workspace or card can be indexed locally while the messages that carry its
communication remain in the Core account store.

SQLite access is wrapped in `spawn_blocking` because `rusqlite` is synchronous.
Schema creation is idempotent and migration logic adds missing columns when
required. This keeps the database lifecycle local to the desktop application and
avoids a remote migration service for product metadata.

## Event-Driven Messaging Pipeline

The message path is split into a command path and an event path.

1. A user action in the WebView invokes a Rust command through Tauri IPC.
2. The command loads the active Delta Chat context from `AppState`.
3. The Rust handler calls a Core operation such as `send_text_msg`,
   `get_chat_msgs`, `secure_join`, or `get_encryption_info`.
4. Delta Chat Core emits events as message or chat state changes.
5. `events.rs` maps selected Core events to a stable `EventPayload` and emits
   them as the `dc-event` Tauri event.
6. `src/api.ts` maintains one front-end listener and dispatches events to
   handlers registered by event type.
7. `src/shell/shell.ts` refreshes the relevant view, notification badge, or
   message state.

The single front-end listener is a small but useful reliability boundary. It
avoids having every component create an independent event subscription and gives
the application a common place to retain a short event log for diagnostics.
The shell also combines bursty sidebar updates with a short debounce and uses
incremental message append paths when the current conversation is visible.

The event bridge filters events belonging to Bot accounts before they reach the
main user interface. Bot accounts therefore remain background services rather
than appearing as ordinary account activity in the primary chat view. This
separation is an application-level routing decision; it does not modify the
underlying Delta Chat account model.

The pipeline also exposes a privacy-relevant fact. For incoming-message
notifications, the Rust event forwarder loads a short text preview from the
Core database after decryption and sends it to the front end. The front end may
then pass the preview to the native operating-system notification service.
Message confidentiality at the network layer therefore does not imply that
message previews are hidden from the local operating system or its notification
surfaces.

## Privacy-Oriented Communication Design

### Delegated Cryptography

PEYT Chat does not implement public-key generation, message encryption, key
exchange, or cryptographic verification in its product code. The commands layer
delegates those operations to Delta Chat Core, which also owns the account store,
contact state, message database, and attachment blobs. This is a conservative
boundary: PEYT adds user experience and application semantics without creating
a second cryptographic implementation that would need independent review.

The consequence is equally important. PEYT Chat inherits the security properties,
configuration behavior, and limitations of the selected Delta Chat Core revision.
The application should therefore describe itself as a Delta Chat client with
additional collaboration features, not as an independently audited secure
messaging protocol.

### SecureJoin and Identity Verification

The account and group onboarding path exposes Core's SecureJoin operations through
two commands:

- `get_securejoin_qr` obtains a personal or group invitation payload.
- `secure_join` passes a scanned contact, group, or account URL to Core and
  returns the resulting conversation identifier.

PEYT Chat replaces the visible `i.delta.chat` host in generated invitation URLs
with its own branded host, but the source code explicitly keeps the underlying
fingerprint and parameters unchanged. The branding layer is therefore a
presentation wrapper, not a new trust protocol. The settings and protection
views can also request contact- and chat-level encryption information for
inspection.

This design supports a useful user experience: contact discovery and group
invitation can occur through a QR or deep-link workflow, while cryptographic
identity processing remains in the Core boundary. The remaining usability risk
is that a QR scan is only as meaningful as the user's understanding of the
verification state shown by the client.

### Local-First Does Not Mean Metadata-Free

The application layer has no requirement for a central PEYT message server.
Messages still use the transport and relay assumptions of Delta Chat, while
workspace and card projections are maintained on each device. This reduces the
amount of product state that a PEYT-specific server would need to own, but it
does not eliminate infrastructure metadata. Mail relays and service providers
may still observe routing information, timing, account identifiers, delivery
patterns, and other protocol-level metadata.

The privacy claim is therefore intentionally narrow:

> PEYT Chat reduces application-level centralization; it does not make the
> underlying transport anonymous or remove all metadata from the communication
> system.

### Data Egress Surfaces

The following surfaces define where decrypted or sensitive data may leave the
Core account store.

| Surface | Data that may cross the boundary | Privacy implication |
| --- | --- | --- |
| WebView event and DTO path | Message text, contact names, message state, and attachment metadata | Required for rendering; the WebView is part of the trusted local client |
| Native notifications | Short message previews, sender names, and chat identifiers | The operating system, lock screen, and notification history may expose previews |
| Remote LLM source | Configured conversation history, prompts, and selected project context | The provider becomes an additional data processor; use requires an explicit deployment decision |
| GitHub integration and tools | Repository names, issue queries, code queries, and optional tokens | Queries and credentials leave the device when the integration is used |
| Plugin registry and JavaScript plugins | Registry metadata and plugin-requested application data | Plugins are an extension trust boundary and must be treated as executable code |
| Asset protocol and local files | Avatars, attachments, exported keys, and backups | Local path scope and file permissions become part of the security boundary |

The intelligence subsystem supports both a local `llama-server` path and an
OpenAI-compatible API path. Local inference can reduce network disclosure after
the engine and model are present, but model downloads, diagnostics, and user
configuration still require operational review. Remote inference is not enabled
by cryptography; it is an application feature with a separate trust decision.

The plugin subsystem deserves similar caution. The current design permits
installed JavaScript to be evaluated through a PEYT-injected API object, and the
Tauri configuration leaves the content-security policy open so that plugins can
load their capabilities. This is a practical extensibility choice, not a
least-privilege sandbox. A production threat model should treat plugins as
trusted code or add stronger capability isolation.

## Collaboration State and Message Extensions

### Workspaces as Local Projections

Workspaces and channels are represented as application records that point to
Delta Chat group conversations. A workspace has a master chat, while channels
map to additional group chats. Roles, pins, cards, inbox events, and activities
are stored in SQLite and use chat identifiers to connect the projection to the
message substrate.

This split permits multiple views over the same conversation. A channel can be
rendered as a message stream, a card board, a list, a calendar, or a timeline,
while the underlying communication remains a Delta Chat chat. The database
therefore stores view-oriented state, not an alternative copy of every message.

### Application-Level Envelopes

Ordinary text, replies, handwriting payloads, media descriptions, and several
application actions are serialized as JSON envelopes carried in ordinary text
messages. The current envelope builder generates a `type`, a UUID-like
identifier, and a structured `payload`. The receiver applies a shape-based
parser: valid known envelopes are rendered semantically, while malformed or
unknown content can fall back to readable source text.

The envelope is intentionally above the Core layer. Delta Chat Core treats the
body as a normal message and continues to provide transport, delivery state,
read receipts, reactions, and attachments. PEYT Chat interprets the body only
after the message has crossed the Core boundary.

Cards use the same general idea but are currently in a protocol migration. The
Rust command path emits `card.create`, `card.update`, and `card.delete` envelope
types, while the shell's inbound compatibility handler still recognizes the
older `[CARD]` discriminator. This is a valuable example of why application
protocol changes need an explicit compatibility matrix and cross-device tests.
The current repository should not be presented as having a fully finalized card
wire protocol until the sender and receiver paths converge.

### Idempotency and Conflict Boundaries

Card synchronization stores a local projection and attempts to deduplicate
incoming records using channel, title, and creation-time information. The
approach is sufficient for an early collaboration layer, but it is weaker than
a globally unique entity identifier plus a formally specified conflict policy.
The source tree itself notes that local card identifiers are not stable across
devices. A future protocol version should use a stable UUID, an explicit
operation identifier, and a defined last-writer or causal merge rule.

The `Clearable<T>` update representation is a separate and useful API detail. It
distinguishes an omitted field, an explicit `null`, and a concrete value, so a
client can update one property, clear one property, or leave one property
unchanged without overloading a single JSON value.

## Implementation Status and Verification

The following table records the status supported by the inspected source tree.

| Area | Evidence in the repository | Status for this note |
| --- | --- | --- |
| Account and message operations | Delta Chat Core calls in `commands.rs` | Implemented integration boundary |
| SecureJoin and encryption information | `get_securejoin_qr`, `secure_join`, and encryption-info commands | Implemented adapter surface |
| Core event forwarding | `events.rs` plus the single `dc-event` bridge | Implemented event pipeline |
| Local collaboration storage | SQLite migrations and CRUD methods in `db.rs` | Implemented application projection |
| Card synchronization | Envelope senders plus inbound `[CARD]` compatibility handler | Partially migrated; needs convergence testing |
| Bot and LLM drivers | `bots.rs`, `drivers/*`, `intelligence/*`, and tools | Implemented extension surface; provider-specific behavior varies |
| Security assurance | Unit tests and source comments, but no independent audit | Incomplete assurance evidence |

The minimum reproducibility workflow for a clean checkout is:

```bash
git clone --recursive https://github.com/NoWint/PleaseEnterYourTextCommunity.git
cd PleaseEnterYourTextCommunity
npm install
npx tsc --noEmit
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

The first Rust build also compiles the Delta Chat Core submodule and may take
substantially longer than incremental builds. A stronger evaluation should add
two-device message tests, SecureJoin verification tests, restart and backup
tests, notification-preview tests, plugin permission tests, and a fixed
cross-platform matrix.

## Threat Model and Limitations

The architecture supports the following bounded security interpretation.

### Network and Relay Observers

The application delegates message encryption to Delta Chat Core. A network or
mail-relay observer should therefore be analyzed against the Core protocol and
deployment configuration, not against PEYT's TypeScript UI. However, routing
metadata, timing, account identifiers, and service-level logs remain outside
the message-body confidentiality claim.

### Compromised Endpoint

The desktop client must access plaintext after Core decryption in order to render
messages, search content, generate previews, and operate collaboration tools.
A compromised operating system, malicious local process, or hostile executable
plugin can therefore access data available to the client. PEYT Chat does not
claim protection against endpoint compromise.

### Remote Providers

Remote LLM inference and GitHub tools introduce purpose-specific data flows that
are not required for basic encrypted chat. Operators should configure these
features according to the sensitivity of the selected conversation and should
prefer local inference when the deployment can support it. API keys are stored
in application settings and masked when returned to the UI, but the inspected
source does not establish OS keychain storage or database-at-rest encryption.

### Cryptographic and Performance Assurance

This note is not a cryptographic audit. It does not prove the correctness of
Delta Chat Core, the safety of the configured mail infrastructure, or the
absence of vulnerabilities in Tauri, Rust dependencies, WebView runtimes, or
plugins. It also does not provide performance benchmarks. Those claims require
separate methods, fixed versions, adversarial testing, and independent review.

## Future Work

Four improvements would most strengthen the design.

1. **Protocol convergence.** Complete the migration from prefix-based card
   messages to stable JSON envelopes, document versioning, and add a two-device
   compatibility matrix.
2. **Stronger local secret handling.** Move API keys and other long-lived
   credentials toward platform keychain storage, and document the protection
   model for application SQLite data, exported keys, and backups.
3. **Capability isolation.** Replace the current trusted-plugin assumption with
   signed packages, narrower capability grants, a restrictive content-security
   policy, or an isolated execution process.
4. **Evidence beyond source inspection.** Add controlled delivery, restart,
   backup, notification, and cross-platform tests, followed by an independent
   security assessment of the complete distribution.

## Conclusion

PEYT Chat demonstrates how a desktop collaboration product can be composed
around an existing encrypted messaging core without moving all product state
into a new central service. Its architecture separates three concerns:
Delta Chat Core owns accounts, message transport, encryption, and identity
operations; Rust/Tauri owns application orchestration and local persistence; and
the WebView owns presentation and interaction.

The same separation makes the privacy story legible. The system reduces
application-level centralization, but decrypted text necessarily reaches the
local UI, native notification surfaces, and any explicitly enabled remote
integration. SecureJoin and encryption-information commands preserve a Core-owned
identity boundary, while envelopes and SQLite projections provide a path from
chat to collaboration. The principal engineering lesson is therefore not that
local-first software is automatically private, but that privacy depends on
making each data boundary explicit, reviewable, and testable.

## References

1. NoWint. *PEYT Chat source repository*. 2026.
   [https://github.com/NoWint/PleaseEnterYourTextCommunity](https://github.com/NoWint/PleaseEnterYourTextCommunity)
2. Chatmail Core contributors. *Delta Chat Core*. 2026.
   [https://github.com/chatmail/core](https://github.com/chatmail/core)
3. Delta Chat. *End-to-end encryption and SecureJoin help*. 2026.
   [https://delta.chat/en/help](https://delta.chat/en/help)
4. Tauri contributors. *Tauri 2 documentation: concepts and security*. 2026.
   [https://v2.tauri.app/](https://v2.tauri.app/)
5. SQLite Consortium. *SQLite documentation: transactions and write-ahead logging*. 2026.
   [https://www.sqlite.org/docs.html](https://www.sqlite.org/docs.html)
6. NoWint. *PEYT Chat architecture documentation*. 2026.
   [https://github.com/NoWint/PleaseEnterYourTextCommunity/blob/main/docs/architecture.md](https://github.com/NoWint/PleaseEnterYourTextCommunity/blob/main/docs/architecture.md)
