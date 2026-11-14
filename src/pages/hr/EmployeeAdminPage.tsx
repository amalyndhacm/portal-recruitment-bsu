import { useEffect, useState } from 'react';
import { UserCog, Plus, Trash2 } from 'lucide-react';
import { db, type EmployeeAdmin } from '@/lib/database';
import { PageHeader, Card, Button, Input, DateInput, Select, TextArea, LoadingState, EmptyState, Badge } from '@/components/ui';

const STATUSES = ['Baru', 'Aktif', 'Resign', 'Cuti'];
const REGIONS = ['Jatim', 'Jateng', 'Jabar', 'Jakarta', 'Bali', 'NTB', 'NTT', 'Lainnya'];

export default function EmployeeAdminPage() {
  const [employees, setEmployees] = useState<EmployeeAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ employee_name: '', region: '', status: '', join_date: '', resign_date: '', notes: '' });

  const load = async () => {
    setLoading(true);
    const { data } = await db.from('employee_admin').select('*').order('created_at', { ascending: false });
    setEmployees(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.employee_name || !form.status) return;
    await db.from('employee_admin').insert(form);
    setForm({ employee_name: '', region: '', status: '', join_date: '', resign_date: '', notes: '' });
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    await db.from('employee_admin').delete().eq('id', id);
    load();
  };

  const statusColors: Record<string, string> = { Baru: 'green', Aktif: 'sky', Resign: 'red', Cuti: 'yellow' };

  return (
    <div>
      <PageHeader
        title="Administrasi Karyawan"
        subtitle="Data karyawan baru per daerah, karyawan resign, karyawan luar Jatim, dll"
        icon={<UserCog className="w-6 h-6 text-sky-600" />}
      />

      <div className="mb-6">
        {!showForm ? (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 inline mr-1" /> Tambah Data Karyawan
          </Button>
        ) : (
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Data Karyawan Baru</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input label="Nama Karyawan" value={form.employee_name} onChange={(v) => setForm({ ...form, employee_name: v })} required />
              <Select label="Daerah" value={form.region} onChange={(v) => setForm({ ...form, region: v })} options={REGIONS} />
              <Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={STATUSES} required />
              <DateInput label="Tanggal Masuk" value={form.join_date} onChange={(v) => setForm({ ...form, join_date: v })} />
              <DateInput label="Tanggal Resign" value={form.resign_date} onChange={(v) => setForm({ ...form, resign_date: v })} />
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
      ) : employees.length === 0 ? (
        <Card className="p-6"><EmptyState message="Belum ada data karyawan" /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Nama Karyawan</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Daerah</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Tgl Masuk</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Tgl Resign</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700">Keterangan</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{e.employee_name}</td>
                    <td className="px-4 py-3 text-slate-600">{e.region || '-'}</td>
                    <td className="px-4 py-3"><Badge text={e.status} color={statusColors[e.status] || 'slate'} /></td>
                    <td className="px-4 py-3 text-slate-600">{e.join_date || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{e.resign_date || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{e.notes || '-'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => remove(e.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
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
