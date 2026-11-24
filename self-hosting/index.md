# Self-hosting guide

SNReg runs as one binary, `snreg-server`, plus PostgreSQL 16 or newer.

## Install

Pick one. The package is the main path; Compose and Helm are optional.

**Package (Debian/Ubuntu, Fedora/RHEL).** Install PostgreSQL with it:

```sh
apt install ./snreg-server_*_amd64.deb postgresql     # or: dnf install ./snreg-server-*.rpm postgresql-server
snreg-server init                                     # master key, migrations, first admin
systemctl enable --now snreg-server
```

The package creates the `snreg` user, a self-signed certificate in `/etc/snreg/`, and, when PostgreSQL runs locally, a database with a random password written to `/etc/snreg/server.toml`. `init` prints the first admin's password once: log in, change it, and set up two-factor. Replace `tls.crt`/`tls.key` with a real certificate before enrolling devices, because agents pin the one in place when they enroll.

**Docker Compose.** `snreg-deploy/compose`: copy `.env.example` to `.env`, set `POSTGRES_PASSWORD` and `SNREG_PUBLIC_URL`, put `tls.crt` and `tls.key` in `./snreg/`, then `docker compose up -d`. The first admin's password is in `docker compose logs init`. The server uses host networking and `NET_ADMIN` for WireGuard.

**Kubernetes (hosted tier).** `snreg-deploy/helm/snreg`. Create a Secret with `database-url` (an external PostgreSQL) and `master-key` (`openssl rand -base64 32`), and a TLS Secret, then install with `publicUrl`, `existingSecret`, `tlsSecret` and `wireguard.endpoint` set. HTTPS and WireGuard get separate LoadBalancer Services.

**Terraform** (`snreg-hetzner`, `snreg-aws`) and **Ansible** (`snreg_server`, `snreg_agent`) in `snreg-deploy` wrap the package path. See their READMEs.

```sh
curl https://snreg.example.org:8443/api/v1/health
```

`init` writes a random 32-byte master key to `master_key_file` with mode `0600`. It never overwrites an existing key. The server refuses to start without one; the systemd unit hands it to the service with `LoadCredential`, so the file stays root-only. **Back the key up**: it encrypts secrets stored in the database, and a backup of the database is useless without it.

Database migrations also run automatically at every start, under a lock, so upgrading is: install the new package, restart.

## Backups

```sh
snreg-server backup /root/snreg-$(date +%F).tar.gz
```

The archive (mode `0600`) holds `db.dump` (`pg_dump --format=custom`) and `etc/` with `server.toml`, the master key and the TLS pair. It contains the master key, so store it like one. Restore on a fresh install: extract it, put the files from `etc/` back, run `pg_restore --clean --if-exists -d <database> db.dump`, then start the server. `backup` needs the PostgreSQL client (`pg_dump`) of the server's major version; the container image includes it.

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
