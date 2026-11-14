import { createClient } from '@supabase/supabase-js';

const userId = process.argv[2];
if (!userId) {
  console.error('Masukkan User UID dari Authentication → Users.');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data, error } = await supabase.auth.admin.updateUserById(userId, {
  email_confirm: true
});

if (error) {
  console.error(error.message);
  process.exit(1);
}

console.log('Email dikonfirmasi untuk:', data.user.email);
