// Credit-page rules, from `Credit_Page_Formatting_Instructions.docx` and the
// Photo Credits section of `00 Media Research Guidelines.docx`.
// Pure functions only - no DOM, no React. Checked by credits.test.ts.

export const INTRO =
  'The authors and publishers would like to thank the following for permission to reproduce their images.';

export type Row = { n: number; cells: (string | number | null)[] };

export type Mapping = {
  library: number | null;
  credit: number | null;
  page: number | null;
  placement: number | null;
};

export type Query = {
  kind: 'library' | 'no-library' | 'placement' | 'page' | 'credit';
  value: string;
  note: string;
  rows: number[];
};

/**
 * Overrides are keyed by the lower-cased library name, except rows whose
 * library cell is empty: those are keyed by the credit holder, prefixed.
 */
export const byCreditKey = (name: string) => '@' + name.toLowerCase().trim();

export type Credit = {
  library: string;
  name: string;
  sortKey: string;
  /** page number -> position codes, in layout reading order */
  pages: Map<string, string[]>;
  rows: number[];
};

export type Group = { library: string; credits: Credit[] };

export type Compiled = { groups: Group[]; queries: Query[]; used: number; skipped: number };

/** Preferred suppliers plus the in-house library, as the guidelines name them. */
export const LIBRARY_ALIASES: Record<string, string> = {
  alamy: 'Alamy',
  'alamy stock photo': 'Alamy',
  getty: 'Getty Images',
  gettyimages: 'Getty Images',
  'getty images': 'Getty Images',
  istock: 'iStock',
  'istock by getty images': 'iStock',
  shutterstock: 'Shutterstock',
  'shutter stock': 'Shutterstock',
  wwa: 'Springer Nature Limited',
  mars: 'Springer Nature Limited',
  'springer nature': 'Springer Nature Limited',
  'springer nature limited': 'Springer Nature Limited',
};

/** Documented position codes. Anything else is passed through and queried. */
export const POSITION_CODES = [
  'tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br', 't', 'b', 'l', 'r',
];

// Reading order: top before middle before bottom, left before centre before right.
const BAND: Record<string, number> = { t: 0, m: 1, b: 2 };
const SIDE: Record<string, number> = { l: 0, c: 1, m: 1, r: 2 };

function positionRank(code: string): number {
  const band = BAND[code[0]];
  if (band === undefined) return 90 + (SIDE[code[0]] ?? 9);
  const side = SIDE[code[1] ?? code[0]];
  return band * 3 + (side ?? 1);
}

/** Strip tabs, non-breaking spaces and doubled spaces the log is full of. */
export function clean(v: unknown): string {
  return String(v ?? '')
    .replace(/[\t \r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function aliasKey(raw: string): string {
  return clean(raw).toLowerCase().replace(/[.,]+$/, '');
}

export function normaliseLibrary(raw: string, overrides: Record<string, string> = {}): string {
  const key = aliasKey(raw);
  return overrides[key] ?? LIBRARY_ALIASES[key] ?? clean(raw);
}

export function isKnownLibrary(raw: string, overrides: Record<string, string> = {}): boolean {
  const key = aliasKey(raw);
  return key in LIBRARY_ALIASES || key in overrides;
}

/** Page cells arrive as 5, "5", "5.0" or "p5". Keep the layout's own numbering. */
export function normalisePage(raw: unknown): string {
  const s = clean(raw).replace(/^pp?\.?\s*/i, '');
  return /^\d+(\.0+)?$/.test(s) ? String(parseInt(s, 10)) : s;
}

export function normalisePosition(raw: unknown): string {
  return clean(raw).toLowerCase().replace(/[()]/g, '');
}

/** Sort ignoring case, leading punctuation and a leading "the". */
export function sortKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/^the\s+/, '');
}

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

export function compile(
  rows: Row[],
  map: Mapping,
  overrides: Record<string, string> = {},
): Compiled {
  const byLibrary = new Map<string, Map<string, Credit>>();
  const queries = new Map<string, Query>();
  let used = 0;
  let skipped = 0;

  const query = (kind: Query['kind'], value: string, note: string, row: number) => {
    const id = kind + ':' + value;
    const q = queries.get(id) ?? { kind, value, note, rows: [] as number[] };
    if (q.rows.length < 200) q.rows.push(row);
    queries.set(id, q);
  };

  for (const row of rows) {
    const cell = (i: number | null) => (i === null ? '' : clean(row.cells[i]));
    let rawLibrary = cell(map.library);
    const name = cell(map.credit);
    if (!rawLibrary && !name) continue; // blank line in the log, not an omission

    // A credit with no library can still be compiled once one is assigned here.
    const assigned = !rawLibrary && name ? overrides[byCreditKey(name)] : undefined;
    if (assigned) rawLibrary = assigned;

    if (!rawLibrary || !name) {
      skipped++;
      query(
        rawLibrary ? 'credit' : 'no-library',
        rawLibrary || name,
        rawLibrary
          ? 'No credit holder — row not compiled'
          : 'The log has no library for this credit — assign one, or fill the cell in',
        row.n,
      );
      continue;
    }

    const library = normaliseLibrary(rawLibrary, overrides);
    if (!assigned && !isKnownLibrary(rawLibrary, overrides)) {
      query('library', rawLibrary, 'Unrecognised library — confirm the house spelling', row.n);
    }

    const page = map.page === null ? '' : normalisePage(row.cells[map.page]);
    if (!page) query('page', name, 'No page number — credit compiled without a reference', row.n);

    const position = map.placement === null ? '' : normalisePosition(row.cells[map.placement]);
    if (position && !POSITION_CODES.includes(position) && !/^[a-z]$|^\d+$/.test(position)) {
      query('placement', position, 'Not a documented position code — check against the layout', row.n);
    }

    const credits = byLibrary.get(library) ?? new Map<string, Credit>();
    byLibrary.set(library, credits);
    const id = name.toLowerCase();
    const credit: Credit =
      credits.get(id) ??
      { library, name, sortKey: sortKey(name), pages: new Map<string, string[]>(), rows: [] };
    credits.set(id, credit);
    credit.rows.push(row.n);
    if (page) {
      const positions = credit.pages.get(page) ?? [];
      if (position && !positions.includes(position)) positions.push(position);
      credit.pages.set(page, positions);
    }
    used++;
  }

  const groups: Group[] = [...byLibrary.entries()]
    .map(([library, credits]) => ({
      library,
      credits: [...credits.values()]
        .map((c) => {
          for (const [page, positions] of c.pages)
            c.pages.set(page, positions.sort((a, b) => positionRank(a) - positionRank(b)));
          c.pages = new Map([...c.pages.entries()].sort((a, b) => collator.compare(a[0], b[0])));
          return c;
        })
        .sort((a, b) => collator.compare(a.sortKey, b.sortKey)),
    }))
    .sort((a, b) => collator.compare(a.library, b.library));

  return { groups, queries: [...queries.values()], used, skipped };
}

/**
 * "p7(a)" - "p45(tl,br)" - "pp10, 11(tr)" when every page shares one position set
 * - "pp15(tl), 71(br)" otherwise. `space` inserts the sample PDF's "p. 7".
 */
export function reference(credit: Credit, space = false): string {
  const entries = [...credit.pages.entries()];
  if (entries.length === 0) return '';
  const p = space ? 'p. ' : 'p';
  const pp = space ? 'pp. ' : 'pp';
  const paren = (positions: string[]) => (positions.length ? '(' + positions.join(',') + ')' : '');

  if (entries.length === 1) return p + entries[0][0] + paren(entries[0][1]);

  const first = entries[0][1].join(',');
  if (entries.every(([, positions]) => positions.join(',') === first))
    return pp + entries.map(([page]) => page).join(', ') + paren(entries[0][1]);
  return pp + entries.map(([page, positions]) => page + paren(positions)).join(', ');
}

export type Style = 'guidelines' | 'sample';

/** One credit as it appears on the page, minus the library prefix. */
export function creditText(credit: Credit, style: Style): string {
  const ref = reference(credit, style === 'sample');
  return ref ? credit.name + ' ' + ref : credit.name;
}

/** Plain-text credit page, used for the clipboard and by the .docx builder. */
export function toText(groups: Group[], style: Style): string {
  if (style === 'sample')
    return groups
      .map((g) => g.library + '\n' + g.credits.map((c) => creditText(c, 'sample')).join(', '))
      .join('\n\n');

  return groups
    .map(
      (g, i) =>
        g.credits.map((c) => g.library + '/' + creditText(c, 'guidelines')).join(', ') +
        (i === groups.length - 1 ? '.' : ';'),
    )
    .join(' ');
}

// ---------------------------------------------------------------------------
// Column mapping

/**
 * Header patterns per role, most specific first. Specificity matters on a real
 * log: "Source Doc" and "Artist Agency" both look like a library column until
 * "Photo - Image Source" is on the sheet, and "Book Page" is the layout page
 * while "Page Number" is the researcher's own note.
 */
const ROLE_WORDS: Record<keyof Mapping, RegExp[]> = {
  library: [
    /(image|photo|picture)\s*-?\s*(source|librar|agenc)/i,
    /\b(librar)/i,
    /\bstock\s*(photo|agenc|librar)/i,
    /\b(supplier|provider)\b/i,
    /\bagenc/i,
    /\bsource\b/i,
  ],
  credit: [/\bcredit/i, /\bcopyright/i, /\b(contributor|photographer|rights holder)/i],
  page: [/\bbook\s*page\b/i, /\bpage\b/i, /\b(folio|pg)\b/i],
  placement: [/\bplacement/i, /\bposition/i, /\blocation\b/i, /\bpos\b/i],
};

/** Guess the mapping from header text. */
export function autoMap(headers: string[]): Mapping {
  const map: Mapping = { library: null, credit: null, page: null, placement: null };
  for (const role of Object.keys(map) as (keyof Mapping)[]) {
    for (const pattern of ROLE_WORDS[role]) {
      const taken = Object.values(map);
      const hit = headers.findIndex((h, i) => pattern.test(h) && !taken.includes(i));
      if (hit >= 0) {
        map[role] = hit;
        break;
      }
    }
  }
  return map;
}

export function columnLetter(i: number): string {
  let s = '';
  for (let n = i; n >= 0; n = Math.floor(n / 26) - 1) s = String.fromCharCode(65 + (n % 26)) + s;
  return s;
}

export function columnIndex(letter: string): number {
  return [...letter.toUpperCase()].reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
}

const PROMPT_ROLES: [keyof Mapping, RegExp][] = [
  ['library', /\b(?:librar\w*|agenc\w*|sources?|suppliers?|image source)\b/i],
  ['credit', /\b(?:credits?|copyright\w*|contributors?|photographers?)\b/i],
  ['page', /\b(?:page\s*numbers?|pages?|folio)\b/i],
  ['placement', /\b(?:placements?|positions?|location)\b/i],
];

/**
 * Read a sentence like "column X has the library, credits in Y, page F and
 * placement V". The sentence is split into clauses; a clause naming one role
 * and one column letter maps that role, in either order. A clause with no
 * letter falls back to a header whose name it mentions.
 */
export function mapFromPrompt(prompt: string, headers: string[], base: Mapping): Mapping {
  const map = { ...base };
  const clauses = prompt.split(/[,;.\n]|\band\b|\bthen\b/i).filter((c) => c.trim());

  for (const clause of clauses) {
    const role = PROMPT_ROLES.find(([, word]) => word.test(clause))?.[0];
    if (!role) continue;

    // "column X" / "col. x" wins; otherwise a bare capital letter token.
    const letter =
      clause.match(/\bcol(?:umn)?s?\.?\s*([A-Za-z]{1,2})\b/i)?.[1] ??
      clause.match(/(?:^|\s)([A-Z]{1,2})(?=\s|$|[^\w-])/)?.[1];
    if (letter) {
      const i = columnIndex(letter);
      if (i >= 0 && i < headers.length) {
        map[role] = i;
        continue;
      }
    }
    const named = headers.findIndex(
      (h) => h.trim().length > 2 && clause.toLowerCase().includes(h.trim().toLowerCase()),
    );
    if (named >= 0) map[role] = named;
  }
  return map;
}
