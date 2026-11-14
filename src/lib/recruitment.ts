export const APPLICANT_STATUSES = [
  'Lamaran Masuk', 'Screening', 'Psikotest', 'Interview User', 'Interview Final', 'Offering', 'Onboarding', 'Tidak Lolos',
] as const;

export type ApplicantStatus = (typeof APPLICANT_STATUSES)[number];

export const APPLICANT_STATUS_COLORS: Record<string, string> = {
  'Lamaran Masuk': 'slate', Screening: 'blue', Psikotest: 'yellow',
  'Interview User': 'sky', 'Interview Final': 'blue', Offering: 'violet', Onboarding: 'green', 'Tidak Lolos': 'red',
};

export const APPLICANT_TIMELINE_STAGES = [
  'Lamaran Masuk', 'Screening', 'Psikotest', 'Interview User', 'Interview Final', 'Offering', 'Onboarding',
] as const;

// Tahap-tahap yang otomatis memunculkan form Jadwal Interview & mengirim
// notifikasi WA/Email begitu status kandidat diubah ke salah satunya.
export const INTERVIEW_TRIGGER_STAGES = ['Psikotest', 'Interview User', 'Interview Final'] as const;

export type InterviewTriggerStage = (typeof INTERVIEW_TRIGGER_STAGES)[number];

export function isInterviewTriggerStage(status: string): status is InterviewTriggerStage {
  return (INTERVIEW_TRIGGER_STAGES as readonly string[]).includes(status);
}

export const NOTIFY_STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  sent: 'Terkirim',
  failed: 'Gagal',
  skipped: 'Dilewati',
};

export const NOTIFY_STATUS_COLORS: Record<string, string> = {
  pending: 'yellow',
  sent: 'green',
  failed: 'red',
  skipped: 'slate',
};

export const EDUCATION_LEVELS = ['SMA/SMK', 'Diploma', 'S1', 'S2', 'Lainnya'];

// Opsi tambahan untuk formulir pendaftaran lengkap (dipakai sama untuk
// semua lowongan — hanya posisi & kualifikasi yang berbeda per listing).
export const PREVIOUSLY_WORKED_OPTIONS = ['Belum Pernah', 'Sudah Pernah'];

export const REFERRAL_SOURCES = ['Media Sosial', 'Teman', 'Saudara', 'Orang yang bekerja di PT Bintang Sayap Utama'];

export const GENDERS = ['Laki-laki', 'Perempuan'];

export const MARITAL_STATUSES = ['Belum Kawin', 'Kawin'];

export const RELIGIONS = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Khonghucu', 'Lainnya'];
