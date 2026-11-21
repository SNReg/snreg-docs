# 0004: Identity choices the spec left open (P1)

**Status:** Accepted

## Context

Building P1 (spec §6.1) needed answers the spec doesn't give. Each is the simplest option that meets the acceptance criteria (spec §0 rule 4).

## Decisions

1. **Primary group is gid 100 (`users`).** `users.primary_gid` defaults to 100, which exists on Debian, Ubuntu, Fedora and Arch. No per-user private groups, so no extra group rows or gid collisions.
2. **API tokens get the UEID prefix `pat`.** `api_tokens` needs an ID for `DELETE /tokens/{id}`; the spec's prefix table had none. Added to §4.1.
3. **First admin.** `snreg-server init` creates user `admin` in group `admins` (role `admin`) with a random password printed once, but only when the `users` table is empty.
4. **Can't remove the last admin.** Any change that would leave no active user holding `admin` (roles, membership, disable) fails with 409 and rolls back.
5. **Group MFA = required and the user has no TOTP.** Web login gives a session that can only set up TOTP (`mfa: setup`). Device login is refused with `totp_setup_required`.
6. **TOTP reuse.** The last accepted time step is stored per user; a code for that step or an earlier one is refused, across sessions and devices.
7. **Recovery codes** are 10 random base32 strings, stored as SHA-256 (they're high-entropy), single use, replaced when TOTP is set up again.
8. **P1 agent transport.** agentd reads `/etc/snreg/agent.toml` (`server_url`, `token`) and calls `/agent/v1/identity` and `/agent/v1/auth` over HTTPS with a PAT whose owner holds `device_admin`. Until P2's `login_access` policy, every active user is allowed on every device. The agent trusts the OS certificate store (internal CAs work; no bundled Mozilla list).
9. **Offline login is password-only in P1.** `offline_bundle` (TOTP offline) depends on the `offline_require_totp` policy, which arrives with policies in P2.
10. **PAM and local accounts.** `pam_snreg` never asks agentd about a name present in `/etc/passwd`, and returns `PAM_USER_UNKNOWN`. That is what keeps root working when agentd is down (ID-5). If agentd can't be reached for any other name, it returns `PAM_AUTH_ERR`.
11. **Login rate limiting** counts failures in process memory (5 per username, 20 per IP, 15 min). Behind a reverse proxy every client has the proxy's IP; a trusted-proxy setting can come when someone needs it.

## Consequences

- The `offline_bundle` field and per-device access scoping are P2 work.
- With several server replicas, rate limits would be per replica (single binary is the design, §2).
