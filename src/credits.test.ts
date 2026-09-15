// Run with `npm test`. Fails loudly if a house rule breaks.
import assert from 'node:assert/strict';
import {
  autoMap, byCreditKey, columnIndex, columnLetter, compile, mapFromPrompt, normalisePage,
  normalisePosition, toText, type Mapping, type Row,
} from './credits.ts';

const HEADERS = [
  'Status', 'Source Doc', 'ID/Spec', 'Brief Type', 'Class/Request type', 'Book Page',
  'Description/Brief', 'Actions for Print', 'Use', 'Complexity', 'Reference Supplied',
  'B&W /colour', 'Size', 'Artist name', 'Artist Agency', 'Fee', 'Final Fee', 'Use',
  'orientation', 'Risk', 'PHOTO ID', 'Placement', 'MARS ID', 'Photo - Image Source',
  'Credits', 'Page Number',
];
// F=5 Book Page, V=21 Placement, X=23 Image Source, Y=24 Credits
const MAP: Mapping = { library: 23, credit: 24, page: 5, placement: 21 };

const row = (n: number, page: unknown, placement: string, source: string, credit: string): Row => {
  const cells = new Array(26).fill(null);
  cells[5] = page as never;
  cells[21] = placement as never;
  cells[23] = source as never;
  cells[24] = credit as never;
  return { n, cells };
};

// --- column helpers ---------------------------------------------------------
assert.equal(columnLetter(0), 'A');
assert.equal(columnLetter(5), 'F');
assert.equal(columnLetter(23), 'X');
assert.equal(columnLetter(26), 'AA');
assert.equal(columnIndex('F'), 5);
assert.equal(columnIndex('AA'), 26);

// --- normalisation ----------------------------------------------------------
assert.equal(normalisePage(5), '5');
assert.equal(normalisePage('5.0'), '5');
assert.equal(normalisePage('p7'), '7');
assert.equal(normalisePage('  '), '');
assert.equal(normalisePosition(' TL '), 'tl');
assert.equal(normalisePosition('(br)'), 'br');

// --- the guidelines' own worked example -------------------------------------
// Guidelines: Alamy/Adam Brown p7(a), Alamy/Carl Pike p10(tr), Alamy/John Smith p11;
//             Getty Images/Sarah Green p20(bl), Getty Images/Anne White p32(dog);
//             Shutterstock/wavebreakmedia p40(br).
{
  const rows = [
    row(2, 40, 'br', 'Shutterstock', 'wavebreakmedia'),
    row(3, 10, 'tr', 'Alamy', 'Carl Pike'),
    row(4, 32, 'dog', 'Getty', 'Anne White'),
    row(5, 7, 'a', 'Alamy', 'Adam Brown'),
    row(6, 11, '', 'Alamy', 'John Smith'),
    row(7, 20, 'bl', 'Getty ', 'Sarah Green'),
  ];
  const { groups, used, skipped } = compile(rows, MAP);
  assert.equal(used, 6);
  assert.equal(skipped, 0);
  assert.equal(
    toText(groups, 'guidelines'),
    'Alamy/Adam Brown p7(a), Alamy/Carl Pike p10(tr), Alamy/John Smith p11; ' +
      'Getty Images/Anne White p32(dog), Getty Images/Sarah Green p20(bl); ' +
      'Shutterstock/wavebreakmedia p40(br).',
  );
  // "Getty" and "Getty " must not become two groups.
  assert.deepEqual(groups.map((g) => g.library), ['Alamy', 'Getty Images', 'Shutterstock']);
  assert.equal(
    toText(groups, 'sample'),
    'Alamy\nAdam Brown p. 7(a), Carl Pike p. 10(tr), John Smith p. 11\n\n' +
      'Getty Images\nAnne White p. 32(dog), Sarah Green p. 20(bl)\n\n' +
      'Shutterstock\nwavebreakmedia p. 40(br)',
  );
}

// --- pages and positions collapse per credit --------------------------------
{
  // One credit, two positions on one page -> p45(tl,br), in reading order.
  const g = compile([row(1, 45, 'BR', 'Alamy', 'Ratsanai'), row(2, 45, 'tl', 'Alamy', 'Ratsanai')], MAP).groups;
  assert.equal(toText(g, 'guidelines'), 'Alamy/Ratsanai p45(tl,br).');
}
{
  // Same position on two pages -> the guidelines' "pp10, 11(tr)" shape.
  const g = compile([row(1, 10, 'tr', 'Alamy', 'Carl Pike'), row(2, 11, 'tr', 'Alamy', 'Carl Pike')], MAP).groups;
  assert.equal(toText(g, 'guidelines'), 'Alamy/Carl Pike pp10, 11(tr).');
}
{
  // Different positions on different pages stay distinguishable.
  const g = compile([row(1, 15, 'tl', 'Getty', 'FG Trade'), row(2, 71, 'br', 'Getty', 'FG Trade')], MAP).groups;
  assert.equal(toText(g, 'guidelines'), 'Getty Images/FG Trade pp15(tl), 71(br).');
}
{
  // Exact duplicate rows (the log repeats an asset per placement) collapse to one.
  const dup = [1, 2, 3, 4, 5].map((n) => row(n, 5, 'ML', 'Shutterstock', 'Cali6ro'));
  const { groups, used } = compile(dup, MAP);
  assert.equal(used, 5);
  assert.equal(toText(groups, 'guidelines'), 'Shutterstock/Cali6ro p5(ml).');
  assert.deepEqual(groups[0].credits[0].rows, [1, 2, 3, 4, 5]); // traceability kept
}

// --- dirty data becomes a query, never a guess ------------------------------
{
  const { groups, queries, skipped } = compile(
    [
      row(1, 6, 'MC', 'Getty', '\tFatCamera'),          // tab in the name
      row(2, 6, 'BG', 'Getty', 'Liam Norris'),           // undocumented position code
      row(3, '', 'TL', 'Getty', 'Jupiterimages'),        // no page
      row(4, 9, 'tl', 'Pixabay', 'Someone'),             // unknown library
      row(5, 9, 'tl', '', 'Orphan credit'),              // no library
      row(6, 9, 'tl', 'Alamy', ''),                      // no credit holder
      { n: 7, cells: new Array(26).fill(null) },          // blank row, ignored
    ],
    MAP,
  );
  assert.equal(skipped, 2);
  assert.ok(toText(groups, 'guidelines').includes('Getty Images/FatCamera p6(mc)'));
  assert.ok(toText(groups, 'guidelines').includes('Getty Images/Jupiterimages,')); // no page, no ref
  const kinds = queries.map((q) => q.kind + ':' + q.value).sort();
  assert.deepEqual(kinds, ['credit:Alamy', 'library:Pixabay', 'no-library:Orphan credit', 'page:Jupiterimages', 'placement:bg']);
  assert.equal(queries.find((q) => q.value === 'Pixabay')!.rows[0], 4);
  // An override resolves the unknown library without touching the sheet.
  const fixed = compile([row(4, 9, 'tl', 'Pixabay', 'Someone')], MAP, { pixabay: 'Alamy' });
  assert.equal(fixed.groups[0].library, 'Alamy');
  assert.equal(fixed.queries.length, 0);
  // A credit with no library at all is assignable by name, and then compiles.
  const adopted = compile([row(5, 9, 'tl', '', 'Orphan credit')], MAP, {
    [byCreditKey('Orphan credit')]: 'Getty',
  });
  assert.equal(adopted.skipped, 0);
  assert.equal(adopted.queries.length, 0);
  assert.equal(toText(adopted.groups, 'guidelines'), 'Getty Images/Orphan credit p9(tl).');
}

// --- alphabetical order, case- and punctuation-insensitive ------------------
{
  const names = ['Ziva_K', 'aquariagirl1970', 'Janice Adlam', 'flowerstock', 'Pro-author', 'l0939516891 / 500px'];
  const g = compile(names.map((nm, i) => row(i + 1, 37, 'tl', 'Shutterstock', nm)), MAP).groups;
  assert.deepEqual(
    g[0].credits.map((c) => c.name),
    ['aquariagirl1970', 'flowerstock', 'Janice Adlam', 'l0939516891 / 500px', 'Pro-author', 'Ziva_K'],
  );
}

// --- mapping ----------------------------------------------------------------
assert.deepEqual(autoMap(HEADERS), { library: 23, credit: 24, page: 5, placement: 21 });
{
  const blank: Mapping = { library: null, credit: null, page: null, placement: null };
  assert.deepEqual(
    mapFromPrompt(
      'Column X has the library, column Y the credits, column F is the page number and column V the placement.',
      HEADERS, blank,
    ),
    MAP,
  );
  assert.deepEqual(
    mapFromPrompt('library X, credits Y, page F, placement V', HEADERS, blank),
    MAP,
  );
  // An out-of-range letter is ignored rather than mapped to nothing.
  assert.equal(mapFromPrompt('library is ZZ', HEADERS, blank).library, null);
}

console.log('credits: all checks passed');
