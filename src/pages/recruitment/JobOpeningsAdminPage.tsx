import { useEffect, useState } from 'react';
import { Briefcase, Trash2, Pencil, Star, ImagePlus, UploadCloud, Plus, RotateCcw } from 'lucide-react';
import {
  buildPublicJobDetails,
  fetchAllJobOpenings,
  updateJobOpening,
  deleteJobOpening,
  toggleJobOpeningActive,
  canPublishJobOpening,
  type JobOpening,
  type JobOpeningInput,
} from '@/lib/jobOpenings';
import { db, type EmployeeRequest } from '@/lib/database';
import { PageHeader, Card, Button, Input, Select, TextArea, LoadingState, EmptyState, Badge } from '@/components/ui';
import { notifyPortal } from '@/lib/portalNotifications';

const COLOR_LABELS = ['Sky (biru muda)', 'Emerald (hijau)', 'Amber (kuning)', 'Rose (merah muda)', 'Navy (biru tua)'];

const emptyForm = {
  title: '',
  division: '',
  location: '',
  type: 'Full-time',
  deadline: '',
  colorLabel: COLOR_LABELS[0],
  description: '',
  responsibilities: [] as string[],
  qualifications: [] as string[],
  benefits: [] as string[],
  featured: false,
  isActive: false,
};

type FormState = typeof emptyForm;

function toInput(form: FormState): JobOpeningInput {
  return {
    title: form.title,
    division: form.division,
    location: form.location,
    type: form.type,
    deadline: form.deadline,
    colorIndex: COLOR_LABELS.indexOf(form.colorLabel) as 0 | 1 | 2 | 3 | 4,
    description: form.description.trim(),
    responsibilities: form.responsibilities.map((s) => s.trim()).filter(Boolean),
    qualifications: form.qualifications.map((s) => s.trim()).filter(Boolean),
    benefits: form.benefits.map((s) => s.trim()).filter(Boolean),
    featured: form.featured,
    isActive: form.isActive,
  };
}

function fromOpening(o: JobOpening): FormState {
  return {
    title: o.title,
    division: o.division,
    location: o.location,
    type: o.type,
    deadline: o.deadline,
    colorLabel: COLOR_LABELS[o.colorIndex] ?? COLOR_LABELS[0],
    description: o.description || '',
    responsibilities: [...(o.responsibilities || [])],
    qualifications: [...(o.qualifications || [])],
    benefits: [...(o.benefits || [])],
    featured: o.featured,
    isActive: o.isActive,
  };
}

function PointListEditor({ label, items, onChange, placeholder, addLabel, emptyMessage }: { label: string; items: string[]; onChange: (items: string[]) => void; placeholder: string; addLabel: string; emptyMessage: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-800">{label}</h4>
        <button type="button" onClick={() => onChange([...items, ''])} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-50">
          <Plus size={14} /> {addLabel}
        </button>
      </div>
      {items.length ? (
        <div className="mt-3 space-y-2">
          {items.map((item, index) => (
            <div key={`${label}-${index}`} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-center text-xs font-semibold text-slate-400">{index + 1}.</span>
              <input value={item} onChange={(event) => onChange(items.map((current, currentIndex) => currentIndex === index ? event.target.value : current))} placeholder={placeholder} className="input min-w-0 flex-1 bg-white text-sm" aria-label={`${label} poin ${index + 1}`} />
              <button type="button" onClick={() => onChange(items.filter((_, currentIndex) => currentIndex !== index))} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600" aria-label={`Hapus ${label} poin ${index + 1}`}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : <p className="mt-3 text-xs text-slate-500">{emptyMessage}</p>}
    </section>
  );
}

export default function JobOpeningsAdminPage() {
  const [items, setItems] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadingPrkSource, setLoadingPrkSource] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setItems(await fetchAllJobOpenings());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = (o: JobOpening) => {
    setEditingId(o.id);
    setForm(fromOpening(o));
    setShowForm(true);
  };

  // Mengecek `error` dari hasil update dan menampilkannya
  // lewat alert, supaya kegagalan (RLS, permission, dsb) tidak lagi diam-diam
  // gagal tanpa pesan apapun ke pengguna.
  const submit = async () => {
    if (!form.title || !form.division || !form.location || !form.deadline) {
      alert('Judul Posisi, Divisi, Lokasi, dan Batas Lamar wajib diisi.');
      return;
    }
    if (!editingId) {
      alert('Lowongan hanya dapat disiapkan dari PRK yang sudah selesai approval.');
      return;
    }
    if (form.isActive) {
      const eligibility = await canPublishJobOpening(editingId);
      if (!eligibility.allowed) {
        alert(eligibility.reason);
        return;
      }
      if (!items.find((item) => item.id === editingId)?.flyerUrl) {
        alert('Upload flyer pada lowongan terlebih dahulu sebelum dipublikasikan.');
        return;
      }
    }
    setSaving(true);
    const input = toInput(form);
    let error: { message: string } | null = null;
    try {
      const result = await updateJobOpening(editingId, input);
      error = result.error;
    } catch (caught) {
      error = { message: (caught as Error).message };
    }
    setSaving(false);

    if (error) {
      alert('Gagal menyimpan lowongan: ' + error.message);
      return;
    }

    setShowForm(false);
    setForm(emptyForm);
    setEditingId(null);
    notifyPortal(form.isActive ? 'Lowongan dipublikasikan' : 'Lowongan diperbarui', `${form.title} ${form.isActive ? 'sekarang aktif dan dapat dilihat publik.' : 'berhasil disimpan sebagai draft.'}`);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Hapus lowongan ini? Data kandidat yang sudah melamar tidak akan ikut terhapus.')) return;
    const { error } = await deleteJobOpening(id);
    if (error) {
      alert('Gagal menghapus lowongan: ' + error.message);
      return;
    }
    load();
  };

  const toggleActive = async (o: JobOpening) => {
    if (!o.isActive) {
      const eligibility = await canPublishJobOpening(o.id);
      if (!eligibility.allowed) {
        alert(eligibility.reason);
        return;
      }
    }
    if (!o.isActive && !o.flyerUrl) {
      alert('Upload flyer terlebih dahulu sebelum membuka lowongan ke publik.');
      return;
    }
    const { error } = await toggleJobOpeningActive(o.id, !o.isActive);
    if (error) {
      alert('Gagal mengubah status: ' + error.message);
      return;
    }
    notifyPortal(o.isActive ? 'Lowongan dinonaktifkan' : 'Lowongan dipublikasikan', `${o.title} ${o.isActive ? 'dikembalikan menjadi draft.' : 'sekarang aktif dan dapat dilihat publik.'}`);
    load();
  };

  const importFromPrk = async () => {
    if (!editingId) return;
    if (!confirm('Ambil ulang ringkasan, kualifikasi, dan tugas dari PRK? Perubahan manual pada tiga bagian tersebut akan diganti; benefit tidak berubah.')) return;
    setLoadingPrkSource(true);
    try {
      const { data, error } = await db
        .from('employee_requests')
        .select('*')
        .eq('linked_job_opening_id', editingId)
        .is('trashed_at', null)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        alert('PRK terkait tidak ditemukan. Isi atau edit bagian lowongan secara manual.');
        return;
      }
      const details = buildPublicJobDetails(data as EmployeeRequest);
      setForm((current) => ({
        ...current,
        description: details.description,
        qualifications: details.qualifications,
        responsibilities: details.responsibilities,
      }));
      notifyPortal('Data PRK dimuat', 'Ringkasan, kualifikasi, dan tugas dapat diedit sebelum lowongan disimpan.');
    } catch (error) {
      alert('Gagal mengambil data PRK: ' + (error as Error).message);
    } finally {
      setLoadingPrkSource(false);
    }
  };

  const uploadFlyer = async (opening: JobOpening, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Flyer harus berupa file gambar.'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Ukuran flyer maksimal 5 MB.'); return; }
    setUploadingId(opening.id);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const path = `${opening.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await db.storage.from('job-flyers').upload(path, file, { upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = db.storage.from('job-flyers').getPublicUrl(path);
      const { error: updateError } = await db.from('job_openings').update({ flyer_url: data.publicUrl, flyer_name: file.name }).eq('id', opening.id);
      if (updateError) throw updateError;
      notifyPortal('Flyer lowongan diunggah', `Flyer untuk lowongan ${opening.title} berhasil diunggah.`);
      load();
    } catch (error) {
      alert('Gagal mengunggah flyer: ' + (error as Error).message);
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Kelola Lowongan"
        subtitle="Lowongan dibuat dari PRK yang sudah selesai approval. Upload flyer dan atur status publikasi dari sini."
        icon={<Briefcase className="w-6 h-6 text-sky-600" />}
      />

      <div className="mb-6">
        {!showForm ? (
          <p className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            Lowongan baru hanya dapat disiapkan dari PRK yang pengajuannya sudah selesai approval.
          </p>
        ) : (
          <Card className="p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">Edit Lowongan</h3>
                <p className="mt-1 text-xs text-slate-500">Data dapat diambil dari PRK lalu diedit, ditambah, atau dihapus sebelum disimpan.</p>
              </div>
              <Button variant="secondary" disabled={loadingPrkSource} onClick={() => void importFromPrk()}>
                <RotateCcw className="mr-1.5 inline h-4 w-4" />{loadingPrkSource ? 'Mengambil data…' : 'Ambil otomatis dari PRK'}
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input label="Judul Posisi" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
              <Input label="Divisi" value={form.division} onChange={(v) => setForm({ ...form, division: v })} required />
              <Input label="Lokasi" value={form.location} onChange={(v) => setForm({ ...form, location: v })} required />
              <Input label="Tipe" value={form.type} onChange={(v) => setForm({ ...form, type: v })} />
              <Input
                label="Batas Lamar"
                placeholder="Contoh: 30 September 2026"
                value={form.deadline}
                onChange={(v) => setForm({ ...form, deadline: v })}
                required
              />
              <Select label="Warna Kartu" value={form.colorLabel} onChange={(v) => setForm({ ...form, colorLabel: v })} options={COLOR_LABELS} />
            </div>
            <div className="mb-4 space-y-4">
              <PointListEditor
                label="Tugas & tanggung jawab"
                items={form.responsibilities}
                onChange={(responsibilities) => setForm((current) => ({ ...current, responsibilities }))}
                placeholder="Tuliskan satu tugas atau tanggung jawab"
                addLabel="Tambah tugas"
                emptyMessage="Belum ada tugas. Tambahkan manual atau ambil ulang dari PRK."
              />
              <TextArea
                label="Deskripsi singkat posisi"
                value={form.description}
                onChange={(v) => setForm({ ...form, description: v })}
              />
              <PointListEditor
                label="Kualifikasi & persyaratan"
                items={form.qualifications}
                onChange={(qualifications) => setForm((current) => ({ ...current, qualifications }))}
                placeholder="Tuliskan satu kualifikasi atau persyaratan"
                addLabel="Tambah kualifikasi"
                emptyMessage="Belum ada kualifikasi. Tambahkan manual atau ambil ulang dari PRK."
              />
              <PointListEditor
                label="Benefit & fasilitas (opsional)"
                items={form.benefits}
                onChange={(benefits) => setForm((current) => ({ ...current, benefits }))}
                placeholder="Contoh: BPJS Kesehatan dan Ketenagakerjaan"
                addLabel="Tambah benefit"
                emptyMessage="Benefit belum dicantumkan. Tambahkan hanya jika sudah dipastikan."
              />
              <p className="-mt-2 text-xs text-slate-500">Benefit diisi manual sesuai kebijakan yang benar-benar berlaku; bagian ini tidak diambil dari alasan internal PRK.</p>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                Tampilkan di ringkasan Beranda
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Aktif (tampil di halaman publik)
              </label>
            </div>
            <p className="mb-4 text-xs text-slate-500">Untuk membuka lowongan baru, selesaikan approval PRK terlebih dahulu lalu siapkan lowongan dari detail PRK. Lowongan tanpa PRK atau dengan PRK yang belum selesai hanya dapat disimpan sebagai draft.</p>
            <div className="flex gap-2">
              <Button onClick={submit} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Batal
              </Button>
            </div>
          </Card>
        )}
      </div>

      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <Card className="p-6">
          <EmptyState message="Belum ada lowongan. Selesaikan approval PRK dan siapkan lowongan dari detail pengajuan PRK." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Posisi</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Divisi</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Lokasi</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Batas Lamar</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Flyer</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {o.title}
                      {o.featured && <Star className="inline h-3.5 w-3.5 ml-1.5 text-amber-400" />}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{o.division}</td>
                    <td className="px-4 py-3 text-slate-600">{o.location}</td>
                    <td className="px-4 py-3 text-slate-600">{o.deadline}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {o.flyerUrl ? <a href={o.flyerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"><ImagePlus className="h-4 w-4" />Lihat flyer</a> : <span className="text-xs text-slate-400">Belum ada</span>}
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"><UploadCloud className="h-3.5 w-3.5" />{uploadingId === o.id ? 'Mengunggah...' : 'Upload'}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingId === o.id} onChange={(e) => { void uploadFlyer(o, e.target.files?.[0]); e.currentTarget.value = ''; }} /></label>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge text={o.isActive ? 'Aktif' : 'Draft'} color={o.isActive ? 'green' : 'slate'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant={o.isActive ? 'secondary' : 'primary'}
                          className="!px-2.5 !py-1.5 whitespace-nowrap text-xs"
                          disabled={uploadingId === o.id}
                          onClick={() => void toggleActive(o)}
                        >
                          {o.isActive ? 'Nonaktifkan → Draft' : 'Publikasikan'}
                        </Button>
                        <button onClick={() => openEdit(o)} className="p-1.5 text-slate-400 hover:text-sky-600">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(o.id)} className="p-1.5 text-slate-300 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
