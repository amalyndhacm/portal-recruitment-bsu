import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ArrowLeft, BriefcaseBusiness, Building2, CalendarClock, Check, ChevronLeft, ChevronRight, Copy, MapPin, Search, Users } from 'lucide-react';
import ChatbotWidget from '@/components/dashboard/ChatbotWidget';
import JobApplicationForm from '@/components/recruitment/JobApplicationForm';
import PageHeader, { type PageKey } from '@/pages/public/PageHeader';
import PageFooter from '@/pages/public/PageFooter';
import { fetchCareerJobOpenings, type JobOpening } from '@/lib/jobOpenings';

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function formatCareerDeadline(deadline: string) {
  const date = new Date(`${deadline}T00:00:00`);
  if (Number.isNaN(date.getTime())) return deadline;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getJobDetailSections(job: JobOpening) {
  const qualifications: string[] = [];
  const responsibilities = [...(job.responsibilities || [])];

  for (const rawItem of job.qualifications || []) {
    const item = rawItem.trim();
    if (!item) continue;
    if (/^(?:Kebutuhan|Jumlah kebutuhan):\s*\d+\s*orang$/i.test(item)) continue;
    if (/^Bertanggung jawab kepada:/i.test(item)) {
      responsibilities.push(item.replace(/^Bertanggung jawab kepada:\s*/i, 'Lingkup tanggung jawab: '));
    } else if (/^Tugas utama:/i.test(item)) {
      responsibilities.push(item.replace(/^Tugas utama:\s*/i, ''));
    } else {
      qualifications.push(item);
    }
  }

  return {
    qualifications,
    responsibilities: responsibilities.filter(Boolean),
    benefits: (job.benefits || []).filter(Boolean),
  };
}

export default function CareerPage({ onNavigate, onLoginClick, isAuthenticated, onCandidateAuthRequired }: { onNavigate: (page: PageKey) => void; onLoginClick: () => void; isAuthenticated: boolean; onCandidateAuthRequired: (jobId: string, action: 'register' | 'login') => void }) {
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [authPromptJob, setAuthPromptJob] = useState<JobOpening | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);
  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [loadingOpenings, setLoadingOpenings] = useState(true);
  const [query, setQuery] = useState('');
  const [division, setDivision] = useState('Semua Departemen');
  const [location, setLocation] = useState('Semua Lokasi');
  const [highlightedJobId, setHighlightedJobId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
      const targetId = sessionStorage.getItem('portal-highlight-job-id');
    if (targetId) {
      setHighlightedJobId(targetId);
      sessionStorage.removeItem('portal-highlight-job-id');
    }
    fetchCareerJobOpenings().then((data) => {
      setOpenings(data);
      setLoadingOpenings(false);
      const pendingApplicationJobId = isAuthenticated
        ? sessionStorage.getItem('portal-pending-application-job-id')
        : null;
      if (pendingApplicationJobId) {
        const pendingJob = data.find((job) => job.id === pendingApplicationJobId && job.isActive);
        sessionStorage.removeItem('portal-pending-application-job-id');
        if (pendingJob) setApplyingTo(pendingJob.title);
      }
      if (targetId) {
        const target = data.find((job) => job.id === targetId);
        if (target?.isActive) setSelectedJob(target);
      }
      const sharedJobId = new URLSearchParams(window.location.search).get('lowongan');
      if (sharedJobId) {
        const sharedJob = data.find((job) => job.id === sharedJobId);
        if (sharedJob) setSelectedJob(sharedJob);
      }
    });
  }, [isAuthenticated]);

  useEffect(() => {
    const syncDetailFromUrl = () => {
      const sharedJobId = new URLSearchParams(window.location.search).get('lowongan');
      const sharedJob = sharedJobId ? openings.find((job) => job.id === sharedJobId) : null;
      setSelectedJob(sharedJob || null);
    };
    window.addEventListener('popstate', syncDetailFromUrl);
    return () => window.removeEventListener('popstate', syncDetailFromUrl);
  }, [openings]);

  useEffect(() => {
    if (!loadingOpenings && highlightedJobId && !selectedJob) {
      const element = document.getElementById(`job-opening-${highlightedJobId}`);
      if (element) window.setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    }
  }, [loadingOpenings, highlightedJobId, selectedJob]);

  const activeOpenings = openings.filter((job) => job.isActive);
  const selectedJobDetails = selectedJob ? getJobDetailSections(selectedJob) : null;
  const divisions = Array.from(new Set(activeOpenings.map((job) => job.division).filter(Boolean)));
  const locations = Array.from(new Set(activeOpenings.map((job) => job.location).filter(Boolean)));
  const filtered = activeOpenings.filter((job) => {
    const needle = query.trim().toLowerCase();
    return (!needle || `${job.title} ${job.division} ${job.location}`.toLowerCase().includes(needle))
      && (division === 'Semua Departemen' || job.division === division)
      && (location === 'Semua Lokasi' || job.location === location);
  });
  const pageSize = 5;
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedOpenings = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, division, location]);

  const updateSharedJobUrl = (jobId?: string) => {
    const url = new URL(window.location.href);
    if (jobId) url.searchParams.set('lowongan', jobId);
    else url.searchParams.delete('lowongan');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const openJobDetail = (job: JobOpening) => {
    updateSharedJobUrl(job.id);
    setSelectedJob(job);
  };

  const returnToListings = () => {
    updateSharedJobUrl();
    setSelectedJob(null);
    setHighlightedJobId(null);
  };

  const copyJobLink = async (jobId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('lowongan', jobId);
    const link = url.toString();
    try {
      await navigator.clipboard.writeText(link);
      setCopiedJobId(jobId);
      window.setTimeout(() => setCopiedJobId((current) => current === jobId ? null : current), 2500);
    } catch {
      window.prompt('Salin tautan detail lowongan ini:', link);
    }
  };

  const startApplication = (job: JobOpening) => {
    if (isAuthenticated) {
      setApplyingTo(job.title);
      return;
    }
    setAuthPromptJob(job);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-body text-slate-800">
      <PageHeader active="career" onNavigate={onNavigate} onLoginClick={onLoginClick} />
      <style>{`
        @keyframes recruitment-detail-zoom {
          0% { opacity: 0; transform: scale(.84) translateY(18px); filter: blur(4px); }
          68% { opacity: 1; transform: scale(1.015) translateY(0); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .recruitment-detail-zoom { animation: none !important; }
        }
      `}</style>

      {authPromptJob && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthPromptJob(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="candidate-auth-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Users size={23} /></div>
            <h2 id="candidate-auth-title" className="mt-4 text-xl font-bold text-slate-900">Masuk sebagai kandidat untuk melamar</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Untuk melamar posisi <strong>{authPromptJob.title}</strong>, buat akun kandidat terlebih dahulu atau masuk dengan akun kandidat menggunakan email dan password.</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => onCandidateAuthRequired(authPromptJob.id, 'register')} className="rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800">Daftar akun kandidat</button>
              <button type="button" onClick={() => onCandidateAuthRequired(authPromptJob.id, 'login')} className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Saya sudah punya akun</button>
            </div>
            <button type="button" onClick={() => setAuthPromptJob(null)} className="mt-3 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100">Nanti saja</button>
          </section>
        </div>
      )}

      {applyingTo ? (
        <JobApplicationForm openings={activeOpenings} initialPosition={applyingTo} onClose={() => setApplyingTo(null)} />
      ) : selectedJob ? (
        <main key={`detail-${selectedJob.id}`} className="min-h-[calc(100vh-72px)]">
          <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#174b91] via-[#2465b2] to-[#3278bd] text-white">
            <div className="pointer-events-none absolute -right-20 -top-32 h-[28rem] w-[28rem] rounded-full bg-white/[0.08]" />
            <div className="pointer-events-none absolute right-[24%] top-24 h-3 w-3 rounded-full bg-sky-100/40" />
            <div className="pointer-events-none absolute bottom-20 left-[8%] h-20 w-20 rounded-full border border-white/10" />
            <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-8 sm:px-8 sm:pb-24 sm:pt-10">
              <div className="flex items-center justify-between gap-4">
                <button type="button" onClick={returnToListings} className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-blue-100 transition hover:text-white sm:text-sm">
                  <ArrowLeft size={15} className="shrink-0" /> <span>Lowongan</span> <ChevronRight size={13} className="shrink-0" /> <span className="truncate">{selectedJob.title}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void copyJobLink(selectedJob.id)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-blue-100/65 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  aria-live="polite"
                >
                  {copiedJobId === selectedJob.id ? <Check size={14} /> : <Copy size={14} />}
                  {copiedJobId === selectedJob.id ? 'Tersalin' : 'Bagikan'}
                </button>
              </div>
              <p className="mt-7 text-[10px] font-bold uppercase tracking-[0.24em] text-sky-100/80 sm:text-xs">Detail Lowongan</p>
              <h1 className="mt-2 max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">{selectedJob.title}</h1>
              <div className="mt-5 flex flex-wrap gap-2.5 text-xs text-blue-50 sm:text-sm">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-sm"><BriefcaseBusiness size={15} className="text-amber-300" />{selectedJob.division}</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-sm"><MapPin size={15} className="text-amber-300" />{selectedJob.location}</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-sm"><CalendarClock size={15} className="text-amber-300" />{selectedJob.type}</span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 backdrop-blur-sm"><CalendarClock size={15} className="text-amber-300" />Berlaku hingga {selectedJob.deadline}</span>
                <span className={`inline-flex items-center rounded-full border px-3 py-2 text-xs font-semibold ${selectedJob.isActive ? 'border-emerald-200/20 bg-emerald-300/15 text-emerald-100' : 'border-rose-200/20 bg-rose-300/15 text-rose-100'}`}>{selectedJob.isActive ? 'Sedang dibuka' : 'Lowongan ditutup'}</span>
              </div>
              {selectedJob.isActive && <button type="button" onClick={() => startApplication(selectedJob)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-800 shadow-lg shadow-blue-950/15 transition hover:-translate-y-0.5 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30">
                Daftar Sekarang <ChevronRight size={16} />
              </button>}
            </div>
            <svg className="pointer-events-none absolute bottom-0 left-0 block h-16 w-full sm:h-20 lg:h-24" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 38 C260 100 520 96 760 55 C1010 10 1220 12 1440 52 L1440 100 L0 100 Z" fill="#f8fafc" stroke="#f8fafc" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </section>

          <section className="min-h-[calc(100vh-360px)] bg-[#f8fafc]">
            <div className="mx-auto grid max-w-7xl gap-8 px-5 pb-12 pt-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)] lg:gap-12 lg:pt-8">
              <div className="order-2 recruitment-detail-zoom lg:order-1" style={{ animation: 'recruitment-detail-zoom 560ms cubic-bezier(.22,1,.36,1) both' }}>
                <section>
                  <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">Kualifikasi &amp; Persyaratan</h2>
                  {selectedJobDetails?.qualifications.length ? (
                    <ul className="mt-4 space-y-2.5">
                      {selectedJobDetails.qualifications.map((qualification, index) => (
                        <li key={`${selectedJob.id}-qualification-${index}`} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />{qualification}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-3 text-sm text-slate-500">Persyaratan untuk posisi ini belum dicantumkan.</p>}
                </section>

                <section className="mt-8 border-t border-slate-200 pt-6">
                  <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">Tugas &amp; Tanggung Jawab</h2>
                  {selectedJobDetails?.responsibilities.length ? (
                    <ul className="mt-4 space-y-2.5">
                      {selectedJobDetails.responsibilities.map((item, index) => (
                        <li key={`${selectedJob.id}-responsibility-${index}`} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />{item}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-3 text-sm text-slate-500">Rincian tugas akan ditambahkan oleh tim Recruitment.</p>}
                </section>

                <section className="mt-8 border-t border-slate-200 pt-6">
                  <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">Ringkasan Posisi</h2>
                  <p className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
                    {selectedJob.description?.trim() || `Kesempatan untuk bergabung sebagai ${selectedJob.title} di ${selectedJob.division}, dengan penempatan di ${selectedJob.location}.`}
                  </p>
                </section>

                {selectedJobDetails && selectedJobDetails.benefits.length > 0 && (
                  <section className="mt-8 border-t border-slate-200 pt-6">
                    <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">Benefit &amp; Fasilitas</h2>
                    <ul className="mt-4 space-y-2.5">
                      {selectedJobDetails.benefits.map((item, index) => (
                        <li key={`${selectedJob.id}-benefit-${index}`} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />{item}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {activeOpenings.filter((job) => job.id !== selectedJob.id).length > 0 && (
                  <section className="mt-9">
                    <h2 className="font-display text-xl font-bold text-slate-900">Lihat Lowongan Lainnya</h2>
                    <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
                      {activeOpenings.filter((job) => job.id !== selectedJob.id).slice(0, 4).map((job) => (
                        <button key={job.id} type="button" onClick={() => openJobDetail(job)} className="flex w-full items-center justify-between gap-4 py-4 text-left transition hover:text-blue-700">
                          <span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">{job.division}</span>
                            <span className="mt-1 block font-display text-sm font-bold text-slate-900">{job.title}</span>
                            <span className="mt-1 block text-xs text-slate-500">{job.location}</span>
                          </span>
                          <ChevronRight size={17} className="shrink-0 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <aside className="relative z-10 order-1 self-start lg:sticky lg:top-6 lg:order-2 lg:-mt-20">
                {selectedJob.flyerUrl ? (
                  <img src={selectedJob.flyerUrl} alt={`Flyer lowongan ${selectedJob.title}`} className="mx-auto block h-auto max-h-[min(70vh,760px)] w-[88%] max-w-[430px] rounded-2xl object-contain object-top shadow-[0_22px_55px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5" loading="lazy" />
                ) : (
                  <div className="flex min-h-72 items-center justify-center text-center text-sm text-slate-400">
                    <p>Flyer untuk posisi ini belum tersedia.</p>
                  </div>
                )}
              </aside>
            </div>
          </section>
        </main>
      ) : (
        <>
          <main>
            <section className="relative isolate flex min-h-[340px] items-center justify-center overflow-hidden bg-slate-900 sm:min-h-[390px] lg:min-h-[440px]">
              <img src="/media/career-interview.jpg" alt="Suasana wawancara kerja di lingkungan kantor" className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_78%]" fetchPriority="high" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/70 via-slate-900/55 to-slate-900/35" />
              <div className="mx-auto max-w-4xl px-6 pb-10 pt-4 text-center text-white sm:pb-12">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-100 sm:text-sm">Karier &amp; Rekrutmen</p>
                <h1 className="mt-3 font-display text-3xl font-bold tracking-tight drop-shadow sm:text-4xl md:text-5xl">Berkarya bersama kami</h1>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/90 drop-shadow sm:text-base sm:leading-7">
                  Temukan kesempatan untuk berkembang dan berkontribusi. Jelajahi lowongan yang sesuai dengan keahlian serta pengalaman Anda.
                </p>
              </div>
              <svg className="pointer-events-none absolute bottom-0 left-0 block h-14 w-full sm:h-20" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 44 C260 104 520 104 760 58 C1010 10 1220 8 1440 54 L1440 100 L0 100 Z" fill="#f8fafc" stroke="none" />
              </svg>
            </section>
            <section className="bg-[#f8fafc] px-6 pb-2 pt-5 text-center sm:pt-7">
              <p className="mx-auto max-w-4xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
                Kami mencari talenta untuk bergabung dan tumbuh bersama. Lihat posisi yang tersedia, gunakan filter untuk menemukan peluang yang tepat, lalu pelajari detail lowongan sebelum melamar.
              </p>
            </section>

            <section className="py-8">
              <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                  <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
                    <h2 className="font-display text-base font-bold text-slate-900">Filter Lowongan</h2>
                    <div className="mt-4 grid gap-3">
                      <label className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari posisi..." className="h-11 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                      </label>
                      <FilterSelect value={division} onChange={setDivision} options={['Semua Departemen', ...divisions]} />
                      <FilterSelect value={location} onChange={setLocation} options={['Semua Lokasi', ...locations]} />
                    </div>
                  </aside>

                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-500">{filtered.length > 0 && <><b className="text-slate-800">{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)}</b> dari </>}<b className="text-slate-800">{filtered.length}</b> posisi ditemukan</p>
                      <p className="hidden text-xs text-slate-400 sm:block">Diperbarui oleh tim Recruitment &amp; Training</p>
                    </div>

                    {loadingOpenings ? (
                      <p className="mt-6 text-sm text-slate-400">Memuat lowongan...</p>
                    ) : filtered.length === 0 ? (
                      <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Tidak ada posisi yang sesuai dengan filter.</p>
                    ) : (
                      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                        {paginatedOpenings.map((job, index) => {
                          const highlighted = highlightedJobId === job.id;
                          return (
                            <Reveal key={job.id} delay={index * 35}>
                              <div className="relative">
                              <button
                                id={`job-opening-${job.id}`}
                                type="button"
                                onClick={() => openJobDetail(job)}
                                aria-label={`Detail lowongan: divisi ${job.division}, bagian ${job.title}, lokasi ${job.location}, batas lamaran ${formatCareerDeadline(job.deadline)}`}
                                className={`group relative flex min-h-[220px] w-full scroll-mt-28 flex-col rounded-2xl border p-5 text-left transition duration-200 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 ${highlighted ? 'border-brand-teal bg-white shadow-lg shadow-brand-teal/15 ring-4 ring-brand-teal/20' : 'border-slate-200 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.045)] hover:border-blue-200 hover:shadow-[0_14px_32px_rgba(30,64,175,0.10)]'}`}
                              >
                                <span className="flex items-center justify-between gap-3">
                                  <span className="inline-flex max-w-[calc(100%-3rem)] items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600"><Building2 size={14} className="shrink-0 text-blue-600" /><span className="truncate">{job.division || 'Belum diinformasikan'}</span></span>
                                  <span aria-hidden="true" className="h-8 w-8 shrink-0" />
                                </span>
                                <span className="mt-4 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Bagian / Posisi</span>
                                <span className="mt-1 block break-words font-display text-lg font-bold leading-7 text-slate-900 transition group-hover:text-blue-700">{job.title}</span>
                                <span className="mt-3 inline-flex items-center gap-2 text-sm text-slate-500"><MapPin size={15} className="shrink-0 text-blue-600" />{job.location || 'Belum diinformasikan'}</span>
                                <span className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                                  <span className="text-xs font-medium text-slate-500">Batas lamaran</span>
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 font-display text-sm font-bold text-blue-800"><CalendarClock size={14} className="text-blue-600" />{formatCareerDeadline(job.deadline)}</span>
                                </span>
                              </button>
                              </div>
                            </Reveal>
                          );
                        })}
                      </div>
                    )}
                    {!loadingOpenings && totalPages > 1 && (
                      <nav aria-label="Halaman daftar lowongan" className="mt-6 flex flex-wrap items-center justify-center gap-2">
                        <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={14} />Sebelumnya</button>
                        {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                          <button key={page} type="button" onClick={() => setCurrentPage(page)} aria-label={`Halaman ${page}`} aria-current={currentPage === page ? 'page' : undefined} className={`h-9 min-w-9 rounded-lg border px-3 text-xs font-bold transition ${currentPage === page ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'}`}>{page}</button>
                        ))}
                        <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40">Selanjutnya<ChevronRight size={14} /></button>
                      </nav>
                    )}
                  </div>
                </div>

                <Reveal>
                  <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-600 p-7 text-white sm:flex-row sm:items-center">
                    <div>
                      <p className="font-display text-lg font-bold">Sudah jadi bagian dari tim kami?</p>
                      <p className="mt-1 text-sm text-sky-50/90">Masuk ke portal karyawan untuk mengakses data dan pengajuan Anda.</p>
                    </div>
                    <button onClick={onLoginClick} className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-sky-700 shadow-sm hover:bg-sky-50">Masuk sebagai Karyawan</button>
                  </div>
                </Reveal>
              </div>
            </section>
          </main>
          <PageFooter onNavigate={onNavigate} onLoginClick={onLoginClick} />
          <ChatbotWidget />
        </>
      )}

    </div>
  );
}

function FilterSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}
