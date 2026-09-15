# Credit formatting rules

Every rule the app applies, where it comes from, and what the app does when the data does
not fit. The rules live in [`src/credits.ts`](../src/credits.ts) and are checked by
[`src/credits.test.ts`](../src/credits.test.ts).

Sources:

- **MRG** — `00 Media Research Guidelines.docx`, Photo Credits
- **CPFI** — `Credit_Page_Formatting_Instructions.docx`
- **PDF** — `Creditos RAU_SB3-MLLP-Final.pdf`

## Opening sentence

Every credit page starts with:

> The authors and publishers would like to thank the following for permission to reproduce
> their images.

Source: CPFI §1, MRG. It cannot be switched off.

## The two styles

The sources disagree on layout, so the app offers both.

| | Guidelines (default) | Sample PDF |
| --- | --- | --- |
| Source | CPFI §2, MRG | PDF |
| Structure | one continuous list | a heading per library, credits beneath |
| Library name | before every credit | once, as the heading |
| Bold | first occurrence of each library only | the heading |
| Separator | `/` between library and name | none |
| Page reference | `p7(a)` — no space | `p. 7(a)` — a space |
| Between libraries | `;` | a new paragraph |
| End | `.` | nothing |

Guidelines style, in full:

```
**Alamy**/Adam Brown p7(a), Alamy/Carl Pike p10(tr), Alamy/John Smith p11;
**Getty Images**/Anne White p32(dog), Getty Images/Sarah Green p20(bl);
**Shutterstock**/wavebreakmedia p40(br).
```

CPFI's own example lists *Sarah Green* before *Anne White*. That is not alphabetical, and
CPFI §3 requires alphabetical order, so the app puts *Anne White* first.

## Order

1. **Libraries** A–Z. (CPFI §3, MRG.)
2. **Credit holders** A–Z within each library, by the name as written in the photo log.
   (CPFI §3: "using the credit name supplied in the photo log".)

Sorting ignores:

- capitals — `aquariagirl1970` comes before `Janice Adlam`;
- leading punctuation — `©2024 David Gregg` sorts as `2024 David Gregg`;
- a leading *The*.

Numbers sort by value, so `photonic 9` comes before `photonic 15`.

MRG also says "arranged by surname". The log gives one name field that holds agencies,
handles and full names alike (`FatCamera`, `Westend61 GmbH`, `Adam Gault`), so there is no
reliable surname to sort by. The app follows CPFI and sorts by the name as supplied.

## Library names

Library cells are cleaned up, and known spellings are mapped to one house name, so one
library never splits into two groups.

| In the log (any capitals, spaces trimmed) | On the page |
| --- | --- |
| `alamy`, `alamy stock photo` | Alamy |
| `getty`, `gettyimages`, `getty images` | Getty Images |
| `istock`, `istock by getty images` | iStock |
| `shutterstock`, `shutter stock` | Shutterstock |
| `mars`, `wwa`, `springer nature`, `springer nature limited` | Springer Nature Limited |

WB5 contains `Getty`, `Getty ` (with a trailing space), `Shutter Stock` and `Shutterstock`.
Those become two groups, Getty Images and Shutterstock.

The last row follows MRG: images from the Macmillan library MARS are credited to
*Springer Nature Limited*, then the photographer.

**Any other library** is used exactly as written, and raises an *Unrecognised library*
query. It is never silently renamed.

## Page references

Source: CPFI §4, MRG.

| Case | Guidelines | Sample PDF |
| --- | --- | --- |
| One page | `p7` | `p. 7` |
| One page, one position | `p7(a)` | `p. 7(a)` |
| One page, several positions | `p45(tl,br)` | `p. 45(tl,br)` |
| Several pages, same position(s) | `pp10, 11(tr)` | `pp. 10, 11(tr)` |
| Several pages, different positions | `pp15(tl), 71(br)` | `pp. 15(tl), 71(br)` |
| No page | name only, and a query | name only, and a query |

- `p` is always lowercase; `pp` when a credit covers more than one page.
- Positions sit straight after the page number, in brackets, with no space.
- A credit that appears on several rows is written **once**, with all its pages and
  positions combined. `Cali6ro` appears on 29 WB5 rows and becomes one credit:
  `Shutterstock/Cali6ro pp5(ml), 18(r), 47(tl,ml), 56, 83(tl,tr,ml,mc,mr)`.
- Pages are listed in numeric order.
- Page cells are cleaned: `5`, `"5"`, `5.0` and `p5` all become `5`. Anything that is not a
  plain number, such as `iv`, is kept as written. Leading zeros are not added.

## Position codes

Source: CPFI §5.

The code in brackets says where the image sits on the **final page**. It comes only from the
Placement column. The app never creates a code from the order of rows in the log.

Codes are lowercased and any brackets typed in the cell are removed, so `TL` and `(tl)`
both become `tl`.

Several codes on one page are written in reading order: top to bottom, then left to right.

```
tl  tc  tr
ml  mc  mr
bl  bc  br
```

`t` sorts with the top row and `b` with the bottom row. `l` and `r` come after the grid,
then letters, numbers and descriptions. `BR, TL` becomes `(tl,br)`; `r, b, tl, mc`
becomes `(tl,mc,b,r)`.

What happens to each kind of code:

| Code | Example | Result |
| --- | --- | --- |
| Documented code | `tl`, `mc`, `r` | used |
| A single letter | `a`, `b` | used — for layouts that label images a, b, c |
| A number | `1`, `2` | used |
| Anything else | `bg`, `lb`, `dog` | used as written, **and** raises a query |

Descriptions such as `(dog)` are allowed by CPFI §6, so they stay on the page. They still
raise a query, because the app cannot tell an approved description from a typo like `lb`.

## Cleaning names

Names are copied as written, apart from spacing. Tabs, line breaks and non-breaking spaces
become single spaces, and space at either end is trimmed. WB5 row 34 holds `\tFatCamera` and
compiles as `FatCamera`.

Nothing else is changed: capitals, spelling and punctuation are exactly as in the log.

## Rows that are skipped

| Row | Result |
| --- | --- |
| Library and credit holder both empty | ignored — a blank row |
| Credit holder but no library | skipped, *no library* query |
| Library but no credit holder | skipped, *no credit holder* query |

A credit holder with no library can be given one in the Queries panel, and then compiles.
See the [user guide](user-guide.md#4-work-through-the-queries).

## The `.docx` file

- Times New Roman throughout.
- Title 14pt bold, then the opening sentence and credits at 11pt.
- Guidelines style is one paragraph. Bold is applied to the first mention of each library
  only.
- Sample PDF style is a bold 11pt heading paragraph per library, with its credits in the
  paragraph below.

## Not handled

These appear in the guidelines but are outside what the app produces. Add them by hand.

- **Collections.** MRG orders credits "library/agent, then the collection, then the
  copyright holder". The log has no collection column, so nothing is inserted between
  library and name.
- **DACS copyright lines** for artwork (MRG, Clearing Artwork).
- **Digital-product rolling credits** — the library-only list for digital components.
- **Checking positions and page numbers against the layout.** The app can only confirm that
  a code was supplied and whether it is a documented one.
