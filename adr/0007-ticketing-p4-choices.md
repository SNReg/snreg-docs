# 0007: Ticketing choices the spec left open (P4)

**Status:** Accepted

## Context

Spec §6.4 leaves several behaviors open. These are the choices made for P4.

## Decisions

- **Routing rules** are stored in `schema_defs` (`kind=routing_rule`) and replaced as a whole ordered list through `PUT /routing-rules`. A rule has `when` (all set conditions must hold) and `then`. `device_label` is `key=value`. A rule's assignee is ignored, with a log line, if that person is no longer an agent in the target queue.
- **Queue visibility** is checked against `memberships` on every request. Admins see every queue. Tickets outside an agent's queues return 404.
- **Removed agents**: losing queue access is immediate. An event handler then returns that agent's open tickets in the group to unassigned, so no ticket stays with someone who can't open it.
- **Internal comments** are filtered in one query. A requester never receives them, even if they are also an agent or admin, and can't add them to their own ticket. Notifications and events never contain comment text.
- **Split-screen data** comes from `/tickets/{id}/entities/{entity}`. Helpdesk agents don't hold the user or device admin roles, so they read a fixed field summary, only for entities linked to a ticket in their queue. Asset cost is excluded. Quick actions still call the existing admin endpoints, which enforce their own roles.
- **Pre-selection**: with exactly one active device, the server fills an unanswered `device_picker`.
- **Markdown** is rendered to React elements by a small built-in renderer, with no raw HTML and only `http(s)` links.
- **Status after a reply**: a public agent reply moves `new` to `open`, and a requester reply moves `pending` or `resolved` to `open`. Internal notes change nothing. The change is audited and emitted, but adds no second notification because the reply already sends one.
- **Detail pages** list tickets through `GET /tickets?entity=`, so an agent only sees tickets in their queues. People without the helpdesk role don't see the Tickets section.
- **Form and rule editing** is a JSON text field in P4. The visual form builder is P5.

## Consequences

- Sending email is not implemented. `[smtp]` has no effect yet, so P4 notifications are in-app only.
- Portal lists show the newest 200 tickets per user.
