import { ArrowUpRight, Mail, MapPinned, Phone } from 'lucide-react';
import logoBsu from '@/asset/images/logo_bsu.jpg';
import type { PageKey } from '@/pages/public/PageHeader';

export default function PageFooter({
  onNavigate,
  onLoginClick,
}: {
  onNavigate: (page: PageKey) => void;
  onLoginClick: () => void;
}) {
  return (
    <footer className="relative overflow-hidden bg-[#102c36] text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 h-24 overflow-hidden">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="h-full w-full" role="presentation">
          <path d="M0 0h1440v42c-360 76-720 76-1080 0C240 26 120 30 0 58V0Z" fill="#ffffff" />
        </svg>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-24 h-64 w-64 rounded-full bg-teal-400/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 bottom-4 h-52 w-52 rounded-full bg-amber-300/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-7 pt-28 sm:pb-9">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_.75fr_.95fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white p-1 ring-4 ring-white/10">
                <img src={logoBsu} alt="Logo PT Bintang Sayap Utama" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="font-display text-lg font-bold tracking-tight">PT Bintang Sayap Utama</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.24em] text-teal-200/75">People platform</p>
              </div>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-6 text-slate-300">
              Portal terpadu untuk mendukung perjalanan karyawan, proses Recruitment, dan layanan SDM yang lebih terarah.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-teal-100">
              <span className="h-2 w-2 rounded-full bg-lime-300 shadow-[0_0_0_4px_rgba(190,242,100,.12)]" />
              Bertumbuh bersama talenta terbaik
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-200">Navigasi</p>
            <div className="mt-4 grid gap-2.5 text-sm text-slate-300">
              <FooterLink label="Profil Perusahaan" onClick={() => onNavigate('profile')} />
              <FooterLink label="Karier" onClick={() => onNavigate('career')} />
              <FooterLink label="Kontak" onClick={() => onNavigate('contact')} />
              <FooterLink label="Masuk Karyawan" onClick={onLoginClick} />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-200">Hubungi kami</p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p className="flex items-start gap-3"><Phone size={16} className="mt-0.5 shrink-0 text-lime-300" /><span>0822-2500-0968</span></p>
              <p className="flex items-start gap-3"><Mail size={16} className="mt-0.5 shrink-0 text-lime-300" /><span>bintangsayaputama.com</span></p>
              <p className="flex items-start gap-3"><MapPinned size={16} className="mt-0.5 shrink-0 text-lime-300" /><span>Jl. Subur No.1, Penarukan, Kec. Kepanjen, 65163</span></p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} PT Bintang Sayap Utama</p>
          <p className="inline-flex items-center gap-1.5">Bagian dari Gudang Baru Group <ArrowUpRight size={13} className="text-teal-200" /></p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="group inline-flex w-fit items-center gap-1.5 text-left transition-colors hover:text-white"><span>{label}</span><ArrowUpRight size={13} className="text-teal-200/70 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></button>;
}
