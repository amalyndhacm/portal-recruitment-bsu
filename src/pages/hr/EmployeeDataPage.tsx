import { useEffect, useMemo, useRef, useState } from 'react';
import { Users, Search, Upload, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { db, type Employee } from '@/lib/database';
import { PageHeader, Card, Button, LoadingState, EmptyState, Badge } from '@/components/ui';

// Nama-nama kolom di file Excel -> field di database.
// Dibuat "longgar" (huruf besar/kecil & spasi diabaikan) supaya import
// tetap jalan walau urutan/kapitalisasi header sedikit berbeda.
const COLUMN_MAP: Record<string, keyof Employee> = {
  'employee id': 'employee_id',
  name: 'name',
  'date of birth': 'date_of_birth',
  'employee status': 'employee_status',
  'start date': 'start_date',
  grade: 'grade',
  description: 'description',
  'cost center description': 'cost_center_description',
  'id card number': 'id_card_number',
  'id address': 'id_address',
  'mobile phone': 'mobile_phone',
  'bank account number': 'bank_account_number',
};

const statusColors: Record<string, string> = {
  TETAP: 'sky',
  KONTRAK: 'yellow',
  PROBATION: 'amber',
};

function normalizeHeader(h: string) {
  return h.toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

// Excel menyimpan tanggal sebagai serial number kalau kolomnya diformat
// sebagai Date. Fungsi ini mengubahnya jadi 'YYYY-MM-DD', dan tetap
// menerima teks tanggal biasa (mis. 19/04/1989).
function excelDateToISO(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return null;
    const mm = String(date.m).padStart(2, '0');
    const dd = String(date.d).padStart(2, '0');
    return `${date.y}-${mm}-${dd}`;
  }
  const str = value.toString().trim();
  const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return str || null;
}

export default function EmployeeDataPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await db.from('employees').select('*').order('name', { ascending: true });
    setEmployees(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Tab diambil otomatis dari kolom branch_group yang ada di data,
  // persis seperti tab sheet (ALL, PUSAT, ASO MALANG, ...) di Excel.
  const tabs = useMemo(() => {
    const set = new Set(employees.map((e) => e.branch_group).filter(Boolean));
    return ['ALL', ...Array.from(set).filter((t) => t !== 'ALL').sort()];
  }, [employees]);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const matchesTab = activeTab === 'ALL' || e.branch_group === activeTab;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.employee_id.toLowerCase().includes(q) ||
        (e.id_card_number || '').toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [employees, activeTab, search]);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg('Membaca file Excel...');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });

      const rowsToUpsert: Partial<Employee>[] = [];

      for (const sheetName of workbook.SheetNames) {
  if (sheetName.trim().toUpperCase() === 'ALL') continue; // sheet ALL cuma rekap, jangan diimpor
        const sheet = workbook.Sheets[sheetName];
        
        // header: 1 -> baca sebagai array-of-arrays supaya kita bisa cari
        // baris header sendiri (di file ini header ada di baris ke-4).
        const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        const headerRowIndex = raw.findIndex((row) =>
          row.some((cell) => normalizeHeader(String(cell)) === 'employee id')
        );
        if (headerRowIndex === -1) continue; // sheet ini bukan tabel data karyawan
        
        const headers = raw[headerRowIndex].map((h) => normalizeHeader(String(h)));

        for (let r = headerRowIndex + 1; r < raw.length; r++) {
          const row = raw[r];
          if (!row || row.every((c) => c === '' || c === undefined)) continue;

          const record: Partial<Employee> = { branch_group: sheetName };
          headers.forEach((h, colIdx) => {
            const field = COLUMN_MAP[h];
            if (!field) return;
            const cellValue = row[colIdx];
            if (field === 'date_of_birth' || field === 'start_date') {
              record[field] = excelDateToISO(cellValue) as never;
            } else {
              record[field] = cellValue === undefined ? '' : String(cellValue).trim();
            }
          });

          if (record.employee_id) rowsToUpsert.push(record);
        }
      }

      if (rowsToUpsert.length === 0) {
        setImportMsg('Tidak ada baris data yang cocok ditemukan di file ini.');
      } else {
        setImportMsg(`Mengunggah ${rowsToUpsert.length} baris ke database...`);
        // Upload per-batch supaya tidak melebihi batas ukuran request.
        const BATCH = 500;
        for (let i = 0; i < rowsToUpsert.length; i += BATCH) {
          const batch = rowsToUpsert.slice(i, i + BATCH);
          const { error } = await db
            .from('employees')
            .upsert(batch, { onConflict: 'employee_id,branch_group' });
          if (error) throw error;
        }
        setImportMsg(`Selesai. ${rowsToUpsert.length} baris berhasil diimpor/diperbarui.`);
        await load();
      }
    } catch (err) {
      console.error(err);
      setImportMsg('Gagal mengimpor file. Pastikan formatnya sama seperti template Excel.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <PageHeader
        title="Data Karyawan"
        subtitle="Master data karyawan (Employee Information Report)"
        icon={<Users className="w-6 h-6 text-sky-600" />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, employee ID, no. KTP..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button onClick={handleImportClick} disabled={importing}>
          {importing ? (
            <Loader2 className="w-4 h-4 inline mr-1 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 inline mr-1" />
          )}
          Import dari Excel
        </Button>

        {importMsg && <span className="text-xs text-slate-500">{importMsg}</span>}
      </div>

      {/* Tab per cabang/daerah, sama seperti tab sheet di file Excel */}
      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState message="Belum ada data karyawan. Klik 'Import dari Excel' untuk mengunggah file." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">No</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Employee ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Date of Birth</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Employee Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Start Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Grade</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Description</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Cost Center Description</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">ID Card Number</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">ID Address</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Mobile Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Bank Account Number</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, idx) => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{e.employee_id}</td>
                    <td className="px-4 py-3 text-slate-900">{e.name}</td>
                    <td className="px-4 py-3 text-slate-600">{e.date_of_birth || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge text={e.employee_status || '-'} color={statusColors[e.employee_status || ''] || 'slate'} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{e.start_date || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{e.grade || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{e.description || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{e.cost_center_description || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{e.id_card_number || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{e.id_address || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{e.mobile_phone || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{e.bank_account_number || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}