import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Mail, MessageCircle, Pencil, Trash2, MapPin, User2, Info, ClipboardCheck, Video } from 'lucide-react';
import { db, type InterviewScheduleWithApplicant, type JobApplicant } from '@/lib/database';
import { INTERVIEW_TRIGGER_STAGES } from '@/lib/recruitment';
import { PageHeader, Card, Badge, LoadingState, EmptyState } from '@/components/ui';
import InterviewScheduleModal from '@/components/recruitment/InterviewScheduleModal';
import ScheduleCandidateDetailModal from '@/components/recruitment/ScheduleCandidateDetailModal';
import { getPsychotestName } from '@/lib/psychotests';

// ---------------------------------------------------------------------------
// Menampilkan semua jadwal Psikotest/Interview User/Interview Final yang
// dibuat lewat halaman "Lamaran Kandidat". HR bisa mengedit jadwal, mengirim
// ulang notifikasi WA/Email, atau menghapus jadwal dari sini.
// ---------------------------------------------------------------------------

const STAGE_FILTERS = ['Semua', ...INTERVIEW_TRIGGER_STAGES] as const;
const STAGE_BADGE_COLORS: Record<string, string> = {
  Psikotest: 'yellow',
  'Interview User': 'sky',
  'Interview Final': 'blue',
};
const STAGE_FILTER_CLASSES: Record<string, { active: string; inactive: string }> = {
  Psikotest: {
    active: 'border-yellow-400 bg-yellow-50 text-yellow-800',
    inactive: 'border-yellow-200 bg-yellow-50/40 text-yellow-700 hover:border-yellow-300',
  },
  'Interview User': {
    active: 'border-sky-400 bg-sky-50 text-sky-800',
    inactive: 'border-sky-200 bg-sky-50/40 text-sky-700 hover:border-sky-300',
  },
  'Interview Final': {
    active: 'border-blue-400 bg-blue-50 text-blue-800',
    inactive: 'border-blue-200 bg-blue-50/40 text-blue-700 hover:border-blue-300',
  },
};

function getStageFilterClass(stage: string, active: boolean) {
  if (stage === 'Semua') return active
    ? 'border-slate-500 bg-slate-100 text-slate-800'
    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300';
  const stageClasses = STAGE_FILTER_CLASSES[stage];
  return stageClasses ? stageClasses[active ? 'active' : 'inactive'] : 'border-slate-200 bg-white text-slate-600';
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function normalizeWhatsappPhone(value: string) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  else if (digits && !digits.startsWith('62')) digits = `62${digits}`;
  return digits;
}

function buildScheduleMessage(schedule: InterviewScheduleWithApplicant) {
  const applicant = schedule.job_applicants;
  return [
    `Halo ${applicant?.full_name || 'Kandidat'},`,
    '',
    `Kami ingin menginformasikan jadwal ${schedule.stage} untuk posisi ${applicant?.position || '-'}.`,
    `Tanggal: ${formatDate(schedule.scheduled_date)}`,
    `Jam: ${schedule.scheduled_time} WIB`,
    schedule.stage === 'Psikotest' && schedule.psychotest_types?.length
      ? `Tes yang harus dikerjakan: ${schedule.psychotest_types.map(getPsychotestName).join(', ')}`
      : null,
    schedule.location ? `Lokasi/Link: ${schedule.location}` : null,
    schedule.stage !== 'Psikotest' && schedule.interviewer_name ? `Pewawancara: ${schedule.interviewer_name}` : null,
    schedule.notes ? `Catatan: ${schedule.notes}` : null,
    applicant?.tracking_code ? `Kode lamaran: ${applicant.tracking_code}` : null,
    '',
    'Mohon konfirmasi kehadiran. Terima kasih.',
  ].filter(Boolean).join('\n');
}

export default function InterviewSchedulePage({ onNavigate }: { onNavigate?: (page: 'rt-offering') => void }) {
  const [items, setItems] = useState<InterviewScheduleWithApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<(typeof STAGE_FILTERS)[number]>('Semua');
  const [editTarget, setEditTarget] = useState<InterviewScheduleWithApplicant | null>(null);
  const [detailTarget, setDetailTarget] = useState<InterviewScheduleWithApplicant | null>(null);
  const [highlightedScheduleId, setHighlightedScheduleId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [completedApplicantIds, setCompletedApplicantIds] = useState<Set<string>>(new Set());
  const [showCompletedSchedules, setShowCompletedSchedules] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    const { data, error } = await db
      .from('interview_schedules')
      .select('*, job_applicants(*)')
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true });
    if (error) {
      setItems([]);
      setLoadError('Jadwal belum dapat dimuat. Periksa koneksi lalu coba muat ulang.');
      console.error('Gagal memuat jadwal interview:', error.message);
      setLoading(false);
      return;
    }
    const rows = (data as unknown as InterviewScheduleWithApplicant[]) || [];
    setItems(rows);
    const applicantIds = rows.map((row) => row.applicant_id).filter(Boolean);
    if (applicantIds.length) {
      const { data: assessmentRows } = await db
        .from('candidate_assessments')
        .select('applicant_id, assessment_type, notes')
        .in('applicant_id', applicantIds);
      const completedIds = new Set(
        ((assessmentRows || []) as Array<{ applicant_id: string; assessment_type: string; notes: string | null }>)
          .filter((assessment) => assessment.assessment_type === 'Interview User' || assessment.assessment_type === 'Interview Final' || Boolean(assessment.notes?.includes('"dimensions"')))
          .map((assessment) => assessment.applicant_id),
      );
      setCompletedApplicantIds(completedIds);
    } else {
      setCompletedApplicantIds(new Set());
    }
    const pendingId = sessionStorage.getItem('portal-highlight-interview-schedule-id');
    if (pendingId) {
      const pendingSchedule = rows.find((row) => row.id === pendingId);
      if (pendingSchedule) {
        setHighlightedScheduleId(pendingId);
        if (STAGE_FILTERS.includes(pendingSchedule.stage as (typeof STAGE_FILTERS)[number])) {
          setStageFilter(pendingSchedule.stage as (typeof STAGE_FILTERS)[number]);
        }
      }
      sessionStorage.removeItem('portal-highlight-interview-schedule-id');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!highlightedScheduleId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`schedule-card-${highlightedScheduleId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [highlightedScheduleId, items, stageFilter]);

  const filtered = useMemo(() => {
    if (stageFilter === 'Semua') return items;
    return items.filter((s) => s.stage === stageFilter);
  }, [items, stageFilter]);

  const pendingSchedules = useMemo(() => filtered.filter((schedule) => !completedApplicantIds.has(schedule.applicant_id)), [filtered, completedApplicantIds]);
  const completedSchedules = useMemo(() => filtered.filter((schedule) => completedApplicantIds.has(schedule.applicant_id)), [filtered, completedApplicantIds]);

  const scheduleStats = useMemo(() => ({
    total: items.length,
    psychotest: items.filter((item) => item.stage === 'Psikotest').length,
    interviews: items.filter((item) => item.stage === 'Interview User' || item.stage === 'Interview Final').length,
  }), [items]);

  const remove = async (id: string) => {
    if (!confirm('Hapus jadwal ini? Notifikasi yang sudah terkirim tidak bisa ditarik kembali.')) return;
    await db.from('interview_schedules').delete().eq('id', id);
    load();
  };

  if (detailTarget && detailTarget.job_applicants) {
    return (
      <ScheduleCandidateDetailModal
        schedule={detailTarget}
        onClose={() => setDetailTarget(null)}
        onSaved={load}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Jadwal Psikotest & Interview"
        subtitle="Lihat jadwal kandidat, lalu hubungi melalui Email atau WhatsApp dengan pesan yang sudah terisi sesuai jadwal."
        icon={<CalendarClock className="w-6 h-6 text-sky-600" />}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3 border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><CalendarClock size={19} /></span>
          <div><p className="text-2xl font-bold text-slate-900">{scheduleStats.total}</p><p className="text-xs font-medium text-slate-500">Total jadwal</p></div>
        </Card>
        <Card className="flex items-center gap-3 border-amber-100 bg-gradient-to-br from-white to-amber-50/70 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><ClipboardCheck size={19} /></span>
          <div><p className="text-2xl font-bold text-slate-900">{scheduleStats.psychotest}</p><p className="text-xs font-medium text-slate-500">Psikotest</p></div>
        </Card>
        <Card className="flex items-center gap-3 border-sky-100 bg-gradient-to-br from-white to-sky-50/70 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><Video size={19} /></span>
          <div><p className="text-2xl font-bold text-slate-900">{scheduleStats.interviews}</p><p className="text-xs font-medium text-slate-500">Interview</p></div>
        </Card>
      </div>

      <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        {STAGE_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStageFilter(s)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${getStageFilterClass(s, stageFilter === s)}`}
          >
            {s === 'Semua' ? 'Semua jadwal' : s}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : loadError ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50/70 p-5">
          <div className="flex items-start gap-3"><Info size={18} className="mt-0.5 text-amber-700" /><div><p className="text-sm font-semibold text-slate-800">Jadwal belum tersedia</p><p className="mt-1 text-xs text-slate-600">{loadError}</p></div></div>
          <button onClick={load} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">Coba muat ulang</button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8">
          <EmptyState message={items.length ? 'Tidak ada jadwal pada tahap ini. Pilih filter lain untuk melihat jadwal lainnya.' : 'Jadwal akan muncul di sini setelah kandidat dijadwalkan untuk Psikotest atau Interview.'} />
        </Card>
      ) : (
        <div className="space-y-6">
          {[
            { key: 'pending', title: 'Jadwal Belum Interview', items: pendingSchedules },
            { key: 'completed', title: 'Sudah Interview', items: completedSchedules },
          ].map((group) => group.items.length > 0 && (
          <section key={group.key}>
            <div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><h2 className="text-base font-bold text-slate-900">{group.title}</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{group.items.length}</span></div>{group.key === 'completed' && <button onClick={() => setShowCompletedSchedules((value) => !value)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">{showCompletedSchedules ? 'Sembunyikan' : 'Tampilkan daftar'}</button>}</div>
            {(group.key !== 'completed' || showCompletedSchedules) && <div className="space-y-3">
          {group.items.map((s) => {
            const message = buildScheduleMessage(s);
            const email = s.job_applicants?.email?.trim();
            const whatsappNumber = normalizeWhatsappPhone(s.job_applicants?.phone || '');
            const subject = encodeURIComponent(`Jadwal ${s.stage} — ${s.job_applicants?.position || ''}`);
            const body = encodeURIComponent(message);
            return (
            <div
              id={`schedule-card-${s.id}`}
              key={s.id}
              className="scroll-mt-24"
              role="button"
              tabIndex={0}
              onClick={() => setDetailTarget(s)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setDetailTarget(s);
              }}
              aria-label={`Lihat detail kandidat ${s.job_applicants?.full_name || ''}`}
            >
            <Card className={`overflow-hidden p-0 transition-colors ${highlightedScheduleId === s.id ? 'border-sky-400 ring-4 ring-sky-100' : ''}`}>
              <div className={`border-l-4 p-4 sm:p-5 ${s.stage === 'Psikotest' ? 'border-amber-400' : 'border-sky-400'}`}>
                <div className="grid gap-4 md:grid-cols-[132px_minmax(0,1fr)_auto] md:items-center">
                  <div className="rounded-2xl bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{formatDate(s.scheduled_date)}</p>
                    <p className="mt-1 font-display text-xl font-bold text-slate-900">{s.scheduled_time}<span className="ml-1 text-[10px] font-semibold text-slate-500">WIB</span></p>
                  </div>

                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge text={s.stage} color={STAGE_BADGE_COLORS[s.stage] || 'slate'} />
                      {completedApplicantIds.has(s.applicant_id) && <Badge text="Sudah Interview" color="green" />}
                      <span className="text-[11px] font-medium text-slate-400">Kode: {s.job_applicants?.tracking_code || '—'}</span>
                    </div>
                    <p className="truncate font-semibold text-slate-900">{s.job_applicants?.full_name || 'Kandidat tidak ditemukan'}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{s.job_applicants?.position || 'Posisi tidak tersedia'}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      {s.location && <span className="inline-flex items-center gap-1.5"><MapPin size={13} className="shrink-0 text-slate-400" />{s.location}</span>}
                      {s.stage === 'Psikotest' && s.psychotest_types?.length ? <span className="inline-flex items-center gap-1.5"><ClipboardCheck size={13} className="shrink-0 text-amber-500" />Tes: {s.psychotest_types.map(getPsychotestName).join(', ')}</span> : null}
                      {s.stage !== 'Psikotest' && s.interviewer_name && <span className="inline-flex items-center gap-1.5"><User2 size={13} className="shrink-0 text-slate-400" />{s.interviewer_name}</span>}
                    </div>
                  </div>

                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {email && <a onClick={(event) => event.stopPropagation()} href={`mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`} title={`Hubungi ${email} melalui Email`} className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"><Mail size={14} /> Email</a>}
                      {whatsappNumber && <a onClick={(event) => event.stopPropagation()} href={`https://wa.me/${whatsappNumber}?text=${body}`} target="_blank" rel="noreferrer" title={`Hubungi ${s.job_applicants?.phone} melalui WhatsApp`} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"><MessageCircle size={14} /> Buka WhatsApp</a>}
                      <button onClick={(event) => { event.stopPropagation(); setEditTarget(s); }} title="Edit jadwal" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"><Pencil size={14} /> Edit</button>
                      <button onClick={(event) => { event.stopPropagation(); remove(s.id); }} title="Hapus jadwal" className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"><Trash2 size={14} /> Hapus</button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            </div>
          ); })}
            </div>}
          </section>
          ))}
        </div>
      )}

      {editTarget && editTarget.job_applicants && (
        <InterviewScheduleModal
          applicant={
            {
              id: editTarget.applicant_id,
              full_name: editTarget.job_applicants.full_name,
              email: editTarget.job_applicants.email,
              phone: editTarget.job_applicants.phone,
              position: editTarget.job_applicants.position,
              tracking_code: editTarget.job_applicants.tracking_code,
              status: editTarget.job_applicants.status,
            } as JobApplicant
          }
          stage={editTarget.stage}
          existingSchedule={editTarget}
          skipStatusUpdate
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            load();
          }}
        />
      )}

      {detailTarget && detailTarget.job_applicants && (
        <ScheduleCandidateDetailModal
          schedule={detailTarget}
          onClose={() => setDetailTarget(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
