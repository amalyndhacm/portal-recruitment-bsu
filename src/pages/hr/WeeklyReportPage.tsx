import { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Sparkles,
  Star,
  Table as TableIcon,
  List as ListIcon,
} from 'lucide-react';
import { db, type WeeklyReport as WeeklyReportBase } from '@/lib/database';
import {
  PageHeader,
  Card,
  Button,
  Input,
  TextArea,
  DateInput,
  Select,
  LoadingState,
  EmptyState,
  Badge,
} from '@/components/ui';

// ============================================================
// KONSTANTA
// ============================================================
const DIVISIONS = ['HR', 'Recruitment & Training', 'Compensation & Benefit', 'Gabungan (HR, R&T, Comben)'];

// ============================================================
// TYPES
// ============================================================
type Mode = 'list' | 'view' | 'form';

interface ReportTableSection {
  kind: 'table';
  id: string;
  title: string;
  columns: string[];
  rows: string[][];
  totalLabel?: string;
  totalValue?: string;
}

interface ReportListSection {
  kind: 'list';
  id: string;
  title: string;
  items: string[];
}

interface ReportHighlightSection {
  kind: 'highlight';
  id: string;
  label: string;
  value: string;
}

type ReportSection = ReportTableSection | ReportListSection | ReportHighlightSection;

interface WeeklyReportContent {
  periodLabel?: string;
  sections: ReportSection[];
  preparedByName?: string;
  preparedByRole?: string;
  approvedByName?: string;
  approvedByRole?: string;
}

// WeeklyReport dari '@/lib/database' digabung dengan field tambahan
// (period_end_date, description, content) yang dipakai fitur ini.
// Jika field-field ini belum ada di tabel/tipe aslinya, tambahkan juga
// di skema aplikasi & tipe WeeklyReportBase.
type WeeklyReport = WeeklyReportBase & {
  period_end_date?: string | null;
  description?: string | null;
  content?: WeeklyReportContent;
};

// ============================================================
// HELPERS
// ============================================================
function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function emptyContent(): WeeklyReportContent {
  return {
    periodLabel: '',
    sections: [],
    preparedByName: '',
    preparedByRole: '',
    approvedByName: '',
    approvedByRole: '',
  };
}

function buildAgustusSampleContent(): WeeklyReportContent {
  return {
    periodLabel: '24 - 30 Agustus 2026',
    sections: [
      {
        kind: 'table',
        id: newId(),
        title: 'Rekrutmen',
        columns: ['Posisi', 'Jumlah Pelamar', 'Status'],
        rows: [
          ['Staff HR', '12', 'Proses Interview'],
          ['Staff Comben', '8', 'Seleksi Berkas'],
        ],
        totalLabel: 'Total Pelamar',
        totalValue: '20',
      },
      {
        kind: 'list',
        id: newId(),
        title: 'Kegiatan Minggu Ini',
        items: [
          'Onboarding karyawan baru divisi Produksi',
          'Sosialisasi kebijakan BPJS terbaru',
          'Rapat koordinasi payroll bulanan',
        ],
      },
      {
        kind: 'highlight',
        id: newId(),
        label: 'Total Karyawan Aktif',
        value: '245',
      },
    ],
    preparedByName: 'Nama Staff HR',
    preparedByRole: 'Staff HR & Comben',
    approvedByName: 'Nama Manager',
    approvedByRole: 'HR Manager',
  };
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function WeeklyReportPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('list');
  const [activeReport, setActiveReport] = useState<WeeklyReport | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [division, setDivision] = useState('');
  const [title, setTitle] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [periodEndDate, setPeriodEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState<WeeklyReportContent>(emptyContent());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db
      .from('weekly_reports')
      .select('*')
      .order('report_date', { ascending: false });
    if (error) {
      console.error('Gagal memuat laporan mingguan:', error.message);
    }
    setReports((data as WeeklyReport[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setDivision('');
    setTitle('Laporan Mingguan Bagian HR & Comben');
    setReportDate('');
    setPeriodEndDate('');
    setDescription('');
    setContent(emptyContent());
  };

  const startCreate = () => {
    resetForm();
    setMode('form');
  };

  const startEdit = (r: WeeklyReport) => {
    setEditingId(r.id);
    setDivision(r.division);
    setTitle(r.title);
    setReportDate(r.report_date);
    setPeriodEndDate(r.period_end_date || '');
    setDescription(r.description || '');
    setContent(r.content || emptyContent());
    setMode('form');
  };

  const loadSample = () => {
    setDivision('Gabungan (HR, R&T, Comben)');
    setTitle('Laporan Mingguan Bagian HR & Comben');
    setReportDate('2026-08-24');
    setPeriodEndDate('2026-08-30');
    setDescription('Dokumen sumber: LAPORAN_MINGGUAN_BAGIAN_HR_24_-_30_Agustus_2026.pdf');
    setContent(buildAgustusSampleContent());
  };

  const submit = async () => {
    if (!division || !reportDate || !title) return;
    setSaving(true);
    const payload = {
      division,
      title,
      report_date: reportDate,
      period_end_date: periodEndDate || null,
      description: description || null,
      content,
    };
    if (editingId) {
      await db.from('weekly_reports').update(payload).eq('id', editingId);
    } else {
      await db.from('weekly_reports').insert(payload);
    }
    setSaving(false);
    setMode('list');
    load();
  };

  const remove = async (id: string) => {
    await db.from('weekly_reports').delete().eq('id', id);
    if (activeReport?.id === id) {
      setMode('list');
      setActiveReport(null);
    }
    load();
  };

  const openView = (r: WeeklyReport) => {
    setActiveReport(r);
    setMode('view');
  };

  // ---------- Section editing helpers ----------
  const updateSection = (id: string, updater: (s: ReportSection) => ReportSection) => {
    setContent((c) => ({ ...c, sections: c.sections.map((s) => (s.id === id ? updater(s) : s)) }));
  };

  const removeSection = (id: string) => {
    setContent((c) => ({ ...c, sections: c.sections.filter((s) => s.id !== id) }));
  };

  const addTableSection = () => {
    const s: ReportTableSection = { kind: 'table', id: newId(), title: 'Tabel Baru', columns: ['Kolom 1'], rows: [['']] };
    setContent((c) => ({ ...c, sections: [...c.sections, s] }));
  };

  const addListSection = () => {
    const s: ReportListSection = { kind: 'list', id: newId(), title: 'Daftar Baru', items: [''] };
    setContent((c) => ({ ...c, sections: [...c.sections, s] }));
  };

  const addHighlightSection = () => {
    const s: ReportHighlightSection = { kind: 'highlight', id: newId(), label: 'Total', value: '' };
    setContent((c) => ({ ...c, sections: [...c.sections, s] }));
  };

  return (
    <div>
      <PageHeader
        title="Laporan Mingguan"
        subtitle="Laporan Mingguan Bagian HR & Comben"
        icon={<FileText className="w-6 h-6 text-sky-600" />}
      />

      {mode === 'list' && (
        <ListView
          reports={reports}
          loading={loading}
          onCreate={startCreate}
          onOpen={openView}
          onEdit={startEdit}
          onDelete={remove}
        />
      )}

      {mode === 'view' && activeReport && (
        <DetailView report={activeReport} onBack={() => setMode('list')} onEdit={() => startEdit(activeReport)} />
      )}

      {mode === 'form' && (
        <FormView
          editingId={editingId}
          division={division}
          setDivision={setDivision}
          title={title}
          setTitle={setTitle}
          reportDate={reportDate}
          setReportDate={setReportDate}
          periodEndDate={periodEndDate}
          setPeriodEndDate={setPeriodEndDate}
          description={description}
          setDescription={setDescription}
          content={content}
          setContent={setContent}
          saving={saving}
          onCancel={() => setMode('list')}
          onSubmit={submit}
          onLoadSample={loadSample}
          updateSection={updateSection}
          removeSection={removeSection}
          addTableSection={addTableSection}
          addListSection={addListSection}
          addHighlightSection={addHighlightSection}
        />
      )}
    </div>
  );
}

// ============================================================
// LIST VIEW
// ============================================================
function ListView({
  reports,
  loading,
  onCreate,
  onOpen,
  onEdit,
  onDelete,
}: {
  reports: WeeklyReport[];
  loading: boolean;
  onCreate: () => void;
  onOpen: (r: WeeklyReport) => void;
  onEdit: (r: WeeklyReport) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div className="mb-6">
        <Button onClick={onCreate}>
          <Plus className="w-4 h-4 inline mr-1" /> Buat Laporan Mingguan
        </Button>
      </div>

      {loading ? (
        <LoadingState />
      ) : reports.length === 0 ? (
        <Card className="p-6">
          <EmptyState message="Belum ada laporan mingguan" />
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const sectionCount = r.content?.sections?.length ?? 0;
            return (
              <Card key={r.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <button className="flex-1 text-left" onClick={() => onOpen(r)}>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge text={r.division} color="sky" />
                      <span className="text-xs text-slate-400">
                        {r.report_date}
                        {r.period_end_date ? ` s/d ${r.period_end_date}` : ''}
                      </span>
                      {sectionCount > 0 && <Badge text={`${sectionCount} section`} color="slate" />}
                    </div>
                    <h3 className="font-semibold text-slate-900">{r.title}</h3>
                    {r.description && <p className="text-sm text-slate-600 mt-1">{r.description}</p>}
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onEdit(r)} className="p-2 text-slate-300 hover:text-sky-500 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(r.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

// ============================================================
// DETAIL VIEW (menampilkan laporan gaya PDF)
// ============================================================
function DetailView({ report, onBack, onEdit }: { report: WeeklyReport; onBack: () => void; onEdit: () => void }) {
  const content = report.content;
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Kembali ke daftar
        </button>
        <Button variant="secondary" onClick={onEdit}>
          <Pencil className="w-4 h-4 inline mr-1" /> Edit
        </Button>
      </div>

      <Card className="p-6 md:p-8">
        <div className="text-center border-b border-slate-200 pb-5 mb-6">
          <h2 className="text-xl font-bold text-slate-900 uppercase">{report.title}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {report.division}
            {content?.periodLabel ? ` · Periode ${content.periodLabel}` : ''}
          </p>
        </div>

        {report.description && <p className="text-sm text-slate-600 mb-6">{report.description}</p>}

        <div className="space-y-8">
          {(content?.sections || []).map((s) => (
            <SectionView key={s.id} section={s} />
          ))}
          {(!content || content.sections.length === 0) && <EmptyState message="Laporan ini belum punya isi section." />}
        </div>

        {(content?.preparedByName || content?.approvedByName) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10 pt-6 border-t border-slate-200">
            <div>
              <p className="text-sm text-slate-500 mb-8">Dibuat Oleh,</p>
              <p className="font-semibold text-slate-900 underline underline-offset-2">{content?.preparedByName || '-'}</p>
              <p className="text-xs italic text-slate-500">{content?.preparedByRole}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-8">Disetujui Oleh,</p>
              <p className="font-semibold text-slate-900 underline underline-offset-2">{content?.approvedByName || '-'}</p>
              <p className="text-xs italic text-slate-500">{content?.approvedByRole}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function SectionView({ section }: { section: ReportSection }) {
  if (section.kind === 'table') {
    return (
      <div>
        <h3 className="font-semibold text-slate-900 mb-2">{section.title}</h3>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-sky-50">
                {section.columns.map((c, i) => (
                  <th key={i} className="px-3 py-2 text-left font-semibold text-slate-700 border-b border-slate-200 whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, ri) => (
                <tr key={ri} className="odd:bg-white even:bg-slate-50">
                  {section.columns.map((_, ci) => (
                    <td key={ci} className="px-3 py-1.5 border-b border-slate-100 text-slate-700 whitespace-nowrap">
                      {row[ci] || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {section.totalLabel && (
          <div className="mt-2 flex justify-between bg-amber-100 text-amber-900 text-sm font-semibold px-3 py-2 rounded-lg">
            <span>{section.totalLabel}</span>
            <span>{section.totalValue}</span>
          </div>
        )}
      </div>
    );
  }
  if (section.kind === 'list') {
    return (
      <div>
        <h3 className="font-semibold text-slate-900 mb-2">{section.title}</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
          {section.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      </div>
    );
  }
  // highlight
  return (
    <div className="bg-amber-100 text-amber-900 font-semibold px-4 py-3 rounded-lg flex justify-between text-sm">
      <span>{section.label}</span>
      <span>{section.value}</span>
    </div>
  );
}

// ============================================================
// FORM VIEW (builder section per section)
// ============================================================
function FormView(props: {
  editingId: string | null;
  division: string;
  setDivision: (v: string) => void;
  title: string;
  setTitle: (v: string) => void;
  reportDate: string;
  setReportDate: (v: string) => void;
  periodEndDate: string;
  setPeriodEndDate: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  content: WeeklyReportContent;
  setContent: React.Dispatch<React.SetStateAction<WeeklyReportContent>>;
  saving: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  onLoadSample: () => void;
  updateSection: (id: string, updater: (s: ReportSection) => ReportSection) => void;
  removeSection: (id: string) => void;
  addTableSection: () => void;
  addListSection: () => void;
  addHighlightSection: () => void;
}) {
  const {
    editingId,
    division,
    setDivision,
    title,
    setTitle,
    reportDate,
    setReportDate,
    periodEndDate,
    setPeriodEndDate,
    description,
    setDescription,
    content,
    setContent,
    saving,
    onCancel,
    onSubmit,
    onLoadSample,
    updateSection,
    removeSection,
    addTableSection,
    addListSection,
    addHighlightSection,
  } = props;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">{editingId ? 'Edit Laporan Mingguan' : 'Laporan Mingguan Baru'}</h3>
          {!editingId && (
            <Button variant="secondary" onClick={onLoadSample}>
              <Sparkles className="w-4 h-4 inline mr-1" /> Muat Contoh dari PDF Agustus 2026
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Select label="Divisi" value={division} onChange={setDivision} options={DIVISIONS} required />
          <Input label="Judul Laporan" value={title} onChange={setTitle} required />
          <DateInput label="Periode Awal" value={reportDate} onChange={setReportDate} required />
          <DateInput label="Periode Akhir" value={periodEndDate} onChange={setPeriodEndDate} />
        </div>
        <div className="mb-2">
          <Input
            label="Label Periode (opsional, tampil di judul laporan)"
            value={content.periodLabel || ''}
            onChange={(v) => setContent((c) => ({ ...c, periodLabel: v }))}
            placeholder="contoh: 24 - 30 Agustus 2026"
          />
        </div>
        <div className="mb-2">
          <TextArea label="Catatan Singkat (opsional)" value={description} onChange={setDescription} />
        </div>
      </Card>

      <div className="space-y-4">
        {content.sections.map((s) => (
          <SectionEditor
            key={s.id}
            section={s}
            onChange={(updater) => updateSection(s.id, updater)}
            onRemove={() => removeSection(s.id)}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={addTableSection}>
          <TableIcon className="w-4 h-4 inline mr-1" /> Tambah Tabel
        </Button>
        <Button variant="secondary" onClick={addListSection}>
          <ListIcon className="w-4 h-4 inline mr-1" /> Tambah Daftar Poin
        </Button>
        <Button variant="secondary" onClick={addHighlightSection}>
          <Star className="w-4 h-4 inline mr-1" /> Tambah Ringkasan/Total
        </Button>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Tanda Tangan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Dibuat Oleh (Nama)"
            value={content.preparedByName || ''}
            onChange={(v) => setContent((c) => ({ ...c, preparedByName: v }))}
          />
          <Input
            label="Dibuat Oleh (Jabatan)"
            value={content.preparedByRole || ''}
            onChange={(v) => setContent((c) => ({ ...c, preparedByRole: v }))}
          />
          <Input
            label="Disetujui Oleh (Nama)"
            value={content.approvedByName || ''}
            onChange={(v) => setContent((c) => ({ ...c, approvedByName: v }))}
          />
          <Input
            label="Disetujui Oleh (Jabatan)"
            value={content.approvedByRole || ''}
            onChange={(v) => setContent((c) => ({ ...c, approvedByRole: v }))}
          />
        </div>
      </Card>

      <div className="flex gap-2">
        <Button onClick={onSubmit} disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Laporan'}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </div>
  );
}

function SectionEditor({
  section,
  onChange,
  onRemove,
}: {
  section: ReportSection;
  onChange: (updater: (s: ReportSection) => ReportSection) => void;
  onRemove: () => void;
}) {
  if (section.kind === 'table') {
    const s = section as ReportTableSection;
    const setTitleField = (v: string) => onChange((old) => ({ ...(old as ReportTableSection), title: v }));
    const setColumn = (i: number, v: string) =>
      onChange((old) => {
        const t = old as ReportTableSection;
        const columns = [...t.columns];
        columns[i] = v;
        return { ...t, columns };
      });
    const addColumn = () =>
      onChange((old) => {
        const t = old as ReportTableSection;
        return { ...t, columns: [...t.columns, `Kolom ${t.columns.length + 1}`], rows: t.rows.map((r) => [...r, '']) };
      });
    const removeColumn = (i: number) =>
      onChange((old) => {
        const t = old as ReportTableSection;
        return { ...t, columns: t.columns.filter((_, ci) => ci !== i), rows: t.rows.map((r) => r.filter((_, ci) => ci !== i)) };
      });
    const setCell = (ri: number, ci: number, v: string) =>
      onChange((old) => {
        const t = old as ReportTableSection;
        const rows = t.rows.map((r) => [...r]);
        rows[ri][ci] = v;
        return { ...t, rows };
      });
    const addRow = () =>
      onChange((old) => {
        const t = old as ReportTableSection;
        return { ...t, rows: [...t.rows, t.columns.map(() => '')] };
      });
    const removeRow = (ri: number) =>
      onChange((old) => {
        const t = old as ReportTableSection;
        return { ...t, rows: t.rows.filter((_, i) => i !== ri) };
      });

    return (
      <Card className="p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex-1">
            <Input label="Judul Tabel" value={s.title} onChange={setTitleField} />
          </div>
          <button onClick={onRemove} className="p-2 text-slate-300 hover:text-red-500 transition-colors mt-6">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-slate-200 rounded-lg">
            <thead>
              <tr className="bg-slate-50">
                {s.columns.map((c, ci) => (
                  <th key={ci} className="p-1.5 border-b border-slate-200">
                    <div className="flex items-center gap-1">
                      <input
                        value={c}
                        onChange={(e) => setColumn(ci, e.target.value)}
                        className="w-32 px-2 py-1 rounded border border-slate-300 text-xs font-semibold"
                      />
                      {s.columns.length > 1 && (
                        <button onClick={() => removeColumn(ci)} className="text-slate-300 hover:text-red-500">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="p-1.5 border-b border-slate-200 w-8">
                  <button onClick={addColumn} className="text-sky-500 hover:text-sky-700" title="Tambah kolom">
                    <Plus className="w-4 h-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((row, ri) => (
                <tr key={ri} className="odd:bg-white even:bg-slate-50">
                  {s.columns.map((_, ci) => (
                    <td key={ci} className="p-1">
                      <input
                        value={row[ci] || ''}
                        onChange={(e) => setCell(ri, ci, e.target.value)}
                        className="w-32 px-2 py-1 rounded border border-slate-200 text-xs"
                      />
                    </td>
                  ))}
                  <td className="p-1 text-center">
                    <button onClick={() => removeRow(ri)} className="text-slate-300 hover:text-red-500">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button onClick={addRow} className="mt-2 text-xs text-sky-600 hover:text-sky-800 flex items-center gap-1">
          <Plus className="w-3 h-3" /> Tambah baris
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          <Input
            label="Label Total (opsional, di-highlight kuning)"
            value={s.totalLabel || ''}
            onChange={(v) => onChange((old) => ({ ...(old as ReportTableSection), totalLabel: v }))}
          />
          <Input
            label="Nilai Total"
            value={s.totalValue || ''}
            onChange={(v) => onChange((old) => ({ ...(old as ReportTableSection), totalValue: v }))}
          />
        </div>
      </Card>
    );
  }

  if (section.kind === 'list') {
    const s = section as ReportListSection;
    const setTitleField = (v: string) => onChange((old) => ({ ...(old as ReportListSection), title: v }));
    const setItem = (i: number, v: string) =>
      onChange((old) => {
        const l = old as ReportListSection;
        const items = [...l.items];
        items[i] = v;
        return { ...l, items };
      });
    const addItem = () => onChange((old) => ({ ...(old as ReportListSection), items: [...(old as ReportListSection).items, ''] }));
    const removeItem = (i: number) =>
      onChange((old) => ({ ...(old as ReportListSection), items: (old as ReportListSection).items.filter((_, idx) => idx !== i) }));

    return (
      <Card className="p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex-1">
            <Input label="Judul Daftar" value={s.title} onChange={setTitleField} />
          </div>
          <button onClick={onRemove} className="p-2 text-slate-300 hover:text-red-500 transition-colors mt-6">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {s.items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">•</span>
              <input
                value={it}
                onChange={(e) => setItem(i, e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm"
              />
              <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="mt-2 text-xs text-sky-600 hover:text-sky-800 flex items-center gap-1">
          <Plus className="w-3 h-3" /> Tambah poin
        </button>
      </Card>
    );
  }

  // highlight
  const s = section as ReportHighlightSection;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Label" value={s.label} onChange={(v) => onChange((old) => ({ ...(old as ReportHighlightSection), label: v }))} />
          <Input label="Nilai" value={s.value} onChange={(v) => onChange((old) => ({ ...(old as ReportHighlightSection), value: v }))} />
        </div>
        <button onClick={onRemove} className="p-2 text-slate-300 hover:text-red-500 transition-colors mt-6">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
}