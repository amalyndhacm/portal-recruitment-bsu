import { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function PasswordRecoveryPage() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    setLoading(true);
    try {
      const result = await updatePassword(password);
      if (!result.success) setError(result.error || 'Password belum dapat diperbarui.');
      else setSuccess(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><KeyRound size={23} /></div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">Buat password baru</h1>
        {success ? (
          <>
            <p className="mt-3 text-sm leading-6 text-slate-600">Password berhasil diperbarui. Sekarang Anda dapat masuk dengan password baru.</p>
            <button type="button" onClick={() => window.location.assign(window.location.pathname)} className="mt-6 w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800">Lanjut ke portal</button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm leading-6 text-slate-500">Gunakan password minimal 8 karakter yang belum pernah digunakan pada akun ini.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <label className="block text-sm font-medium text-slate-700">Password baru
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" className="input mt-1.5 w-full" />
              </label>
              <label className="block text-sm font-medium text-slate-700">Konfirmasi password
                <input type={showPassword ? 'text' : 'password'} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required autoComplete="new-password" className="input mt-1.5 w-full" />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} className="rounded border-slate-300 text-teal-700" /> Tampilkan password</label>
              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"><ShieldCheck size={16} />{loading ? 'Menyimpan…' : 'Simpan password baru'}</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
