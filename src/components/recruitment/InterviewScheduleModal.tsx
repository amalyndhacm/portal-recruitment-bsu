import { useEffect, useState } from 'react';
import { X, CalendarClock, Info, Video, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { db, type InterviewSchedule, type JobApplicant } from '@/lib/database';
import { Button, Input, TextArea } from '@/components/ui';
import { PSYCHOTESTS } from '../../lib/psychotests';

// ---------------------------------------------------------------------------
// Muncul otomatis begitu status kandidat di JobApplicantsPage diubah ke
// Psikotest / Interview User / Interview Final (mode "create"), atau saat HR
// mengedit jadwal yang sudah ada dari tab "Jadwal Interview" (mode "edit").
// Saat disimpan: update status kandidat (kalau perlu), lalu simpan/ubah baris
// interview_schedules. Pesan kandidat disiapkan melalui tombol Email/WhatsApp.
// ---------------------------------------------------------------------------

type Props = {
  applicant: JobApplicant;
  stage: string;
  existingSchedule?: InterviewSchedule | null;
  /** Status kandidat di job_applicants sudah = stage, jadi tidak perlu diubah lagi. */
  skipStatusUpdate?: boolean;
  onClose: () => void;
  onSaved: (scheduleId: string) => void;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const PSYCHOTEST_MODES = ['Online dipandu', 'Offline', 'Online mandiri (dikerjakan sendiri)'];
const INTERVIEW_MODES = ['Online', 'Offline'];
const PSYCHOTEST_MODE_DESCRIPTIONS: Record<string, string> = {
  'Online dipandu': 'Tes daring dengan arahan tim Recruitment.',
  Offline: 'Tes dilakukan langsung di lokasi yang ditentukan.',
  'Online mandiri (dikerjakan sendiri)': 'Kandidat mengerjakan tes sendiri melalui tautan.',
};
const TEAMS_MEETING_LINK = 'https://teams.microsoft.com/meet/48947738504620?p=zZeR0MXIJyvSWQWLFW';
const INTERVIEW_STAGES = ['Interview User', 'Interview Final'];

type CalendarSchedule = {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  stage: string;
  location: string | null;
  job_applicants: { full_name: string } | null;
};

function localISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function parseExistingLocation(stage: string, value: string | null | undefined) {
  const stored = (value || '').trim();
  const options = stage === 'Psikotest' ? PSYCHOTEST_MODES : INTERVIEW_MODES;
  for (const option of options) {
    if (stored.toLowerCase() === option.toLowerCase()) return { mode: option, detail: '' };
    const prefix = `${option} —`;
    if (stored.toLowerCase().startsWith(prefix.toLowerCase())) {
      return { mode: option, detail: stored.slice(prefix.length).trim() };
    }
  }

  // Jadwal lama berisi lokasi bebas. Pertahankan nilainya sebagai detail agar
  // saat diedit, informasi alamat/link yang telah disimpan tidak hilang.
  if (stage === 'Psikotest') {
    const oldMode = stored.toLowerCase().startsWith('offline') ? 'Offline' : 'Online dipandu';
    return { mode: oldMode, detail: stored.replace(/^offline(?:\s*[—-]\s*|\s+)?/i, '') };
  }
  const oldMode = stored.toLowerCase().startsWith('offline') ? 'Offline' : 'Online';
  return { mode: oldMode, detail: stored.replace(/^(?:online|offline)(?:\s*[—-]\s*|\s+)?/i, '') };
}

export default function InterviewScheduleModal({
  applicant,
  stage,
  existingSchedule,
  skipStatusUpdate,
  onClose,
  onSaved,
}: Props) {
  const isPsychotest = stage === 'Psikotest';
  const initialLocation = parseExistingLocation(stage, existingSchedule?.location);
  const initialLocationDetail = !isPsychotest && initialLocation.mode === 'Online'
    ? TEAMS_MEETING_LINK
    : initialLocation.detail;
  const [date, setDate] = useState(existingSchedule?.scheduled_date || todayISO());
  const [time, setTime] = useState(existingSchedule?.scheduled_time || '09:00');
  const [locationMode, setLocationMode] = useState(initialLocation.mode);
  const [locationDetail, setLocationDetail] = useState(initialLocationDetail);
  const [interviewer, setInterviewer] = useState(existingSchedule?.interviewer_name || '');
  const [notes, setNotes] = useState(existingSchedule?.notes || '');
  const [selectedPsychotestIds, setSelectedPsychotestIds] = useState<string[]>(existingSchedule?.psychotest_types || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const initialDate = existingSchedule?.scheduled_date || todayISO();
    return new Date(`${initialDate}T12:00:00`);
  });
  const [calendarSchedules, setCalendarSchedules] = useState<CalendarSchedule[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState('');

  useEffect(() => {
    let active = true;
    const monthStart = localISODate(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1));
    const monthEnd = localISODate(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0));

    setCalendarLoading(true);
    setCalendarError('');
    db
      .from('interview_schedules')
      .select('id, scheduled_date, scheduled_time, stage, location, job_applicants(full_name)')
      .gte('scheduled_date', monthStart)
      .lte('scheduled_date', monthEnd)
      .in('stage', INTERVIEW_STAGES)
      .order('scheduled_time', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setCalendarSchedules([]);
          setCalendarError('Jadwal bulan ini tidak dapat dimuat. Periksa koneksi atau izin akses jadwal.');
        } else {
          setCalendarSchedules((data || []) as unknown as CalendarSchedule[]);
        }
        setCalendarLoading(false);
      });

    return () => { active = false; };
  }, [calendarMonth]);

  const submit = async () => {
    if (isPsychotest && selectedPsychotestIds.length === 0) {
      setError('Pilih minimal satu jenis Psikotest yang harus dikerjakan kandidat.');
      return;
    }
    const effectiveLocation = !isPsychotest && locationMode === 'Online'
      ? TEAMS_MEETING_LINK
      : locationDetail.trim();
    if (!date || !time || !effectiveLocation) {
      setError('Tanggal, jam, dan lokasi atau link pelaksanaan wajib diisi.');
      return;
    }
    setError('');
    setSaving(true);

    // Link Teams yang sama dipakai untuk interview secara bergantian. Cegah
    // dua jadwal interview online pada tanggal dan jam yang persis sama.
    if (!isPsychotest && locationMode === 'Online') {
      const { data: sameSlotSchedules, error: checkError } = await db
        .from('interview_schedules')
        .select('id, stage, location')
        .eq('scheduled_date', date)
        .eq('scheduled_time', time)
        .in('stage', ['Interview User', 'Interview Final']);

      if (checkError) {
        setError('Jadwal belum disimpan karena bentrok waktu tidak dapat diperiksa. Periksa koneksi, lalu coba lagi.');
        setSaving(false);
        return;
      }

      const conflict = (sameSlotSchedules || []).some((schedule: { id: string; location: string | null }) =>
        schedule.id !== existingSchedule?.id &&
        typeof schedule.location === 'string' &&
        schedule.location.includes(TEAMS_MEETING_LINK)
      );

      if (conflict) {
        setError('Link Microsoft Teams sudah digunakan untuk interview lain pada tanggal dan jam tersebut. Pilih tanggal atau jam yang berbeda.');
        setSaving(false);
        return;
      }
    }

    const scheduleId = existingSchedule?.id || crypto.randomUUID();
    const locationLabel = `${locationMode} — ${effectiveLocation}`;
    const scheduleFields = {
      applicant_id: applicant.id,
      stage,
      scheduled_date: date,
      scheduled_time: time,
      location: locationLabel,
      interviewer_name: isPsychotest ? null : interviewer.trim() || null,
      notes: notes.trim() || null,
      psychotest_types: isPsychotest ? PSYCHOTESTS.filter((test) => selectedPsychotestIds.includes(test.id)).map((test) => test.id) : [],
      updated_at: new Date().toISOString(),
    };
    let statusWasUpdated = false;

    try {
      // 1) Update status kandidat ke tahap ini (kalau belum).
      if (!skipStatusUpdate) {
        const { error: statusErr } = await db
          .from('job_applicants')
          .update({ status: stage })
          .eq('id', applicant.id);
        if (statusErr) throw new Error(`Gagal menyimpan status kandidat: ${statusErr.message}`);
        statusWasUpdated = true;
      }

      // 2) Simpan jadwal. ID dibuat di browser agar insert tidak memerlukan
      // SELECT/RETURNING, yang dapat ditolak RLS meski INSERT diperbolehkan.
      if (existingSchedule?.id) {
        const { error: updErr } = await db
          .from('interview_schedules')
          .update(scheduleFields)
          .eq('id', scheduleId);
        if (updErr) throw new Error(`Gagal menyimpan jadwal: ${updErr.message}`);
      } else {
        const { error: insErr } = await db
          .from('interview_schedules')
          .insert({ id: scheduleId, ...scheduleFields });
        if (insErr) throw new Error(`Gagal menyimpan jadwal: ${insErr.message}`);
      }
    } catch (caught) {
      const message = (caught as Error).message || 'Terjadi gangguan jaringan atau database.';
      if (statusWasUpdated) {
        await db.from('job_applicants').update({ status: applicant.status }).eq('id', applicant.id);
      }
      if (/interview_schedules|relation.*does not exist|column.*does not exist/i.test(message)) {
        setError(`${message}. Pastikan SQL setup Supabase sudah dijalankan.`);
      } else if (/row-level security|permission denied/i.test(message)) {
        setError(`${message}. Periksa izin penyimpanan jadwal untuk akun tim Recruitment.`);
      } else {
        setError(message);
      }
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved(scheduleId);
  };

  const firstWeekday = (new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() + 6) % 7;
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const calendarCells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => {
    const day = index - firstWeekday + 1;
    if (day < 1 || day > daysInMonth) return null;
    const dateKey = localISODate(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
    return {
      day,
      dateKey,
      schedules: calendarSchedules.filter((schedule) => schedule.scheduled_date === dateKey),
    };
  });
  const selectedDateSchedules = calendarSchedules.filter((schedule) => schedule.scheduled_date === date);
  const selectedTeamsSlotBooked = !isPsychotest && locationMode === 'Online' && calendarSchedules.some((schedule) =>
    schedule.scheduled_date === date &&
    schedule.scheduled_time.slice(0, 5) === time &&
    schedule.id !== existingSchedule?.id &&
    typeof schedule.location === 'string' &&
    schedule.location.includes(TEAMS_MEETING_LINK)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-indigo-50 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm ring-1 ring-sky-100">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isPsychotest ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'}`}>{stage}</span>
              <h3 className="mt-1 font-display text-lg font-bold text-slate-900">{existingSchedule ? 'Perbarui jadwal' : 'Buat jadwal baru'}</h3>
              <p className="text-xs text-slate-500">{applicant.full_name} · {applicant.position}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/80 p-4">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-sky-700 shadow-sm"><Info size={16} /></span>
            <div>
              <p className="text-sm font-semibold text-slate-800">{isPsychotest ? 'Atur pelaksanaan Psikotest' : 'Atur sesi Interview'}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {isPsychotest
                  ? 'Tentukan tanggal, jam, metode, dan petunjuk akses. Pesan berisi jadwal akan tersedia melalui tombol Email dan WhatsApp.'
                  : 'Pilih tanggal dan slot yang tersedia. Tautan Microsoft Teams akan disertakan pada pesan yang disiapkan untuk kandidat.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isPsychotest ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'}`}>1</span>
            <div>
              <p className="text-sm font-semibold text-slate-800">Tentukan tanggal dan jam</p>
              <p className="text-xs text-slate-500">{isPsychotest ? 'Pilih waktu pelaksanaan tes.' : 'Pilih tanggal kosong, lalu atur jam interview.'}</p>
            </div>
          </div>

          {!isPsychotest && (
            <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-sky-600" />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Kalender ketersediaan interview</h4>
                    <p className="text-[11px] text-slate-500">Klik tanggal untuk melihat sesi yang sudah dijadwalkan.</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} aria-label="Bulan sebelumnya" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                    <ChevronLeft size={18} />
                  </button>
                  <span className="min-w-32 text-center text-sm font-semibold capitalize text-slate-800">{monthLabel(calendarMonth)}</span>
                  <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} aria-label="Bulan berikutnya" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((weekday) => (
                  <div key={weekday} className="py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{weekday}</div>
                ))}
                {calendarCells.map((cell, index) => cell ? (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => { setDate(cell.dateKey); setError(''); }}
                    aria-label={`${cell.day} ${monthLabel(calendarMonth)}, ${cell.schedules.length ? `${cell.schedules.length} jadwal terisi` : 'kosong'}`}
                    aria-pressed={date === cell.dateKey}
                    className={`min-h-[54px] rounded-xl border px-1 py-1 text-center transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${date === cell.dateKey ? 'border-sky-500 bg-sky-600 text-white shadow-sm' : cell.schedules.length ? 'border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-400' : calendarError ? 'border-slate-200 bg-slate-100 text-slate-500' : 'border-emerald-100 bg-emerald-50/70 text-slate-700 hover:border-emerald-400'}`}
                  >
                    <span className="block text-xs font-semibold">{cell.day}</span>
                    <span className={`mt-1 block truncate text-[9px] ${date === cell.dateKey ? 'text-sky-100' : cell.schedules.length ? 'text-amber-700' : calendarError ? 'text-slate-500' : 'text-emerald-700'}`}>
                      {calendarLoading ? '…' : calendarError ? 'Cek data' : cell.schedules.length ? `${cell.schedules.length} terisi` : 'Kosong'}
                    </span>
                  </button>
                ) : <span key={`blank-${index}`} className="min-h-[54px]" />)}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-200" /> Belum ada jadwal</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-300" /> Ada jadwal</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sky-600" /> Tanggal dipilih</span>
              </div>

              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-800">Jadwal pada {new Date(`${date}T12:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${selectedDateSchedules.length ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {calendarLoading ? 'Memuat…' : calendarError ? 'Data tidak tersedia' : selectedDateSchedules.length ? `${selectedDateSchedules.length} jadwal` : 'Tanggal kosong'}
                  </span>
                </div>
                {calendarError ? (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">Jadwal bulan ini belum dapat diperiksa. Ketersediaan belum terverifikasi; coba lagi setelah koneksi pulih.</p>
                ) : selectedDateSchedules.length ? (
                  <div className="mt-2 space-y-1.5">
                    {selectedDateSchedules.map((schedule) => (
                      <div key={schedule.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs ${schedule.id === existingSchedule?.id ? 'border-sky-200 bg-sky-50' : 'border-amber-100 bg-white'}`}>
                        <span className="font-semibold text-slate-700">{schedule.scheduled_time.slice(0, 5)} · {schedule.stage}</span>
                        <span className="text-right text-slate-500">{schedule.job_applicants?.full_name || 'Kandidat'}{schedule.location ? ` · ${schedule.location.split(' — ')[0]}` : ''}</span>
                      </div>
                    ))}
                  </div>
                ) : !calendarLoading ? (
                  <p className="mt-1.5 text-xs text-emerald-700">Belum ada interview terjadwal pada tanggal ini.</p>
                ) : null}
              </div>
            </section>
          )}

          {isPsychotest && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Tanggal <span className="ml-1 text-[10px] font-semibold text-slate-400">Wajib</span></label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100" />
            </div>
          )}
          <div className={`grid gap-3 ${isPsychotest ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Jam <span className="ml-1 text-[10px] font-semibold text-slate-400">Wajib</span>
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => { setTime(e.target.value); setError(''); }}
                className={`w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-4 ${selectedTeamsSlotBooked ? 'border-amber-300 bg-amber-50/60 focus:ring-amber-100' : 'border-slate-200 bg-white focus:border-sky-400 focus:ring-sky-100'}`}
              />
              {!isPsychotest && locationMode === 'Online' && (
                <p className={`mt-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${selectedTeamsSlotBooked ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                  {selectedTeamsSlotBooked ? 'Waktu ini sudah digunakan. Pilih jam lain agar jadwal tidak bertabrakan.' : 'Waktu ini tersedia untuk interview online.'}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isPsychotest ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'}`}>2</span>
            <div>
              <p className="text-sm font-semibold text-slate-800">Pilih metode pelaksanaan</p>
              <p className="text-xs text-slate-500">Pilihan ini akan dicantumkan pada informasi jadwal kandidat.</p>
            </div>
          </div>

          {isPsychotest ? (
            <>
              <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="mb-3">
                  <p className="text-sm font-semibold text-slate-800">Pilih Psikotest untuk kandidat <span className="text-red-500">*</span></p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Pilih hanya tes yang diperlukan untuk posisi ini. Kandidat akan melihat pilihan ini di halaman Psikotest dan notifikasinya.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PSYCHOTESTS.map((test) => {
                    const checked = selectedPsychotestIds.includes(test.id);
                    return (
                      <label key={test.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${checked ? 'border-amber-400 bg-white ring-1 ring-amber-200' : 'border-amber-100 bg-white/70 hover:border-amber-300'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedPsychotestIds((current) => checked ? current.filter((id) => id !== test.id) : [...current, test.id]);
                            setError('');
                          }}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-amber-600"
                        />
                        <span>
                          <span className="block text-xs font-bold text-slate-800">{test.name}</span>
                          <span className="mt-1 block text-[11px] leading-4 text-slate-500">{test.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-3 text-[11px] font-semibold text-amber-900">{selectedPsychotestIds.length} tes dipilih</p>
              </section>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Metode Psikotest <span className="ml-1 text-[10px] font-semibold text-slate-400">Wajib</span></p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {PSYCHOTEST_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={locationMode === mode}
                      onClick={() => { setLocationMode(mode); setError(''); }}
                      className={`rounded-xl border p-3 text-left transition ${locationMode === mode ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-100' : 'border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/40'}`}
                    >
                      <span className={`block text-xs font-bold ${locationMode === mode ? 'text-amber-900' : 'text-slate-700'}`}>{mode}</span>
                      <span className="mt-1.5 block text-[11px] leading-4 text-slate-500">{PSYCHOTEST_MODE_DESCRIPTIONS[mode]}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Input
                label={locationMode === 'Offline' ? 'Lokasi Psikotest' : 'Link / Lokasi / Petunjuk Akses'}
                value={locationDetail}
                onChange={setLocationDetail}
                placeholder={locationMode === 'Offline' ? 'Alamat atau ruang pelaksanaan' : 'Link tes, platform, atau petunjuk pengerjaan'}
                required
              />
            </>
          ) : (
            <>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Metode Interview <span className="ml-1 text-[10px] font-semibold text-slate-400">Wajib</span></p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {INTERVIEW_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={locationMode === mode}
                      onClick={() => { setLocationMode(mode); setLocationDetail(mode === 'Online' ? TEAMS_MEETING_LINK : ''); setError(''); }}
                      className={`rounded-xl border p-3 text-left transition ${locationMode === mode ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-100' : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/40'}`}
                    >
                      <span className={`block text-sm font-bold ${locationMode === mode ? 'text-sky-900' : 'text-slate-700'}`}>{mode === 'Online' ? 'Online · Microsoft Teams' : 'Offline · Tatap muka'}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{mode === 'Online' ? 'Gunakan tautan Teams bersama dan pilih slot yang masih kosong.' : 'Isi alamat atau ruang tempat interview berlangsung.'}</span>
                    </button>
                  ))}
                </div>
              </div>
              {locationMode === 'Online' ? (
                <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
                  <p className="mb-3 text-xs font-medium text-slate-600">Link meeting tetap untuk interview online:</p>
                  <a
                    href={TEAMS_MEETING_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                  >
                    <Video className="h-4 w-4" /> Buka Microsoft Teams
                  </a>
                  <p className="mt-2 break-all text-[11px] text-sky-800">Tautan ini otomatis disimpan dan disertakan pada pesan jadwal kandidat.</p>
                  <p className="mt-2 rounded-lg bg-white/80 px-2.5 py-2 text-[11px] leading-4 text-slate-600">Satu slot waktu hanya untuk satu interview. Anda tetap dapat memakai Teams pada tanggal atau jam yang berbeda.</p>
                </div>
              ) : (
                <Input
                  label="Lokasi Interview"
                  value={locationDetail}
                  onChange={setLocationDetail}
                  placeholder="Alamat atau ruang interview"
                  required
                />
              )}
              <Input label="Pewawancara" value={interviewer} onChange={setInterviewer} placeholder="Nama pewawancara" />
            </>
          )}
          <TextArea label="Catatan Tambahan" value={notes} onChange={setNotes} placeholder="Info tambahan untuk kandidat (opsional)" />

          {error && (
            <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
              <Info size={16} className="mt-0.5 shrink-0 text-amber-700" />
              <div><p className="font-semibold">Periksa jadwal</p><p className="mt-0.5 text-xs leading-5 text-amber-800">{error}</p></div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Batal
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
