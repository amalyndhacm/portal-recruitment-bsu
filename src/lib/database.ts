import { db } from '@/lib/supabaseClient';

export { db };

export type WeeklyReport = {
  id: string;
  division: string;
  report_date: string;
  period_end_date: string | null;
  title: string;
  description: string | null;
  content: WeeklyReportContent | null;
  created_at: string;
};

export type RecruitmentActivity = {
  id: string;
  employee_stage: string;
  activity: string;
  position_level: string | null;
  position: string | null;
  media: string | null;
  area: string | null;
  notes: string | null;
  quantity: number;
  created_at: string;
};

export type TrainingActivity = {
  id: string;
  employee_stage: string;
  activity: string;
  position_level: string | null;
  position: string | null;
  media: string | null;
  area: string | null;
  notes: string | null;
  quantity: number;
  created_at: string;
};

export type RecruitmentRecap = {
  id: string;
  position: string;
  interview_psikotest: number;
  interview_final: number;
  total: number;
  created_at: string;
};

export type TrainingRecap = {
  id: string;
  position: string;
  induction: number;
  training_onboarding: number;
  training_external: number;
  total: number;
  created_at: string;
};

export type TalentPoolRecap = {
  id: string;
  position: string;
  profiling_psikotest: number;
  total: number;
  created_at: string;
};

export type EmployeeActivity = {
  id: string;
  activity_type: string;
  title: string;
  content: string | null;
  activity_date: string | null;
  created_at: string;
};

export type EmployeeAdmin = {
  id: string;
  employee_name: string;
  region: string | null;
  status: string;
  join_date: string | null;
  resign_date: string | null;
  notes: string | null;
  created_at: string;
};

export type ResignReason = {
  id: string;
  employee_name: string;
  reason: string;
  resign_date: string | null;
  region: string | null;
  notes: string | null;
  created_at: string;
};

export type EmployeeDiscipline = {
  id: string;
  employee_name: string;
  case_type: string;
  case_date: string | null;
  description: string | null;
  action_taken: string | null;
  status: string;
  created_at: string;
};

export type TravelAdmin = {
  id: string;
  activity_type: string;
  detail: string;
  person_name: string | null;
  hotel_name: string | null;
  ticket_info: string | null;
  request_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

export type IncentivePayment = {
  id: string;
  employee_name: string;
  position: string | null;
  wave: string;
  amount: number;
  payment_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

export type DocumentationUpload = {
  id: string;
  title: string;
  division: string | null;
  doc_type: string | null;
  description: string | null;
  file_url: string | null;
  uploaded_at: string;
};

export type Employee = {
  id: string;
  employee_id: string;
  name: string;
  date_of_birth: string | null;
  employee_status: string | null;
  start_date: string | null;
  grade: string | null;
  description: string | null;
  cost_center_description: string | null;
  id_card_number: string | null;
  id_address: string | null;
  mobile_phone: string | null;
  bank_account_number: string | null;
  branch_group: string;
  created_at: string;
};

export type WorkforceDemographic = {
  id: string;
  region: string;
  region_label: string;
  report_month: string;
  row_order: number;
  no: number | null;
  level: string;
  grade: string;
  position: string;
  is_total_row: boolean;
  is_grand_total: boolean;
  number_of_emp: number;
  total_male: number;
  total_female: number;
  age_18_35_male: number; age_18_35_female: number;
  age_35_50_male: number; age_35_50_female: number;
  age_50_65_male: number; age_50_65_female: number;
  age_65_up_male: number; age_65_up_female: number;
  yos_0_10_male: number; yos_0_10_female: number;
  yos_10_20_male: number; yos_10_20_female: number;
  yos_20_30_male: number; yos_20_30_female: number;
  yos_30_up_male: number; yos_30_up_female: number;
  edu_smp_male: number; edu_smp_female: number;
  edu_sma_smk_male: number; edu_sma_smk_female: number;
  edu_diploma_s1_male: number; edu_diploma_s1_female: number;
  edu_s2_up_male: number; edu_s2_up_female: number;
  rel_islam_male: number; rel_islam_female: number;
  rel_kristen_male: number; rel_kristen_female: number;
  rel_hindu_budha_male: number; rel_hindu_budha_female: number;
  rel_konghucu_male: number; rel_konghucu_female: number;
  marital_married: number;
  marital_single: number;
  marital_unmarried: number;
  created_at: string;
};

export type PersonnelAction = {
  id: string;
  employee_name: string;
  position: string | null;
  grade: string | null;
  area: string | null;
  action_type: string;
  effective_date: string | null;
  description: string | null;
  resign_reason: string | null;
  period_month: string | null;
  created_at: string;
};
export type EmployeeRequest = {
  id: string;
  request_number: string | null;
  request_type: string;
  replacement_for: string | null;
  request_date: string;
  needed_date: string | null;
  div_job_site: string;
  position_needed: string;
  quantity: number;
  education_level: string | null;
  major: string | null;
  gender: string | null;
  marital_status: string | null;
  age_requirement: string | null;
  personal_characteristics: string | null;
  work_experience: string | null;
  special_skill: string | null;
  employment_status: string | null;
  responsible_to: string | null;
  main_duties: string | null;
  additional_skills: string | null;
  reason: string | null;
  submitted_by_name: string | null;
  submitted_by_role: string | null;
  approver_name: string | null;
  approver_role: string | null;
  approval_status: string;
  approval_note: string | null;
  approved_at: string | null;
  acknowledger_name: string | null;
  acknowledger_role: string | null;
  acknowledgement_status: string;
  acknowledged_at: string | null;
	  overall_status: string;
	  linked_job_opening_id: string | null;
	  publication_status: string;
	  published_at: string | null;
	  published_by_name: string | null;
	  attachment_url: string | null;
	  attachment_name: string | null;
	  attachment_size: number | null;
	  attachment_type: string | null;
	  trashed_at: string | null;
	  created_at: string;
};

export type MpComparisonSummary = {
  id: string;
  period_month: string;
  area: string;
  total_mp: number;
  created_at: string;
};

export type ChatbotMessage = {
  id: string;
  session_id: string;
  sender: 'visitor' | 'bot';
  message: string;
  created_at: string;
};

export type JobApplicant = {
  id: string;
  job_opening_id: string | null;
  tracking_code: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  domicile: string | null;
  education: string | null;
  cv_link: string | null;
  document_checklist?: Partial<Record<
    'cv_surat_lamaran' | 'ktp' | 'kk' | 'ijazah' | 'sim_gada_pratama' | 'skck' | 'surat_keterangan_sehat' | 'rekening_bni',
    'ada' | 'belum_ada'
  >> | null;
  cover_note: string | null;
  status: string;
  internal_notes: string | null;
  // Data lamaran lengkap (mengikuti form pendaftaran yang dipakai untuk
  // semua lowongan) — semua boleh kosong supaya baris lama tetap valid.
  previously_worked: string | null;
  referral_source: string | null;
  placement_area: string | null;
  birth_place_date: string | null;
  age: number | null;
  gender: string | null;
  ktp_address: string | null;
  religion: string | null;
  marital_status: string | null;
  major: string | null;
  school_name: string | null;
  work_experience_1: string | null;
  work_experience_2: string | null;
  work_experience_3: string | null;
  application_opened_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotifyStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export type InterviewSchedule = {
  id: string;
  applicant_id: string;
  stage: string;
  scheduled_date: string;
  scheduled_time: string;
  location: string | null;
  interviewer_name: string | null;
  notes: string | null;
  psychotest_types?: string[] | null;
  notify_email_status: NotifyStatus;
  notify_wa_status: NotifyStatus;
  notify_error: string | null;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
};

// Baris interview_schedules yang di-join dengan data kandidatnya (dipakai di
// tab "Jadwal Interview" supaya tidak perlu fetch job_applicants terpisah).
export type InterviewScheduleWithApplicant = InterviewSchedule & {
  job_applicants: Pick<JobApplicant, 'full_name' | 'email' | 'phone' | 'position' | 'tracking_code' | 'status'> | null;
};

// Satu section tabel gaya PDF, misalnya tabel "Recruitment & Training
// Karyawan" atau "Rekap Kegiatan Rekrutmen" dengan kolom & baris bebas.
export type ReportTableSection = {
  kind: 'table';
  id: string;
  title: string;
  columns: string[];
  rows: string[][];
  totalLabel?: string;
  totalValue?: string;
};

// Section daftar berpoin, misalnya "Kegiatan Karyawan" atau
// "Alasan Karyawan Resign".
export type ReportListSection = {
  kind: 'list';
  id: string;
  title: string;
  items: string[];
};

// Section ringkasan/total yang biasanya di-highlight kuning di PDF,
// misalnya "Total pembayaran Gaji periode bulan Agustus 2026".
export type ReportHighlightSection = {
  kind: 'highlight';
  id: string;
  label: string;
  value: string;
};

export type ReportSection = ReportTableSection | ReportListSection | ReportHighlightSection;

export type WeeklyReportContent = {
  periodLabel: string;
  sections: ReportSection[];
  preparedByName?: string;
  preparedByRole?: string;
  approvedByName?: string;
  approvedByRole?: string;
};

export type SalaryRecap = {
  id: string;
  period_month: string;
  regional: string;
  location: string;
  d3: number; d2: number; d1: number;
  m3: number; m2: number; m1: number;
  p3: number; p2: number; p1: number;
  total_gaji: number;
  created_at: string;
};
