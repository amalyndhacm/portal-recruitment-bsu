import { db } from '@/lib/database';

// ---------------------------------------------------------------------------
// Asisten Data Dashboard — chatbot berbasis pencocokan kata kunci (tanpa API
// AI eksternal) yang menerjemahkan pertanyaan berbahasa Indonesia menjadi
// query Supabase ke tabel-tabel HR Portal, lalu mengembalikan jawaban
// berupa angka nyata dari database (bukan jawaban template).
// ---------------------------------------------------------------------------

type FilterOp = 'ilike' | 'eq' | 'eqBool';
type Filter = { column: string; op: FilterOp; value: string | boolean };

interface ModuleConfig {
  id: string;
  label: string;
  table: string;
  match: (q: string) => boolean;
  areaColumns?: string[];
  categoryColumn?: string;
  categoryValues?: string[];
  periodColumn?: string;
  countMode: 'rows' | 'sum';
  sumField?: string;
  breakdownColumn?: string;
  extraFilters?: Filter[];
}

const MONTHS: Record<string, string> = {
januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12',
};

const PA_CATEGORY_VALUES = [
'Karyawan Baru', 'Resign', 'PHK', 'Mutasi', 'Promosi', 'Demosi',
'Lulus', 'Tidak Lulus', 'Perpanjang', 'Non Job', 'Task',
];

const MODULES: ModuleConfig[] = [
{
    id: 'mp_comparison',
    label: 'Perbandingan Manpower (MP) per Area',
    table: 'mp_comparison_summary',
    match: (q) => /\bmp\b/.test(q) || q.includes('manpower') || q.includes('perbandingan mp'),
    areaColumns: ['area'],
    periodColumn: 'period_month',
    countMode: 'sum',
    sumField: 'total_mp',
},
{
    id: 'workforce_demographics',
    label: 'Demografi / Headcount Karyawan',
    table: 'workforce_demographics',
    match: (q) =>
    q.includes('demografi') || q.includes('headcount') || q.includes('jumlah karyawan') ||
    q.includes('jumlah pegawai') || q.includes('jumlah pekerja') || q.includes('total karyawan') ||
    q.includes('total pegawai') || q.includes('berapa karyawan') || q.includes('berapa pegawai'),
    areaColumns: ['region_label', 'region'],
    countMode: 'sum',
    sumField: 'number_of_emp',
    extraFilters: [{ column: 'is_grand_total', op: 'eqBool', value: true }],
},
{
    id: 'personnel_action',
    label: 'Personnel Action (PA)',
    table: 'personnel_actions',
    match: (q) =>
    /\bpa\b/.test(q) || q.includes('personnel action') ||
    ['mutasi', 'promosi', 'demosi', 'phk', 'non job', 'perpanjang', 'tidak lulus'].some((k) => q.includes(k)),
    areaColumns: ['area'],
    categoryColumn: 'action_type',
    categoryValues: PA_CATEGORY_VALUES,
    periodColumn: 'period_month',
    countMode: 'rows',
    breakdownColumn: 'action_type',
},

{
    id: 'resign_reasons',
    label: 'Data Alasan Resign',
    table: 'resign_reasons',
    match: (q) => q.includes('alasan resign') || q.includes('kenapa resign') || q.includes('sebab resign'),
    areaColumns: ['region'],
    countMode: 'rows',
    breakdownColumn: 'reason',
},
{
    id: 'employee_admin',
    label: 'Data Administrasi Karyawan',
    table: 'employee_admin',
    match: (q) =>
    q.includes('karyawan baru') || q.includes('karyawan aktif') || q.includes('karyawan cuti') ||
    q.includes('status karyawan') || q.includes('karyawan resign'),
    areaColumns: ['region'],
    categoryColumn: 'status',
    categoryValues: ['Baru', 'Aktif', 'Resign', 'Cuti'],
    countMode: 'rows',
    breakdownColumn: 'status',
},
{
    id: 'recruitment',
    label: 'Aktivitas Rekrutmen',
    table: 'recruitment_activities',
    match: (q) => q.includes('rekrutmen') || q.includes('recruitment') || q.includes('kandidat') || q.includes('pelamar'),
    areaColumns: ['area'],
    categoryColumn: 'employee_stage',
    categoryValues: ['Sourcing', 'Screening', 'Interview', 'Psikotest', 'Offering', 'Onboarding'],
    countMode: 'sum',
    sumField: 'quantity',
    breakdownColumn: 'employee_stage',
},
{
    id: 'training',
    label: 'Aktivitas Pelatihan',
    table: 'training_activities',
    match: (q) => q.includes('pelatihan') || q.includes('training'),
    areaColumns: ['area'],
    categoryColumn: 'employee_stage',
    categoryValues: ['Induction', 'Onboarding', 'Training Internal', 'Training Eksternal', 'Sertifikasi'],
    countMode: 'sum',
    sumField: 'quantity',
    breakdownColumn: 'employee_stage',
},
{
    id: 'discipline',
    label: 'Kasus Disiplin Karyawan',
    table: 'employee_discipline',
    match: (q) => q.includes('disiplin') || q.includes('pelanggaran') || q.includes('kasus'),
    categoryColumn: 'status',
    categoryValues: ['Open', 'In Progress', 'Resolved'],
    countMode: 'rows',
    breakdownColumn: 'status',
},
{
    id: 'travel',
    label: 'Administrasi Travel',
    table: 'travel_admin',
    match: (q) => q.includes('travel') || q.includes('perjalanan dinas') || q.includes('tiket') || q.includes('hotel'),
    categoryColumn: 'status',
    categoryValues: ['Pending', 'Approved', 'Completed', 'Cancelled'],
    countMode: 'rows',
    breakdownColumn: 'status',
},
{
    id: 'incentive',
    label: 'Pembayaran Insentif',
    table: 'incentive_payments',
    match: (q) => q.includes('insentif') || q.includes('incentive') || q.includes('gelombang'),
    categoryColumn: 'status',
    categoryValues: ['Pending', 'Approved', 'Paid', 'Cancelled'],
    countMode: 'rows',
    breakdownColumn: 'status',
},
{
    id: 'weekly_report',
    label: 'Laporan Mingguan',
    table: 'weekly_reports',
    match: (q) => q.includes('laporan mingguan') || q.includes('weekly report'),
    categoryColumn: 'division',
    categoryValues: ['HR', 'Recruitment & Training', 'Compensation & Benefit'],
    countMode: 'rows',
    breakdownColumn: 'division',
},
];

function norm(s: string): string {
return s.toLowerCase().trim();
}

const distinctCache = new Map<string, string[]>();

async function getDistinctValues(table: string, column: string): Promise<string[]> {
const cacheKey = `${table}.${column}`;
const cached = distinctCache.get(cacheKey);
if (cached) return cached;
const { data } = await db.from(table).select(column).not(column, 'is', null).limit(2000);
const rows = (data || []) as unknown as Record<string, unknown>[];
const set = new Set<string>();
rows.forEach((row) => {
    const v = row[column];
    if (v && String(v).trim()) set.add(String(v).trim());
});
const arr = Array.from(set);
distinctCache.set(cacheKey, arr);
return arr;
}

function findLongestMatch(question: string, candidates: string[]): string | null {
const q = norm(question);
let best: string | null = null;
let bestLen = 0;
for (const c of candidates) {
    const cl = norm(c);
    if (cl.length < 2) continue;
    if (q.includes(cl) && cl.length > bestLen) {
    best = c;
    bestLen = cl.length;
    }
}
return best;
}

function findCategoryMatch(question: string, values: string[]): string | null {
const q = norm(question);
const sorted = [...values].sort((a, b) => b.length - a.length);
for (const v of sorted) {
    if (q.includes(norm(v))) return v;
}
return null;
}

function findPeriodMatch(question: string): string | null {
  const q = norm(question);
  for (const [name, num] of Object.entries(MONTHS)) {
    if (q.includes(name)) {
      const yearMatch = q.match(/\b(20\d{2})\b/);
      const year = yearMatch ? yearMatch[1] : String(new Date().getFullYear());
      return `${year}-${num}`;
    }
  }
  return null;
}

function periodLabel(period: string): string {
  const [y, m] = period.split('-');
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${bulan[Number(m) - 1] ?? m} ${y}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, filters: Filter[]) {
  let q = query;
  for (const f of filters) {
    if (f.op === 'ilike') q = q.ilike(f.column, f.value as string);
    else q = q.eq(f.column, f.value);
  }
  return q;
}

async function runCount(module: ModuleConfig, filters: Filter[]): Promise<number> {
  if (module.countMode === 'rows') {
    const query = applyFilters(db.from(module.table).select('*', { count: 'exact', head: true }), filters);
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }
  const query = applyFilters(db.from(module.table).select(module.sumField as string), filters);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).reduce((s: number, r: Record<string, unknown>) => s + (Number(r[module.sumField as string]) || 0), 0);
}

async function runBreakdown(module: ModuleConfig, filters: Filter[]): Promise<{ label: string; value: number }[]> {
  if (!module.breakdownColumn) return [];
  const cols = module.countMode === 'sum' ? `${module.breakdownColumn},${module.sumField}` : module.breakdownColumn;
  const query = applyFilters(db.from(module.table).select(cols), filters);
  const { data, error } = await query;
  if (error) throw error;
  const map = new Map<string, number>();
  (data || []).forEach((row: Record<string, unknown>) => {
    const key = String(row[module.breakdownColumn as string] || 'Tidak diketahui');
    const inc = module.countMode === 'sum' ? Number(row[module.sumField as string]) || 0 : 1;
    map.set(key, (map.get(key) || 0) + inc);
  });
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function formatAnswer(
  module: ModuleConfig,
  total: number,
  area: string | null,
  category: string | null,
  period: string | null,
  breakdown: { label: string; value: number }[]
): string {
  let sentence = `Total ${module.label}`;
  if (category) sentence += ` untuk kategori "${category}"`;
  if (area) sentence += ` di area "${area}"`;
  if (period) sentence += ` pada periode ${periodLabel(period)}`;
  sentence += ` adalah ${total}.`;

  if (breakdown.length > 0 && total > 0) {
    const items = breakdown.map((b) => `${b.label}: ${b.value}`).join(', ');
    sentence += `\n\nRincian: ${items}.`;
  }

  if (total === 0) {
    sentence += ' Coba periksa kembali penulisan area atau kategorinya, atau tanyakan tanpa filter untuk melihat total keseluruhan data ini.';
  }

  return sentence;
}

const HELP_TEXT = `Saya bisa menjawab pertanyaan seputar data yang ada di database Portal HR, misalnya:
- jumlah PA di area Malang berapa
- berapa PA kategori mutasi bulan Agustus
- berapa karyawan resign di Surabaya
- total rekrutmen area Jakarta
- insentif yang sudah dibayar berapa
Sebutkan modul data (PA, karyawan, rekrutmen, pelatihan, disiplin, travel, insentif, laporan mingguan, demografi, atau manpower/MP), lalu area/kategori/bulan kalau ada.`;

export async function answerDataQuestion(rawQuestion: string): Promise<string> {
  const q = norm(rawQuestion);

  if (!q) return HELP_TEXT;
  if (q.includes('bantuan') || q.includes('bisa apa') || q.includes('help') || q === 'halo' || q === 'hai') {
    return HELP_TEXT;
  }

  const module = MODULES.find((m) => m.match(q));
  if (!module) {
    return 'Maaf, saya belum bisa mengenali data yang dimaksud dari pertanyaan tersebut.\n\n' + HELP_TEXT;
  }

  try {
    const filters: Filter[] = [...(module.extraFilters || [])];
    let matchedArea: string | null = null;
    let matchedCategory: string | null = null;
    let matchedPeriod: string | null = null;

    if (module.areaColumns && module.areaColumns.length > 0) {
      let candidates: string[] = [];
      for (const col of module.areaColumns) {
        const vals = await getDistinctValues(module.table, col);
        candidates = candidates.concat(vals);
      }
      candidates = Array.from(new Set(candidates));
      matchedArea = findLongestMatch(q, candidates);
      if (matchedArea) {
        filters.push({ column: module.areaColumns[0], op: 'ilike', value: `%${matchedArea}%` });
      }
    }

    if (module.categoryColumn && module.categoryValues) {
      matchedCategory = findCategoryMatch(q, module.categoryValues);
      if (matchedCategory) filters.push({ column: module.categoryColumn, op: 'eq', value: matchedCategory });
    }

    if (module.periodColumn) {
      matchedPeriod = findPeriodMatch(q);
      if (matchedPeriod) filters.push({ column: module.periodColumn, op: 'eq', value: matchedPeriod });
    }

    const total = await runCount(module, filters);
    const breakdown = !matchedCategory && module.breakdownColumn ? await runBreakdown(module, filters) : [];

    return formatAnswer(module, total, matchedArea, matchedCategory, matchedPeriod, breakdown);
  } catch (err) {
    console.error('Gagal mengambil data chatbot:', err);
    return 'Maaf, terjadi kendala saat mengambil data dari database. Silakan coba lagi sesaat lagi.';
  }
}