import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  INTRO, autoMap, byCreditKey, clean, columnLetter, compile, creditText, mapFromPrompt,
  type Credit, type Mapping, type Query, type Row, type Style,
} from './credits.ts';
import { columnCount, findHeaderRow, headerLabels, readWorkbook, samples, type Book, type Cell } from './sheet.ts';
import { downloadDocx } from './docx.ts';

const EMPTY_MAP: Mapping = { library: null, credit: null, page: null, placement: null };

const ROLES: { key: keyof Mapping; label: string; need: string; required: boolean }[] = [
  { key: 'library', label: 'Library', need: 'Alamy, Getty Images…', required: true },
  { key: 'credit', label: 'Credit holder', need: 'the name as supplied', required: true },
  { key: 'page', label: 'Page', need: 'becomes p7 / pp10, 11', required: false },
  { key: 'placement', label: 'Placement', need: 'becomes (tr), (bl)…', required: false },
];

/**
 * Identity hues for the library swatches. Deliberately clear of the proof-mark
 * colours: a red or amber dot beside a library would read as a problem with it.
 */
const CHIPS = ['#2f5d8c', '#6b4e9b', '#166a6a', '#8c4a70', '#4a5f2f', '#8a5a2b', '#3a4a7a'];

// ── icons: one 16px grid, 1.5 stroke ────────────────────────────────────────
type IconName =
  | 'mark' | 'sheet' | 'upload' | 'download' | 'copy' | 'flag' | 'back' | 'check' | 'find';

const PATHS: Record<IconName, string> = {
  mark: 'M2.5 8.5 6 12 13.5 3.5',
  sheet: 'M3 2.5h10v11H3zM3 6h10M6.5 6v7.5',
  upload: 'M8 11V2.5M4.5 6 8 2.5 11.5 6M2.5 11v2.5h11V11',
  download: 'M8 2.5V11M4.5 7.5 8 11l3.5-3.5M2.5 11v2.5h11V11',
  copy: 'M5.5 5.5h8v8h-8zM10.5 5.5v-3h-8v8h3',
  flag: 'M4 14V2.5h8l-2 2.75L12 8H4',
  back: 'M9.5 3.5 5 8l4.5 4.5',
  check: 'M3 8.5 6.5 12 13 4',
  find: 'M7 12.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM11 11l3.5 3.5',
};

function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

// ── the worked example from the formatting instructions, for the empty state ─
const EXAMPLE: { library: string; credits: string[] }[] = [
  { library: 'Alamy', credits: ['Adam Brown p7(a)', 'Carl Pike p10(tr)', 'John Smith p11'] },
  { library: 'Getty Images', credits: ['Sarah Green p20(bl)', 'Anne White p32(dog)'] },
  { library: 'Shutterstock', credits: ['wavebreakmedia p40(br)'] },
];

export default function App() {
  const [book, setBook] = useState<Book | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [headerRow, setHeaderRow] = useState(0);
  const [map, setMap] = useState<Mapping>(EMPTY_MAP);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [style, setStyle] = useState<Style>('guidelines');
  const [title, setTitle] = useState('Photo credits');
  const [prompt, setPrompt] = useState('');
  const [promptNote, setPromptNote] = useState('');
  const [traced, setTraced] = useState<{ name: string; library: string; rows: number[] } | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const rows: Cell[][] = useMemo(
    () => (book && sheetName ? book.sheets[sheetName] ?? [] : []),
    [book, sheetName],
  );

  const headers = useMemo(() => {
    const labels = headerLabels(rows[headerRow] ?? []);
    const n = columnCount(rows, headerRow);
    return Array.from({ length: n }, (_, i) => labels[i] ?? '');
  }, [rows, headerRow]);

  const dataRows: Row[] = useMemo(
    () =>
      rows
        .slice(headerRow + 1)
        .map((cells, i) => ({ n: headerRow + i + 2, cells: cells ?? [] })),
    [rows, headerRow],
  );

  const compiled = useMemo(
    () => compile(dataRows, map, overrides),
    [dataRows, map, overrides],
  );

  const chips = useMemo(() => {
    const m = new Map<string, string>();
    compiled.groups.forEach((g, i) => m.set(g.library, CHIPS[i % CHIPS.length]));
    return m;
  }, [compiled.groups]);

  /** Row numbers carrying an open query, so the page can mark them. */
  const flaggedRows = useMemo(() => {
    const s = new Set<number>();
    for (const q of compiled.queries) for (const n of q.rows) s.add(n);
    return s;
  }, [compiled.queries]);

  /**
   * Log row -> the credit it ended up in, and that credit's element id. Six
   * amber marks in 271 credits are unfindable by scrolling; a query has to be
   * able to take you to the credit it is about.
   */
  const creditAt = useMemo(() => {
    const m = new Map<number, { id: string; credit: Credit }>();
    let i = 0;
    for (const group of compiled.groups)
      for (const credit of group.credits) {
        const id = 'cr' + i++;
        for (const n of credit.rows) m.set(n, { id, credit });
      }
    return m;
  }, [compiled.groups]);

  const creditId = useMemo(() => {
    const m = new Map<Credit, string>();
    for (const { id, credit } of creditAt.values()) m.set(credit, id);
    return m;
  }, [creditAt]);

  const locate = (query: Query) => {
    const hit = query.rows.map((n) => creditAt.get(n)).find(Boolean);
    if (!hit) return;
    traceCredit(hit.credit);
    const el = document.getElementById(hit.id);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add('located');
    el.addEventListener('animationend', () => el.classList.remove('located'), { once: true });
  };

  const ready = map.library !== null && map.credit !== null && compiled.groups.length > 0;

  // ── loading ───────────────────────────────────────────────────────────────
  const load = useCallback(async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const next = await readWorkbook(file);
      if (next.sheetNames.length === 0) throw new Error('That workbook has no readable sheets.');
      // Open on the sheet that yields the most complete mapping.
      let bestSheet = next.sheetNames[0];
      let bestRow = 0;
      let bestScore = -1;
      for (const name of next.sheetNames) {
        const sheetRows = next.sheets[name];
        const hr = findHeaderRow(sheetRows);
        const score = Object.values(autoMap(headerLabels(sheetRows[hr] ?? []))).filter(
          (v) => v !== null,
        ).length;
        if (score > bestScore) {
          bestScore = score;
          bestSheet = name;
          bestRow = hr;
        }
      }
      setBook(next);
      setSheetName(bestSheet);
      setHeaderRow(bestRow);
      setMap(autoMap(headerLabels(next.sheets[bestSheet][bestRow] ?? [])));
      setOverrides({});
      setTraced(null);
      setPromptNote('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That file could not be read.');
      setBook(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const pickSheet = (name: string) => {
    if (!book) return;
    const hr = findHeaderRow(book.sheets[name]);
    setSheetName(name);
    setHeaderRow(hr);
    setMap(autoMap(headerLabels(book.sheets[name][hr] ?? [])));
    setTraced(null);
  };

  const moveHeaderRow = (n: number) => {
    setHeaderRow(n);
    setMap(autoMap(headerLabels(rows[n] ?? [])));
    setTraced(null);
  };

  const applyPrompt = () => {
    if (!prompt.trim() || headers.length === 0) return;
    const next = mapFromPrompt(prompt, headers, map);
    const changed = (Object.keys(next) as (keyof Mapping)[]).filter((k) => next[k] !== map[k]);
    setMap(next);
    setPromptNote(
      changed.length
        ? 'Set ' +
            changed
              .map((k) => k + ' → ' + (next[k] === null ? 'none' : columnLetter(next[k]!)))
              .join(', ')
        : 'Nothing recognised. Name a role and a column letter, or pick the columns above.',
    );
  };

  // whole-window drop
  useEffect(() => {
    const over = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      e.preventDefault();
      setDragging(true);
    };
    const leave = (e: DragEvent) => {
      if (e.relatedTarget === null) setDragging(false);
    };
    const drop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) void load(file);
    };
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  }, [load]);

  const plainText = useMemo(() => {
    if (!ready) return '';
    const groups = compiled.groups;
    return (
      INTRO +
      '\n\n' +
      (style === 'sample'
        ? groups
            .map((g) => g.library + '\n' + g.credits.map((c) => creditText(c, 'sample')).join(', '))
            .join('\n\n')
        : groups
            .map(
              (g, i) =>
                g.credits.map((c) => g.library + '/' + creditText(c, 'guidelines')).join(', ') +
                (i === groups.length - 1 ? '.' : ';'),
            )
            .join(' '))
    );
  }, [compiled.groups, ready, style]);

  const exportDocx = async () => {
    await downloadDocx(
      compiled.groups,
      style,
      title.trim() || 'Photo credits',
      (title.trim() || 'Photo credits').replace(/[\\/:*?"<>|]/g, '-') + '.docx',
    );
  };

  const traceCredit = (credit: Credit) =>
    setTraced({ name: credit.name, library: credit.library, rows: credit.rows });

  return (
    <div className="app">
      <header className="bar">
        <h1>
          <Icon name="mark" size={17} />
          <span>Credits Compiler</span>
          <span className="sr-only">Credits Compiler</span>
        </h1>
        {book && (
          <div className="file">
            <Icon name="sheet" size={14} />
            <b title={book.name}>{book.name}</b>
            <span>· {sheetName}</span>
          </div>
        )}
        <div className="spacer" />
        <div className="segment" role="group" aria-label="Credit page style">
          <button
            type="button"
            aria-pressed={style === 'guidelines'}
            onClick={() => setStyle('guidelines')}
            title="One continuous list, library repeated before every credit, p7(a)"
          >
            Guidelines
          </button>
          <button
            type="button"
            aria-pressed={style === 'sample'}
            onClick={() => setStyle('sample')}
            title="Library as a heading, credits beneath, p. 7(a)"
          >
            Sample PDF
          </button>
        </div>
        <button
          type="button"
          className="btn ghost"
          disabled={!ready}
          aria-label="Copy the credit page as text"
          title="Copy the credit page as text"
          onClick={() => void navigator.clipboard.writeText(plainText)}
        >
          <Icon name="copy" size={15} />
          <span>Copy</span>
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={!ready}
          aria-label="Export the credit page as a .docx file"
          title="Export the credit page as a .docx file"
          onClick={() => void exportDocx()}
        >
          <Icon name="download" size={15} />
          <span>Export .docx</span>
        </button>
      </header>

      <div className={'main' + (ready ? ' loaded' : '')}>
        <aside className="blotter scroll">
          <section>
            <h2>Photo log</h2>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xlsm,.xls,.csv,.tsv"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void load(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className={'drop' + (dragging ? ' over' : '')}
              onClick={() => fileInput.current?.click()}
            >
              <Icon name="upload" size={19} />
              <strong>{busy ? 'Reading…' : book ? 'Replace the workbook' : 'Choose the photo log'}</strong>
              <span>{dragging ? 'Drop it anywhere' : 'or drop an .xlsx, .xls or .csv here'}</span>
            </button>

            {book && (
              <div className="row2" style={{ marginTop: 14 }}>
                <label className="field" style={{ margin: 0 }}>
                  <span>Sheet</span>
                  <select
                    className="control"
                    value={sheetName}
                    onChange={(e) => pickSheet(e.target.value)}
                  >
                    {book.sheetNames.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field" style={{ margin: 0 }}>
                  <span>Header row</span>
                  <input
                    className="control"
                    type="number"
                    min={1}
                    max={Math.max(rows.length, 1)}
                    value={headerRow + 1}
                    onChange={(e) => moveHeaderRow(Math.max(0, Number(e.target.value) - 1))}
                  />
                </label>
              </div>
            )}
          </section>

          {book && (
            <>
              <section>
                <h2>Columns</h2>
                <div className="slots">
                  {ROLES.map((role) => {
                    const value = map[role.key];
                    const state = value !== null ? 'set' : role.required ? 'missing' : 'empty';
                    return (
                      <div
                        key={role.key}
                        className={
                          'slot ' + state + (role.required ? '' : ' optional')
                        }
                      >
                        <div className="slot-head">
                          <b>{role.label}</b>
                          <em>{value !== null ? 'column ' + columnLetter(value) : role.need}</em>
                        </div>
                        <select
                          className="control"
                          value={value ?? ''}
                          aria-label={role.label + ' column'}
                          onChange={(e) => {
                            setMap({
                              ...map,
                              [role.key]: e.target.value === '' ? null : Number(e.target.value),
                            });
                            setTraced(null);
                          }}
                        >
                          <option value="">
                            {role.required ? 'Not mapped — required' : 'Not mapped'}
                          </option>
                          {headers.map((h, i) => (
                            <option key={i} value={i}>
                              {columnLetter(i)} · {h || '(no header)'}
                            </option>
                          ))}
                        </select>
                        <ul className="samples">
                          {value === null ? (
                            <li className="none">no values</li>
                          ) : (
                            (samples(rows, headerRow, value).length
                              ? samples(rows, headerRow, value)
                              : ['(column is empty)']
                            ).map((s, i) => (
                              <li key={i} title={s}>
                                {s}
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <h2>Or describe them</h2>
                <div className="prompt">
                  <textarea
                    className="control"
                    value={prompt}
                    placeholder="Column X has the library, column Y the credits, F is the page number and V the placement."
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) applyPrompt();
                    }}
                  />
                  <button type="button" className="btn ghost" onClick={applyPrompt} disabled={!prompt.trim()}>
                    Apply
                  </button>
                </div>
                <p className="hint">{promptNote || 'Name each role and its column letter, or the header text. Ctrl/⌘ + Enter applies.'}</p>
              </section>

              {traced && (
                <section>
                  <div className="trace-head">
                    <button type="button" className="btn quiet" onClick={() => setTraced(null)} aria-label="Close trace">
                      <Icon name="back" size={14} />
                    </button>
                    <span className="name">{traced.name}</span>
                  </div>
                  <p className="hint" style={{ margin: '0 0 10px' }}>
                    {traced.library} · {traced.rows.length} log{' '}
                    {traced.rows.length === 1 ? 'row' : 'rows'}
                  </p>
                  <ul className="trace">
                    {traced.rows.slice(0, 40).map((n) => (
                      <li key={n}>
                        <span className="n">Row {n}</span>
                        <span className="cells">
                          {ROLES.filter((r) => map[r.key] !== null).map((r) => (
                            <span key={r.key}>
                              <i>{columnLetter(map[r.key]!)}</i>{' '}
                              {clean(rows[n - 1]?.[map[r.key]!]) || '—'}
                            </span>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <h2>
                  Queries
                  {compiled.queries.length > 0 && <span className="count">{compiled.queries.length}</span>}
                </h2>
                {compiled.queries.length === 0 ? (
                  <div className="clean">
                    <Icon name="check" size={15} />
                    Nothing to query — every row compiled.
                  </div>
                ) : (
                  <ul className="queries">
                    {compiled.queries.map((q) => (
                      <QueryItem
                        key={q.kind + q.value}
                        query={q}
                        onLocate={() => locate(q)}
                        onResolve={(to) =>
                          setOverrides({
                            ...overrides,
                            [q.kind === 'no-library'
                              ? byCreditKey(q.value)
                              : q.value.toLowerCase().trim()]: to,
                          })
                        }
                      />
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </aside>

        <main className="desk scroll">
          {error && <p className="err">{error}</p>}

          {ready && (
            <div className="tally">
              <span>
                <b>{compiled.groups.reduce((n, g) => n + g.credits.length, 0)}</b> credits
              </span>
              <span>
                <b>{compiled.groups.length}</b> libraries
              </span>
              <span>
                <b>{compiled.used}</b> log rows used
              </span>
              {compiled.skipped > 0 && (
                <span>
                  <span className="dot" style={{ background: 'var(--red)' }} />
                  <b>{compiled.skipped}</b> skipped
                </span>
              )}
            </div>
          )}

          <article className="sheet">
            <input
              className="sheet-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Credit page title"
              spellCheck={false}
            />
            <p className="sub">
              {ready
                ? (book ? book.name + ' · ' : '') +
                  (style === 'guidelines'
                    ? 'one continuous list · library repeated before every credit · bold on first occurrence'
                    : 'grouped under library headings, as in the sample credit page')
                : 'Example format — drop the photo log to replace it'}
            </p>
            <p className="intro">{INTRO}</p>

            {ready ? (
              <div
                className="credits-body settle"
                key={style + '-' + compiled.used + '-' + compiled.groups.length}
              >
                {style === 'guidelines' ? (
                    <p style={{ margin: 0 }}>
                      {compiled.groups.map((group, gi) => (
                        <span key={group.library}>
                          {group.credits.map((credit, ci) => (
                            <span key={credit.name}>
                              {ci > 0 && ', '}
                              <span
                                className={'lib' + (ci === 0 ? ' swatch' : '')}
                                style={
                                  ci === 0
                                    ? ({ '--chip': chips.get(group.library) } as React.CSSProperties)
                                    : undefined
                                }
                              >
                                {ci === 0 ? <b>{group.library}</b> : group.library}
                              </span>
                              /
                              <span
                                id={creditId.get(credit)}
                                className={
                                  'credit' +
                                  (credit.rows.some((n) => flaggedRows.has(n)) ? ' flagged' : '') +
                                  (traced?.name === credit.name && traced.library === credit.library
                                    ? ' on'
                                    : '')
                                }
                                role="button"
                                tabIndex={0}
                                title="Show the log rows behind this credit"
                                onClick={() => traceCredit(credit)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    traceCredit(credit);
                                  }
                                }}
                              >
                                {creditText(credit, 'guidelines')}
                              </span>
                            </span>
                          ))}
                          {gi === compiled.groups.length - 1 ? '.' : '; '}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <div>
                      {compiled.groups.map((group) => (
                        <div className="group" key={group.library}>
                          <span
                            className="lib swatch"
                            style={{ '--chip': chips.get(group.library) } as React.CSSProperties}
                          >
                            {group.library}
                          </span>
                          <p style={{ margin: 0 }}>
                            {group.credits.map((credit, ci) => (
                              <span key={credit.name}>
                                {ci > 0 && ', '}
                                <span
                                  id={creditId.get(credit)}
                                  className={
                                    'credit' +
                                    (credit.rows.some((n) => flaggedRows.has(n)) ? ' flagged' : '') +
                                    (traced?.name === credit.name && traced.library === credit.library
                                      ? ' on'
                                      : '')
                                  }
                                  role="button"
                                  tabIndex={0}
                                  title="Show the log rows behind this credit"
                                  onClick={() => traceCredit(credit)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      traceCredit(credit);
                                    }
                                  }}
                                >
                                  {creditText(credit, 'sample')}
                                </span>
                              </span>
                            ))}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            ) : (
              <div className="credits-body example">
                {EXAMPLE.map((g, i) => (
                  <span key={g.library}>
                    {g.credits.map((c, ci) => (
                      <span key={c}>
                        {ci > 0 && ', '}
                        {ci === 0 ? <b>{g.library}</b> : g.library}/{c}
                      </span>
                    ))}
                    {i === EXAMPLE.length - 1 ? '.' : '; '}
                  </span>
                ))}
              </div>
            )}

            {ready && (
              <div className="sheet-foot">
                <span>
                  <b>Source</b> {book?.name} · {sheetName} · header row {headerRow + 1}
                </span>
                <span>
                  <b>Order</b> library A–Z, then credit holder A–Z
                </span>
              </div>
            )}
          </article>

          {!book && (
            <p className="empty-note">
              Nothing is uploaded anywhere — the workbook is read in this window and the .docx is
              built here too.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}

function QueryItem({
  query,
  onResolve,
  onLocate,
}: {
  query: Query;
  onResolve: (to: string) => void;
  onLocate: () => void;
}) {
  const [value, setValue] = useState('');
  const fixable = query.kind === 'library' || query.kind === 'no-library';
  const blocking = query.kind === 'no-library' || query.kind === 'credit';
  const shown = query.rows.slice(0, 6).join(', ');
  return (
    <li className={'query' + (blocking ? ' blocking' : '')}>
      <div className="query-head">
        <b>{query.value || '(blank)'}</b>
        <span className="rows">
          row{query.rows.length === 1 ? '' : 's'} {shown}
          {query.rows.length > 6 && ' +' + (query.rows.length - 6)}
        </span>
      </div>
      <p>{query.note}</p>
      {query.kind !== 'no-library' && query.kind !== 'credit' && (
        <button type="button" className="btn quiet find" onClick={onLocate}>
          <Icon name="find" size={13} />
          Find it on the page
        </button>
      )}
      {fixable && query.value && (
        <div className="fix">
          <input
            className="control"
            placeholder={query.kind === 'library' ? 'House name for this library' : 'Library for this credit'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value.trim()) onResolve(value.trim());
            }}
          />
          <button
            type="button"
            className="btn ghost"
            disabled={!value.trim()}
            onClick={() => onResolve(value.trim())}
          >
            Set
          </button>
        </div>
      )}
    </li>
  );
}
