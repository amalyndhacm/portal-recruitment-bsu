// Parser untuk file "Report PA" bulanan (Excel) -> baris siap-insert ke tabel personnel_actions.
// Semua sheet (PEGAWAI BARU, RESIGN, PHK, MUTASI, PROMOSI, DEMOSI, LULUS, NON JOB, TASK, PERPANJANG)
// punya struktur kolom yang sama: NO, NAMA, JABATAN, GOLONGAN, AREA, TANGGAL, STATUS KARYAWAN, KETERANGAN

import * as XLSX from 'xlsx';

export type PersonnelActionRow = {
  employee_name: string;
  position: string;
  grade: string;
  area: string;
  action_type: string;
  effective_date: string; // 'YYYY-MM-DD'
  description: string;
  resign_reason: string | null;
};

// Nama sheet di file Report PA -> label kategori (harus sama persis dengan CATEGORIES di PersonnelActionsPage.tsx)
const SHEET_TO_CATEGORY: Record<string, string> = {
  'PEGAWAI BARU': 'Karyawan Baru',
  'RESIGN': 'Resign',
  'PHK': 'PHK',
  'MUTASI': 'Mutasi',
  'PROMOSI': 'Promosi',
  'DEMOSI': 'Demosi',
  'LULUS': 'Lulus',
  'NON JOB': 'Non Job',
  'TASK': 'Task',
  'PERPANJANG': 'Perpanjang',
};

function excelDateToIso(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const raw = String(value ?? '').trim();
  const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return '';
}

// Excel menulis golongan tanpa titik ("P2", "M3", "D1"), sedangkan form di portal
// pakai format "P.2", "M.3", "D.1" (lihat GRADES di PersonnelActionsPage.tsx) -> disamakan di sini.
function normalizeGrade(raw: unknown): string {
  const clean = String(raw ?? '').trim().toUpperCase();
  if (!clean) return '';
  const match = clean.match(/^([PMD])\.?(\d)$/);
  if (match) return `${match[1]}.${match[2]}`;
  return clean; // biarkan apa adanya kalau formatnya di luar dugaan, supaya data tidak hilang
}

function findHeaderRow(rows: unknown[][]): number {
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const cells = (rows[r] || []).map((c) => String(c ?? '').trim().toUpperCase());
    if (cells.some((c) => c === 'NAMA') && cells.some((c) => c === 'JABATAN')) return r;
  }
  return -1;
}

export async function parsePersonnelActionsFile(file: File): Promise<PersonnelActionRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });

  const result: PersonnelActionRow[] = [];

  for (const [sheetKeyword, category] of Object.entries(SHEET_TO_CATEGORY)) {
    const actualName = wb.SheetNames.find((n) => n.trim().toUpperCase() === sheetKeyword);
    if (!actualName) continue;

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[actualName], { header: 1, blankrows: false, defval: '' }) as unknown[][];
    const headerIdx = findHeaderRow(rows);
    if (headerIdx === -1) continue;

    const header = (rows[headerIdx] || []).map((c) => String(c ?? '').trim().toUpperCase());
    const idx = {
      nama: header.indexOf('NAMA'),
      jabatan: header.indexOf('JABATAN'),
      golongan: header.indexOf('GOLONGAN'),
      area: header.indexOf('AREA'),
      tanggal: header.findIndex((c) => c.startsWith('TANGGAL')),
      keterangan: header.indexOf('KETERANGAN'),
    };

    for (let r = headerIdx + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const nama = String(row[idx.nama] ?? '').trim();
      if (!nama) continue; // lewati baris kosong / baris "TOTAL KARYAWAN ..."

      const keterangan = idx.keterangan >= 0 ? String(row[idx.keterangan] ?? '').trim() : '';

      result.push({
        employee_name: nama,
        position: idx.jabatan >= 0 ? String(row[idx.jabatan] ?? '').trim() : '',
        grade: idx.golongan >= 0 ? normalizeGrade(row[idx.golongan]) : '',
        area: idx.area >= 0 ? String(row[idx.area] ?? '').trim() : '',
        action_type: category,
        effective_date: idx.tanggal >= 0 ? excelDateToIso(row[idx.tanggal]) : '',
        description: keterangan,
        resign_reason: category === 'Resign' ? keterangan : null,
      });
    }
  }

  return result;
}