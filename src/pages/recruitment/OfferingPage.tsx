import { useEffect, useMemo, useState } from 'react';
import { FileSignature, Trash2, Send, FileWarning, Handshake } from 'lucide-react';
import { db, type JobApplicant } from '@/lib/database';
import {
  OFFER_DOCUMENT_TYPES,
  OFFER_STATUSES,
  OFFER_STATUS_COLORS,
  PRE_EMPLOYMENT_DOCUMENTS,
  ensureCandidateOffering,
  type ApplicantLite,
  type CandidateOffering,
} from '@/lib/recruitmentModules';
import { ProgressBar, StatCard } from '@/components/recruitment/RecruitmentWidgets';
import { PageHeader, Card, Button, Badge, LoadingState, EmptyState } from '@/components/ui';
import PKWTJatimEditor from '@/components/recruitment/PKWTJatimEditor';
import { notifyPortal } from '@/lib/portalNotifications';

// ---------------------------------------------------------------------------
// Offering & Pre-Employment: penawaran kerja, kelengkapan dokumen, dan MCU
// untuk kandidat yang sudah lolos Interview Final. Setelah penawaran
// diterima, kandidat bisa langsung dipindahkan ke tahap Onboarding.
// ---------------------------------------------------------------------------

const DOCUMENT_TEMPLATE_FILES: Record<string, string> = {
  'PKWT Jawa Timur': 'PKWT JATIM revisi.docx',
  'PKWT Luar Jawa Timur': 'PKWT LUAR JATIM.docx',
  'PKWTT Jawa Timur': 'TEMPLATE FORM PKWTT JATIM (1).docx',
  'PKWTT Luar Jawa Timur': 'TEMPLATE FORM PKWTT LUAR JATIM TERBARU.docx',
  'Surat Pernyataan Kontrak': 'TEMPLATE SURAT PERNYATAAN KONTRAK .docx',
  'Surat Pernyataan Probation': 'TEMPLATE SURAT PERNYATAAN PROBATION  - Copy.docx',
};

export default function OfferingPage() {
  const [items, setItems] = useState<CandidateOffering[]>([]);
  const [applicants, setApplicants] = useState<ApplicantLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [selectedOfferingId, setSelectedOfferingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    const [offerings, candidates] = await Promise.all([
      db
        .from('candidate_offerings')
        .select('*')
        .order('created_at', { ascending: false }),
      db.from('job_applicants').select('*').order('created_at', { ascending: false }),
    ]);
    if (offerings.error || candidates.error) {
      setLoadError(offerings.error?.message || candidates.error?.message || 'Data Offering tidak dapat dimuat.');
      setLoading(false);
      return;
    }

    const candidateRows = (candidates.data || []) as JobApplicant[];
    const applicantsById = new Map(candidateRows.map((candidate) => [candidate.id, candidate]));
    const normalizedOfferings = ((offerings.data || []) as CandidateOffering[]).map((offering) => ({
      ...offering,
      offer_status: offering.offer_status || 'Draft',
      employment_status: offering.employment_status || 'Kontrak',
      documents: Array.isArray(offering.documents) ? offering.documents : [],
      mcu_status: offering.mcu_status || 'Belum',
      document_statuses: Array.isArray(offering.document_statuses) ? offering.document_statuses : [],
      selected_documents: Array.isArray(offering.selected_documents) ? offering.selected_documents : [],
      document_forms: offering.document_forms && typeof offering.document_forms === 'object' ? offering.document_forms : {},
      job_applicants: applicantsById.get(offering.applicant_id) || null,
    }));
    setItems(normalizedOfferings);
    setApplicants(candidateRows as ApplicantLite[]);

    const openId = sessionStorage.getItem('portal-open-offering-id');
    if (openId && normalizedOfferings.some((offering) => offering.id === openId)) {
      setSelectedOfferingId(openId);
      sessionStorage.removeItem('portal-open-offering-id');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const offeringApplicants = useMemo(() => {
    const offered = new Set(items.map((item) => item.applicant_id));
    return applicants.filter((a) => a.status === 'Offering' && !offered.has(a.id));
  }, [applicants, items]);

  const filtered = useMemo(
    () => items.filter((o) => statusFilter === 'Semua' || o.offer_status === statusFilter),
    [items, statusFilter],
  );

  const stats = useMemo(() => {
    const waiting = items.filter((o) => o.offer_status === 'Terkirim' || o.offer_status === 'Negosiasi').length;
    const accepted = items.filter((o) => o.offer_status === 'Diterima');
    const incomplete = accepted.filter((o) => (o.documents || []).length < PRE_EMPLOYMENT_DOCUMENTS.length || o.mcu_status !== 'Lulus').length;
    return { total: items.length, waiting, accepted: accepted.length, incomplete };
  }, [items]);

  const patch = async (id: string, changes: Partial<CandidateOffering>) => {
    setItems((list) => list.map((o) => (o.id === id ? { ...o, ...changes } : o)));
    const { job_applicants: _ignored, ...dbChanges } = changes;
    void _ignored;
    const { error } = await db
      .from('candidate_offerings')
      .update({ ...dbChanges, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      alert('Gagal menyimpan perubahan.');
      load();
      return;
    }
    if (changes.offer_status) {
      const offering = items.find((item) => item.id === id);
      if (offering) {
        notifyPortal('Status offering diperbarui', `${offering.job_applicants?.full_name || 'Kandidat'}: status offering menjadi ${changes.offer_status}.`);
        const nextStatus = offering.job_applicants?.status === 'Onboarding' ? 'Onboarding'
          : changes.offer_status === 'Ditolak' ? 'Tidak Lolos'
          : ['Terkirim', 'Negosiasi', 'Diterima'].includes(changes.offer_status) ? 'Offering'
            : changes.offer_status === 'Draft' ? 'Interview Final' : null;
        if (nextStatus) {
          const { error: statusError } = await db
            .from('job_applicants')
            .update({ status: nextStatus })
            .eq('id', offering.applicant_id);
          if (statusError) alert('Status penawaran tersimpan, tetapi status pipeline kandidat gagal disinkronkan.');
        }
      }
    }
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm('Hapus data offering ini?')) return;
    await db.from('candidate_offerings').delete().eq('id', id);
    load();
  };

  const prepareOfferingFor = async (applicant: ApplicantLite) => {
    setSaving(true);
    const result = await ensureCandidateOffering(applicant);
    setSaving(false);
    if (result.error || !result.id) {
      alert(`Gagal memulai proses offering: ${result.error || 'data tidak lengkap'}`);
      return;
    }
    await load();
    setSelectedOfferingId(result.id);
    notifyPortal('Offering dimulai', `Proses offering untuk ${applicant.full_name} telah dibuat.`);
  };

  if (selectedOfferingId) {
    const selectedOffering = items.find((item) => item.id === selectedOfferingId);
    if (selectedOffering) {
      return <div><button onClick={() => setSelectedOfferingId(null)} className="mb-4 text-sm font-semibold text-sky-700 hover:underline">← Kembali ke daftar kandidat</button><PageHeader title={`Offering — ${selectedOffering.job_applicants?.full_name || 'Kandidat'}`} subtitle="Pilih tepat dua template surat, lalu isi hanya dua dokumen yang dibutuhkan kandidat ini." icon={<FileSignature className="h-6 w-6 text-sky-600" />} /><OfferingCard offering={selectedOffering} onPatch={patch} onDelete={remove} /></div>;
    }
  }

  return (
    <div>
      <PageHeader
        title="Offering & Pre-Employment"
        subtitle="Kelola penawaran kerja, kelengkapan dokumen, dan medical check-up sebelum kandidat mulai bekerja."
        icon={<FileSignature className="h-6 w-6 text-sky-600" />}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total offering" value={stats.total} icon={<FileSignature size={18} />} tone="sky" />
        <StatCard label="Menunggu jawaban" value={stats.waiting} icon={<Send size={18} />} tone="amber" />
        <StatCard label="Diterima" value={stats.accepted} icon={<Handshake size={18} />} tone="green" />
        <StatCard label="Diterima, belum siap" value={stats.incomplete} hint="Dokumen / MCU belum lengkap" icon={<FileWarning size={18} />} tone="red" />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {['Semua', ...OFFER_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              statusFilter === s ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

          {offeringApplicants.length > 0 && (
        <Card className="mb-6 border-sky-200 bg-sky-50/50 p-5">
          <div className="mb-3 flex items-center justify-between gap-2"><div><h3 className="font-semibold text-sky-950">Kandidat siap diproses Offering</h3><p className="mt-1 text-xs text-sky-800">Kandidat berstatus Offering muncul otomatis. Pilih dan isi dokumen PKWT, PKWTT, atau surat pernyataan yang diperlukan.</p></div><Badge text={`${offeringApplicants.length} kandidat`} color="sky" /></div>
          <div className="divide-y divide-sky-100 rounded-xl border border-sky-100 bg-white">
            {offeringApplicants.map((applicant) => <div key={applicant.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><p className="text-sm font-semibold text-slate-900">{applicant.full_name}</p><p className="text-xs text-slate-500">{applicant.position} · {applicant.tracking_code}</p></div><Button disabled={saving} onClick={() => prepareOfferingFor(applicant)}>{saving ? 'Membuka...' : 'Mulai Proses Offering'}</Button></div>)}
          </div>
        </Card>
      )}

      {loadError ? (
        <Card className="p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-red-700">Data Offering tidak dapat dimuat</h3><p className="mt-1 text-sm text-slate-600">{loadError}</p></div><Button variant="secondary" onClick={load}>Coba lagi</Button></div></Card>
      ) : loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState message={items.length === 0 ? 'Belum ada offering. Buat dari kandidat yang sudah lolos Interview Final.' : 'Tidak ada offering dengan status ini.'} />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((o) => (
            <OfferingSummaryCard key={o.id} offering={o} onOpen={() => setSelectedOfferingId(o.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function OfferingSummaryCard({ offering: o, onOpen }: { offering: CandidateOffering; onOpen: () => void }) {
  const selected = o.selected_documents || [];
  const completed = o.document_statuses || [];
  return <button type="button" onClick={onOpen} className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{o.job_applicants?.full_name || '-'}</h3><p className="mt-1 text-sm text-slate-500">{o.offered_position || o.job_applicants?.position || '-'} · {o.job_applicants?.tracking_code || '-'}</p></div><Badge text={o.offer_status} color={OFFER_STATUS_COLORS[o.offer_status] || 'slate'} /></div><div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500"><span className="rounded-full bg-slate-100 px-2.5 py-1">{selected.length}/2 template dipilih</span><span className="rounded-full bg-slate-100 px-2.5 py-1">{completed.length}/{selected.length || 2} surat selesai</span><span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700">Klik untuk buka detail</span></div></button>;
}

function OfferingCard({
  offering: o,
  onPatch,
  onDelete,
}: {
  offering: CandidateOffering;
  onPatch: (id: string, changes: Partial<CandidateOffering>) => void;
  onDelete: (id: string) => void;
}) {
  const [documentStatuses, setDocumentStatuses] = useState<string[]>(o.document_statuses || []);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(o.selected_documents || []);
  const [documentForms, setDocumentForms] = useState<Record<string, Record<string, string>>>(o.document_forms || {});
  const [activeDocument, setActiveDocument] = useState<string | null>(null);
  const [documentDraft, setDocumentDraft] = useState<Record<string, string>>({});
  const documents = Array.isArray(o.documents) ? o.documents : [];
  const docsDone = documents.length;
  const docsTotal = PRE_EMPLOYMENT_DOCUMENTS.length;

  const toggleDoc = (doc: string) => {
    const next = documents.includes(doc) ? documents.filter((d) => d !== doc) : [...documents, doc];
    onPatch(o.id, { documents: next });
  };

  const openDocument = (documentType: string) => {
    const candidate = o.job_applicants;
    const birthParts = (candidate?.birth_place_date || '').split(',');
    const automaticData: Record<string, string> = {
      pihak_pertama_nama: 'Veri Edi Santoso',
      pihak_pertama_nip: '2101100056',
      pihak_pertama_jabatan: 'HR & Comben Manager (Human Resource Division)',
      pihak_pertama_alamat: 'Jl.Subur No.1 Penarukan, Kepanjen Kabupaten Malang 65163',
      nama: candidate?.full_name || '',
      jenis_kelamin: candidate?.gender || '',
      tempat_lahir: birthParts[0]?.trim() || '',
      tanggal_lahir: birthParts.slice(1).join(',').trim(),
      alamat_ktp: candidate?.ktp_address || '',
      telepon: candidate?.phone || '',
      nama_ttd_kandidat: candidate?.full_name || '',
      jabatan: o.offered_position || candidate?.position || '',
      lokasi_kerja: candidate?.placement_area || candidate?.domicile || '',
    };
    setActiveDocument(documentType);
    setDocumentDraft({ ...(documentForms[documentType] || {}), ...automaticData });
  };

  const toggleSelectedDocument = (documentType: string) => {
    const next = selectedDocuments.includes(documentType)
      ? selectedDocuments.filter((item) => item !== documentType)
      : selectedDocuments.length < 2 ? [...selectedDocuments, documentType] : selectedDocuments;
    setSelectedDocuments(next);
    onPatch(o.id, { selected_documents: next });
  };

  const saveDocument = () => {
    if (!activeDocument) return;
    const nextForms = { ...documentForms, [activeDocument]: documentDraft };
    const nextStatuses = documentStatuses.includes(activeDocument) ? documentStatuses : [...documentStatuses, activeDocument];
    setDocumentForms(nextForms);
    setDocumentStatuses(nextStatuses);
    onPatch(o.id, { document_forms: nextForms, document_statuses: nextStatuses });
    setActiveDocument(null);
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-slate-900">{o.job_applicants?.full_name || '-'}</h3>
          <p className="truncate text-sm text-slate-500">
            {o.offered_position || o.job_applicants?.position} · {o.employment_status}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-slate-400">{o.job_applicants?.tracking_code}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge text={o.offer_status} color={OFFER_STATUS_COLORS[o.offer_status] || 'slate'} />
          <button onClick={() => onDelete(o.id)} className="p-1 text-slate-300 transition-colors hover:text-red-500" aria-label="Hapus offering">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
        <div className="mb-3 flex items-center justify-between gap-2"><div><p className="text-sm font-bold text-slate-900">1. Pengisian Surat</p><p className="mt-1 text-xs text-slate-500">Pilih tepat 2 dari 6 template sesuai kebutuhan kandidat.</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">{selectedDocuments.length}/2 dipilih</span></div>
        <div className="grid gap-2 sm:grid-cols-2">{OFFER_DOCUMENT_TYPES.map((documentType) => <label key={documentType} className={`flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-semibold ${selectedDocuments.includes(documentType) ? 'border-amber-400 ring-2 ring-amber-100' : 'border-amber-100'}`}><input type="checkbox" checked={selectedDocuments.includes(documentType)} onChange={() => toggleSelectedDocument(documentType)} disabled={!selectedDocuments.includes(documentType) && selectedDocuments.length >= 2} className="h-4 w-4 text-amber-600" />{documentType}</label>)}</div>
        {selectedDocuments.length === 2 && <div className="mt-3 grid gap-3 sm:grid-cols-2">{selectedDocuments.map((documentType) => { const done = documentStatuses.includes(documentType); return <div key={documentType} className="rounded-xl border border-emerald-100 bg-white p-2"><div className="flex items-center justify-between gap-2"><div><p className="text-xs font-semibold text-slate-700">{documentType}</p><p className={`text-[11px] ${done ? 'text-emerald-600' : 'text-slate-400'}`}>{done ? 'Sudah diisi' : 'Belum diisi'}</p></div><button onClick={() => openDocument(documentType)} className="rounded-md bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-200">{done ? 'Edit' : 'Isi'}</button></div>{done && <DocumentThumbnail title={documentType} />}</div>; })}</div>}
        {activeDocument === 'PKWT Jawa Timur' ? <PKWTJatimEditor draft={documentDraft} onChange={setDocumentDraft} onSave={saveDocument} onCancel={() => setActiveDocument(null)} /> : activeDocument && <div className="mt-3 rounded-lg border border-amber-200 bg-white p-3"><div className="mb-2 flex items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-800">Isi {activeDocument}</p><a href={`/templates/offering/${encodeURIComponent(DOCUMENT_TEMPLATE_FILES[activeDocument])}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-sky-700 hover:underline">Lihat template</a></div><div className="grid gap-2 sm:grid-cols-2">{[['nama', 'Nama'], ['posisi', 'Posisi'], ['nomor_surat', 'Nomor surat'], ['grade', 'Grade'], ['divisi', 'Divisi'], ['lokasi', 'Lokasi'], ['gaji', 'Gaji'], ['tunjangan_makan', 'Tunjangan uang makan'], ['tanggal_mulai', 'Tanggal mulai'], ['tanggal_selesai', 'Tanggal selesai']].map(([key, label]) => <label key={key} className="text-xs font-medium text-slate-600">{label}<input value={documentDraft[key] || ''} onChange={(e) => setDocumentDraft({ ...documentDraft, [key]: e.target.value })} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" /></label>)}</div><div className="mt-3 flex gap-2"><Button onClick={saveDocument}>Simpan Dokumen</Button><Button variant="secondary" onClick={() => setActiveDocument(null)}>Batal</Button></div></div>}
      </div>

      {/* Kelengkapan dokumen */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <div><p className="text-sm font-bold text-slate-900">2. Kelengkapan Dokumen</p><p className="mt-1 text-xs text-slate-500">Centang dokumen kandidat yang sudah diterima dan diverifikasi.</p></div>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{docsDone}/{docsTotal}</span>
        </div>
        <ProgressBar value={docsDone} max={docsTotal} color={docsDone === docsTotal ? 'bg-emerald-500' : 'bg-sky-500'} />
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
          {PRE_EMPLOYMENT_DOCUMENTS.map((doc) => (
            <label key={doc} className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={documents.includes(doc)}
                onChange={() => toggleDoc(doc)}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              {doc}
            </label>
          ))}
        </div>
      </div>

    </Card>
  );
}

function DocumentThumbnail({ title }: { title: string }) {
  return <div className="mt-2 flex h-24 items-center gap-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2"><div className="h-full w-16 shrink-0 overflow-hidden rounded border border-slate-200 bg-white"><img src="/image1.jpeg" alt="Header dokumen" className="h-7 w-full object-cover object-left-top" /><div className="px-1 pt-2 text-center text-[6px] font-bold leading-tight text-slate-700">PERJANJIAN KERJA<br />{title.toUpperCase()}</div><div className="mx-2 mt-2 h-1 rounded bg-slate-200" /><div className="mx-2 mt-1 h-1 rounded bg-slate-200" /><div className="mx-2 mt-1 h-1 rounded bg-slate-200" /></div><div><p className="text-[10px] font-semibold text-slate-600">Preview dokumen</p><p className="mt-0.5 text-[10px] text-emerald-600">Tersimpan</p></div></div>;
}
