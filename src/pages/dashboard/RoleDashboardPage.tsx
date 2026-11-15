import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileSignature,
  FileText,
  KanbanSquare,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { PageId } from '@/components/Layout';
import { Badge, Card, LoadingState, PageHeader } from '@/components/ui';
import { db } from '@/lib/database';
import { notifyPortalOnce } from '@/lib/portalNotifications';

type StaffRole = 'recruitment';
type RecentRequest = {
  id: string;
  position_needed: string;
  div_job_site: string;
  request_type: string;
  overall_status: string;
  linked_job_opening_id?: string | null;
  publication_status?: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
};
type RecentApplication = {
  id: string;
  full_name: string;
  position: string;
  tracking_code: string;
  status: string;
  created_at: string;
};
type ActiveOpening = {
  id: string;
  title: string;
  division: string;
  location: string;
  deadline: string;
};
type UpcomingInterview = {
  id: string;
  stage: string;
  scheduled_date: string;
  scheduled_time: string;
  location: string | null;
  job_applicants: { full_name: string; position: string } | null;
};
type DashboardConfig = {
  key: StaffRole;
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: typeof Users;
  iconClass: string;
  accent: string;
  welcome: string;
  description: string;
  metrics: { label: string; table: string; icon: typeof Users; tone: string }[];
  shortcuts: { label: string; description: string; page: PageId; icon: typeof Users }[];
};

const CONFIGS: Record<StaffRole, DashboardConfig> = {
  recruitment: {
    key: 'recruitment',
    eyebrow: 'Dashboard Recruitment',
    title: 'Dashboard Recruitment',
    subtitle: 'Pantau alur kandidat, kebutuhan manpower, lowongan aktif, dan agenda seleksi dari satu layar.',
    icon: BriefcaseBusiness,
    iconClass: 'text-sky-600',
    accent: 'from-[#102c2b] via-[#155e63] to-[#1682a2]',
    welcome: 'Rekrut talenta terbaik dengan lebih terarah.',
    description: 'Lihat prioritas hari ini dan lanjutkan setiap kandidat ke tahap berikutnya.',
    metrics: [
      { label: 'Total lamaran', table: 'job_applicants', icon: Users, tone: 'sky' },
      { label: 'Lowongan aktif', table: 'job_openings', icon: BriefcaseBusiness, tone: 'blue' },
      { label: 'PRK tersimpan', table: 'employee_requests', icon: FileText, tone: 'amber' },
      { label: 'Jadwal seleksi', table: 'interview_schedules', icon: CalendarClock, tone: 'violet' },
    ],
    shortcuts: [
      { label: 'Review Lamaran', description: 'Periksa kandidat yang baru masuk dan lengkapi screening.', page: 'rt-applicants', icon: Users },
      { label: 'Kelola Lowongan', description: 'Buat, publikasikan, atau tutup posisi yang tersedia.', page: 'rt-job-openings', icon: FileText },
      { label: 'Pipeline Kandidat', description: 'Geser kandidat antar tahap seleksi secara visual.', page: 'rt-pipeline', icon: KanbanSquare },
      { label: 'Jadwal Seleksi', description: 'Atur interview, psikotes, dan tindak lanjut kandidat.', page: 'rt-interview-schedule', icon: CalendarClock },
      { label: 'Tes & Penilaian', description: 'Catat hasil psikotes, tes teknis, dan interview.', page: 'rt-assessment', icon: ClipboardCheck },
      { label: 'Offering & Pre-Employment', description: 'Kelola penawaran kerja dan dokumen kandidat terpilih.', page: 'rt-offering', icon: FileSignature },
    ],
  },
};

const toneClasses: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-600',
  sky: 'bg-sky-50 text-sky-600',
  blue: 'bg-blue-50 text-blue-600',
  violet: 'bg-violet-50 text-violet-600',
};
const pipelineStages = ['Lamaran Masuk', 'Screening', 'Psikotest', 'Interview', 'Lolos'];
const statusTone: Record<string, string> = {
  'Lamaran Masuk': 'sky',
  Screening: 'blue',
  Psikotest: 'amber',
  Interview: 'violet',
  Lolos: 'green',
  'Tidak Lolos': 'red',
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(value: string) {
  return value?.slice(0, 5) || '—';
}

export default function RoleDashboardPage({ role, name, onNavigate }: { role: StaffRole; name: string; onNavigate: (page: PageId) => void }) {
  const config = CONFIGS[role];
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([]);
  const [applications, setApplications] = useState<RecentApplication[]>([]);
  const [openings, setOpenings] = useState<ActiveOpening[]>([]);
  const [interviews, setInterviews] = useState<UpcomingInterview[]>([]);
  const [pipeline, setPipeline] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      const metricResults = await Promise.all(config.metrics.map(async (metric) => {
        const result = metric.table === 'employee_requests'
          ? await db.from('employee_requests').select('*', { count: 'exact', head: true }).is('trashed_at', null)
          : await db.from(metric.table).select('*', { count: 'exact', head: true });
        return [metric.table, result.count ?? 0] as const;
      }));
      const today = new Date().toISOString().slice(0, 10);
      const [requestSummary, requestResult, applicationResult, openingResult, interviewResult, pipelineResult] = await Promise.all([
        Promise.all([
          db.from('employee_requests').select('id', { count: 'exact', head: true }).is('trashed_at', null).neq('overall_status', 'Draft'),
          db.from('employee_requests').select('id', { count: 'exact', head: true }).is('trashed_at', null).eq('overall_status', 'Diajukan'),
        ]),
        db.from('employee_requests').select('*').is('trashed_at', null).order('created_at', { ascending: false }),
        db.from('job_applicants').select('id, full_name, position, tracking_code, status, created_at').order('created_at', { ascending: false }).limit(6),
        db.from('job_openings').select('id, title, division, location, deadline').eq('is_active', true).order('created_at', { ascending: false }).limit(5),
        db.from('interview_schedules').select('id, stage, scheduled_date, scheduled_time, location, job_applicants(full_name, position)').gte('scheduled_date', today).order('scheduled_date', { ascending: true }).order('scheduled_time', { ascending: true }).limit(4),
        db.from('job_applicants').select('status').limit(1000),
      ]);
      if (!active) return;

      const requestData = (requestResult.data || []) as RecentRequest[];
      const applicationData = (applicationResult.data || []) as RecentApplication[];
      const openingData = (openingResult.data || []) as ActiveOpening[];
      const interviewData = (interviewResult.data || []) as unknown as UpcomingInterview[];
      const pipelineData: Record<string, number> = {};
      (pipelineResult.data || []).forEach((item: { status?: string | null }) => {
        const status = String(item.status || 'Lamaran Masuk');
        pipelineData[status] = (pipelineData[status] || 0) + 1;
      });

      setCounts({
        ...Object.fromEntries(metricResults),
        employee_requests_sent: requestSummary[0]?.count ?? 0,
        employee_requests_pending: requestSummary[1]?.count ?? 0,
      });
      setRecentRequests(requestData);
      setApplications(applicationData);
      setOpenings(openingData);
      setInterviews(interviewData);
      setPipeline(pipelineData);
      const newestRequest = requestData.find((request) => request.overall_status === 'Diajukan');
      if (newestRequest) notifyPortalOnce(`prk-dashboard:${newestRequest.id}:${newestRequest.created_at}`, 'PRK baru masuk', `${newestRequest.position_needed} menunggu approval.`);
      setLoading(false);
    };
    void loadDashboard();
    return () => { active = false; };
  }, [config, role]);

  useEffect(() => {
    if (role !== 'recruitment') return;
    let active = true;
    const checkNewApplications = async () => {
      const { data, error } = await db.from('job_applicants').select('id, full_name, position, tracking_code, created_at').order('created_at', { ascending: false }).limit(10);
      if (!active || error) return;
      (data || []).forEach((application: RecentApplication) => notifyPortalOnce(`application-submitted:${application.id}:${application.created_at}`, 'Lamaran kandidat baru', `${application.full_name} melamar posisi ${application.position}. Kode lamaran: ${application.tracking_code}.`));
    };
    void checkNewApplications();
    const timer = window.setInterval(() => void checkNewApplications(), 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [role]);

  if (loading) return <LoadingState />;
  const RoleIcon = config.icon;
  const pendingCount = counts.employee_requests_pending ?? 0;
  const newApplicationCount = applications.filter((application) => application.status === 'Lamaran Masuk').length;
  const nextInterview = interviews[0];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title={config.title} subtitle={config.subtitle} icon={<RoleIcon className={`h-6 w-6 ${config.iconClass}`} />} />

      <section className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${config.accent} p-6 text-white shadow-xl md:p-8`}>
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[34px] border-white/10" />
        <div className="absolute -bottom-24 right-24 h-48 w-48 rounded-full border-[24px] border-lime-300/10" />
        <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/65"><Sparkles size={14} /> {config.eyebrow}</div>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl">Halo, {name}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">{config.welcome} {config.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
          <button onClick={() => onNavigate('rt-applicants')} className="inline-flex items-center gap-2 rounded-xl bg-[#b7dec5] px-4 py-2.5 text-sm font-bold text-[#155e63] shadow-sm transition hover:bg-[#c7e8d2]"><Users size={16} /> Review lamaran</button>
            <button onClick={() => onNavigate('rt-job-openings')} className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"><Plus size={16} /> Kelola lowongan</button>
          </div>
        </div>
        <div className="relative mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/15 pt-4 text-xs text-white/65">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#a9d3b9]" /> Data tersinkron otomatis</span>
          <span>Prioritas hari ini: {newApplicationCount} lamaran baru</span>
          {nextInterview && <span>Agenda berikutnya: {formatDate(nextInterview.scheduled_date)} · {formatTime(nextInterview.scheduled_time)}</span>}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {config.metrics.map((metric) => {
          const MetricIcon = metric.icon;
          const value = counts[metric.table] ?? 0;
          const detail = metric.table === 'job_applicants' ? `${newApplicationCount} perlu ditinjau` : metric.table === 'employee_requests' ? `${pendingCount} menunggu approval` : metric.table === 'interview_schedules' ? `${interviews.length} agenda berikutnya` : 'Sedang dipublikasikan';
          return <Card key={metric.table} className="group relative overflow-hidden p-5 transition hover:-translate-y-1 hover:shadow-lg">
            <div className="flex items-start justify-between"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses[metric.tone]}`}><MetricIcon size={20} /></div><TrendingUp size={16} className="text-slate-300 transition group-hover:text-emerald-500" /></div>
            <p className="mt-5 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">{metric.label}</p>
            <p className="mt-2 text-xs text-slate-400">{detail}</p>
          </Card>;
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5"><div><p className="section-kicker">Prioritas kandidat</p><h3 className="mt-1 font-display text-xl font-semibold text-slate-900">Lamaran terbaru</h3><p className="mt-1 text-sm text-slate-500">Kandidat yang paling baru masuk ke sistem Recruitment.</p></div><button onClick={() => onNavigate('rt-applicants')} className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800">Lihat semua <ArrowRight size={14} /></button></div>
          {applications.length ? <div className="divide-y divide-slate-100">{applications.map((application) => <button key={application.id} onClick={() => onNavigate('rt-applicants')} className="table-row-hover flex w-full items-center gap-3 px-6 py-4 text-left"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sm font-bold text-sky-700">{application.full_name.charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{application.full_name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{application.position} · {application.tracking_code}</p></div><div className="hidden text-right sm:block"><Badge text={application.status} color={statusTone[application.status] || 'slate'} /><p className="mt-1 text-[11px] text-slate-400">{formatDate(application.created_at)}</p></div><ArrowRight size={15} className="text-slate-300" /></button>)}</div> : <EmptyPanel text="Belum ada lamaran kandidat." />}
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="section-kicker">Kondisi funnel</p><h3 className="mt-1 font-display text-xl font-semibold text-slate-900">Pipeline kandidat</h3></div><Target className="text-sky-500" size={21} /></div>
          <div className="mt-6 space-y-4">{pipelineStages.map((stage, index) => { const value = pipeline[stage] || (index === 0 ? pipeline['Lamaran Masuk'] || 0 : 0); const total = Math.max(counts.job_applicants || 1, 1); const width = Math.max(value ? (value / total) * 100 : 4, 4); return <div key={stage}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-slate-600">{stage}</span><span className="font-bold text-slate-800">{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${index === 0 ? 'bg-sky-500' : index === 1 ? 'bg-blue-500' : index === 2 ? 'bg-amber-400' : index === 3 ? 'bg-violet-500' : 'bg-emerald-500'}`} style={{ width: `${width}%` }} /></div></div> })}</div>
          <button onClick={() => onNavigate('rt-pipeline')} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-sky-600 hover:text-sky-800">Buka pipeline <ArrowRight size={15} /></button>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5"><div><p className="section-kicker">Agenda seleksi</p><h3 className="mt-1 font-display text-xl font-semibold text-slate-900">Jadwal mendatang</h3></div><button onClick={() => onNavigate('rt-interview-schedule')} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-sky-600"><CalendarDays size={18} /></button></div>
          {interviews.length ? <div className="divide-y divide-slate-100">{interviews.map((interview) => <button key={interview.id} onClick={() => onNavigate('rt-interview-schedule')} className="table-row-hover flex w-full gap-3 px-6 py-4 text-left"><div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-violet-50 text-violet-700"><span className="text-[10px] font-bold uppercase">{new Date(interview.scheduled_date).toLocaleDateString('id-ID', { month: 'short' })}</span><span className="text-lg font-bold leading-none">{new Date(interview.scheduled_date).getDate()}</span></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{interview.job_applicants?.full_name || 'Kandidat'}</p><p className="mt-0.5 truncate text-xs text-slate-500">{interview.stage} · {interview.job_applicants?.position || 'Posisi belum tersedia'}</p><p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-400"><Clock3 size={12} /> {formatTime(interview.scheduled_time)}{interview.location ? ` · ${interview.location}` : ''}</p></div></button>)}</div> : <EmptyPanel text="Belum ada agenda seleksi mendatang." />}
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5"><div><p className="section-kicker">Kebutuhan talent</p><h3 className="mt-1 font-display text-xl font-semibold text-slate-900">Lowongan aktif</h3></div><button onClick={() => onNavigate('rt-job-openings')} className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800">Kelola <ArrowRight size={14} /></button></div>
          {openings.length ? <div className="grid gap-3 p-5 sm:grid-cols-2">{openings.map((opening) => <button key={opening.id} onClick={() => onNavigate('rt-job-openings')} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-sky-200 hover:bg-white hover:shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm"><BriefcaseBusiness size={17} /></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Aktif</span></div><p className="mt-3 truncate text-sm font-bold text-slate-800">{opening.title}</p><p className="mt-1 truncate text-xs text-slate-500">{opening.division} · {opening.location}</p><p className="mt-3 text-[11px] text-slate-400">Batas: {opening.deadline ? formatDate(opening.deadline) : 'Belum ditentukan'}</p></button>)}</div> : <EmptyPanel text="Belum ada lowongan aktif." />}
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5"><div><p className="section-kicker">Perencanaan manpower</p><h3 className="mt-1 font-display text-xl font-semibold text-slate-900">PRK terbaru</h3><p className="mt-1 text-sm text-slate-500">Draft dan pengajuan yang sudah dikirim tersimpan di sini.</p></div><button onClick={() => onNavigate('rt-employee-request')} className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800">Buka semua <ArrowRight size={14} /></button></div>{recentRequests.length ? <div className="divide-y divide-slate-100">{recentRequests.slice(0, 4).map((request) => { const isNew = request.overall_status === 'Diajukan'; const isDraft = request.overall_status === 'Draft'; return <button key={request.id} onClick={() => { sessionStorage.setItem('portal:open-prk-id', request.id); onNavigate('rt-employee-request'); }} className={`table-row-hover flex w-full items-center gap-3 px-6 py-4 text-left ${isNew ? 'bg-amber-50/40' : ''}`}><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isNew ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}><FileText size={17} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{request.position_needed || 'PRK tanpa nama posisi'}</p><p className="mt-0.5 truncate text-xs text-slate-500">{request.div_job_site || 'Lokasi belum diisi'} · {request.request_type}</p></div><Badge text={request.overall_status} color={isNew ? 'yellow' : isDraft ? 'slate' : 'sky'} /></button>; })}</div> : <EmptyPanel text="Belum ada PRK tersimpan." />}</Card>
        <Card className="p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={20} /></div><div><p className="section-kicker">Aksi cepat</p><h3 className="mt-1 font-display text-xl font-semibold text-slate-900">Lanjutkan pekerjaan</h3></div></div><div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{config.shortcuts.map((shortcut) => { const ShortcutIcon = shortcut.icon; return <button key={shortcut.page} onClick={() => onNavigate(shortcut.page)} className="group flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3 text-left transition hover:border-sky-200 hover:bg-sky-50/50"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 group-hover:bg-white group-hover:text-sky-600"><ShortcutIcon size={16} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-700">{shortcut.label}</span><span className="mt-0.5 block truncate text-[11px] text-slate-400">{shortcut.description}</span></span><ArrowRight size={14} className="text-slate-300 group-hover:text-sky-600" /></button>; })}</div></Card>
      </section>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return <div className="flex min-h-36 items-center justify-center px-6 py-8 text-center text-sm text-slate-400">{text}</div>;
}
