import { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { db, type EmployeeDiscipline } from '@/lib/database';
import { PageHeader, Card, Button, Input, DateInput, Select, TextArea, LoadingState, EmptyState, Badge } from '@/components/ui';

const CASE_TYPES = ['Terlambat', 'Tidak Hadir', 'Pelanggaran Aturan', 'Kinerja', 'Lainnya'];
const STATUSES = ['Open', 'In Progress', 'Resolved'];

export default function DisciplinePage() {
  const [cases, setCases] = useState<EmployeeDiscipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_name: '', case_type: '', case_date: '', description: '', action_taken: '', status: 'Open' });

  const load = async () => {
    setLoading(true);
    const { data } = await db.from('employee_discipline').select('*').order('case_date', { ascending: false });
    setCases(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.employee_name || !form.case_type) return;
    await db.from('employee_discipline').insert(form);
    setForm({ employee_name: '', case_type: '', case_date: '', description: '', action_taken: '', status: 'Open' });
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    await db.from('employee_discipline').delete().eq('id', id);
    load();
  };

  const statusColors: Record<string, string> = { Open: 'red', 'In Progress': 'yellow', Resolved: 'green' };

  return (
    <div>
      <PageHeader
        title="Kedisiplinan Karyawan / Kasus"
        subtitle="Catatan kasus dan kedisiplinan karyawan"
        icon={<AlertTriangle className="w-6 h-6 text-sky-600" />}
      />

      <div className="mb-6">
        {!showForm ? (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 inline mr-1" /> Tambah Kasus
          </Button>
        ) : (
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Kasus Baru</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input label="Nama Karyawan" value={form.employee_name} onChange={(v) => setForm({ ...form, employee_name: v })} required />
              <Select label="Jenis Kasus" value={form.case_type} onChange={(v) => setForm({ ...form, case_type: v })} options={CASE_TYPES} required />
              <DateInput label="Tanggal Kasus" value={form.case_date} onChange={(v) => setForm({ ...form, case_date: v })} />
              <Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={STATUSES} />
            </div>
            <div className="mb-4">
              <TextArea label="Deskripsi Kasus" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
            </div>
            <div className="mb-4">
              <TextArea label="Tindakan yang Diambil" value={form.action_taken} onChange={(v) => setForm({ ...form, action_taken: v })} />
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
      ) : cases.length === 0 ? (
        <Card className="p-6"><EmptyState message="Belum ada kasus kedisiplinan" /></Card>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <Card key={c.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-slate-900">{c.employee_name}</h3>
                    <Badge text={c.case_type} color="yellow" />
                    <Badge text={c.status} color={statusColors[c.status] || 'slate'} />
                    {c.case_date && <span className="text-xs text-slate-400">{c.case_date}</span>}
                  </div>
                  {c.description && <p className="text-sm text-slate-700 mt-1"><span className="font-medium">Deskripsi:</span> {c.description}</p>}
                  {c.action_taken && <p className="text-sm text-slate-600 mt-1"><span className="font-medium">Tindakan:</span> {c.action_taken}</p>}
                </div>
                <button onClick={() => remove(c.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
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
