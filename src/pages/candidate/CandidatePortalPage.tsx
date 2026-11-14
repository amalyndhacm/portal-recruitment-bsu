import { useEffect, useState } from 'react';
import { BriefcaseBusiness, CalendarDays, ClipboardCheck, FileCheck2, UserRound } from 'lucide-react';
import { Card, PageHeader, LoadingState } from '@/components/ui';
import { db, type JobApplicant, type InterviewSchedule } from '@/lib/database';
import { fetchActiveJobOpenings, type JobOpening } from '@/lib/jobOpenings';
import type { PageId } from '@/components/Layout';
import { getPsychotestName } from '../../lib/psychotests';


export default function CandidatePortalPage({ name, email, onNavigate }: { name: string; email: string; onNavigate?: (page: PageId) => void }) {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<JobApplicant[]>([]);
  const [schedules, setSchedules] = useState<InterviewSchedule[]>([]);
  const [openings, setOpenings] = useState<JobOpening[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [a, s, o] = await Promise.all([
        db.from('job_applicants').select('*').eq('email', email.toLowerCase()).order('created_at', { ascending: false }),
        db.from('interview_schedules').select('*').order('scheduled_date', { ascending: true, nullsFirst: false }),
        fetchActiveJobOpenings(),
      ]);
      if (!active) return;
      const own = (a.data || []) as JobApplicant[];
      const ids = new Set(own.map((item) => item.id));
      setApplications(own);
      setSchedules(((s.data || []) as InterviewSchedule[]).filter((item) => ids.has(item.applicant_id)));
      setOpenings(o);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [email]);

  const latest = applications[0];
  const profilePercent = Math.round(((latest ? [latest.full_name, latest.email, latest.phone, latest.domicile, latest.education, latest.cv_link].filter(Boolean).length : 2) / 6) * 100);
  const psychotestSchedules = schedules.filter((schedule) => schedule.stage === 'Psikotest');
  const interviewSchedules = schedules.filter((schedule) => schedule.stage === 'Interview User' || schedule.stage === 'Interview Final');
  const assignedPsychotestCount = new Set(psychotestSchedules.flatMap((schedule) => schedule.psychotest_types || [])).size;

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard Kandidat" subtitle="Lihat ringkasan lamaran dan lanjutkan proses seleksi Anda." icon={<BriefcaseBusiness className="h-6 w-6 text-teal-700" />} />
      <section className="rounded-3xl bg-gradient-to-br from-[#5f9fbd] via-[#5c9c9f] to-[#7b83ae] p-6 text-white shadow-lg"><p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">CANDIDATE WORKSPACE</p><h2 className="mt-2 font-display text-2xl font-bold">Selamat datang, {name || 'Kandidat'}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">Lacak aplikasi Anda dan lanjutkan dari tempat Anda berhenti.</p></section>

      <Card className="overflow-hidden p-0"><div className="border-b border-slate-100 px-6 py-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-600">Profil Kandidat</p><h2 className="mt-2 font-display text-xl font-semibold text-slate-900">Biodata Saya</h2><p className="mt-1 text-sm text-slate-500">Data biodata diisi saat Anda menekan tombol <b>Lamar Sekarang</b> pada halaman Pilih Posisi.</p></div><div className="grid gap-5 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4"><Info label="Nama Lengkap" value={latest?.full_name || name || '-'} /><Info label="Email" value={latest?.email || email} /><Info label="Nomor Telepon" value={latest?.phone || 'Belum diisi'} /><Info label="Domisili" value={latest?.domicile || 'Belum diisi'} /><Info label="Pendidikan" value={latest?.education || 'Belum diisi'} /><Info label="CV" value={latest?.cv_link ? 'Sudah diunggah' : 'Belum diunggah'} /><Info label="Posisi Dilamar" value={latest?.position || 'Belum ada lamaran'} /><Info label="Kelengkapan" value={`${profilePercent}%`} /></div><div className="flex flex-wrap gap-3 border-t border-slate-100 px-6 py-4"><button onClick={() => onNavigate?.('candidate-positions')} className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700">Isi / ubah biodata melalui lamaran</button><button onClick={() => onNavigate?.('candidate-applications')} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Lihat lamaran saya</button></div></Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <ActionCard icon={<span className="text-2xl leading-none">＋</span>} title="Lamar Posisi" text={`${openings.length} posisi tersedia untuk Anda lihat.`} tone="blue" />
        <ActionCard icon={<FileCheck2 size={21} />} title="Psikotest" text={psychotestSchedules.length ? `${psychotestSchedules.length} jadwal Psikotest, ${assignedPsychotestCount} jenis tes ditugaskan.` : 'Belum ada jadwal Psikotest untuk saat ini.'} tone="amber" />
        <ActionCard icon={<CalendarDays size={21} />} title="Jadwal Wawancara" text={interviewSchedules.length ? `${interviewSchedules.length} jadwal Interview User/Final tersedia.` : 'Belum ada jadwal wawancara untuk saat ini.'} tone="emerald" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-3"><ClipboardCheck className="text-amber-600" size={20} /><div><h2 className="font-semibold text-slate-900">Jadwal Psikotest</h2><p className="text-xs text-slate-500">Tes yang ditugaskan tim Recruitment.</p></div></div>
          <div className="mt-5 space-y-3">{psychotestSchedules.slice(0, 3).map((schedule) => <div key={schedule.id} className="rounded-xl bg-amber-50/70 p-3"><p className="text-sm font-semibold text-slate-800">{schedule.scheduled_date} · {schedule.scheduled_time}</p><p className="mt-1 text-xs text-slate-600">{schedule.psychotest_types?.length ? schedule.psychotest_types.map(getPsychotestName).join(', ') : 'Jenis tes belum dicantumkan oleh HR.'}</p>{schedule.location && <p className="mt-1 text-xs text-slate-500">{schedule.location}</p>}</div>)}{psychotestSchedules.length === 0 && <p className="text-sm text-slate-500">Belum ada jadwal Psikotest.</p>}</div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3"><CalendarDays className="text-emerald-600" size={20} /><div><h2 className="font-semibold text-slate-900">Jadwal Wawancara</h2><p className="text-xs text-slate-500">Interview User dan Interview Final.</p></div></div>
          <div className="mt-5 space-y-3">{interviewSchedules.slice(0, 3).map((schedule) => <div key={schedule.id} className="rounded-xl bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-800">{schedule.stage}</p><p className="mt-1 text-xs text-slate-500">{schedule.scheduled_date} · {schedule.scheduled_time} · {schedule.location || 'Lokasi diinformasikan'}</p></div>)}{interviewSchedules.length === 0 && <p className="text-sm text-slate-500">Belum ada jadwal Interview User atau Interview Final.</p>}</div>
        </Card>
        <Card className="p-6"><div className="flex items-center gap-3"><UserRound className="text-blue-600" size={20} /><div><h2 className="font-semibold text-slate-900">Ringkasan profil</h2><p className="text-xs text-slate-500">Kelengkapan data kandidat Anda.</p></div></div><div className="mt-5 grid grid-cols-2 gap-4"><Info label="Nama" value={latest?.full_name || name} /><Info label="Email" value={email} /><Info label="CV" value={latest?.cv_link ? 'Tersedia' : 'Belum diunggah'} /><Info label="Kelengkapan" value={`${profilePercent}%`} /></div></Card>
      </div>
    </div>
  );
}

function ActionCard({ icon, title, text, tone }: { icon: React.ReactNode; title: string; text: string; tone: string }) { const tones: Record<string, string> = { blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600' }; return <Card className="p-6 transition hover:-translate-y-0.5 hover:shadow-md"><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</div><h3 className="mt-4 font-semibold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-5 text-slate-500">{text}</p><span className="mt-4 inline-flex text-sm font-semibold text-blue-600">Buka halaman →</span></Card>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-semibold text-slate-700">{value}</p></div>; }
