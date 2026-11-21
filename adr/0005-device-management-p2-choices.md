# 0005: Device management choices the spec left open (P2)

**Status:** Accepted

## Context

P2 (spec §6.2, §5) needed decisions the spec leaves open or states loosely. Each is the simplest option that meets the acceptance criteria (spec §0 rule 4).

## Decisions

1. **WireGuard library.** Server and agent use `defguard_wireguard_rs`. It manages the interface over netlink and falls back to an embedded userspace implementation (boringtun) when the kernel has no WireGuard. That is the spec's "netlink, else boringtun", with no external `wg`/`ip` tools needed.
2. **Tunnel addresses** come from a sequence (`10.77.0.2` upward) and are never reused, even after retirement. A `/16` holds 65,533 devices; growing the subnet is a config change.
3. **`login_access` fails closed.** A device with no `login_access` policy lets no SNReg user log in. Local accounts are unaffected (ADR 0004). With several policies, users from all their groups are allowed; for offline login the shortest `offline_ttl_hours` and any `offline_require_totp` win.
4. **Policy spec shapes** (stored, then rendered per device). `login_access {group_ids, offline_ttl_hours, offline_require_totp}`. `sudo {group_ids, nopasswd}`, sent to agents with group names. `package_ensure {packages: [{name, state: present|absent}]}`. `service_state {unit, enabled?, active?}`. `file_content {path, content, mode, owner, group}`. `usb_storage {mode: allow|log|block}`. Unknown fields are rejected.
5. **What `file_content` may write.** Paths must be under `/etc/`, `/usr/local/` or `/opt/`, never under `/etc/snreg/`, PAM, sudoers, shadow/passwd/group, `/etc/ssh/` or the agent's own units and rules. It never writes through a symlink. Otherwise a policy could add a script-signing key or open the login stack.
6. **Removing state-like policies.** When no `sudo` or `usb_storage` policy applies anymore, the agent removes `/etc/sudoers.d/snreg` or the udev rule. Package, service and file policies leave the device as it is.
7. **USB blocking.** It's a udev rule that sets `authorized=0` on mass-storage interfaces as they attach, and the agent applies it to sticks already plugged in. It doesn't depend on the kernel module.
8. **The kernel module reports module loads with the module notifier**, not the `module_load` tracepoint. Both are stable; the notifier is plain `EXPORT_SYMBOL` and gives the taint flags directly. Exec events use the `sched_process_exec` tracepoint, found with `for_each_kernel_tracepoint`.
9. **Lua sandbox host API.** `snreg.read_file` resolves symlinks first, then allows `/etc/` (minus shadow, gshadow, sudoers, `/etc/snreg/`, SSH and TLS private keys), `/sys/`, `/proc/sys/` and a few `/proc` files. It never allows `/proc/<pid>/*`. `snreg.exec` allows `systemctl` with read-only verbs only, so a detect script can't stop services.
10. **Offline TOTP.** The server puts the TOTP secret in the `offline_bundle`, sealed under argon2id(password, random salt) with AES-256-GCM, bound to the username. The device keeps the last accepted step so codes can't be replayed offline either.
11. **TLS.** `snreg-server` serves HTTPS itself when `tls.cert`/`tls.key` are set (rustls via axum-server). The enrollment-token response includes the certificate's SHA-256 for `enroll.toml`. The agent pins it exactly, with no CA or hostname checks. The handshake signature is still verified.
12. **Packaging.** Binaries are built on Debian 12 (glibc 2.36) and run on every supported distro. The `.deb` wires PAM through `pam-auth-update`. The `.rpm` and Arch packages prepend to `system-auth`/`password-auth`. The kernel module ships as a separate DKMS package (`snreg-kmod-dkms`), so the agent installs and runs without it.

## Consequences

- Script `schedule` policies (detect/remediate pairs on a timer) aren't in P2: jobs run on demand.
- `RotateKey` (90-day WireGuard key rotation, §7) isn't implemented yet. Re-enrolling rotates the key.
- On Fedora, `authselect select` regenerates `system-auth` and drops our lines. Run `configure.sh install` again after changing the authselect profile.
