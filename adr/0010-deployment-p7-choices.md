# 0010: Zero-touch ISO and deployment choices (P7)

**Status:** Accepted

## Context

Spec §6.2 (zero-touch ISO), §8 (deployment artifacts) and the P7 scope leave several behaviors open. These are the choices made for P7.

## Decisions

### Zero-touch ISO

- **One builder for every distro.** `snreg-iso` adds a `/snreg` folder to the stock installer ISO (agent packages, `enroll.toml`, the distro's unattended config, a shared `setup.sh`) and edits the boot menus in place. It edits GRUB `linux`, syslinux `append` and systemd-boot `options` lines, including the copies inside the UEFI boot image, which it changes with mtools. Boot records are replayed with xorriso. It needs no root.
- **Unattended configs.** Ubuntu uses `/autoinstall.yaml` with the `autoinstall` boot argument. Debian uses a preseed file, Fedora and RHEL a kickstart, and Arch a short partition-and-pacstrap script started by archiso's `script=` boot argument. Arch has no installer config format, so this script is the "archiso profile".
- **Extra flags.** `--packages` points at the agent's `packaging/dist`. `--admin-password-hash` sets the local break-glass account: root, or `snreg-admin` on Ubuntu, which requires a named user. Without it the account gets a random password nobody knows, so only SNReg directory logins work. `--mok-password` is covered under Secure Boot below.
- **Shared post-install.** `setup.sh` runs inside the installed system. It installs the packages and builds the kernel module for the *installed* kernel rather than the installer's. RHEL and its rebuilds get `dkms` from EPEL. If the module can't be built the install continues and the device reports `degraded`.
- **Network.** Every installer needs a network connection: Debian and Arch install from mirrors, and every distro fetches `dkms` and kernel headers. Offline installs are out of scope for P7.
- **Boot loop.** The install entry is the default and starts after 5 s. If the machine boots the ISO again after installing, it reinstalls. Remove the media, or boot the disk first, which is what the test does. The token's `max_uses` limits the damage.
- **Secure Boot.** With `--mok-password`, `setup.sh` queues the DKMS signing key with `mokutil --import`. MokManager asks for that password once, at the console, on the next boot. That confirmation is the point of MOK and can't be automated. Until it's done the device runs `degraded`.
- **The ISO is a secret.** It's written mode 0600, its `/snreg` files are root-only, and the test uses a single-use token.

### Fixes found by DM-1

- The kernel-module packages now ship `modules-load.d/snreg.conf`. They used to only `modprobe` at install time, so the module was missing after every reboot.
- The agent's Arch packaging also builds binary `.pkg.tar.zst` files, which an offline ISO can carry.

### Server artifacts

- **`.deb` and `.rpm`.** The install script creates the `snreg` user and a self-signed P-256 certificate, so the server never serves plain HTTP. When a local PostgreSQL is running, it also creates a role and database with a random password and writes `server.toml`. apt may configure the package before PostgreSQL is up, so `snreg-server init` finishes that step when `database_url` is still empty. The spec's three commands work in either order.
- **Master key.** The unit passes the master key to the service with `LoadCredential`, so `/etc/snreg/master.key` stays `root 0600` and the service, which runs as `snreg`, gets a private copy.
- **Backup.** `snreg-server backup <file>` writes `pg_dump --format=custom` and the config files (server.toml, master key, TLS pair) to a 0600 tar.gz. The database password reaches `pg_dump` through `PGPASSWORD`, never argv.
- **Container image.** It runs as root with only `NET_ADMIN` added, because a non-root process can't manage `snreg0` without file capabilities, and those would break runs without `NET_ADMIN`. With WireGuard off it can run as the image's `snreg` user. It embeds the real web UI and `postgresql-client-16` for backups.
- **Compose.** A one-shot `init` service runs before `server` on every `up`. It's idempotent: the first admin's password appears once, in `docker compose logs init`.
- **Helm.** The master key, database URL and TLS pair come from Secrets you create; the chart generates no key that a reinstall could silently replace. There's one replica with the `Recreate` strategy, because there's one WireGuard hub. WireGuard gets its own UDP LoadBalancer Service.
- **Terraform.** Hetzner has no managed PostgreSQL, so it runs on the VM. AWS uses RDS reachable only from the VM. The AWS database password is in the instance's user data, so the instance requires IMDSv2 with a hop limit of 1.

### Tests

- `iso/test.sh <distro>` is DM-1: a real server and Postgres in containers, an auto-approve single-use token, and a UEFI VM with a blank disk and a known SMBIOS serial. It passes when the device is `active` and its asset has that serial. `compose/test.sh`, `systemd/test.sh`, `ansible/test.sh` and `helm/test.sh` (kind) are the deployment smoke tests.
- RHEL 9 is tested with AlmaLinux 9, its binary-compatible rebuild, because RHEL's ISO needs a subscription.
- The stock Fedora 41 ISO crashes on edk2 202608 UEFI firmware before the kernel starts, so locally Fedora was tested with BIOS boot. CI uses Ubuntu's firmware.
- The end-to-end jobs run nightly once `SNREG_READ_TOKEN` (read-only access to the server, core, web and agent repos) and the variable `SNREG_E2E=true` are set.

## Consequences

- Air-gapped device installs still need a local mirror for the distro and for `dkms` and kernel headers.
- The Compose file's `e2e` profile (a QEMU agent runner) is replaced by `iso/test.sh`, which also starts its own server.
- Real certificates (ACME) aren't automated; agents pin whichever certificate is in place when they enroll.
