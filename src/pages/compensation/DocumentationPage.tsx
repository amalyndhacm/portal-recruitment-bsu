import { useEffect, useState, useRef } from 'react';
import { Upload, Plus, Trash2, File, Image, Link2 } from 'lucide-react';
import { db, type DocumentationUpload } from '@/lib/database';
import { PageHeader, Card, Button, Input, Select, TextArea, LoadingState, EmptyState, Badge } from '@/components/ui';

const DIVISIONS = ['HR', 'Recruitment & Training', 'Compensation & Benefit'];
const DOC_TYPES = ['Foto', 'Dokumen', 'Laporan', 'Sertifikat', 'Video', 'Lainnya'];

export default function DocumentationPage() {
  const [items, setItems] = useState<DocumentationUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', division: '', doc_type: '', description: '', file_url: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await db.from('documentation_uploads').select('*').order('uploaded_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, file_url: reader.result as string, title: prev.title || file.name }));
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!form.title) return;
    await db.from('documentation_uploads').insert(form);
    setForm({ title: '', division: '', doc_type: '', description: '', file_url: '' });
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    await db.from('documentation_uploads').delete().eq('id', id);
    load();
  };

  const isImage = (url: string | null) => url && (url.startsWith('data:image') || url.match(/\.(jpg|jpeg|png|gif|webp)$/i));

  return (
    <div>
      <PageHeader
        title="Upload Dokumentasi"
        subtitle="Upload dokumentasi kegiatan dari seluruh divisi"
        icon={<Upload className="w-6 h-6 text-sky-600" />}
      />

      <div className="mb-6">
        {!showForm ? (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 inline mr-1" /> Upload Dokumentasi
          </Button>
        ) : (
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Dokumentasi Baru</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input label="Judul" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
              <Select label="Divisi" value={form.division} onChange={(v) => setForm({ ...form, division: v })} options={DIVISIONS} />
              <Select label="Jenis Dokumen" value={form.doc_type} onChange={(v) => setForm({ ...form, doc_type: v })} options={DOC_TYPES} />
            </div>
            <div className="mb-4">
              <TextArea label="Deskripsi" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">File Dokumentasi</label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  className="hidden"
                />
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 inline mr-1" /> Pilih File
                </Button>
                {form.file_url && <span className="text-sm text-green-600">File terpilih</span>}
              </div>
              <p className="text-xs text-slate-400 mt-2">Atau tempelkan tautan (URL) di bawah ini</p>
              <div className="mt-2">
                <Input label="" value={form.file_url.startsWith('data:') ? '' : form.file_url} onChange={(v) => setForm({ ...form, file_url: v })} placeholder="https://..." />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={submit}>Simpan</Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>Batal</Button>
            </div>
          </Card>
        )}
      </div>

      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <Card className="p-6"><EmptyState message="Belum ada dokumentasi" /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((d) => (
            <Card key={d.id} className="overflow-hidden hover:shadow-md transition-shadow group">
              <div className="aspect-video bg-slate-100 flex items-center justify-center overflow-hidden">
                {isImage(d.file_url) ? (
                  <img src={d.file_url ?? undefined} alt={d.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    {d.file_url ? <File className="w-12 h-12" /> : <Image className="w-12 h-12" />}
                    <span className="text-xs mt-2">No preview</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 text-sm">{d.title}</h3>
                  <button onClick={() => remove(d.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {d.division && <Badge text={d.division} color="sky" />}
                  {d.doc_type && <Badge text={d.doc_type} color="slate" />}
                </div>
                {d.description && <p className="text-xs text-slate-500 line-clamp-2">{d.description}</p>}
                {d.file_url && !d.file_url.startsWith('data:') && (
                  <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 mt-2">
                    <Link2 className="w-3 h-3" /> Lihat file
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
