// builders/docxBuilderSoal.js
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, PageNumber, Footer,
  SectionType
} from 'docx';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DOCX_CONFIG } from '../config/examConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '../output');

const { FONT, FS, FS_SM, PAGE_W, PAGE_H, MRG, LABELS } = DOCX_CONFIG;

const nb = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: nb, bottom: nb, left: nb, right: nb };

// Satu numbering config — soal mengalir native 2-kolom Word
function buatNumConfig(ref, start) {
  return {
    reference: ref,
    levels: [{
      level: 0,
      format: 'decimal',    // "1, 2, 3..."
      text: '%1.',          // format: "1.", "2.", dst
      alignment: AlignmentType.LEFT,
      start,
      suffix: 'space',      // <w:suff w:val="space"/> — bukan tab default
      style: {
        paragraph: {
          indent: { left: 440, hanging: 440 }, // hanging indent: teks soal rata di 440
          spacing: { before: 120, after: 0, line: 280 }
        },
        run: { font: FONT, bold: true, size: FS }
      }
    }]
  };
}

function renderStimulus(teks) {
  const bS = { style: BorderStyle.SINGLE, size: 4, color: '4472C4' };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [new TableCell({
        borders: { top: bS, bottom: bS, left: bS, right: bS },
        shading: { fill: 'EBF3FB', type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          spacing: { before: 0, after: 0, line: 252 },
          children: [new TextRun({ text: teks, font: FONT, size: FS_SM, italics: true, color: '1F3864' })]
        })]
      })]
    })]
  });
}

// Render satu soal PG — pakai single 'num-soal', Word native 2-column yang atur posisi
function renderSoal(s) {
  const items = [];

  // Stimulus (HOTS) — kotak biru sebelum soal
  if (s.stimulus && s.stimulus.trim()) {
    items.push(renderStimulus(s.stimulus.trim()));
    items.push(new Paragraph({ spacing: { before: 20, after: 0 }, children: [] }));
  }

  // Teks soal — gunakan Word auto-numbering (tanpa nomor di teks)
  items.push(new Paragraph({
    numbering: { reference: 'num-soal', level: 0 },
    children: [new TextRun({ text: s.soal, font: FONT, size: FS })]
  }));

  // Pilihan jawaban — indent 440 agar sejajar dengan teks soal
  s.pilihan.forEach((opt, i) => {
    const teksOpt = opt.startsWith(`${LABELS[i]}.`) ? opt.slice(2).trim() : opt;
    items.push(new Paragraph({
      spacing: { before: 28, after: 0, line: 252 },
      indent: { left: 440 },
      children: [
        new TextRun({ text: `${LABELS[i]}.  `, font: FONT, size: FS_SM, bold: true }),
        new TextRun({ text: teksOpt, font: FONT, size: FS_SM })
      ]
    }));
  });

  // Spasi antar soal
  items.push(new Paragraph({ spacing: { before: 0, after: 60 }, children: [] }));
  return items;
}

function buatHeader(INFO) {
  const totalW = PAGE_W - MRG * 2;
  const colInfo = Math.round(totalW * 0.56);
  const colGap = 120;
  const colBox = totalW - colInfo - colGap;
  const bBox = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
  const bordBox = { top: bBox, bottom: bBox, left: bBox, right: bBox };

  const identLine = (label) => new Paragraph({
    spacing: { before: 28, after: 28, line: 252 },
    children: [
      new TextRun({ text: label, font: FONT, size: FS, bold: true }),
      new TextRun({ text: ' : ', font: FONT, size: FS }),
      new TextRun({ text: '.'.repeat(38), font: FONT, size: FS }),
    ]
  });

  const tblHeader = new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: [colInfo, colGap, colBox],
    rows: [new TableRow({
      children: [
        new TableCell({
          borders: NO_BORDERS, width: { size: colInfo, type: WidthType.DXA },
          margins: { top: 0, bottom: 0, left: 0, right: 60 },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 20 },
              children: [new TextRun({ text: INFO.sekolah, font: FONT, size: 28, bold: true })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 14 },
              children: [new TextRun({ text: '─'.repeat(50), font: FONT, size: 18 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 14 },
              children: [new TextRun({ text: INFO.namaUjian, font: FONT, size: 26, bold: true })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 14 },
              children: [new TextRun({ text: INFO.tahunAjaran, font: FONT, size: FS })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 },
              children: [
                new TextRun({ text: 'Mata Pelajaran : ', font: FONT, size: FS, bold: true }),
                new TextRun({ text: INFO.mapel, font: FONT, size: FS }),
              ]}),
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 },
              children: [
                new TextRun({ text: 'Kelas : ', font: FONT, size: FS, bold: true }),
                new TextRun({ text: `${INFO.kelas}   `, font: FONT, size: FS }),
                new TextRun({ text: 'Waktu : ', font: FONT, size: FS, bold: true }),
                new TextRun({ text: INFO.waktu, font: FONT, size: FS }),
              ]}),
          ]
        }),
        new TableCell({
          borders: NO_BORDERS, width: { size: colGap, type: WidthType.DXA },
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          children: [new Paragraph({ children: [] })]
        }),
        new TableCell({
          borders: bordBox, width: { size: colBox, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 140, right: 100 },
          children: [
            identLine('Nama      '),
            identLine('Kelas     '),
            identLine('No. Absen '),
            identLine('Hari/Tgl  '),
          ]
        }),
      ]
    })]
  });

  return [
    tblHeader,
    new Paragraph({
      spacing: { before: 80, after: 0 },
      border: { bottom: { style: BorderStyle.DOUBLE, size: 6, color: '000000', space: 1 } },
      children: []
    }),
    new Paragraph({
      spacing: { before: 60, after: 80 },
      children: [
        new TextRun({ text: 'Petunjuk: ', font: FONT, size: FS, bold: true }),
        new TextRun({
          text: 'Berilah tanda silang (X) pada huruf A, B, C, atau D di depan jawaban yang paling benar!',
          font: FONT, size: FS, italics: true
        }),
      ]
    }),
  ];
}

export async function buildDocxSoal({ info, soalPG, sessionId }) {
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const INFO = {
    sekolah: info.sekolah,
    namaUjian: info.namaUjian,
    tahunAjaran: info.tahunAjaran,
    mapel: info.mapel,
    kelas: info.kelas,
    waktu: info.waktu
  };

  const mkFooter = () => new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `${INFO.mapel}  |  Kelas ${INFO.kelas}  |  ${INFO.namaUjian}  |  Halaman `, font: FONT, size: 18 }),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 18 }),
        new TextRun({ text: ' dari ', font: FONT, size: 18 }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 18 }),
      ]
    })]
  });

  // Semua soal sebagai paragraf biasa — Word native 2-column yang mengatur aliran per halaman
  const allSoal = soalPG.flatMap(s => renderSoal(s));
  const pageProps = {
    size: { width: PAGE_W, height: PAGE_H },
    margin: { top: MRG, right: MRG, bottom: MRG + 200, left: MRG }
  };

  const doc = new Document({
    // Satu numbering mulai dari 1 — mengalir kiri→kanan per halaman secara otomatis
    numbering: {
      config: [ buatNumConfig('num-soal', 1) ]
    },
    sections: [
      {
        // Section 1: Header full-lebar — CONTINUOUS agar section 2 mulai di halaman yang sama
        properties: { type: SectionType.CONTINUOUS, page: pageProps },
        footers: { default: mkFooter() },
        children: buatHeader(INFO)
      },
      {
        // Section 2: Soal 2 kolom native Word — nomor mengalir kiri→kanan per halaman
        properties: {
          page: pageProps,
          column: { count: 2, space: 720, separate: true }
        },
        footers: { default: mkFooter() },
        children: allSoal
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  const fileName = `soal_${sessionId}.docx`;
  writeFileSync(path.join(OUTPUT_DIR, fileName), buffer);
  console.log(`   📄 Soal PG: output/${fileName}`);
}
