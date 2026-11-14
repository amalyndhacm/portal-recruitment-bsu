import { useEffect, useState } from 'react';
import { Wallet, Plus, Trash2 } from 'lucide-react';
import { db, type IncentivePayment } from '@/lib/database';
import { PageHeader, Card, Button, Input, DateInput, Select, TextArea, NumberInput, LoadingState, EmptyState, Badge } from '@/components/ui';

const WAVES = ['Gelombang 1', 'Gelombang 2', 'Gelombang 3'];
const STATUSES = ['Pending', 'Approved', 'Paid', 'Cancelled'];

export default function IncentivePage() {
  const [items, setItems] = useState<IncentivePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employee_name: '', position: '', wave: 'Gelombang 1', amount: 0, payment_date: '', status: 'Pending', notes: ''
  });

  const load = async () => {
    setLoading(true);
    const { data } = await db.from('incentive_payments').select('*').order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.employee_name) return;
    await db.from('incentive_payments').insert(form);
    setForm({ employee_name: '', position: '', wave: 'Gelombang 1', amount: 0, payment_date: '', status: 'Pending', notes: '' });
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    await db.from('incentive_payments').delete().eq('id', id);
    load();
  };

  const totalAmount = items.reduce((s, i) => s + Number(i.amount), 0);
  const statusColors: Record<string, string> = { Pending: 'yellow', Approved: 'sky', Paid: 'green', Cancelled: 'red' };

  const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

  return (
    <div>
      <PageHeader
        title="Pembayaran Insentif Gelombang 1"
        subtitle="Daftar pembayaran insentif karyawan per gelombang"
        icon={<Wallet className="w-6 h-6 text-sky-600" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <p className="text-sm text-slate-500">Total Karyawan</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">Total Insentif</p>
          <p className="text-xl font-bold text-sky-700 mt-1">{formatRupiah(totalAmount)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500">Sudah Dibayar</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{items.filter((i) => i.status === 'Paid').length}</p>
        </Card>
      </div>

      <div className="mb-6">
        {!showForm ? (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 inline mr-1" /> Tambah Insentif
          </Button>
        ) : (
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Insentif Baru</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input label="Nama Karyawan" value={form.employee_name} onChange={(v) => setForm({ ...form, employee_name: v })} required />
              <Input label="Posisi" value={form.position} onChange={(v) => setForm({ ...form, position: v })} />
              <Select label="Gelombang" value={form.wave} onChange={(v) => setForm({ ...form, wave: v })} options={WAVES} required />
              <NumberInput label="Jumlah Insentif (Rp)" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} required />
              <DateInput label="Tanggal Pembayaran" value={form.payment_date} onChange={(v) => setForm({ ...form, payment_date: v })} />
              <Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={STATUSES} />
            </div>
            <div className="mb-4">
              <TextArea label="Catatan" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
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
        <Card className="p-6"><EmptyState message="Belum ada data insentif" /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Nama Karyawan</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Posisi</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Gelombang</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700">Jumlah</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Tgl Bayar</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{i.employee_name}</td>
                    <td className="px-4 py-3 text-slate-600">{i.position || '-'}</td>
                    <td className="px-4 py-3"><Badge text={i.wave} color="blue" /></td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatRupiah(Number(i.amount))}</td>
                    <td className="px-4 py-3 text-slate-600">{i.payment_date || '-'}</td>
                    <td className="px-4 py-3"><Badge text={i.status} color={statusColors[i.status] || 'slate'} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => remove(i.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-sky-50 border-t-2 border-sky-200">
                  <td colSpan={3} className="px-4 py-3 font-bold text-slate-900 text-right">Total:</td>
                  <td className="px-4 py-3 text-right font-bold text-sky-700 text-lg">{formatRupiah(totalAmount)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
