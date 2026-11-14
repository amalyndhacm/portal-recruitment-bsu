export type PortalRole = 'candidate' | 'recruitment' | 'training' | 'hr' | 'comben' | 'admin' | 'super_admin' | 'atasan' | 'unknown';

/**
 * Menyamakan role dari data lama/berbagai sumber agar hak akses konsisten.
 * Contoh yang didukung: rt_admin, recruitment_admin, rekrutmen, rekrutment.
 */
export function normalizePortalRole(value?: string | null): PortalRole {
  const role = (value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (['candidate', 'pelamar', 'kandidat', 'candidate_admin'].includes(role)) return 'candidate';
  if (['recruitment', 'recruitment_admin', 'rt_admin', 'rt', 'rekrutmen', 'rekrutment', 'rekrutmen_admin'].includes(role)) return 'recruitment';
  if (['training', 'training_admin', 'trainer', 'pelatihan'].includes(role)) return 'training';
  if (['hr', 'hr_admin', 'human_resource', 'human_resources', 'sdm'].includes(role)) return 'hr';
  if (['comben', 'cb_admin', 'compensation', 'compensation_benefit', 'compensation_and_benefit'].includes(role)) return 'comben';
  if (['super_admin', 'superadmin'].includes(role)) return 'super_admin';
  if (['admin', 'administrator'].includes(role)) return 'admin';
  if (role === 'atasan') return 'atasan';

  return 'unknown';
}

export function isCandidateRole(value?: string | null) {
  return normalizePortalRole(value) === 'candidate';
}

export function getDashboardRole(value?: string | null, selectedRole?: string | null): Exclude<PortalRole, 'unknown' | 'super_admin' | 'atasan'> | 'admin' {
  const role = normalizePortalRole(value);
  if (role !== 'unknown') {
    if (role === 'training') return 'recruitment';
    if (role === 'super_admin' || role === 'atasan') return 'admin';
    return role;
  }

  const selected = normalizePortalRole(selectedRole);
  if (selected === 'super_admin' || selected === 'atasan' || selected === 'unknown') return 'admin';
  return selected;
}

export function getRoleLabel(value?: string | null) {
  switch (normalizePortalRole(value)) {
    case 'candidate': return 'Kandidat / Pelamar';
    case 'recruitment': return 'Tim Recruitment';
    case 'training': return 'Tim Training';
    case 'hr': return 'Tim HR';
    case 'comben': return 'Tim Compensation & Benefit';
    case 'atasan': return 'Atasan';
    case 'admin':
    case 'super_admin': return 'Super Administrator';
    default: return 'Pengguna Portal';
  }
}
