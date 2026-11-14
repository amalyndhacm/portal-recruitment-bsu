import { useEffect, useState } from 'react';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import { db, type TrainingRecap } from '@/lib/database';
import { PageHeader, Card, Button, Input, NumberInput, LoadingState, EmptyState } from '@/components/ui';

export default function TrainingRecapPage() {
  const [items, setItems] = useState<TrainingRecap[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ position: '', induction: 0, training_onboarding: 0, training_external: 0, total: 0 });

  const load = async () => {
    setLoading(true);
    const { data } = await db.from('training_recap').select('*').order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const calcTotal = () => form.induction + form.training_onboarding + form.training_external;

  const submit = async () => {
    if (!form.position) return;
    const total = calcTotal();
    await db.from('training_recap').insert({ ...form, total });
    setForm({ position: '', induction: 0, training_onboarding: 0, training_external: 0, total: 0 });
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    await db.from('training_recap').delete().eq('id', id);
    load();
  };

  const totalInduction = items.reduce((s, i) => s + i.induction, 0);
  const totalOnboarding = items.reduce((s, i) => s + i.training_onboarding, 0);
  const totalExternal = items.reduce((s, i) => s + i.training_external, 0);
  const grandTotal = items.reduce((s, i) => s + i.total, 0);

  return (
    <div>
      <PageHeader
        title="Rekapan Kegiatan Training"
        subtitle="Posisi, Induction, Training Onboarding, Training Eksternal, Total"
        icon={<BookOpen className="w-6 h-6 text-sky-600" />}
      />

      <div className="mb-6">
        {!showForm ? (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 inline mr-1" /> Tambah Rekap
          </Button>
        ) : (
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Rekap Baru</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input label="Posisi" value={form.position} onChange={(v) => setForm({ ...form, position: v })} required />
              <NumberInput label="Induction" value={form.induction} onChange={(v) => setForm({ ...form, induction: v })} required />
              <NumberInput label="Training Onboarding" value={form.training_onboarding} onChange={(v) => setForm({ ...form, training_onboarding: v })} required />
              <NumberInput label="Training Eksternal" value={form.training_external} onChange={(v) => setForm({ ...form, training_external: v })} required />
            </div>
            <div className="mb-4 p-3 bg-sky-50 rounded-lg">
              <p className="text-sm text-slate-700">Total otomatis: <span className="font-bold text-sky-700">{calcTotal()}</span></p>
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
        <Card className="p-6"><EmptyState message="Belum ada rekap training" /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Posisi</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Induction</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Training Onboarding</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Training Eksternal</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{t.position}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{t.induction}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{t.training_onboarding}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{t.training_external}</td>
                    <td className="px-4 py-3 text-right font-bold text-sky-700">{t.total}</td>
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
                  <td className="px-4 py-3 font-bold text-slate-900">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{totalInduction}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{totalOnboarding}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{totalExternal}</td>
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
