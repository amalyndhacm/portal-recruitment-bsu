import { useEffect, useMemo, useState } from 'react';
import { KanbanSquare, Search, Clock, MapPin, GripVertical } from 'lucide-react';
import { db, type JobApplicant } from '@/lib/database';
import {
  APPLICANT_STATUSES,
  isInterviewTriggerStage,
} from '@/lib/recruitment';
import { daysBetween, ensureCandidateOffering } from '@/lib/recruitmentModules';
import InterviewScheduleModal from '@/components/recruitment/InterviewScheduleModal';
import { PageHeader, Card, Badge, LoadingState, EmptyState } from '@/components/ui';
import type { PageId } from '@/components/Layout';
import { notifyPortal } from '@/lib/portalNotifications';

// ---------------------------------------------------------------------------
// Papan Kanban: satu kolom per status di `job_applicants`. Kartu kandidat
// bisa digeser (drag & drop) atau dipindah lewat dropdown "Pindah ke" (untuk
// layar sentuh). Memindahkan ke Psikotest / Interview User / Interview Final
// membuka form Jadwal Interview (yang juga mengirim notifikasi WA/Email dan
// memperbarui status), sama seperti alur di halaman Jadwal Interview.
// Perubahan status otomatis tercatat di applicant_status_history lewat trigger.
// ---------------------------------------------------------------------------

const COLUMN_ACCENT: Record<string, string> = {
  'Lamaran Masuk': 'border-t-slate-400',
  Screening: 'border-t-blue-400',
  Psikotest: 'border-t-yellow-400',
  'Interview User': 'border-t-sky-400',
  'Interview Final': 'border-t-indigo-400',
  Offering: 'border-t-violet-400',
  Onboarding: 'border-t-green-500',
  'Tidak Lolos': 'border-t-red-400',
};

export default function CandidatePipelinePage({ onNavigate }: { onNavigate?: (page: PageId) => void } = {}) {
  const [items, setItems] = useState<JobApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState('Semua');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<{ applicant: JobApplicant; stage: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await db.from('job_applicants').select('*').order('created_at', { ascending: false });
    setItems((data || []) as JobApplicant[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const positions = useMemo(() => ['Semua', ...Array.from(new Set(items.map((a) => a.position))).sort()], [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((a) => {
      if (position !== 'Semua' && a.position !== position) return false;
      if (!q) return true;
      return (
        a.full_name.toLowerCase().includes(q) ||
        a.position.toLowerCase().includes(q) ||
        a.tracking_code.toLowerCase().includes(q)
      );
    });
  }, [items, query, position]);

  const byStatus = useMemo(() => {
    const map: Record<string, JobApplicant[]> = {};
    for (const s of APPLICANT_STATUSES) map[s] = [];
    for (const a of filtered) (map[a.status] ||= []).push(a);
    return map;
  }, [filtered]);

  const updateStatus = async (applicant: JobApplicant, status: string): Promise<boolean> => {
    const prev = items;
    setItems((list) => list.map((a) => (a.id === applicant.id ? { ...a, status, updated_at: new Date().toISOString() } : a)));
    const { error } = await db.from('job_applicants').update({ status }).eq('id', applicant.id);
    if (error) {
      setItems(prev);
      alert('Gagal memindahkan kandidat. Coba lagi.');
      return false;
    }
    notifyPortal('Tahap kandidat diperbarui', `${applicant.full_name} dipindahkan dari ${applicant.status} ke ${status}.`);
    if (status === 'Offering') {
      const result = await ensureCandidateOffering(applicant);
      if (result.id) sessionStorage.setItem('portal-open-offering-id', result.id);
      else alert(`Status kandidat tersimpan, tetapi proses Offering belum dibuat: ${result.error || 'coba buka Offering dan ulangi.'}`);
    }
    return true;
  };

  const moveTo = async (applicant: JobApplicant, target: string) => {
    if (applicant.status === target) return;
    if (target === 'Offering') {
      const saved = await updateStatus(applicant, target);
      if (saved) onNavigate?.('rt-offering');
      return;
    }
    if (target === 'Onboarding') {
      const saved = await updateStatus(applicant, target);
      if (saved) onNavigate?.('rt-onboarding');
      return;
    }
    if (isInterviewTriggerStage(target)) {
      // Modal jadwal yang mengubah status + kirim notifikasi. Kalau dibatalkan,
      // status kandidat tidak berubah.
      setSchedule({ applicant, stage: target });
      return;
    }
    updateStatus(applicant, target);
  };

  const handleDrop = (target: string) => {
    const applicant = items.find((a) => a.id === dragId);
    setDragId(null);
    setOverColumn(null);
    if (applicant) moveTo(applicant, target);
  };

  return (
    <div>
      <PageHeader
        title="Pipeline Kandidat"
        subtitle="Papan tahapan seleksi. Geser kartu kandidat ke kolom berikutnya untuk memperbarui statusnya."
        icon={<KanbanSquare className="h-6 w-6 text-sky-600" />}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, posisi, atau kode lamaran..."
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          {positions.map((p) => (
            <option key={p} value={p}>
              {p === 'Semua' ? 'Semua posisi' : p}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <Card className="p-6">
          <EmptyState message="Belum ada lamaran yang masuk dari halaman Karier." />
        </Card>
      ) : (
        <div className="-mx-1 overflow-x-auto pb-4">
          <div className="flex min-w-max gap-4 px-1">
            {APPLICANT_STATUSES.map((status) => {
              const cards = byStatus[status] || [];
              const isOver = overColumn === status && dragId !== null;
              return (
                <div
                  key={status}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (overColumn !== status) setOverColumn(status);
                  }}
                  onDragLeave={() => setOverColumn((c) => (c === status ? null : c))}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(status);
                  }}
                  className={`flex w-72 shrink-0 flex-col rounded-xl border border-t-4 bg-slate-50 ${COLUMN_ACCENT[status] || 'border-t-slate-300'} ${
                    isOver ? 'border-sky-300 bg-sky-50/60' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between px-3 py-3">
                    <h3 className="text-sm font-semibold text-slate-800">{status}</h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-sm">{cards.length}</span>
                  </div>
                  <div className="flex max-h-[62vh] min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
                    {cards.length === 0 && <p className="px-2 py-6 text-center text-xs text-slate-400">Belum ada kandidat</p>}
                    {cards.map((a) => (
                      <CandidateCard
                        key={a.id}
                        applicant={a}
                        dragging={dragId === a.id}
                        onDragStart={() => setDragId(a.id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverColumn(null);
                        }}
                        onMove={(target) => moveTo(a, target)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {schedule && (
        <InterviewScheduleModal
          applicant={schedule.applicant}
          stage={schedule.stage}
          onClose={() => setSchedule(null)}
          onSaved={(scheduleId) => {
            setSchedule(null);
            if (onNavigate) {
              sessionStorage.setItem('portal-highlight-interview-schedule-id', scheduleId);
              onNavigate('rt-interview-schedule');
            } else {
              load();
            }
          }}
        />
      )}
    </div>
  );
}

function CandidateCard({
  applicant,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  applicant: JobApplicant;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (target: string) => void;
}) {
  const waitingDays = applicant.status === 'Lamaran Masuk' ? daysBetween(applicant.created_at) : 0;
  const stale = waitingDays >= 3;
  const updatedDays = daysBetween(applicant.updated_at || applicant.created_at);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', applicant.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`cursor-grab rounded-lg border bg-white p-3 shadow-sm transition active:cursor-grabbing ${
        dragging ? 'opacity-40' : 'hover:shadow-md'
      } ${stale ? 'border-amber-300' : 'border-slate-200'}`}
    >
      <div className="flex items-start gap-2">
        <GripVertical size={14} className="mt-0.5 shrink-0 text-slate-300" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900" title={applicant.full_name}>{applicant.full_name}</p>
          <p className="truncate text-xs text-slate-500" title={applicant.position}>{applicant.position}</p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
        {applicant.placement_area && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={11} /> {applicant.placement_area}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Clock size={11} /> {updatedDays <= 0 ? 'Hari ini' : `${updatedDays} hari lalu`}
        </span>
      </div>

      {stale && (
        <div className="mt-2">
          <Badge text={`Belum diproses ${waitingDays} hari`} color="yellow" />
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-slate-400">{applicant.tracking_code}</span>
        <select
          value=""
          onChange={(e) => e.target.value && onMove(e.target.value)}
          aria-label={`Pindahkan ${applicant.full_name}`}
          className="max-w-[110px] rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">Pindah ke…</option>
          {APPLICANT_STATUSES.filter((s) => s !== applicant.status).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
