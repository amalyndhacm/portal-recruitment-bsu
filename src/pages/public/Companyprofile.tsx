import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  Sprout,
  HeartHandshake,
  Compass,
  Landmark,
  Target,
  Eye,
  CheckCircle2,
  Play,
  Pause,
  UserRound,
} from 'lucide-react';
import bsuPerusahaan from '@/asset/images/perusahaan.jpeg';
import ChatbotWidget from '@/components/dashboard/ChatbotWidget';
import PageHeader, { type PageKey } from '@/pages/public/PageHeader';
import PageFooter from '@/pages/public/PageFooter';

// ---------------------------------------------------------------------------
// Halaman ini menampung konten Tentang Kami, Legalitas, Visi/Misi,
// Budaya Perusahaan, Layanan, dan Jajaran Direksi.
// ---------------------------------------------------------------------------

const WINGS = [
  { key: 'sky', hex: '#38bdf8' },
  { key: 'emerald', hex: '#10b981' },
  { key: 'amber', hex: '#f59e0b' },
  { key: 'rose', hex: '#f43f5e' },
  { key: 'navy', hex: '#1d4ed8' },
] as const;

const VALUES = [
  {
    icon: ShieldCheck,
    color: WINGS[0].hex,
    title: 'Keimanan & Integritas',
    desc: 'Beriman kepada Tuhan Yang Maha Esa, jujur, sehat, ulet, dan semangat untuk sukses dunia dan akhirat.',
  },
  {
    icon: HeartHandshake,
    color: WINGS[3].hex,
    title: 'Kepedulian Sosial',
    desc: 'Kepedulian dan kebermanfaatan bagi masyarakat dan lingkungan sekitar.',
  },
  {
    icon: Sprout,
    color: WINGS[1].hex,
    title: 'Pengembangan Pegawai',
    desc: 'Pengembangan pegawai untuk pertumbuhan dan keberlanjutan perusahaan.',
  },
  {
    icon: Compass,
    color: WINGS[2].hex,
    title: 'Kebersamaan & Kemitraan',
    desc: 'Kesuksesan diraih melalui kebersamaan dan saling dukung. Pelanggan adalah mitra strategis yang saling memberi manfaat.',
  },
];

const MILESTONES = [
  { year: 'SIUP', desc: 'Surat Izin Usaha Perdagangan (SIUP) Besar No. 180/0018/SIUP.B/421.302/2013, 7 Maret 2013.' },
  { year: 'Badan Hukum', desc: 'Pengesahan Badan Hukum Perseroan No. AHU-35558.AH.01.01 Tahun 2012, 29 Juni 2012.' },
  { year: 'TDP', desc: 'Tanda Daftar Perusahaan (TDP) No. 132515101065, 8 Maret 2013.' },
  { year: 'NPWP', desc: 'Nomor Pokok Wajib Pajak (NPWP): 31.512.686.2.654.000.' },
];

const SERVICES = [
  'Distribusi produk hasil tembakau dengan jaringan lebih dari 40 kota di Indonesia',
  'Bagian dari Gudang Baru Group bersama PT Gudang Baru Berkah, PT Bintang Sayap Insan, PT Berca Sauti Tobacco, dan PT Harmoni Berkah Saman',
  'Struktur organisasi jenjang jelas: Marketing, Accounting & Finance, Human Resources, dan Internal Control',
  'Didukung 1.598 pegawai (per Mei 2026) yang tersebar di kantor pusat dan seluruh ASO cabang',
  'Legalitas usaha lengkap: SIUP Besar, Pengesahan Badan Hukum, TDP, dan NPWP',
];

const DIREKSI = [
  { role: 'Komisaris Utama', name: 'Ny. Farikha Medina', color: WINGS[0].hex },
  { role: 'Komisaris', name: 'Tn. Ali Usman', color: WINGS[1].hex },
  { role: 'Direktur', name: 'Tn. Na\u2019am Sobir', color: WINGS[4].hex },
];

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
    from === 'left' ? '-translate-x-8 opacity-0' : from === 'right' ? 'translate-x-8 opacity-0' : 'translate-y-6 opacity-0';
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'translate-x-0 translate-y-0 opacity-100' : hidden
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function CompanyProfilePage({
  onNavigate,
  onLoginClick,
}: {
  onNavigate: (page: PageKey) => void;
  onLoginClick: () => void;
}) {
  const [companyVideoPlaying, setCompanyVideoPlaying] = useState(false);
  const companyVideoRef = useRef<HTMLVideoElement | null>(null);
  const [companyVideoControlsVisible, setCompanyVideoControlsVisible] = useState(true);
  const [companyVideoControlsVersion, setCompanyVideoControlsVersion] = useState(0);

  useEffect(() => {
    if (!companyVideoPlaying || !companyVideoControlsVisible) return;
    const timer = window.setTimeout(() => setCompanyVideoControlsVisible(false), 2800);
    return () => window.clearTimeout(timer);
  }, [companyVideoPlaying, companyVideoControlsVisible, companyVideoControlsVersion]);

  const revealCompanyVideoControls = () => {
    setCompanyVideoControlsVisible(true);
    setCompanyVideoControlsVersion((version) => version + 1);
  };

  const toggleCompanyVideo = () => {
    const video = companyVideoRef.current;
    if (!video) return;
    if (video.paused) {
      // Sumber video memiliki intro hitam pada detik pertama; mulai dari frame yang sudah terlihat.
      if (video.currentTime < 2 || video.ended) video.currentTime = 2;
      void video.play().catch(() => setCompanyVideoPlaying(false));
    } else {
      video.pause();
    }
  };

  return (
    <div className="min-h-screen bg-white font-body text-slate-800">
      <PageHeader active="profile" onNavigate={onNavigate} onLoginClick={onLoginClick} />

      {/* Video profil perusahaan dengan poster awal dan kontrol tunggal di tengah. */}
      <section aria-label="Video profil PT Bintang Sayap Utama" className="w-full bg-black">
        <div
          className="relative aspect-video w-full overflow-hidden bg-black md:aspect-[2/1] lg:aspect-[2.15/1]"
          onClick={(event) => {
            if ((event.target as Element).closest('button')) return;
            revealCompanyVideoControls();
          }}
        >
          <video
            ref={companyVideoRef}
            poster={`${import.meta.env.BASE_URL}media/bsu-company-profile-poster.jpg`}
            preload="metadata"
            playsInline
            aria-label="Video Company Profile PT Bintang Sayap Utama"
            className="absolute inset-0 h-full w-full bg-black object-cover"
            onPlay={() => {
              setCompanyVideoPlaying(true);
              revealCompanyVideoControls();
            }}
            onPause={() => {
              setCompanyVideoPlaying(false);
              setCompanyVideoControlsVisible(true);
            }}
            onEnded={() => {
              setCompanyVideoPlaying(false);
              setCompanyVideoControlsVisible(true);
              if (companyVideoRef.current) companyVideoRef.current.currentTime = 2;
            }}
          >
            <source src={`${import.meta.env.BASE_URL}media/bsu-company-profile.mp4`} type="video/mp4" />
          </video>
          <button
            type="button"
            onClick={toggleCompanyVideo}
            aria-label={companyVideoPlaying ? 'Jeda video profil perusahaan' : 'Putar video profil perusahaan'}
            className={`absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-[#126b78]/90 text-white shadow-xl backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:bg-[#0d5964] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60 sm:h-20 sm:w-20 ${companyVideoControlsVisible ? 'scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0'}`}
          >
            {companyVideoPlaying ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" className="ml-1" />}
          </button>
        </div>
      </section>

      {/* Page title */}
      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">Profil Perusahaan</p>
          <h1 className="font-display mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
            Tentang PT Bintang Sayap Utama
          </h1>
        </div>
      </section>

      {/* Tentang Kami */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal from="left">
              <div className="overflow-hidden rounded-2xl shadow-sm">
                <img
                  src={bsuPerusahaan}
                  alt="Gedung kantor PT Bintang Sayap Utama"
                  className="h-full w-full object-cover"
                />
              </div>
            </Reveal>

            <Reveal from="right" delay={100}>
              <h2 className="font-display flex items-center gap-2.5 text-2xl font-bold text-slate-900">
                <Landmark size={24} className="text-sky-600" /> Tentang Kami
              </h2>
              <span className="mt-3 block h-1 w-14 rounded-full bg-gradient-to-r from-sky-500 to-blue-600" />
              <p className="mt-4 text-slate-500">
                PT Bintang Sayap Utama merupakan perusahaan yang bergerak di bidang distribusi produk hasil
                tembakau, berkedudukan di Kepanjen, Kabupaten Malang, Jawa Timur. Perusahaan ini didirikan
                dalam rangka mengemban misi usaha dari <strong className="font-semibold text-slate-700">&ldquo;Gudang Baru Group&rdquo;</strong> untuk
                menciptakan nilai berkelanjutan melalui pengembangan organisasi dan citra perusahaan di
                masyarakat.
              </p>
              <p className="mt-4 text-slate-500">
                PT Bintang Sayap Utama didirikan berdasarkan Akta Nomor 19 tanggal 14 April 2012 oleh
                Notaris Diah Aju Wisnuwardhani, SH, M.Hum di Malang. Seiring berjalannya waktu, PT Bintang
                Sayap Utama telah memantapkan diri sebagai perusahaan distribusi nasional terkemuka dalam
                memberikan jasa pelayanan jaringan terpadu mata rantai penyediaan produk berkualitas.
              </p>
              <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                &ldquo;Menjadi yang Terbaik&rdquo;
              </p>
            </Reveal>
          </div>

          <Reveal delay={150} className="mt-14">
            <p className="mb-5 text-sm font-semibold text-slate-700">Legalitas Perusahaan</p>
            <ol className="grid gap-6 border-t border-slate-200 pt-10 sm:grid-cols-2 lg:grid-cols-4">
              {MILESTONES.map((m, i) => (
                <li key={m.year} className="relative pl-6">
                  <span
                    className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: WINGS[i % WINGS.length].hex }}
                  />
                  <p className="font-display text-sm font-bold text-slate-900">{m.year}</p>
                  <p className="mt-1 text-sm text-slate-500">{m.desc}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* Visi & Misi */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Profil Perusahaan</p>
            <h2 className="font-display mt-2 text-2xl font-bold text-slate-900">Visi &amp; Misi</h2>
          </Reveal>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Reveal from="left">
              <div className="h-full rounded-2xl border border-slate-200 p-7">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Eye size={20} />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-slate-900">Visi</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Menjadi mitra HR pilihan yang dipercaya untuk merawat perjalanan setiap karyawan, dari hari
                  pertama bergabung hingga masa purna tugas.
                </p>
              </div>
            </Reveal>
            <Reveal from="right" delay={100}>
              <div className="h-full rounded-2xl border border-slate-200 p-7">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Target size={20} />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-slate-900">Misi</h3>
                <ul className="mt-3 space-y-2.5">
                  {[
                    'Secara berkesinambungan menyediakan produk yang berkualitas untuk memenuhi kebutuhan pelanggan.',
                    'Mengembangkan jaringan distribusi nasional.',
                    'Menjadikan pelanggan sebagai mitra bisnis yang saling menguntungkan.',
                    'Mengembangkan sumber daya manusia yang berkompeten dengan menciptakan lingkungan kerja produktif untuk mendukung kepuasan pelanggan.',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-slate-500">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
          <div className="mt-16">
            <Reveal className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Nilai Perusahaan</p>
              <h3 className="font-display mt-2 text-2xl font-bold text-slate-900">Budaya Perusahaan</h3>
            </Reveal>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {VALUES.map((v, i) => (
                <Reveal key={v.title} delay={i * 100}>
                  <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                      style={{ backgroundColor: `${v.color}1a`, color: v.color }}
                    >
                      <v.icon size={20} />
                    </div>
                    <h3 className="mt-4 font-semibold text-slate-900">{v.title}</h3>
                    <p className="mt-1.5 text-sm text-slate-500">{v.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Layanan + Direksi */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal from="left" className="order-2 lg:order-1">
              <div className="overflow-hidden rounded-2xl shadow-sm">
                <img
                  src="https://picsum.photos/seed/bsu-tim/800/560"
                  alt="Tim PT Bintang Sayap Utama"
                  className="h-full w-full object-cover"
                />
              </div>
            </Reveal>

            <Reveal from="right" delay={100} className="order-1 lg:order-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">Profil Bisnis</p>
              <h2 className="font-display mt-2 text-2xl font-bold text-slate-900">Distribusi Nasional, Jaringan Terpadu</h2>
              <p className="mt-4 text-slate-500">
                Sebagai bagian dari Gudang Baru Group, PT Bintang Sayap Utama memantapkan diri sebagai
                perusahaan distribusi nasional terkemuka dalam melayani jaringan terpadu mata rantai
                penyediaan produk berkualitas.
              </p>
              <ul className="mt-6 space-y-3">
                {SERVICES.map((s, i) => (
                  <li key={s} className="flex items-start gap-3">
                    <CheckCircle2 size={19} className="mt-0.5 shrink-0" style={{ color: WINGS[i % WINGS.length].hex }} />
                    <span className="text-sm text-slate-600">{s}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <Reveal className="mt-16 border-t border-slate-200 pt-12">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-600">Kepemimpinan</p>
            <h3 className="font-display mt-2 text-2xl font-bold text-slate-900">Jajaran Direksi</h3>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {DIREKSI.map((d) => (
                <div key={d.role} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                  <div
                    className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: d.color }}
                  >
                    <UserRound size={20} />
                  </div>
                  <p className="mt-3 font-display text-base font-bold text-slate-900">{d.name}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{d.role}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <PageFooter onNavigate={onNavigate} onLoginClick={onLoginClick} />
      <ChatbotWidget />
    </div>
  );
}
