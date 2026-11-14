import { db, type JobApplicant } from '@/lib/database';

// ---------------------------------------------------------------------------
// Konstanta, tipe, dan helper untuk menu Recruitment tambahan:
// Pipeline Kandidat, Tes & Penilaian, Offering & Pre-Employment,
// Onboarding & Probation, Sumber & Media, Template Komunikasi, Analitik.
// Tabelnya dibuat oleh db/migrations/20260928000000_recruitment_modules.sql
// ---------------------------------------------------------------------------

// ----- Kandidat ringan (untuk dropdown & tabel gabungan) -------------------

export type ApplicantLite = Pick<
  JobApplicant,
  'id' | 'full_name' | 'email' | 'phone' | 'position' | 'tracking_code' | 'status' | 'created_at' | 'updated_at' | 'referral_source' | 'placement_area' | 'education'
>;

const APPLICANT_LITE_COLUMNS =
  'id, full_name, email, phone, position, tracking_code, status, created_at, updated_at, referral_source, placement_area, education';

export async function fetchApplicantsLite(): Promise<ApplicantLite[]> {
  const { data } = await db
    .from('job_applicants')
    .select(APPLICANT_LITE_COLUMNS)
    .order('created_at', { ascending: false });
  return (data || []) as ApplicantLite[];
}

export function applicantLabel(a: Pick<ApplicantLite, 'full_name' | 'position' | 'tracking_code'>) {
  return `${a.full_name} — ${a.position} (${a.tracking_code})`;
}

// ----- Tes & Penilaian -----------------------------------------------------

export const ASSESSMENT_TYPES = ['Psikotes', 'Tes Teknis', 'Interview User', 'Interview Final', 'Lainnya'] as const;
export const ASSESSMENT_RESULTS = ['Menunggu', 'Lulus', 'Dipertimbangkan', 'Tidak Lulus'] as const;
export const ASSESSMENT_RESULT_COLORS: Record<string, string> = {
  Menunggu: 'slate',
  Lulus: 'green',
  Dipertimbangkan: 'yellow',
  'Tidak Lulus': 'red',
};

export type CandidateAssessment = {
  id: string;
  applicant_id: string;
  assessment_type: string;
  assessed_date: string | null;
  score: number | null;
  result: string;
  assessor: string | null;
  notes: string | null;
  created_at: string;
  job_applicants: Pick<JobApplicant, 'full_name' | 'position' | 'tracking_code' | 'status'> | null;
};

// ----- Offering & Pre-Employment ------------------------------------------

export const OFFER_STATUSES = ['Draft', 'Terkirim', 'Negosiasi', 'Diterima', 'Ditolak'] as const;
export const OFFER_DOCUMENT_TYPES = [
  'PKWT Jawa Timur',
  'PKWT Luar Jawa Timur',
  'PKWTT Jawa Timur',
  'PKWTT Luar Jawa Timur',
  'Surat Pernyataan Kontrak',
  'Surat Pernyataan Probation',
] as const;
export const OFFER_APPROVAL_STATUSES = ['Belum Diajukan', 'Menunggu Persetujuan', 'Disetujui', 'Ditolak'] as const;
export const OFFER_STATUS_COLORS: Record<string, string> = {
  Draft: 'slate',
  Terkirim: 'sky',
  Negosiasi: 'yellow',
  Diterima: 'green',
  Ditolak: 'red',
};
export const EMPLOYMENT_TYPES = ['Kontrak', 'Tetap'] as const;
export const MCU_STATUSES = ['Belum', 'Terjadwal', 'Lulus', 'Tidak Lulus'] as const;
export const MCU_STATUS_COLORS: Record<string, string> = {
  Belum: 'slate',
  Terjadwal: 'sky',
  Lulus: 'green',
  'Tidak Lulus': 'red',
};
export const PRE_EMPLOYMENT_DOCUMENTS = [
  'KTP',
  'Kartu Keluarga',
  'Ijazah & Transkrip',
  'SKCK',
  'NPWP',
  'Pas Foto',
  'Rekening Bank',
  'BPJS (jika ada)',
] as const;

export type CandidateOffering = {
  id: string;
  applicant_id: string;
  offered_position: string | null;
  employment_status: string;
  offer_status: string;
  offer_date: string | null;
  response_deadline: string | null;
  expected_start_date: string | null;
  documents: string[];
  mcu_status: string;
  mcu_date: string | null;
  notes: string | null;
  document_type: string;
  document_data: Record<string, string>;
  document_statuses: string[];
  selected_documents: string[];
  document_forms: Record<string, Record<string, string>>;
  approval_status: string;
  approval_notes: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  job_applicants: Pick<JobApplicant, 'full_name' | 'position' | 'tracking_code' | 'status' | 'phone' | 'birth_place_date' | 'gender' | 'ktp_address' | 'domicile' | 'placement_area'> | null;
};

// ----- Onboarding & Probation ---------------------------------------------

export const ONBOARDING_CHECKLIST = [
  'Penandatanganan kontrak kerja',
  'Pembuatan ID karyawan',
  'Pembagian seragam & APD',
  'Induction perusahaan',
  'Pengenalan tim & atasan',
  'Pendaftaran BPJS',
  'Setup rekening gaji',
  'Serah terima peralatan kerja',
] as const;
export const PROBATION_STATUSES = ['Belum Mulai', 'Berjalan', 'Lulus', 'Diperpanjang', 'Tidak Lulus'] as const;
export const PROBATION_STATUS_COLORS: Record<string, string> = {
  'Belum Mulai': 'slate',
  Berjalan: 'sky',
  Lulus: 'green',
  Diperpanjang: 'yellow',
  'Tidak Lulus': 'red',
};

export type CandidateOnboarding = {
  id: string;
  applicant_id: string;
  start_date: string | null;
  checklist: string[];
  probation_start: string | null;
  probation_end: string | null;
  probation_status: string;
  evaluation_notes: string | null;
  created_at: string;
  updated_at: string;
  job_applicants: Pick<JobApplicant, 'full_name' | 'position' | 'tracking_code' | 'status' | 'placement_area'> | null;
};

// ----- Sumber & Media ------------------------------------------------------

export const SOURCE_MEDIA = [
  'Job Portal',
  'Media Sosial',
  'Instagram / TikTok Ads',
  'Kampus / Job Fair',
  'Referral Karyawan',
  'Website Perusahaan',
  'Koran / Brosur',
  'Lainnya',
] as const;

export type RecruitmentSource = {
  id: string;
  position: string;
  media: string;
  posted_date: string | null;
  close_date: string | null;
  cost: number;
  url: string | null;
  notes: string | null;
  created_at: string;
};

// ----- Template Komunikasi -------------------------------------------------

export const MESSAGE_CHANNELS = ['WhatsApp', 'Email'] as const;
export const MESSAGE_CATEGORIES = ['Undangan Interview', 'Undangan Psikotes', 'Penolakan', 'Offering', 'Onboarding', 'Umum'] as const;
export const TEMPLATE_VARIABLES = [
  { key: 'nama', label: 'Nama kandidat', sample: 'Budi Santoso' },
  { key: 'posisi', label: 'Posisi dilamar', sample: 'Staff Administrasi' },
  { key: 'tahap', label: 'Tahap seleksi', sample: 'Interview User' },
  { key: 'tanggal', label: 'Tanggal', sample: 'Senin, 5 Oktober 2026' },
  { key: 'jam', label: 'Jam', sample: '09:00 WIB' },
  { key: 'lokasi', label: 'Lokasi', sample: 'Kantor Pusat PT BSU, Malang' },
  { key: 'batas_jawab', label: 'Batas jawaban offering', sample: '10 Oktober 2026' },
] as const;

export type MessageTemplate = {
  id: string;
  name: string;
  channel: string;
  category: string;
  subject: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

export function fillTemplate(text: string, values: Record<string, string>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => values[key] ?? match);
}

// ----- Riwayat status ------------------------------------------------------

export type StatusHistoryRow = {
  id: string;
  applicant_id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
};

// ----- Util tanggal & angka -------------------------------------------------

export function formatDateShort(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addMonthsISO(dateISO: string, months: number) {
  const d = new Date(dateISO);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Selisih hari (bulat) dari `from` sampai `to`; negatif kalau `to` lebih awal. */
export function daysBetween(from: string | Date, to: string | Date = new Date()) {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.floor((b - a) / 86_400_000);
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);
}
