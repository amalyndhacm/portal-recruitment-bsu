import { useState, type ReactNode } from 'react';
import {
  ArrowRight,
  Building2,
  BriefcaseBusiness,
  Home,
  Mail,
  Menu,
  X,
  ChevronDown,
  CircleUserRound,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';
import logoBsu from '@/asset/images/logo_bsu.jpg';

export type PageKey = 'home' | 'profile' | 'career' | 'contact';
export type LoginRole = 'candidate' | 'recruitment' | 'training';

type NavItem = {
  key: PageKey;
  label: string;
  icon: typeof Home;
};

function NavButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Home;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40 ${
        active
          ? 'text-[#126b78]'
          : 'text-slate-600 hover:bg-slate-50 hover:text-[#126b78]'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <Icon
        size={16}
        strokeWidth={active ? 2.4 : 2}
        className={`transition-transform duration-300 ${active ? 'text-brand-teal' : 'text-slate-400 group-hover:rotate-[-8deg] group-hover:text-brand-teal'}`}
      />
      <span>{children}</span>
      <span
        className={`absolute bottom-1 left-1/2 h-0.5 -translate-x-1/2 rounded-full bg-brand-teal transition-all duration-300 ${
          active ? 'w-7 opacity-100' : 'w-0 opacity-0 group-hover:w-5 group-hover:opacity-70'
        }`}
      />
    </button>
  );
}

export default function PageHeader({
  active,
  onNavigate,
  onLoginClick,
  onRoleSelect,
  user,
  onProfileClick,
  onDashboardClick,
  onPrkClick,
  onLogout,
}: {
  active: PageKey;
  onNavigate: (page: PageKey) => void;
  onLoginClick: () => void;
  onRoleSelect?: (role: LoginRole) => void;
  user?: { name: string; role: string } | null;
  onProfileClick?: () => void;
  onDashboardClick?: () => void;
  onPrkClick?: () => void;
  onLogout?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const initials = user?.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U';
  const isRecruitmentUser = Boolean(user && /recruitment|rekrutmen/i.test(user.role));

  const items: NavItem[] = [
    { key: 'home', label: 'Beranda', icon: Home },
    { key: 'career', label: 'Lowongan', icon: BriefcaseBusiness },
    { key: 'profile', label: 'Tentang Perusahaan', icon: Building2 },
    { key: 'contact', label: 'Kontak', icon: Mail },
  ];

  const go = (page: PageKey) => {
    onNavigate(page);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const chooseRole = (role: LoginRole) => {
    setLoginOpen(false);
    if (onRoleSelect) onRoleSelect(role);
    else onLoginClick();
  };

  // Header Beranda/public: gunakan file ini, bukan PageHeader dari components/ui.tsx.
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
        <button
          className="group flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40"
          onClick={() => go('home')}
          aria-label="Kembali ke Beranda"
        >
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl ring-1 ring-slate-200 transition-all duration-300 group-hover:scale-[1.03]">
            <img src={logoBsu} alt="Logo PT Bintang Sayap Utama" className="h-full w-full object-cover" />
            <span className="absolute inset-0 -translate-x-full bg-white/35 transition-transform duration-700 group-hover:translate-x-full" />
          </div>
          <div className="text-left">
            <p className="font-display text-sm font-bold leading-tight text-[#15343a]">Bintang Sayap Utama</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">People platform</p>
          </div>
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
          {items.map((item) => (
            <NavButton key={item.key} active={active === item.key} icon={item.icon} onClick={() => go(item.key)}>
              {item.label}
            </NavButton>
          ))}
        </nav>

        <div className="relative hidden items-center md:flex" aria-label="Menu utama">
          {user ? (
            <div className="relative">
              <button type="button" onClick={() => setProfileOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 shadow-sm transition hover:border-teal-300 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40" aria-label={`Profil ${user.name}`} aria-expanded={profileOpen} aria-haspopup="menu">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#126b78] to-[#2b9a91] text-sm font-bold text-white ring-2 ring-white">{initials}</span>
                <span className="max-w-32 truncate text-sm font-semibold text-slate-700">{user.name}</span>
                <ChevronDown size={15} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>
              {profileOpen && <ProfileDropdown user={user} showPrk={isRecruitmentUser} onProfileClick={() => { setProfileOpen(false); onProfileClick?.(); }} onDashboardClick={() => { setProfileOpen(false); onDashboardClick?.(); }} onPrkClick={() => { setProfileOpen(false); onPrkClick?.(); }} onLogout={() => { setProfileOpen(false); onLogout?.(); }} />}
            </div>
          ) : (
            <>
              <button onClick={() => setLoginOpen((value) => !value)} className={`group inline-flex items-center gap-2 rounded-full bg-[#126b78] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#0d5964] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal/40 ${loginOpen ? 'bg-[#0d5964]' : ''}`} aria-expanded={loginOpen} aria-haspopup="menu">
                Masuk / Daftar <ChevronDown size={15} className={`transition-transform ${loginOpen ? 'rotate-180' : ''}`} />
              </button>
              {loginOpen && <div className="absolute right-0 top-full z-50 mt-3 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl" role="menu"><p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Pilih workspace untuk masuk</p><RoleButton icon={<CircleUserRound size={17} />} title="Kandidat" text="Portal lamaran kandidat" tone="text-emerald-700" onClick={() => chooseRole('candidate')} /><RoleButton icon={<BriefcaseBusiness size={17} />} title="Recruitment" text="Workspace proses rekrutmen" tone="text-sky-700" onClick={() => chooseRole('recruitment')} /><RoleButton icon={<GraduationCap size={17} />} title="Training" text="Workspace pelatihan" tone="text-violet-700" onClick={() => chooseRole('training')} /></div>}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {user && <button type="button" onClick={() => setMenuOpen((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#126b78] to-[#2b9a91] text-sm font-bold text-white ring-2 ring-white shadow-sm" aria-label={`Menu profil ${user.name}`} aria-expanded={menuOpen}>{initials}</button>}
          <button
            className={`rounded-xl p-2 text-slate-600 transition-all duration-300 hover:bg-white hover:text-brand-teal ${menuOpen ? 'rotate-90 bg-white shadow-sm' : ''} ${user ? 'hidden' : ''}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>

      <div
        className={`overflow-hidden border-t border-slate-100/80 bg-white/95 px-5 transition-all duration-300 ease-out md:hidden ${
          menuOpen ? 'max-h-96 pb-5 pt-3 opacity-100' : 'max-h-0 py-0 opacity-0'
        }`}
      >
        <nav className="flex flex-col gap-1" aria-label="Navigasi mobile">
          {items.map((item, index) => (
            <div
              key={item.key}
              className={`transition-all duration-300 ${menuOpen ? 'translate-x-0 opacity-100' : '-translate-x-3 opacity-0'}`}
              style={{ transitionDelay: menuOpen ? `${index * 45}ms` : '0ms' }}
            >
              <NavButton key={item.key} active={active === item.key} icon={item.icon} onClick={() => go(item.key)}>
                {item.label}
              </NavButton>
            </div>
          ))}
          {user ? <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"><div className="mb-2 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#126b78] to-[#2b9a91] text-sm font-bold text-white">{initials}</span><span className="min-w-0"><span className="block truncate text-sm font-bold text-slate-800">{user.name}</span><span className="block text-xs text-slate-500">{user.role}</span></span></div><RoleButton icon={<CircleUserRound size={17} />} title="Profil Saya" text="Lihat informasi akun" tone="text-teal-700" onClick={() => { setMenuOpen(false); onProfileClick?.(); }} /><RoleButton icon={<LayoutDashboard size={17} />} title="Dashboard" text="Buka workspace akun" tone="text-sky-700" onClick={() => { setMenuOpen(false); onDashboardClick?.(); }} />{isRecruitmentUser && <RoleButton icon={<FileText size={17} />} title="PRK" text="Pengajuan karyawan baru" tone="text-amber-700" onClick={() => { setMenuOpen(false); onPrkClick?.(); }} />}<RoleButton icon={<LogOut size={17} />} title="Keluar" text="Akhiri sesi akun" tone="text-rose-700" onClick={() => { setMenuOpen(false); onLogout?.(); }} /></div> : <div className="mt-3 grid gap-2"><p className="px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Pilih workspace untuk masuk</p><RoleButton icon={<CircleUserRound size={17} />} title="Kandidat" text="Portal lamaran kandidat" tone="text-emerald-700" onClick={() => { setMenuOpen(false); chooseRole('candidate'); }} /><RoleButton icon={<BriefcaseBusiness size={17} />} title="Recruitment" text="Workspace proses rekrutmen" tone="text-sky-700" onClick={() => { setMenuOpen(false); chooseRole('recruitment'); }} /><RoleButton icon={<GraduationCap size={17} />} title="Training" text="Workspace pelatihan" tone="text-violet-700" onClick={() => { setMenuOpen(false); chooseRole('training'); }} /></div>}
        </nav>
      </div>
    </header>
  );
}

function RoleButton({ icon, title, text, tone, onClick }: { icon: ReactNode; title: string; text: string; tone: string; onClick: () => void }) {
  return <button onClick={onClick} className="group flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-slate-50"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 ${tone}`}>{icon}</span><span className="min-w-0"><span className="block text-sm font-bold text-slate-800">{title}</span><span className="block truncate text-xs text-slate-500">{text}</span></span><ArrowRight size={14} className="ml-auto text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-teal-600" /></button>;
}

function ProfileDropdown({ user, showPrk, onProfileClick, onDashboardClick, onPrkClick, onLogout }: { user: { name: string; role: string }; showPrk: boolean; onProfileClick: () => void; onDashboardClick: () => void; onPrkClick: () => void; onLogout: () => void }) {
  return <div className="absolute right-0 top-full z-50 mt-3 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl" role="menu"><div className="border-b border-slate-100 px-3 py-2"><p className="truncate text-sm font-bold text-slate-800">{user.name}</p><p className="text-xs text-slate-500">{user.role}</p></div><RoleButton icon={<CircleUserRound size={17} />} title="Profil Saya" text="Lihat informasi akun" tone="text-teal-700" onClick={onProfileClick} /><RoleButton icon={<LayoutDashboard size={17} />} title="Dashboard" text="Buka workspace akun" tone="text-sky-700" onClick={onDashboardClick} />{showPrk && <RoleButton icon={<FileText size={17} />} title="PRK" text="Pengajuan karyawan baru" tone="text-amber-700" onClick={onPrkClick} />}<div className="my-1 border-t border-slate-100" /><RoleButton icon={<LogOut size={17} />} title="Keluar" text="Akhiri sesi akun" tone="text-rose-700" onClick={onLogout} /></div>;
}
