# 0008: Customization, CLI and console choices (P5)

**Status:** Accepted

## Context

Spec §6.5, §6.6 and the P5 scope leave several behaviors open. These are the choices made for P5.

## Decisions

- **Reading custom values.** User, group and device responses no longer carry `custom`. Those values are read through `GET /custom/{id}`, which applies each field's `visible_to`. Assets keep `custom` in their responses because lists, filters and CSV need it, and every asset read path removes restricted keys.
- **`visible_to`** covers reading, writing and filtering. A field the caller can't see gets the same 422 as a field that doesn't exist. Filtering on it is refused, because a filter would reveal the value one guess at a time.
- **Deleting a field deletes its values** from every record, so a restricted value can't resurface without its restriction.
- **Required fields** are enforced on create, and when someone clears the value. Adding a required field doesn't block edits to existing records that don't have it yet.
- **Audit log.** `PATCH /custom/{id}` records the changed keys, not the values. Asset edits still record full diffs. The asset history endpoint removes restricted values, but the audit log viewer shows diffs unredacted to admins and auditors, because that's what an audit is for.
- **List views** are stored for every entity kind, but only the Assets list applies them in P5. Sorting applies to the loaded page (up to 500 rows). Personal views are stored under `u/<user>/<key>`.
- **Schema bundles** contain fields, global list views and layouts. Personal views stay out. Forms and routing rules stay out too, because they point at group IDs that only exist on one install.
- **Dashboard** sections appear only for roles that can read the underlying records. Ticket counts follow live queue membership.
- **The CLI** works with plain JSON and doesn't depend on `snreg-core`, so its CI needs no access to that private repo. It refuses to send a token over plain `http` except to loopback, follows no redirects, and refuses a config file that others can read. TLS uses the system certificate store, plus `--ca-file` for a private CA.

## Consequences

- The CLI integration test needs Postgres and a built `snreg-server`, so it's marked `#[ignore]` and doesn't run in GitHub CI yet. Run it with `cargo test -- --include-ignored`.
- Layouts arrange custom fields only. Built-in fields keep their place on each page.
