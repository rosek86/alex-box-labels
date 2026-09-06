# ALEX / MALM box labels

Create printable adhesive labels for the 3D-printed boxes in [IKEA ALEX & Malm multiple inserts by printingbuddy](https://www.printables.com/model/244443-ikea-alex-malm-multiple-inserts). Edit descriptions, arrange them on A4, and print or export your sheets as SVG or PDF.

The insert collection includes sizes such as 1×1, 1×2, 2×2 and 3×3, with names indicating width × depth. Visit the original project for model files and the complete range of boxes. This repository contains the label editor, not the 3D models.

The default label size is **22 × 9 mm**. Measure the label area on your printed box and adjust the dimensions as needed; this starting size is not a verified fit for every variant. Print a paper test before using an adhesive sheet.

## Quick start

Requires **Node.js 26**. The version is specified in `.nvmrc`.

```sh
nvm install
nvm use
npm ci
npm start
```

Open http://127.0.0.1:3000. The entry page is `index.html`. The server listens on localhost only; use `PORT=3001 npm start` for another port.

The application and tests use **TypeScript and ESM**. `npm start` runs `node server.ts` directly, without `tsx`, `ts-node` or a server build. The development server strips types from public browser modules with Node's built-in `stripTypeScriptTypes`. Open the application over HTTP, not `file://`.

`npm run dev` starts the server with `node --watch`. Refresh the browser after changing browser code. In Node 26.8.1, `stripTypeScriptTypes` emits an experimental API warning on first use; it does not prevent the application from running.

## Prepare your labels

The only included example is a **161-label screw, nut and washer list**, covering M1.6 through M8. It fills one complete A4 sheet with the default layout: **7 columns × 23 rows**. The example opens on first use; later visits restore your saved project. Use **Load screw example** to replace the current list, or **Clear list** to start your own. Save your project before replacing a list you want to keep.

1. The default **List** editor gives each label a separate field. Enter inserts a text row within that label. Add or remove labels using the buttons; an empty field reserves a blank slot. Select a field to highlight its label in the preview. Switch to **Text** for bulk editing (one physical line per label). Drag the divider to resize the editor panel, or focus it and use the arrow keys.
2. Set label dimensions, margins and horizontal/vertical gaps to match your sheet and printed boxes. All dimensions, including font sizes, are in millimetres.
3. For a partly used sheet, set **Skip slots on first page**. Labels run left to right, then top to bottom; subsequent pages start at the first slot.
4. Use **X offset** and **Y offset** to calibrate alignment. Positive values move labels right and down without changing the grid size.
5. Enable **Print a black frame around each label** for a full adhesive sheet you will cut yourself. Every populated label gets its own closed rectangular frame, drawn 0.2 mm inside its boundary with a 0.1 mm stroke. With zero gaps, neighbouring frames leave 0.3 mm of clear paper: make one knife cut down its middle. The cut labels retain their full black frames and their 22 × 9 mm dimensions. Disable frames for pre-cut labels if desired. Blank and unused slots have no printed frame; dashed slot boundaries appear only in the preview.
6. Choose **Print / PDF**. Select A4 portrait, **100% / actual size**, no browser margins, and no headers or footers. Disable scaling to the printable area.
7. Test on plain paper before printing onto adhesive paper.

Default settings:

| Setting                     | Value                     |
| --------------------------- | ------------------------- |
| Paper                       | A4 portrait, 210 × 297 mm |
| Label                       | 22 × 9 mm                 |
| Horizontal and vertical gap | 0 mm                      |
| Left and right margins      | 28 mm                     |
| Top and bottom margins      | 45 mm                     |
| Text padding                | 0.8 mm                    |
| Font size                   | 2–3 mm                    |
| Capacity                    | 161 labels per page       |

The default block is 154 × 207 mm, centred on A4. Labels touch along their edges, so there are no waste strips between them. Use **Use 7 × 23 cutting layout** to apply the new defaults to an existing saved project; descriptions are preserved, while all sheet settings (including skipped slots) reset. Previously saved and imported dimensions remain unchanged until you choose this action.

The default grid is intended for a sheet cut by hand, not a specific commercial pre-cut label product. Changing dimensions or skipping slots can make the screw example span more than one page.

Long text wraps, including long part identifiers. Font size decreases in 0.1 mm steps down to the configured minimum. If the full description still does not fit, the editor identifies the affected label and disables printing and SVG export. It never silently truncates the description. Canvas measures text width; SVG bounding boxes provide final checks and centring.

## Languages

**English is the default.** Use **Language / Język** in the header to switch between English and Polish without reloading. The preference is saved separately from the project in browser storage. Switching languages preserves label descriptions, sheet settings and the JSON format.

When browser storage is unavailable, switching still works for the current visit; the next visit starts in English. Native file-picker and print-dialog language is controlled by the browser or operating system.

## Save, import and export

- **Save project** downloads JSON containing the descriptions and sheet settings.
- Import a saved JSON project or a UTF-8 TXT file with one description per line. TXT supports BOM and Windows line endings.
- **Download SVG** saves a 210 × 297 mm sheet. For multiple pages, choose the sheets in the export dialog. Use the print dialog for a single multipage PDF.
- Export filenames follow the interface language: `labels.json` and `labels-1.svg` in English, `etykiety.json` and `etykiety-1.svg` in Polish. Both single-sheet and multipage SVG exports use the selected language. File contents and the JSON schema remain unchanged.
- Projects are automatically saved in `localStorage`. Different origins and ports have separate storage. Export JSON to move a project from localhost to GitHub Pages.
- Invalid imports leave the current project intact. Existing version 1 projects remain compatible, including previously saved descriptions that are no longer included as examples.

Project format; omitted settings use defaults:

```json
{
  "version": 1,
  "settings": { "labelWidth": 22, "labelHeight": 9, "borders": true },
  "labels": ["M3 Washer", "M3 Nut", "M3 10mm DIN 912"]
}
```

Limits: 2 MB per imported file, 5,000 descriptions, 1,000 characters per description, 2,000 slots per page, and at most 100 pages / 20,000 slots in a project.

## Static build and GitHub Pages

```sh
npm run build
```

`dist/` contains `index.html`, `main.css`, `.nojekyll` and browser JavaScript ESM modules in `src/`. TypeScript rewrites relative `.ts` imports to `.js`; server code is excluded. Each build replaces the previous generated `dist/` directory.

Upload the **contents of `dist/`** to a static host. No Node runtime or production dependencies are needed on the host. Relative asset paths work both at a domain root and at `https://username.github.io/repository-name/`. The generated directory is ignored by Git.

The repository includes a manually triggered workflow in `.github/workflows/pages.yml`:

1. Push the source project, including the workflow, to GitHub.
2. Select **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Open **Actions → Deploy to GitHub Pages → Run workflow** and select `main`.
4. The workflow installs Node from `.nvmrc`, runs `npm ci`, quality checks and the build, then deploys only `dist/`. The deployment provides the published URL.

Pushing a commit does not automatically publish the site. See [GitHub's custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) for hosting configuration.

## Code structure

| Path                                              | Responsibility                                                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/core/`                                       | Domain types, validation, geometry, pagination, text fitting and project format; no DOM or Node APIs |
| `src/browser/app.ts`                              | Editor events and updates                                                                            |
| `src/browser/render.ts`                           | SVG preview, text measurement and centring                                                           |
| `src/browser/settings-form.ts`                    | Typed form access                                                                                    |
| `src/browser/project-files.ts`                    | File import and export                                                                               |
| `src/browser/storage.ts`, `language.ts`, `dom.ts` | Browser persistence, language selection and DOM helpers                                              |
| `src/i18n/`                                       | Translation dictionaries and language registry                                                       |
| `src/data/presets.ts`                             | The single full-sheet screw example                                                                  |
| `index.html`, `main.css`                          | Interface and A4 print styles                                                                        |
| `server.ts`, `src/server/http.ts`                 | Local server entry point and public asset handling                                                   |
| `scripts/build.ts`, `tsconfig.build.json`         | Static build                                                                                         |
| `tests/`                                          | Domain, import, translation, example, HTTP and static-build tests                                    |

### Add another language

1. Create a dictionary such as `src/i18n/de.ts`, using the keys from `en.ts` and `satisfies Messages`.
2. Import it into `src/i18n/index.ts` and register `de: { name: 'Deutsch', messages: de }` in `locales`.
3. Run `npm run check`. The language selector, local server and static build pick up the new locale automatically.

Dictionaries use named placeholders such as `{page}`. Tests verify that every locale has matching keys and placeholders. HTML uses `data-i18n` and `data-i18n-aria-label`; update its English fallback text when adding interface copy. Text is inserted through `textContent`, with separate text elements inside form labels to preserve controls.

Domain validation throws `LabelError` with a stable code and parameters. The interface translates the error using the current language, keeping the layout logic independent of browser preferences.

### External data import

External tools can generate project JSON containing `version: 1`, sheet `settings` and a `labels` array of strings. Import that file into the editor to preview and print it. The [PART-DB integration](integrations/partdb/README.md) exports parts from your local instance. It has its own Node project, configuration and tests in `integrations/partdb`; it is not included in the GitHub Pages build.

**Multiline editing:** project JSON stores text rows as `\n` within each label string. In List mode, use Enter for a new text row. In Text mode, type the two characters `\n` to start a new row within the same label; use `\\` for a literal backslash. In Text mode, a physical Enter starts a new label. Saved projects round-trip through the editor, including literal backslashes. TXT import retains its original one-label-per-line behavior and treats backslashes literally. Long rows still wrap automatically; check the preview for overflow before printing. Three rows fit the default height at the minimum font size, but long identifiers may require wider labels or different font settings.

## Development checks

```sh
npm run format        # Format TypeScript, HTML, CSS, JSON and Markdown
npm run format:check  # Check formatting without changes
npm run typecheck     # Check types without emitting JavaScript
npm test              # Run TypeScript tests directly in Node
npm run check         # Type checking, formatting and all tests
```

Prettier and TypeScript are local development dependencies pinned through `package-lock.json`. Type checking enables `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax` and `erasableSyntaxOnly`. Node's runtime type stripping does not perform type checking.

Tests cover sheet boundaries, pagination, empty/skipped slots, alignment, invalid input, long identifiers, Unicode, font limits, imports, translations and the complete screw example. The HTTP test checks the browser module graph, MIME types and private-file boundaries. The build test checks static assets under a repository subpath.

Text-fitting tests use deterministic measurements. They do not replace a visual font check or a physical printer alignment test.

## Repository conventions

Commit source, tests, tool configuration and `package-lock.json`. `.gitignore` excludes dependencies, generated output, coverage, logs and local `.env` files; example configurations such as `.env.example` can be versioned. Keep personal exports and working files in the ignored `exports/` or `local/` directories.

`.editorconfig` sets UTF-8 and indentation; `.gitattributes` normalizes text line endings to LF.
