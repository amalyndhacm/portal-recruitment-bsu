import { useEffect, useState } from 'react';
import { ClipboardList, Plus, Trash2 } from 'lucide-react';
import { db, type EmployeeActivity } from '@/lib/database';
import { PageHeader, Card, Button, Input, TextArea, DateInput, Select, LoadingState, EmptyState, Badge } from '@/components/ui';

const ACTIVITY_TYPES = ['Kegiatan', 'Meeting', 'Training', 'Laporan', 'Dokumentasi', 'Lainnya'];

export default function EmployeeActivitiesPage() {
  const [activities, setActivities] = useState<EmployeeActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ activity_type: '', title: '', content: '', activity_date: '' });

  const load = async () => {
    setLoading(true);
    const { data } = await db.from('employee_activities').select('*').order('activity_date', { ascending: false });
    setActivities(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.activity_type || !form.title) return;
    await db.from('employee_activities').insert(form);
    setForm({ activity_type: '', title: '', content: '', activity_date: '' });
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    await db.from('employee_activities').delete().eq('id', id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Kegiatan Karyawan"
        subtitle="Rekap kegiatan karyawan - input dapat berupa teks, catatan, atau laporan"
        icon={<ClipboardList className="w-6 h-6 text-sky-600" />}
      />

      <div className="mb-6">
        {!showForm ? (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 inline mr-1" /> Tambah Kegiatan
          </Button>
        ) : (
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Kegiatan Baru</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Select label="Jenis Kegiatan" value={form.activity_type} onChange={(v) => setForm({ ...form, activity_type: v })} options={ACTIVITY_TYPES} required />
              <DateInput label="Tanggal Kegiatan" value={form.activity_date} onChange={(v) => setForm({ ...form, activity_date: v })} />
            </div>
            <div className="mb-4">
              <Input label="Judul" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
            </div>
            <div className="mb-4">
              <TextArea label="Detail Kegiatan" value={form.content} onChange={(v) => setForm({ ...form, content: v })} placeholder="Tulis detail kegiatan, catatan, atau laporan..." />
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
      ) : activities.length === 0 ? (
        <Card className="p-6"><EmptyState message="Belum ada kegiatan karyawan" /></Card>
      ) : (
        <div className="space-y-3">
          {activities.map((a) => (
            <Card key={a.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge text={a.activity_type} color="blue" />
                    {a.activity_date && <span className="text-xs text-slate-400">{a.activity_date}</span>}
                  </div>
                  <h3 className="font-semibold text-slate-900">{a.title}</h3>
                  {a.content && <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{a.content}</p>}
                </div>
                <button onClick={() => remove(a.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
