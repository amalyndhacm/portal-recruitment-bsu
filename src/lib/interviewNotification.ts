import { db, type InterviewSchedule, type JobApplicant, type NotifyStatus } from '@/lib/database';

// ---------------------------------------------------------------------------
// Memanggil Edge Function `send-interview-notification` (WA lewat Fonnte,
// Email lewat Resend) lalu menyimpan status pengiriman ke kolom
// notify_email_status / notify_wa_status / notify_error / notified_at di
// baris interview_schedules terkait. Dipakai oleh InterviewScheduleModal
// (saat jadwal baru dibuat/diedit) dan InterviewSchedulePage (tombol
// "Kirim Ulang Notifikasi").
// ---------------------------------------------------------------------------

export type NotifyResult = {
  email: { status: NotifyStatus; error?: string };
  whatsapp: { status: NotifyStatus; error?: string };
};

export async function sendInterviewNotification(
  applicant: Pick<JobApplicant, 'full_name' | 'email' | 'phone' | 'position' | 'tracking_code'>,
  schedule: Pick<InterviewSchedule, 'stage' | 'scheduled_date' | 'scheduled_time' | 'location' | 'interviewer_name' | 'notes'>
): Promise<NotifyResult> {
  const { data, error } = await db.functions.invoke('send-interview-notification', {
    body: { applicant, schedule },
  });

  if (error) {
    const message = error.message || 'Gagal memanggil fungsi notifikasi';
    return {
      email: { status: 'failed', error: message },
      whatsapp: { status: 'failed', error: message },
    };
  }

  return data as NotifyResult;
}

// Kirim notifikasi untuk satu baris jadwal yang sudah tersimpan, lalu
// tuliskan hasilnya (status + error + notified_at) kembali ke baris itu.
export async function notifyAndRecordSchedule(
  scheduleId: string,
  applicant: Pick<JobApplicant, 'full_name' | 'email' | 'phone' | 'position' | 'tracking_code'>,
  schedule: Pick<InterviewSchedule, 'stage' | 'scheduled_date' | 'scheduled_time' | 'location' | 'interviewer_name' | 'notes'>
): Promise<NotifyResult> {
  const result = await sendInterviewNotification(applicant, schedule);

  await db
    .from('interview_schedules')
    .update({
      notify_email_status: result.email.status,
      notify_wa_status: result.whatsapp.status,
      notify_error: [result.email.error, result.whatsapp.error].filter(Boolean).join(' | ') || null,
      notified_at: new Date().toISOString(),
    })
    .eq('id', scheduleId);

  return result;
}