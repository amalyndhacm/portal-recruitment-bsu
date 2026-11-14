import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  ExternalLink,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Save,
  Star,
  User,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react';
import { db, type InterviewScheduleWithApplicant } from '@/lib/database';
import { APPLICANT_STATUS_COLORS, APPLICANT_STATUSES } from '@/lib/recruitment';
import {
  ASSESSMENT_RESULT_COLORS,
  type CandidateAssessment,
} from '@/lib/recruitmentModules';
import { Badge } from '@/components/ui';
import InterviewAssessmentPage from '@/pages/recruitment/InterviewAssessmentPage';

type CandidateDetails = NonNullable<InterviewScheduleWithApplicant['job_applicants']> & {
  birth_place_date?: string | null;
  domicile?: string | null;
  education?: string | null;
  major?: string | null;
  school_name?: string | null;
  age?: number | null;
  gender?: string | null;
  religion?: string | null;
  marital_status?: string | null;
  ktp_address?: string | null;
  work_experience_1?: string | null;
  work_experience_2?: string | null;
  work_experience_3?: string | null;
  cover_note?: string | null;
  internal_notes?: string | null;
  cv_link?: string | null;
  placement_area?: string | null;
  referral_source?: string | null;
};

type Props = {
  schedule: InterviewScheduleWithApplicant;
  onClose: () => void;
  onSaved: () => void;
  onNavigate?: (page: 'rt-offering') => void;
};

function normalizeWhatsappPhone(value: string) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  else if (digits && !digits.startsWith('62')) digits = `62${digits}`;
  return digits;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function DetailRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: unknown }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-0.5 break-words text-sm text-slate-800">{String(value)}</p></div>
    </div>
  );
}

export default function ScheduleCandidateDetailModal({ schedule, onClose, onSaved, onNavigate }: Props) {
  const candidate = schedule.job_applicants as CandidateDetails;
  const [assessments, setAssessments] = useState<CandidateAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPsychotest, setShowPsychotest] = useState(false);
  const [showAssessmentPage, setShowAssessmentPage] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusNotice, setStatusNotice] = useState('');
  const [savedInterviewSummary, setSavedInterviewSummary] = useState<{ score: number | null; result: string } | null>(null);
  const detailScrollRef = useRef<HTMLDivElement>(null);

  const whatsappNumber = normalizeWhatsappPhone(candidate?.phone || '');
  const whatsappMessage = encodeURIComponent(`Halo ${candidate?.full_name || 'Kandidat'}, kami ingin menindaklanjuti jadwal ${schedule.stage} Anda. Terima kasih.`);
  const meetingUrl = schedule.location?.match(/https?:\/\/[^\s]+/)?.[0] || 'https://teams.microsoft.com/meet/48947738504620?p=zZeR0MXIJyvSWQWLFW';
  const psychotestResults = useMemo(
    () => assessments.filter((item) => item.assessment_type === 'Psikotes' || item.assessment_type === 'Psikotest'),
    [assessments],
  );
  const interviewAssessments = useMemo(
    () => assessments.filter((item) => {
      if (item.assessment_type === 'Interview User' || item.assessment_type === 'Interview Final' || item.assessment_type === schedule.stage && schedule.stage !== 'Psikotest') return true;
      if (!item.notes) return false;
      try {
        const parsed = JSON.parse(item.notes) as { dimensions?: unknown };
        return Array.isArray(parsed.dimensions);
      } catch {
        return false;
      }
    }),
    [assessments, schedule.stage],
  );
  const latestInterviewAssessment = interviewAssessments[0];
  const displayAssessment = latestInterviewAssessment || savedInterviewSummary;
  const savedAverage = useMemo(() => {
    if (!latestInterviewAssessment?.notes) return latestInterviewAssessment?.score ?? null;
    try {
      const parsed = JSON.parse(latestInterviewAssessment.notes) as { dimensions?: Array<{ score: number | null }> };
      const scores = (parsed.dimensions || []).filter((item) => item.score !== null).map((item) => Number(item.score));
      return scores.length ? Math.round((scores.reduce((total, score) => total + score, 0) / scores.length) * 10) / 10 : latestInterviewAssessment.score ?? null;
    } catch {
      return latestInterviewAssessment.score ?? null;
    }
  }, [latestInterviewAssessment]);
  const displayAverage = savedInterviewSummary?.score ?? savedAverage;
  const experiences = [candidate?.work_experience_1, candidate?.work_experience_2, candidate?.work_experience_3].filter(Boolean) as string[];

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => { window.removeEventListener('keydown', handleEsc); };
  }, [onClose]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    db
      .from('candidate_assessments')
      .select('*')
      .eq('applicant_id', schedule.applicant_id)
      .order('assessed_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError('Riwayat penilaian belum dapat dimuat. Anda tetap bisa menambahkan penilaian.');
        setAssessments((data || []) as CandidateAssessment[]);
        setLoading(false);
      });
    return () => { active = false; };
  }, [schedule.applicant_id]);

  useEffect(() => {
    if (!showAssessmentPage) {
      requestAnimationFrame(() => detailScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' }));
    }
  }, [showAssessmentPage]);

  const updateStatus = async (status: string) => {
    if (status === candidate.status) return;
    setStatusSaving(true);
    setError('');
    const { error: statusError } = await db.from('job_applicants').update({ status }).eq('id', schedule.applicant_id);
    setStatusSaving(false);
    if (statusError) {
      setError('Status kandidat belum berhasil diperbarui.');
      return;
    }
    setError('Status kandidat berhasil diperbarui.');
    setStatusNotice(status === 'Onboarding' ? 'Tahap Offering dan Onboarding diproses melalui menu Offering & Pre-Employment agar persetujuan penawaran, dokumen, dan MCU tetap tercatat.' : '');
    onSaved();
  };

  const refreshAssessments = async () => {
    const { data } = await db
      .from('candidate_assessments')
      .select('*')
      .eq('applicant_id', schedule.applicant_id)
      .order('created_at', { ascending: false });
    setAssessments((data || []) as CandidateAssessment[]);
  };

  if (showAssessmentPage) {
    return <InterviewAssessmentPage schedule={schedule} onBack={() => setShowAssessmentPage(false)} onSaved={async (summary) => { if (summary) setSavedInterviewSummary(summary); await refreshAssessments(); onSaved(); }} />;
  }

  return (
    <div className="animate-fade-in">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-lg font-semibold text-white">{candidate?.full_name?.charAt(0).toUpperCase() || '?'}</div>
            <div className="min-w-0"><h2 className="truncate text-lg font-bold text-slate-900">{candidate?.full_name || 'Kandidat'}</h2><p className="truncate text-sm text-slate-500">{candidate?.position || 'Posisi tidak tersedia'}</p></div>
          </div>
          <button onClick={onClose} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200" aria-label="Kembali"><X className="h-5 w-5" /> Kembali</button>
        </div>

        <div ref={detailScrollRef} className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Badge text={candidate?.status || schedule.stage} color={APPLICANT_STATUS_COLORS[candidate?.status] || 'slate'} />
            <span className="text-xs text-slate-400">Kode: {candidate?.tracking_code || '—'}</span>
            {whatsappNumber && <a href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
            {candidate?.cv_link && <a href={candidate.cv_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800"><FileText className="h-4 w-4" /> Lihat CV <ExternalLink className="h-3.5 w-3.5" /></a>}
            <button onClick={() => setShowPsychotest((value) => !value)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"><ClipboardList className="h-4 w-4" />{showPsychotest ? 'Sembunyikan Psikotest' : 'Hasil Psikotest'}</button>
            {schedule.stage !== 'Psikotest' && <a href={meetingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"><Video className="h-4 w-4" /> Microsoft Teams <ExternalLink className="h-3.5 w-3.5" /></a>}
          </div>

          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2"><Calendar className="h-4 w-4 text-sky-600" /><h3 className="text-sm font-bold text-slate-900">Jadwal {schedule.stage}</h3></div>
            <p className="text-sm font-medium text-slate-800">{formatDate(schedule.scheduled_date)} · {schedule.scheduled_time} WIB</p>
            <p className="mt-1 text-sm text-slate-500">{schedule.location || 'Lokasi belum diisi'}{schedule.interviewer_name ? ` · Pewawancara: ${schedule.interviewer_name}` : ''}</p>
          </div>

          {showPsychotest && <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900"><ClipboardCheck className="h-4 w-4 text-indigo-600" />Hasil Psikotest</h3>{loading ? <p className="text-sm text-slate-500">Memuat hasil psikotest...</p> : psychotestResults.length === 0 ? <p className="rounded-lg bg-white px-3 py-2.5 text-sm text-slate-500">Belum ada hasil psikotest.</p> : <div className="space-y-2">{psychotestResults.map((result) => <div key={result.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2.5"><div><p className="text-sm font-medium text-slate-800">Skor: {result.score ?? '—'}</p><p className="text-xs text-slate-500">Penilai: {result.assessor || '—'}{result.notes ? ` · ${result.notes}` : ''}</p></div><Badge text={result.result} color={ASSESSMENT_RESULT_COLORS[result.result] || 'slate'} /></div>)}</div>}</div>}

          <div className="mb-5"><label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">Ubah Status</label><div className="flex flex-wrap gap-2">{APPLICANT_STATUSES.map((status) => <button key={status} onClick={() => updateStatus(status)} disabled={statusSaving} className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${candidate?.status === status ? 'ring-2 ring-offset-1 ring-slate-300' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'} ${candidate?.status === status ? (status === 'Tidak Lolos' ? 'border-red-200 bg-red-50 text-red-700' : 'border-sky-200 bg-sky-50 text-sky-700') : ''}`}>{status}</button>)}</div>{statusNotice && <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800"><p className="font-semibold">Lanjutkan proses di Offering &amp; Pre-Employment</p><p className="mt-1 text-xs leading-relaxed">{statusNotice}</p>{onNavigate && <button onClick={() => onNavigate('rt-offering')} className="mt-3 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">Buka Offering &amp; Pre-Employment</button>}</div>}</div>

          <div className="mb-5"><label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">Penilaian Interview</label><button onClick={() => setShowAssessmentPage(true)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><ClipboardCheck className="h-5 w-5" /></div><div className="min-w-0"><p className="flex items-center gap-2 text-sm font-semibold text-slate-800">{displayAssessment ? 'Penilaian Interview Sudah Diisi' : 'Isi Penilaian Interview'}{displayAssessment && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Sudah diisi</span>}</p><p className="truncate text-xs text-slate-500">{displayAssessment ? `Total nilai: ${displayAverage ?? '—'} · ${displayAssessment.result}` : 'Belum ada penilaian — buka Form Interview'}</p></div></div><span className="shrink-0 text-xs font-semibold text-indigo-600">{displayAssessment ? 'Edit Penilaian' : 'Buka Form'}</span></button></div>

          <div className="mb-5"><h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900"><User className="h-4 w-4 text-emerald-700" />Data Pribadi</h3><DetailRow icon={Calendar} label="Tempat & Tanggal Lahir" value={candidate?.birth_place_date} /><DetailRow icon={User} label="Usia" value={candidate?.age ? `${candidate.age} tahun` : null} /><DetailRow icon={User} label="Jenis Kelamin" value={candidate?.gender} /><DetailRow icon={Star} label="Agama" value={candidate?.religion} /><DetailRow icon={User} label="Status Perkawinan" value={candidate?.marital_status} /><DetailRow icon={MapPin} label="Alamat KTP" value={candidate?.ktp_address} /><DetailRow icon={MapPin} label="Alamat Domisili" value={candidate?.domicile} /><DetailRow icon={Phone} label="No. Handphone" value={candidate?.phone} /><DetailRow icon={Mail} label="Email" value={candidate?.email} /><DetailRow icon={MapPin} label="Area Penempatan" value={candidate?.placement_area} /></div>

          <div className="mb-5"><h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900"><GraduationCap className="h-4 w-4 text-emerald-700" />Pendidikan</h3><DetailRow icon={GraduationCap} label="Jenjang Pendidikan" value={candidate?.education} /><DetailRow icon={GraduationCap} label="Program Studi / Jurusan" value={candidate?.major} /><DetailRow icon={GraduationCap} label="Sekolah / Perguruan Tinggi" value={candidate?.school_name} /></div>

          {experiences.length > 0 && <div className="mb-5"><h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900"><Briefcase className="h-4 w-4 text-emerald-700" />Pengalaman</h3><ul className="space-y-2">{experiences.map((experience, index) => <li key={`${experience}-${index}`} className="flex gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700"><Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{experience}</li>)}</ul></div>}

          {(candidate?.cover_note || candidate?.internal_notes || candidate?.referral_source) && <div className="mb-2"><h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-900"><FileText className="h-4 w-4 text-emerald-700" />Catatan Lamaran</h3><DetailRow icon={FileText} label="Motivasi / Catatan Kandidat" value={candidate?.cover_note} /><DetailRow icon={FileText} label="Catatan Internal HR" value={candidate?.internal_notes} /><DetailRow icon={User} label="Sumber Informasi" value={candidate?.referral_source} /></div>}
          {error && <p className="mt-4 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">{error}</p>}
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-3"><button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900"><Save className="h-4 w-4" /> Kembali ke Jadwal</button></div>
      </div>
    </div>
  );
}
