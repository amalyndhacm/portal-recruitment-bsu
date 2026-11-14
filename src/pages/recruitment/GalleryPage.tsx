import { Images } from 'lucide-react';
import { PageHeader } from '@/components/ui';
import HomeGalleryManager from '@/components/dashboard/HomeGalleryManager';

export default function GalleryPage() {
  return (
    <div>
      <PageHeader
        title="Galeri"
        subtitle="Kelola foto dan video kegiatan yang ditampilkan pada halaman Beranda."
        icon={<Images className="h-6 w-6 text-sky-600" />}
      />
      <HomeGalleryManager />
    </div>
  );
}
