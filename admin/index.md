# Admin guide

## Users

**Users** lists everyone. Search matches username and display name.

- **New user**: username (lowercase POSIX name, e.g. `alice`), display name, optional email and initial password. Each user gets a UID from 100000 up, primary group 100 (`users`), shell `/bin/bash` and home `/home/<username>`; change shell and home on the user's page.
- **Passwords** need 12+ characters and can't be a well-known common password.
- **Import from CSV**: a header row with `username,display_name` and optionally `email,password,shell,home`. If any row is invalid nothing is imported, and the error names the row.
- **Disable user** ends their web sessions, deletes their API tokens, and removes them from every device at the next sync. Users are never deleted, so the audit trail stays intact.
- **Reset two-factor** removes their authenticator and recovery codes, for a lost phone. They set it up again on next login if a group requires it.

## Groups and roles

Groups hold users. On Linux devices they're ordinary groups (GID from 100000 up), so `id alice` lists them.

Roles attach to groups. Every member holds the group's roles:

| Role | Can |
|---|---|
| `admin` | everything, including users, groups and roles |
| `device_admin` | device management; also what the P1 agent token needs |
| `asset_manager`, `helpdesk_agent`, `auditor` | used by later modules |

SNReg refuses any change that would leave no active admin.

**Two-factor per group**: set a group to *required* and its members must use an authenticator app. Members without one are taken to setup right after their password at the next web login, and device logins are refused until they finish.

## Audit log

Every change and every login (successful or not) is recorded in the audit log with who, what, when and from which IP. Passwords and codes are never recorded. The log can't be edited or deleted, even by the database user SNReg runs as.

## Devices

**Devices** lists every enrolled machine with its status:

| Status | Meaning |
|---|---|
| pending | enrolled, waiting for your approval |
| active | online (heartbeat in the last 3 minutes) |
| degraded | online, but the kernel module is missing or failing |
| offline | no heartbeat for 3 minutes |
| retired | tunnel revoked; kept for history |

A device's page shows its hardware, OS, inventory (disks, network, packages), groups, policy compliance, events (programs run, kernel modules loaded, USB devices) and jobs.

**Device groups** are ordinary groups. Put devices in groups on the device page (or automatically, through the enrollment token); policies target groups.

## Assets

Every enrolled computer gets an asset automatically, with a tag like `SN-000123`, its serial, make and model, and its primary user as the holder. Add anything else under **Assets**, or import a CSV.

If you edit a computer's serial, manufacturer, model or holder, SNReg keeps your value and stops updating that field from the device. When a device is retired, its computer returns to *in stock*. If the same hardware enrolls again, it gets its old asset and tag back.

**CSV import** needs a `kind` column (`computer`, `monitor`, `peripheral`, `phone`, `network`, `license` or `other`). Other columns are `asset_tag`, `serial`, `manufacturer`, `model`, `status`, `assigned_user` (username), `owner_group` (name), `location`, `purchase_date`, `warranty_end`, `cost` and `custom.<name>`. The import page lets you match differently named columns. If any row is wrong, nothing is imported and each problem is listed by line number, so you can fix the file and import it again.

**Labels**: tick assets, pick a layout (1×1 in, 2×1 in or Avery 5160) and print the PDF. Each label has a QR code that opens the asset and a Code128 barcode of its tag.

**Audits**: under **Assets → Audits**, start an audit for a location and scan what's there. A USB scanner works in the scan box. The report lists what was **found**, what's **missing** (recorded here, not scanned) and what's **misplaced** (scanned here, recorded elsewhere). One button moves all misplaced assets to where they were scanned.

The `asset_manager` role can change assets. `auditor` can view and export them. Other users see only assets assigned to them or owned by their groups, without costs.

## Policies

| Kind | What it does |
|---|---|
| `login_access` | which user groups may log in on the targeted devices, and offline-login rules (`offline_ttl_hours`, `offline_require_totp`) |
| `sudo` | gives user groups sudo through `/etc/sudoers.d/snreg` (checked with `visudo` first) |
| `package_ensure` | packages present or absent (apt, dnf or pacman) |
| `service_state` | a systemd unit enabled/disabled and started/stopped |
| `file_content` | a file's exact content, mode and owner, under `/etc/`, `/usr/local/` or `/opt/` (security-sensitive files like PAM, sudoers and SNReg's own keys are refused) |
| `usb_storage` | `allow`, `log` or `block` USB mass storage |

Changes reach online devices within seconds. Each device reports whether it complies. Removing a user from a group removes their login on every device within a minute.

## Scripts and jobs

Scripts are Lua (sandboxed: no shell, no network, read-only access to system information) or Bash (runs as root). Devices run only scripts signed by a key they trust. Scripts saved in the console are signed with the server's key, which every device trusts from enrollment. To use scripts signed elsewhere (for example the SNReg script library), paste the minisign signature, and add the signer's public key to `/etc/snreg/trusted_keys/` on the devices.

**Run** a script on one device or on every device in a group. Results (status, output, the data the script returned) show under Jobs and on each device's page.

## Tickets

**Set up a queue.** A queue is a group. Give the group the `helpdesk_agent` role and add your agents to it.

**Create a form.** Open **Forms**, choose the queue, and describe the fields as JSON. Besides the standard field types, `device_picker` and `asset_picker` offer only the requester's own devices and assets.

**Routing rules** run in order, and the first match wins. If none matches, the ticket goes to the form's queue.

```json
[
  {
    "when": { "category": "hardware", "device_label": "site=oslo" },
    "then": { "group_id": "grp_…", "priority": "high" }
  }
]
```

A rule can match on `answers`, `category`, `requester_group` and `device_label`. It can set `group_id`, `priority` and `assignee_id`.

**Working a ticket.** Click the requester, a device or an asset to open it in the right pane. The URL keeps both, so you can share the view. Internal notes are never shown to the requester. Type `@username` to notify another agent.

**Access.** Agents see only the queues of groups they belong to. Removing an agent from a group takes effect immediately, and their open tickets in that queue become unassigned.

Notifications are in-app only for now. Email sending is not implemented, even if `[smtp]` is configured.

## Dashboard

The home page shows device status counts, open tickets by queue and assets by status. You only see the sections your roles cover.

## Customizing records

Open **Customize** and pick a record type (asset, device, user, group or ticket).

- **Fields** add custom data without a redeploy. A field can be required, limited to certain asset kinds, or restricted to certain roles. Deleting a field also deletes its values from every record.
- **List views** choose the columns, sort and saved filters for the Assets list. A view can be shared with everyone or kept for yourself.
- **Detail layout** groups custom fields into titled sections across one to three columns. Write one section per line, like `Finance: cost_center, budget_code`.
- **Export and import** moves fields, shared views and layouts between installs as a JSON file.

Custom asset fields also appear in the Assets filter and in CSV export and import, as `custom.<key>` columns. Separate multiple values in a CSV cell with `;`.

## Building forms

Under **Forms**, add fields, set each one's type, and use **Up** and **Down** to order them. Keys are filled in from the label. **Edit** changes an existing form.

## Reading the audit log

**Audit log** lists every change, newest first, for admins and auditors. Filter it by action prefix (such as `ticket.`), actor ID or target ID.

## Command-line tool

`snreg login --server https://snreg.example.org` signs in and stores a token in `~/.config/snreg/config.toml`.

```sh
snreg user list
snreg device run check-disk --group lab
snreg token create --name lab --max-uses 50 --expires 30d
snreg asset label SN-000123 -o labels.pdf
snreg ticket comment 1234 "Replacement is on the way"
snreg schema export -o schema.json
snreg api GET /dashboard
```

Add `--json` for machine-readable output. The exit code is 0 on success, 1 for a user error and 2 for a server error.
