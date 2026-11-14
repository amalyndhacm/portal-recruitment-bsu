export const APPLICATION_DOCUMENTS = [
  { key: 'cv_surat_lamaran', label: 'CV & Surat Lamaran' },
  { key: 'ktp', label: 'KTP' },
  { key: 'kk', label: 'Kartu Keluarga (KK)' },
  { key: 'ijazah', label: 'Ijazah' },
  { key: 'sim_gada_pratama', label: 'SIM A/B1/B2/C / Gada Pratama' },
  { key: 'skck', label: 'SKCK' },
  { key: 'surat_keterangan_sehat', label: 'Surat Keterangan Sehat' },
  { key: 'rekening_bni', label: 'Nomor Rekening BNI' },
] as const;

export type ApplicationDocumentKey = (typeof APPLICATION_DOCUMENTS)[number]['key'];
export type ApplicationDocumentStatus = 'ada' | 'belum_ada';
export type ApplicantDocumentChecklist = Partial<Record<ApplicationDocumentKey, ApplicationDocumentStatus>>;
