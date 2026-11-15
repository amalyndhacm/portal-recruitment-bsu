import { db, type EmployeeRequest } from '@/lib/database';

// ---------------------------------------------------------------------------
// Lowongan sekarang disimpan di modul `job_openings` di Supabase, dikelola dari
// halaman admin "Kelola Lowongan" (Recruitment & Training). Tidak ada lagi
// data statis di file ini — hanya tipe & fungsi akses data.
// ---------------------------------------------------------------------------

export type JobOpening = {
  id: string;
  title: string;
  division: string;
  location: string;
  type: string;
  colorIndex: 0 | 1 | 2 | 3 | 4;
  description: string;
  qualifications: string[];
  responsibilities: string[];
  benefits: string[];
  deadline: string;
  featured: boolean;
  isActive: boolean;
  flyerUrl: string | null;
  flyerName: string | null;
};

export function buildPublicJobDetails(request: EmployeeRequest) {
  const value = (input: string | null | undefined) => input?.trim() || null;
  const position = value(request.position_needed) || 'posisi ini';
  const location = value(request.div_job_site) || 'lokasi penempatan';
  const employmentStatus = value(request.employment_status);
  const educationLevel = value(request.education_level);
  const major = value(request.major);
  const gender = value(request.gender);
  const maritalStatus = value(request.marital_status);
  const ageRequirement = value(request.age_requirement);
  const workExperience = value(request.work_experience);
  const specialSkill = value(request.special_skill);
  const personalCharacteristics = value(request.personal_characteristics);
  const additionalSkills = value(request.additional_skills);
  const mainDuties = value(request.main_duties);
  const responsibleTo = value(request.responsible_to);

  return {
    description: `Kami membuka kesempatan untuk posisi ${position} dengan penempatan di ${location}${employmentStatus ? ` dan status hubungan kerja ${employmentStatus.toLowerCase()}` : ''}.`,
    qualifications: [
      educationLevel ? `Pendidikan minimal: ${educationLevel}` : null,
      major ? `Jurusan: ${major}` : null,
      gender ? `Jenis kelamin: ${gender}` : null,
      maritalStatus ? `Status perkawinan: ${maritalStatus}` : null,
      ageRequirement ? `Batas usia: ${ageRequirement}` : null,
      workExperience ? `Pengalaman kerja: ${workExperience}` : null,
      specialSkill ? `Keahlian khusus: ${specialSkill}` : null,
      personalCharacteristics ? `Karakteristik yang dicari: ${personalCharacteristics}` : null,
      additionalSkills ? `Nilai tambah: ${additionalSkills}` : null,
    ].filter(Boolean) as string[],
    responsibilities: [
      mainDuties,
      responsibleTo ? `Lingkup tanggung jawab: ${responsibleTo}` : null,
    ].filter(Boolean) as string[],
    benefits: [] as string[],
  };
}

type JobOpeningRow = {
  id: string;
  title: string;
  division: string;
  location: string;
  type: string;
  color_index: number;
  description?: string | null;
  qualifications: string[];
  responsibilities?: string[] | null;
  benefits?: string[] | null;
  deadline: string;
  featured: boolean;
  is_active: boolean;
  flyer_url: string | null;
  flyer_name: string | null;
  created_at: string;
};

function mapRow(row: JobOpeningRow): JobOpening {
  return {
    id: row.id,
    title: row.title,
    division: row.division,
    location: row.location,
    type: row.type,
    colorIndex: ((row.color_index ?? 0) as 0 | 1 | 2 | 3 | 4),
    description: row.description || '',
    qualifications: row.qualifications || [],
    responsibilities: row.responsibilities || [],
    benefits: row.benefits || [],
    deadline: row.deadline,
    featured: row.featured,
    isActive: row.is_active,
    flyerUrl: row.flyer_url || null,
    flyerName: row.flyer_name || null,
  };
}

// Dipakai di halaman publik (Karier, Beranda) — hanya lowongan aktif.
export async function fetchActiveJobOpenings(): Promise<JobOpening[]> {
  const { data, error } = await db
    .from('job_openings')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

// Dipakai pada daftar publik Karier agar lowongan nonaktif tetap terlihat
// dengan status "Lowongan ditutup". Halaman Beranda tetap memakai kueri aktif.
export async function fetchCareerJobOpenings(): Promise<JobOpening[]> {
  const { data, error } = await db
    .from('job_openings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export async function fetchFeaturedJobOpenings(): Promise<JobOpening[]> {
  const all = await fetchActiveJobOpenings();
  return all.filter((j) => j.featured);
}

// Dipakai di halaman admin — termasuk yang nonaktif.
export async function fetchAllJobOpenings(): Promise<JobOpening[]> {
  const { data, error } = await db
    .from('job_openings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapRow);
}

export type JobOpeningInput = Omit<JobOpening, 'id' | 'flyerUrl' | 'flyerName'> & { flyerUrl?: string | null; flyerName?: string | null };

export async function canPublishJobOpening(jobOpeningId: string) {
  const { data, error } = await db
    .from('employee_requests')
    .select('id, overall_status')
    .eq('linked_job_opening_id', jobOpeningId)
    .is('trashed_at', null)
    .maybeSingle();

  if (error) return { allowed: false, reason: 'Status PRK tidak dapat diverifikasi. Pastikan migrasi database sudah dijalankan.' };
  if (!data) return { allowed: false, reason: 'Lowongan ini tidak terhubung ke PRK. Buat lowongan dari PRK yang sudah selesai approval.' };
  if (data.overall_status !== 'Selesai') return { allowed: false, reason: 'PRK belum selesai approval. Selesaikan approval Direktorat dan validasi HR terlebih dahulu.' };
  return { allowed: true, reason: '' };
}

async function requireCompletedPrk(jobOpeningId: string) {
  const eligibility = await canPublishJobOpening(jobOpeningId);
  if (!eligibility.allowed) throw new Error(eligibility.reason);
}

function toRow(input: JobOpeningInput) {
  return {
    title: input.title,
    division: input.division,
    location: input.location,
    type: input.type,
    color_index: input.colorIndex,
    description: input.description,
    qualifications: input.qualifications,
    responsibilities: input.responsibilities,
    benefits: input.benefits,
    deadline: input.deadline,
    featured: input.featured,
    is_active: input.isActive,
    ...(input.flyerUrl !== undefined ? { flyer_url: input.flyerUrl, flyer_name: input.flyerName || null } : {}),
  };
}

export async function updateJobOpening(id: string, input: JobOpeningInput) {
  if (input.isActive) await requireCompletedPrk(id);
  const result = await db.from('job_openings').update(toRow(input)).eq('id', id);
  if (!result.error) await syncLinkedRequestPublication(id, input.isActive);
  return result;
}

export async function deleteJobOpening(id: string) {
  return db.from('job_openings').delete().eq('id', id);
}

export async function toggleJobOpeningActive(id: string, isActive: boolean) {
  if (isActive) await requireCompletedPrk(id);
  const result = await db.from('job_openings').update({ is_active: isActive }).eq('id', id);
  if (!result.error) await syncLinkedRequestPublication(id, isActive);
  return result;
}

async function syncLinkedRequestPublication(jobOpeningId: string, isActive: boolean) {
  await db
    .from('employee_requests')
    .update({
      publication_status: isActive ? 'Dipublikasikan' : 'Draft',
      published_at: isActive ? new Date().toISOString() : null,
      published_by_name: null,
    })
    .eq('linked_job_opening_id', jobOpeningId);
}
