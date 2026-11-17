import { useEffect, useMemo, useState } from 'react';
import { Users2, Search, Trash2, ExternalLink, X, Mail, Phone, MapPin, GraduationCap, Download, Eye, Clock3, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { db, type JobApplicant } from '@/lib/database';
import { APPLICANT_STATUSES, APPLICANT_STATUS_COLORS, APPLICANT_TIMELINE_STAGES, isInterviewTriggerStage } from '@/lib/recruitment';
import InterviewScheduleModal from '@/components/recruitment/InterviewScheduleModal';
import { ensureCandidateOffering } from '@/lib/recruitmentModules';
import { PageHeader, Card, Button, Badge, LoadingState, EmptyState } from '@/components/ui';
import type { PageId } from '@/components/Layout';
import { notifyPortal } from '@/lib/portalNotifications';

// ---------------------------------------------------------------------------
// Halaman ini menggantikan editor tabel lama sebagai cara tim Recruitment
// & Training memindahkan kandidat dari satu tahap ke tahap berikutnya
// (Lamaran Masuk -> Screening -> Psikotest -> Interview User -> Interview
// Final -> Onboarding, atau Tidak Lolos). Perubahan status di sini otomatis
// muncul di "Cek Status Lamaran" milik kandidat di halaman publik Karier,
// karena keduanya membaca/menulis tabel `job_applicants` yang sama.
// ---------------------------------------------------------------------------

const STATUS_FILTERS = ['Semua', ...APPLICANT_STATUSES] as const;
const APPLICATION_DOCUMENTS = [
  { key: 'cv_surat_lamaran', label: 'CV & Surat Lamaran' },
  { key: 'ktp', label: 'KTP' },
  { key: 'kk', label: 'Kartu Keluarga (KK)' },
  { key: 'ijazah', label: 'Ijazah' },
  { key: 'sim_gada_pratama', label: 'SIM A/B1/B2/C / Gada Pratama' },
  { key: 'skck', label: 'SKCK' },
  { key: 'surat_keterangan_sehat', label: 'Surat Keterangan Sehat' },
  { key: 'rekening_bni', label: 'Nomor Rekening BNI' },
] as const;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function JobApplicantsPage({ onNavigate }: { onNavigate?: (page: PageId) => void } = {}) {
  const [items, setItems] = useState<JobApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('Semua');
  const [detail, setDetail] = useState<JobApplicant | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<{ applicant: JobApplicant; stage: string } | null>(null);
  const load = async () => {
    setLoading(true);
    const { data } = await db.from('job_applicants').select('*').order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((a) => {
      const matchStatus = statusFilter === 'Semua' || a.status === statusFilter;
      const matchQuery =
        !q ||
        a.full_name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.position.toLowerCase().includes(q) ||
        a.tracking_code.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [items, query, statusFilter]);

  const openDetails = async (applicant: JobApplicant) => {
    if (applicant.application_opened_at) {
      setDetail(applicant);
      return;
    }

    const openedAt = new Date().toISOString();
    setItems((list) => list.map((a) => (a.id === applicant.id ? { ...a, application_opened_at: openedAt } : a)));
    setDetail({ ...applicant, application_opened_at: openedAt });

    const { error } = await db
      .from('job_applicants')
      .update({ application_opened_at: openedAt })
      .eq('id', applicant.id)
      .is('application_opened_at', null);

    if (error) {
      setItems((list) => list.map((a) => (a.id === applicant.id ? { ...a, application_opened_at: null } : a)));
      setDetail((current) => current?.id === applicant.id ? { ...current, application_opened_at: null } : current);
      alert('Detail terbuka, tetapi status sudah dibaca belum berhasil disimpan. Periksa izin update tabel job_applicants.');
    }
  };

  const openApplicantFiles = (applicant: JobApplicant) => {
    if (!applicant.cv_link) {
      alert('Belum ada tautan CV atau berkas yang dilampirkan pada lamaran ini.');
      return;
    }
    window.open(applicant.cv_link, '_blank', 'noopener,noreferrer');
  };

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of APPLICANT_STATUSES) counts[s] = 0;
    for (const a of items) counts[a.status] = (counts[a.status] || 0) + 1;
    return counts;
  }, [items]);

  const updateStatus = async (applicant: JobApplicant, status: string) => {
    if (status === 'Offering') {
      const saved = await applyStatusChange(applicant, status);
      if (saved) onNavigate?.('rt-offering');
      return;
    }
    if (status === 'Onboarding') {
      const saved = await applyStatusChange(applicant, status);
      if (saved) onNavigate?.('rt-onboarding');
      return;
    }
    if (isInterviewTriggerStage(status)) {
      setSchedule({ applicant, stage: status });
      return;
    }
    await applyStatusChange(applicant, status);
  };

  const applyStatusChange = async (applicant: JobApplicant, status: string): Promise<boolean> => {
    setSavingId(applicant.id);
    const prev = items;
    // update optimis di tampilan supaya terasa responsif, dikembalikan lagi
    // kalau ternyata gagal disimpan
    setItems((list) => list.map((a) => (a.id === applicant.id ? { ...a, status } : a)));
    setDetail((current) => (current?.id === applicant.id ? { ...current, status } : current));
    const { error } = await db.from('job_applicants').update({ status }).eq('id', applicant.id);
    setSavingId(null);
    if (error) {
      setItems(prev);
      setDetail((current) => (current?.id === applicant.id ? applicant : current));
      alert('Gagal menyimpan perubahan status. Coba lagi.');
      return false;
    }
    notifyPortal('Status kandidat diperbarui', `${applicant.full_name} dipindahkan dari ${applicant.status} ke ${status}.`);
    if (status === 'Offering') {
      const result = await ensureCandidateOffering(applicant);
      if (result.id) sessionStorage.setItem('portal-open-offering-id', result.id);
      else alert(`Status kandidat tersimpan, tetapi proses Offering belum dibuat: ${result.error || 'coba buka Offering dan ulangi.'}`);
    }
    void load();
    return true;
  };

  const saveNotes = async (applicant: JobApplicant, notes: string) => {
    const { error } = await db.from('job_applicants').update({ internal_notes: notes }).eq('id', applicant.id);
    if (!error) {
      setItems((list) => list.map((a) => (a.id === applicant.id ? { ...a, internal_notes: notes } : a)));
      setDetail((d) => (d ? { ...d, internal_notes: notes } : d));
    }
  };
  const savePersonalData = async (applicant: JobApplicant, changes: Partial<JobApplicant>) => {
    const next = { ...applicant, ...changes };
    setItems((list) => list.map((a) => (a.id === applicant.id ? next : a)));
    setDetail((current) => current?.id === applicant.id ? next : current);
    const { error } = await db.from('job_applicants').update(changes).eq('id', applicant.id);
    if (error) alert('Data kandidat belum berhasil disimpan.');
  };

  const remove = async (id: string) => {
    if (!confirm('Hapus data lamaran ini? Tindakan ini tidak bisa dibatalkan.')) return;
    await db.from('job_applicants').delete().eq('id', id);
    setDetail((d) => (d && d.id === id ? null : d));
    load();
  };

  // Export daftar yang sedang tampil (mengikuti pencarian/filter status
  // aktif) ke Excel — kolomnya mengikuti seluruh data formulir pendaftaran.
  const exportExcel = () => {
    const rows = filtered.map((a) => ({
      'Kode Lamaran': a.tracking_code,
      Status: a.status,
      'Tanggal Masuk': formatDate(a.created_at),
      'Posisi Dilamar': a.position,
      'Area Penempatan': a.placement_area || '',
      'Nama Lengkap': a.full_name,
      'Tempat & Tanggal Lahir': a.birth_place_date || '',
      Usia: a.age ?? '',
      'Jenis Kelamin': a.gender || '',
      'Status Perkawinan': a.marital_status || '',
      Agama: a.religion || '',
      Email: a.email,
      'No. HP': a.phone,
      'Alamat KTP': a.ktp_address || '',
      'Alamat Domisili': a.domicile || '',
      'Pendidikan Terakhir': a.education || '',
      Jurusan: a.major || '',
      'Sekolah/Universitas': a.school_name || '',
      'Pengalaman Kerja 1': a.work_experience_1 || '',
      'Pengalaman Kerja 2': a.work_experience_2 || '',
      'Pengalaman Kerja 3': a.work_experience_3 || '',
      'Sudah Pernah Bekerja di PT BSU': a.previously_worked || '',
      'Sumber Informasi': a.referral_source || '',
      'Link CV': a.cv_link || '',
      'Catatan/Motivasi': a.cover_note || '',
      'Catatan Internal HR': a.internal_notes || '',
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, 'Lamaran Kandidat');
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Lamaran-Kandidat-${stamp}.xlsx`);
  };

  return (
    <div>
      <PageHeader
        title="Lamaran Kandidat"
        subtitle="Tinjau lamaran yang masuk, buka detail kandidat, lalu lanjutkan ke tahap seleksi yang sesuai."
        icon={<Users2 className="w-6 h-6 text-sky-600" />}
      />

      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-base font-bold text-slate-900">Kotak masuk lamaran</h2>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Lamaran baru ditandai dengan sorotan hijau dan titik pada profil. Klik kartu kandidat untuk membuka detail; penanda hilang setelah lamaran dibuka.</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <Button variant="secondary" onClick={exportExcel} disabled={filtered.length === 0}>
            <Download className="mr-1.5 inline h-4 w-4" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Ringkasan jumlah kandidat per tahap */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {APPLICANT_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter((prev) => (prev === s ? 'Semua' : s))}
            className={`rounded-xl border p-3 text-left transition-all ${
              statusFilter === s ? 'border-sky-400 bg-sky-50 ring-1 ring-sky-300' : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <p className="text-2xl font-bold text-slate-900">{stageCounts[s] || 0}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-slate-500">{s}</p>
          </button>
        ))}
      </div>

      {/* Pencarian & filter status */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, email, posisi, atau kode lamaran..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 transition focus:border-sky-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_FILTERS)[number])}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === 'Semua' ? 'Semua status' : s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            message={
              items.length === 0
                ? 'Belum ada lamaran yang masuk dari halaman Karier.'
                : 'Tidak ada lamaran yang cocok dengan pencarian/filter ini.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const isUnread = !a.application_opened_at;
            return (
              <Card key={a.id} className={`relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md ${isUnread ? 'border-emerald-200 bg-emerald-50/40 shadow-sm shadow-emerald-100' : 'border-slate-200'}`}>
                <div className={`border-l-4 p-4 sm:p-5 ${isUnread ? 'border-l-emerald-500' : 'border-l-transparent'}`}>
                  <button
                    type="button"
                    onClick={() => openDetails(a)}
                    aria-label={`Buka detail lamaran ${a.full_name}`}
                    className="absolute inset-0 z-10 cursor-pointer rounded-xl focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500"
                  />
                  <div className="pointer-events-none relative z-20 flex flex-col gap-4 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${isUnread ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {a.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                        {isUnread && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-left font-semibold text-slate-900 transition">
                            {a.full_name}
                          </span>
                          <Badge text={a.status} color={APPLICANT_STATUS_COLORS[a.status] || 'slate'} />
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-600">{a.position}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                          <span className="truncate">{a.email}</span>
                          <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatDate(a.created_at)}</span>
                          <span className="font-mono">{a.tracking_code}</span>
                        </div>
                      </div>
                    </div>
                    <div className="pointer-events-auto relative z-20 flex flex-wrap items-center gap-2 lg:shrink-0">
                      <select
                        value={a.status}
                        disabled={savingId === a.id}
                        onChange={(e) => updateStatus(a, e.target.value)}
                        aria-label={`Status lamaran ${a.full_name}`}
                        className="min-w-36 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60 sm:flex-none"
                      >
                        {APPLICANT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button onClick={() => openApplicantFiles(a)} title={a.cv_link ? 'Buka CV / berkas kandidat di tab baru' : 'Belum ada tautan CV / berkas'} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2">
                        <FileText className="h-4 w-4" /> Lihat berkas <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(a.id)} aria-label={`Hapus lamaran ${a.full_name}`} title="Hapus lamaran" className="rounded-xl border border-slate-200 p-2.5 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {detail && (
        <ApplicantDetailModal
          applicant={detail}
          onClose={() => setDetail(null)}
          onStatusChange={(status) => updateStatus(detail, status)}
          onSaveNotes={(notes) => saveNotes(detail, notes)}
          onSavePersonalData={(changes) => savePersonalData(detail, changes)}
          onDelete={() => remove(detail.id)}
        />
      )}

      {schedule && (
        <InterviewScheduleModal
          applicant={schedule.applicant}
          stage={schedule.stage}
          onClose={() => setSchedule(null)}
          onSaved={(scheduleId) => {
            setSchedule(null);
            if (onNavigate) {
              sessionStorage.setItem('portal-highlight-interview-schedule-id', scheduleId);
              onNavigate('rt-interview-schedule');
            } else {
              load();
            }
          }}
        />
      )}
    </div>
  );
}

function InfoItem({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : undefined}>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-slate-700">{value}</p>
    </div>
  );
}

function ApplicantDetailModal({
  applicant,
  onClose,
  onStatusChange,
  onSaveNotes,
  onSavePersonalData,
  onDelete,
}: {
  applicant: JobApplicant;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onSaveNotes: (notes: string) => void;
  onSavePersonalData: (changes: Partial<JobApplicant>) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(applicant.internal_notes || '');
  const [notesSaved, setNotesSaved] = useState(true);
  const [personalData, setPersonalData] = useState({ birth_place_date: applicant.birth_place_date || '', gender: applicant.gender || '', ktp_address: applicant.ktp_address || '' });

  const rejected = applicant.status === 'Tidak Lolos';
  const currentStageIndex = APPLICANT_TIMELINE_STAGES.findIndex((s) => s === applicant.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 font-bold text-sky-700">
              {applicant.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-lg font-bold text-slate-900">Detail Lamaran</h3>
              <p className="truncate text-xs text-slate-500">{applicant.full_name} <span className="px-1 text-slate-300">·</span> <span className="font-mono">{applicant.tracking_code}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge text={applicant.position} color="sky" />
            <Badge text={applicant.status} color={APPLICANT_STATUS_COLORS[applicant.status] || 'slate'} />
          </div>

          <div className="space-y-1.5 text-sm text-slate-600">
            <p className="flex items-center gap-2">
              <Mail size={14} className="text-slate-400" /> {applicant.email}
            </p>
            <p className="flex items-center gap-2">
              <Phone size={14} className="text-slate-400" /> {applicant.phone}
            </p>
            {applicant.placement_area && (
              <p className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" /> Area penempatan: {applicant.placement_area}
              </p>
            )}
            {applicant.domicile && (
              <p className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" /> {applicant.domicile}
              </p>
            )}
            {applicant.education && (
              <p className="flex items-center gap-2">
                <GraduationCap size={14} className="text-slate-400" />
                {applicant.education}{applicant.major ? ` — ${applicant.major}` : ''}{applicant.school_name ? `, ${applicant.school_name}` : ''}
              </p>
            )}
            {applicant.cv_link && (
              <a
                href={applicant.cv_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sky-600 hover:underline"
              >
                <ExternalLink size={14} /> Lihat CV / Portofolio
              </a>
            )}
          </div>

          <section className="rounded-xl border border-slate-200 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Checklist Dokumen (1–8)</h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {APPLICATION_DOCUMENTS.map((document) => {
                const status = applicant.document_checklist?.[document.key];
                const statusLabel = status === 'ada' ? 'Ada' : status === 'belum_ada' ? 'Belum Ada' : 'Belum Diisi';
                const statusClass = status === 'ada'
                  ? 'bg-emerald-50 text-emerald-700'
                  : status === 'belum_ada'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-slate-100 text-slate-500';
                return (
                  <div key={document.key} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs">
                    <span className="text-slate-600">{document.label}</span>
                    <span className={`shrink-0 rounded-full px-2 py-1 font-semibold ${statusClass}`}>{statusLabel}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-sky-200 bg-sky-50/50 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-sky-700">Data untuk Surat Kerja</h4>
            <p className="mt-1 text-xs text-slate-500">Lengkapi data kandidat lama di sini. Kandidat baru wajib mengisinya sejak formulir lamaran.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-600">Tempat & tanggal lahir<input value={personalData.birth_place_date} onChange={(e) => setPersonalData({ ...personalData, birth_place_date: e.target.value })} onBlur={(e) => void onSavePersonalData({ birth_place_date: e.target.value.trim() || null })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm" placeholder="Contoh: Malang, 17 Agustus 1990" /></label>
              <label className="text-xs font-medium text-slate-600">Jenis kelamin<select value={personalData.gender} onChange={(e) => { setPersonalData({ ...personalData, gender: e.target.value }); void onSavePersonalData({ gender: e.target.value || null }); }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm"><option value="">Pilih jenis kelamin</option><option value="Laki-laki">Laki-laki</option><option value="Perempuan">Perempuan</option></select></label>
              <label className="text-xs font-medium text-slate-600 sm:col-span-2">Alamat sesuai KTP<textarea value={personalData.ktp_address} onChange={(e) => setPersonalData({ ...personalData, ktp_address: e.target.value })} onBlur={(e) => void onSavePersonalData({ ktp_address: e.target.value.trim() || null })} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm" /></label>
            </div>
          </section>

          {/* Data pribadi & administrasi lengkap dari formulir pendaftaran */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            {applicant.birth_place_date && <InfoItem label="Ttl" value={applicant.birth_place_date} />}
            {applicant.age != null && <InfoItem label="Usia" value={String(applicant.age)} />}
            {applicant.gender && <InfoItem label="Jenis Kelamin" value={applicant.gender} />}
            {applicant.marital_status && <InfoItem label="Status Perkawinan" value={applicant.marital_status} />}
            {applicant.religion && <InfoItem label="Agama" value={applicant.religion} />}
            {applicant.previously_worked && <InfoItem label="Pernah bekerja di PT BSU" value={applicant.previously_worked} />}
            {applicant.referral_source && <InfoItem label="Sumber Info" value={applicant.referral_source} />}
            {applicant.ktp_address && <InfoItem label="Alamat KTP" value={applicant.ktp_address} full />}
          </div>

          {(applicant.work_experience_1 || applicant.work_experience_2 || applicant.work_experience_3) && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Pengalaman Kerja</p>
              <ul className="space-y-1 text-sm text-slate-600">
                {applicant.work_experience_1 && <li>1. {applicant.work_experience_1}</li>}
                {applicant.work_experience_2 && <li>2. {applicant.work_experience_2}</li>}
                {applicant.work_experience_3 && <li>3. {applicant.work_experience_3}</li>}
              </ul>
            </div>
          )}

          {applicant.cover_note && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Catatan dari Kandidat</p>
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{applicant.cover_note}</p>
            </div>
          )}

          {/* Ubah tahap — sama dengan dropdown di tabel, disediakan lagi di
              sini supaya bisa diubah langsung dari halaman detail. */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Ubah Tahap</p>
            <select
              value={applicant.status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {APPLICANT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Progres visual, sama seperti yang dilihat kandidat lewat "Cek
              Status Lamaran" — supaya HR bisa cek tampilannya dari sisi kandidat. */}
          {!rejected && currentStageIndex >= 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Progres yang Dilihat Kandidat
              </p>
              <div className="flex items-center">
                {APPLICANT_TIMELINE_STAGES.map((stage, i) => {
                  const done = i < currentStageIndex;
                  const active = i === currentStageIndex;
                  return (
                    <div key={stage} className="flex flex-1 items-center last:flex-none">
                      <div
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          done || active ? 'bg-emerald-500' : 'bg-slate-200'
                        }`}
                      />
                      {i < APPLICANT_TIMELINE_STAGES.length - 1 && (
                        <div className={`mx-1 h-0.5 flex-1 ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Catatan Internal HR</p>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesSaved(false);
              }}
              placeholder="Catatan hasil interview, feedback user, dll (tidak terlihat kandidat)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <div className="mt-2 flex items-center justify-between">
              <button
                onClick={() => {
                  onSaveNotes(notes);
                  setNotesSaved(true);
                }}
                disabled={notesSaved}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Simpan Catatan
              </button>
              <button onClick={onDelete} className="text-xs font-medium text-red-500 hover:text-red-600">
                Hapus Lamaran
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
