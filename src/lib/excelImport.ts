/**
 * Baca file "Data Perbandingan MP" -- pivot table kompleks (58 kolom: Area, Kota/Kab,
 * lalu breakdown per divisi x jabatan). Untuk kebutuhan dashboard yang simpel, kita
 * hanya ambil TOTAL MP per Area, yaitu kolom "Jumlah" paling kanan pada baris subtotal
 * tiap area (baris dengan kolom "Kota/Kab." bertuliskan "Jumlah").
 */
// Pastikan baris ini ada di paling atas file excelImport.ts (kalau sudah ada, lewati):
import * as XLSX from 'xlsx';

export async function parseMpComparisonFile(file: File): Promise<{ area: string; total_mp: number }[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const sheetName = wb.SheetNames[0]; // file ini biasanya cuma 1 sheet per bulan, mis. "Juli '26"
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' }) as unknown[][];

  // Cari baris header: baris yang punya "NO" dan "AREA" (case-insensitive), di 10 baris pertama
  let headerIdx = -1;
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const cells = (rows[r] || []).map((c) => String(c ?? '').trim().toUpperCase());
    if (cells.includes('NO') && cells.includes('AREA')) { headerIdx = r; break; }
  }
  if (headerIdx === -1) return [];

  const header = (rows[headerIdx] || []).map((c) => String(c ?? '').trim().toUpperCase());
  const areaIdx = header.indexOf('AREA');
  const kotaIdx = header.findIndex((c) => c.startsWith('KOTA'));
  const totalIdx = header.indexOf('JUMLAH'); // FIX: cari kolom "Jumlah" berdasarkan nama, bukan posisi terakhir

  if (areaIdx === -1 || kotaIdx === -1 || totalIdx === -1) return [];

  const result: { area: string; total_mp: number }[] = [];
  let currentArea = '';

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const areaCell = String(row[areaIdx] ?? '').trim();
    if (areaCell) currentArea = areaCell;

    const kotaCell = String(row[kotaIdx] ?? '').trim().toUpperCase();
    if (kotaCell === 'JUMLAH' && currentArea) {
      const total = Number(row[totalIdx]) || 0;
      result.push({ area: currentArea, total_mp: total });
    }
  }
  
  return result;
}
