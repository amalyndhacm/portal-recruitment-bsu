import { useEffect, useMemo, useState } from 'react';
import { Wallet, FileSpreadsheet, UploadCloud, CheckCircle2, Trash2 } from 'lucide-react';
import { db, type SalaryRecap } from '@/lib/database';
import { PageHeader, Card, Button, LoadingState, EmptyState } from '@/components/ui';
import { parseSalaryRecapFile, type SalaryRecapRow } from '@/lib/salaryImport';

const GRADE_COLS = [
  { key: 'd3', label: 'D.3' }, { key: 'd2', label: 'D.2' }, { key: 'd1', label: 'D.1' },
  { key: 'm3', label: 'M.3' }, { key: 'm2', label: 'M.2' }, { key: 'm1', label: 'M.1' },
  { key: 'p3', label: 'P.3' }, { key: 'p2', label: 'P.2' }, { key: 'p1', label: 'P.1' },
] as const;

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function periodLabel(period: string | null) {
  if (!period) return 'Tanpa periode';
  const [y, m] = period.split('-');
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${bulan[Number(m) - 1] ?? m} ${y}`;
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

export default function SalaryRecapPage() {
  const [items, setItems] = useState<SalaryRecap[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');

  // --- Import dari Excel ---
  const [showImport, setShowImport] = useState(false);
  const [importPeriod, setImportPeriod] = useState(currentPeriod());
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<SalaryRecapRow[] | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await db.from('salary_recap').select('*').order('regional').order('location');
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const availablePeriods = useMemo(() => {
    const set = new Set(items.map((i) => i.period_month).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [items]);

  useEffect(() => {
    if (!selectedPeriod && availablePeriods.length > 0) setSelectedPeriod(availablePeriods[0]);
  }, [availablePeriods, selectedPeriod]);

  const remove = async (id: string) => {
    await db.from('salary_recap').delete().eq('id', id);
    load();
  };

  const processImportFile = async () => {
    if (!importFile) return;
    setParsing(true);
    setParseError(null);
    setPreview(null);
    try {
      const rows = await parseSalaryRecapFile(importFile);
      if (rows.length === 0) {
        setParseError('Tidak ada baris yang terbaca. Pastikan file punya sheet "REKAP GAJI" dengan header golongan (D/M/P).');
      }
      setPreview(rows);
    } catch (err) {
      setParseError('Gagal membaca file: ' + (err as Error).message);
    } finally {
      setParsing(false);
    }
  };

  const saveImport = async () => {
    if (!preview || preview.length === 0) return;
    setSaving(true);
    try {
      // Ganti (bukan tambah) data periode ini kalau sudah pernah diimport sebelumnya
      await db.from('salary_recap').delete().eq('period_month', importPeriod);
      const rowsWithPeriod = preview.map((r) => ({ ...r, period_month: importPeriod }));
      const chunkSize = 300;
      for (let i = 0; i < rowsWithPeriod.length; i += chunkSize) {
        await db.from('salary_recap').insert(rowsWithPeriod.slice(i, i + chunkSize));
      }
      setPreview(null);
      setImportFile(null);
      setShowImport(false);
      setSelectedPeriod(importPeriod);
      load();
    } finally {
      setSaving(false);
    }
  };

  const periodItems = useMemo(() => {
    if (selectedPeriod === 'all' || !selectedPeriod) return items;
    return items.filter((i) => i.period_month === selectedPeriod);
  }, [items, selectedPeriod]);

  const colTotal = (key: (typeof GRADE_COLS)[number]['key']) =>
    periodItems.reduce((s, i) => s + Number(i[key]), 0);
  const grandTotal = periodItems.reduce((s, i) => s + Number(i.total_gaji), 0);

  return (
    <div>
      <PageHeader
        title="Rekap Gaji"
        subtitle="Total gaji per lokasi & golongan (B.O.D / Manajemen / Labour) -- diisi lewat import Excel bulanan"
        icon={<Wallet className="h-6 w-6 text-sky-600" />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Periode:</label>
        <select
          value={selectedPeriod || 'all'}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="all">Semua Periode</option>
          {availablePeriods.map((p) => (
            <option key={p} value={p}>{periodLabel(p)}</option>
          ))}
        </select>
        {!showImport && (
          <Button variant="secondary" onClick={() => setShowImport(true)}>
            <FileSpreadsheet className="mr-1 inline h-4 w-4" /> Import dari Excel
          </Button>
        )}
      </div>

      {showImport && (
        <Card className="p-6 mb-6">
          <h3 className="mb-1 font-semibold text-slate-900">Import Rekap Gaji (Excel)</h3>
          <p className="mb-4 text-sm text-slate-500">
            Upload file payroll bulanan yang punya sheet "REKAP GAJI" (kolom golongan B.O.D/Manajemen/Labour
            dan Jumlah Gaji per lokasi). Kalau periode yang dipilih sudah pernah diimport, data lama periode
            itu akan <b>diganti</b>, jadi aman diimport ulang kalau ada revisi.
          </p>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Periode Laporan</label>
              <input
                type="month"
                value={importPeriod}
                onChange={(e) => setImportPeriod(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">File Excel Rekap Gaji</label>
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                className="text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-sky-700 hover:file:bg-sky-100"
              />
            </div>
          </div>

          {parseError && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{parseError}</div>}

          {!preview ? (
            <div className="flex gap-2">
              <Button onClick={processImportFile} disabled={parsing || !importFile}>
                <UploadCloud className="mr-1 inline h-4 w-4" /> {parsing ? 'Membaca file...' : 'Proses & Preview'}
              </Button>
              <Button variant="secondary" onClick={() => setShowImport(false)}>Batal</Button>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" /> {preview.length} baris lokasi siap disimpan untuk periode {periodLabel(importPeriod)}.
              </div>
              <div className="mb-4 max-h-64 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Regional</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Lokasi</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-700">Total Gaji</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 50).map((r, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="px-3 py-1.5">{r.regional || '-'}</td>
                        <td className="px-3 py-1.5">{r.location}</td>
                        <td className="px-3 py-1.5 text-right">{formatRupiah(r.total_gaji)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 50 && (
                  <p className="px-3 py-2 text-[11px] text-slate-400">...dan {preview.length - 50} baris lainnya (tidak ditampilkan semua di preview).</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={saveImport} disabled={saving}>
                  {saving ? 'Menyimpan...' : `Simpan ${preview.length} Data ke Periode ${periodLabel(importPeriod)}`}
                </Button>
                <Button variant="secondary" onClick={() => setPreview(null)}>Ulangi</Button>
                <Button variant="ghost" onClick={() => setShowImport(false)}>Batal</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {loading ? (
        <LoadingState />
      ) : periodItems.length === 0 ? (
        <Card className="p-6"><EmptyState message="Belum ada data rekap gaji pada periode ini. Gunakan Import dari Excel untuk mengisi." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Regional</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Lokasi</th>
                  {GRADE_COLS.map((g) => (
                    <th key={g.key} className="px-3 py-3 text-right font-semibold text-slate-700">{g.label}</th>
                  ))}
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Total Gaji</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {periodItems.map((i) => (
                  <tr key={i.id} className="table-row-hover border-b border-slate-100">
                    <td className="px-4 py-3 text-slate-600">{i.regional || '-'}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{i.location}</td>
                    {GRADE_COLS.map((g) => (
                      <td key={g.key} className="px-3 py-3 text-right text-slate-600">
                        {Number(i[g.key]) ? formatRupiah(Number(i[g.key])) : '-'}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-bold text-sky-700">{formatRupiah(Number(i.total_gaji))}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => remove(i.id)} className="p-1.5 text-slate-300 transition-colors hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-sky-200 bg-sky-50">
                  <td colSpan={2} className="px-4 py-3 text-right font-bold text-slate-900">Total</td>
                  {GRADE_COLS.map((g) => (
                    <td key={g.key} className="px-3 py-3 text-right font-bold text-slate-900">{formatRupiah(colTotal(g.key))}</td>
                  ))}
                  <td className="px-4 py-3 text-right text-lg font-bold text-sky-700">{formatRupiah(grandTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}