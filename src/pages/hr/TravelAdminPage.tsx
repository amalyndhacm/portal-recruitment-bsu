import { useEffect, useState } from 'react';
import { Plane, Plus, Trash2 } from 'lucide-react';
import { db, type TravelAdmin } from '@/lib/database';
import { PageHeader, Card, Button, Input, DateInput, Select, TextArea, LoadingState, EmptyState, Badge } from '@/components/ui';

const ACTIVITY_TYPES = ['Telepon', 'Komplain', 'Pemesanan Hotel', 'Pemesanan Tiket', 'Resepsionis', 'Lainnya'];
const STATUSES = ['Pending', 'Approved', 'Completed', 'Cancelled'];

export default function TravelAdminPage() {
  const [items, setItems] = useState<TravelAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    activity_type: '', detail: '', person_name: '', hotel_name: '', ticket_info: '', request_date: '', status: 'Pending', notes: ''
  });

  const load = async () => {
    setLoading(true);
    const { data } = await db.from('travel_admin').select('*').order('request_date', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.activity_type || !form.detail) return;
    await db.from('travel_admin').insert(form);
    setForm({ activity_type: '', detail: '', person_name: '', hotel_name: '', ticket_info: '', request_date: '', status: 'Pending', notes: '' });
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    await db.from('travel_admin').delete().eq('id', id);
    load();
  };

  const statusColors: Record<string, string> = { Pending: 'yellow', Approved: 'sky', Completed: 'green', Cancelled: 'red' };

  return (
    <div>
      <PageHeader
        title="Travel Admin & Resepsionis"
        subtitle="Menerima data telepon, komplain, pemesanan hotel dan tiket"
        icon={<Plane className="w-6 h-6 text-sky-600" />}
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
              <Input label="Detail" value={form.detail} onChange={(v) => setForm({ ...form, detail: v })} required />
              <Input label="Nama PIC" value={form.person_name} onChange={(v) => setForm({ ...form, person_name: v })} />
              <Input label="Nama Hotel" value={form.hotel_name} onChange={(v) => setForm({ ...form, hotel_name: v })} />
              <Input label="Info Tiket" value={form.ticket_info} onChange={(v) => setForm({ ...form, ticket_info: v })} />
              <DateInput label="Tanggal Request" value={form.request_date} onChange={(v) => setForm({ ...form, request_date: v })} />
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
        <Card className="p-6"><EmptyState message="Belum ada kegiatan travel admin" /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Jenis</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Detail</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">PIC</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Hotel</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Tiket</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Tanggal</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3"><Badge text={t.activity_type} color="blue" /></td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs">{t.detail}</td>
                    <td className="px-4 py-3 text-slate-600">{t.person_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{t.hotel_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{t.ticket_info || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{t.request_date || '-'}</td>
                    <td className="px-4 py-3"><Badge text={t.status} color={statusColors[t.status] || 'slate'} /></td>
                    <td className="px-4 py-3">
                      <button onClick={() => remove(t.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
