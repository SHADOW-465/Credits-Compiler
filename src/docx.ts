// .docx output. Bold is structural here: the guidelines bold only the FIRST
// occurrence of each library name, which is why the text is assembled as runs
// rather than as a string.
import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx';
import { INTRO, creditText, type Group, type Style } from './credits.ts';

const FONT = 'Times New Roman';

function body(children: TextRun[], spacing = 160): Paragraph {
  return new Paragraph({ children, spacing: { after: spacing, line: 276 } });
}

export function buildDocument(groups: Group[], style: Style, title: string): Document {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 28, font: FONT })],
      spacing: { after: 240 },
      alignment: AlignmentType.LEFT,
    }),
    body([new TextRun({ text: INTRO, size: 22, font: FONT })], 240),
  ];

  if (style === 'sample') {
    for (const group of groups) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: group.library, bold: true, size: 22, font: FONT })],
          spacing: { after: 60 },
        }),
        body(
          [
            new TextRun({
              text: group.credits.map((c) => creditText(c, 'sample')).join(', '),
              size: 22,
              font: FONT,
            }),
          ],
          220,
        ),
      );
    }
  } else {
    // One continuous list. The library name repeats before every credit and is
    // bold only the first time it appears.
    const runs: TextRun[] = [];
    groups.forEach((group, gi) => {
      group.credits.forEach((credit, ci) => {
        if (ci > 0) runs.push(new TextRun({ text: ', ', size: 22, font: FONT }));
        runs.push(
          new TextRun({ text: group.library, bold: ci === 0, size: 22, font: FONT }),
          new TextRun({ text: '/' + creditText(credit, 'guidelines'), size: 22, font: FONT }),
        );
      });
      runs.push(
        new TextRun({
          text: gi === groups.length - 1 ? '.' : '; ',
          size: 22,
          font: FONT,
        }),
      );
    });
    paragraphs.push(body(runs, 240));
  }

  return new Document({
    creator: 'Credits Compiler',
    title,
    styles: { default: { document: { run: { font: FONT, size: 22 } } } },
    sections: [{ children: paragraphs }],
  });
}

export async function downloadDocx(
  groups: Group[],
  style: Style,
  title: string,
  filename: string,
): Promise<void> {
  const blob = await Packer.toBlob(buildDocument(groups, style, title));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Revoke on the next frame — Safari needs the element to still be live.
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}
