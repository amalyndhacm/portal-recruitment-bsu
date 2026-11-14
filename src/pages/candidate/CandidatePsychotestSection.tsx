import { CalendarClock, CheckCircle2, ExternalLink, Info, Target } from 'lucide-react';
import { Card } from '@/components/ui';
import type { InterviewSchedule, JobApplicant } from '@/lib/database';
import { PSYCHOTESTS } from '../../lib/psychotests';

export default function CandidatePsychotestSection({ latest, schedules }: { latest?: JobApplicant; schedules: InterviewSchedule[] }) {
  const psychotestSchedules = schedules
    .filter((schedule) => schedule.stage === 'Psikotest')
    .sort((a, b) => `${a.scheduled_date} ${a.scheduled_time}`.localeCompare(`${b.scheduled_date} ${b.scheduled_time}`));
  const assignedTestCount = new Set(psychotestSchedules.flatMap((schedule) => schedule.psychotest_types || [])).size;
  const isActive = latest?.status?.toLowerCase().includes('psiko');

  return (
    <div className="space-y-6">
      <Card className="border-amber-100 bg-amber-50/50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><Target size={23} /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Psikotest Kandidat</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-slate-900">{isActive ? 'Tahap Psikotest Anda sedang berjalan' : latest ? `Tahap lamaran saat ini: ${latest.status}` : 'Belum ada lamaran aktif'}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Daftar tes di bawah ditentukan oleh tim Recruitment untuk lamaran Anda. Kerjakan hanya tes yang ditugaskan.</p>
            {assignedTestCount > 0 && <p className="mt-2 text-xs font-semibold text-amber-800">{assignedTestCount} jenis tes telah ditugaskan oleh HR.</p>}
          </div>
        </div>
      </Card>

      {psychotestSchedules.length === 0 ? (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <Info size={19} className="mt-0.5 shrink-0 text-slate-400" />
            <div>
              <h3 className="font-semibold text-slate-800">Belum ada Psikotest yang ditugaskan</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">Jika Anda lolos ke tahap Psikotest, jadwal dan jenis tes yang dipilih HR akan muncul di halaman ini. Anda juga akan menerima notifikasi di akun.</p>
            </div>
          </div>
        </Card>
      ) : (
        psychotestSchedules.map((schedule) => {
          const assignedIds = schedule.psychotest_types || [];
          const assignedTests = assignedIds.map((id) => PSYCHOTESTS.find((test) => test.id === id) || {
            id, name: id, description: 'Tes ditugaskan oleh tim Recruitment.', url: '',
          });
          return (
            <Card key={schedule.id} className="overflow-hidden p-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2"><CalendarClock size={18} className="text-amber-600" /><h3 className="font-semibold text-slate-900">Jadwal Psikotest</h3></div>
                <span className="text-sm font-semibold text-slate-700">{formatDate(schedule.scheduled_date)} · {schedule.scheduled_time || 'Waktu diinformasikan'}</span>
              </div>
              <div className="p-5 sm:p-6">
                {schedule.location && <p className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600"><span className="font-semibold text-slate-700">Metode / petunjuk: </span>{schedule.location}</p>}
                <h4 className="mb-3 text-sm font-bold text-slate-800">Tes yang harus Anda kerjakan</h4>
                {assignedTests.length === 0 ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Jadwal sudah dibuat, tetapi HR belum mencantumkan jenis tes. Silakan cek kembali nanti atau hubungi tim Recruitment.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {assignedTests.map((test) => (
                      <div key={test.id} className="flex h-full flex-col rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-600" />
                          <div><h5 className="font-semibold text-slate-900">{test.name}</h5><p className="mt-1 text-sm leading-5 text-slate-500">{test.description}</p></div>
                        </div>
                        {test.url ? (
                          <a href={test.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600">Buka tes <ExternalLink size={15} /></a>
                        ) : (
                          <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-600">Tautan untuk tes ini belum tersedia. Hubungi tim Recruitment untuk petunjuk pengerjaan.</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {schedule.notes && <p className="mt-4 text-sm leading-6 text-slate-600"><span className="font-semibold text-slate-700">Catatan HR: </span>{schedule.notes}</p>}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return 'Tanggal diinformasikan';
  return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
