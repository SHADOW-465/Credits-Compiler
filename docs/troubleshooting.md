# Troubleshooting

## Loading the file

### Nothing appears on the sheet after loading

Check the **Columns** panel. If **Library** or **Credit holder** has a red dot, it is not
mapped, and nothing can compile. Pick the column from its dropdown.

If both are mapped and the sheet is still empty, the header row is probably wrong. The
sample values under each dropdown will look like headings or legend text rather than real
data. Type the correct row number into **Header row**.

### It opened the wrong sheet

The app opens the sheet whose headers match best. If a workbook has several similar sheets,
such as a print brief and a digital brief, choose the right one from **Sheet**.

### A red error appears above the sheet after loading

The message comes from the spreadsheet reader. The usual causes:

- The file is password-protected. Save an unprotected copy.
- It is open and locked in Excel. Close it, or save a copy.
- It is not a spreadsheet the reader understands. Save it from Excel as `.xlsx`.

The file picker only offers `.xlsx`, `.xlsm`, `.xls`, `.csv` and `.tsv`. Those are the
tested formats.

### Values show as numbers or dates I did not type

The app reads the stored cell value rather than Excel's display format. A page number
formatted as text in Excel comes through as written. Formula cells come through as their
last calculated value, so open and save the file in Excel if the formulas have not been
recalculated.

## The credits look wrong

### A library appears twice, e.g. "Getty" and "Getty Images"

The spelling is not in the alias table. The unrecognised one has a query: type the house
name and press **Set**. To fix it for everyone, add the spelling to `LIBRARY_ALIASES` — see
the [developer guide](developer-guide.md#add-a-library-spelling).

### Two names are run together, e.g. "Frederick BassfStop Images GmbH"

The spreadsheet cell is missing the separator. The app copies names exactly, so correct
the cell and reload.

### A credit is missing

Look in **Queries** for a red *no library* or *no credit holder* item. Those rows are left
off the page. The status line's *skipped* count says how many.

### The order looks wrong

Credits are sorted by the name as written, ignoring capitals and leading punctuation. They
are not sorted by surname: `Adam Gault` sorts under *A*. See
[Credit formatting rules](credit-rules.md#order).

### A position code is wrong

The app copies the Placement column. It cannot see the page layout, so it cannot tell that
an image marked `tr` is really bottom left. Correct the spreadsheet.

### A credit shows `(bg)` or another code with an amber underline

It is not in the documented code table. It stays on the page as written. Check it against
the approved layout and correct the spreadsheet if needed.

### The sentence in "Or describe them" did nothing

The line under the box says what went wrong. Name the role and give the column letter in
the same part of the sentence, for example `library is column X`. Letters outside the
sheet's columns are ignored.

## Exporting

### Export .docx is greyed out

Library and Credit holder must both be mapped, and at least one row must compile.

### The download does not start

The browser may be asking for permission to download from the site. Allow downloads for the
site and try again.

**In the desktop app:** export and copy have been tested in the browser build only. The
Tauri installer has not yet been built and tried. If Export does nothing there, the window
is not handling the download, and the shell needs Tauri's dialog and filesystem plugins to
save the file. Use the website in the meantime.

### Copy does not paste anything

The clipboard needs a secure page: `https://` or `localhost`. It will not work from a plain
`http://` address on a network.

## Installing and building

### Install fails on xlsx

SheetJS is installed from `https://cdn.sheetjs.com`, not the npm registry. If that host is
blocked, download the tarball on a machine that can reach it, then install it from the
file:

```bash
npm install ./xlsx-0.20.3.tgz
```

Do not switch back to `xlsx` from npm. That copy is stuck at 0.18.5 and has two published
security advisories.

### `npm run tauri build` says `cargo` was not found

Rust is not installed or not on your PATH. Install it from <https://rustup.rs>, then open a
new terminal.

### Tauri build fails looking for icons

Generate them first:

```bash
npm run tauri icon src-tauri/app-icon.png
```

### Windows warns the installer is from an unknown publisher

The installer is not code-signed. See
[Deployment → Code signing](deployment.md#code-signing).
