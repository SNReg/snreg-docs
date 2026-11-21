# 0001: Single binary, PostgreSQL only

**Status:** Accepted

## Context
SNReg targets small IT teams running 50 to 2,000 Linux endpoints, including air-gapped sites. Every extra service (a cache, a queue, a search engine, an orchestrator) is one more thing they have to install, patch and debug.

## Decision
- The server is **one Rust binary** (axum, tokio, sqlx). The web UI is embedded in it.
- **PostgreSQL is the only dependency.** It also serves as the event bus: writes insert into an `events` table in the same transaction, and a `LISTEN/NOTIFY` dispatcher delivers them to in-process handlers, which are idempotent and replayed on startup.
- Modules (identity, devices, assets, tickets) are Rust modules in that binary, not services.
- Devices reach the agent API only over WireGuard. The server identifies a device by its tunnel IP, because WireGuard's cryptokey routing binds that IP to the device's key.

## Consequences
- An install is a package, a database and `systemctl enable --now`.
- The server scales vertically. That's enough for the target size, and multi-node isn't a goal.
- Anything that looks like it needs Redis or a queue has to be solved in Postgres or in-process instead.
