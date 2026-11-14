export type AccessLevel =
  | 'karyawan'
  | 'hr_admin'
  | 'rt_admin'
  | 'cb_admin'
  | 'atasan'
  | 'super_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;          // label tampilan, misal "HR Administrator"
  accessLevel: AccessLevel;
  initials?: string;
}