# Self-hosting guide

SNReg runs as one binary, `snreg-server`, plus PostgreSQL 16 or newer.

## First start

```sh
snreg-server init                       # creates the master key, applies database migrations
systemctl enable --now snreg-server     # or: snreg-server serve
curl https://snreg.example.org/api/v1/health
```

`init` writes a random 32-byte master key to `master_key_file` with mode `0600`. It never overwrites an existing key. The server refuses to start without one. **Back the key up**: it encrypts secrets stored in the database, and a backup of the database is useless without it.

Database migrations also run automatically at every start, under a lock, so upgrading is: install the new package, restart.

## Configuration

The server reads `/etc/snreg/server.toml` (set `SNREG_CONFIG` to use another path). Environment variables override the file.

| Key | Env override | Default |
|---|---|---|
| `public_url` | `SNREG_PUBLIC_URL` | `https://localhost:8443` |
| `listen` | `SNREG_LISTEN` | `0.0.0.0:8443` |
| `database_url` | `SNREG_DATABASE_URL` | required |
| `master_key_file` | `SNREG_MASTER_KEY_FILE` | `/etc/snreg/master.key` |
| — | `SNREG_MASTER_KEY` (base64, takes the place of the file) | — |
| `tls.cert`, `tls.key` | `SNREG_TLS_CERT`, `SNREG_TLS_KEY` | unset = plain HTTP (only behind a TLS proxy) |
| `wg.enabled` | `SNREG_WG_ENABLED` | `true` |
| `wg.interface` | `SNREG_WG_INTERFACE` | `snreg0` |
| `wg.listen_port` | `SNREG_WG_LISTEN_PORT` | `51820` (UDP) |
| `wg.subnet` | `SNREG_WG_SUBNET` | `10.77.0.0/16` |
| `wg.endpoint` | `SNREG_WG_ENDPOINT` | `public_url`'s host + `listen_port` |
| `retention.device_events_days` | `SNREG_RETENTION_DEVICE_EVENTS_DAYS` | `30` |

Every key follows the same rule: `SNREG_<KEY>` at the top level, `SNREG_<SECTION>_<KEY>` inside a section.

```toml
public_url = "https://snreg.example.org:8443"
listen = "0.0.0.0:8443"
database_url = "postgres://snreg@localhost/snreg"
master_key_file = "/etc/snreg/master.key"

[tls]
cert = "/etc/snreg/tls.crt"
key = "/etc/snreg/tls.key"

[wg]
listen_port = 51820
```

The server creates the `snreg0` WireGuard interface itself, so it needs `CAP_NET_ADMIN` (granted by the systemd unit and the Compose file). Without kernel WireGuard it uses a built-in userspace implementation. Devices need UDP `wg.listen_port` reachable. The agent API listens only on `10.77.0.1:8080` inside the tunnel.

Logs are JSON on stdout. Set `RUST_LOG` (e.g. `RUST_LOG=debug`) to change the level; the default is `info`.
