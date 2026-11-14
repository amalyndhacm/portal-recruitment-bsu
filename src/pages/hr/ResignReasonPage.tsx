import { useEffect, useState } from 'react';
import { UserMinus, Plus, Trash2 } from 'lucide-react';
import { db, type ResignReason } from '@/lib/database';
import { PageHeader, Card, Button, Input, DateInput, Select, TextArea, LoadingState, EmptyState, Badge } from '@/components/ui';

const REGIONS = ['Jatim', 'Jateng', 'Jabar', 'Jakarta', 'Bali', 'NTB', 'NTT', 'Lainnya'];

export default function ResignReasonPage() {
  const [reasons, setReasons] = useState<ResignReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_name: '', reason: '', resign_date: '', region: '', notes: '' });

  const load = async () => {
    setLoading(true);
    const { data } = await db.from('resign_reasons').select('*').order('resign_date', { ascending: false });
    setReasons(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.employee_name || !form.reason) return;
    await db.from('resign_reasons').insert(form);
    setForm({ employee_name: '', reason: '', resign_date: '', region: '', notes: '' });
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    await db.from('resign_reasons').delete().eq('id', id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Alasan Karyawan Resign"
        subtitle="Catatan alasan karyawan yang mengundurkan diri"
        icon={<UserMinus className="w-6 h-6 text-sky-600" />}
      />

      <div className="mb-6">
        {!showForm ? (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 inline mr-1" /> Tambah Data Resign
          </Button>
        ) : (
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Data Resign Baru</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input label="Nama Karyawan" value={form.employee_name} onChange={(v) => setForm({ ...form, employee_name: v })} required />
              <DateInput label="Tanggal Resign" value={form.resign_date} onChange={(v) => setForm({ ...form, resign_date: v })} />
              <Select label="Daerah" value={form.region} onChange={(v) => setForm({ ...form, region: v })} options={REGIONS} />
            </div>
            <div className="mb-4">
              <TextArea label="Alasan Resign" value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} required />
            </div>
            <div className="mb-4">
              <TextArea label="Catatan Tambahan" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
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
      ) : reasons.length === 0 ? (
        <Card className="p-6"><EmptyState message="Belum ada data resign" /></Card>
      ) : (
        <div className="space-y-3">
          {reasons.map((r) => (
            <Card key={r.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900">{r.employee_name}</h3>
                    {r.region && <Badge text={r.region} color="slate" />}
                    {r.resign_date && <span className="text-xs text-slate-400">{r.resign_date}</span>}
                  </div>
                  <p className="text-sm text-slate-700 mt-1"><span className="font-medium">Alasan:</span> {r.reason}</p>
                  {r.notes && <p className="text-sm text-slate-500 mt-1">{r.notes}</p>}
                </div>
                <button onClick={() => remove(r.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
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
