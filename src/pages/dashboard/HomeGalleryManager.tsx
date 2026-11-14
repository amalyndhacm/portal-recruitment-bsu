import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, Loader2, Plus, Trash2, UploadCloud, Video } from 'lucide-react';
import { Card, Button, Input } from '@/components/ui';
import {
  deleteHomeGalleryItem,
  fetchPublishedHomeGallery,
  updateHomeGalleryAlbumBackground,
  uploadHomeGalleryAlbumBackground,
  uploadHomeGalleryFile,
  type HomeGalleryItem,
} from '@/lib/homeGallery';
import { notifyPortal } from '@/lib/portalNotifications';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
type UploadMode = 'existing' | 'new';

type AlbumSummary = {
  title: string;
  caption: string;
  color: string;
  backgroundUrl: string | null;
  count: number;
};

export default function HomeGalleryManager() {
  const [items, setItems] = useState<HomeGalleryItem[]>([]);
  const [uploadMode, setUploadMode] = useState<UploadMode>('existing');
  const [selectedAlbum, setSelectedAlbum] = useState('');
  const [newAlbumTitle, setNewAlbumTitle] = useState('');
  const [newAlbumCaption, setNewAlbumCaption] = useState('');
  const [newAlbumColor, setNewAlbumColor] = useState('#2FB4C4');
  const [albumBackgroundFile, setAlbumBackgroundFile] = useState<File | null>(null);
  const [sortOrder, setSortOrder] = useState('0');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const albums = useMemo<AlbumSummary[]>(() => {
    const albumMap = new Map<string, AlbumSummary>();
    items.forEach((item) => {
      const existing = albumMap.get(item.album_title);
      if (existing) {
        existing.count += 1;
      } else {
        albumMap.set(item.album_title, {
          title: item.album_title,
          caption: item.album_caption || '',
          color: item.accent_color,
          backgroundUrl: item.album_background_url || null,
          count: 1,
        });
      }
    });
    return Array.from(albumMap.values());
  }, [items]);

  const refresh = async () => {
    setLoading(true);
    const nextItems = await fetchPublishedHomeGallery();
    setItems(nextItems);
    setSelectedAlbum((current) => current || nextItems[0]?.album_title || '');
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);

  const activeAlbum = albums.find((album) => album.title === selectedAlbum);
  const albumTitle = uploadMode === 'existing' ? selectedAlbum : newAlbumTitle;
  const albumCaption = uploadMode === 'existing' ? (activeAlbum?.caption || '') : newAlbumCaption;
  const accentColor = uploadMode === 'existing' ? (activeAlbum?.color || '#2FB4C4') : newAlbumColor;

  const chooseUploadMode = (mode: UploadMode) => {
    setUploadMode(mode);
    setFiles([]);
    setMessage(null);
    if (mode === 'existing' && !selectedAlbum && albums[0]) setSelectedAlbum(albums[0].title);
  };

  const handleUpload = async () => {
    setMessage(null);
    if (uploadMode === 'existing' && !selectedAlbum) {
      setMessage({ type: 'error', text: 'Pilih album tujuan terlebih dahulu, atau pilih Buat album baru.' });
      return;
    }
    if (uploadMode === 'new' && !newAlbumTitle.trim()) {
      setMessage({ type: 'error', text: 'Nama album baru wajib diisi.' });
      return;
    }
    if (!files.length) {
      setMessage({ type: 'error', text: 'Pilih minimal satu foto atau video.' });
      return;
    }
    const invalid = files.find((file) => !file.type.startsWith('image/') && !file.type.startsWith('video/'));
    if (invalid) { setMessage({ type: 'error', text: `${invalid.name} bukan foto atau video.` }); return; }
    const tooLarge = files.find((file) => file.size > MAX_FILE_SIZE);
    if (tooLarge) { setMessage({ type: 'error', text: `${tooLarge.name} melebihi 25 MB.` }); return; }
    if (albumBackgroundFile && (!albumBackgroundFile.type.startsWith('image/') || albumBackgroundFile.size > MAX_FILE_SIZE)) {
      setMessage({ type: 'error', text: 'Background album harus berupa gambar maksimal 25 MB.' });
      return;
    }

    setUploading(true);
    try {
      const backgroundUrl = albumBackgroundFile
        ? await uploadHomeGalleryAlbumBackground(albumBackgroundFile)
        : (uploadMode === 'existing' ? activeAlbum?.backgroundUrl : null);
      const startOrder = Number(sortOrder) || 0;
      for (const [index, file] of files.entries()) {
        await uploadHomeGalleryFile({ file, albumTitle, albumCaption, accentColor, sortOrder: startOrder + index, albumBackgroundUrl: backgroundUrl });
      }
      if (backgroundUrl) await updateHomeGalleryAlbumBackground(albumTitle, backgroundUrl);
      const uploadedCount = files.length;
      setFiles([]);
      setAlbumBackgroundFile(null);
      setSortOrder('0');
      if (uploadMode === 'new') {
        setNewAlbumTitle('');
        setNewAlbumCaption('');
      }
      setMessage({
        type: 'success',
        text: `${uploadedCount} media berhasil ditambahkan ke album "${albumTitle}".`,
      });
      notifyPortal('Galeri diperbarui', `${uploadedCount} media berhasil diunggah ke album "${albumTitle}"${backgroundUrl ? ' dan background album diperbarui' : ''}.`);
      await refresh();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Upload gagal. Periksa koneksi dan izin Supabase Storage.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: HomeGalleryItem) => {
    if (!window.confirm(`Hapus media "${item.file_name}" dari Beranda?`)) return;
    setDeletingId(item.id);
    setMessage(null);
    try {
      await deleteHomeGalleryItem(item);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Media gagal dihapus.' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="overflow-hidden border-sky-100">
      <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600"><ImagePlus size={21} /></div>
          <div>
            <p className="section-kicker">Konten Beranda</p>
            <h3 className="mt-1 font-display text-xl font-semibold text-slate-900">Kelola Galeri Kegiatan</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Pilih album yang sudah ada untuk menambahkan beberapa foto/video, atau buat album baru untuk kegiatan yang berbeda.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">1. Tentukan album</p>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button type="button" onClick={() => chooseUploadMode('existing')} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${uploadMode === 'existing' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Album sudah ada</button>
              <button type="button" onClick={() => chooseUploadMode('new')} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${uploadMode === 'new' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Plus size={14} className="mr-1 inline" />Album baru</button>
            </div>
          </div>

          {uploadMode === 'existing' ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Pilih album tujuan <span className="text-red-500">*</span></label>
              {albums.length > 0 ? <select value={selectedAlbum} onChange={(e) => setSelectedAlbum(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"><option value="">-- Pilih album --</option>{albums.map((album) => <option key={album.title} value={album.title}>{album.title} ({album.count} media)</option>)}</select> : <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500">Belum ada album. Pilih <button type="button" onClick={() => chooseUploadMode('new')} className="font-bold text-sky-700 underline">Album baru</button> untuk memulai.</div>}
              {activeAlbum && <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">Media baru akan masuk ke <strong>{activeAlbum.title}</strong>. Album ini sudah berisi {activeAlbum.count} media.</p>}
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-sky-100 bg-sky-50/50 p-4">
              <Input label="Nama album baru" value={newAlbumTitle} onChange={setNewAlbumTitle} placeholder="Contoh: Gathering Karyawan 2026" required />
              <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Deskripsi album</label><textarea value={newAlbumCaption} onChange={(e) => setNewAlbumCaption(e.target.value)} placeholder="Ringkasan singkat kegiatan" rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500" /></div>
              <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Warna album</label><input type="color" value={newAlbumColor} onChange={(e) => setNewAlbumColor(e.target.value)} className="h-10 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1" /></div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Background slide album <span className="font-normal text-slate-400">(opsional)</span></p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Gambar ini hanya dipakai saat card album dibuka dan slide ditampilkan. Disarankan gambar memanjang.</p>
            <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 transition hover:border-sky-400 hover:bg-sky-50">
              <UploadCloud size={19} className="shrink-0 text-sky-600" />
              <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-700">{albumBackgroundFile ? 'Background baru siap dipakai' : 'Pilih background untuk album ini'}</span><span className="block truncate text-[11px] text-slate-400">{albumBackgroundFile?.name || (activeAlbum?.backgroundUrl ? 'Background album sudah tersedia · pilih file untuk mengganti' : 'JPG, PNG, WEBP · maksimal 25 MB')}</span></span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { setAlbumBackgroundFile(e.target.files?.[0] || null); e.currentTarget.value = ''; }} />
            </label>
            {(albumBackgroundFile || activeAlbum?.backgroundUrl) && <div className="mt-3 flex items-center gap-3 rounded-lg bg-white p-2"><div className="h-12 w-20 overflow-hidden rounded-md bg-black">{activeAlbum?.backgroundUrl && !albumBackgroundFile && <img src={activeAlbum.backgroundUrl} alt="Background album saat ini" className="h-full w-full object-cover" />}</div><p className="text-[11px] text-slate-500">{albumBackgroundFile ? 'Akan digunakan untuk media yang diupload sekarang.' : 'Background saat ini akan digunakan.'}</p></div>}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">2. Pilih foto atau video</p>
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-sky-400 hover:bg-sky-50">
              <UploadCloud className="mb-2 text-sky-600" size={24} />
              <span className="text-sm font-semibold text-slate-700">Pilih beberapa file sekaligus</span>
              <span className="mt-1 text-xs text-slate-400">Semua file akan masuk ke album yang dipilih · maksimal 25 MB/file</span>
              <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            </label>
            {files.length > 0 && <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{files.length} file siap diupload ke album <strong>{albumTitle || 'baru'}</strong>.</div>}
          </div>

          <div className="grid grid-cols-2 gap-3"><Input label="Urutan tampil" type="number" value={sortOrder} onChange={setSortOrder} placeholder="0" /><div className="flex items-end pb-1 text-xs leading-5 text-slate-400">Angka lebih kecil akan tampil lebih dahulu.</div></div>
          <Button onClick={() => void handleUpload()} disabled={uploading || (uploadMode === 'existing' && !albums.length)} className="inline-flex items-center gap-2"><UploadCloud size={16} />{uploading ? 'Mengunggah...' : uploadMode === 'existing' ? 'Tambahkan ke Album' : 'Buat Album & Upload'}</Button>
          {message && <p className={`rounded-lg px-3 py-2 text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{message.text}</p>}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-semibold text-slate-800">Media aktif di Beranda</p><p className="text-xs text-slate-400">{albums.length} album · {items.length} media tersimpan</p></div></div>
          {loading ? <div className="flex items-center justify-center rounded-xl bg-slate-50 p-10 text-sm text-slate-400"><Loader2 className="mr-2 animate-spin" size={16} />Memuat galeri...</div> : items.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-400">Belum ada media yang diupload.</div> : <div className="grid max-h-[420px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">{items.map((item) => <div key={item.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="relative aspect-[4/3] bg-slate-100">{item.media_type === 'video' ? <><video src={item.file_url} muted className="h-full w-full object-cover" /><span className="absolute left-2 top-2 rounded-full bg-slate-900/70 px-2 py-1 text-[10px] font-bold text-white"><Video size={11} className="mr-1 inline" />VIDEO</span></> : <img src={item.file_url} alt={item.file_name} className="h-full w-full object-cover" loading="lazy" />}<button type="button" onClick={() => void handleDelete(item)} disabled={deletingId === item.id} aria-label={`Hapus ${item.file_name}`} className="absolute right-2 top-2 rounded-lg bg-white/90 p-2 text-red-600 opacity-0 shadow transition group-hover:opacity-100 hover:bg-red-50 disabled:opacity-50"><Trash2 size={15} /></button></div><div className="p-3"><p className="truncate text-xs font-bold text-slate-800">{item.album_title}</p><p className="mt-1 truncate text-[11px] text-slate-400">{item.file_name}</p></div></div>)}</div>}
        </div>
      </div>
    </Card>
  );
}
