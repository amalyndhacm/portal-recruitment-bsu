import { useState } from 'react';
import { X, Search, CheckCircle2, XCircle, Circle, CalendarClock, MapPin } from 'lucide-react';
import { db, type InterviewSchedule, type JobApplicant } from '@/lib/database';
import { APPLICANT_TIMELINE_STAGES, isInterviewTriggerStage } from '@/lib/recruitment';

function formatScheduleDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ApplicationStatusModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<JobApplicant | null>(null);
  const [schedule, setSchedule] = useState<InterviewSchedule | null>(null);

  const search = async () => {
    setError('');
    setResult(null);
    setSchedule(null);
    const q = query.trim();
    if (!q) {
      setError('Masukkan kode lamaran atau email Anda.');
      return;
    }
    setLoading(true);
    const isEmail = q.includes('@');
    const req = isEmail
      ? db.from('job_applicants').select('*').ilike('email', q).order('created_at', { ascending: false }).limit(1)
      : db.from('job_applicants').select('*').ilike('tracking_code', q).limit(1);
    const { data, error: err } = await req;
    setLoading(false);
    if (err) {
      setError('Terjadi kesalahan saat mencari data. Coba lagi.');
      return;
    }
    if (!data || data.length === 0) {
      setError('Data lamaran tidak ditemukan. Periksa kembali kode atau email Anda.');
      return;
    }
    const applicant = data[0] as JobApplicant;
    setResult(applicant);

    // Kalau kandidat sedang di tahap yang butuh jadwal (Psikotest/Interview
    // User/Interview Final), tampilkan juga jadwalnya kalau sudah dibuat HR.
    if (isInterviewTriggerStage(applicant.status)) {
      const { data: scheduleRows } = await db
        .from('interview_schedules')
        .select('*')
        .eq('applicant_id', applicant.id)
        .eq('stage', applicant.status)
        .order('created_at', { ascending: false })
        .limit(1);
      if (scheduleRows && scheduleRows.length > 0) setSchedule(scheduleRows[0] as InterviewSchedule);
    }
  };

  const rejected = result?.status === 'Tidak Lolos';
  const currentStageIndex = result
    ? APPLICANT_TIMELINE_STAGES.findIndex((s) => s === result.status)
    : -1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-display text-lg font-bold text-slate-900">Cek Status Lamaran</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Kode Lamaran atau Email</label>
          <div className="flex gap-2">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="Contoh: BSU-A1B2C3D4 atau nama@email.com"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
            />
            <button
              onClick={search}
              disabled={loading}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              <Search size={15} /> {loading ? 'Mencari...' : 'Cari'}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

          {result && (
            <div className="mt-6 rounded-2xl border border-slate-200 p-5">
              <p className="text-xs uppercase tracking-wide text-slate-400">Kode Lamaran</p>
              <p className="font-mono text-sm font-semibold text-slate-800">{result.tracking_code}</p>
              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{result.full_name}</p>
                  <p className="text-sm text-slate-500">{result.position}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    rejected ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700'
                  }`}
                >
                  {result.status}
                </span>
              </div>

              {rejected ? (
                <div className="mt-5 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
                  <XCircle size={16} className="shrink-0" />
                  Mohon maaf, lamaran Anda belum berhasil pada proses rekrutmen kali ini.
                </div>
              ) : (
                <div className="mt-6">
                  <p className="mb-3 text-xs text-slate-500">Tahap seleksi: Lamaran Masuk → Screening → Psikotest → Interview → Offering → Onboarding</p>
                  <div className="flex items-center">
                    {APPLICANT_TIMELINE_STAGES.map((stage, i) => {
                      const done = i < currentStageIndex;
                      const active = i === currentStageIndex;
                      return (
                        <div key={stage} className="flex flex-1 items-center last:flex-none">
                          <div className="flex flex-col items-center">
                            {done ? (
                              <CheckCircle2 size={20} className="text-emerald-500" />
                            ) : active ? (
                              <CheckCircle2 size={20} className="text-sky-600" />
                            ) : (
                              <Circle size={20} className="text-slate-300" />
                            )}
                            <p
                              className={`mt-1.5 max-w-[64px] text-center text-[10px] leading-tight ${
                                active ? 'font-semibold text-sky-700' : done ? 'text-slate-500' : 'text-slate-400'
                              }`}
                            >
                              {stage}
                            </p>
                          </div>
                          {i < APPLICANT_TIMELINE_STAGES.length - 1 && (
                            <div className={`mx-1 h-0.5 flex-1 ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {schedule && (
                <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-3.5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sky-700">
                    <CalendarClock size={13} /> Jadwal {result.status}
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-slate-800">
                    {formatScheduleDate(schedule.scheduled_date)}, pukul {schedule.scheduled_time} WIB
                  </p>
                  {schedule.location && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                      <MapPin size={12} className="text-slate-400" /> {schedule.location}
                    </p>
                  )}
                  {schedule.notes && <p className="mt-1.5 text-xs text-slate-500">{schedule.notes}</p>}
                </div>
              )}

              <p className="mt-5 text-xs text-slate-400">
                Diperbarui terakhir: {new Date(result.updated_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
