# Zero-touch ISO

`snreg-iso` (in `snreg-deploy/iso`) turns a stock installer ISO into one that installs the system, the agent and its enrollment with no questions asked. Boot a machine from it and it shows up under **Devices**.

Supported: Ubuntu 24.04 (live server), Debian 12 (netinst), Fedora 41 (Server DVD), RHEL 9 and its rebuilds (AlmaLinux, Rocky), and Arch.

```sh
snreg-agent/packaging/build.sh                      # the agent packages it embeds
snreg-deploy/iso/snreg-iso build --distro ubuntu-24.04 \
  --in ubuntu-24.04.5-live-server-amd64.iso \
  --server https://snreg.example.org:8443 \
  --cert-sha256 "$(openssl x509 -in tls.crt -outform DER | sha256sum | cut -d' ' -f1)" \
  --token snreg_enroll_… --out snreg-ubuntu.iso
```

It needs `xorriso`, `mtools` and `openssl`, and no root.

- **The ISO contains the enrollment token, so treat it as a secret.** It's written mode `0600`. Use a token with a use limit and an expiry, and leave auto-approve off unless you want new machines active without review.
- **It wipes the first disk without asking.** The install entry starts after 5 seconds. Remove the media when the machine reboots, or set the firmware to boot the disk first, or it installs again.
- **It needs a network connection.** Debian and Arch install from mirrors, and every distro downloads `dkms` and kernel headers for the telemetry module.
- **Local account.** Root (`snreg-admin` on Ubuntu) gets a random password nobody knows unless you pass `--admin-password-hash` (from `openssl passwd -6`). SNReg users log in as soon as a `login_access` policy allows it.
- **Secure Boot.** Pass `--mok-password <pw>` to queue the module signing key. On the first boot after installing, MokManager asks you to confirm the key and type that password, once, at the console. Until then the device shows as *degraded*.
