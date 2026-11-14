import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, UserRound, Mail, Phone, MapPin, GraduationCap, LockKeyhole } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage({ onBack, onSuccess, mode = 'staff' }: { onBack: () => void; onSuccess: (message: string) => void; mode?: 'staff' | 'candidate' }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [phone, setPhone] = useState('');
  const [domicile, setDomicile] = useState('');
  const [education, setEducation] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }

    setLoading(true);
    try {
      const result = await register(identifier, password, name, mode, { phone, domicile, education });
      if (!result.success) {
        setError(result.error || 'Pendaftaran gagal. Silakan coba lagi.');
        return;
      }
      const message = result.needsConfirmation
        ? candidate
          ? 'Akun berhasil dibuat. Verifikasi email melalui tautan yang kami kirim, lalu login dengan email dan password Anda.'
          : 'Pendaftaran karyawan memerlukan aktivasi administrator. Silakan hubungi administrator portal.'
        : 'Akun berhasil dibuat. Silakan login menggunakan email/NIP dan password yang baru didaftarkan.';
      onSuccess(message);
    } finally {
      setLoading(false);
    }
  }

  const candidate = mode === 'candidate';
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-14">
      <section className="mx-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft size={16} /> Kembali ke halaman masuk
        </button>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">HR Portal · Pendaftaran akun</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Daftar Akun {candidate ? 'Kandidat' : 'Staff'}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {candidate ? 'Buat akun untuk melamar dan memantau proses rekrutmen. Informasi ini tersimpan pada profil akun Anda.' : 'Pendaftaran hanya berhasil jika NIP, nama, dan status ACTIVE cocok dengan master karyawan.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <Field label="Nama lengkap" icon={<UserRound size={16} />}>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} autoComplete="name" className="input w-full" placeholder="Nama sesuai identitas" />
          </Field>
          <Field label={candidate ? 'Email' : 'NIP'} icon={candidate ? <Mail size={16} /> : <UserRound size={16} />}>
            <input type={candidate ? 'email' : 'text'} inputMode={candidate ? 'email' : 'text'} value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoComplete={candidate ? 'email' : 'username'} maxLength={254} className="input w-full" placeholder={candidate ? 'nama@email.com' : 'Nomor Induk Pegawai'} />
          </Field>

          {candidate && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nomor telepon (opsional)" icon={<Phone size={16} />}>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={30} className="input w-full" placeholder="08xxxxxxxxxx" />
              </Field>
              <Field label="Domisili (opsional)" icon={<MapPin size={16} />}>
                <input type="text" value={domicile} onChange={(e) => setDomicile(e.target.value)} autoComplete="address-level2" maxLength={100} className="input w-full" placeholder="Kota domisili" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Pendidikan terakhir (opsional)" icon={<GraduationCap size={16} />}>
                  <input type="text" value={education} onChange={(e) => setEducation(e.target.value)} maxLength={120} className="input w-full" placeholder="Contoh: S1 Manajemen" />
                </Field>
              </div>
            </div>
          )}

          <Field label="Password" icon={<LockKeyhole size={16} />}>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" className="input w-full pr-11" placeholder="Minimal 8 karakter" />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </Field>
          <Field label="Konfirmasi password" icon={<LockKeyhole size={16} />}>
            <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" className="input w-full" placeholder="Ulangi password" />
          </Field>

          <button type="submit" disabled={loading} className="flex w-full items-center justify-center rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? 'Memproses pendaftaran…' : 'Buat akun'}
          </button>
          <p className="text-center text-xs leading-5 text-slate-400">Password disimpan dalam bentuk hash aman di backend; aplikasi tidak menyimpan password sebagai teks biasa.</p>
        </form>
      </section>
    </main>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700"><span className="text-slate-400">{icon}</span>{label}</span>
      {children}
    </label>
  );
}
