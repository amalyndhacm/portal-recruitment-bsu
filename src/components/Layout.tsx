import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Users,
  GraduationCap,
  Wallet,
  Menu,
  X,
  Building2,
  Search, 
  Bell,
  Home,
  Moon,
  Sun,
  Eye,
  UserCircle,
  Settings,
  LogOut,
} from 'lucide-react';

// Logo perusahaan — diimpor langsung dari src/assets/image
// supaya diproses oleh Vite (bukan diambil dari folder public).
import companyLogo from '@/asset/images/logo_bsu.jpg';
import { normalizePortalRole } from '@/lib/accessControl';

export type PageId =
  | 'rt-dashboard'
  | 'candidate-dashboard'
  | 'candidate-positions'
  | 'candidate-applications'
  | 'candidate-psychotest'
  | 'candidate-interviews'
  | 'candidate-tracking'
  | 'hr-weekly'
  | 'hr-activities'
  | 'hr-employee-data'
  | 'hr-admin'
  | 'hr-demographics'
  | 'hr-personnel-actions'
  | 'hr-resign'
  | 'hr-discipline'
  | 'hr-travel'
  | 'rt-employee-request'
  | 'rt-recruitment'
  | 'rt-job-openings'
  | 'rt-applicants'
  | 'rt-training'
  | 'rt-recruitment-recap'
  | 'rt-interview-schedule'
  | 'rt-training-recap'
  | 'rt-talent-pool'
  | 'rt-pipeline'
  | 'rt-assessment'
  | 'rt-offering'
  | 'rt-onboarding'
  | 'rt-sources'
  | 'rt-templates'
  | 'rt-analytics'
  | 'rt-gallery'
  | 'cb-incentive'
  | 'cb-salary-recap'
  | 'cb-documentation'
  | 'account-profile';

type NavItem = {
  id: PageId;
  label: string;
  /** Subjudul kelompok di dalam section; muncul saat berbeda dari item sebelumnya. */
  group?: string;
};

type NavSection = {
  title: string;
  icon: typeof Users;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: 'Candidate',
    icon: UserCircle,
    items: [
      { id: 'candidate-dashboard', label: 'Dashboard Kandidat' },
      { id: 'candidate-positions', label: 'Pilih Posisi' },
      { id: 'candidate-applications', label: 'Lamaran Saya' },
      { id: 'candidate-psychotest', label: 'Psikotest' },
      { id: 'candidate-interviews', label: 'Jadwal Wawancara' },
      { id: 'candidate-tracking', label: 'Lacak Lamaran' },
    ],
  },
  {
    title: 'Recruitment',
    icon: GraduationCap,
    items: [
      { id: 'rt-dashboard', label: 'Dashboard Recruitment' },
      { id: 'rt-employee-request', label: 'Pengajuan Karyawan Baru (PRK)', group: 'Perencanaan' },
      { id: 'rt-job-openings', label: 'Kelola Lowongan', group: 'Perencanaan' },
      { id: 'rt-applicants', label: 'Lamaran Kandidat', group: 'Seleksi' },
      { id: 'rt-pipeline', label: 'Pipeline Kandidat', group: 'Seleksi' },
      { id: 'rt-interview-schedule', label: 'Jadwal Interview & Psikotest', group: 'Seleksi' },
      { id: 'rt-assessment', label: 'Tes & Penilaian', group: 'Seleksi' },
      { id: 'rt-templates', label: 'Template Komunikasi', group: 'Seleksi' },
      { id: 'rt-offering', label: 'Offering & Pre-Employment', group: 'Penerimaan' },
      { id: 'rt-onboarding', label: 'Onboarding & Probation', group: 'Penerimaan' },
      { id: 'rt-analytics', label: 'Analitik Rekrutmen', group: 'Laporan' },
      { id: 'rt-recruitment-recap', label: 'Rekap Rekrutmen', group: 'Laporan' },
      { id: 'rt-gallery', label: 'Galeri', group: 'Laporan' },
    ],
  },
  {
    title: 'HR',
    icon: Users,
    items: [
      { id: 'hr-weekly', label: 'Laporan Mingguan' },
      { id: 'hr-activities', label: 'Kegiatan Karyawan' },
      { id: 'hr-admin', label: 'Administrasi Karyawan' },
      { id: 'hr-demographics', label: 'Rekap Demografi Karyawan' },
      { id: 'hr-personnel-actions', label: 'Personnel Action (PA)' },
      { id: 'hr-resign', label: 'Alasan Resign' },
      { id: 'hr-discipline', label: 'Kedisiplinan' },
      { id:'hr-travel', label: 'Travel & Resepsionis' },
      { id: 'hr-employee-data', label: 'Data Karyawan' },
    ],
  },
  {
    title: 'Compensation & Benefit',
    icon: Wallet,
    items: [
      { id: 'cb-incentive', label: 'Insentif Gelombang 1' },
      { id: 'cb-salary-recap', label: 'Rekap Gaji' },
      { id: 'cb-documentation', label: 'Upload Dokumentasi' },
    ],
  },
];

type LayoutUser = {
  name: string;
  role: string;
  initials?: string;
};

export type AppNotification = {
  id: string;
  title: string;
  description: string;
  audience?: 'candidate' | 'recruitment' | 'all';
  time: string;
  timestamp?: number;
  read?: boolean;
};
function notificationTime(notification: AppNotification) {
  if (!notification.timestamp) return notification.time;
  const minutes = Math.floor((Date.now() - notification.timestamp) / 60000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

const defaultNotifications: AppNotification[] = [
  {
    id: '1',
    title: 'Pengajuan cuti baru',
    description: 'Yuni Prakoso mengajukan cuti tahunan',
    time: '10 menit lalu',
  },
  {
    id: '2',
    title: 'Laporan mingguan terkirim',
    description: 'Laporan HR & Comben minggu ini sudah masuk',
    time: '2 jam lalu',
  },
  {
    id: '3',
    title: 'Kandidat baru',
    description: '3 kandidat baru masuk ke tahap interview',
    time: 'Kemarin',
  },
];

export default function Layout({
  currentPage,
  onNavigate,
  children,
  user,
  accessLevel,
  viewOnly = false,
  notifications = defaultNotifications,
  onSearch,
  onToggleTheme,
  onNotificationsRead,
  isDarkMode = false,
  onProfileClick,
  onSettingsClick,
  onLogout,
  onHomeClick,
  logoSrc = companyLogo,
  companyName = 'HR Portal',
  companySubtitle = 'Divisi SDM',
}: {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  children: ReactNode;
  user?: LayoutUser;
  accessLevel?: string;
  viewOnly?: boolean;
  notifications?: AppNotification[];
  onSearch?: (query: string) => void;
  onToggleTheme?: () => void;
  onNotificationsRead?: () => void;
  isDarkMode?: boolean;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onLogout?: () => void;
  onHomeClick?: () => void;
  logoSrc?: string;
  companyName?: string;
  companySubtitle?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [, setNotificationClock] = useState(Date.now());

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNotificationClock(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const handleNavigate = (page: PageId) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  const displayUser: LayoutUser = user ?? { name: 'Pengguna', role: 'Karyawan' };
  const normalizedAccess = normalizePortalRole(accessLevel);
  const isRecruitmentWorkspace = normalizedAccess === 'recruitment'
    || normalizedAccess === 'training'
    || currentPage.startsWith('rt-')
    || /recruitment|rekrutmen/i.test(displayUser.role);
  const initials =
    displayUser.initials ??
    displayUser.name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close dropdowns when clicking outside of them
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const LogoMark = ({ className }: { className: string }) =>
    !logoError ? (
      <img
        src={logoSrc}
        alt={companyName}
        className={`${className} object-contain animate-spin-slow`}
        onError={() => setLogoError(true)}
      />
    ) : (
      <Building2 className={`${className} text-teal-600 animate-spin-slow`} />
    );

  return (
    <div className="dashboard-shell min-h-screen bg-white">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/70 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <LogoMark className="h-10 w-10" />
          <span className="font-display text-lg font-semibold text-[#102c2b]">{companyName}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onHomeClick}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100"
            aria-label="Beranda"
          >
            <Home className="h-5 w-5" />
            <span>Beranda</span>
          </button>
          <button
            onClick={() => onProfileClick?.()}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
            aria-label="Profil Saya"
          >
            <UserCircle className="h-5 w-5" />
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
            aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-full w-72 transform border-r border-slate-200 bg-white text-slate-700 shadow-xl transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="hidden items-center gap-3 border-b border-slate-100 px-6 py-6 lg:flex">
          <LogoMark className="h-14 w-14" />
          <div>
            <h1 className="font-display text-lg font-bold leading-tight text-[#102c2b]">{companyName}</h1>
            <p className="text-xs text-slate-400">{companySubtitle}</p>
          </div>
        </div>

        <nav className="h-[calc(100%-73px)] space-y-6 overflow-y-auto px-3 py-4 scrollbar-thin">
          {navSections.filter((section) => {
            const role = normalizedAccess;
            if (role === 'super_admin' || role === 'admin' || role === 'atasan') return true;
            if (isRecruitmentWorkspace) return section.title === 'Recruitment';
            if (role === 'hr') return section.title === 'HR';
            if (role === 'comben') return section.title === 'Compensation & Benefit';
            if (role === 'candidate') return section.title === 'Candidate';
            // Role yang belum dikenali tidak menerima menu operasional.
            return false;
          }).map((section) => {
            const SectionIcon = section.icon;
            return (
              <div key={section.title}>
                <div className="mb-2 flex items-center gap-2 px-3">
                  <SectionIcon className="h-4 w-4 text-slate-400" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {section.title}
                  </h2>
                </div>
                <div className="space-y-1">
                  {section.items.map((item, index) => {
                    const showGroup = item.group && item.group !== section.items[index - 1]?.group;
                    const active = currentPage === item.id;
                    return (
                      <div key={item.id}>
                        {showGroup && (
                          <p className={`px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 ${index === 0 ? 'pt-0' : 'pt-3'}`}>
                            {item.group}
                          </p>
                        )}
                        <button
                          onClick={() => handleNavigate(item.id)}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-all duration-200 ${
                            active
                              ? 'bg-[#c9f36b] font-bold text-[#102c2b] shadow-sm'
                              : 'text-slate-500 hover:bg-slate-50 hover:text-[#102c2b]'
                          }`}
                        >
                          {item.label}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="min-h-screen bg-white lg:ml-72">
        {/* Desktop topbar */}
        <header className="sticky top-0 z-50 hidden items-center gap-4 border-b border-slate-200/70 bg-white px-6 py-4 lg:flex">
          <button
            type="button"
            onClick={onHomeClick}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
          >
            <Home size={17} /> Beranda
          </button>
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari karyawan, kandidat..."
              onChange={(e) => onSearch?.(e.target.value)}
              className="input w-full py-2 pl-9 text-sm"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            {viewOnly && (
              <span className="badge border border-amber-200 bg-amber-50 text-amber-700">
                <Eye size={13} /> Mode Atasan · Hanya Lihat
              </span>
            )}

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setNotifOpen((v) => !v);
                  setProfileOpen(false);
                  onNotificationsRead?.();
                }}
                className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-haspopup="true"
                aria-expanded={notifOpen}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800">Notifikasi</p>
                    {unreadCount > 0 && (
                      <span className="badge badge-info">{unreadCount} baru</span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto scrollbar-thin">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-slate-400">
                        Tidak ada notifikasi
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          className="table-row-hover flex w-full flex-col items-start gap-0.5 border-b border-slate-50 px-4 py-3 text-left last:border-0"
                        >
                          <div className="flex w-full items-center gap-2">
                            {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />}
                            <p className="text-sm font-medium text-slate-800">{n.title}</p>
                          </div>
                          <p className="text-xs text-slate-500">{n.description}</p>
                          <p className="text-[11px] text-slate-400">{notificationTime(n)}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onToggleTheme}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Ganti tema"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="h-6 w-px bg-slate-200" />

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => {
                  setProfileOpen((v) => !v);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-slate-50"
                aria-haspopup="true"
                aria-expanded={profileOpen}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-sm font-semibold text-white">
                  {initials}
                </div>
                <div className="hidden text-left leading-tight sm:block">
                  <p className="text-sm font-semibold text-slate-800">{displayUser.name}</p>
                  <p className="text-xs text-slate-400">{displayUser.role}</p>
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800">{displayUser.name}</p>
                    <p className="text-xs text-slate-400">{displayUser.role}</p>
                  </div>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onProfileClick?.();
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <UserCircle size={16} /> Profil Saya
                  </button>
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onSettingsClick?.();
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <Settings size={16} /> Pengaturan
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      onLogout?.();
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} /> Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-76px)] scroll-mt-20 bg-white">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
