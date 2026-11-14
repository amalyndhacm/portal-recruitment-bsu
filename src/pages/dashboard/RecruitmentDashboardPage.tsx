import type { PageId } from '@/components/Layout';
import RoleDashboardPage from '@/pages/dashboard/RoleDashboardPage';

export default function RecruitmentDashboardPage({ name, onNavigate }: { name: string; onNavigate: (page: PageId) => void }) {
  return <RoleDashboardPage role="recruitment" name={name} onNavigate={onNavigate} />;
}
