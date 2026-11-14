import { db } from '@/lib/database';

export const HOME_GALLERY_BUCKET = 'home-gallery';

export type HomeGalleryItem = {
  id: string;
  album_title: string;
  album_caption: string | null;
  accent_color: string;
  media_type: 'photo' | 'video';
  file_url: string;
  file_name: string;
  album_background_url: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
};

export type HomeGalleryBackground = {
  id: string;
  file_url: string;
  file_name: string;
  storage_path?: string;
  updated_at: string;
};

export async function fetchPublishedHomeGallery(): Promise<HomeGalleryItem[]> {
  const { data, error } = await db
    .from('home_gallery_items')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Galeri beranda belum dapat dimuat:', error.message);
    return [];
  }
  return (data ?? []) as HomeGalleryItem[];
}

export async function uploadHomeGalleryFile(params: {
  file: File;
  albumTitle: string;
  albumCaption: string;
  accentColor: string;
  sortOrder: number;
  albumBackgroundUrl?: string | null;
}) {
  const safeName = params.file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const path = `${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await db.storage
    .from(HOME_GALLERY_BUCKET)
    .upload(path, params.file, { upsert: false, contentType: params.file.type });

  if (uploadError) throw uploadError;
  const { data: publicData } = db.storage.from(HOME_GALLERY_BUCKET).getPublicUrl(path);
  const { error: insertError } = await db.from('home_gallery_items').insert({
    album_title: params.albumTitle.trim(),
    album_caption: params.albumCaption.trim() || null,
    accent_color: params.accentColor,
    media_type: params.file.type.startsWith('video/') ? 'video' : 'photo',
    file_url: publicData.publicUrl,
    file_name: params.file.name,
    album_background_url: params.albumBackgroundUrl || null,
    sort_order: params.sortOrder,
    is_published: true,
  });

  if (insertError) {
    await db.storage.from(HOME_GALLERY_BUCKET).remove([path]);
    throw insertError;
  }
}

export async function deleteHomeGalleryItem(item: HomeGalleryItem) {
  const markers = [`/storage/v1/object/public/${HOME_GALLERY_BUCKET}/`, `/uploads/${HOME_GALLERY_BUCKET}/`];
  const marker = markers.find((value) => item.file_url.includes(value));
  const storagePath = marker
    ? decodeURIComponent(item.file_url.split(marker)[1].split('?')[0])
    : null;
  const { error } = await db.from('home_gallery_items').delete().eq('id', item.id);
  if (error) throw error;
  if (storagePath) await db.storage.from(HOME_GALLERY_BUCKET).remove([storagePath]);
}

export async function uploadHomeGalleryAlbumBackground(file: File) {
  const path = `album-backgrounds/${crypto.randomUUID()}-${file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')}`;
  const { error } = await db.storage.from(HOME_GALLERY_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return db.storage.from(HOME_GALLERY_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function updateHomeGalleryAlbumBackground(albumTitle: string, backgroundUrl: string) {
  const { error } = await db
    .from('home_gallery_items')
    .update({ album_background_url: backgroundUrl })
    .eq('album_title', albumTitle);
  if (error) throw error;
}

export async function fetchHomeGalleryBackground(): Promise<HomeGalleryBackground | null> {
  const { data, error } = await db
    .from('home_gallery_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();
  if (error) {
    console.warn('Background galeri belum dapat dimuat:', error.message);
    return null;
  }
  return data as HomeGalleryBackground | null;
}

export async function uploadHomeGalleryBackground(file: File) {
  const previous = await fetchHomeGalleryBackground();
  const path = `background/${crypto.randomUUID()}-${file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')}`;
  const { error: uploadError } = await db.storage
    .from(HOME_GALLERY_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (uploadError) throw uploadError;

  const { data: publicData } = db.storage.from(HOME_GALLERY_BUCKET).getPublicUrl(path);
  const { error: saveError } = await db.from('home_gallery_settings').upsert({
    id: 'default',
    file_url: publicData.publicUrl,
    file_name: file.name,
    storage_path: path,
    updated_at: new Date().toISOString(),
  });
  if (saveError) {
    await db.storage.from(HOME_GALLERY_BUCKET).remove([path]);
    throw saveError;
  }
  if (previous?.storage_path) await db.storage.from(HOME_GALLERY_BUCKET).remove([previous.storage_path]);
  return { id: 'default', file_url: publicData.publicUrl, file_name: file.name, updated_at: new Date().toISOString() } as HomeGalleryBackground;
}
