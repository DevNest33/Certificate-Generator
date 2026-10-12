# Certificate Generator

Browser-only tool that fills `public/certificate-template.png` with recipient data and exports PDF, PNG or a ZIP of PDFs. Nothing is uploaded; all data stays in the browser tab (`sessionStorage`).

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Images

- `public/certificate-template.png` — the background used for preview and every export.
- `public/certificate-reference.png` — layout guide only. Toggle it with the eye icon in the editor toolbar; it is never exported.

To use another template, replace the PNG (same name) and update `designWidth`, `designHeight` and `qrArea` in `src/defaultLayout.ts` if the size differs.

## Adjusting positions

- **Editor:** click a field on the certificate, then drag it, resize it with the handles, or nudge it with the arrow keys (Shift = 10 px). The right panel edits font, size, weight, color, letter spacing, alignment and exact X/Y/width/height in template pixels. Lock a field to prevent accidental moves.
- **Defaults:** `DEFAULT_ELEMENTS` in `src/defaultLayout.ts` (template pixels: anchor X, text baseline, box width and height). "Reset layout" restores them.

## Recipient data

Add rows manually in **Recipient Data**, or click **Import CSV**. Download **Sample CSV** for the expected format:

```csv
Recipient Name,Course Name,Course Start Date,Certificate Number,Course Duration,Issue Date
Syed Rushda,Receiver basics in Analog Communication,2026-04-23,fd823741,1 hour,
```

Column names are matched automatically and can be remapped. Empty certificate numbers are filled with an 8-character code of lowercase letters and digits; existing numbers are kept. An empty Issue Date uses the global issue date in the header.

## Export

Pick a recipient under the preview, then use **PDF** or **PNG** in the right panel, or **Download all as ZIP** for one PDF per recipient. PDFs are 297 × 210 mm landscape with a 2048 × 1448 px image. Rows with errors (missing name, invalid date, duplicate number) must be fixed before exporting.
