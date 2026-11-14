import { useEffect, useMemo, useState } from 'react';
import { MessageSquareText, Plus, Trash2, Pencil, Copy, Check, X, MessageCircle, Mail, AlertTriangle } from 'lucide-react';
import { db, type InterviewScheduleWithApplicant } from '@/lib/database';
import {
  MESSAGE_CATEGORIES,
  MESSAGE_CHANNELS,
  TEMPLATE_VARIABLES,
  fillTemplate,
  formatDateShort,
  type MessageTemplate,
} from '@/lib/recruitmentModules';
import { SectionCard } from '@/components/recruitment/RecruitmentWidgets';
import { PageHeader, Card, Button, Input, Select, TextArea, Badge, LoadingState, EmptyState } from '@/components/ui';

// ---------------------------------------------------------------------------
// Template Komunikasi: kumpulan template pesan WA / Email (undangan interview,
// penolakan, offering, onboarding) dengan variabel {{nama}}, {{posisi}}, dst.
// Di bawahnya ada daftar notifikasi interview yang gagal terkirim (dari
// Edge Function send-interview-notification) supaya bisa ditindaklanjuti.
// ---------------------------------------------------------------------------

type Draft = { id: string | null; name: string; channel: string; category: string; subject: string; body: string };
const EMPTY_DRAFT: Draft = { id: null, name: '', channel: 'WhatsApp', category: 'Umum', subject: '', body: '' };

const sampleValues = () => Object.fromEntries(TEMPLATE_VARIABLES.map((v) => [v.key, v.sample]));

export default function MessageTemplatesPage() {
  const [items, setItems] = useState<MessageTemplate[]>([]);
  const [failed, setFailed] = useState<InterviewScheduleWithApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<MessageTemplate | null>(null);
  const [channelFilter, setChannelFilter] = useState('Semua');
  const [categoryFilter, setCategoryFilter] = useState('Semua');

  const load = async () => {
    setLoading(true);
    const [templates, schedules] = await Promise.all([
      db.from('message_templates').select('*').order('category').order('name'),
      db
        .from('interview_schedules')
        .select('*, job_applicants(full_name, email, phone, position, tracking_code, status)')
        .or('notify_email_status.eq.failed,notify_wa_status.eq.failed')
        .order('scheduled_date', { ascending: false })
        .limit(20),
    ]);
    setItems((templates.data || []) as MessageTemplate[]);
    setFailed((schedules.data || []) as unknown as InterviewScheduleWithApplicant[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      items.filter(
        (t) => (channelFilter === 'Semua' || t.channel === channelFilter) && (categoryFilter === 'Semua' || t.category === categoryFilter),
      ),
    [items, channelFilter, categoryFilter],
  );

  const save = async () => {
    if (!draft || !draft.name.trim() || !draft.body.trim()) return;
    setSaving(true);
    const payload = {
      name: draft.name.trim(),
      channel: draft.channel,
      category: draft.category,
      subject: draft.channel === 'Email' ? draft.subject.trim() || null : null,
      body: draft.body,
      updated_at: new Date().toISOString(),
    };
    const { error } = draft.id
      ? await db.from('message_templates').update(payload).eq('id', draft.id)
      : await db.from('message_templates').insert(payload);
    setSaving(false);
    if (error) {
      alert('Gagal menyimpan template. Pastikan migrasi database sudah dijalankan.');
      return;
    }
    setDraft(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Hapus template ini?')) return;
    await db.from('message_templates').delete().eq('id', id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Template Komunikasi"
        subtitle="Template pesan WhatsApp dan Email untuk kandidat. Gunakan variabel seperti {{nama}} dan {{posisi}} agar terisi otomatis saat disalin."
        icon={<MessageSquareText className="h-6 w-6 text-sky-600" />}
      />

      {failed.length > 0 && (
        <div className="mb-6">
          <SectionCard
            kicker="Perlu tindakan"
            title="Notifikasi interview gagal terkirim"
            description="Hubungi kandidat secara manual atau kirim ulang dari menu Jadwal Interview."
          >
            <div className="divide-y divide-slate-100">
              {failed.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-semibold text-slate-800">
                      <AlertTriangle size={15} className="shrink-0 text-amber-500" />
                      <span className="truncate">{s.job_applicants?.full_name || '-'}</span>
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {s.stage} · {formatDateShort(s.scheduled_date)} {s.scheduled_time} · {s.job_applicants?.phone} · {s.job_applicants?.email}
                    </p>
                    {s.notify_error && <p className="mt-0.5 truncate text-xs text-red-500">{s.notify_error}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    {s.notify_wa_status === 'failed' && <Badge text="WA gagal" color="red" />}
                    {s.notify_email_status === 'failed' && <Badge text="Email gagal" color="red" />}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
            {['Semua', ...MESSAGE_CHANNELS].map((c) => (
              <option key={c} value={c}>{c === 'Semua' ? 'Semua kanal' : c}</option>
            ))}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
            {['Semua', ...MESSAGE_CATEGORIES].map((c) => (
              <option key={c} value={c}>{c === 'Semua' ? 'Semua kategori' : c}</option>
            ))}
          </select>
        </div>
        {!draft && (
          <Button onClick={() => setDraft({ ...EMPTY_DRAFT })}>
            <Plus className="mr-1 inline h-4 w-4" /> Template Baru
          </Button>
        )}
      </div>

      {draft && (
        <Card className="mb-6 p-6">
          <h3 className="mb-4 font-semibold text-slate-900">{draft.id ? 'Edit Template' : 'Template Baru'}</h3>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input label="Nama Template" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} required />
            <Select label="Kanal" value={draft.channel} onChange={(v) => setDraft({ ...draft, channel: v })} options={[...MESSAGE_CHANNELS]} />
            <Select label="Kategori" value={draft.category} onChange={(v) => setDraft({ ...draft, category: v })} options={[...MESSAGE_CATEGORIES]} />
          </div>
          {draft.channel === 'Email' && (
            <div className="mb-4">
              <Input label="Subjek Email" value={draft.subject} onChange={(v) => setDraft({ ...draft, subject: v })} />
            </div>
          )}
          <div className="mb-2">
            <TextArea label="Isi Pesan" value={draft.body} onChange={(v) => setDraft({ ...draft, body: v })} required />
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Sisipkan variabel:</span>
            {TEMPLATE_VARIABLES.map((v) => (
              <button
                key={v.key}
                type="button"
                title={v.label}
                onClick={() => setDraft({ ...draft, body: `${draft.body}{{${v.key}}}` })}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600 hover:border-sky-300 hover:text-sky-700"
              >
                {`{{${v.key}}}`}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving || !draft.name.trim() || !draft.body.trim()}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Batal
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState message={items.length === 0 ? 'Belum ada template. Buat template pertama Anda.' : 'Tidak ada template yang cocok dengan filter.'} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900">{t.name}</h3>
                <span className="shrink-0 text-slate-400">{t.channel === 'Email' ? <Mail size={16} /> : <MessageCircle size={16} />}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge text={t.channel} color={t.channel === 'Email' ? 'blue' : 'green'} />
                <Badge text={t.category} color="slate" />
              </div>
              {t.subject && <p className="mt-3 text-xs font-medium text-slate-500">Subjek: {t.subject}</p>}
              <p className="mt-2 line-clamp-5 flex-1 whitespace-pre-line text-sm text-slate-600">{t.body}</p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <Button variant="secondary" onClick={() => setPreview(t)}>
                  <Copy className="mr-1.5 inline h-3.5 w-3.5" /> Pratinjau & Salin
                </Button>
                <div className="flex items-center">
                  <button
                    onClick={() => setDraft({ id: t.id, name: t.name, channel: t.channel, category: t.category, subject: t.subject || '', body: t.body })}
                    className="p-1.5 text-slate-400 transition-colors hover:text-sky-600"
                    aria-label="Edit template"
                  >
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => remove(t.id)} className="p-1.5 text-slate-300 transition-colors hover:text-red-500" aria-label="Hapus template">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {preview && <PreviewModal template={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function PreviewModal({ template, onClose }: { template: MessageTemplate; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(sampleValues);
  const [copied, setCopied] = useState(false);

  const usedKeys = useMemo(() => {
    const text = `${template.subject || ''} ${template.body}`;
    return TEMPLATE_VARIABLES.filter((v) => text.includes(`{{${v.key}}}`));
  }, [template]);

  const body = fillTemplate(template.body, values);
  const subject = template.subject ? fillTemplate(template.subject, values) : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(subject ? `Subjek: ${subject}\n\n${body}` : body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      alert('Gagal menyalin. Salin manual dari kotak pratinjau.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900">{template.name}</h3>
            <p className="text-xs text-slate-400">{template.channel} · {template.category}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-5 px-6 py-5">
          {usedKeys.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {usedKeys.map((v) => (
                <Input key={v.key} label={v.label} value={values[v.key] || ''} onChange={(val) => setValues({ ...values, [v.key]: val })} />
              ))}
            </div>
          )}
          <div className="rounded-xl bg-slate-50 p-4">
            {subject && <p className="mb-2 text-sm font-semibold text-slate-800">Subjek: {subject}</p>}
            <p className="whitespace-pre-line text-sm text-slate-700">{body}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Tutup</Button>
            <Button onClick={copy}>
              {copied ? <Check className="mr-1.5 inline h-4 w-4" /> : <Copy className="mr-1.5 inline h-4 w-4" />}
              {copied ? 'Tersalin' : 'Salin Pesan'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}