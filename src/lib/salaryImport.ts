// Parser untuk sheet "REKAP GAJI" pada file Excel payroll bulanan (mis. "REKAP GAJI_AGUSTUS_2026.xlsx").
//
// Struktur sheet ini (lihat contoh):
//   - Header GOLONGAN 2 baris: baris atas "B.O.D | MANAJEMEN | LABOUR" (merged cell),
//     baris bawah sub-golongan "B.1 B.2 | M.3 M.2 M.1 | P.3 P.2 P.1", lalu kolom "JUMLAH GAJI (RP)".
//   - Baris nama Regional (mis. "REGIONAL 1 - JAWA TIMUR") jadi konteks untuk baris2
//     lokasi/ASO di bawahnya (kolom "LOKASI/KANTOR/ASO"), sampai baris regional berikutnya.
//   - Ada baris subtotal per regional (mis. dimulai kata "JUMLAH") yang kita lewati,
//     karena subtotal dihitung ulang otomatis di halaman Rekap Gaji.
//
// CATATAN: kalau setelah dicoba dengan file asli ternyata ada perbedaan nama kolom/susunan,
// beri tahu supaya deteksi header & mapping kolom di bawah disesuaikan.

import * as XLSX from 'xlsx';

export type SalaryRecapRow = {
  regional: string;
  location: string;
  d3: number; d2: number; d1: number;
  m3: number; m2: number; m1: number;
  p3: number; p2: number; p1: number;
  total_gaji: number;
};

const GRADE_HEADERS = ['D.3', 'D.2', 'D.1', 'M.3', 'M.2', 'M.1', 'P.3', 'P.2', 'P.1'];
// Beberapa kemungkinan penulisan sub-golongan di file asli (tanpa titik, "B" utk B.O.D, dst.)
const GRADE_ALIASES: Record<string, string> = {
  'D3': 'D.3', 'D2': 'D.2', 'D1': 'D.1',
  'B3': 'D.3', 'B2': 'D.2', 'B1': 'D.1', // B.O.D kadang ditulis B1/B2/B3
  'M3': 'M.3', 'M2': 'M.2', 'M1': 'M.1',
  'P3': 'P.3', 'P2': 'P.2', 'P1': 'P.1',
};

function normalizeGradeHeader(raw: string): string | null {
  const clean = raw.trim().toUpperCase().replace(/\s+/g, '');
  if (GRADE_HEADERS.includes(clean)) return clean;
  const dotless = clean.replace(/\./g, '');
  if (GRADE_ALIASES[dotless]) return GRADE_ALIASES[dotless];
  return null;
}

function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  const clean = String(v ?? '').replace(/[^\d.-]/g, '');
  return clean ? Number(clean) || 0 : 0;
}

// Cari baris header golongan: baris yang punya minimal beberapa sel yang cocok dengan kode golongan (D/M/P.x)
function findGradeHeaderRow(rows: unknown[][]): { rowIdx: number; colToGrade: Record<number, string> } | null {
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r] || [];
    const colToGrade: Record<number, string> = {};
    row.forEach((cell, c) => {
      const g = normalizeGradeHeader(String(cell ?? ''));
      if (g) colToGrade[c] = g;
    });
    if (Object.keys(colToGrade).length >= 5) return { rowIdx: r, colToGrade };
  }
  return null;
}

// Cari kolom lokasi (header "LOKASI", "KANTOR", "ASO", atau "URAIAN") dan kolom total ("JUMLAH GAJI")
function findLabelColumns(rows: unknown[][], headerRowIdx: number): { locationCol: number; totalCol: number } {
  let locationCol = -1;
  let totalCol = -1;
  // Cek beberapa baris di sekitar header golongan (header lokasi/total biasanya sebaris atau tepat di atasnya)
  for (let r = Math.max(0, headerRowIdx - 2); r <= headerRowIdx; r++) {
    const cells = (rows[r] || []).map((c) => String(c ?? '').trim().toUpperCase());
    cells.forEach((c, idx) => {
      if (locationCol === -1 && (c.includes('LOKASI') || c.includes('KANTOR') || c === 'ASO' || c.includes('URAIAN'))) {
        locationCol = idx;
      }
      if (totalCol === -1 && c.includes('JUMLAH') && c.includes('GAJI')) {
        totalCol = idx;
      }
    });
  }
  // Fallback: kolom lokasi = kolom pertama yang berisi teks (biasanya kolom B, index 1, setelah NO)
  if (locationCol === -1) locationCol = 1;
  return { locationCol, totalCol };
}

export async function parseSalaryRecapFile(file: File): Promise<SalaryRecapRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });

  // Cari sheet bernama mengandung "REKAP GAJI"; kalau tidak ada, pakai sheet pertama.
  const sheetName =
    wb.SheetNames.find((n) => n.trim().toUpperCase().includes('REKAP GAJI')) || wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' }) as unknown[][];

  const headerInfo = findGradeHeaderRow(rows);
  if (!headerInfo) return [];
  const { rowIdx: headerRowIdx, colToGrade } = headerInfo;
  const { locationCol, totalCol } = findLabelColumns(rows, headerRowIdx);

  const result: SalaryRecapRow[] = [];
  let currentRegional = '';

  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const labelCell = String(row[locationCol] ?? '').trim();
    if (!labelCell) continue;

    const upper = labelCell.toUpperCase();

    // Baris nama Regional: biasanya diawali "REGIONAL" dan tidak punya angka golongan sama sekali
    const hasAnyGradeValue = Object.keys(colToGrade).some((c) => toNumber(row[Number(c)]) !== 0);
    if (upper.startsWith('REGIONAL') || (upper.includes('KANTOR PUSAT') && !hasAnyGradeValue)) {
      currentRegional = labelCell;
      continue;
    }

    // Lewati baris subtotal ("JUMLAH", "TOTAL", "SUB TOTAL")
    if (upper.startsWith('JUMLAH') || upper.startsWith('TOTAL') || upper.startsWith('SUB TOTAL')) continue;

    // Baris data lokasi (harus punya minimal satu nilai golongan/total, supaya tidak menangkap baris kosong/judul lain)
    const totalVal = totalCol >= 0 ? toNumber(row[totalCol]) : 0;
    if (!hasAnyGradeValue && totalVal === 0) continue;

    const values: Record<string, number> = {
      d3: 0, d2: 0, d1: 0, m3: 0, m2: 0, m1: 0, p3: 0, p2: 0, p1: 0,
    };
    for (const [colStr, grade] of Object.entries(colToGrade)) {
      const key = grade.toLowerCase().replace('.', '') as keyof typeof values;
      values[key] = toNumber(row[Number(colStr)]);
    }

    const sumGrades = Object.values(values).reduce((s, n) => s + n, 0);

    result.push({
      regional: currentRegional,
      location: labelCell,
      d3: values.d3, d2: values.d2, d1: values.d1,
      m3: values.m3, m2: values.m2, m1: values.m1,
      p3: values.p3, p2: values.p2, p1: values.p1,
      total_gaji: totalVal || sumGrades,
    });
  }

  return result;
}