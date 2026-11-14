import { useEffect, useMemo, useState } from 'react';
import { UserCheck, Trash2, PlayCircle, ClipboardList, Hourglass, AlarmClock, BadgeCheck } from 'lucide-react';
import { db } from '@/lib/database';
import {
  ONBOARDING_CHECKLIST,
  PROBATION_STATUSES,
  PROBATION_STATUS_COLORS,
  addMonthsISO,
  daysBetween,
  fetchApplicantsLite,
  formatDateShort,
  todayISO,
  type ApplicantLite,
  type CandidateOffering,
  type CandidateOnboarding,
} from '@/lib/recruitmentModules';
import { ProgressBar, StatCard, SectionCard } from '@/components/recruitment/RecruitmentWidgets';
import { PageHeader, Card, Button, Badge, LoadingState, EmptyState } from '@/components/ui';
import { notifyPortal } from '@/lib/portalNotifications';

// ---------------------------------------------------------------------------
// Onboarding & Probation: checklist hari pertama dan evaluasi masa probation
// untuk kandidat berstatus "Onboarding". Kandidat yang sudah berstatus
// Onboarding tapi belum punya catatan onboarding muncul di bagian atas dan
// bisa dimulai dengan satu klik (tanggal mulai diambil dari Offering kalau ada).
// ---------------------------------------------------------------------------

const DEFAULT_PROBATION_MONTHS = 3;

export default function OnboardingPage() {
  const [items, setItems] = useState<CandidateOnboarding[]>([]);
  const [applicants, setApplicants] = useState<ApplicantLite[]>([]);
  const [offerStart, setOfferStart] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Semua');

  const load = async () => {
    setLoading(true);
    const [onboardings, list, offers] = await Promise.all([
      db
        .from('candidate_onboardings')
        .select('*, job_applicants(full_name, position, tracking_code, status, placement_area)')
        .order('created_at', { ascending: false }),
      fetchApplicantsLite(),
      db.from('candidate_offerings').select('applicant_id, expected_start_date'),
    ]);
    setItems((onboardings.data || []) as CandidateOnboarding[]);
    setApplicants(list);
    const map: Record<string, string> = {};
    for (const row of (offers.data || []) as Pick<CandidateOffering, 'applicant_id' | 'expected_start_date'>[]) {
      if (row.expected_start_date) map[row.applicant_id] = row.expected_start_date;
    }
    setOfferStart(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const notStarted = useMemo(() => {
    const started = new Set(items.map((i) => i.applicant_id));
    return applicants.filter((a) => a.status === 'Onboarding' && !started.has(a.id));
  }, [applicants, items]);

  const stats = useMemo(() => {
    const running = items.filter((i) => i.probation_status === 'Berjalan');
    const endingSoon = running.filter((i) => i.probation_end && daysBetween(new Date(), i.probation_end) <= 14).length;
    return {
      total: items.length,
      running: running.length,
      endingSoon,
      passed: items.filter((i) => i.probation_status === 'Lulus').length,
    };
  }, [items]);

  const filtered = useMemo(
    () => items.filter((i) => statusFilter === 'Semua' || i.probation_status === statusFilter),
    [items, statusFilter],
  );

  const startOnboarding = async (a: ApplicantLite) => {
    const start = offerStart[a.id] || todayISO();
    const { error } = await db.from('candidate_onboardings').insert({
      applicant_id: a.id,
      start_date: start,
      probation_start: start,
      probation_end: addMonthsISO(start, DEFAULT_PROBATION_MONTHS),
      probation_status: 'Berjalan',
    });
    if (error) {
      alert('Gagal memulai onboarding. Pastikan migrasi database sudah dijalankan.');
      return;
    }
    notifyPortal('Onboarding dimulai', `${a.full_name} masuk ke proses onboarding dan probation.`);
    load();
  };

  const patch = async (id: string, changes: Partial<CandidateOnboarding>) => {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...changes } : i)));
    const { job_applicants: _ignored, ...dbChanges } = changes;
    void _ignored;
    const { error } = await db
      .from('candidate_onboardings')
      .update({ ...dbChanges, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      alert('Gagal menyimpan perubahan.');
      load();
      return;
    }
    const item = items.find((current) => current.id === id);
    if (item && changes.probation_status) notifyPortal('Status probation diperbarui', `${item.job_applicants?.full_name || 'Kandidat'}: status probation menjadi ${changes.probation_status}.`);
  };

  const remove = async (id: string) => {
    if (!confirm('Hapus catatan onboarding ini?')) return;
    await db.from('candidate_onboardings').delete().eq('id', id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Onboarding & Probation"
        subtitle="Pantau checklist hari pertama dan evaluasi masa probation kandidat yang sudah diterima."
        icon={<UserCheck className="h-6 w-6 text-sky-600" />}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total onboarding" value={stats.total} icon={<ClipboardList size={18} />} tone="sky" />
        <StatCard label="Probation berjalan" value={stats.running} icon={<Hourglass size={18} />} tone="violet" />
        <StatCard label="Berakhir ≤ 14 hari" value={stats.endingSoon} hint="Perlu evaluasi segera" icon={<AlarmClock size={18} />} tone="amber" />
        <StatCard label="Lulus probation" value={stats.passed} icon={<BadgeCheck size={18} />} tone="green" />
      </div>

      {notStarted.length > 0 && (
        <div className="mb-6">
          <SectionCard
            kicker="Perlu tindakan"
            title="Kandidat siap onboarding"
            description={`Berstatus Onboarding di pipeline, tapi belum dibuatkan catatan onboarding. Probation default ${DEFAULT_PROBATION_MONTHS} bulan.`}
          >
            <div className="divide-y divide-slate-100">
              {notStarted.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">{a.full_name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {a.position}
                      {offerStart[a.id] ? ` · Mulai kerja ${formatDateShort(offerStart[a.id])}` : ' · Tanggal mulai belum ada di Offering (dipakai hari ini)'}
                    </p>
                  </div>
                  <Button onClick={() => startOnboarding(a)}>
                    <PlayCircle className="mr-1.5 inline h-4 w-4" /> Mulai Onboarding
                  </Button>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {['Semua', ...PROBATION_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              statusFilter === s ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState message={items.length === 0 ? 'Belum ada catatan onboarding.' : 'Tidak ada data dengan status probation ini.'} />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((i) => (
            <OnboardingCard key={i.id} item={i} onPatch={patch} onDelete={remove} />
          ))}
        </div>
      )}
    </div>
  );
}

function OnboardingCard({
  item: i,
  onPatch,
  onDelete,
}: {
  item: CandidateOnboarding;
  onPatch: (id: string, changes: Partial<CandidateOnboarding>) => void;
  onDelete: (id: string) => void;
}) {
  const [notes, setNotes] = useState(i.evaluation_notes || '');
  const done = i.checklist.length;
  const total = ONBOARDING_CHECKLIST.length;
  const daysLeft = i.probation_end ? daysBetween(new Date(), i.probation_end) : null;

  const toggle = (item: string) => {
    const next = i.checklist.includes(item) ? i.checklist.filter((c) => c !== item) : [...i.checklist, item];
    onPatch(i.id, { checklist: next });
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900">{i.job_applicants?.full_name || '-'}</h3>
          <p className="truncate text-sm text-slate-500">
            {i.job_applicants?.position}
            {i.job_applicants?.placement_area ? ` · ${i.job_applicants.placement_area}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge text={i.probation_status} color={PROBATION_STATUS_COLORS[i.probation_status] || 'slate'} />
          <button onClick={() => onDelete(i.id)} className="p-1 text-slate-300 transition-colors hover:text-red-500" aria-label="Hapus onboarding">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Mulai kerja</span>
          <input
            type="date"
            value={i.start_date || ''}
            onChange={(e) => onPatch(i.id, { start_date: e.target.value || null })}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Status probation</span>
          <select
            value={i.probation_status}
            onChange={(e) => onPatch(i.id, { probation_status: e.target.value })}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {PROBATION_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Probation mulai</span>
          <input
            type="date"
            value={i.probation_start || ''}
            onChange={(e) => onPatch(i.id, { probation_start: e.target.value || null })}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-xs font-medium text-slate-500">
            Probation berakhir
            {i.probation_status === 'Berjalan' && daysLeft !== null && (
              <span className={daysLeft <= 14 ? 'font-semibold text-amber-600' : 'text-slate-400'}>
                {daysLeft < 0 ? `lewat ${Math.abs(daysLeft)} hari` : `${daysLeft} hari lagi`}
              </span>
            )}
          </span>
          <input
            type="date"
            value={i.probation_end || ''}
            onChange={(e) => onPatch(i.id, { probation_end: e.target.value || null })}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </label>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Checklist onboarding</p>
          <span className="text-xs font-semibold text-slate-600">{done}/{total}</span>
        </div>
        <ProgressBar value={done} max={total} color={done === total ? 'bg-emerald-500' : 'bg-sky-500'} />
        <div className="mt-3 space-y-1.5">
          {ONBOARDING_CHECKLIST.map((task) => (
            <label key={task} className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={i.checklist.includes(task)}
                onChange={() => toggle(task)}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className={i.checklist.includes(task) ? 'text-slate-400 line-through' : ''}>{task}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium text-slate-500">Catatan evaluasi probation</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (i.evaluation_notes || '') && onPatch(i.id, { evaluation_notes: notes.trim() || null })}
          rows={2}
          placeholder="Hasil evaluasi atasan, kedisiplinan, kinerja..."
          className="w-full resize-y rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </label>
    </Card>
  );
}
