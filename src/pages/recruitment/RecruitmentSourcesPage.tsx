import { useEffect, useMemo, useState } from 'react';
import { Megaphone, Plus, Trash2, ExternalLink, Wallet, Radio } from 'lucide-react';
import { db } from '@/lib/database';
import {
  SOURCE_MEDIA,
  formatDateShort,
  formatRupiah,
  todayISO,
  type RecruitmentSource,
} from '@/lib/recruitmentModules';
import { BarRow, SectionCard, StatCard } from '@/components/recruitment/RecruitmentWidgets';
import { PageHeader, Card, Button, Input, Select, DateInput, TextArea, LoadingState, EmptyState } from '@/components/ui';

// ---------------------------------------------------------------------------
// Sumber & Media Rekrutmen: mencatat di mana lowongan dipasang beserta
// biayanya, dan membandingkannya dengan "Sumber Informasi" yang diisi
// pelamar di formulir pendaftaran (job_applicants.referral_source).
// ---------------------------------------------------------------------------

const EMPTY_FORM = { position: '', media: '', posted_date: todayISO(), close_date: '', cost: '', url: '', notes: '' };

export default function RecruitmentSourcesPage() {
  const [items, setItems] = useState<RecruitmentSource[]>([]);
  const [referrals, setReferrals] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = async () => {
    setLoading(true);
    const [sources, applicants] = await Promise.all([
      db.from('recruitment_sources').select('*').order('posted_date', { ascending: false, nullsFirst: false }),
      db.from('job_applicants').select('referral_source'),
    ]);
    setItems((sources.data || []) as RecruitmentSource[]);
    setReferrals(((applicants.data || []) as { referral_source: string | null }[]).map((a) => a.referral_source || 'Tidak diisi'));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const totalCost = useMemo(() => items.reduce((s, i) => s + Number(i.cost || 0), 0), [items]);

  const costByMedia = useMemo(() => {
    const map: Record<string, { cost: number; count: number }> = {};
    for (const i of items) {
      const m = (map[i.media] ||= { cost: 0, count: 0 });
      m.cost += Number(i.cost || 0);
      m.count += 1;
    }
    return Object.entries(map).sort((a, b) => b[1].cost - a[1].cost || b[1].count - a[1].count);
  }, [items]);

  const applicantsBySource = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of referrals) map[r] = (map[r] || 0) + 1;
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [referrals]);

  const submit = async () => {
    if (!form.position.trim() || !form.media) return;
    setSaving(true);
    const { error } = await db.from('recruitment_sources').insert({
      position: form.position.trim(),
      media: form.media,
      posted_date: form.posted_date || null,
      close_date: form.close_date || null,
      cost: Number(form.cost) || 0,
      url: form.url.trim() || null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      alert('Gagal menyimpan. Pastikan migrasi database sudah dijalankan.');
      return;
    }
    setForm({ ...EMPTY_FORM, posted_date: todayISO() });
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Hapus catatan pemasangan ini?')) return;
    await db.from('recruitment_sources').delete().eq('id', id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Sumber & Media Rekrutmen"
        subtitle="Catat di mana lowongan dipasang dan berapa biayanya, lalu bandingkan dengan sumber informasi pelamar."
        icon={<Megaphone className="h-6 w-6 text-sky-600" />}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Total pemasangan" value={items.length} icon={<Radio size={18} />} tone="sky" />
        <StatCard label="Total biaya" value={formatRupiah(totalCost)} icon={<Wallet size={18} />} tone="amber" />
        <StatCard label="Pelamar tercatat" value={referrals.length} hint="Dari formulir pendaftaran" icon={<Megaphone size={18} />} tone="green" />
      </div>

      <div className="mb-6">
        {!showForm ? (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-1 inline h-4 w-4" /> Tambah Pemasangan
          </Button>
        ) : (
          <Card className="p-6">
            <h3 className="mb-4 font-semibold text-slate-900">Pemasangan Lowongan Baru</h3>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Posisi / Lowongan" value={form.position} onChange={(v) => setForm({ ...form, position: v })} required />
              <Select label="Media" value={form.media} onChange={(v) => setForm({ ...form, media: v })} options={[...SOURCE_MEDIA]} required />
              <DateInput label="Tanggal Tayang" value={form.posted_date} onChange={(v) => setForm({ ...form, posted_date: v })} />
              <DateInput label="Tanggal Berakhir" value={form.close_date} onChange={(v) => setForm({ ...form, close_date: v })} />
              <Input label="Biaya (Rp)" type="number" value={form.cost} onChange={(v) => setForm({ ...form, cost: v })} placeholder="0 jika gratis" />
              <Input label="Link Postingan" value={form.url} onChange={(v) => setForm({ ...form, url: v })} placeholder="https://..." />
            </div>
            <div className="mb-4">
              <TextArea label="Catatan" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={submit} disabled={saving || !form.position.trim() || !form.media}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Batal
              </Button>
            </div>
          </Card>
        )}
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <SectionCard kicker="Biaya" title="Biaya per media" description="Diurutkan dari biaya terbesar.">
              {costByMedia.length === 0 ? (
                <EmptyState message="Belum ada data pemasangan." />
              ) : (
                <div className="space-y-3">
                  {costByMedia.map(([media, v]) => (
                    <BarRow
                      key={media}
                      label={`${media} · ${v.count}x`}
                      value={Math.round(v.cost / 1000)}
                      max={Math.max(...costByMedia.map(([, x]) => Math.round(x.cost / 1000)), 1)}
                      suffix="rb"
                      color="bg-amber-500"
                    />
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard kicker="Hasil" title="Pelamar per sumber informasi" description="Berdasarkan isian pelamar di formulir pendaftaran.">
              {applicantsBySource.length === 0 ? (
                <EmptyState message="Belum ada pelamar." />
              ) : (
                <div className="space-y-3">
                  {applicantsBySource.map(([source, n]) => (
                    <BarRow key={source} label={source} value={n} max={applicantsBySource[0][1]} suffix="pelamar" />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {items.length === 0 ? (
            <Card className="p-6">
              <EmptyState message="Belum ada catatan pemasangan lowongan." />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Posisi</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Media</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Periode</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Biaya</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.id} className="border-b border-slate-100 align-top transition-colors hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{i.position}</p>
                          {i.notes && <p className="mt-0.5 max-w-xs text-xs text-slate-500">{i.notes}</p>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {i.media}
                          {i.url && (
                            <a href={i.url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex text-sky-600 hover:text-sky-700" aria-label="Buka postingan">
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {formatDateShort(i.posted_date)}
                          {i.close_date ? ` – ${formatDateShort(i.close_date)}` : ''}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatRupiah(Number(i.cost))}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => remove(i.id)} className="p-1.5 text-slate-300 transition-colors hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-sky-200 bg-sky-50">
                      <td className="px-4 py-3 font-bold text-slate-900" colSpan={3}>Total biaya</td>
                      <td className="px-4 py-3 text-right font-bold text-sky-700">{formatRupiah(totalCost)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}