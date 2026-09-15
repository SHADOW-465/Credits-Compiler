# Credits Compiler

Turns a photo-log spreadsheet into a submission-ready photo credit page.

Drop the workbook in, check the four columns it mapped for you (or describe them in a
sentence), work the query list down to nothing, export `.docx`. The credit page is on
screen the whole time — it is a proof, not an export you find out about afterwards.

The rules come from `00 Media Research Guidelines.docx` (Photo Credits) and
`Credit_Page_Formatting_Instructions.docx`. These are confidential client documents and are
not committed — keep your copies in the project root; `.gitignore` excludes them.

## What it does

- Reads `.xlsx` / `.xlsm` / `.xls` / `.csv`, finds the header row under the legend block,
  and picks the sheet that maps most completely.
- Maps four roles — **Library**, **Credit holder**, **Page**, **Placement** — by header
  text, by hand, or from a sentence like
  *"Column X has the library, column Y the credits, F is the page number and V the placement."*
- Alphabetises libraries, then credit holders within each library, case- and
  punctuation-insensitively.
- `p7(a)`, `p45(tl,br)`, `pp10, 11(tr)`, `pp15(tl), 71(br)`. Lowercase, no space, positions
  in page reading order, duplicates collapsed.
- Normalises library names (`Getty`, `Getty `, `Shutter Stock`) through an alias table so
  one library never splits into two groups.
- **Flags rather than guesses.** Unrecognised libraries, credits with no library at all,
  undocumented position codes and missing page numbers become queries you can resolve in
  the panel — assigning a library there compiles the credit without editing the sheet.
- Click any credit on the page to see the spreadsheet rows behind it.
- Two output styles, because the two source documents disagree:
  - **Guidelines** — one continuous list, library repeated before every credit, bold on
    first occurrence only, `;` between groups, `.` at the end. This is what
    `Credit_Page_Formatting_Instructions.docx` specifies.
  - **Sample PDF** — library as a bold heading with credits beneath and `p. 7(a)`, matching
    `Creditos RAU_SB3-MLLP-Final.pdf`.

Nothing is uploaded. The workbook is parsed in the page and the `.docx` is built there too,
so the same code runs on the web and on the desktop with no server involved.

## What it cannot do

It cannot see the page layout, so it can never confirm that `(tr)` is the right position for
an image — only that a position was supplied and that the code is one the guidelines
document. Checking positions against the approved proof stays a human step.

## Run it

```bash
npm install
npm run dev
```

Tests (the credit-page rules, including the guidelines' own worked example):

```bash
npm test
```

## Deploy to Vercel

Import the repo. `vercel.json` already sets the framework, build command and output
directory; no environment variables are needed.

```bash
npx vercel --prod
```

## Build the desktop app

Needs [Rust](https://rustup.rs) and the Tauri prerequisites for your OS. The shell in
`src-tauri/` wraps the same `dist/` build the website ships.

```bash
npm run tauri icon src-tauri/app-icon.png
npm run tauri build
```

The installer lands in `src-tauri/target/release/bundle/`. `npm run tauri dev` runs the
desktop window against the Vite dev server.

## Layout

| File | What lives there |
| --- | --- |
| `src/credits.ts` | Every credit-page rule. Pure functions, no DOM. |
| `src/credits.test.ts` | The checks. Run with `npm test`. |
| `src/sheet.ts` | Workbook reading and header-row detection. |
| `src/docx.ts` | `.docx` output for both styles. |
| `src/App.tsx` | The interface. |
| `src/styles.css` | Design tokens and every style. |

`PRODUCT.md` holds the product record; `DESIGN.md` describes the visual system.

## Documentation

Full docs are in [`docs/`](docs/README.md):

- [User guide](docs/user-guide.md) — making a credit page, step by step
- [Credit formatting rules](docs/credit-rules.md) — every rule, its source, and edge cases
- [Deployment](docs/deployment.md) — Vercel and the Tauri desktop build
- [Developer guide](docs/developer-guide.md) — how the code fits together and how to change it
- [Troubleshooting](docs/troubleshooting.md)
