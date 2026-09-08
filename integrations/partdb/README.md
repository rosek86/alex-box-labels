# PART-DB label exporter

This independent Node project lives in `integrations/partdb` within the label editor repository. Run the commands below from this directory. Its dependencies, local configuration and exports remain inside this directory.

Run the TypeScript exporter locally with Node 26, then import its JSON into the editor (including the GitHub Pages version). It uses built-in `fetch` and requires no extra dependencies. Field mapping and filters were checked against the PART-DB **2.16.1** source; testing against your own installation is still required.

1. Enable API access for your PART-DB user and create a **Read-Only** API token in user settings.
2. Copy `.env.example` to `.env`. Set `PARTDB_URL` to the installation root (e.g. `http://partdb.local/`, or `https://host/partdb/`) and set `PARTDB_TOKEN` locally.
3. Optionally copy `partdb.config.example.json` to `partdb.config.json` to customize aliases and supplier priority.
4. Export the desired parts:

```sh
npm run export:partdb -- --category 12
npm run export:partdb -- --location 7 --supplier M --output exports/mouser.json
npm run export:partdb -- --ids 123,456 --config partdb.config.json
npm run export:partdb -- --category 12 --location 7 --template local/sheet.json
node scripts/export-partdb.ts --help
```

Category and location accept comma-separated positive IDs and can be combined as an intersection. `--ids` preserves the requested order and removes duplicate IDs. Collection exports are ordered by part ID. Use `--all` explicitly for the entire inventory. Filters select the specified IDs; they do not automatically include child categories or locations. Each selected part produces one label, regardless of stock quantity or number of storage locations.

The default destination is `exports/labels.json`; a sibling `labels.report.json` records missing fields and ambiguous supplier choices. Import **labels.json**, not the report. Existing files are protected; use `--force` to replace them. `--template` reuses all sheet settings (including skipped slots) from a saved project. Without it, the current default 7 × 23 cutting layout is used.

The default export allows fonts down to **1.5 mm**, so long identifiers can wrap to a fourth row within the 22 × 9 mm labels. Short labels still use the largest font that fits, up to 3 mm. A supplied `--template` overrides these settings. Very long descriptions can still overflow; check the preview and print a sample to assess readability.

Labels have explicit text rows: manufacturer alias, manufacturer part number (MPN), then supplier code and supplier part number, for example:

```text
TI
NE555P
M:595-NE555P
```

Supplier aliases are **D = Digi-Key, M = Mouser, T = TME, F = Farnell, L = LCSC**. Matching ignores case, spaces and punctuation. Default manufacturer aliases include Texas Instruments → TI, STMicroelectronics → ST, and Analog Devices → ADI. Unknown names remain intact. Custom dictionaries extend/override the defaults; pass `--config` explicitly to load yours.

Only one active supplier offer is printed. `--supplier M` restricts the choice to Mouser. Otherwise the configured priority (default D, M, T, F, L) applies, followed by unknown suppliers. Ties are sorted by supplier code and number for repeatable output; the report records multiple candidates. Obsolete offers are ignored. If no matching offer exists, the supplier row is omitted and reported. Missing MPN falls back to the part name with a warning; missing manufacturer is omitted with a warning. Identifiers are not abbreviated or truncated.

The exporter follows pagination and resolves linked records, with cached lookups and request timeouts. API failures stop the export. Tokens stay in the local environment: neither the static build nor exported JSON contains them. `.env`, `partdb.config.json`, `exports/` and `local/` are ignored by Git. No live connection to PART-DB is needed by the label editor.

**Multiline editing:** project JSON stores text rows as `\n` within each label string. In the editor, type the two characters `\n` to start a new row within the same label; use `\\` for a literal backslash. A physical Enter still starts a new label. Saved projects round-trip through the editor, including literal backslashes. TXT import retains its original one-label-per-line behavior and treats backslashes literally. Long rows still wrap automatically; check the preview for overflow before printing. Three rows fit the default height at the minimum font size, but long identifiers may require wider labels or different font settings.

References: [PART-DB API](https://docs.part-db.de/api/intro.html), [authentication](https://docs.part-db.de/api/authentication.html), and your installation's `/api/docs` or `/api/docs.json`.

## HTTPS with a private or self-signed certificate

Save your trusted CA certificate in PEM format as `local/partdb-ca.pem`. For a directly self-signed server certificate, use that certificate instead. Obtain it from your server or CA configuration; the private key is not needed.

Run from this integration's directory, setting the certificate path before Node starts:

```sh
NODE_EXTRA_CA_CERTS="$PWD/local/partdb-ca.pem" npm run export:partdb -- --ids 123
```

`PARTDB_URL` must use a hostname covered by the certificate, and the certificate must be valid. Adding a CA does not bypass hostname or expiry checks. Do not disable TLS verification. See [Node's additional CA documentation](https://nodejs.org/api/cli.html#node_extra_ca_certsfile).

## Development checks

Run `npm ci`, then `npm run check`. Runtime export only needs Node 26.

Prettier is installed locally and configured in `.prettierrc.json`. Run these commands from this integration's directory:

```sh
npm run format        # Format source, tests and documentation
npm run format:check  # Check formatting without modifying files
npm run check         # Type checking, formatting check and tests
```

`.prettierignore` excludes local credentials, configuration, exports, dependencies and the generated lockfile.

Code responsibilities:

- `scripts/export-partdb.ts`: command-line options and export workflow.
- `src/partdb/client.ts`: authenticated API requests, relations and pagination.
- `src/partdb/config.ts`: configuration defaults and validation.
- `src/partdb/selection.ts`: part selection and loading full records.
- `src/partdb/export.ts`: supplier choice and label text.
- `src/output.ts`: output validation and writing the project and report.

This is a standalone project: it does not import files or dependencies from the label editor. `src/core/` contains a snapshot of the version 1 label format validation and default sheet settings. Keep this contract compatible with the editor when modifying it. The projects exchange JSON files only.

## Export an ID range

```sh
npm run export:partdb -- --from-id 71 --force
npm run export:partdb -- --from-id 71 --to-id 100 --force
```

Bounds are inclusive; either can be omitted. Combine them with category/location filters, but not with `--ids` or `--all`. Missing IDs are skipped. The exporter filters the paginated collection locally before requesting part details; the existing 5000-record collection limit still applies. With a private CA, use the `NODE_EXTRA_CA_CERTS` prefix described above.
