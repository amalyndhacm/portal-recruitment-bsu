import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  CalendarDays,
  Camera,
  GraduationCap,
  Image as ImageIcon,
  UsersRound,
  Video,
} from 'lucide-react';
import type { PageId } from '@/components/Layout';
import { Card, LoadingState, PageHeader } from '@/components/ui';
import { db, type TrainingActivity, type TrainingRecap } from '@/lib/database';
import { fetchPublishedHomeGallery, type HomeGalleryItem } from '@/lib/homeGallery';

const TRAINING_TERMS = /training|pelatihan|induction|onboarding|sertifikasi/i;

function dateLabel(value?: string | null) {
  if (!value) return 'Tanggal tidak tersedia';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Tanggal tidak tersedia'
    : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatCard({ label, value, detail, icon: Icon, tone }: {
  label: string;
  value: number;
  detail: string;
  icon: typeof GraduationCap;
  tone: string;
}) {
  return (
    <Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}><Icon size={20} /></span>
        <span className="text-3xl font-bold tracking-tight text-slate-900">{value.toLocaleString('id-ID')}</span>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-700">{label}</p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </Card>
  );
}

export default function TrainingDashboardPage({ name, onNavigate }: {
  name: string;
  onNavigate: (page: PageId) => void;
}) {
  const [activities, setActivities] = useState<TrainingActivity[]>([]);
  const [recaps, setRecaps] = useState<TrainingRecap[]>([]);
  const [gallery, setGallery] = useState<HomeGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [activityResult, recapResult, galleryItems] = await Promise.all([
        db.from('training_activities').select('*').order('created_at', { ascending: false }),
        db.from('training_recap').select('*').order('created_at', { ascending: false }),
        fetchPublishedHomeGallery(),
      ]);
      if (!active) return;
      setActivities((activityResult.data || []) as TrainingActivity[]);
      setRecaps((recapResult.data || []) as TrainingRecap[]);
      setGallery(galleryItems.filter((item) => TRAINING_TERMS.test(`${item.album_title} ${item.album_caption || ''}`)));
      const errors = [activityResult.error?.message, recapResult.error?.message].filter(Boolean);
      setLoadError(errors.length ? `Sebagian data belum dapat dimuat: ${errors.join(' · ')}` : '');
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, []);

  const totalParticipants = useMemo(() => activities.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0), [activities]);
  const recapTotal = useMemo(() => recaps.reduce((sum, item) => sum + (Number(item.total) || 0), 0), [recaps]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard Training"
        subtitle="Pantau pelatihan yang telah dilaksanakan, rekap peserta, dan dokumentasi kegiatan."
        icon={<GraduationCap className="h-6 w-6 text-teal-700" />}
      />

      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#102c2b] via-[#155e63] to-[#498c78] p-6 text-white shadow-xl md:p-8">
        <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full border-[34px] border-white/10" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/65">BSU Career · Training</p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl">Halo, {name}</h2>
            <p className="mt-3 text-sm leading-6 text-white/75">Ringkasan kegiatan pengembangan karyawan dan dokumentasi Training tersaji dalam satu dashboard.</p>
          </div>
          <button onClick={() => onNavigate('rt-training')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#b7dec5] px-4 py-2.5 text-sm font-bold text-[#155e63] transition hover:bg-[#c7e8d2]">
            Buka data pelatihan <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {loadError && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{loadError}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Kegiatan Training" value={activities.length} detail="Tercatat pada data pelatihan" icon={BookOpenCheck} tone="bg-teal-50 text-teal-700" />
        <StatCard label="Peserta tercatat" value={totalParticipants} detail="Akumulasi jumlah pada kegiatan" icon={UsersRound} tone="bg-emerald-50 text-emerald-700" />
        <StatCard label="Rekap per posisi" value={recaps.length} detail="Posisi yang sudah direkap" icon={CalendarDays} tone="bg-amber-50 text-amber-700" />
        <StatCard label="Dokumentasi" value={gallery.length} detail="Foto/video pada album Training" icon={Camera} tone="bg-sky-50 text-sky-700" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">Pelaksanaan</p><h3 className="mt-1 font-display text-xl font-semibold text-slate-900">Training yang sudah dilakukan</h3><p className="mt-1 text-sm text-slate-500">Aktivitas terbaru beserta jumlah peserta.</p></div>
            <button onClick={() => onNavigate('rt-training')} className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900">Lihat data <ArrowRight size={14} /></button>
          </div>
          {activities.length ? <div className="divide-y divide-slate-100">
            {activities.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-6 py-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><GraduationCap size={17} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{item.activity || 'Kegiatan Training'}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.employee_stage || 'Tahapan tidak dicantumkan'}{item.position ? ` · ${item.position}` : ''}{item.area ? ` · ${item.area}` : ''}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{dateLabel(item.created_at)}{item.media ? ` · ${item.media}` : ''}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{Number(item.quantity) || 0} peserta</span>
              </div>
            ))}
          </div> : <div className="p-10 text-center text-sm text-slate-400">Belum ada kegiatan Training yang tercatat.</div>}
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">Rekapitulasi</p><h3 className="mt-1 font-display text-xl font-semibold text-slate-900">Rekap Training</h3><p className="mt-1 text-sm text-slate-500">Ringkasan peserta berdasarkan posisi dan jenis pelatihan.</p></div>
            <button onClick={() => onNavigate('rt-training-recap')} className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900">Lihat rekap <ArrowRight size={14} /></button>
          </div>
          {recaps.length ? <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-left text-xs text-slate-500"><th className="px-5 py-3 font-semibold">Posisi</th><th className="px-3 py-3 text-right font-semibold">Induction</th><th className="px-3 py-3 text-right font-semibold">Onboarding</th><th className="px-5 py-3 text-right font-semibold">Total</th></tr></thead>
              <tbody>{recaps.slice(0, 6).map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="px-5 py-3 font-semibold text-slate-700">{item.position}</td><td className="px-3 py-3 text-right text-slate-600">{item.induction}</td><td className="px-3 py-3 text-right text-slate-600">{item.training_onboarding}</td><td className="px-5 py-3 text-right font-bold text-teal-700">{item.total}</td></tr>)}</tbody>
              <tfoot><tr className="border-t-2 border-teal-100 bg-teal-50/70"><td colSpan={3} className="px-5 py-3 font-bold text-slate-700">Total peserta terakumulasi</td><td className="px-5 py-3 text-right text-base font-bold text-teal-800">{recapTotal}</td></tr></tfoot>
            </table>
          </div> : <div className="p-10 text-center text-sm text-slate-400">Belum ada rekap Training.</div>}
        </Card>
      </section>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">Dokumentasi kegiatan</p><h3 className="mt-1 font-display text-xl font-semibold text-slate-900">Galeri Training</h3><p className="mt-1 text-sm text-slate-500">Media dari album publik dengan judul atau deskripsi Training, Pelatihan, Induction, Onboarding, atau Sertifikasi.</p></div>
          <span className="text-xs font-semibold text-slate-400">{gallery.length} media</span>
        </div>
        {gallery.length ? <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {gallery.slice(0, 12).map((item) => <a key={item.id} href={item.file_url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
              {item.media_type === 'video' ? <video src={item.file_url} muted playsInline className="h-full w-full object-cover" /> : <img src={item.file_url} alt={item.file_name} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />}
              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white">{item.media_type === 'video' ? <><Video size={12} /> Video</> : <><ImageIcon size={12} /> Foto</>}</span>
            </div>
            <div className="p-3"><p className="truncate text-sm font-bold text-slate-800">{item.album_title}</p><p className="mt-1 truncate text-xs text-slate-400">{item.file_name}</p></div>
          </a>)}
        </div> : <div className="px-6 py-12 text-center"><Camera className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">Belum ada dokumentasi Training</p><p className="mx-auto mt-1 max-w-xl text-xs leading-5 text-slate-400">Media akan muncul di sini setelah dipublikasikan ke galeri dengan nama album atau deskripsi yang memuat kata Training, Pelatihan, Induction, Onboarding, atau Sertifikasi.</p></div>}
      </Card>
    </div>
  );
}
