import { useEffect, useState } from 'react';
import { BriefcaseBusiness, CalendarClock, CalendarDays, FileText, MapPin, Search, Send, ShieldCheck, Target } from 'lucide-react';
import { Card, PageHeader, LoadingState } from '@/components/ui';
import { db, type JobApplicant, type InterviewSchedule } from '@/lib/database';
import { fetchActiveJobOpenings, type JobOpening } from '@/lib/jobOpenings';
import JobApplicationForm from '@/components/recruitment/JobApplicationForm';
import CandidatePsychotestSection from '@/pages/candidate/CandidatePsychotestSection';

type CandidateFeature = 'positions' | 'applications' | 'psychotest' | 'interviews' | 'tracking';
const stages = ['Lamaran Masuk', 'Screening', 'Psikotest', 'Interview User', 'Interview Final', 'Offering', 'Onboarding'];
const titles: Record<CandidateFeature, { title: string; subtitle: string; icon: typeof BriefcaseBusiness }> = {
  positions: { title: 'Pilih Posisi', subtitle: 'Lihat lowongan aktif yang tersedia untuk kandidat.', icon: BriefcaseBusiness },
  applications: { title: 'Lamaran Saya', subtitle: 'Lihat seluruh lamaran yang terhubung dengan akun Anda.', icon: FileText },
  psychotest: { title: 'Psikotest', subtitle: 'Pantau tahap psikotest dan persiapan proses seleksi.', icon: Target },
  interviews: { title: 'Jadwal Wawancara', subtitle: 'Lihat jadwal Interview User dan Interview Final Anda.', icon: CalendarDays },
  tracking: { title: 'Lacak Lamaran', subtitle: 'Ikuti proses lamaran dari awal sampai onboarding.', icon: ShieldCheck },
};

export default function CandidateFeaturePage({ feature, email }: { feature: CandidateFeature; name: string; email: string }) {
  const config = titles[feature];
  const Icon = config.icon;
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
      setApplications(own); setSchedules(((s.data || []) as InterviewSchedule[]).filter((item) => ids.has(item.applicant_id))); setOpenings(o); setLoading(false);
    })();
    return () => { active = false; };
  }, [email]);
  if (loading) return <LoadingState />;
  const latest = applications[0];
  return <div className="space-y-6"><PageHeader title={config.title} subtitle={config.subtitle} icon={<Icon className="h-6 w-6 text-teal-700" />} />{feature === 'positions' && <Positions openings={openings} />}{feature === 'applications' && <Applications data={applications} />}{feature === 'psychotest' && <Psychotest latest={latest} schedules={schedules} />}{feature === 'interviews' && <Interviews data={schedules} />}{feature === 'tracking' && <Tracking data={applications} />}</div>;
}
function Positions({ openings }: { openings: JobOpening[] }) { const [query, setQuery] = useState(''); const [division, setDivision] = useState('Semua Departemen'); const [location, setLocation] = useState('Semua Lokasi'); const [type, setType] = useState('Semua Jenis'); const [applyingTo, setApplyingTo] = useState<string | null>(null); const divisions = Array.from(new Set(openings.map((job) => job.division).filter(Boolean))); const locations = Array.from(new Set(openings.map((job) => job.location).filter(Boolean))); const types = Array.from(new Set(openings.map((job) => job.type).filter(Boolean))); const filtered = openings.filter((job) => { const needle = query.trim().toLowerCase(); return (!needle || `${job.title} ${job.division} ${job.location}`.toLowerCase().includes(needle)) && (division === 'Semua Departemen' || job.division === division) && (location === 'Semua Lokasi' || job.location === location) && (type === 'Semua Jenis' || job.type === type); }); if (applyingTo) return <JobApplicationForm openings={openings} initialPosition={applyingTo} onClose={() => setApplyingTo(null)} />; return <div><div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1.15fr_1fr_1fr_1fr]"><label className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari posisi..." className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label><Filter value={division} onChange={setDivision} options={['Semua Departemen', ...divisions]} /><Filter value={location} onChange={setLocation} options={['Semua Lokasi', ...locations]} /><Filter value={type} onChange={setType} options={['Semua Jenis', ...types]} /></div></div><p className="mt-6 text-sm text-slate-500"><b className="text-slate-800">{filtered.length}</b> posisi ditemukan</p>{filtered.length ? <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map((o) => <Card key={o.id} className="flex h-full flex-col p-6 transition hover:-translate-y-1 hover:shadow-lg"><div className="flex items-start justify-between gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><BriefcaseBusiness size={23} /></div><span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">{o.type}</span></div><h2 className="mt-5 text-xl font-bold text-slate-900">{o.title}</h2><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500"><span>{o.division}</span><span>•</span><span className="inline-flex items-center gap-1"><MapPin size={13} />{o.location}</span></div><p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">{o.qualifications?.join('. ')}.</p><div className="mt-3 flex items-center gap-1 text-xs text-slate-400"><CalendarClock size={13} /> Batas lamaran: {o.deadline}</div><button onClick={() => setApplyingTo(o.title)} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"><Send size={14} /> Lamar Sekarang</button></Card>)}</div> : <Card className="mt-4"><Empty text="Tidak ada posisi yang sesuai dengan filter." /></Card>}</div>; }
function Filter({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) { return <select value={value} onChange={(e) => onChange(e.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{options.map((option) => <option key={option}>{option}</option>)}</select>; }
function Applications({ data }: { data: JobApplicant[] }) { return <Card className="overflow-hidden"><div className="border-b border-slate-100 p-5"><h2 className="font-display text-xl font-semibold text-slate-900">Daftar lamaran saya</h2></div>{data.length ? data.map((a) => <div key={a.id} className="flex flex-wrap justify-between gap-3 border-b border-slate-100 p-5"><div><p className="font-semibold text-slate-800">{a.position}</p><p className="mt-1 text-xs text-slate-500">Kode: {a.tracking_code} · {date(a.created_at)}</p></div><Badge text={a.status} /></div>) : <Empty text="Belum ada lamaran." />}</Card>; }
function Psychotest({ latest, schedules }: { latest?: JobApplicant; schedules: InterviewSchedule[] }) { return <CandidatePsychotestSection latest={latest} schedules={schedules} />; }
function Interviews({ data }: { data: InterviewSchedule[] }) {
  const interviewSchedules = data.filter((schedule) => schedule.stage === 'Interview User' || schedule.stage === 'Interview Final');
  return <Card className="overflow-hidden"><div className="border-b border-slate-100 p-5"><h2 className="font-display text-xl font-semibold text-slate-900">Jadwal Interview</h2><p className="mt-1 text-xs text-slate-500">Hanya jadwal Interview User dan Interview Final yang ditampilkan di sini.</p></div>{interviewSchedules.length ? <div className="grid gap-4 p-5 md:grid-cols-2">{interviewSchedules.map((s) => <div key={s.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex justify-between"><CalendarDays className="text-teal-600" /><Badge text={s.stage} /></div><p className="mt-4 font-semibold text-slate-800">{s.scheduled_date} · {s.scheduled_time}</p><p className="mt-1 text-xs text-slate-500">{s.location || 'Lokasi akan diinformasikan'}</p></div>)}</div> : <Empty text="Belum ada jadwal Interview User atau Interview Final." />}</Card>;
}
function Tracking({ data }: { data: JobApplicant[] }) { return <div className="space-y-4">{data.length ? data.map((a) => { const rejected = a.status === 'Tidak Lolos'; const index = stages.findIndex((s) => s === a.status); return <Card key={a.id} className="p-6"><div className="flex justify-between gap-3"><div><h2 className="font-display text-xl font-semibold text-slate-900">{a.position}</h2><p className="mt-1 text-xs text-slate-500">Kode: {a.tracking_code}</p></div><Badge text={a.status} /></div>{rejected ? <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">Lamaran Anda belum dapat dilanjutkan ke tahap berikutnya.</p> : <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">{stages.map((s, i) => <div key={s}><div className={`h-2 rounded-full ${i <= index ? 'bg-teal-500' : 'bg-slate-100'}`} /><p className={`mt-2 text-center text-[11px] ${i <= index ? 'font-semibold text-teal-700' : 'text-slate-400'}`}>{s}</p></div>)}</div>}</Card>; }) : <Card className="p-8"><Empty text="Belum ada lamaran yang dapat dilacak." /></Card>}</div>; }
function Badge({ text }: { text: string }) { return <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">{text || 'Belum ada status'}</span>; }
function Empty({ text }: { text: string }) { return <div className="p-8 text-center text-sm font-medium text-slate-500">{text}</div>; }
function date(value: string) { return value ? new Date(value).toLocaleDateString('id-ID') : '-'; }
