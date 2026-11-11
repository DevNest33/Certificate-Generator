# Certificate Generator

Browser-only tool that mass-produces certificates from reusable **presets**. Pick a design, paste your rows, download a ZIP. Nothing is uploaded; everything stays in the browser.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Presets

A preset is one certificate design: its artwork, its field layout, and which values are fixed for the
whole design versus supplied per certificate. Two ship with the app:

| Preset | Artwork | Fields |
| --- | --- | --- |
| Participation certificate | `public/templates/participation-certificate.png` | Company name, recipient, course name/dates/duration, two signatories, awarded-on |
| Course completion | `public/certificate-template.png` | Recipient, course name, start date, certificate number, duration, issue date |

Each field has a **source**:

- **From data** — supplied per certificate, from your pasted rows.
- **Fixed** — typed once in **Presets** and printed on every certificate from that design. Use this
  for a uniform cohort: set the course name, dates and duration once and paste only names and dates.
- **Built from fields** — assembled from a pattern with `{fieldId}` placeholders. The participation
  design's body sentence works this way, so the course name, dates and duration carry data without
  being drawn anywhere on their own. Wrap a clause in `[[ ]]` and it is dropped whole when any field
  it names is blank, so a missing value never leaves a dangling phrase:

  ```
  Demonstrated ... during “{courseName}”[[, which took place from {courseDates}]].
  ```

  With no course dates that prints `Demonstrated ... during “CODIGO”.` rather than
  `... during “CODIGO”, which took place from .`

Edits you make in the app are saved in this browser. **Export JSON** writes the design as it stands;
drop that file into `src/presets/` to ship it with the app. **Reset** restores a built-in preset.

### Adding a design

1. Put the blank artwork in `public/templates/`.
2. Duplicate the closest preset, point it at the new file, and lay the fields out in the editor.
3. Export JSON and commit it, or add a module in `src/presets/` and register it in
   `src/presets/registry.ts`. The `designer(width, height)` helper in `src/presets/authoring.ts` lets
   you author positions in the template's own pixels (anchor X, text baseline, box width and height)
   rather than normalized fractions.

Anything that never changes — the title, rules, borders, printed labels — belongs in the artwork, not
in a field.

## Adjusting positions

- **Editor:** click a field on the certificate, then drag it, resize it with the handles, or nudge it
  with the arrow keys (Shift = 10 px). The right panel edits font, size, weight, color, letter
  spacing, alignment and exact X/Y/width/height in template pixels. Lock a field to prevent
  accidental moves. Toggle the reference overlay with the eye icon; it is never exported.
- **Reset layout** restores the shipped positions for that design.

Fonts are system stacks only, so nothing is fetched from the network — and a design using a font the
machine lacks will render differently. The panel warns when the chosen family is not installed.

## Certificate data

Under **Certificate Data**, **Paste or import data** takes rows copied straight out of Excel or
Sheets (commas or tabs), or a CSV file. Only the preset's *From data* fields are expected as columns;
headers are matched automatically and can be remapped, and unused columns are listed rather than
silently dropped.

```csv
Recipient Name,Awarded On
Syed Abdul Rehman,2023-10-25
```

Certificate numbers are taken exactly as supplied, so re-running a batch reproduces the same numbers.
Generating numbers for blank cells is an explicit opt-in during import, or **Fill missing numbers**
afterwards.

Each design keeps its own rows, so switching presets does not lose data.

## Export

Pick a certificate under the preview, then use **PDF** or **PNG** in the right panel, or **Download
all as ZIP** for the whole batch — PNG or PDF, chosen with the batch format toggle. File names come
from the preset's export template (`{recipientName}` for the participation design). PDFs are 297 × 210 mm
landscape. Rows with errors (missing required field, invalid date, duplicate number) must be fixed
before exporting the batch.

## Storage

Presets, certificate data and export history are kept in `localStorage`, so they survive closing the
tab. Editor view state (zoom, grid, which certificate is previewed) uses `sessionStorage`.
