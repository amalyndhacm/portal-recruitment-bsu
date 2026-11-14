import { useEffect, useMemo, useRef, useState } from 'react';
import { Users2, Upload, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { db, type WorkforceDemographic } from '@/lib/database';
import { PageHeader, Card, Button, LoadingState, EmptyState } from '@/components/ui';

// Urutan kolom numerik persis seperti kolom E s/d AP di file Excel
// "EMPLOYEE DATA". Urutan array ini WAJIB sama dengan urutan kolom asli.
const NUMERIC_COLUMNS: (keyof WorkforceDemographic)[] = [
  'number_of_emp', 'total_male', 'total_female',
  'age_18_35_male', 'age_18_35_female',
  'age_35_50_male', 'age_35_50_female',
  'age_50_65_male', 'age_50_65_female',
  'age_65_up_male', 'age_65_up_female',
  'yos_0_10_male', 'yos_0_10_female',
  'yos_10_20_male', 'yos_10_20_female',
  'yos_20_30_male', 'yos_20_30_female',
  'yos_30_up_male', 'yos_30_up_female',
  'edu_smp_male', 'edu_smp_female',
  'edu_sma_smk_male', 'edu_sma_smk_female',
  'edu_diploma_s1_male', 'edu_diploma_s1_female',
  'edu_s2_up_male', 'edu_s2_up_female',
  'rel_islam_male', 'rel_islam_female',
  'rel_kristen_male', 'rel_kristen_female',
  'rel_hindu_budha_male', 'rel_hindu_budha_female',
  'rel_konghucu_male', 'rel_konghucu_female',
  'marital_married', 'marital_single', 'marital_unmarried',
];

// Header 2 tingkat untuk ditampilkan di tabel (grup besar + sub kolom Male/Female).
const HEADER_GROUPS: { label: string; span: number; sub?: string[] }[] = [
  { label: '', span: 4 }, // No, Level, Grade, Position
  { label: 'Jml.', span: 1 },
  { label: 'Total', span: 2, sub: ['L', 'P'] },
  { label: '18 - 35', span: 2, sub: ['L', 'P'] },
  { label: '35 - 50', span: 2, sub: ['L', 'P'] },
  { label: '50 - 65', span: 2, sub: ['L', 'P'] },
  { label: '65 <', span: 2, sub: ['L', 'P'] },
  { label: '0 - 10', span: 2, sub: ['L', 'P'] },
  { label: '10 - 20', span: 2, sub: ['L', 'P'] },
  { label: '20 - 30', span: 2, sub: ['L', 'P'] },
  { label: '30 <', span: 2, sub: ['L', 'P'] },
  { label: 'SMP', span: 2, sub: ['L', 'P'] },
  { label: 'SMA/SMK', span: 2, sub: ['L', 'P'] },
  { label: 'Diploma/S1', span: 2, sub: ['L', 'P'] },
  { label: 'S2 <', span: 2, sub: ['L', 'P'] },
  { label: 'Islam', span: 2, sub: ['L', 'P'] },
  { label: 'Kristen', span: 2, sub: ['L', 'P'] },
  { label: 'Hindu/Budha', span: 2, sub: ['L', 'P'] },
  { label: 'Konghucu', span: 2, sub: ['L', 'P'] },
  { label: 'Nikah', span: 1 },
  { label: 'Lajang', span: 1 },
  { label: 'Blm Nikah', span: 1 },
];

// Hanya 6 sheet detail yang diimpor. Sheet "Ho&reg" sengaja dilewati karena
// isinya cuma rekap gabungan dari 6 sheet ini -- datanya tidak hilang, cuma
// tidak diimpor terpisah (bisa dihitung ulang dari total 6 region ini kalau perlu).
const IMPORTABLE_SHEETS = ['Ho', 'Reg.1', 'Reg.2', 'Reg.3', 'Reg.4', 'Bsu'];

const REGION_ORDER = ['Ho', 'Reg.1', 'Reg.2', 'Reg.3', 'Reg.4', 'Bsu', 'Ho&reg'];

function fmt(n: number | null | undefined) {
  if (!n) return '-';
  return n.toLocaleString('id-ID');
}

function cellStr(v: unknown): string {
  return v === null || v === undefined ? '' : String(v).trim();
}

export default function WorkforceDemographicsPage() {
  const [rows, setRows] = useState<WorkforceDemographic[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [activeRegion, setActiveRegion] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await db
      .from('workforce_demographics')
      .select('*')
      .order('region', { ascending: true })
      .order('row_order', { ascending: true });
    setRows(data || []);
    if (data && data.length > 0 && !activeRegion) {
      setActiveRegion(data[0].region);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regions = useMemo(() => {
    const set = new Set(rows.map((r) => r.region));
    return Array.from(set).sort((a, b) => {
      const ia = REGION_ORDER.indexOf(a);
      const ib = REGION_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [rows]);

  const currentRows = useMemo(
    () => rows.filter((r) => r.region === activeRegion),
    [rows, activeRegion]
  );

  const regionLabel = currentRows[0]?.region_label || '';
  const reportMonth = currentRows[0]?.report_month || '';

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg('Membaca file Excel...');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });

      const rowsToUpsert: Partial<WorkforceDemographic>[] = [];

      for (const sheetName of workbook.SheetNames) {
        // Lewati sheet rekap gabungan ("Ho&reg") dan sheet lain di luar 6 region
        // detail -- strukturnya beda (kolomnya Lokasi, bukan Level/Grade/Posisi)
        // sehingga tidak bisa diproses dengan mapping kolom yang sama.
        if (!IMPORTABLE_SHEETS.includes(sheetName)) continue;

        const sheet = workbook.Sheets[sheetName];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

        const monthRaw = cellStr(raw[3]?.[1]).replace(/^:\s*/, '');
        const regionLabelRaw = cellStr(raw[4]?.[1]).replace(/^:\s*/, '');

        let currentNo: number | null = null;
        let currentLevel = '';
        let rowOrder = 0;

        // Data body dimulai dari baris ke-9 di Excel = index 8 (0-based).
        for (let r = 8; r < raw.length; r++) {
          const row = raw[r];
          if (!row || row.every((c) => c === null || c === '')) continue;

          const noCell = row[0];
          const levelCell = row[1];
          const gradeCell = cellStr(row[2]);
          const positionCell = cellStr(row[3]);
          const numberOfEmp = row[4];

          // Baris rekap persentase (mis. 0.0671...) typeof-nya tetap "number",
          // jadi pengecekan typeof saja tidak cukup untuk menyaringnya.
          // "Jml Peg." data karyawan sungguhan selalu bilangan bulat (jumlah
          // orang), sehingga baris persentase otomatis kelewat di sini.
          if (typeof numberOfEmp !== 'number' || !Number.isInteger(numberOfEmp)) continue;

          const isGrandTotal = typeof noCell === 'string' && noCell.toUpperCase().includes('TOTAL ALL GRADE');

          if (!isGrandTotal) {
            if (typeof noCell === 'number') currentNo = noCell;
            if (typeof levelCell === 'string' && levelCell.trim()) currentLevel = levelCell.trim();
          }

          const isTotalRow = isGrandTotal || gradeCell.toUpperCase().startsWith('TOTAL');

          const record: Partial<WorkforceDemographic> = {
            region: sheetName,
            region_label: regionLabelRaw,
            report_month: monthRaw,
            row_order: rowOrder++,
            no: isGrandTotal ? null : currentNo,
            level: isGrandTotal ? '' : currentLevel,
            grade: isGrandTotal ? '' : gradeCell,
            position: isGrandTotal ? 'TOTAL ALL GRADE' : positionCell,
            is_total_row: isTotalRow,
            is_grand_total: isGrandTotal,
          };

          NUMERIC_COLUMNS.forEach((col, idx) => {
            const val = row[4 + idx];
            record[col] = (typeof val === 'number' ? val : 0) as never;
          });

          rowsToUpsert.push(record);
        }
      }

      if (rowsToUpsert.length === 0) {
        setImportMsg('Tidak ada baris data yang cocok ditemukan di file ini.');
      } else {
        setImportMsg(`Mengunggah ${rowsToUpsert.length} baris ke database...`);
        const BATCH = 300;
        for (let i = 0; i < rowsToUpsert.length; i += BATCH) {
          const batch = rowsToUpsert.slice(i, i + BATCH);
          const { error } = await db
            .from('workforce_demographics')
            .upsert(batch, { onConflict: 'region,report_month,row_order' });
          if (error) throw error;
        }
        setImportMsg(`Selesai. ${rowsToUpsert.length} baris berhasil diimpor/diperbarui.`);
        await load();
      }
    } catch (err: unknown) {
      console.error(err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : String(err);
      setImportMsg(`Gagal mengimpor file: ${message}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <PageHeader
        title="Rekap Demografi Karyawan"
        subtitle="Jumlah karyawan per level/grade, dipecah usia, masa kerja, pendidikan, agama & status nikah"
        icon={<Users2 className="w-6 h-6 text-sky-600" />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
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

      {loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <Card className="p-6">
          <EmptyState message="Belum ada data rekap. Klik 'Import dari Excel' untuk mengunggah file laporan Employee Data." />
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
            {regions.map((r) => (
              <button
                key={r}
                onClick={() => setActiveRegion(r)}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeRegion === r
                    ? 'border-sky-500 text-sky-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {(regionLabel || reportMonth) && (
            <p className="mb-3 text-sm text-slate-500">
              {regionLabel} {reportMonth && `\u00b7 Bulan: ${reportMonth}`}
            </p>
          )}

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-xs whitespace-nowrap border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    {HEADER_GROUPS.map((g, i) => (
                      <th
                        key={i}
                        colSpan={g.span}
                        className="px-2 py-2 font-semibold text-slate-700 border border-slate-200 text-center"
                      >
                        {g.label}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-slate-50">
                    <th className="px-2 py-1.5 border border-slate-200 text-left">No</th>
                    <th className="px-2 py-1.5 border border-slate-200 text-left">Level</th>
                    <th className="px-2 py-1.5 border border-slate-200 text-left">Grade</th>
                    <th className="px-2 py-1.5 border border-slate-200 text-left min-w-[220px]">Posisi</th>
                    <th className="px-2 py-1.5 border border-slate-200"></th>
                    {HEADER_GROUPS.slice(2).map((g, gi) =>
                      g.sub
                        ? g.sub.map((s, si) => (
                            <th key={`${gi}-${si}`} className="px-2 py-1.5 border border-slate-200">
                              {s}
                            </th>
                          ))
                        : [<th key={`${gi}-0`} className="px-2 py-1.5 border border-slate-200"></th>]
                    )}
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((r) => (
                    <tr
                      key={r.id}
                      className={
                        r.is_grand_total
                          ? 'bg-sky-50 font-semibold text-slate-900'
                          : r.is_total_row
                          ? 'bg-slate-50 font-medium text-slate-800'
                          : 'hover:bg-slate-50 text-slate-700'
                      }
                    >
                      <td className="px-2 py-1.5 border border-slate-100">{r.no ?? ''}</td>
                      <td className="px-2 py-1.5 border border-slate-100">{r.level}</td>
                      <td className="px-2 py-1.5 border border-slate-100">{r.grade}</td>
                      <td className="px-2 py-1.5 border border-slate-100 whitespace-normal min-w-[220px]">
                        {r.position}
                      </td>
                      <td className="px-2 py-1.5 border border-slate-100 text-center">{fmt(r.number_of_emp)}</td>
                      {NUMERIC_COLUMNS.slice(1).map((col) => (
                        <td key={String(col)} className="px-2 py-1.5 border border-slate-100 text-center">
                          {fmt(r[col] as number)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}