import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Trash2, FileSpreadsheet, UploadCloud, CheckCircle2 } from 'lucide-react';
import { db, type PersonnelAction } from '@/lib/database';
import { PageHeader, Card, Button, LoadingState, EmptyState, Badge } from '@/components/ui';
import { parsePersonnelActionsFile, type PersonnelActionRow } from '@/lib/paImport';

// Kategori PA -- persis mengikuti nama sheet di laporan Excel bulanan
// (PEGAWAI BARU, RESIGN, PHK, MUTASI, PROMOSI, DEMOSI, LULUS, TIDAK LULUS,
// PERPANJANG, NON JOB, TASK). Sheet "ALL PA" = tab Semua PA di bawah,
// dan sheet "REKAP JUMLAH PA" = tab Rekap (dihitung otomatis, bukan input manual).
const CATEGORIES = [
  { id: 'Karyawan Baru', label: 'Karyawan Baru', color: 'green' },
  { id: 'Resign', label: 'Resign', color: 'red' },
  { id: 'PHK', label: 'PHK', color: 'red' },
  { id: 'Mutasi', label: 'Mutasi', color: 'blue' },
  { id: 'Promosi', label: 'Promosi', color: 'sky' },
  { id: 'Demosi', label: 'Demosi', color: 'yellow' },
  { id: 'Lulus', label: 'Lulus', color: 'green' },
  { id: 'Tidak Lulus', label: 'Tidak Lulus', color: 'slate' },
  { id: 'Perpanjang', label: 'Perpanjang', color: 'sky' },
  { id: 'Non Job', label: 'Non Job', color: 'yellow' },
  { id: 'Task', label: 'Task', color: 'blue' },
] as const;

type CategoryId = (typeof CATEGORIES)[number]['id'];

// Urutan golongan sesuai kolom rekap di Excel: D.3 - D.2 - D.1 - M.3 - M.2 - M.1 - P.3 - P.2 - P.1
const GRADES = ['D.3', 'D.2', 'D.1', 'M.3', 'M.2', 'M.1', 'P.3', 'P.2', 'P.1'];

const categoryColor = (id: string) => CATEGORIES.find((c) => c.id === id)?.color || 'slate';

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

export default function PersonnelActionsPage() {
  const [items, setItems] = useState<PersonnelAction[]>([]);
  const [loading, setLoading] = useState(true);
  // Tab aktif: 'all' (Semua PA), 'rekap' (Rekap otomatis), atau salah satu kategori
  const [activeTab, setActiveTab] = useState<'all' | 'rekap' | CategoryId>('all');

  // --- Filter periode (semua tab & rekap mengikuti periode yang dipilih di sini) ---
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');

  // --- Import dari Excel (file Report PA bulanan) -- satu-satunya cara menambah data ---
  const [showImport, setShowImport] = useState(false);
  const [importPeriod, setImportPeriod] = useState(currentPeriod());
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PersonnelActionRow[] | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await db
      .from('personnel_actions')
      .select('*')
      .order('effective_date', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Daftar periode yang tersedia di data, terbaru duluan
  const availablePeriods = useMemo(() => {
    const set = new Set((items.map((i) => i.period_month).filter(Boolean) as string[]));
    return Array.from(set).sort().reverse();
  }, [items]);

  // Default pilih periode terbaru begitu data pertama kali dimuat
  useEffect(() => {
    if (!selectedPeriod && availablePeriods.length > 0) {
      setSelectedPeriod(availablePeriods[0]);
    }
  }, [availablePeriods, selectedPeriod]);

  const remove = async (id: string) => {
    await db.from('personnel_actions').delete().eq('id', id);
    load();
  };

  // Baca file Report PA di browser, tampilkan preview dulu sebelum disimpan
  const processImportFile = async () => {
    if (!importFile) return;
    setParsing(true);
    setParseError(null);
    setPreview(null);
    try {
      const rows = await parsePersonnelActionsFile(importFile);
      if (rows.length === 0) {
        setParseError('Tidak ada baris yang terbaca. Pastikan file adalah "Report PA" bulanan dengan sheet PEGAWAI BARU / RESIGN / PHK / dst.');
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
      // Hapus dulu data PA milik periode ini (kalau sebelumnya sudah pernah
      // diimport), supaya re-import bulan yang sama MENGGANTI, bukan menumpuk.
      await db.from('personnel_actions').delete().eq('period_month', importPeriod);

      const rowsWithPeriod = preview.map((r) => ({ ...r, period_month: importPeriod }));
      const chunkSize = 300;
      for (let i = 0; i < rowsWithPeriod.length; i += chunkSize) {
        await db.from('personnel_actions').insert(rowsWithPeriod.slice(i, i + chunkSize));
      }
      setPreview(null);
      setImportFile(null);
      setShowImport(false);
      setActiveTab('all');
      setSelectedPeriod(importPeriod);
      load();
    } finally {
      setSaving(false);
    }
  };

  // Baris sesuai periode yang dipilih (atau semua kalau selectedPeriod === 'all')
  const periodItems = useMemo(() => {
    if (selectedPeriod === 'all' || !selectedPeriod) return items;
    return items.filter((i) => i.period_month === selectedPeriod);
  }, [items, selectedPeriod]);

  // Baris yang ditampilkan sesuai tab aktif (Semua PA = semua baris periode ini, kategori = filter action_type)
  const visibleItems = useMemo(() => {
    if (activeTab === 'all' || activeTab === 'rekap') return periodItems;
    return periodItems.filter((i) => i.action_type === activeTab);
  }, [periodItems, activeTab]);

  // Rekap otomatis: total per kategori x golongan, mengikuti periode yang dipilih.
  const rekap = useMemo(() => {
    const table: Record<string, Record<string, number>> = {};
    for (const cat of CATEGORIES) table[cat.id] = {};
    for (const item of periodItems) {
      const cat = table[item.action_type];
      if (!cat) continue;
      const g = item.grade || 'Tanpa golongan';
      cat[g] = (cat[g] || 0) + 1;
    }
    return table;
  }, [periodItems]);

  const gradesUsed = useMemo(() => {
    const used = new Set<string>();
    for (const cat of Object.values(rekap)) {
      for (const g of Object.keys(cat)) used.add(g);
    }
    return GRADES.filter((g) => used.has(g)).concat(used.has('Tanpa golongan') ? ['Tanpa golongan'] : []);
  }, [rekap]);

  const rowTotal = (cat: string) => Object.values(rekap[cat] || {}).reduce((s, n) => s + n, 0);
  const colTotal = (grade: string) => CATEGORIES.reduce((s, c) => s + (rekap[c.id]?.[grade] || 0), 0);
  const grandTotal = CATEGORIES.reduce((s, c) => s + rowTotal(c.id), 0);

  return (
    <div>
      <PageHeader
        title="Personnel Action (PA)"
        subtitle="Karyawan baru, resign, mutasi, promosi, dan perubahan status lain -- diisi lewat import Excel bulanan, rekap dihitung otomatis"
        icon={<ArrowLeftRight className="h-6 w-6 text-teal-600" />}
      />

      {/* Filter periode -- berlaku untuk semua tab di bawah, termasuk Rekap */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Periode:</label>
        <select
          value={selectedPeriod || 'all'}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
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
          <h3 className="mb-1 font-semibold text-slate-900">Import Report PA (Excel)</h3>
          <p className="mb-4 text-sm text-slate-500">
            Upload file "Report PA" bulanan (contoh: 7__REPORT_PA_JULI_2026.xlsx). Semua kategori
            (Karyawan Baru, Resign, PHK, Mutasi, Promosi, Demosi, Lulus, Non Job, Task, Perpanjang) terbaca sekaligus.
            Kalau periode yang dipilih sudah pernah diimport sebelumnya, data lama periode itu akan <b>diganti</b>
            (bukan ditambah), jadi aman diimport ulang kalau ada revisi.
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
              <label className="block text-xs font-medium text-slate-700 mb-1">File Report PA</label>
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
                <CheckCircle2 className="h-4 w-4" /> {preview.length} baris siap disimpan untuk periode {periodLabel(importPeriod)}.
              </div>
              <div className="mb-4 max-h-64 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Nama</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Kategori</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Golongan</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Area</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Tgl Efektif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 50).map((r, idx) => (
                      <tr key={idx} className="border-b border-slate-100">
                        <td className="px-3 py-1.5">{r.employee_name}</td>
                        <td className="px-3 py-1.5"><Badge text={r.action_type} color={categoryColor(r.action_type)} /></td>
                        <td className="px-3 py-1.5">{r.grade || '-'}</td>
                        <td className="px-3 py-1.5">{r.area}</td>
                        <td className="px-3 py-1.5">{r.effective_date}</td>
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

      {/* Tab: Semua PA, satu tab per kategori, lalu Rekap */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('all')}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'all' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Semua PA
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveTab(c.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === c.id ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {c.label}
          </button>
        ))}
        <button
          onClick={() => setActiveTab('rekap')}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'rekap' ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Rekap
        </button>
      </div>

      {activeTab === 'rekap' ? (
        // ---- Tab Rekap: pivot otomatis, sesuai periode yang dipilih ----
        loading ? (
          <LoadingState />
        ) : grandTotal === 0 ? (
          <Card className="p-6"><EmptyState message="Belum ada data PA untuk direkap pada periode ini" /></Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Kategori</th>
                    {gradesUsed.map((g) => (
                      <th key={g} className="px-4 py-3 text-right font-semibold text-slate-700">{g}</th>
                    ))}
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {CATEGORIES.map((c) => (
                    <tr key={c.id} className="table-row-hover border-b border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{c.label}</td>
                      {gradesUsed.map((g) => (
                        <td key={g} className="px-4 py-3 text-right text-slate-600">{rekap[c.id]?.[g] || 0}</td>
                      ))}
                      <td className="px-4 py-3 text-right font-bold text-teal-700">{rowTotal(c.id)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-teal-200 bg-teal-50">
                    <td className="px-4 py-3 font-bold text-slate-900">Total</td>
                    {gradesUsed.map((g) => (
                      <td key={g} className="px-4 py-3 text-right font-bold text-slate-900">{colTotal(g)}</td>
                    ))}
                    <td className="px-4 py-3 text-right text-lg font-bold text-teal-700">{grandTotal}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )
      ) : (
        // ---- Tab Semua PA / per kategori: log data (sesuai periode dipilih) ----
        <>
          {loading ? (
            <LoadingState />
          ) : visibleItems.length === 0 ? (
            <Card className="p-6"><EmptyState message="Belum ada catatan pada kategori & periode ini. Gunakan Import dari Excel untuk mengisi." /></Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Nama</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Jabatan</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Golongan</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Area</th>
                      {activeTab === 'all' && <th className="px-4 py-3 text-left font-semibold text-slate-700">Kategori</th>}
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Periode</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Tgl Efektif</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Keterangan</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((r) => (
                      <tr key={r.id} className="table-row-hover border-b border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-900">{r.employee_name}</td>
                        <td className="px-4 py-3 text-slate-600">{r.position || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{r.grade || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{r.area || '-'}</td>
                        {activeTab === 'all' && (
                          <td className="px-4 py-3"><Badge text={r.action_type} color={categoryColor(r.action_type)} /></td>
                        )}
                        <td className="px-4 py-3 text-slate-600">{periodLabel(r.period_month)}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {r.effective_date ? new Date(r.effective_date).toLocaleDateString('id-ID') : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {r.description || (r.action_type === 'Resign' ? r.resign_reason : '') || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => remove(r.id)} className="p-1.5 text-slate-300 transition-colors hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}