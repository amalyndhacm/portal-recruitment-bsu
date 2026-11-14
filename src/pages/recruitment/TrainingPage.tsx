import { useEffect, useState } from 'react';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';
import { db, type TrainingActivity } from '@/lib/database';
import { PageHeader, Card, Button, Input, Select, TextArea, NumberInput, LoadingState, EmptyState } from '@/components/ui';

const STAGES = ['Induction', 'Onboarding', 'Training Internal', 'Training Eksternal', 'Sertifikasi'];
const MEDIA = ['Online', 'Offline', 'Hybrid', 'E-Learning', 'Lainnya'];
const AREAS = ['Jatim', 'Jateng', 'Jabar', 'Jakarta', 'Bali', 'NTB', 'NTT', 'Lainnya'];

export default function TrainingPage() {
  const [items, setItems] = useState<TrainingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employee_stage: '', activity: '', position_level: '', position: '', media: '', area: '', notes: '', quantity: 0,
  });

  const load = async () => {
    setLoading(true);
    const { data } = await db.from('training_activities').select('*').order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.employee_stage || !form.activity) return;
    await db.from('training_activities').insert(form);
    setForm({ employee_stage: '', activity: '', position_level: '', position: '', media: '', area: '', notes: '', quantity: 0 });
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    await db.from('training_activities').delete().eq('id', id);
    load();
  };

  const grandTotal = items.reduce((s, i) => s + (i.quantity || 0), 0);

  return (
    <div>
      <PageHeader
        title="Pelatihan"
        subtitle="Tabel kegiatan pelatihan karyawan dengan grand total"
        icon={<GraduationCap className="w-6 h-6 text-sky-600" />}
      />

      <div className="mb-6">
        {!showForm ? (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 inline mr-1" /> Tambah Data Pelatihan
          </Button>
        ) : (
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Data Pelatihan Baru</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Select label="Tahapan Karyawan" value={form.employee_stage} onChange={(v) => setForm({ ...form, employee_stage: v })} options={STAGES} required />
              <Input label="Kegiatan" value={form.activity} onChange={(v) => setForm({ ...form, activity: v })} required />
              <Input label="Jabatan" value={form.position_level} onChange={(v) => setForm({ ...form, position_level: v })} />
              <Input label="Posisi" value={form.position} onChange={(v) => setForm({ ...form, position: v })} />
              <Select label="Media" value={form.media} onChange={(v) => setForm({ ...form, media: v })} options={MEDIA} />
              <Select label="Area" value={form.area} onChange={(v) => setForm({ ...form, area: v })} options={AREAS} />
              <NumberInput label="Jumlah" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} required />
            </div>
            <div className="mb-4">
              <TextArea label="Keterangan" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
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
        <Card className="p-6"><EmptyState message="Belum ada data pelatihan" /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Tahapan</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Kegiatan</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Jabatan</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Posisi</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Media</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Area</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Keterangan</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Jumlah</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700">{t.employee_stage}</td>
                    <td className="px-4 py-3 text-slate-700">{t.activity}</td>
                    <td className="px-4 py-3 text-slate-600">{t.position_level || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{t.position || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{t.media || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{t.area || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{t.notes || '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{t.quantity}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => remove(t.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-sky-50 border-t-2 border-sky-200">
                  <td colSpan={7} className="px-4 py-3 font-bold text-slate-900 text-right">Grand Total:</td>
                  <td className="px-4 py-3 text-right font-bold text-sky-700 text-lg">{grandTotal}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
