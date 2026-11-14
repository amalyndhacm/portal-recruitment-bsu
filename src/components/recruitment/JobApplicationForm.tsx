import { useState, type ReactNode } from 'react';
import { ArrowLeft, Copy, Check, ClipboardCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/database';
import {
  EDUCATION_LEVELS,
  PREVIOUSLY_WORKED_OPTIONS,
  REFERRAL_SOURCES,
  GENDERS,
  MARITAL_STATUSES,
  RELIGIONS,
} from '@/lib/recruitment';
import type { JobOpening } from '@/lib/jobOpenings';
import { notifyPortal } from '@/lib/portalNotifications';

// ---------------------------------------------------------------------------
// Satu formulir ini dipakai untuk SEMUA lowongan — yang berbeda per listing
// hanya posisi & kualifikasinya (lihat src/lib/jobOpenings.ts). Field yang
// dikumpulkan mengikuti formulir pendaftaran lengkap tim Recruitment,
// supaya HR tidak perlu wawancara ulang untuk data dasar kandidat.
// ---------------------------------------------------------------------------

export type JobApplicationFormProps = {
  openings: JobOpening[];
  initialPosition?: string | null;
  onClose: () => void;
};

const APPLICATION_DOCUMENTS = [
  { key: 'cv_surat_lamaran', label: 'CV & Surat Lamaran' },
  { key: 'ktp', label: 'KTP' },
  { key: 'kk', label: 'Kartu Keluarga (KK)' },
  { key: 'ijazah', label: 'Ijazah' },
  { key: 'sim_gada_pratama', label: 'SIM A/B1/B2/C / Gada Pratama' },
  { key: 'skck', label: 'SKCK' },
  { key: 'surat_keterangan_sehat', label: 'Surat Keterangan Sehat' },
  { key: 'rekening_bni', label: 'Nomor Rekening BNI' },
] as const;
type ApplicationDocumentKey = (typeof APPLICATION_DOCUMENTS)[number]['key'];
type ApplicationDocumentStatus = 'ada' | 'belum_ada';
type ApplicantDocumentChecklist = Partial<Record<ApplicationDocumentKey, ApplicationDocumentStatus>>;

const emptyForm = {
  previously_worked: '',
  referral_source: '',
  position: '',
  full_name: '',
  birth_place_date: '',
  age: '',
  gender: '',
  phone: '',
  email: '',
  ktp_address: '',
  domicile: '',
  religion: '',
  marital_status: '',
  education: '',
  major: '',
  school_name: '',
  work_experience_1: '',
  work_experience_2: '',
  work_experience_3: '',
  cv_link: '',
  cover_note: '',
};

export default function JobApplicationForm({ openings, initialPosition, onClose }: JobApplicationFormProps) {
  const { user } = useAuth();
  const [form, setForm] = useState({ ...emptyForm, position: initialPosition || '', email: user?.email || '' });
  const [selectedOpeningId, setSelectedOpeningId] = useState(
    () => openings.find((opening) => opening.title === initialPosition)?.id || '',
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [documentChecklist, setDocumentChecklist] = useState<ApplicantDocumentChecklist>({});

  const set = (field: keyof typeof emptyForm) => (v: string) => setForm((f) => ({ ...f, [field]: v }));
  const setDocumentStatus = (key: ApplicationDocumentKey, status?: ApplicationDocumentStatus) => {
    setDocumentChecklist((current) => {
      const next = { ...current };
      if (status) next[key] = status;
      else delete next[key];
      return next;
    });
  };

  // Area penempatan mengikuti lokasi lowongan yang dipilih, jadi kandidat
  // tidak perlu isi ulang — cukup ditampilkan sebagai info, bukan input.
  const selectedOpening = openings.find((o) => o.id === selectedOpeningId)
    || openings.find((o) => o.title === form.position);
  const markedDocumentCount = Object.keys(documentChecklist).length;

  const submit = async () => {
    setError('');
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim() || !form.birth_place_date.trim() || !form.gender || !form.ktp_address.trim() || !selectedOpening) {
      setError('Nama, email, no. HP, tempat/tanggal lahir, jenis kelamin, alamat KTP, dan posisi yang dilamar wajib diisi.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setError('Format email tidak valid. Periksa kembali alamat email Anda.');
      return;
    }
    setSubmitting(true);
    const randomCode = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const applicationCode = `LAM-${randomCode.replace(/-/g, '').slice(0, 16).toUpperCase()}`;
    try {
      const { error: err } = await db
        .from('job_applicants')
        .insert({
          tracking_code: applicationCode,
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          position: selectedOpening.title,
          job_opening_id: selectedOpening.id,
          status: 'Lamaran Masuk',
          domicile: form.domicile.trim() || null,
          education: form.education || null,
          cv_link: form.cv_link.trim() || null,
          cover_note: form.cover_note.trim() || null,
          previously_worked: form.previously_worked || null,
          referral_source: form.referral_source || null,
          placement_area: selectedOpening.location || null,
          birth_place_date: form.birth_place_date.trim() || null,
          age: form.age ? Number(form.age) : null,
          gender: form.gender || null,
          ktp_address: form.ktp_address.trim() || null,
          religion: form.religion || null,
          marital_status: form.marital_status || null,
          major: form.major.trim() || null,
          school_name: form.school_name.trim() || null,
          work_experience_1: form.work_experience_1.trim() || null,
          work_experience_2: form.work_experience_2.trim() || null,
          work_experience_3: form.work_experience_3.trim() || null,
          document_checklist: documentChecklist,
        });
      if (err) {
        if (/document_checklist/i.test(err.message) && /(column|schema cache|does not exist)/i.test(err.message)) {
          throw new Error('Database belum memiliki kolom checklist dokumen. Pastikan schema Supabase dari `supabase/schema.sql` sudah dijalankan.');
        }
        if (/job_opening_id/i.test(err.message) && /(column|schema cache|does not exist)/i.test(err.message)) {
          throw new Error('Skema database belum memiliki kolom relasi lowongan. Jalankan SQL setup Supabase terbaru, lalu coba lagi.');
        }
        if (/row-level security|permission denied/i.test(err.message)) {
          throw new Error('Database menolak penyimpanan lamaran publik. Pastikan policy RLS untuk pengajuan lamaran publik sudah dibuat dari SQL setup.');
        }
        throw new Error(err.message);
      }
      setTrackingCode(applicationCode);
      notifyPortal(
        'Lamaran berhasil dikirim',
        `Lamaran Anda untuk posisi ${selectedOpening.title} sudah diterima. Lengkapi dokumen yang masih kurang sebelum melanjutkan ke tahap seleksi berikutnya. Kode lamaran: ${applicationCode}.`,
        'candidate',
      );
    } catch (caught) {
      setError(`Lamaran belum terkirim: ${(caught as Error).message || 'Terjadi gangguan jaringan atau database.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = async () => {
    if (!trackingCode) return;
    try {
      await navigator.clipboard.writeText(trackingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard tidak tersedia, abaikan
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Karier &amp; Rekrutmen</p>
            <h3 className="mt-1 font-display text-lg font-bold text-slate-900">{trackingCode ? 'Lamaran Terkirim' : 'Formulir Pendaftaran'}</h3>
          </div>
          <button type="button" onClick={onClose} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 sm:text-sm">
            <ArrowLeft size={16} /> Kembali
          </button>
        </div>

        {trackingCode ? (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <ClipboardCheck size={26} />
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Terima kasih, <span className="font-semibold text-slate-800">{form.full_name}</span>. Lamaran Anda untuk
              posisi <span className="font-semibold text-slate-800">{form.position}</span> sudah kami terima.
            </p>
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">Kode Lamaran Anda</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="rounded-lg bg-slate-100 px-4 py-2 font-mono text-lg font-bold tracking-wider text-slate-800">
                {trackingCode}
              </span>
              <button
                onClick={copyCode}
                className="rounded-lg border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50"
                aria-label="Salin kode"
              >
                {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Simpan kode ini untuk mengecek status lamaran Anda kapan saja lewat tombol &quot;Cek Status Lamaran&quot;.
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110"
            >
              Selesai
            </button>
          </div>
        ) : (
          <div className="space-y-6 px-5 py-5 sm:px-7">
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <FormSection title="Informasi Lamaran">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Sudah pernah bekerja di PT Bintang Sayap Utama?">
                  <select className={inputCls} value={form.previously_worked} onChange={(e) => set('previously_worked')(e.target.value)}>
                    <option value="">-- Pilih --</option>
                    {PREVIOUSLY_WORKED_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Tahu lowongan ini dari mana?">
                  <select className={inputCls} value={form.referral_source} onChange={(e) => set('referral_source')(e.target.value)}>
                    <option value="">-- Pilih --</option>
                    {REFERRAL_SOURCES.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Posisi yang Dilamar" required>
                <select
                  className={inputCls}
                  value={selectedOpeningId}
                  onChange={(e) => {
                    const opening = openings.find((item) => item.id === e.target.value);
                    setSelectedOpeningId(opening?.id || '');
                    set('position')(opening?.title || '');
                  }}
                >
                  <option value="">-- Pilih Posisi --</option>
                  {openings.map((o) => (
                    <option key={o.id} value={o.id}>{o.title}</option>
                  ))}
                </select>
              </Field>
              {selectedOpening && (
                <p className="-mt-2 text-xs text-slate-400">
                  Area penempatan: <span className="font-medium text-slate-600">{selectedOpening.location}</span>
                </p>
              )}
            </FormSection>

            <FormSection title="Data Pribadi">
              <Field label="Nama Lengkap" required>
                <input className={inputCls} value={form.full_name} onChange={(e) => set('full_name')(e.target.value)} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Tempat & Tanggal Lahir" required>
                  <input
                    className={inputCls}
                    placeholder="Contoh: Malang, 17 Agustus 1990"
                    value={form.birth_place_date}
                    onChange={(e) => set('birth_place_date')(e.target.value)}
                  />
                </Field>
                <Field label="Usia">
                  <input type="number" min={0} className={inputCls} value={form.age} onChange={(e) => set('age')(e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Jenis Kelamin" required>
                  <select className={inputCls} value={form.gender} onChange={(e) => set('gender')(e.target.value)}>
                    <option value="">-- Pilih --</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Status Perkawinan">
                  <select className={inputCls} value={form.marital_status} onChange={(e) => set('marital_status')(e.target.value)}>
                    <option value="">-- Pilih --</option>
                    {MARITAL_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Agama">
                <select className={inputCls} value={form.religion} onChange={(e) => set('religion')(e.target.value)}>
                  <option value="">-- Pilih --</option>
                  {RELIGIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </Field>
            </FormSection>

            <FormSection title="Kontak & Alamat">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Email" required>
                  <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email')(e.target.value)} readOnly={Boolean(user?.email)} autoComplete="email" />
                </Field>
                <Field label="No. HP / WhatsApp" required>
                  <input className={inputCls} value={form.phone} onChange={(e) => set('phone')(e.target.value)} />
                </Field>
              </div>
              <Field label="Alamat Lengkap Sesuai KTP" required>
                <textarea
                  rows={2}
                  className={inputCls}
                  placeholder="Nama Jalan No, RT/RW, Kel/Desa, Kec., Kab., Prop."
                  value={form.ktp_address}
                  onChange={(e) => set('ktp_address')(e.target.value)}
                />
              </Field>
              <Field label="Alamat Domisili">
                <textarea
                  rows={2}
                  className={inputCls}
                  placeholder="Isi jika berbeda dari alamat KTP"
                  value={form.domicile}
                  onChange={(e) => set('domicile')(e.target.value)}
                />
              </Field>
            </FormSection>

            <FormSection title="Pendidikan">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Pendidikan Terakhir">
                  <select className={inputCls} value={form.education} onChange={(e) => set('education')(e.target.value)}>
                    <option value="">-- Pilih --</option>
                    {EDUCATION_LEVELS.map((e) => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Jurusan">
                  <input className={inputCls} value={form.major} onChange={(e) => set('major')(e.target.value)} />
                </Field>
              </div>
              <Field label="Sekolah / Universitas">
                <input className={inputCls} value={form.school_name} onChange={(e) => set('school_name')(e.target.value)} />
              </Field>
            </FormSection>

            <FormSection title="Pengalaman Kerja">
              <Field label="Pengalaman Kerja 1">
                <input className={inputCls} placeholder="Perusahaan, posisi, tahun" value={form.work_experience_1} onChange={(e) => set('work_experience_1')(e.target.value)} />
              </Field>
              <Field label="Pengalaman Kerja 2">
                <input className={inputCls} placeholder="Perusahaan, posisi, tahun" value={form.work_experience_2} onChange={(e) => set('work_experience_2')(e.target.value)} />
              </Field>
              <Field label="Pengalaman Kerja 3">
                <input className={inputCls} placeholder="Perusahaan, posisi, tahun" value={form.work_experience_3} onChange={(e) => set('work_experience_3')(e.target.value)} />
              </Field>
            </FormSection>

            <FormSection title="Berkas Lamaran">
              <Field label="Link Berkas Lamaran">
                <input
                  className={inputCls}
                  placeholder="https://..."
                  value={form.cv_link}
                  onChange={(e) => set('cv_link')(e.target.value)}
                />
              </Field>
              <p className="-mt-2 text-xs leading-5 text-slate-500">
                Checklist tidak wajib dilengkapi saat mengirim lamaran. Tandai dokumen yang statusnya sudah diketahui; Anda tetap dapat mengirim lamaran dengan checklist kosong atau sebagian.
              </p>
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h5 className="text-xs font-semibold uppercase tracking-wide text-sky-600">Checklist Dokumen (1–8)</h5>
                <p className="-mt-2 text-xs leading-5 text-slate-500">Status yang belum dipilih tidak menghalangi pengiriman lamaran.</p>
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="w-12 px-3 py-2.5 font-semibold">No.</th>
                          <th className="px-3 py-2.5 font-semibold">Dokumen</th>
                          <th className="w-24 px-3 py-2.5 text-center font-semibold">Ada</th>
                          <th className="w-28 px-3 py-2.5 text-center font-semibold">Belum Ada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {APPLICATION_DOCUMENTS.map((document, index) => {
                          const status = documentChecklist[document.key];
                          return (
                            <tr key={document.key} className="border-t border-slate-100 even:bg-slate-50/50">
                              <td className="px-3 py-2 font-medium text-slate-400">{index + 1}</td>
                              <td className="px-3 py-2 font-medium text-slate-700">{document.label}</td>
                              <td className="px-3 py-2 text-center">
                                <input type="checkbox" aria-label={`${document.label}: Ada`} checked={status === 'ada'} onChange={(event) => setDocumentStatus(document.key, event.target.checked ? 'ada' : undefined)} className="h-4 w-4 cursor-pointer accent-blue-600" />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input type="checkbox" aria-label={`${document.label}: Belum Ada`} checked={status === 'belum_ada'} onChange={(event) => setDocumentStatus(document.key, event.target.checked ? 'belum_ada' : undefined)} className="h-4 w-4 cursor-pointer accent-blue-600" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className={`rounded-xl border px-4 py-3 text-xs leading-5 ${markedDocumentCount === APPLICATION_DOCUMENTS.length ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                  <p className="font-semibold">Status dokumen terisi {markedDocumentCount}/{APPLICATION_DOCUMENTS.length}.</p>
                  <p className="mt-1">Kelengkapan berkas akan diperiksa pada tahap administrasi. Lengkapi dokumen yang belum tersedia atau belum ditandai sebelum melanjutkan ke tahap seleksi berikutnya.</p>
                </div>
              </div>
              <Field label="Catatan / Motivasi Singkat">
                <textarea
                  rows={3}
                  className={inputCls}
                  value={form.cover_note}
                  onChange={(e) => set('cover_note')(e.target.value)}
                />
              </Field>
            </FormSection>

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Mengirim...' : 'Kirim Lamaran'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all bg-white';

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4 border-t border-slate-100 pt-5 first:border-t-0 first:pt-0">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-sky-600">{title}</h4>
      {children}
    </div>
  );
}
