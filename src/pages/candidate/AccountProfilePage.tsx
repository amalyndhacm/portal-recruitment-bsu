import { ArrowLeft, GraduationCap, Mail, MapPin, Phone, ShieldCheck, UserRound } from 'lucide-react';
import type { UserProfile } from '@/context/AuthContext';
import { getRoleLabel } from '@/lib/accessControl';

export default function AccountProfilePage({ user, onBack }: { user: UserProfile; onBack: () => void }) {
  const candidate = user.accessLevel === 'candidate';
  const details = candidate
    ? [
        { label: 'Nomor telepon', value: user.phone, icon: Phone },
        { label: 'Domisili', value: user.domicile, icon: MapPin },
        { label: 'Pendidikan terakhir', value: user.education, icon: GraduationCap },
      ]
    : [{ label: 'NIP', value: user.nip, icon: ShieldCheck }];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-teal-700">
        <ArrowLeft size={17} /> Kembali ke dashboard
      </button>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-sky-700 px-6 py-8 text-white sm:px-9">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Pengaturan akun</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15"><UserRound size={27} /></div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold">Profil Saya</h1>
              <p className="mt-1 truncate text-sm text-white/80">Informasi pendaftaran yang tersimpan pada akun ini</p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-9">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Data akun</h2>
              <p className="mt-1 text-sm text-slate-500">Informasi ini hanya ditampilkan pada sesi akun yang sedang masuk.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><ShieldCheck size={14} /> {getRoleLabel(user.accessLevel)}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField label="Nama lengkap" value={user.name} icon={UserRound} />
            <ProfileField label={candidate ? 'Email akun' : 'Akun staff'} value={candidate ? user.email : user.nip || user.email} icon={Mail} />
            {details.map(({ label, value, icon }) => <ProfileField key={label} label={label} value={value} icon={icon} />)}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
            {candidate
              ? 'Data nama, email, telepon, domisili, dan pendidikan berasal dari formulir pendaftaran. Biodata untuk lamaran pekerjaan dapat dilengkapi atau diperbarui melalui proses lamaran.'
              : 'Nama dan NIP berasal dari pendaftaran akun staff. Jika ada kesalahan pada data kepegawaian atau role, hubungi administrator portal.'}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileField({ label, value, icon: Icon }: { label: string; value: string; icon: typeof UserRound }) {
  return (
    <div className="rounded-2xl border border-slate-200 px-4 py-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><Icon size={14} />{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-800">{value?.trim() || 'Belum diisi saat pendaftaran'}</p>
    </div>
  );
}
