# ATC Strip Printer

Local macOS web app for managing saved simulator exercise packages, checking imported flight progress strip data, previewing exact strip output, and preparing print runs for the installed BOCA strip printer driver.

## Current Project Summary

- The imported prototype is a FastAPI app using `pandas`/`openpyxl` to read spreadsheets and ReportLab to draw strip PDFs.
- Generated strips are one PDF page per strip at `8.000 x 1.000 in` (`576 x 72 pt`).
- The pre-made PDFs in `/Users/michaelevans/Downloads/SMC Strips` are single-page PDFs named by callsign/type, for example `TROJ007 Dep Template.pdf` and `STKR35 ARR.pdf`.
- The inspected pre-made PDFs are `576.24 x 72 pt`, or about `8.003 x 1.000 in`.
- The installed strip printer is `BOCA_SYSTEMS_46_300`; its driver exposes the `boca8x1` media size.

## Spreadsheet Format

The existing parser reads the first sheet with no header row and uses section markers in column A:

- `DEPARTURES`
- `LOCALS`
- `ARRIVALS`
- `TRANSIT`

Parsing stops when column A contains `PRE EXERCISE`. Rows whose first cell is `ACID` are treated as headers and skipped.

Expected positional columns:

| Section | Columns currently used |
| --- | --- |
| Departures | A callsign, B rules, C aircraft type, D wake turbulence, F level, H point, I radial, K aerodrome |
| Locals | A callsign, B rules, C aircraft type, D wake turbulence, F level |
| Arrivals | A callsign, B rules, C aircraft type, D wake turbulence, F level, G aerodrome, H radial, I point |
| Transit | A callsign, B rules, C aircraft type, D wake turbulence, H level, I point, J radial, K aerodrome |

## Architecture

- `main.py`: thin compatibility entrypoint for `uvicorn main:app` and the macOS launcher.
- `strip_app/`: compartmentalised application package. See `strip_app/README.md`.
- `strip_app/app.py`: FastAPI app factory and route registration.
- `strip_app/models.py`: shared strip/package interfaces and normalization helpers.
- `strip_app/storage.py`: local package database and safe filesystem access.
- `strip_app/spreadsheets.py`: workbook parser and strip field mapping.
- `strip_app/rendering.py`: ReportLab strip drawing.
- `strip_app/previews.py`: PDF-to-PNG preview generation and PDF page imports.
- `strip_app/pdf_generation.py`: calibration and combined print-review PDFs.
- `strip_app/printer.py`: macOS printer command interface.
- `strip_app/ui/`: package library, package detail, strip editor, and legacy route modules.
- `templates/`: package library, package detail tabs, manual strip designer, preview pages.
- `Exercises/<package>/package.json`: saved simulator package record.
- `Exercises/<package>/source`: original imported workbook.
- `Exercises/<package>/spreadsheets`: editable/imported workbook copy.
- `Exercises/<package>/previews`: one generated print-master PDF per imported strip.
- `Exercises/<package>/preview_images`: PNG thumbnails rendered from print-master PDFs for browser preview cards.
- `Exercises/<package>/strip_pdfs`: page-level PDFs split from imported multi-page PDF strip packages.
- `Exercises/<package>/generated`: generated all-strips PDFs from workbook rows.
- `Exercises/<package>/print_jobs`: combined selected-strip PDFs for print review.
- `Exercises/<package>/designed`: hand-built strip PDFs from the in-app designer.
- `Exercises/<package>/pdf_assets`: copied or uploaded pre-made PDFs.
- `.env`: fixed local host/port, printer name, and PDF library folder.
- `launch.py`: macOS-friendly launcher that checks port conflicts before starting.
- `Strip Printer.command`: double-clickable project-local launcher.

Printing uses the installed macOS driver with:

```sh
lp -d BOCA_SYSTEMS_46_300 -o PageSize=boca8x1 -o scaling=100 -o number-up=1 -o CutMedia=PerLabel <pdf>
```

## Developer Map

- Upload/import code: `strip_app/imports.py`, `strip_app/spreadsheets.py`, and `strip_app/ui/library.py`.
- Strip rendering: `strip_app/rendering.py`.
- Preview images: `strip_app/previews.py`; preview UI lives in `strip_app/ui/package_detail.py` and `templates/package_detail.html`.
- Printing: `strip_app/printer.py`; combined print PDFs are built in `strip_app/pdf_generation.py`.
- Package data save/load: `strip_app/storage.py`.
- UI pages/components: `strip_app/ui/` plus the project-level `templates/` folder.

## MVP Implemented

- Save imported simulator packages locally as reusable records.
- Open a package library page.
- Open a package detail page with Data View, Strip Preview, and Package Notes tabs.
- Show imported workbook rows grouped as Departures, Locals, Arrivals, and Transit.
- Extract pre-exercise coordination, exercise information, and restricted airspace notes.
- Generate one print-master PDF and one PNG preview image per imported strip.
- Select strips and generate a combined print PDF.
- Build a new strip in the browser with a live 8x1 preview.
- Add right-facing arrows, circle coordination text, and insert tick marks into text fields.
- Upload an `.xlsx`/`.xls` workbook or `.zip` strip package and generate strip PDFs.
- Add pre-made PDFs from `/Users/michaelevans/Downloads/SMC Strips`.
- Upload additional PDF assets and convert each PDF page into a selectable strip record.
- Preview generated, designed, and imported strips from PNG thumbnails instead of embedded browser PDF frames.
- Regenerate a strip thumbnail, open its print PDF, or edit generated strip fields from the preview page.
- Print selected PDFs through `BOCA_SYSTEMS_46_300`.
- Open a calibration PDF at `/calibration.pdf`.

## Staged Plan

1. Preserve the current generator and wrap it in saved package records.
2. Add package library and package detail tabs for data, previews, and notes.
3. Generate per-strip preview PDFs and combined selected-strip print PDFs.
4. Add PDF asset selection/import and direct CUPS printing with `boca8x1`.
5. Add the hand-built strip designer for one-at-a-time strip creation.
6. Add a calibration/check page for alignment before live exercise printing.
7. Package as a more polished macOS app wrapper after the print path is confirmed.

## Port And Server

- Fixed project port: `3001`
- Host binding: `127.0.0.1`
- Start command:

```sh
cd "/Users/michaelevans/Documents/New project 4"
source .venv/bin/activate
python launch.py
```

Double-click alternative:

```sh
open "/Users/michaelevans/Documents/New project 4/Strip Printer.command"
```

Stop the server with `Ctrl+C` in Terminal, or press Enter in the launcher terminal window.

Before starting manually, inspect the fixed port:

```sh
lsof -nP -iTCP:3001 -sTCP:LISTEN
```

If the port is already in use, do not start another server. Stop the conflicting process or assign another fixed UI port in `.env`.

## Dependencies

Dependencies are installed into the project-local `.venv` only:

```sh
cd "/Users/michaelevans/Documents/New project 4"
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

No global Python packages or printer drivers are installed by this project.

`pypdf` is used only inside the project environment to split uploaded multi-page PDF strip packages and assemble selected strip PDFs into one print-review PDF.

## Test Checklist

Automated tests:

```sh
cd "/Users/michaelevans/Documents/New project 4"
.venv/bin/python -m unittest discover -s tests
```

Manual smoke check:

1. Start the app and open `http://127.0.0.1:3001`.
2. Import a workbook or zip package.
3. Open a package from the library.
4. Check Data View for grouped source rows and validation warnings.
5. Check Strip Preview for one preview per imported strip.
6. Check Package Notes for coordination, exercise information, and restricted airspace.
7. Select a few strips and generate a combined print PDF.
8. Open `/calibration.pdf` and print one calibration strip before direct printer runs.
# VinesHardAssets
