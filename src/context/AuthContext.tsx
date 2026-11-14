import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { db, supabaseConfigured, type AuthUser } from '@/lib/supabaseClient';
import { normalizePortalRole } from '@/lib/accessControl';

export type UserProfile = {
  id: string;
  name: string;
  nip: string;
  email: string;
  accessLevel: string;
  phone: string;
  domicile: string;
  education: string;
};

type AuthResult = { success: boolean; error?: string; needsConfirmation?: boolean };
type AuthContextType = {
  user: UserProfile | null;
  loading: boolean;
  recoveryMode: boolean;
  login: (identifier: string, password: string, mode?: 'staff' | 'candidate') => Promise<AuthResult>;
  register: (
    identifier: string,
    password: string,
    name: string,
    mode?: 'staff' | 'candidate',
    details?: { phone?: string; domicile?: string; education?: string },
  ) => Promise<AuthResult>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function staffEmailAliases(nip: string) {
  const cleanNip = nip.trim().toUpperCase();
  return [
    `${cleanNip}@bsu.co.id`,
    `${cleanNip}@portal.bsu.co.id`,
  ];
}

function authErrorMessage(error: { code?: string; message?: string }, action: 'login' | 'register') {
  switch (error.code) {
    case 'email_not_confirmed':
      return 'Akun belum dikonfirmasi. Kandidat: cek email konfirmasi. Karyawan: daftar kembali dengan NIP dan nama persis seperti master aktif untuk mengaktifkan akun lama dan menetapkan password baru.';
    case 'invalid_credentials':
      return 'Email/NIP atau password tidak cocok. Gunakan email yang tercatat di Supabase, atau pastikan alias NIP sesuai dengan akun.';
    case 'email_address_invalid':
      return 'Format email atau alias NIP tidak diterima Supabase. Periksa kembali identitas akun yang dimasukkan.';
    case 'email_exists':
    case 'user_already_exists':
      return 'Akun dengan identitas ini sudah terdaftar. Jangan daftar ulang; coba login atau minta administrator memeriksa akun.';
    case 'email_rate_limit_exceeded':
    case 'over_email_send_rate_limit':
      return 'Batas pengiriman email Supabase tercapai. Berhenti mencoba kirim ulang; tunggu batas pulih.';
    case 'over_request_rate_limit':
    case 'too_many_requests':
      return 'Terlalu banyak percobaan. Tunggu sebelum mencoba lagi.';
    default:
      return error.message || (action === 'login' ? 'Login gagal. Periksa akun dan pengaturan Supabase.' : 'Pendaftaran gagal. Periksa pengaturan Supabase.');
  }
}

function metadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : '';
}

function profileFromUser(user: AuthUser, profile?: Record<string, unknown> | null): UserProfile {
  const metadata = user.user_metadata || {};
  const isCandidate = metadata.role === 'candidate';
  return {
    id: user.id,
    name: String(profile?.name || metadataString(metadata, 'name') || user.email?.split('@')[0] || 'Pengguna'),
    nip: String(profile?.nip || metadataString(metadata, 'nip')),
    email: String(metadataString(metadata, 'email') || user.email || ''),
    accessLevel: isCandidate ? 'candidate' : String(profile?.role || user.role || 'unknown'),
    phone: metadataString(metadata, 'phone'),
    domicile: metadataString(metadata, 'domicile'),
    education: metadataString(metadata, 'education'),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(() => new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type') === 'recovery');
  const authRevision = useRef(0);

  async function loadProfile(authUser: AuthUser): Promise<UserProfile> {
    const { data, error } = await db.from('profiles').select('id, name, role, nip').eq('id', authUser.id).maybeSingle();
    return profileFromUser(authUser, error ? null : data);
  }

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;
    const initialRevision = authRevision.current;
    const startupTimeout = window.setTimeout(() => {
      if (active) setLoading(false);
    }, 12000);
    const finishLoading = () => {
      window.clearTimeout(startupTimeout);
      if (active) setLoading(false);
    };
    db.auth.getSession().then(({ data: { session } }) => {
      if (!active || initialRevision !== authRevision.current) return;
      if (session?.user) {
        void loadProfile(session.user).then((profile) => {
          if (active && initialRevision === authRevision.current) setUser(profile);
        }).catch(() => {
          if (active && initialRevision === authRevision.current) setUser(profileFromUser(session.user));
        }).finally(finishLoading);
      } else {
        setUser(null);
        finishLoading();
      }
    }).catch(() => {
      if (active && initialRevision === authRevision.current) {
        setUser(null);
        finishLoading();
      }
    });

    const { data: listener } = db.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      const revision = ++authRevision.current;
      if (session?.user) {
        window.setTimeout(() => {
          if (!active || revision !== authRevision.current) return;
          void loadProfile(session.user).then((profile) => {
            if (active && revision === authRevision.current) setUser(profile);
          }).catch(() => {
            if (active && revision === authRevision.current) setUser(profileFromUser(session.user));
          }).finally(finishLoading);
        }, 0);
      } else if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        finishLoading();
      }
    });

    return () => {
      active = false;
      window.clearTimeout(startupTimeout);
      listener.subscription.unsubscribe();
    };
  }, []);

  async function login(identifier: string, password: string, mode: 'staff' | 'candidate' = 'staff'): Promise<AuthResult> {
    if (!supabaseConfigured) return { success: false, error: 'Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env.' };
    if (!identifier.trim() || !password) return { success: false, error: 'Isi identitas akun dan password terlebih dahulu.' };
    try {
      const normalizedIdentifier = identifier.trim();
      const staffEmailLogin = mode === 'staff' && normalizedIdentifier.includes('@');
      if (mode === 'staff' && !staffEmailLogin) {
        const { data: employeeCheck, error: checkError } = await db.functions.invoke('employee-register', {
          body: { action: 'check', nip: normalizedIdentifier.toUpperCase() },
        });
        if (checkError) {
          const context = (checkError as { context?: unknown }).context;
          if (context instanceof Response) {
            const responseBody = await context.clone().json().catch(() => null) as { error?: string } | null;
            if (responseBody?.error) return { success: false, error: responseBody.error };
          }
          return { success: false, error: checkError.message || 'Pemeriksaan master karyawan gagal.' };
        }
        if (!employeeCheck?.allowed) return { success: false, error: 'NIP tidak ditemukan di master karyawan aktif.' };
      }
      const emails = mode === 'candidate'
        ? [normalizedIdentifier.toLowerCase()]
        : staffEmailLogin
          ? [normalizedIdentifier.toLowerCase()]
          : staffEmailAliases(normalizedIdentifier);
      let lastError: { code?: string; message?: string } | null = null;
      let foundUnconfirmedAccount = false;
      for (const email of emails) {
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (!error && data.user) {
          const profile = await loadProfile(data.user);
          setUser(profile);
          if (staffEmailLogin && !['recruitment', 'training', 'hr', 'comben', 'admin', 'super_admin', 'atasan'].includes(normalizePortalRole(profile.accessLevel))) {
            await db.auth.signOut();
            sessionStorage.removeItem('portal-session-active');
            return { success: false, error: 'Akun ditemukan, tetapi role staf belum diaktifkan pada profil Supabase. Minta administrator menetapkan role Recruitment pada profil akun.' };
          }
          if (mode === 'candidate') sessionStorage.setItem('portal-login-role', 'candidate');
          sessionStorage.setItem('portal-session-active', '1');
          return { success: true };
        }
        if (error?.code === 'email_not_confirmed') foundUnconfirmedAccount = true;
        lastError = error || { message: 'Supabase tidak mengembalikan data akun.' };
        if (mode === 'candidate' || (error?.code && !['invalid_credentials', 'email_not_confirmed', 'user_not_found', 'email_address_invalid'].includes(error.code))) {
          break;
        }
      }
      if (foundUnconfirmedAccount) return { success: false, error: authErrorMessage({ code: 'email_not_confirmed' }, 'login') };
      return { success: false, error: authErrorMessage(lastError || {}, 'login') };
    } catch { return { success: false, error: 'Tidak dapat masuk saat ini. Periksa konfigurasi Supabase dan koneksi internet.' }; }
  }

  async function register(identifier: string, password: string, name: string, mode: 'staff' | 'candidate' = 'staff', details: { phone?: string; domicile?: string; education?: string } = {}): Promise<AuthResult> {
    if (!supabaseConfigured) return { success: false, error: 'Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di .env.' };
    const cleanName = name.trim();
    if (cleanName.length < 2) return { success: false, error: 'Nama lengkap minimal 2 karakter.' };
    if (password.length < 8) return { success: false, error: 'Password minimal 8 karakter.' };
    try {
      if (mode === 'candidate') {
        const email = identifier.trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email)) return { success: false, error: 'Format email kandidat tidak valid.' };
        const { data, error } = await db.auth.signUp({ email, password, options: { data: { name: cleanName, role: 'candidate', email, ...details } } });
        if (error) return { success: false, error: authErrorMessage(error, 'register') };
        if (!data.user) return { success: false, error: 'Supabase belum mengembalikan akun. Periksa Authentication → Logs.' };
        if (data.session) await db.auth.signOut();
        sessionStorage.removeItem('portal-session-active');
        return { success: true, needsConfirmation: !data.session };
      }

      const cleanNip = identifier.trim().toUpperCase();
      if (!/^[A-Za-z0-9]+$/.test(cleanNip)) return { success: false, error: 'NIP hanya boleh berisi huruf dan angka.' };
      const { data, error } = await db.functions.invoke('employee-register', {
        body: { nip: cleanNip, name: cleanName, password },
      });
      if (error) {
        const context = (error as { context?: unknown }).context;
        if (context instanceof Response) {
          const responseBody = await context.clone().json().catch(() => null) as { error?: string } | null;
          if (responseBody?.error) return { success: false, error: responseBody.error };
        }
        return { success: false, error: error.message || 'Pendaftaran karyawan gagal. Periksa fungsi Supabase employee-register.' };
      }
      if (!data?.success) return { success: false, error: data?.error || 'NIP belum dapat didaftarkan.' };
      await db.auth.signOut();
      sessionStorage.removeItem('portal-session-active');
      return { success: true };
    } catch { return { success: false, error: 'Pendaftaran gagal. Periksa konfigurasi Supabase dan koneksi internet.' }; }
  }

  async function requestPasswordReset(email: string): Promise<AuthResult> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return { success: false, error: 'Masukkan alamat email kandidat yang valid terlebih dahulu.' };
    const { error } = await db.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: window.location.origin });
    return error ? { success: false, error: error.message } : { success: true };
  }

  async function updatePassword(password: string): Promise<AuthResult> {
    if (password.length < 8) return { success: false, error: 'Password baru minimal 8 karakter.' };
    const { error } = await db.auth.updateUser({ password });
    if (error) return { success: false, error: error.message };
    setRecoveryMode(false);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return { success: true };
  }

  async function logout() {
    await db.auth.signOut();
    sessionStorage.removeItem('portal-session-active');
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, recoveryMode, login, register, requestPasswordReset, updatePassword, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
