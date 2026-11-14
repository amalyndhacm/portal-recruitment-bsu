import { useEffect, useMemo, useState } from 'react';
import { LineChart, Download, Users, UserCheck, UserX, Timer, Wallet, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '@/lib/database';
import { APPLICANT_STATUSES, APPLICANT_TIMELINE_STAGES } from '@/lib/recruitment';
import {
  fetchApplicantsLite,
  formatRupiah,
  type ApplicantLite,
  type StatusHistoryRow,
} from '@/lib/recruitmentModules';
import { BarRow, SectionCard, StatCard } from '@/components/recruitment/RecruitmentWidgets';
import { PageHeader, Button, Card, LoadingState, EmptyState } from '@/components/ui';

// ---------------------------------------------------------------------------
// Laporan & Analitik Rekrutmen: semua angka dihitung otomatis dari data
// pelamar, riwayat status, PRK, dan biaya pemasangan -- tidak ada input manual.
// Time-to-hire baru terisi untuk kandidat yang perubahan statusnya terjadi
// setelah trigger applicant_status_history aktif (lihat file migrasi).
// ---------------------------------------------------------------------------

const PERIODS = [
  { label: '30 hari', days: 30 },
  { label: '90 hari', days: 90 },
  { label: '1 tahun', days: 365 },
  { label: 'Semua', days: 0 },
] as const;

type RequestRow = { overall_status: string; quantity: number };

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Senin = 0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

function tally<T>(rows: T[], key: (row: T) => string) {
  const map: Record<string, number> = {};
  for (const r of rows) {
    const k = key(r);
    map[k] = (map[k] || 0) + 1;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

export default function RecruitmentAnalyticsPage() {
  const [applicants, setApplicants] = useState<ApplicantLite[]>([]);
  const [history, setHistory] = useState<StatusHistoryRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(true);
  const [periodDays, setPeriodDays] = useState<number>(90);

  useEffect(() => {
    let active = true;
    (async () => {
      const [list, hist, reqs, sources] = await Promise.all([
        fetchApplicantsLite(),
        db.from('applicant_status_history').select('*'),
        db.from('employee_requests').select('overall_status, quantity').is('trashed_at', null),
        db.from('recruitment_sources').select('cost'),
      ]);
      if (!active) return;
      setApplicants(list);
      setHistory((hist.data || []) as StatusHistoryRow[]);
      setRequests((reqs.data || []) as RequestRow[]);
      setTotalCost(((sources.data || []) as { cost: number }[]).reduce((s, r) => s + Number(r.cost || 0), 0));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const scoped = useMemo(() => {
    if (!periodDays) return applicants;
    const since = Date.now() - periodDays * 86_400_000;
    return applicants.filter((a) => new Date(a.created_at).getTime() >= since);
  }, [applicants, periodDays]);

  const kpi = useMemo(() => {
    const hired = scoped.filter((a) => a.status === 'Onboarding');
    const rejected = scoped.filter((a) => a.status === 'Tidak Lolos').length;

    const firstOnboarding = new Map<string, number>();
    for (const h of history) {
      if (h.to_status !== 'Onboarding') continue;
      const t = new Date(h.changed_at).getTime();
      const prev = firstOnboarding.get(h.applicant_id);
      if (prev === undefined || t < prev) firstOnboarding.set(h.applicant_id, t);
    }
    const durations = hired
      .map((a) => {
        const end = firstOnboarding.get(a.id);
        return end ? Math.max(0, Math.round((end - new Date(a.created_at).getTime()) / 86_400_000)) : null;
      })
      .filter((d): d is number => d !== null);
    const avgTimeToHire = durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : null;

    return {
      total: scoped.length,
      inProcess: scoped.length - hired.length - rejected,
      hired: hired.length,
      rejected,
      avgTimeToHire,
      timeSamples: durations.length,
      costPerHire: totalCost > 0 && hired.length > 0 ? Math.round(totalCost / hired.length) : null,
    };
  }, [scoped, history, totalCost]);

  // Funnel: kandidat yang pernah mencapai tiap tahap (status sekarang di/lewat
  // tahap itu, atau tahap itu pernah tercatat di riwayat status).
  const funnel = useMemo(() => {
    const ever = new Map<string, Set<string>>();
    for (const h of history) {
      if (!ever.has(h.applicant_id)) ever.set(h.applicant_id, new Set());
      ever.get(h.applicant_id)!.add(h.to_status);
    }
    return APPLICANT_TIMELINE_STAGES.map((stage, idx) => {
      const count = scoped.filter((a) => {
        if (idx === 0) return true;
        const currentIdx = APPLICANT_TIMELINE_STAGES.indexOf(a.status as (typeof APPLICANT_TIMELINE_STAGES)[number]);
        if (currentIdx >= idx) return true;
        return ever.get(a.id)?.has(stage) ?? false;
      }).length;
      return { stage, count };
    });
  }, [scoped, history]);

  const weekly = useMemo(() => {
    const thisWeek = startOfWeek(new Date());
    return Array.from({ length: 8 }, (_, i) => {
      const start = new Date(thisWeek);
      start.setDate(start.getDate() - (7 - i) * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const count = applicants.filter((a) => {
        const t = new Date(a.created_at).getTime();
        return t >= start.getTime() && t < end.getTime();
      }).length;
      return { label: start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), count };
    });
  }, [applicants]);

  const byPosition = useMemo(() => {
    const map: Record<string, { total: number; hired: number }> = {};
    for (const a of scoped) {
      const row = (map[a.position] ||= { total: 0, hired: 0 });
      row.total += 1;
      if (a.status === 'Onboarding') row.hired += 1;
    }
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [scoped]);

  const bySource = useMemo(() => tally(scoped, (a) => a.referral_source || 'Tidak diisi'), [scoped]);
  const byEducation = useMemo(() => tally(scoped, (a) => a.education || 'Tidak diisi'), [scoped]);
  const byArea = useMemo(() => tally(scoped, (a) => a.placement_area || 'Tidak diisi').slice(0, 8), [scoped]);
  const byStatus = useMemo(() => tally(scoped, (a) => a.status), [scoped]);

  const requestSummary = useMemo(() => {
    const map: Record<string, { count: number; qty: number }> = {};
    for (const r of requests) {
      const row = (map[r.overall_status] ||= { count: 0, qty: 0 });
      row.count += 1;
      row.qty += Number(r.quantity || 0);
    }
    return Object.entries(map);
  }, [requests]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const add = (name: string, rows: Record<string, string | number>[]) =>
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: 'Tidak ada data' }]), name);

    add('Ringkasan', [
      { Indikator: 'Total pelamar', Nilai: kpi.total },
      { Indikator: 'Dalam proses', Nilai: kpi.inProcess },
      { Indikator: 'Diterima (Onboarding)', Nilai: kpi.hired },
      { Indikator: 'Tidak lolos', Nilai: kpi.rejected },
      { Indikator: 'Rata-rata time-to-hire (hari)', Nilai: kpi.avgTimeToHire ?? '-' },
      { Indikator: 'Biaya per hire (Rp)', Nilai: kpi.costPerHire ?? '-' },
    ]);
    add('Funnel', funnel.map((f, i) => ({
      Tahap: f.stage,
      Kandidat: f.count,
      'Konversi dari tahap sebelumnya (%)': i === 0 || funnel[i - 1].count === 0 ? '-' : Math.round((f.count / funnel[i - 1].count) * 100),
    })));
    add('Per Posisi', byPosition.map(([position, v]) => ({ Posisi: position, Pelamar: v.total, Diterima: v.hired })));
    add('Sumber Pelamar', bySource.map(([s, n]) => ({ Sumber: s, Pelamar: n })));
    add('Pendidikan', byEducation.map(([s, n]) => ({ Pendidikan: s, Pelamar: n })));
    add('Area Penempatan', byArea.map(([s, n]) => ({ Area: s, Pelamar: n })));
    add('Tren Mingguan', weekly.map((w) => ({ 'Minggu mulai': w.label, Pelamar: w.count })));
    XLSX.writeFile(wb, `Analitik-Rekrutmen-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) return <LoadingState />;

  const weeklyMax = Math.max(...weekly.map((w) => w.count), 1);

  return (
    <div>
      <PageHeader
        title="Analitik Rekrutmen"
        subtitle="Ringkasan otomatis dari data pelamar, riwayat status, PRK, dan biaya pemasangan lowongan."
        icon={<LineChart className="h-6 w-6 text-sky-600" />}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPeriodDays(p.days)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                periodDays === p.days ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Button variant="secondary" onClick={exportExcel} disabled={applicants.length === 0}>
          <Download className="mr-1.5 inline h-4 w-4" /> Export Excel
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total pelamar" value={kpi.total} icon={<Users size={18} />} tone="sky" />
        <StatCard label="Dalam proses" value={kpi.inProcess} icon={<Loader2 size={18} />} tone="violet" />
        <StatCard label="Diterima" value={kpi.hired} hint="Status Onboarding" icon={<UserCheck size={18} />} tone="green" />
        <StatCard label="Tidak lolos" value={kpi.rejected} icon={<UserX size={18} />} tone="red" />
        <StatCard
          label="Rata-rata time-to-hire"
          value={kpi.avgTimeToHire !== null ? `${kpi.avgTimeToHire} hari` : '-'}
          hint={kpi.timeSamples ? `Dari ${kpi.timeSamples} kandidat` : 'Menunggu data riwayat status'}
          icon={<Timer size={18} />}
          tone="amber"
        />
        <StatCard
          label="Biaya per hire"
          value={kpi.costPerHire !== null ? formatRupiah(kpi.costPerHire) : '-'}
          hint="Total biaya media ÷ diterima"
          icon={<Wallet size={18} />}
          tone="amber"
        />
      </div>

      {applicants.length === 0 ? (
        <Card className="p-6">
          <EmptyState message="Belum ada data pelamar untuk dianalisis." />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard kicker="Funnel" title="Kandidat per tahap" description="Jumlah kandidat yang pernah mencapai tiap tahap, beserta konversi dari tahap sebelumnya.">
              <div className="space-y-3">
                {funnel.map((f, i) => {
                  const prev = i === 0 ? null : funnel[i - 1].count;
                  const conv = prev ? Math.round((f.count / prev) * 100) : null;
                  return (
                    <BarRow
                      key={f.stage}
                      label={f.stage}
                      value={f.count}
                      max={funnel[0].count || 1}
                      suffix={conv !== null ? `(${conv}%)` : undefined}
                      color={f.stage === 'Onboarding' ? 'bg-emerald-500' : 'bg-sky-500'}
                    />
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard kicker="Tren" title="Lamaran masuk per minggu" description="8 minggu terakhir (tidak terpengaruh filter periode).">
              <div className="flex h-44 items-end gap-2">
                {weekly.map((w) => (
                  <div key={w.label} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-xs font-semibold text-slate-700">{w.count}</span>
                    <div className="w-full rounded-t-md bg-sky-500" style={{ height: `${Math.max((w.count / weeklyMax) * 100, w.count ? 6 : 2)}%` }} />
                    <span className="text-[10px] text-slate-400">{w.label}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard kicker="Posisi" title="Pelamar per posisi" description="Delapan posisi teratas; angka kanan = jumlah diterima.">
              <div className="space-y-3">
                {byPosition.slice(0, 8).map(([position, v]) => (
                  <BarRow key={position} label={position} value={v.total} max={byPosition[0][1].total} suffix={`(${v.hired} diterima)`} />
                ))}
              </div>
            </SectionCard>

            <SectionCard kicker="Sumber" title="Asal pelamar" description="Berdasarkan Sumber Informasi di formulir pendaftaran.">
              <div className="space-y-3">
                {bySource.map(([source, n]) => (
                  <BarRow key={source} label={source} value={n} max={bySource[0][1]} color="bg-violet-500" />
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <SectionCard kicker="Profil" title="Pendidikan terakhir">
              <div className="space-y-3">
                {byEducation.map(([label, n]) => (
                  <BarRow key={label} label={label} value={n} max={byEducation[0][1]} color="bg-emerald-500" />
                ))}
              </div>
            </SectionCard>

            <SectionCard kicker="Wilayah" title="Area penempatan">
              <div className="space-y-3">
                {byArea.map(([label, n]) => (
                  <BarRow key={label} label={label} value={n} max={byArea[0][1]} color="bg-amber-500" />
                ))}
              </div>
            </SectionCard>

            <SectionCard kicker="Status" title="Distribusi status saat ini">
              <div className="space-y-3">
                {APPLICANT_STATUSES.map((s) => {
                  const n = byStatus.find(([label]) => label === s)?.[1] ?? 0;
                  return <BarRow key={s} label={s} value={n} max={Math.max(...byStatus.map(([, x]) => x), 1)} color={s === 'Tidak Lolos' ? 'bg-rose-400' : 'bg-sky-500'} />;
                })}
              </div>
            </SectionCard>
          </div>

          <SectionCard kicker="Kebutuhan" title="Pengajuan Karyawan Baru (PRK)" description="Jumlah surat dan total posisi yang diminta, per status.">
            {requestSummary.length === 0 ? (
              <EmptyState message="Belum ada pengajuan PRK." />
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {requestSummary.map(([status, v]) => (
                  <div key={status} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="text-xl font-bold text-slate-900">{v.count}</p>
                    <p className="text-xs text-slate-500">{status}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{v.qty} orang diminta</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
