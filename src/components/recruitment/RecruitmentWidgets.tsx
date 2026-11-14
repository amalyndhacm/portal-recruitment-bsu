import type { ReactNode } from 'react';

const TONES: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-600',
  sky: 'bg-sky-50 text-sky-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-rose-50 text-rose-600',
  violet: 'bg-violet-50 text-violet-600',
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'sky',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {icon && <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${TONES[tone]}`}>{icon}</div>}
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-sm text-slate-500">{label}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function ProgressBar({ value, max, color = 'bg-sky-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Satu baris grafik batang horizontal sederhana (CSS saja, tanpa library). */
export function BarRow({
  label,
  value,
  max,
  suffix,
  color = 'bg-sky-500',
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  color?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="truncate text-slate-700" title={label}>{label}</span>
        <span className="shrink-0 font-semibold text-slate-900">
          {value}
          {suffix && <span className="ml-1 text-xs font-normal text-slate-400">{suffix}</span>}
        </span>
      </div>
      <ProgressBar value={value} max={max} color={color} />
    </div>
  );
}

export function SectionCard({
  kicker,
  title,
  description,
  action,
  children,
}: {
  kicker?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          {kicker && <p className="section-kicker">{kicker}</p>}
          <h3 className="font-display text-lg font-semibold text-slate-900">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}