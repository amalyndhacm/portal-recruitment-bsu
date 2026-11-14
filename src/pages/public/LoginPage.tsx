import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  GraduationCap,
  Eye,
  EyeOff,
  Lock,
  Moon,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import logoBsu from '@/asset/images/logo_bsu.jpg';

export type LoginRole = 'candidate' | 'recruitment' | 'training' | 'hr' | 'comben' | 'admin';

type LoginTheme = {
  eyebrow: string;
  heading: string;
  description: string;
  panelDescription: string;
  gradient: string;
  softAccent: string;
  icon: typeof BriefcaseBusiness;
  features: Array<{ title: string; description: string; icon: typeof BarChart3 }>;
};

const loginThemes: Record<LoginRole, LoginTheme> = {
  recruitment: {
    eyebrow: 'RECRUITMENT WORKSPACE',
    heading: 'Temukan talenta terbaik lebih cepat',
    description: 'Kelola lowongan, kandidat, interview, dan training dalam satu pipeline recruitment yang terarah.',
    panelDescription: 'Gunakan NIP karyawan untuk mengakses workspace Recruitment.',
    gradient: 'from-[#5f9fbd] via-[#5f8fb8] to-[#7682b7]',
    softAccent: 'text-sky-100',
    icon: BriefcaseBusiness,
    features: [
      { title: 'Pipeline kandidat', description: 'Pantau kandidat dari lamaran sampai tahap akhir.', icon: BriefcaseBusiness },
      { title: 'Lowongan terkelola', description: 'Buka dan kelola kebutuhan posisi dengan lebih rapi.', icon: BarChart3 },
      { title: 'Kolaborasi interview', description: 'Jadwal dan status kandidat tersimpan dalam satu tempat.', icon: UsersRound },
    ],
  },
  training: {
    eyebrow: 'TRAINING WORKSPACE',
    heading: 'Kembangkan talenta dengan lebih terarah',
    description: 'Kelola pelatihan, onboarding, dan aktivitas pengembangan karyawan dalam satu workspace.',
    panelDescription: 'Gunakan NIP karyawan untuk masuk ke workspace Training.',
    gradient: 'from-[#8b78b5] via-[#9b83bd] to-[#c08eaf]',
    softAccent: 'text-violet-100',
    icon: GraduationCap,
    features: [
      { title: 'Pelatihan terjadwal', description: 'Pantau agenda dan aktivitas training secara terstruktur.', icon: GraduationCap },
      { title: 'Onboarding rapi', description: 'Pastikan proses pengenalan karyawan berjalan konsisten.', icon: BriefcaseBusiness },
      { title: 'Rekap pengembangan', description: 'Siapkan data aktivitas untuk kebutuhan evaluasi.', icon: BarChart3 },
    ],
  },
  hr: {
    eyebrow: 'HR PEOPLE OPERATIONS',
    heading: 'Bangun pengalaman karyawan yang lebih baik',
    description: 'Kelola data karyawan, aktivitas, kedisiplinan, dan laporan HR dari satu ruang kerja terpusat.',
    panelDescription: 'Gunakan NIP karyawan untuk masuk ke workspace HR.',
    gradient: 'from-[#4f9f8a] via-[#4a9b9a] to-[#5c9cb5]',
    softAccent: 'text-emerald-100',
    icon: UsersRound,
    features: [
      { title: 'Data karyawan terpusat', description: 'Akses informasi karyawan secara lebih konsisten.', icon: UsersRound },
      { title: 'Administrasi lebih tertata', description: 'Kelola aktivitas, PA, resign, dan disiplin dalam satu alur.', icon: BarChart3 },
      { title: 'Laporan HR siap pakai', description: 'Siapkan rekap dan insight untuk kebutuhan manajemen.', icon: ShieldCheck },
    ],
  },
  comben: {
    eyebrow: 'COMPENSATION & BENEFIT',
    heading: 'Jaga akurasi benefit dan payroll',
    description: 'Kelola insentif, rekap gaji, dan dokumentasi compensation & benefit dengan lebih aman.',
    panelDescription: 'Gunakan NIP karyawan untuk masuk ke workspace Comben.',
    gradient: 'from-[#8b78b5] via-[#9b83bd] to-[#c08eaf]',
    softAccent: 'text-violet-100',
    icon: WalletCards,
    features: [
      { title: 'Rekap kompensasi', description: 'Pantau insentif dan rekap gaji secara terstruktur.', icon: WalletCards },
      { title: 'Data lebih terlindungi', description: 'Akses area benefit sesuai kewenangan role Anda.', icon: ShieldCheck },
      { title: 'Dokumentasi terpusat', description: 'Simpan bukti dan dokumen pendukung dengan mudah.', icon: BarChart3 },
    ],
  },
  admin: {
    eyebrow: 'PORTAL ADMINISTRATOR',
    heading: 'Satu pusat kendali untuk seluruh SDM',
    description: 'Pantau HR, Recruitment, Training, dan Compensation & Benefit dari satu dashboard terintegrasi.',
    panelDescription: 'Gunakan kredensial administrator untuk masuk ke portal utama.',
    gradient: 'from-[#55758a] via-[#527d86] to-[#6c83a1]',
    softAccent: 'text-slate-200',
    icon: ShieldCheck,
    features: [
      { title: 'Rekap lintas divisi', description: 'Lihat kondisi seluruh fungsi SDM dalam satu tampilan.', icon: BarChart3 },
      { title: 'Kontrol akses', description: 'Pastikan setiap tim bekerja sesuai kewenangannya.', icon: ShieldCheck },
      { title: 'Keputusan lebih cepat', description: 'Gunakan data terpusat untuk kebutuhan manajemen.', icon: Sparkles },
    ],
  },
  candidate: {
    eyebrow: 'CANDIDATE PORTAL',
    heading: 'Mulai perjalanan karier Anda',
    description: 'Temukan peluang yang sesuai, pantau proses lamaran, dan dapatkan informasi terbaru dari tim kami.',
    panelDescription: 'Gunakan email kandidat untuk mengakses portal lamaran Anda.',
    gradient: 'from-[#cfae63] via-[#d29b71] to-[#bd8290]',
    softAccent: 'text-orange-50',
    icon: UserRound,
    features: [
      { title: 'Pantau lamaran', description: 'Lihat perkembangan lamaran Anda di setiap tahap.', icon: UserRound },
      { title: 'Peluang terbaru', description: 'Temukan posisi yang sesuai dengan minat Anda.', icon: BriefcaseBusiness },
      { title: 'Profil kandidat', description: 'Simpan informasi diri untuk proses rekrutmen.', icon: Sparkles },
    ],
  },
};

export default function LoginPage({
  onBack,
  onRegisterClick,
  mode = 'staff',
  roleTitle = 'Tim Internal',
  role = 'admin',
  initialNotice = '',
}: {
  onBack?: () => void;
  onRegisterClick?: () => void;
  mode?: 'staff' | 'candidate';
  roleTitle?: string;
  role?: LoginRole;
  initialNotice?: string;
}) {
  const { login, requestPasswordReset } = useAuth();
  const theme = loginThemes[role];
  const ThemeIcon = theme.icon;
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(initialNotice);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!identifier.trim() || !password) {
      setError('Isi email/NIP dan password terlebih dahulu.');
      return;
    }
    setLoading(true);
    try {
      const result = await login(identifier, password, mode);
      if (!result.success) setError(result.error ?? 'Login gagal');
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset() {
    setError('');
    setNotice('');
    if (mode !== 'candidate') {
      setNotice('Untuk akun staff dengan NIP, silakan hubungi administrator portal untuk bantuan reset password.');
      return;
    }
    setResetLoading(true);
    try {
      const result = await requestPasswordReset(identifier);
      if (result.success) setNotice('Jika email terdaftar, tautan reset password akan dikirim. Periksa juga folder spam.');
      else setError(result.error ?? 'Tautan reset password gagal dikirim.');
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className={`relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br ${theme.gradient} p-12 text-white lg:flex`}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-6rem] left-[-4rem] h-72 w-72 rounded-full bg-[#f4d66d]/20 blur-3xl" />
        <div className="pointer-events-none absolute right-12 top-1/3 h-44 w-44 rounded-full border border-white/10" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg ring-4 ring-white/20">
              <img src={logoBsu} alt="Logo PT Bintang Sayap Utama" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-white">PT Bintang Sayap Utama</p>
              <p className={`text-xs ${theme.softAccent}`}>{theme.eyebrow}</p>
            </div>
          </div>

          <div className="mt-24 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
            <ThemeIcon size={28} />
          </div>
          <p className={`mt-7 text-xs font-bold tracking-[0.22em] ${theme.softAccent}`}>{theme.eyebrow}</p>
          <h1 className="mt-3 max-w-lg text-4xl font-bold leading-tight text-white">{theme.heading}</h1>
          <p className={`mt-5 max-w-lg text-base leading-7 ${theme.softAccent}`}>{theme.description}</p>

          <div className="mt-10 space-y-5">
            {theme.features.map(({ title, description, icon: FeatureIcon }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur-sm">
                  <FeatureIcon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className={`text-sm ${theme.softAccent}`}>{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className={`relative text-xs ${theme.softAccent}`}>Portal internal · akses sesuai role akun</p>
      </div>

      <div className="relative flex items-center justify-center bg-white px-6 py-12">
        {onBack && (
          <button type="button" onClick={onBack} className="absolute left-6 top-6 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700">
            <ArrowLeft size={16} /> Beranda
          </button>
        )}
        <button type="button" className="absolute right-6 top-6 rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Ganti tema">
          <Moon size={18} />
        </button>

        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${theme.gradient} text-white shadow-sm`}>
              <ThemeIcon size={21} />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-slate-900">{roleTitle}</p>
              <p className="text-xs text-slate-500">PT Bintang Sayap Utama</p>
            </div>
          </div>

          <div className="mb-1 flex items-center gap-2">
            <ThemeIcon size={18} className="text-[#16877f]" />
            <h2 className="font-display text-2xl font-bold text-slate-900">Masuk sebagai {roleTitle}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">{theme.panelDescription}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{mode === 'candidate' ? 'Email' : 'NIP atau Email Supabase'}</label>
              <input
                type={mode === 'candidate' ? 'email' : 'text'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete={mode === 'candidate' ? 'username' : 'username'}
                required
                maxLength={254}
                placeholder={mode === 'candidate' ? 'nama@email.com' : 'NIP atau email akun Supabase'}
                className="input w-full"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <button type="button" onClick={handlePasswordReset} disabled={resetLoading} className="text-sm font-medium text-[#16877f] hover:underline disabled:opacity-60">
                  {resetLoading ? 'Mengirim tautan…' : 'Lupa password?'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  maxLength={72}
                  placeholder="••••••••"
                  className="input w-full pr-10"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {notice && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}

            <button type="submit" disabled={loading} className={`flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r ${theme.gradient} py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60`}>
              <Lock size={16} />
              {loading ? 'Memproses...' : `Masuk ke ${roleTitle}`}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Belum punya akun?{' '}
            <button type="button" onClick={onRegisterClick} className="font-medium text-[#16877f] hover:underline">
              {mode === 'candidate' ? 'Daftar akun kandidat' : 'Daftar akun staff'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
