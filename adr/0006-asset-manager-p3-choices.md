# 0006: Asset manager choices the spec left open (P3)

**Status:** Accepted

## Context

P3 (spec §6.3) needed decisions the spec leaves open. Each is the simplest option that meets the acceptance criteria (spec §0 rule 4).

## Decisions

1. **Custom fields are stored now and typed in P5.** Assets keep free-form `custom` values, which the API, CSV import (`custom.<key>` columns) and export all carry. Field definitions, validation and `visible_to` come with the `schema_defs` engine in P5 (§6.5, CU-1).
2. **Locked fields.** Editing `serial`, `manufacturer`, `model` or `assigned_user_id` on an enrolled computer adds that field to `custom.locked_fields`. Enrollment, inventory and primary-user changes then leave it alone. Writing `custom.locked_fields` directly unlocks a field.
3. **Inventory carries hardware.** `Inventory` gains an `hw` field so reports can refresh the device and asset (§6.3). Older agents omit it, and empty values never overwrite stored ones.
4. **Retired hardware keeps its asset.** A retired device's computer goes `in_stock`. If the same HWID enrolls again as a new device, the existing asset and tag are relinked, because it's the same physical machine.
5. **CSV import is all or nothing.** Any bad row rejects the file with a `line N` error for every bad row. Retrying a fixed file therefore can't create duplicates. Columns map through a `map` query parameter. Imported `SN-<n>` tags advance the tag sequence.
6. **CSV export guards formulas.** Cells starting with `=`, `+`, `-` or `@` get a leading `'`, because serials and models come from devices and are untrusted.
7. **Visibility.** `asset_manager` and `auditor` see all assets. Everyone else sees assets assigned to them or owned by a group they're currently in, checked on every read (IG-4), without cost or custom fields. A hidden asset is a 404.
8. **Audit buckets.** Found: scanned where recorded. Misplaced: scanned elsewhere. Missing: recorded at the audit's location, not scanned, and not `retired` or `lost`. The report is computed live, so moving an asset later changes an old audit's report.
9. **Labels are written directly** (PDF objects, stored-deflate PNG, Code128 set B), with `qrcodegen` as the only new dependency. All layouts were decoded with `zbarimg`. The PNG has no human-readable tag; the PDF does.
10. **`/a/<tag>` is a web route.** It needs a login and resolves through `/assets/by-tag/{tag}`, so an unauthenticated visitor can't probe which tags exist.
11. **API additions beyond §6.3:** `POST /assets/bulk`, `GET /assets/{id}/history`, `GET /assets/{id}/label.png`, `POST /asset-audits/{id}/close`, `POST /asset-audits/{id}/move-misplaced`.

## Consequences

- CSV cells can't contain line breaks, same as the user import.
- At 1×1 in, long tags make narrow barcode bars. The default `SN-000123` form decodes at 400 dpi; printer quality wasn't tested.
