import type { User } from '@/lib/types';

export const mockUsers: (User & { password: string })[] = [
  {
    id: 'u1',
    name: 'Hendra Wijaya',
    email: 'atasan@bsu.co.id',
    password: 'password123',
    role: 'Atasan',
    accessLevel: 'atasan',
  },
  {
    id: 'u2',
    name: 'Yoga Sudarsono',
    email: 'hr@bsu.co.id',
    password: 'password123',
    role: 'HR Administrator',
    accessLevel: 'hr_admin',
  },
  {
    id: 'u3',
    name: 'Ferry Nainggolan',
    email: 'comben@bsu.co.id',
    password: 'password123',
    role: 'Compensation & Benefit Administrator',
    accessLevel: 'cb_admin',
  },
  {
    id: 'u4',
    name: 'Diah Ramadhan',
    email: 'recruitment@bsu.co.id',
    password: 'password123',
    role: 'Recruitment & Training Administrator',
    accessLevel: 'rt_admin',
  },
  {
    id: 'u5',
    name: 'Ahmad Fadli',
    email: 'admin@bsu.co.id',
    password: 'password123',
    role: 'Super Administrator',
    accessLevel: 'super_admin',
  },
];