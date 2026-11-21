# 0003: Event bus delivery semantics

**Status:** Accepted

## Context

The spec (§2) says events are inserted in the same transaction as the change, dispatched by a `LISTEN events` task to idempotent in-process handlers that record `processed_at`, and replayed on startup. P0's exit criterion asks for "exactly once, including after a restart". It doesn't say what happens to a handler's own writes when it fails halfway.

## Decision

- An `AFTER INSERT` trigger on `events` calls `pg_notify('events', id)`. Postgres delivers it on commit, so rolled-back events are never seen.
- Each event is processed in **its own transaction**: lock the row (`FOR UPDATE SKIP LOCKED`), run every handler for its kind on that transaction, set `processed_at`, commit. Handlers write through the connection they are given.
- So a handler's database effects and `processed_at` commit or roll back together: exactly once for anything in Postgres. Side effects outside Postgres (pushing to an agent, sending mail) are at-least-once, which is why handlers must still be idempotent.
- A failing event rolls back and is retried on the next drain (next NOTIFY, a 30 s tick, or startup). It doesn't block later events.

## Consequences

- One slow handler holds a transaction open; handlers must be short.
- No backoff or dead-letter queue yet. A permanently failing handler retries every drain and logs an error each time. Add backoff when a handler can fail persistently.
