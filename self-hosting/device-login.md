# Enrolling devices

Devices connect to the server over a WireGuard tunnel. The server is the hub: it owns the `snreg0` interface (`10.77.0.1`, UDP 51820) and needs `CAP_NET_ADMIN` (the systemd unit and the Compose file grant it). Agents reach the agent API only through the tunnel. It is never exposed on a public interface.

## Server prerequisites

- UDP 51820 reachable from devices. Set `wg.endpoint` if devices must dial a different `host:port` than `public_url`'s host.
- TLS: set `tls.cert` and `tls.key` (or terminate TLS in a proxy and pin that certificate). Enrollment pins the certificate's SHA-256.

## Enroll a device

To install new machines with no manual steps, use a [zero-touch ISO](./zero-touch). For machines that already run Linux, use the `snreg_agent` Ansible role or the steps below.


1. **Devices → Enroll devices…**: create a token. Choose how many devices may use it, how long it's valid, whether they're approved automatically, and which device groups they join.
2. Install the packages on the device:

   ```sh
   apt install ./snreg-agent_*.deb ./snreg-kmod-dkms_*.deb   # Debian/Ubuntu
   dnf install ./snreg-agent-*.rpm ./snreg-kmod-dkms-*.rpm   # Fedora/RHEL
   ```

   Installing wires up NSS and PAM and enables `snreg-enroll.service` and `snreg-agentd.service`.
3. Copy the `enroll.toml` the token page shows to `/etc/snreg/enroll.toml` (mode 0600), then `systemctl start snreg-enroll`.
4. Without auto-approve, the device waits in **Devices** as *pending* until you approve it.

The token is a secret: anyone holding it can enroll devices until it expires or is used up. Revoke it from the same page.

Enrolling the same hardware again (for example after reinstalling) keeps the device's ID and address and replaces its tunnel key. **Retire** revokes the tunnel; the agent then removes its enrollment and stops.

## Who can log in

A device lets SNReg users log in only if a **login_access** policy targets one of its device groups. With none, only local accounts work. See the admin guide.

## Kernel module

`snreg-kmod-dkms` builds the telemetry module for the running kernel (exec, module-load and USB events) and loads it at every boot. It is optional: without it the device shows as *degraded* and everything else keeps working. With Secure Boot, DKMS signs the module with its MOK key; enroll that key once (`mokutil --import /var/lib/dkms/mok.pub`, then confirm at the next boot).

## Packages

The `.deb` uses `pam-auth-update`. The `.rpm` and Arch packages add three lines to the top of `/etc/pam.d/system-auth` and `password-auth`; on Fedora, run `/usr/lib/snreg/configure.sh install` again after any `authselect select`. Removing the package removes the lines first.
