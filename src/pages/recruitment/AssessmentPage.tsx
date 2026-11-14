import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Plus, Trash2, CheckCircle2, Clock, HelpCircle, XCircle, BarChart3 } from 'lucide-react';
import { db } from '@/lib/database';
import {
  ASSESSMENT_RESULTS,
  ASSESSMENT_RESULT_COLORS,
  ASSESSMENT_TYPES,
  applicantLabel,
  fetchApplicantsLite,
  formatDateShort,
  todayISO,
  type ApplicantLite,
  type CandidateAssessment,
} from '@/lib/recruitmentModules';
import { StatCard } from '@/components/recruitment/RecruitmentWidgets';
import { PageHeader, Card, Button, Input, Select, TextArea, DateInput, Badge, LoadingState, EmptyState } from '@/components/ui';
import { notifyPortal } from '@/lib/portalNotifications';

// ---------------------------------------------------------------------------
// Tes & Penilaian: hasil psikotes, tes teknis, dan skor interview per kandidat
// supaya keputusan lolos/tidak lolos punya dasar yang tercatat.
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  applicantLabel: '',
  assessment_type: '',
  assessed_date: todayISO(),
  score: '',
  result: 'Menunggu',
  assessor: '',
  notes: '',
};

export default function AssessmentPage() {
  const [items, setItems] = useState<CandidateAssessment[]>([]);
  const [applicants, setApplicants] = useState<ApplicantLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [typeFilter, setTypeFilter] = useState('Semua');
  const [resultFilter, setResultFilter] = useState('Semua');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    const [assessments, list] = await Promise.all([
      db
        .from('candidate_assessments')
        .select('*, job_applicants(full_name, position, tracking_code, status)')
        .order('created_at', { ascending: false }),
      fetchApplicantsLite(),
    ]);
    setItems((assessments.data || []) as CandidateAssessment[]);
    setApplicants(list.filter((a) => a.status !== 'Tidak Lolos'));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const applicantOptions = useMemo(() => applicants.map(applicantLabel), [applicants]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((r) => {
      if (typeFilter !== 'Semua' && r.assessment_type !== typeFilter) return false;
      if (resultFilter !== 'Semua' && r.result !== resultFilter) return false;
      if (!q) return true;
      return (
        (r.job_applicants?.full_name || '').toLowerCase().includes(q) ||
        (r.job_applicants?.position || '').toLowerCase().includes(q) ||
        (r.assessor || '').toLowerCase().includes(q)
      );
    });
  }, [items, typeFilter, resultFilter, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { Menunggu: 0, Lulus: 0, Dipertimbangkan: 0, 'Tidak Lulus': 0 };
    for (const r of items) c[r.result] = (c[r.result] || 0) + 1;
    return c;
  }, [items]);

  const avgScore = useMemo(() => {
    const scored = items.filter((r) => r.score != null);
    if (!scored.length) return null;
    return Math.round((scored.reduce((s, r) => s + Number(r.score), 0) / scored.length) * 10) / 10;
  }, [items]);

  const submit = async () => {
    const applicant = applicants.find((a) => applicantLabel(a) === form.applicantLabel);
    if (!applicant || !form.assessment_type) return;
    setSaving(true);
    const { error } = await db.from('candidate_assessments').insert({
      applicant_id: applicant.id,
      assessment_type: form.assessment_type,
      assessed_date: form.assessed_date || null,
      score: form.score === '' ? null : Number(form.score),
      result: form.result,
      assessor: form.assessor.trim() || null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      alert('Gagal menyimpan penilaian. Pastikan migrasi database sudah dijalankan.');
      return;
    }
    notifyPortal('Penilaian kandidat disimpan', `${applicant.full_name} mendapat hasil ${form.result} pada ${form.assessment_type}.`);
    setForm({ ...EMPTY_FORM, assessed_date: todayISO() });
    setShowForm(false);
    load();
  };

  const updateResult = async (row: CandidateAssessment, result: string) => {
    setItems((list) => list.map((r) => (r.id === row.id ? { ...r, result } : r)));
    const { error } = await db.from('candidate_assessments').update({ result }).eq('id', row.id);
    if (error) load();
    else notifyPortal('Hasil penilaian diperbarui', `${row.job_applicants?.full_name || 'Kandidat'}: hasil penilaian menjadi ${result}.`);
  };

  const remove = async (id: string) => {
    if (!confirm('Hapus data penilaian ini?')) return;
    await db.from('candidate_assessments').delete().eq('id', id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Tes & Penilaian"
        subtitle="Catat hasil psikotes, tes teknis, dan penilaian interview sebagai dasar keputusan seleksi."
        icon={<ClipboardCheck className="h-6 w-6 text-sky-600" />}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Menunggu hasil" value={counts.Menunggu} icon={<Clock size={18} />} tone="slate" />
        <StatCard label="Lulus" value={counts.Lulus} icon={<CheckCircle2 size={18} />} tone="green" />
        <StatCard label="Dipertimbangkan" value={counts.Dipertimbangkan} icon={<HelpCircle size={18} />} tone="amber" />
        <StatCard label="Tidak lulus" value={counts['Tidak Lulus']} icon={<XCircle size={18} />} tone="red" />
        <StatCard label="Rata-rata skor" value={avgScore ?? '-'} icon={<BarChart3 size={18} />} tone="sky" />
      </div>

      <div className="mb-6">
        {!showForm ? (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-1 inline h-4 w-4" /> Tambah Penilaian
          </Button>
        ) : (
          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-slate-900">Penilaian Baru</h3>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Select
                  label="Kandidat"
                  value={form.applicantLabel}
                  onChange={(v) => setForm({ ...form, applicantLabel: v })}
                  options={applicantOptions}
                  required
                />
              </div>
              <Select label="Jenis Tes / Penilaian" value={form.assessment_type} onChange={(v) => setForm({ ...form, assessment_type: v })} options={[...ASSESSMENT_TYPES]} required />
              <DateInput label="Tanggal Pelaksanaan" value={form.assessed_date} onChange={(v) => setForm({ ...form, assessed_date: v })} />
              <Input label="Skor (opsional)" type="number" value={form.score} onChange={(v) => setForm({ ...form, score: v })} placeholder="mis. 78" />
              <Select label="Hasil" value={form.result} onChange={(v) => setForm({ ...form, result: v })} options={[...ASSESSMENT_RESULTS]} />
              <div className="md:col-span-2">
                <Input label="Penilai / Pewawancara" value={form.assessor} onChange={(v) => setForm({ ...form, assessor: v })} />
              </div>
            </div>
            <div className="mb-4">
              <TextArea label="Catatan / Rekomendasi" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={submit} disabled={saving || !form.applicantLabel || !form.assessment_type}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Batal
              </Button>
            </div>
          </Card>
        )}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari kandidat, posisi, atau penilai..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
          {['Semua', ...ASSESSMENT_TYPES].map((t) => (
            <option key={t} value={t}>{t === 'Semua' ? 'Semua jenis' : t}</option>
          ))}
        </select>
        <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
          {['Semua', ...ASSESSMENT_RESULTS].map((t) => (
            <option key={t} value={t}>{t === 'Semua' ? 'Semua hasil' : t}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState message={items.length === 0 ? 'Belum ada data penilaian.' : 'Tidak ada data yang cocok dengan filter ini.'} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Kandidat</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Jenis</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Tanggal</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Skor</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Penilai</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Hasil</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 align-top transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{r.job_applicants?.full_name || '-'}</p>
                      <p className="text-xs text-slate-400">{r.job_applicants?.position}</p>
                      {r.notes && <p className="mt-1 max-w-xs text-xs text-slate-500">{r.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.assessment_type}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateShort(r.assessed_date)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{r.score ?? '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{r.assessor || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <Badge text={r.result} color={ASSESSMENT_RESULT_COLORS[r.result] || 'slate'} />
                        <select
                          value={r.result}
                          onChange={(e) => updateResult(r, e.target.value)}
                          className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                          {ASSESSMENT_RESULTS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => remove(r.id)} className="p-1.5 text-slate-300 transition-colors hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
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
