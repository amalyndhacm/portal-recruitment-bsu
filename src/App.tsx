import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import AccountProfilePage from '@/pages/candidate/AccountProfilePage';
import PasswordRecoveryPage from '@/pages/public/PasswordRecoveryPage';
import Layout, { type AppNotification, type PageId } from '@/components/Layout';
import HomePage from '@/pages/public/HomePage';
import CompanyProfilePage from '@/pages/public/Companyprofile';
import CareerPage from '@/pages/public/Career';
import ContactPage from '@/pages/public/Contact';
import LoginPage from '@/pages/public/LoginPage';
import RegisterPage from '@/pages/public/RegisterPage';
import WeeklyReportPage from '@/pages/hr/WeeklyReportPage';
import EmployeeActivitiesPage from '@/pages/hr/EmployeeActivitiesPage';
import EmployeeAdminPage from '@/pages/hr/EmployeeAdminPage';
import ResignReasonPage from '@/pages/hr/ResignReasonPage';
import DisciplinePage from '@/pages/hr/DisciplinePage';
import TravelAdminPage from '@/pages/hr/TravelAdminPage';
import RecruitmentPage from '@/pages/recruitment/RecruitmentPage';
import JobOpeningsAdminPage from '@/pages/recruitment/JobOpeningsAdminPage';
import JobApplicantsPage from '@/pages/recruitment/JobApplicantsPage';
import TrainingPage from '@/pages/recruitment/TrainingPage';
import RecruitmentRecapPage from '@/pages/recruitment/RecruitmentRecapPage';
import TrainingRecapPage from '@/pages/recruitment/TrainingRecapPage';
import TalentPoolPage from '@/pages/recruitment/TalentPoolPage';
import CandidatePipelinePage from '@/pages/recruitment/CandidatePipelinePage';
import AssessmentPage from '@/pages/recruitment/AssessmentPage';
import OfferingPage from '@/pages/recruitment/OfferingPage';
import OnboardingPage from '@/pages/recruitment/OnboardingPage';
import RecruitmentSourcesPage from '@/pages/recruitment/RecruitmentSourcesPage';
import MessageTemplatesPage from '@/pages/recruitment/MessageTemplatesPage';
import RecruitmentAnalyticsPage from '@/pages/recruitment/RecruitmentAnalyticsPage';
import GalleryPage from '@/pages/recruitment/GalleryPage';
import IncentivePage from '@/pages/compensation/IncentivePage';
import DocumentationPage from '@/pages/compensation/DocumentationPage';
import EmployeeDataPage from '@/pages/hr/EmployeeDataPage';
import WorkforceDemographicsPage from '@/pages/hr/WorkforceDemographicsPage';
import PersonnelActionsPage from '@/pages/hr/PersonnelActionsPage';
import EmployeeRequestPage from '@/pages/recruitment/EmployeeRequestPage';
import ApprovalVerificationPage from '@/pages/public/ApprovalVerificationPage';
import SalaryRecapPage from '@/pages/compensation/SalaryRecapPage';
import InterviewSchedulePage from '@/pages/recruitment/InterviewSchedulePage';
import CandidatePortalPage from '@/pages/candidate/CandidatePortalPage';
import CandidateFeaturePage from '@/pages/candidate/CandidateFeaturePage';
import type { LoginRole } from '@/pages/public/PageHeader';
import RecruitmentDashboardPage from '@/pages/dashboard/RecruitmentDashboardPage';
import TrainingDashboardPage from '@/pages/dashboard/TrainingDashboardPage';
import { getDashboardRole, getRoleLabel, isCandidateRole, normalizePortalRole } from '@/lib/accessControl';
import type { PortalNotificationDetail } from '@/lib/portalNotifications';
import { notifyPortal } from '@/lib/portalNotifications';
import { db } from '@/lib/database';
import { getPsychotestName } from '@/lib/psychotests';

function dashboardPageForRole(role?: string): PageId {
  switch (getDashboardRole(role)) {
    case 'candidate': return 'candidate-dashboard';
    case 'recruitment':
      return 'rt-dashboard';
    case 'training': return 'training-dashboard';
    case 'hr': return 'hr-admin';
    case 'comben': return 'cb-incentive';
    default: return 'rt-dashboard';
  }
}

const roleDashboardPages = new Set<PageId>(['rt-dashboard', 'training-dashboard', 'candidate-dashboard']);

// PERUBAHAN: PublicView diperluas dari 'home' | 'login' menjadi juga
// mencakup 'register' | 'profile' | 'career' | 'contact' — halaman publik
// yang dibuka lewat prop `onNavigate` dari HomePage (menggantikan anchor
// scroll #profil / #karier / #kontak yang lama).
type PublicView = 'home' | 'login' | 'register' | 'profile' | 'career' | 'contact';

export default function App() {
  const { user, loading, recoveryMode, logout } = useAuth();
  const [page, setPage] = useState<PageId>('candidate-dashboard');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('portal-theme') === 'dark');
  const [notificationState, setNotificationState] = useState<{ scope: string; items: AppNotification[] }>({ scope: '', items: [] });
  const [publicView, setPublicView] = useState<PublicView>(() =>
    new URLSearchParams(window.location.search).has('lowongan') ? 'career' : 'home',
  );
  const [showPublicHome, setShowPublicHome] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [loginRole, setLoginRole] = useState<LoginRole | null>(() => {
    const savedRole = sessionStorage.getItem('portal-login-role');
    return savedRole === 'candidate' || savedRole === 'recruitment' || savedRole === 'training'
      ? savedRole
      : null;
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('portal-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);
  const toggleTheme = () => setIsDarkMode((current) => !current);
  const selectedLoginRole = loginRole;
  // Semua akun staf yang masuk dengan alias NIP resmi diarahkan ke workspace
  // Recruitment bersama. Izin data tetap ditentukan RLS berdasarkan status
  // karyawan aktif di employee_master, bukan oleh pilihan tampilan ini.
  const storedUserRole = normalizePortalRole(user?.accessLevel);
  const isNipEmployeeAccount = /@(?:bsu\.co\.id|portal\.bsu\.co\.id)$/i.test(user?.email || '');
  // Kandidat selalu tetap di portal kandidat; staf ber-alias NIP masuk ke
  // dashboard Recruitment yang sama, apa pun role workspace lama yang tersimpan.
  const effectiveAccessLevel = storedUserRole === 'candidate'
    ? 'candidate'
    : storedUserRole === 'training' || selectedLoginRole === 'training'
      ? 'training'
      : isNipEmployeeAccount
        ? 'recruitment'
        : selectedLoginRole ?? user?.accessLevel;
  const isCandidate = isCandidateRole(effectiveAccessLevel);
  const isCandidateAccount = normalizePortalRole(user?.accessLevel) === 'candidate';
  const notificationAudience = isCandidate ? 'candidate' : 'recruitment';
  const notificationStorageKey = `portal-notifications:${user?.id || 'guest'}:${notificationAudience}`;
  const notifications = notificationState.scope === notificationStorageKey ? notificationState.items : [];

  useEffect(() => {
    let saved: AppNotification[] = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(notificationStorageKey) || '[]');
      if (Array.isArray(parsed)) saved = parsed as AppNotification[];
    } catch { /* Abaikan data notifikasi lokal yang rusak. */ }
    setNotificationState({ scope: notificationStorageKey, items: saved });
  }, [notificationStorageKey]);

  useEffect(() => {
    const onNotify = (event: Event) => {
      const detail = (event as CustomEvent<PortalNotificationDetail>).detail;
      if (!detail?.title || (detail.audience !== 'all' && detail.audience !== notificationAudience)) return;
      setNotificationState((current) => {
        const currentItems = current.scope === notificationStorageKey ? current.items : [];
        const next = [{
          id: crypto.randomUUID(), title: detail.title, description: detail.description,
          audience: detail.audience, time: 'Baru', timestamp: Date.now(), read: false,
        }, ...currentItems].slice(0, 30);
        localStorage.setItem(notificationStorageKey, JSON.stringify(next));
        return { scope: notificationStorageKey, items: next };
      });
    };
    window.addEventListener('portal:notify', onNotify);
    return () => window.removeEventListener('portal:notify', onNotify);
  }, [notificationAudience, notificationStorageKey]);

  const markNotificationsRead = () => setNotificationState((current) => {
    const currentItems = current.scope === notificationStorageKey ? current.items : [];
    const next = currentItems.map((item) => ({ ...item, read: true }));
    localStorage.setItem(notificationStorageKey, JSON.stringify(next));
    return { scope: notificationStorageKey, items: next };
  });

  useEffect(() => {
    if (!isCandidate || !user?.id || !user.email) return;
    let active = true;
    const snapshotKey = `portal-candidate-notification-snapshot:${user.id}`;
    type CandidateApplicationSnapshot = { status: string; position: string };
    type CandidateScheduleSnapshot = { applicantId: string; stage: string; date: string; time: string; psychotestTypes: string[] };
    type CandidateSnapshot = {
      applications: Record<string, CandidateApplicationSnapshot>;
      schedules: Record<string, CandidateScheduleSnapshot>;
    };

    const pollCandidateUpdates = async () => {
      try {
        const { data: applicationData, error: applicationError } = await db
          .from('job_applicants')
          .select('id, status, position, tracking_code')
          .eq('email', user.email.trim().toLowerCase())
          .order('created_at', { ascending: false });
        if (!active || applicationError || !applicationData) return;

        const applicationRows = applicationData as Array<{ id: string; status: string; position: string; tracking_code: string }>;
        const applicantIds = applicationRows.map((application) => application.id);
        let scheduleRows: Array<{ id: string; applicant_id: string; stage: string; scheduled_date: string; scheduled_time: string; psychotest_types: string[] | null }> = [];
        if (applicantIds.length) {
          const { data, error } = await db
            .from('interview_schedules')
            .select('id, applicant_id, stage, scheduled_date, scheduled_time, psychotest_types')
            .in('applicant_id', applicantIds);
          if (!active || error || !data) return;
          scheduleRows = data as typeof scheduleRows;
        }

        const current: CandidateSnapshot = {
          applications: Object.fromEntries(applicationRows.map((application) => [application.id, {
            status: application.status || 'Lamaran Masuk',
            position: application.position || 'Posisi yang dilamar',
          }])),
          schedules: Object.fromEntries(scheduleRows.map((schedule) => [schedule.id, {
            applicantId: schedule.applicant_id,
            stage: schedule.stage || 'Seleksi',
            date: schedule.scheduled_date || '',
            time: schedule.scheduled_time || '',
            psychotestTypes: schedule.psychotest_types || [],
          }])),
        };

        let previous: CandidateSnapshot | null = null;
        try {
          const saved = localStorage.getItem(snapshotKey);
          if (saved) previous = JSON.parse(saved) as CandidateSnapshot;
        } catch { /* Snapshot rusak akan dibuat ulang sebagai baseline. */ }

        if (previous) {
          for (const [applicationId, application] of Object.entries(current.applications)) {
            const oldApplication = previous.applications?.[applicationId];
            if (oldApplication && oldApplication.status !== application.status) {
              notifyPortal('Status lamaran diperbarui', `${application.position}: status lamaran Anda sekarang ${application.status}.`, 'candidate');
            }
          }

          for (const [scheduleId, schedule] of Object.entries(current.schedules)) {
            const previousSchedule = previous.schedules?.[scheduleId];
            const application = current.applications[schedule.applicantId];
            const position = application?.position || 'Lamaran Anda';
            const selectedTests = schedule.psychotestTypes.map(getPsychotestName);
            const testsDescription = selectedTests.length ? ` Tes yang ditugaskan: ${selectedTests.join(', ')}.` : '';
            if (!previousSchedule) {
              const title = schedule.stage === 'Psikotest' ? 'Psikotest dijadwalkan' : 'Jadwal seleksi baru';
              notifyPortal(title, `${position}: ${schedule.stage} dijadwalkan ${schedule.date} ${schedule.time}.${testsDescription}`, 'candidate');
            } else if (previousSchedule.date !== schedule.date || previousSchedule.time !== schedule.time || previousSchedule.stage !== schedule.stage) {
              const title = schedule.stage === 'Psikotest' ? 'Jadwal Psikotest diperbarui' : 'Jadwal seleksi diperbarui';
              notifyPortal(title, `${position}: jadwal ${schedule.stage} berubah menjadi ${schedule.date} ${schedule.time}.${testsDescription}`, 'candidate');
            } else if (JSON.stringify(previousSchedule.psychotestTypes || []) !== JSON.stringify(schedule.psychotestTypes)) {
              notifyPortal('Jenis Psikotest diperbarui', `${position}: HR memperbarui tes yang harus dikerjakan menjadi ${selectedTests.length ? selectedTests.join(', ') : 'belum ditentukan'}.`, 'candidate');
            }
          }

          for (const [scheduleId, previousSchedule] of Object.entries(previous.schedules || {})) {
            if (!current.schedules[scheduleId]) {
              const application = current.applications[previousSchedule.applicantId];
              notifyPortal('Jadwal seleksi berubah', `${application?.position || 'Lamaran Anda'}: jadwal ${previousSchedule.stage} tidak lagi tercatat. Silakan cek jadwal terbaru di portal.`, 'candidate');
            }
          }
        }

        if (active) localStorage.setItem(snapshotKey, JSON.stringify(current));
      } catch {
        // Notifikasi bersifat tambahan; gangguan query tidak menghalangi portal.
      }
    };

    void pollCandidateUpdates();
    const timer = window.setInterval(() => void pollCandidateUpdates(), 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, [isCandidate, user?.email, user?.id]);
  // Profil lama dapat menyimpan variasi nama role (mis. `rekrutment` atau
  // `recruitment_admin`). Semua variasi dinormalisasi sebelum menentukan area.
  const dashboardRole = isCandidate ? 'candidate' : getDashboardRole(effectiveAccessLevel);
  // Kandidat masuk ke portal kandidat; Recruitment memakai dashboard dengan
  // sapaan nama dan ringkasan PRK. HR/Comben diarahkan ke modul operasional.
  const defaultPage = dashboardPageForRole(effectiveAccessLevel);

  // Selalu mulai dari dashboard role saat akun baru aktif, termasuk setelah
  // logout lalu masuk dengan akun lain pada tab yang sama.
  const routedUserId = useRef<string | null>(null);
  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      routedUserId.current = null;
      return;
    }
    if (routedUserId.current !== userId) {
      routedUserId.current = userId;
      setPage(defaultPage);
    }
  }, [defaultPage, userId]);

  useEffect(() => {
    if (user && isCandidate && !page.startsWith('candidate-')) {
      setPage('candidate-dashboard');
      return;
    }
    if (user && roleDashboardPages.has(page) && page !== defaultPage) {
      setPage(defaultPage);
    }
  }, [defaultPage, isCandidate, page, user]);
  useEffect(() => {
    if (!isCandidateAccount || !sessionStorage.getItem('portal-pending-application-job-id')) return;
    setShowPublicHome(false);
    setPublicView('career');
  }, [isCandidateAccount, user?.id]);

  useEffect(() => {
    const goToRoleDashboard = () => {
      if (user) setPage(defaultPage);
      else setPublicView('home');
    };
    window.addEventListener('portal:navigate-home', goToRoleDashboard);
    return () => window.removeEventListener('portal:navigate-home', goToRoleDashboard);
  }, [defaultPage, user]);

  const verificationParams = new URLSearchParams(window.location.search);
  const approvalVerificationId = verificationParams.get('verifyApproval');
  const stageParam = verificationParams.get('approvalStage');
  const approvalStage = stageParam === 'hr' || stageParam === 'requester' ? stageParam : 'director';
  if (approvalVerificationId) {
    return <ApprovalVerificationPage requestId={approvalVerificationId} stage={approvalStage} />;
  }

  if (recoveryMode) return <PasswordRecoveryPage />;

  // Selagi Supabase masih memeriksa sesi yang tersimpan (misal saat refresh
  // halaman), tampilkan layar tunggu — jangan render Login/Dashboard dulu,
  // supaya user yang sudah login tidak sempat "terlempar" ke halaman login.
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        Memuat sesi...
      </div>
    );
  }

  // Belum login → tampilkan Beranda publik (profil perusahaan & info rekrutmen)
  // lalu halaman Login/Register saat karyawan memilih "Masuk"/"Daftar".
  // Dashboard tidak pernah dirender sebelum ada sesi user yang valid.
  const selectWorkspaceRole = (role: LoginRole) => {
    const workspaceRole = normalizePortalRole(user?.accessLevel) === 'candidate' ? 'candidate' : role;
    sessionStorage.setItem('portal-login-role', workspaceRole);
    sessionStorage.setItem('portal-session-active', '1');
    setShowPublicHome(false);
    setLoginRole(workspaceRole);
    setPage(dashboardPageForRole(workspaceRole));
  };

  const isPublicContentView = publicView === 'career' || publicView === 'profile' || publicView === 'contact' || (publicView === 'home' && showPublicHome);
  if (!user || isPublicContentView) {
    // `goPublic` dipakai sebagai `onNavigate` untuk HomePage & tiga halaman
    // publik baru. Signature-nya (page: PageKey) => void, sesuai yang
    // diharapkan PageHeader/PageFooter.
    const goPublic = (target: PublicView) => {
      setPublicView(target);
      setShowPublicHome(Boolean(user && target === 'home'));
    };
    const selectLoginRole = (role: LoginRole) => {
      setAuthNotice('Anda belum masuk. Silakan login terlebih dahulu untuk membuka dashboard.');
      sessionStorage.setItem('portal-login-role', role);
      setLoginRole(role);
      setShowPublicHome(false);
      setPublicView('login');
    };
    const requestCandidateAuth = async (jobId: string, action: 'register' | 'login') => {
      sessionStorage.setItem('portal-pending-application-job-id', jobId);
      sessionStorage.setItem('portal-login-role', 'candidate');
      setLoginRole('candidate');
      setAuthNotice(action === 'register'
        ? 'Buat akun kandidat menggunakan email aktif untuk melanjutkan lamaran.'
        : 'Masuk sebagai kandidat menggunakan email dan password akun Anda untuk melanjutkan lamaran.');
      setShowPublicHome(false);
      if (user && !isCandidateAccount) {
        setPublicView('career');
        await logout();
      }
      setPublicView(action);
    };
    const goToDashboard = () => {
      sessionStorage.setItem('portal-session-active', '1');
      setShowPublicHome(false);
      setPage(defaultPage);
      setPublicView('home');
    };
    const goToAccountProfile = () => {
      sessionStorage.setItem('portal-session-active', '1');
      setShowPublicHome(false);
      setPage('account-profile');
      setPublicView('home');
    };
    const goToPrk = () => {
      sessionStorage.setItem('portal-session-active', '1');
      setShowPublicHome(false);
      sessionStorage.setItem('portal:open-prk-form', '1');
      setPage('rt-employee-request');
      setPublicView('home');
    };
    const logoutToHome = () => {
      sessionStorage.removeItem('portal-login-role');
      sessionStorage.removeItem('portal-session-active');
      setLoginRole(null);
      setShowPublicHome(false);
      setPublicView('home');
      void logout();
    };
    switch (publicView) {
      case 'login':
        return (
          <LoginPage
            onBack={() => { setShowPublicHome(false); setPublicView('home'); }}
            mode={loginRole === 'candidate' ? 'candidate' : 'staff'}
            role={loginRole ?? 'admin'}
            roleTitle={loginRole === 'candidate' ? 'Kandidat / Pelamar' : loginRole === 'recruitment' ? 'Tim Recruitment' : loginRole === 'training' ? 'Tim Training' : loginRole === 'hr' ? 'Tim HR' : loginRole === 'comben' ? 'Tim Comben' : 'Admin'}
            initialNotice={authNotice}
            onRegisterClick={() => { setAuthNotice(''); setPublicView('register'); }}
          />
        );
      case 'register':
        return <RegisterPage
          mode={loginRole === 'candidate' ? 'candidate' : 'staff'}
          onBack={() => setPublicView('login')}
          onSuccess={(message) => {
            sessionStorage.removeItem('portal-session-active');
            setShowPublicHome(false);
            if (loginRole === 'candidate') {
              sessionStorage.setItem('portal-login-role', 'candidate');
              setLoginRole('candidate');
            }
            setAuthNotice(`${message} Silakan masuk menggunakan akun yang baru dibuat.`);
            setPublicView('login');
          }}
        />;
      case 'profile':
        return <CompanyProfilePage onNavigate={goPublic} onLoginClick={() => { setAuthNotice('Silakan login terlebih dahulu untuk membuka dashboard.'); setPublicView('login'); }} />;
      case 'career':
        return <CareerPage
          onNavigate={goPublic}
          onLoginClick={() => { setAuthNotice('Silakan login terlebih dahulu untuk membuka dashboard.'); setPublicView('login'); }}
          isAuthenticated={Boolean(user)}
          onCandidateAuthRequired={(jobId, action) => { void requestCandidateAuth(jobId, action); }}
        />;
      case 'contact':
        return <ContactPage onNavigate={goPublic} onLoginClick={() => { setAuthNotice('Silakan login terlebih dahulu untuk membuka dashboard.'); setPublicView('login'); }} />;
      case 'home':
      default:
        return <HomePage onNavigate={goPublic} onLoginClick={() => { if (user) goToDashboard(); else { setAuthNotice('Silakan login terlebih dahulu untuk mengakses dashboard.'); setPublicView('login'); } }} onRoleSelect={user ? selectWorkspaceRole : selectLoginRole} currentUser={user ? { name: user.name, role: getRoleLabel(effectiveAccessLevel) } : null} onProfileClick={user ? goToAccountProfile : undefined} onDashboardClick={user ? goToDashboard : undefined} onPrkClick={user ? goToPrk : undefined} onLogout={user ? logoutToHome : undefined} />;
    }
  }

  // Sesi dapat bertahan di localStorage setelah browser ditutup.
  // Jangan langsung membuka portal kandidat/dashboard ketika localhost dibuka;
  // tampilkan Beranda utama terlebih dahulu. Tombol Login akan melanjutkan
  // pengguna ke dashboard sesuai role sesi yang sudah aktif.
  const hasActiveSession = sessionStorage.getItem('portal-session-active') === '1';
  if (user && !hasActiveSession) {
    return (
      <HomePage
        onNavigate={(target) => setPublicView(target)}
        onLoginClick={() => {
          sessionStorage.setItem('portal-session-active', '1');
          setPage(defaultPage);
        }}
        onRoleSelect={selectWorkspaceRole}
        currentUser={{ name: user.name, role: getRoleLabel(effectiveAccessLevel) }}
        onProfileClick={() => {
          sessionStorage.setItem('portal-session-active', '1');
          setPage('account-profile');
        }}
        onDashboardClick={() => {
          sessionStorage.setItem('portal-session-active', '1');
          setPage(defaultPage);
        }}
        onPrkClick={() => {
          sessionStorage.setItem('portal-session-active', '1');
          sessionStorage.setItem('portal:open-prk-form', '1');
          setPage('rt-employee-request');
        }}
        onLogout={() => {
          sessionStorage.removeItem('portal-login-role');
          sessionStorage.removeItem('portal-session-active');
          setLoginRole(null);
          void logout();
        }}
      />
    );
  }

  // Hindari dashboard milik role lain sempat tampil saat sesi diarahkan ke
  // workspace yang benar.
  if (user && roleDashboardPages.has(page) && page !== defaultPage) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Membuka workspace Anda...</div>;
  }
  if (user && isCandidate && !page.startsWith('candidate-')) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Membuka portal kandidat...</div>;
  }

  // Kandidat tetap memakai modul portal kandidat sendiri, tetapi sekarang
  // dibungkus shell Layout yang sama agar header, sidebar, spacing, dan tombol
  // navigasinya konsisten dengan dashboard role lainnya.
  if (page === 'candidate-dashboard' && (isCandidate || dashboardRole === 'candidate')) {
    return (
      <Layout
        currentPage="candidate-dashboard"
        onNavigate={setPage}
        user={{ name: user.name, role: getRoleLabel(effectiveAccessLevel) }}
        accessLevel="candidate"
        notifications={notifications}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onNotificationsRead={markNotificationsRead}
        onProfileClick={() => setPage('account-profile')}
        onHomeClick={() => { setPublicView('home'); setShowPublicHome(true); }}
        onLogout={() => {
          sessionStorage.removeItem('portal-login-role');
          sessionStorage.removeItem('portal-session-active');
          setLoginRole(null);
          setShowPublicHome(false);
          setPublicView('home');
          void logout();
        }}
      >
        <CandidatePortalPage name={user.name} email={user.email} onNavigate={setPage} />
      </Layout>
    );
  }

  const viewOnly = user.accessLevel === 'atasan';

  const roleLabel = getRoleLabel(effectiveAccessLevel);
  const renderPage = () => {
    switch (page) {
      case 'candidate-dashboard': return <CandidatePortalPage name={user.name} email={user.email} onNavigate={setPage} />;
      case 'account-profile': return <AccountProfilePage user={user} onBack={() => setPage(defaultPage)} />;
      case 'candidate-positions': return <CandidateFeaturePage feature="positions" name={user.name} email={user.email} />;
      case 'candidate-applications': return <CandidateFeaturePage feature="applications" name={user.name} email={user.email} />;
      case 'candidate-psychotest': return <CandidateFeaturePage feature="psychotest" name={user.name} email={user.email} />;
      case 'candidate-interviews': return <CandidateFeaturePage feature="interviews" name={user.name} email={user.email} />;
      case 'candidate-tracking': return <CandidateFeaturePage feature="tracking" name={user.name} email={user.email} />;
      case 'rt-dashboard': return <RecruitmentDashboardPage name={user.name} onNavigate={setPage} />;
      case 'training-dashboard': return <TrainingDashboardPage name={user.name} onNavigate={setPage} />;
      case 'hr-weekly': return <WeeklyReportPage />;
      case 'hr-activities': return <EmployeeActivitiesPage />;
      case 'hr-admin': return <EmployeeAdminPage />;
      case 'hr-employee-data': return <EmployeeDataPage />;
      case 'hr-demographics': return <WorkforceDemographicsPage />;
      case 'hr-personnel-actions': return <PersonnelActionsPage />;
      case 'hr-resign': return <ResignReasonPage />;
      case 'hr-discipline': return <DisciplinePage />;
      case 'hr-travel': return <TravelAdminPage />;
      case 'rt-recruitment': return <RecruitmentPage />;
      case 'rt-job-openings': return <JobOpeningsAdminPage />;
      case 'rt-applicants': return <JobApplicantsPage onNavigate={setPage} />;
      case 'rt-training': return <TrainingPage />;
      case 'rt-interview-schedule': return <InterviewSchedulePage onNavigate={setPage} />;
      case 'rt-recruitment-recap': return <RecruitmentRecapPage />;
      case 'rt-training-recap': return <TrainingRecapPage />;
      case 'rt-talent-pool': return <TalentPoolPage />;
      case 'rt-pipeline': return <CandidatePipelinePage onNavigate={setPage} />;
      case 'rt-assessment': return <AssessmentPage />;
      case 'rt-offering': return <OfferingPage />;
      case 'rt-onboarding': return <OnboardingPage />;
      case 'rt-sources': return <RecruitmentSourcesPage />;
      case 'rt-templates': return <MessageTemplatesPage />;
      case 'rt-analytics': return <RecruitmentAnalyticsPage />;
      case 'rt-gallery': return <GalleryPage />;
      case 'cb-incentive': return <IncentivePage />;
      case 'cb-documentation': return <DocumentationPage />;
      case 'rt-employee-request': return <EmployeeRequestPage accessLevel={effectiveAccessLevel} />;
      case 'cb-salary-recap': return <SalaryRecapPage />;
      default:
        if (dashboardRole === 'candidate') return <CandidatePortalPage name={user.name} email={user.email} onNavigate={setPage} />;
        if (dashboardRole === 'training') return <TrainingDashboardPage name={user.name} onNavigate={setPage} />;
        if (dashboardRole === 'recruitment') return <RecruitmentDashboardPage name={user.name} onNavigate={setPage} />;
        if (dashboardRole === 'hr') return <EmployeeAdminPage />;
        if (dashboardRole === 'comben') return <IncentivePage />;
        return <RecruitmentDashboardPage name={user.name} onNavigate={setPage} />;
    }
  };

  return (
    <Layout
      currentPage={page}
      onNavigate={setPage}
      user={{ name: user.name, role: roleLabel }}
      // Jika role profil lama tidak dikenali, dashboard fallback sudah
      // mengarahkan pengguna ke Recruitment; tampilkan menu workspace itu juga.
      accessLevel={normalizePortalRole(effectiveAccessLevel) === 'unknown' ? 'recruitment' : effectiveAccessLevel}
      viewOnly={viewOnly && !selectedLoginRole}
      notifications={notifications}
      isDarkMode={isDarkMode}
      onToggleTheme={toggleTheme}
      onNotificationsRead={markNotificationsRead}
      onProfileClick={() => setPage('account-profile')}
      onHomeClick={() => { setPublicView('home'); setShowPublicHome(true); }}
      onLogout={() => {
        sessionStorage.removeItem('portal-login-role');
        sessionStorage.removeItem('portal-session-active');
        setLoginRole(null);
        setShowPublicHome(false);
        setPublicView('home');
        void logout();
      }}
    >
      {renderPage()}
    </Layout>
  );
}
