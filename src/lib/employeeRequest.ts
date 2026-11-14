import type { EmployeeRequest } from '@/lib/database';

// ---------------------------------------------------------------------------
// Konstanta form -- mengikuti field yang ada di formulir fisik "Surat
// Pengajuan Penambahan Karyawan Baru" (lihat contoh sheet OB / security).
// ---------------------------------------------------------------------------

export const REQUEST_TYPES = ['Penambahan Karyawan Baru', 'Replacement'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const EMPLOYMENT_STATUSES = ['Tetap', 'Kontrak'] as const;

export const EDUCATION_LEVEL_OPTIONS = [
  'SD - sederajat', 'SMP - sederajat', 'SMA - sederajat', 'Diploma', 'S1', 'S2', 'Lainnya',
];

export const GENDER_OPTIONS = ['Laki-laki', 'Perempuan', 'Laki-laki / Perempuan'];

export const MARITAL_STATUS_OPTIONS = ['Belum Kawin', 'Kawin', 'Tidak Diutamakan'];

// Alur awal PRK sesuai flowcard.
// Draft -> Diajukan -> Validasi HR
//                    \\-> Ditolak (diarsipkan)
export const OVERALL_STATUSES = [
  'Draft', 'Diajukan', 'Validasi HR', 'Selesai', 'Ditolak',
] as const;

export const OVERALL_STATUS_COLORS: Record<string, string> = {
  Draft: 'slate',
  Diajukan: 'yellow',
  'Validasi HR': 'blue',
  Ditolak: 'red',
  // Status lama dipertahankan hanya untuk rekaman yang sudah ada.
  'Disetujui Kabag Umum': 'sky',
  'Disetujui Head HRD Div.': 'blue',
  Selesai: 'green',
};

export const PUBLICATION_STATUS_COLORS: Record<string, string> = {
  'Belum Disiapkan': 'slate',
  Draft: 'yellow',
  Dipublikasikan: 'green',
};

export function requestTypeColor(type: string) {
  return type === 'Replacement' ? 'blue' : 'green';
}

// Nomor surat otomatis, format meniru kop surat: 001/GA-BSU/X/2025
export function generateRequestNumber(sequence: number, date = new Date()) {
  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const roman = romanMonths[date.getMonth()];
  return `${String(sequence).padStart(3, '0')}/GA-BSU/${roman}/${date.getFullYear()}`;
}

export function formatDateID(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Draft tetap dapat disimpan saat belum lengkap; kelengkapan wajib dipenuhi
// hanya ketika pemohon mengajukan PRK.
export function getRequestCompleteness(form: {
  request_type: string; request_date: string; needed_date: string; div_job_site: string;
  position_needed: string; quantity: number; employment_status: string; reason: string;
  replacement_for: string;
}) {
  const missing: string[] = [];
  if (!form.request_type) missing.push('Jenis pengajuan');
  if (!form.request_date) missing.push('Tanggal pengajuan');
  if (!form.needed_date) missing.push('Tanggal dibutuhkan');
  if (!form.div_job_site) missing.push('Divisi / Job Site');
  if (!form.position_needed.trim()) missing.push('Jabatan yang dibutuhkan');
  if (!Number.isFinite(form.quantity) || form.quantity < 1) missing.push('Jumlah karyawan (minimal 1)');
  if (!form.employment_status) missing.push('Status hubungan kerja');
  if (!form.reason.trim()) missing.push('Dasar / alasan permintaan');
  if (form.request_type === 'Replacement' && !form.replacement_for.trim()) missing.push('Nama karyawan yang digantikan');
  return missing;
}

// Ringkasan progres approval (dipakai untuk stepper visual di detail surat)
export type ApprovalStep = {
  label: string;
  role: string;
  name: string | null;
  status: 'done' | 'rejected' | 'waiting' | 'pending';
  at: string | null;
};

export function buildApprovalSteps(req: EmployeeRequest): ApprovalStep[] {
  const step1Done = req.overall_status !== 'Draft';
  const step2Status: ApprovalStep['status'] =
    req.approval_status === 'Ditolak' || req.overall_status === 'Ditolak' ? 'rejected' : req.approval_status === 'Disetujui' ? 'done' : step1Done ? 'waiting' : 'pending';
  const step3Status: ApprovalStep['status'] =
    req.overall_status === 'Validasi HR' ? 'waiting' : req.overall_status === 'Selesai' || req.acknowledgement_status === 'Sudah Diketahui' ? 'done' : 'pending';

  return [
    {
      label: 'Diajukan oleh',
      role: req.submitted_by_role || 'Pemohon PRK',
      name: req.submitted_by_name === 'Pemohon Beranda' ? 'Pemohon' : req.submitted_by_name,
      status: step1Done ? 'done' : 'pending',
      at: req.created_at,
    },
    {
      label: 'Persetujuan Kepala Direktorat',
      role: req.approver_role || 'Kepala Direktorat',
      name: req.approver_name,
      status: step2Status,
      at: req.approved_at,
    },
    {
      label: 'Validasi kebutuhan oleh HR',
      role: req.acknowledger_role || 'HR',
      name: req.acknowledger_name,
      status: step3Status,
      at: req.acknowledged_at,
    },
  ];
}
