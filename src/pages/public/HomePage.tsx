import { useState, useEffect, useRef, useCallback, type ReactNode, type MouseEvent, type CSSProperties } from 'react';
import {
  Users,
  MapPin,
  ArrowRight,
  ClipboardCheck,
  Sparkles,
  UserRound,
  Building2,
  ChevronLeft,
  ChevronRight,
  Play,
  X as CloseIcon,
  Video as VideoIcon,
  Image as ImageIcon,
  Briefcase,
  CalendarClock,
  FileSearch,
  ShieldAlert,
} from 'lucide-react';
import bsuPerusahaan from '@/asset/images/perusahaan-cerah.jpeg';
import ChatbotWidget from '@/components/dashboard/ChatbotWidget';
import ApplicationStatusModal from '@/components/recruitment/ApplicationStatusModal';
import RegionalNetworkSection from '@/components/public/RegionalNetworkSection';
import PageHeader, { type PageKey, type LoginRole } from '@/pages/public/PageHeader';
import PageFooter from '@/pages/public/PageFooter';
import { fetchActiveJobOpenings, type JobOpening } from '@/lib/jobOpenings';
import { fetchPublishedHomeGallery, type HomeGalleryItem } from '@/lib/homeGallery';

// ---------------------------------------------------------------------------
// CATATAN UNTUK TIM: seluruh angka & narasi di halaman ini adalah placeholder
// bertema prototipe. Ganti dengan data & GAMBAR sebenarnya sebelum dipakai
// secara publik. Gambar placeholder (Picsum) ditandai di komentarnya.
//
// Lowongan (openings & featuredJobs) sekarang diambil dari Supabase lewat
// src/lib/jobOpenings.ts, dikelola dari halaman admin "Kelola Lowongan" —
// bukan lagi data statis JOB_OPENINGS / FEATURED_JOB_OPENINGS.
// ---------------------------------------------------------------------------

// Lima warna resmi logo — "lima sayap, satu arah yang sama".
const WINGS = [
  { key: 'teal', hex: '#2FB4C4' },
  { key: 'green', hex: '#3AA65B' },
  { key: 'gold', hex: '#F0B429' },
  { key: 'red', hex: '#E8543E' },
  { key: 'blue', hex: '#2E7FBF' },
] as const;

const APPLICATION_STAGES = [
  { label: 'Pilih Lowongan', description: 'Temukan posisi yang sesuai dengan minat dan kualifikasi Anda.', icon: Briefcase },
  { label: 'Screening', description: 'Tim Recruitment meninjau lamaran dan dokumen Anda.', icon: FileSearch },
  { label: 'Psikotest', description: 'Kerjakan tes yang ditentukan sesuai kebutuhan posisi.', icon: ClipboardCheck },
  { label: 'Interview User', description: 'Berdiskusi tentang peran bersama tim pengguna.', icon: Users },
  { label: 'Interview Final', description: 'Mengikuti tahap wawancara akhir.', icon: CalendarClock },
  { label: 'Offering', description: 'Menerima dan membahas penawaran kerja.', icon: FileSearch },
  { label: 'Onboarding', description: 'Mempersiapkan proses bergabung bersama kami.', icon: Building2 },
];

const STAGE_COLORS = [
  { point: 'bg-sky-500 text-white', soft: 'bg-sky-100', text: 'text-sky-700', glow: 'bg-sky-400/20' },
  { point: 'bg-teal-500 text-white', soft: 'bg-teal-100', text: 'text-teal-700', glow: 'bg-teal-400/20' },
  { point: 'bg-amber-500 text-white', soft: 'bg-amber-100', text: 'text-amber-700', glow: 'bg-amber-400/20' },
  { point: 'bg-violet-500 text-white', soft: 'bg-violet-100', text: 'text-violet-700', glow: 'bg-violet-400/20' },
  { point: 'bg-indigo-500 text-white', soft: 'bg-indigo-100', text: 'text-indigo-700', glow: 'bg-indigo-400/20' },
  { point: 'bg-orange-500 text-white', soft: 'bg-orange-100', text: 'text-orange-700', glow: 'bg-orange-400/20' },
  { point: 'bg-emerald-500 text-white', soft: 'bg-emerald-100', text: 'text-emerald-700', glow: 'bg-emerald-400/20' },
];

type GalleryMedia = {
  type: 'photo' | 'video';
  caption: string;
  thumbnail: string;
  src: string;
};

type GalleryActivity = {
  title: string;
  caption: string;
  color: string;
  backgroundUrl?: string | null;
  media: GalleryMedia[];
};

function galleryPhoto(seed: string, caption: string): GalleryMedia {
  return {
    type: 'photo',
    caption,
    thumbnail: `https://picsum.photos/seed/${seed}/640/480`,
    src: `https://picsum.photos/seed/${seed}/1280/960`,
  };
}

function galleryVideo(seed: string, caption: string): GalleryMedia {
  return {
    type: 'video',
    caption,
    thumbnail: `https://picsum.photos/seed/${seed}/640/480`,
    src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  };
}

const GALLERY_ACTIVITIES: GalleryActivity[] = [
  {
    title: 'Gathering Karyawan 2025',
    caption: 'Momen kebersamaan dan aktivitas tim dalam kegiatan gathering karyawan.',
    color: WINGS[0].hex,
    media: [
      galleryPhoto('bsu-gathering-1', 'Kebersamaan karyawan dalam acara gathering.'),
      galleryPhoto('bsu-gathering-2', 'Aktivitas bersama selama acara berlangsung.'),
      galleryPhoto('bsu-gathering-3', 'Momen tim di acara gathering.'),
      galleryVideo('bsu-gathering-video', 'Video kegiatan gathering karyawan.'),
    ],
  },
  {
    title: 'Distribusi ke Gudang Regional',
    caption: 'Dokumentasi aktivitas distribusi dan operasional jaringan gudang regional.',
    color: WINGS[1].hex,
    media: [
      galleryPhoto('bsu-distribusi-1', 'Aktivitas persiapan distribusi.'),
      galleryPhoto('bsu-distribusi-2', 'Dokumentasi kegiatan di gudang regional.'),
      galleryPhoto('bsu-distribusi-3', 'Proses operasional distribusi.'),
      galleryVideo('bsu-distribusi-video', 'Video dokumentasi aktivitas distribusi.'),
    ],
  },
  {
    title: 'Kegiatan CSR di Masyarakat',
    caption: 'Dokumentasi program sosial dan kebersamaan bersama masyarakat.',
    color: WINGS[2].hex,
    media: [
      galleryPhoto('bsu-csr-1', 'Kegiatan sosial bersama masyarakat.'),
      galleryPhoto('bsu-csr-2', 'Dokumentasi penyerahan bantuan.'),
      galleryPhoto('bsu-csr-3', 'Momen kebersamaan dalam kegiatan CSR.'),
      galleryVideo('bsu-csr-video', 'Video dokumentasi program CSR.'),
    ],
  },
  {
    title: 'Profil Fasilitas Produksi',
    caption: 'Dokumentasi fasilitas, proses kerja, dan area operasional perusahaan.',
    color: WINGS[3].hex,
    media: [
      galleryPhoto('bsu-fasilitas-1', 'Area fasilitas produksi.'),
      galleryPhoto('bsu-fasilitas-2', 'Dokumentasi area gudang.'),
      galleryVideo('bsu-fasilitas-video', 'Video tur fasilitas produksi.'),
    ],
  },
  {
    title: 'Pelatihan & Pengembangan SDM',
    caption: 'Berbagai sesi pembelajaran untuk mendukung pengembangan kompetensi karyawan.',
    color: WINGS[4].hex,
    media: [
      galleryPhoto('bsu-training-1', 'Sesi pelatihan karyawan.'),
      galleryPhoto('bsu-training-2', 'Diskusi dan praktik dalam pelatihan.'),
      galleryPhoto('bsu-training-3', 'Dokumentasi peserta pelatihan.'),
      galleryVideo('bsu-training-video', 'Video kegiatan pelatihan.'),
    ],
  },
  {
    title: 'Perayaan Hari Ulang Tahun Perusahaan',
    caption: 'Momen perayaan dan kebersamaan keluarga besar PT Bintang Sayap Utama.',
    color: WINGS[0].hex,
    media: [
      galleryPhoto('bsu-anniversary-1', 'Momen perayaan ulang tahun perusahaan.'),
      galleryPhoto('bsu-anniversary-2', 'Kebersamaan keluarga besar perusahaan.'),
      galleryPhoto('bsu-anniversary-3', 'Dokumentasi acara syukuran.'),
      galleryVideo('bsu-anniversary-video', 'Video perayaan ulang tahun perusahaan.'),
    ],
  },
];

function mapUploadedGallery(items: HomeGalleryItem[]): GalleryActivity[] {
  const grouped = new Map<string, GalleryActivity>();
  items.forEach((item) => {
    const existing = grouped.get(item.album_title);
    const media: GalleryMedia = { type: item.media_type, caption: item.file_name, thumbnail: item.file_url, src: item.file_url };
    if (existing) existing.media.push(media);
    else grouped.set(item.album_title, { title: item.album_title, caption: item.album_caption || 'Dokumentasi kegiatan PT Bintang Sayap Utama.', color: item.accent_color, backgroundUrl: item.album_background_url, media: [media] });
  });
  return Array.from(grouped.values());
}

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function Reveal({
  children,
  delay = 0,
  from = 'up',
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  from?: 'up' | 'left' | 'right';
  className?: string;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const hidden =
    from === 'left'
      ? '-translate-x-8 opacity-0 scale-[0.98]'
      : from === 'right'
        ? 'translate-x-8 opacity-0 scale-[0.98]'
        : 'translate-y-6 opacity-0 scale-[0.98]';
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'translate-x-0 translate-y-0 scale-100 opacity-100' : hidden
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function handleSpotlight(e: MouseEvent<HTMLElement>) {
  const target = e.currentTarget;
  const rect = target.getBoundingClientRect();
  target.style.setProperty('--spot-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
  target.style.setProperty('--spot-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
}

function formatJobDeadline(deadline: string) {
  const date = new Date(`${deadline}T00:00:00`);
  if (Number.isNaN(date.getTime())) return deadline;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatJobDeadlineCompact(deadline: string) {
  const date = new Date(`${deadline}T00:00:00`);
  if (Number.isNaN(date.getTime())) return deadline;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default function HomePage({
  onNavigate,
  onLoginClick,
  onRoleSelect,
  currentUser,
  onProfileClick,
  onDashboardClick,
  onPrkClick,
  onLogout,
}: {
  onNavigate: (page: PageKey) => void;
  onLoginClick: () => void;
  onRoleSelect: (role: LoginRole) => void;
  currentUser?: { name: string; role: string } | null;
  onProfileClick?: () => void;
  onDashboardClick?: () => void;
  onPrkClick?: () => void;
  onLogout?: () => void;
}) {
  const [activeGallery, setActiveGallery] = useState<GalleryActivity | null>(null);
  const [activeGalleryMediaIndex, setActiveGalleryMediaIndex] = useState(0);
  const [galleryActivities, setGalleryActivities] = useState<GalleryActivity[]>(GALLERY_ACTIVITIES);
  const [statusOpen, setStatusOpen] = useState(false);
  const [previewFlyer, setPreviewFlyer] = useState<JobOpening | null>(null);
  const [recruitmentNoticeVisible, setRecruitmentNoticeVisible] = useState(true);
  const [activeFlyerIndex, setActiveFlyerIndex] = useState(0);
  const [flyerTransitioning, setFlyerTransitioning] = useState(false);
  const [flyerSlideStep, setFlyerSlideStep] = useState(() => window.innerWidth < 640 ? 125 : 260);
  const openingsCarouselRef = useRef<HTMLDivElement | null>(null);
  const [activeOpeningIndex, setActiveOpeningIndex] = useState(0);

  // Lowongan aktif yang memiliki flyer ditampilkan pada bagian Lowongan Terbaru.
  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [loadingOpenings, setLoadingOpenings] = useState(true);

  useEffect(() => {
    let mounted = true;
    const refreshOpenings = async () => {
      const data = await fetchActiveJobOpenings();
      if (!mounted) return;
      setOpenings(data);
      setLoadingOpenings(false);
    };
    void refreshOpenings();

    // Jika lowongan dipublikasikan dari tab lain, tampilkan flyer terbaru
    // begitu Beranda kembali mendapat fokus.
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshOpenings();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      mounted = false;
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchPublishedHomeGallery().then((items) => {
      if (!mounted) return;
      if (items.length > 0) setGalleryActivities(mapUploadedGallery(items));
    });
    return () => { mounted = false; };
  }, []);

  // Lowongan aktif terbaru ditampilkan langsung di carousel Beranda.
  const latestJobs = openings.slice(0, 6);

  // Lowongan yang memiliki flyer tetap ditampilkan di bagian galeri flyer.
  const latestFlyerJobs = openings.filter((j) => j.flyerUrl);

  useEffect(() => {
    const updateSlideStep = () => setFlyerSlideStep(window.innerWidth < 640 ? 125 : 260);
    window.addEventListener('resize', updateSlideStep);
    return () => window.removeEventListener('resize', updateSlideStep);
  }, []);

  const transitionFlyer = useCallback((nextIndex: number) => {
    if (nextIndex === activeFlyerIndex || latestFlyerJobs.length < 2) return;
    setFlyerTransitioning(true);
    window.setTimeout(() => {
      setActiveFlyerIndex(nextIndex);
      window.setTimeout(() => setFlyerTransitioning(false), 80);
    }, 220);
  }, [activeFlyerIndex, latestFlyerJobs.length]);

  useEffect(() => {
    if (latestFlyerJobs.length < 2) return;
    const timer = window.setInterval(() => {
      transitionFlyer((activeFlyerIndex + 1) % latestFlyerJobs.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeFlyerIndex, latestFlyerJobs.length, transitionFlyer]);

  useEffect(() => {
    if (activeFlyerIndex >= latestFlyerJobs.length) setActiveFlyerIndex(0);
  }, [activeFlyerIndex, latestFlyerJobs.length]);

  const activeGalleryMedia = activeGallery?.media[activeGalleryMediaIndex] ?? null;

  return (
    <div className="min-h-screen bg-white font-body text-slate-800">
      {recruitmentNoticeVisible && (
        <aside role="alert" aria-label="Peringatan keamanan proses rekrutmen" className="w-full bg-gradient-to-r from-[#123f7b] via-[#174f91] to-[#123f7b] text-white shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-8 sm:py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-amber-300 sm:h-10 sm:w-10">
              <ShieldAlert size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-relaxed text-blue-50 sm:text-[13px] lg:whitespace-nowrap">
                <strong className="font-extrabold uppercase tracking-wide text-amber-300">Hati-hati penipuan!</strong>{' '}
                Seluruh proses rekrutmen di PT Bintang Sayap Utama tidak dipungut biaya apa pun.
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-blue-100 sm:text-[13px] lg:whitespace-nowrap">Untuk memastikan informasi, verifikasi melalui <button type="button" onClick={() => onNavigate('contact')} className="font-semibold text-amber-300 underline decoration-amber-300/70 underline-offset-2 transition hover:text-amber-200">kontak resmi perusahaan.</button> Jangan transfer uang atau bagikan OTP, PIN, kata sandi, maupun data bank.</p>
            </div>
            <button type="button" onClick={() => setRecruitmentNoticeVisible(false)} aria-label="Tutup peringatan rekrutmen" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-blue-100 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
              <CloseIcon size={19} aria-hidden="true" />
            </button>
          </div>
        </aside>
      )}
      <PageHeader active="home" onNavigate={onNavigate} onLoginClick={onLoginClick} onRoleSelect={onRoleSelect} user={currentUser} onProfileClick={onProfileClick} onDashboardClick={onDashboardClick} onPrkClick={onPrkClick} onLogout={onLogout} />

      {/* Hero */}
      <section className="career-hero relative flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden bg-[#f4f8f8] lg:h-[calc(100svh-4rem)] lg:min-h-[calc(100svh-4rem)]">
        <div className="mx-auto flex w-full flex-1 flex-col justify-center gap-6 pb-4 pt-8 lg:min-h-0 lg:gap-0 lg:pb-5 lg:pt-12">
          <div className="grid flex-1 items-center gap-8 lg:grid-cols-[.88fr_1.12fr] lg:gap-0">
          <Reveal className="relative z-10 px-6 py-2 sm:px-10 sm:py-3 lg:py-2 lg:pl-[max(2.5rem,calc((100vw-1280px)/2))] lg:pr-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#16766d]/15 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#16766d]">
              <Sparkles size={14} className="animate-pulse" /> Portal Resmi BSU Career
            </span>
            <h1 className="font-display mt-6 max-w-xl text-4xl font-semibold leading-[1.1] tracking-[-0.035em] text-[#142f35] md:text-[3.6rem]">
  Berkomitmen selalu{' '}
  <span className="text-[#16766d]">memberi</span>{' '}
  <span className="text-[#16766d]">
    yang terbaik
  </span>
</h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-slate-500">
              PT Bintang Sayap Utama — bagian dari Gudang Baru Group — menghimpun HR, distribusi, dan
              produksi dalam satu ekosistem. &ldquo;Menjadi yang Terbaik&rdquo; sejak 2012.
            </p>
          <div className="mt-6 w-full max-w-lg">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">Lowongan Terbaru</h2>
              </div>
            </div>

            {loadingOpenings ? (
              <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-slate-300/70 bg-transparent text-sm text-slate-400">Memuat lowongan terbaru...</div>
            ) : latestJobs.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-slate-300/70 bg-transparent px-4 text-center text-sm text-slate-500">Belum ada lowongan aktif saat ini. Silakan cek kembali nanti.</div>
            ) : (
              <>
                <div
                  ref={openingsCarouselRef}
                  onScroll={(event) => {
                    const container = event.currentTarget;
                    const center = container.getBoundingClientRect().left + container.clientWidth / 2;
                    const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-opening-card]'));
                    let nearestIndex = 0;
                    let nearestDistance = Number.POSITIVE_INFINITY;
                    cards.forEach((card, index) => {
                      const cardCenter = card.getBoundingClientRect().left + card.offsetWidth / 2;
                      const distance = Math.abs(center - cardCenter);
                      if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestIndex = index;
                      }
                    });
                    setActiveOpeningIndex(nearestIndex);
                  }}
                  className="flex snap-x snap-mandatory items-stretch gap-2 overflow-x-auto scroll-smooth py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  aria-label="Geser kartu lowongan untuk memilih posisi"
                >
                  <span aria-hidden="true" className="shrink-0 basis-0" />
                  {latestJobs.map((job, index) => {
                    const isActive = index === activeOpeningIndex;
                    return (
                      <button
                        key={job.id}
                        data-opening-card
                        type="button"
                        onClick={(event) => {
                          if (!isActive) {
                            event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                            return;
                          }
                          sessionStorage.setItem('portal-highlight-job-id', job.id);
                          onNavigate('career');
                        }}
                        aria-label={`${isActive ? 'Buka detail' : 'Pindahkan ke tengah'} lowongan ${job.title}, lokasi ${job.location}, batas lamaran ${formatJobDeadline(job.deadline)}`}
                        className={`group relative z-0 flex h-[104px] flex-[0_0_148px] snap-center flex-col justify-between rounded-xl p-2 text-left transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-teal/30 ${isActive ? 'z-10 scale-100 border border-blue-700/40 bg-gradient-to-br from-[#2459a6] to-[#3476bf] shadow-[0_20px_48px_rgba(36,89,166,.3)]' : 'scale-[.88] border border-white/80 bg-gradient-to-br from-white/75 via-white/55 to-brand-teal/10 opacity-80 shadow-[0_8px_24px_rgba(16,44,43,.08)] hover:opacity-100'}`}
                      >
                        <span className="flex items-start gap-2">
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-white/15 text-amber-300' : 'bg-brand-teal/10 text-brand-teal-dark group-hover:bg-brand-teal group-hover:text-white'}`}><Briefcase size={14} /></span>
                          <span className="min-w-0">
                            <span className={`block line-clamp-2 font-display text-[10px] font-bold leading-snug sm:text-[11px] ${isActive ? 'text-white' : 'text-slate-900'}`}>{job.title}</span>
                            <span className={`mt-1 flex items-center gap-1 truncate text-[9px] sm:text-[10px] ${isActive ? 'text-blue-50' : 'text-slate-500'}`}><MapPin size={11} className={`shrink-0 ${isActive ? 'text-amber-300' : 'text-brand-teal'}`} />{job.location}</span>
                          </span>
                        </span>
                        <span title={`Dibuka sampai ${formatJobDeadline(job.deadline)}`} className={`mt-1 flex items-center gap-1 whitespace-nowrap border-t pt-1 text-[7px] font-medium sm:text-[8px] ${isActive ? 'border-white/20 text-blue-50' : 'border-slate-200/70 text-slate-500'}`}><CalendarClock size={10} className={`shrink-0 ${isActive ? 'text-amber-300' : 'text-brand-blue'}`} />Dibuka sampai {formatJobDeadlineCompact(job.deadline)}</span>
                      </button>
                    );
                  })}
                  <span aria-hidden="true" className="shrink-0 basis-0" />
                </div>
              </>
            )}
          </div>
          </Reveal>

          <Reveal delay={150} from="right" className="career-hero-media relative mx-auto aspect-[4/3] w-full overflow-hidden bg-slate-200 sm:aspect-[16/10] lg:aspect-auto lg:h-[min(72vh,740px)]">
            <div className="absolute inset-0 overflow-hidden bg-slate-100">
              <img
                src={bsuPerusahaan}
                alt="Gedung kantor PT Bintang Sayap Utama"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#102e35]/75 via-[#102e35]/25 to-transparent" aria-hidden="true" />
            <div className="absolute bottom-5 left-5 sm:bottom-8 sm:left-8">
              <div className="flex items-center gap-3 rounded-2xl border border-white/35 bg-gradient-to-br from-[#102e35]/75 to-[#102e35]/45 px-4 py-3 shadow-xl backdrop-blur-lg sm:px-5">
                <span className="h-8 w-1 rounded-full bg-gradient-to-b from-[#8be0cb] to-[#49a99d] shadow-[0_0_12px_rgba(130,214,193,.45)]" />
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/65">Nilai Kami</p>
                  <p className="font-display mt-0.5 text-sm font-semibold tracking-wide text-white sm:text-base">Memberi yang Terbaik</p>
                </div>
              </div>
            </div>

            <div className="absolute right-[-42px] top-7 z-10 flex w-44 rotate-45 items-center justify-center gap-2 border-y border-white/35 bg-gradient-to-r from-[#126b78] to-[#168476] px-3 py-2 shadow-[0_8px_24px_rgba(10,48,52,.35)]">
              <UserRound size={12} className="text-white/90" />
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white">Sejak 2012</p>
            </div>

          </Reveal>
          </div>


        </div>
      </section>

      {/* Teaser video company profile — mengarah ke player di Tentang Perusahaan. */}
      <section className="bg-white px-5 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
              onNavigate('profile');
            }}
            aria-label="Buka halaman Tentang Perusahaan dan video Company Profile PT Bintang Sayap Utama"
            className="group relative block w-full min-h-[300px] overflow-hidden rounded-[1.75rem] bg-[#102e35] text-left shadow-[0_22px_65px_rgba(16,46,53,.2)] outline-none ring-brand-teal/30 transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_75px_rgba(16,46,53,.28)] focus-visible:ring-4 sm:min-h-[360px] lg:min-h-[420px]"
          >
            <img
              src={bsuPerusahaan}
              alt="Gedung PT Bintang Sayap Utama"
              className="absolute inset-0 h-full w-full object-cover opacity-65 transition duration-700 group-hover:scale-[1.025] group-hover:opacity-75"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a252b]/95 via-[#0a252b]/65 to-[#0a252b]/20" />
            <div className="relative flex min-h-[300px] flex-col justify-between gap-8 p-7 sm:min-h-[360px] sm:p-10 lg:min-h-[420px] lg:flex-row lg:items-center lg:px-14">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/85 backdrop-blur sm:text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#82d6c1]" /> Cerita Perusahaan
                </span>
                <h2 className="font-display mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Kenali BSU lebih dekat
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/75 sm:text-base sm:leading-7">
                  Saksikan video company profile PT Bintang Sayap Utama.
                </p>
              </div>
              <div className="flex items-center gap-4 self-start lg:flex-col lg:self-center">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/55 bg-white/15 text-white shadow-xl backdrop-blur-md transition duration-300 group-hover:scale-110 group-hover:bg-white group-hover:text-[#126b78] sm:h-20 sm:w-20">
                  <Play size={24} fill="currentColor" className="ml-1 sm:h-7 sm:w-7" />
                </span>
                <span className="text-sm font-semibold text-white/90">Putar video</span>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* CTA Cek Status Lamaran */}
      <section className="bg-white py-6 sm:py-8">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="flex flex-col items-start justify-between gap-5 rounded-2xl bg-[#126b78] p-6 text-white sm:flex-row sm:items-center sm:p-7">
            <div className="flex items-start gap-4">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                <span className="absolute inset-0 rounded-2xl bg-white/25 animate-ping" />
                <ClipboardCheck size={22} className="relative" />
              </div>
              <div>
                <p className="font-display text-lg font-bold">Cek Status Lamaran</p>
                <p className="mt-1 max-w-md text-sm text-white/85">
                  Sudah pernah mendaftar sebelumnya? Cek di sini sudah sampai tahap mana proses lamaran
                  Anda.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStatusOpen(true)}
              className="relative z-[2] inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand-blue-dark shadow-sm transition-transform hover:scale-[1.03] hover:bg-brand-teal/10"
            >
              <FileSearch size={15} />
              Cek Status Lamaran
            </button>
          </Reveal>
        </div>
      </section>

      {/* Galeri flyer publik untuk pratinjau materi lowongan. */}
      <section className="relative overflow-hidden bg-slate-50 py-6 sm:py-8">
        <div className="pointer-events-none absolute -right-24 top-10 h-64 w-64 rounded-full bg-brand-teal/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-brand-blue/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-6">
          <Reveal className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-teal-dark">Materi Rekrutmen</p>
            <h2 className="font-display mt-2 text-3xl font-bold text-slate-900">Flyer Lowongan</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-500">Pratinjau informasi lengkap dari flyer lowongan yang sedang dibuka.</p>
          </Reveal>

          {loadingOpenings ? (
            <p className="mt-8 rounded-2xl bg-white p-8 text-center text-sm text-slate-400">Memuat flyer lowongan...</p>
          ) : latestFlyerJobs.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">Belum ada flyer lowongan terbaru yang dipublikasikan.</p>
          ) : (
            <div className="relative mx-auto mt-2 h-[280px] max-w-6xl overflow-hidden sm:h-[340px] lg:h-[360px]">
              {latestFlyerJobs.map((job, index) => {
                const directOffset = index - activeFlyerIndex;
                const halfCount = Math.floor(latestFlyerJobs.length / 2);
                const distance = directOffset > halfCount ? directOffset - latestFlyerJobs.length : directOffset < -halfCount ? directOffset + latestFlyerJobs.length : directOffset;
                const isActive = distance === 0;
                const isVisible = Math.abs(distance) <= 2;
                const scale = isActive ? 1 : Math.abs(distance) === 1 ? 0.76 : 0.56;
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => isActive ? setPreviewFlyer(job) : transitionFlyer(index)}
                    aria-label={isActive ? `Perbesar flyer ${job.title}` : `Tampilkan flyer ${job.title}`}
                    aria-current={isActive ? 'true' : undefined}
                    className={`absolute top-1/2 block w-[min(50vw,300px)] -translate-y-1/2 overflow-visible rounded-none bg-transparent shadow-none transition-all duration-500 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-teal/30 ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'} ${isActive && flyerTransitioning ? 'opacity-50 grayscale-[.35]' : isActive ? 'opacity-100 grayscale-0' : 'opacity-45 grayscale-[.25] hover:opacity-70'}`}
                    style={{ left: '50%', transform: `translate(calc(-50% + ${distance * flyerSlideStep}px), -50%) scale(${flyerTransitioning && isActive ? 0.96 : scale})`, zIndex: 10 - Math.abs(distance), visibility: isVisible ? 'visible' : 'hidden' }}
                  >
                    <img src={job.flyerUrl!} alt={`Flyer ${job.title}`} className="block max-h-[260px] w-full object-contain drop-shadow-sm sm:max-h-[320px] lg:max-h-[340px]" loading={Math.abs(distance) > 1 ? 'lazy' : 'eager'} />
                  </button>
                );
              })}
              {latestFlyerJobs.length > 1 && (
                <>
                  <button type="button" onClick={() => transitionFlyer((activeFlyerIndex - 1 + latestFlyerJobs.length) % latestFlyerJobs.length)} aria-label="Tampilkan flyer sebelumnya" className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-800 shadow-lg ring-1 ring-slate-200 transition hover:scale-105 hover:text-brand-teal sm:left-5 sm:h-12 sm:w-12"><ChevronLeft size={22} /></button>
                  <button type="button" onClick={() => transitionFlyer((activeFlyerIndex + 1) % latestFlyerJobs.length)} aria-label="Tampilkan flyer berikutnya" className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-800 shadow-lg ring-1 ring-slate-200 transition hover:scale-105 hover:text-brand-teal sm:right-5 sm:h-12 sm:w-12"><ChevronRight size={22} /></button>
                </>
              )}
            </div>
          )}
          {!loadingOpenings && latestFlyerJobs.length > 0 && (
            <div className="mt-3 flex flex-col items-center gap-3">
              {latestFlyerJobs.length > 1 && <div className="flex items-center gap-2" aria-label="Pilih flyer">
                {latestFlyerJobs.map((job, index) => <button key={job.id} type="button" onClick={() => transitionFlyer(index)} aria-label={`Pilih flyer ${index + 1}: ${job.title}`} aria-current={index === activeFlyerIndex ? 'true' : undefined} className={`h-2.5 rounded-full transition-all ${index === activeFlyerIndex ? 'w-7 bg-brand-teal' : 'w-2.5 bg-slate-300 hover:bg-slate-400'}`} />)}
              </div>}
              <p className="text-center text-sm font-semibold tracking-wide text-brand-blue">Temukan peluang Anda bersama PT Bintang Sayap Utama</p>
            </div>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-sky-50/70 py-10 sm:py-12">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/5">
              <div className="relative overflow-hidden bg-gradient-to-r from-[#123d50] via-[#14717a] to-[#7077a6] px-6 py-7 text-white sm:px-9 sm:py-9">
                <div aria-hidden="true" className="absolute -right-8 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <div aria-hidden="true" className="absolute bottom-[-6rem] right-[28%] h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl" />
                <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div>
                    <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-50"><Sparkles size={14} /> Alur karier</p>
                    <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Tahapan Recruitment</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">Kenali perjalanan lamaran Anda dari memilih lowongan hingga onboarding bersama PT Bintang Sayap Utama.</p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-8">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">Satu perjalanan, tujuh langkah penting</p>
                  <p className="text-xs font-medium text-slate-400">Geser atau gulir untuk melihat semua tahapan</p>
                </div>
                <div className="grid auto-rows-fr items-stretch gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7">
                  {APPLICATION_STAGES.map((stage, index) => {
                    const StageIcon = stage.icon;
                    const palette = STAGE_COLORS[index];
                    return (
                      <div key={stage.label} className="group relative h-full">
                        <article className="relative flex h-full min-h-[215px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-4 transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/10">
                          <div aria-hidden="true" className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${palette.glow} blur-2xl transition-transform duration-500 group-hover:scale-150`} />
                          <div className="relative flex items-start justify-between gap-2">
                            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm transition duration-300 group-hover:rotate-3 group-hover:scale-105 ${palette.point}`}><StageIcon size={20} /></span>
                            <span className="font-mono text-xs font-bold tracking-wider text-slate-300">0{index + 1}</span>
                          </div>
                          <div className="relative mt-5">
                            <h3 className={`text-sm font-bold leading-5 ${palette.text}`}>{stage.label}</h3>
                            <p className="mt-2 text-xs leading-5 text-slate-500">{stage.description}</p>
                          </div>
                          <div className="relative mt-auto pt-5">
                            <div className={`h-1.5 overflow-hidden rounded-full ${palette.soft}`}><div className={`h-full w-2/3 rounded-full ${palette.point}`} /></div>
                            <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">Tahap {String(index + 1).padStart(2, '0')}</p>
                          </div>
                        </article>
                        {index < APPLICATION_STAGES.length - 1 && <span aria-hidden="true" className="absolute -right-2.5 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-slate-200 bg-white p-1 text-slate-400 shadow-sm xl:flex"><ArrowRight size={13} /></span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {statusOpen && <ApplicationStatusModal onClose={() => setStatusOpen(false)} />}

      {/* Jaringan Regional & ASO — daftar Regional -> ASO/Area (sumber:
          COST_CENTER.pdf lewat src/lib/costCenter.ts) plus peta lokasi
          masing-masing ASO. Lihat src/components/RegionalNetworkSection.tsx */}
      <RegionalNetworkSection />

      {/* Galeri kegiatan — setiap kartu mewakili satu album dengan banyak media. */}
      <section className="relative overflow-hidden bg-slate-50 py-10 sm:py-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-cyan-100/50 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-amber-100/40 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-6xl px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gold-dark">Dokumentasi</p>
            <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Galeri Kegiatan BSU</h2>
            <p className="mt-4 leading-7 text-slate-500">
              Setiap kegiatan memiliki album tersendiri yang berisi kumpulan foto dan video dokumentasi.
              Pilih kegiatan untuk melihat seluruh momennya.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {galleryActivities.map((activity, i) => (
              <Reveal key={activity.title} delay={i * 70}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveGallery(activity);
                    setActiveGalleryMediaIndex(0);
                  }}
                  onMouseMove={handleSpotlight}
                  style={{ '--accent': activity.color } as CSSProperties}
                  aria-label={`Buka album ${activity.title}, ${activity.media.length} dokumentasi`}
                  className="spotlight group relative block h-full w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-left shadow-[0_8px_28px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_-18px_var(--accent)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-teal/20"
                >
                  <div className="relative grid h-52 grid-cols-[1.3fr_1fr] grid-rows-2 gap-1 overflow-hidden bg-slate-100">
                    {activity.media.slice(0, 3).map((media, mediaIndex) => (
                      <span key={`${activity.title}-preview-${mediaIndex}`} className={`relative min-h-0 overflow-hidden ${mediaIndex === 0 ? 'row-span-2' : ''}`}>
                        <img
                          src={media.thumbnail}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                        <span className="absolute inset-0 bg-gradient-to-t from-slate-950/30 to-transparent" />
                        {media.type === 'video' && (
                          <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg"><Play size={15} fill="currentColor" /></span>
                          </span>
                        )}
                        {mediaIndex === 2 && activity.media.length > 3 && (
                          <span className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-lg font-bold text-white">+{activity.media.length - 3}</span>
                        )}
                      </span>
                    ))}
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm backdrop-blur">
                      <ImageIcon size={13} style={{ color: activity.color }} />{activity.media.length} dokumentasi
                    </span>
                  </div>

                  <div className="p-5">
                    <p className="font-display text-base font-bold leading-snug text-slate-900 transition group-hover:text-brand-blue-dark">{activity.title}</p>
                    <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">{activity.caption}</p>
                    <span className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500"><ImageIcon size={14} className="text-slate-400" />Foto &amp; video</span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-teal-dark transition group-hover:gap-2">Lihat album<ArrowRight size={14} /></span>
                    </span>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>

          {galleryActivities === GALLERY_ACTIVITIES && <p className="mt-5 text-center text-xs text-slate-400">Galeri akan diperbarui oleh Tim Recruitment melalui dashboard.</p>}
        </div>
      </section>

      {/* Album kegiatan: viewer utama, navigasi, dan pilihan semua dokumentasi. */}
      {activeGallery && activeGalleryMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Album ${activeGallery.title}`}
          onClick={() => setActiveGallery(null)}
        >
          <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-teal-dark">Album kegiatan</p>
                <h3 className="mt-1 truncate font-display text-lg font-bold text-slate-900 sm:text-xl">{activeGallery.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{activeGallery.caption}</p>
              </div>
              <button type="button" onClick={() => setActiveGallery(null)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200" aria-label="Tutup album">
                <CloseIcon size={18} />
              </button>
            </header>

            <div
              className="relative flex min-h-0 flex-1 items-center justify-center bg-slate-950 bg-cover bg-center"
              style={activeGallery.backgroundUrl ? { backgroundImage: `linear-gradient(rgba(0,0,0,.38), rgba(0,0,0,.38)), url(${activeGallery.backgroundUrl})` } : undefined}
            >
              {activeGalleryMedia.type === 'video' ? (
                <video key={activeGalleryMedia.src} src={activeGalleryMedia.src} poster={activeGalleryMedia.thumbnail} controls autoPlay playsInline className="max-h-[55vh] w-full bg-black object-contain sm:max-h-[62vh]" />
              ) : (
                <img src={activeGalleryMedia.src} alt={`${activeGallery.title}: ${activeGalleryMedia.caption}`} className="max-h-[55vh] w-full object-contain sm:max-h-[62vh]" />
              )}
              {activeGallery.media.length > 1 && (
                <>
                  <button type="button" onClick={() => setActiveGalleryMediaIndex((index) => (index - 1 + activeGallery.media.length) % activeGallery.media.length)} aria-label="Dokumentasi sebelumnya" className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg transition hover:scale-105"><ChevronLeft size={21} /></button>
                  <button type="button" onClick={() => setActiveGalleryMediaIndex((index) => (index + 1) % activeGallery.media.length)} aria-label="Dokumentasi berikutnya" className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg transition hover:scale-105"><ChevronRight size={21} /></button>
                </>
              )}
              <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{activeGalleryMediaIndex + 1} / {activeGallery.media.length}</span>
            </div>

            <div className="border-b border-slate-100 px-5 py-3 sm:px-6">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">{activeGalleryMedia.type === 'video' ? <><VideoIcon size={13} />Video</> : <><ImageIcon size={13} />Foto</>}</p>
            </div>

            <div className="shrink-0 overflow-x-auto bg-slate-50 px-4 py-3 sm:px-5">
              <div className="flex w-max gap-2.5">
                {activeGallery.media.map((media, mediaIndex) => (
                  <button key={`${activeGallery.title}-media-${mediaIndex}`} type="button" onClick={() => setActiveGalleryMediaIndex(mediaIndex)} aria-label={`Tampilkan ${media.type === 'video' ? 'video' : 'foto'} ${mediaIndex + 1}`} aria-current={activeGalleryMediaIndex === mediaIndex ? 'true' : undefined} className={`group/thumb relative block w-24 overflow-hidden rounded-lg border-2 text-left transition sm:w-28 ${activeGalleryMediaIndex === mediaIndex ? 'border-brand-teal shadow-md' : 'border-transparent opacity-75 hover:opacity-100'}`}>
                    <span className="relative block h-14 overflow-hidden sm:h-16">
                      <img src={media.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover/thumb:scale-105" />
                      {media.type === 'video' && <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-white"><Play size={14} fill="currentColor" /></span>}
                    </span>
                    <span className="block truncate bg-white px-1.5 py-1 text-[10px] font-medium text-slate-500">{media.type === 'video' ? 'Video' : `Foto ${mediaIndex + 1}`}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <PageFooter onNavigate={onNavigate} onLoginClick={onLoginClick} />
      {previewFlyer && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label={`Pratinjau flyer ${previewFlyer.title}`} onClick={() => setPreviewFlyer(null)}>
          <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col items-center rounded-2xl bg-slate-950 p-3 shadow-2xl sm:p-5" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setPreviewFlyer(null)} aria-label="Tutup pratinjau flyer" className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-slate-700 shadow transition hover:bg-white"><CloseIcon size={20} /></button>
            <img src={previewFlyer.flyerUrl || ''} alt={`Flyer ${previewFlyer.title}`} className="max-h-[calc(94vh-88px)] w-full rounded-lg object-contain" />
            <p className="mt-3 text-center text-sm font-semibold text-white">{previewFlyer.title}</p>
          </div>
        </div>
      )}
      <ChatbotWidget />
    </div>
  );
}
