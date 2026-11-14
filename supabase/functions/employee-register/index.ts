import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
const normalize = (value: unknown) => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
const staffRoles = new Set([
  'recruitment', 'recruitment_admin', 'rt_admin', 'rt', 'rekrutmen', 'rekrutment', 'rekrutmen_admin',
  'training', 'training_admin', 'trainer', 'pelatihan', 'hr', 'hr_admin', 'human_resource', 'human_resources', 'sdm',
  'comben', 'cb_admin', 'compensation', 'compensation_benefit', 'compensation_and_benefit',
  'admin', 'administrator', 'super_admin', 'superadmin', 'atasan',
]);

async function findExistingUsers(admin: ReturnType<typeof createClient>, aliases: string[]) {
  const matches = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const user of data.users) {
      if (aliases.includes(String(user.email || '').toLowerCase())) matches.push(user);
    }
    if (data.users.length < 1000) break;
  }
  return matches;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Metode tidak diizinkan.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Konfigurasi fungsi server belum lengkap.' }, 500);

  let input: { action?: unknown; nip?: unknown; name?: unknown; password?: unknown };
  try { input = await request.json(); } catch { return json({ error: 'Data pendaftaran tidak valid.' }, 400); }
  const nip = String(input.nip ?? '').trim().toUpperCase();
  const action = input.action === 'check' ? 'check' : 'register';
  const name = String(input.name ?? '').trim().replace(/\s+/g, ' ');
  const password = String(input.password ?? '');
  if (!/^[A-Z0-9]{3,40}$/.test(nip)) return json({ error: 'Format NIP tidak valid.' }, 400);
  if (action === 'register' && (name.length < 2 || name.length > 120)) return json({ error: 'Nama wajib diisi sesuai master karyawan.' }, 400);
  if (action === 'register' && (password.length < 8 || password.length > 72)) return json({ error: 'Password harus terdiri dari 8 sampai 72 karakter.' }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: employee, error: employeeError } = await admin
    .from('employee_master')
    .select('employee_id, name, status')
    .ilike('employee_id', nip)
    .maybeSingle();
  if (employeeError) {
    console.error('employee_master lookup failed:', employeeError.message);
    return json({ error: 'Pemeriksaan master karyawan gagal. Hubungi administrator.' }, 500);
  }
  const activeEmployee = Boolean(employee
    && normalize(employee.employee_id) === normalize(nip)
    && normalize(employee.status) === 'active');
  if (action === 'check') return json({ allowed: activeEmployee });
  if (!activeEmployee || normalize(employee?.name) !== normalize(name)) {
    return json({ error: 'NIP, nama, atau status tidak cocok dengan master karyawan aktif.' }, 403);
  }

  const aliases = [`${nip.toLowerCase()}@bsu.co.id`, `${nip.toLowerCase()}@portal.bsu.co.id`];
  let existingUsers;
  try { existingUsers = await findExistingUsers(admin, aliases); } catch (error) {
    console.error('Auth user lookup failed:', String(error));
    return json({ error: 'Pemeriksaan akun gagal. Coba lagi atau hubungi administrator.' }, 500);
  }
  if (existingUsers.length > 1) {
    return json({ error: 'Ditemukan lebih dari satu akun untuk NIP ini. Administrator perlu merapikan akun duplikat.' }, 409);
  }

  const metadata = { name: employee.name, nip: employee.employee_id };
  if (existingUsers.length === 1) {
    const existing = existingUsers[0];
    const { data: profileRow } = await admin.from('portal_records').select('payload')
      .eq('table_name', 'profiles').eq('id', existing.id).maybeSingle();
    const role = String(profileRow?.payload?.role || 'unknown').toLowerCase();
    if (existing.email_confirmed_at || staffRoles.has(role) || role === 'candidate') {
      return json({ error: 'Akun dengan NIP ini sudah terdaftar. Silakan login atau hubungi administrator.' }, 409);
    }
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { ...(existing.user_metadata || {}), ...metadata },
    });
    if (error) {
      console.error('Pending employee account activation failed:', error.message);
      return json({ error: 'Akun lama belum dapat diaktifkan. Hubungi administrator.' }, 500);
    }
    return json({ success: true, email: existing.email, activated: true });
  }

  const email = `${nip.toLowerCase()}@bsu.co.id`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error || !data.user) {
    console.error('Employee Auth account creation failed:', error?.message || 'No user returned');
    return json({ error: 'Akun belum berhasil dibuat. Periksa Authentication → Logs atau hubungi administrator.' }, 400);
  }
  return json({ success: true, email, activated: false });
});
