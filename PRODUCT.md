# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React + TypeScript, static build. Deploys to Vercel as a static site; the same `dist/` is wrapped by a Tauri v2 shell for a local Windows/macOS/Linux desktop binary. All parsing and document generation run in the browser (SheetJS for `.xlsx`, `docx` for output) — no server, no upload, no database. Confirmed by the user, including "no database".

## Users

Media researchers and production editors at educational publishers (Macmillan Education and its packagers). They sit at a desk with a signed-off page proof on one side and the project's photo-log spreadsheet on the other, at Second Proofs stage, assembling the photo credits page for a Student Book or Workbook. They are not developers. The spreadsheet is dirty — trailing spaces, tab characters in names, "Getty" and "Getty " and "Shutter Stock" in the same column, blank placements.

## Product Purpose

Turn a photo-log spreadsheet into a submission-ready credit page. Success is a `.docx` that passes the Final quality-control checklist in `Credit_Page_Formatting_Instructions.docx` without a human retyping or re-alphabetising anything, and an audit trail back to the spreadsheet row for every credit.

## Positioning

The mechanism is the live proof: the credit page renders as a page while the columns are being mapped, and every credit line traces back to the spreadsheet rows that produced it. A generic spreadsheet-to-document converter has neither the house rules nor the traceability.

## Operating Context

- Input: the component's image brief / photo log workbook (`Working file _ WB5.xlsx`), one sheet per component, header row buried below a legend block (row 12 in the sample), ~1000 rows of which ~350 carry credits.
- Governing documents: `00 Media Research Guidelines.docx` (Photo Credits section) and `Credit_Page_Formatting_Instructions.docx`.
- Reference output: `Creditos RAU_SB3-MLLP-Final.pdf`.
- Each component (Student Book, Workbook) has its own log and its own credit page.

## Capabilities and Constraints

- Upload `.xlsx`/`.xls`/`.csv`; choose sheet and header row; map four roles — Library, Credit, Page, Placement — by picking columns or by typing a sentence ("library is X, credits Y, page F, placement V").
- Two output styles, user-switchable: **Guidelines** (one continuous list, library repeated before every credit, bold on first occurrence, `p7(a)` with no space, `;` between groups, `.` at the end) and **Sample PDF** (bold library name as a group heading, `p. 15(br)` with a space) — the two source documents conflict and the user confirmed both must ship.
- Mandatory opening sentence on every credit page: "The authors and publishers would like to thank the following for permission to reproduce their images."
- Alphabetical by library, then by credit name within the library; `p` / `pp`; positions in parentheses; multiple positions on one page collapse into one reference in page reading order.
- Library names are normalised through an alias table (`Getty`, `Getty ` → `Getty Images`; `Shutter Stock` → `Shutterstock`); unrecognised libraries surface as a query for the user to map, never silently.
- Position codes are passed through from the log, lowercased; codes outside the documented set are flagged, never rewritten. The app cannot see the page layout, so it can never verify a position is correct — only that one was supplied.
- Export `.docx`. No account, no network call, no persistence beyond the user's own machine.

## Brand Commitments

Name: Credits Compiler. Binding visual constraint volunteered by the user: "editorial proofing desk, but with proper colors for differentiation."

## Evidence on Hand

Real files kept locally in the project root (confidential, gitignored, never committed): the sample workbook, both guideline documents, and the reference credit-page PDF. No customer quotes, benchmarks, pricing, or deployment claims exist — do not fabricate any.

## Product Principles

1. The proof is always on screen. Mapping decisions are judged by what they do to the credit page, not by a form.
2. Every credit traces back to its spreadsheet rows.
3. Flag, never guess. Dirty data gets surfaced as a query; the app does not invent a position code or a library name.
4. The house rules are the product. Alphabetisation, punctuation, `p`/`pp`, and the opening sentence are not options.
5. Nothing leaves the machine.

## Accessibility & Inclusion

Standard web accessibility: full keyboard operation of file, sheet, mapping and export controls; visible focus; the credit proof is selectable, readable text, never an image.
