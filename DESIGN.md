# Design

Recorded from the built interface, not from intention. The direction contract this
implements is the HTML comment at the top of `index.html`'s body.

## The world

A proofing desk. Three honest surfaces and nothing pretending to be a fourth:

| Surface | What it is | Token |
| --- | --- | --- |
| Blotter | the dark working rail carrying every control | `--blotter #1c2229` |
| Desk | the warm grey field the work sits on | `--desk #c6c3b9` |
| Paper | one white sheet, the credit page itself | `--paper #ffffff` |

Light, not dark: the scene is a production editor at a desk in daytime with a printed
proof beside the screen. Nothing imitates a material it does not have — no CSS bevels, no
paper grain, no emboss. The sheet is a plain plane with a real offset-and-blur shadow.

## Colour

Restrained, in the Operate sense: neutrals plus a proof-marker vocabulary borrowed from
the world the product lives in. State colours never decorate.

```
--blue    #2d6cb5   action, selection, current mapping     (editor's blue pencil)
--red     #b32d23   blocking: a row that will not compile  (proof red)
--green   #24634a   resolved, nothing outstanding
--amber   #8a5a12   a query: look at this before you sign it off
```

Bright variants (`--blue-bright #6ba8ec`, `--red-bright #f08a80`, `--green-bright #6fc79f`,
`--amber-bright #e3ad55`) exist because the rail is dark; the base values are for paper.

**Library swatches are a separate palette** and deliberately clear of the state colours —
`#2f5d8c`, `#6b4e9b`, `#166a6a`, `#8c4a70`, `#4a5f2f`, `#8a5a2b`, `#3a4a7a`. A red dot
beside Getty Images would read as a problem with Getty Images.

Every muted tier clears 4.5:1 on its own ground: `--blotter-faint #8b97a5` on `#262e37` is
4.62:1, `--ink-faint #6f767f` on white is 4.59:1. `::placeholder` is themed on both grounds
because the UA default (`#757575`) belongs to no palette and misses the floor.

## Type

Two faces, each doing one job.

- **Archivo Variable** — the tool. Rail, bar, controls, data. `tabular-nums` on the body so
  row numbers and page numbers do not shift.
- **Literata Variable** — the page. The credit proof, the intro sentence, the sheet title.
  The credit page is print, so it is set in a book face.

Both are self-hosted through `@fontsource-variable`, so the desktop build works offline.
Fixed rem-ish scale, no fluid clamps: 11px labels → 12.5px controls → 13.5px body →
22px sheet title.

## Components

- **Mapping slot** — card, 1px border all round, a state dot before the role label and the
  select itself outlined in the state colour. No coloured side stripe anywhere in the
  system; state belongs to the control that holds it.
- **Query card** — same construction, a state dot (amber for a query, red for blocking),
  the row numbers it came from, the problem and its recovery, and where a credit exists to
  jump to, a "Find it on the page" action.
- **Credit** — a click target on the sheet. Hover tints, selection underlines in blue,
  an open query marks it with an amber wavy underline. Not red: red is the browser's
  spellcheck and this is a query, not a misspelling.
- **Segmented toggle** — the selected half carries the blue fill, white text, weight 640
  and a 1px inset ring, so the state survives even mid-transition.

Every interactive element has hover, focus-visible, disabled and, where it applies, a
selected state. The empty state teaches: before a log is loaded, the sheet shows the
formatting instructions' own worked example.

## Motion

Two moments, both meaning something.

1. **Ink settle** — 260ms blur-and-opacity on the credit body when the compilation changes,
   so you can see that your edit reached the page.
2. **Located** — a 900ms attention beat on a credit you were *sent to* from a query. It does
   not fire when you click a credit yourself; that is not somewhere you were sent.

Everything else is a 150ms state transition. `prefers-reduced-motion` disables both moments.

## Layout

Desktop: a fixed two-panel split, 27rem blotter rail and the desk taking the rest, each
scrolling independently. The sheet is `max-width: 46rem`, centred.

Below 900px the two scroll regions become one document, and **once a log is loaded the proof
leads the stack** — the desk takes 76dvh as its own scroll body with the status line above
the fold, and the rail follows one swipe below. Before a log is loaded the rail leads,
because uploading is the only thing there is to do. The bar is sticky so the style toggle
and Export stay reachable.

Below 760px the wordmark drops and the loaded filename keeps its own full-width row: which
component's log is open is the fact the researcher needs, and one log belongs to one
component. Button labels drop to icons there, each carrying `aria-label` and `title`, and
the `h1` keeps visually-hidden text.

## Browser surfaces

Themed rather than left to the browser: text selection (`#cfe0f4` on paper, `#33506f` in
the rail), focus rings (blue, brightened in the rail), scrollbars (`--desk-deep` on the
desk, `--blotter-3` in the rail), the select chevron, and `::placeholder` on both grounds.

## What this system refuses

Coloured side stripes on cards. Same-size icon-heading-text card grids. Kickers. Gradient
text. Glyphs standing in for icons — the eight in `src/App.tsx` are drawn on one 16px grid
at 1.5 stroke. Faked material of any kind. Modals: nothing in this product interrupts,
because the proof is what you are looking at.
