import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Building2, Instagram, MapPinned, MessageCircle, ArrowUpRight } from 'lucide-react';
import ChatbotWidget from '@/components/dashboard/ChatbotWidget';
import PageHeader, { type PageKey } from '@/pages/public/PageHeader';
import PageFooter from '@/pages/public/PageFooter';

const WINGS = [
  { key: 'sky', hex: '#38bdf8' },
  { key: 'emerald', hex: '#10b981' },
  { key: 'amber', hex: '#f59e0b' },
  { key: 'rose', hex: '#f43f5e' },
  { key: 'navy', hex: '#1d4ed8' },
] as const;

const CONTACT_CHANNELS = [
  { icon: MessageCircle, label: 'WhatsApp', value: '081291836333', href: 'https://wa.me/6281291836333', color: WINGS[1].hex },
  { icon: Instagram, label: 'Instagram', value: '@bsu_recruitment', href: 'https://instagram.com/bsu_recruitment', color: '#d946ef' },
  { icon: MapPinned, label: 'Alamat Kantor', value: 'Jl. Subur No.1, RT.05/RW.05, Penarukan, Kec. Kepanjen, Kabupaten Malang, Jawa Timur 65163', href: undefined, color: WINGS[4].hex },
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

export default function ContactPage({
  onNavigate,
  onLoginClick,
}: {
  onNavigate: (page: PageKey) => void;
  onLoginClick: () => void;
}) {
  return (
    <div className="min-h-screen bg-white font-body text-slate-800">
      <PageHeader active="contact" onNavigate={onNavigate} onLoginClick={onLoginClick} />

      <main className="relative overflow-hidden bg-[#f4f8f8]">
        <div className="absolute -right-32 top-16 h-80 w-80 rounded-full bg-[#7ed9ca]/20 blur-3xl" />
        <div className="absolute -left-40 bottom-10 h-96 w-96 rounded-full bg-[#2e7fbf]/10 blur-3xl" />
        <section className="relative mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="grid items-stretch gap-8 lg:grid-cols-[.9fr_1.1fr]">
            <Reveal from="left" className="relative overflow-hidden rounded-[2rem] bg-[#102e35] p-8 text-white shadow-[0_24px_70px_rgba(16,46,53,.2)] sm:p-12">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border border-white/10" />
              <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full border border-white/10" />
              <div className="relative flex h-full flex-col justify-between gap-16">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#a7e5d7]">Hubungi Kami</span>
                  <h1 className="font-display mt-6 max-w-md text-4xl font-semibold leading-tight sm:text-5xl">Mari terhubung dengan tim BSU.</h1>
                  <p className="mt-5 max-w-md text-sm leading-7 text-white/70">Untuk informasi rekrutmen dan kebutuhan kerja sama, sampaikan pertanyaan Anda melalui kanal resmi kami.</p>
                </div>
                <div className="flex items-center gap-3 text-sm text-white/70"><span className="h-px w-12 bg-[#7ed9ca]" />PT Bintang Sayap Utama</div>
              </div>
            </Reveal>

            <Reveal from="right" delay={100} className="grid gap-4">
              {CONTACT_CHANNELS.map((c) => {
                const ChannelIcon = c.icon;
                const content = <><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm" style={{ backgroundColor: c.color }}><ChannelIcon size={21} /></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{c.label}</span><span className="mt-1 block text-sm font-semibold leading-6 text-slate-800">{c.value}</span></span>{c.href && <ArrowUpRight size={18} className="shrink-0 text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-700" />}</>;
                return c.href ? <a key={c.label} href={c.href} target="_blank" rel="noreferrer" className="group flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,.05)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,.1)]">{content}</a> : <div key={c.label} className="group flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,.05)]">{content}</div>;
              })}
              <div className="rounded-2xl border border-[#2fb4c4]/20 bg-[#e9f8f5] p-5 text-sm leading-6 text-[#126b78]"><Building2 size={18} className="mb-2" /><strong>Jam layanan</strong><br />Senin–Jumat · 08.00–17.00 WIB</div>
            </Reveal>
          </div>
        </section>
      </main>

      <PageFooter onNavigate={onNavigate} onLoginClick={onLoginClick} />
      <ChatbotWidget />
    </div>
  );
}
