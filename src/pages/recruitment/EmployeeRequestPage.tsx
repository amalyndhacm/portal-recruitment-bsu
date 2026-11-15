import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, FileText, X, Printer, CheckCircle2, XCircle, Trash2, Briefcase, Paperclip, Download, UploadCloud, AlertCircle, RotateCcw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '@/context/AuthContext';
import { db, type EmployeeRequest } from '@/lib/database';
import { normalizePortalRole } from '@/lib/accessControl';
import {
  Card, Button, Input, Select, TextArea, NumberInput, DateInput,
  LoadingState, EmptyState, Badge,
} from '@/components/ui';
import {
  REQUEST_TYPES, EMPLOYMENT_STATUSES, EDUCATION_LEVEL_OPTIONS, GENDER_OPTIONS, MARITAL_STATUS_OPTIONS,
  OVERALL_STATUSES, OVERALL_STATUS_COLORS, PUBLICATION_STATUS_COLORS, requestTypeColor, generateRequestNumber, formatDateID,
  buildApprovalSteps, getRequestCompleteness,
} from '@/lib/employeeRequest';
import {
  REGIONAL_OPTIONS, getAreaOptions, getDescriptionOptions, findLocationByDescription,
} from '@/lib/costCenter';
import { notifyPortal, notifyPortalOnce } from '@/lib/portalNotifications';
import { buildPublicJobDetails } from '@/lib/jobOpenings';

// ---------------------------------------------------------------------------
// Surat Pengajuan Penambahan / Replacement Karyawan
//
// Alur: Draft -> Diajukan -> Disetujui Kabag Umum -> Selesai
//                          \-> Ditolak
//
// - Siapa saja yang login (selain "atasan", yang read-only) bisa membuat &
//   mengajukan surat -- mewakili GA Coordinator yang mengisi form fisik.
// - Approve ("Kabag Umum") & Acknowledge ("Head HRD Div.") hanya bisa
//   dilakukan oleh accessLevel 'atasan' atau 'super_admin', karena di
//   sistem demo ini keduanya berperan sebagai pihak manajemen yang
//   menyetujui/mengetahui, bukan admin operasional per divisi.
// - Begitu status "Selesai", surat bisa dihubungkan ke satu Lowongan baru
//   di rt-job-openings (tombol "Buka Lowongan") supaya tim Recruitment
//   tidak perlu input ulang posisi & kualifikasi.
// ---------------------------------------------------------------------------

const emptyForm = {
  request_type: REQUEST_TYPES[0] as string,
  replacement_for: '',
  request_date: new Date().toISOString().slice(0, 10),
  needed_date: '',
  div_job_site: '',
  position_needed: '',
  quantity: 1,
  education_level: '',
  major: '',
  gender: '',
  marital_status: '',
  age_requirement: '',
  personal_characteristics: '',
  work_experience: '',
  special_skill: '',
  employment_status: EMPLOYMENT_STATUSES[0] as string,
  responsible_to: '',
  main_duties: '',
  additional_skills: '',
  reason: '',
};

type FormState = typeof emptyForm;
type SubmissionNotice = { kind: 'success' | 'error'; title: string; message: string };

function describePrkError(error: unknown) {
  if (error instanceof Error && error.message && error.message !== '[object Object]') return error.message;
  if (typeof error === 'string' && error !== '[object Object]') return error;
  if (error && typeof error === 'object') {
    const source = error as Record<string, unknown>;
    const parts = [source.message, source.details, source.hint, source.code]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0 && value !== '[object Object]');
    if (parts.length) return [...new Set(parts)].join(' — ');
    try { return JSON.stringify(error); } catch { /* Gunakan pesan umum di bawah. */ }
  }
  return 'Terjadi kesalahan saat menyimpan data. Periksa koneksi dan izin Supabase.';
}

async function openPrkAttachment(url: string) {
  const popup = window.open('about:blank', '_blank');
  if (!popup) {
    window.alert('Izinkan pop-up untuk membuka lampiran PRK.');
    return;
  }
  const marker = '/storage/v1/object/public/prk-documents/';
  const path = url.includes(marker) ? decodeURIComponent(url.split(marker)[1].split('?')[0]) : '';
  if (!path) {
    popup.location.replace(url);
    return;
  }
  const { data, error } = await db.storage.from('prk-documents').createSignedUrl(path, 300);
  if (error || !data?.signedUrl) {
    popup.close();
    window.alert(error?.message || 'Lampiran tidak dapat dibuka.');
    return;
  }
  popup.location.replace(data.signedUrl);
}

const STATUS_FILTER_ACTIVE_CLASSES: Record<string, string> = {
  all: 'border-teal-200 bg-teal-50 text-teal-800',
  Draft: 'border-slate-200 bg-slate-100 text-slate-800',
  Diajukan: 'border-amber-200 bg-amber-50 text-amber-800',
  'Validasi HR': 'border-blue-200 bg-blue-50 text-blue-800',
  Selesai: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Ditolak: 'border-rose-200 bg-rose-50 text-rose-800',
};

function statusFilterClasses(status: string, active: boolean) {
  return active
    ? STATUS_FILTER_ACTIVE_CLASSES[status] || STATUS_FILTER_ACTIVE_CLASSES.all
    : 'border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50';
}

function DigitalSignature({ name, role, at, status, qrValue, stageLabel }: { name: string | null; role: string; at: string | null; status: 'done' | 'rejected' | 'waiting' | 'pending'; qrValue?: string | null; stageLabel: string }) {
  const signed = status === 'done';
  const rejected = status === 'rejected';
  return (
    <div className={`mt-3 rounded-lg border p-3 text-left ${signed ? 'border-emerald-100 bg-emerald-50/60' : rejected ? 'border-red-100 bg-red-50/60' : 'border-slate-100 bg-slate-50'}`}>
      {signed || rejected ? (
        <>
          {qrValue && <div className="mx-auto flex w-fit flex-col items-center gap-1 pb-2" aria-label={`QR ${stageLabel}`}><QRCodeSVG value={qrValue} size={76} level="M" includeMargin /><span className="text-[9px] text-slate-500">QR approval · pindai untuk detail</span></div>}
          <p className={`font-signature text-center text-xs italic ${rejected ? 'text-red-800' : 'text-slate-800'}`}>{name || 'Pemohon'}</p>
          <div className="mt-1 border-t border-dashed border-slate-300 pt-1 text-center">
            <p className={`text-[10px] font-bold uppercase tracking-wider ${rejected ? 'text-red-700' : 'text-emerald-700'}`}>{rejected ? 'Keputusan penolakan' : stageLabel === 'Diajukan oleh' ? 'Pengajuan PRK' : 'Tanda tangan digital'}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">{formatDateID(at)} · {role}</p>
          </div>
        </>
      ) : (
        <p className="text-center text-xs text-slate-400">Menunggu tanda tangan &amp; persetujuan</p>
      )}
    </div>
  );
}

function buildApprovalVerificationUrl(requestId: string, stage: 'requester' | 'director' | 'hr') {
  const configuredUrl = import.meta.env.VITE_PORTAL_URL?.trim();
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  if (!configuredUrl && isLocalHost) return `PRKVERIFY|${requestId}|${stage}`;
  const url = new URL(configuredUrl || window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('verifyApproval', requestId);
  url.searchParams.set('approvalStage', stage);
  return url.toString();
}

export default function EmployeeRequestPage({ showHeader = true, initialOpen = false, publicOnly = false, accessLevel }: { showHeader?: boolean; initialOpen?: boolean; publicOnly?: boolean; accessLevel?: string }) {
  const { user } = useAuth();
  // Semua pengguna yang sudah masuk ke halaman internal dapat memberikan
  // keputusan dengan memilih kapasitas/jabatan approval yang digunakan.
  const adminRoles = ['rt_admin', 'recruitment_admin', 'rekrutmen_admin', 'rekrutment', 'hr_admin', 'admin', 'atasan', 'super_admin', 'superadmin'];
  const canApprove = Boolean(user && !publicOnly);
  const activeRole = normalizePortalRole(accessLevel || user?.accessLevel);
  const canPublish = Boolean(user && !publicOnly && (
    adminRoles.includes(user.accessLevel || '')
    || ['recruitment', 'training', 'hr', 'admin', 'super_admin'].includes(activeRole)
  ));
  // Halaman ini adalah inbox internal PRK. Dropdown status harus tersedia
  // untuk admin operasional yang membuka modul ini, termasuk profil lama yang
  // menyimpan role dengan nama berbeda.
  const canManageStatus = !publicOnly;

  const [items, setItems] = useState<EmployeeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [listMode, setListMode] = useState<'active' | 'trash'>('active');
  const [statusTab, setStatusTab] = useState<'all' | (typeof OVERALL_STATUSES)[number]>('all');

  const [showForm, setShowForm] = useState(initialOpen);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dropdown bertingkat untuk Div / Job Site: Regional -> Area -> Deskripsi.
  // Nilai akhir (Deskripsi) yang disimpan ke form.div_job_site.
  const [ccRegional, setCcRegional] = useState('');
  const [ccArea, setCcArea] = useState('');

  const [detailId, setDetailId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [approvalRole, setApprovalRole] = useState('Kepala Direktorat');
  const [customApprovalRole, setCustomApprovalRole] = useState('');
  const [hrApprovalRole, setHrApprovalRole] = useState('HR');
  const [customHrApprovalRole, setCustomHrApprovalRole] = useState('');
  const [busy, setBusy] = useState(false);
  const [submissionNotice, setSubmissionNotice] = useState<SubmissionNotice | null>(null);

  useEffect(() => {
    if (publicOnly || sessionStorage.getItem('portal:open-prk-form') !== '1') return;
    sessionStorage.removeItem('portal:open-prk-form');
    setEditingId(null);
    setForm(emptyForm);
    setAttachment(null);
    setAttachmentError('');
    setDetailId(null);
    setShowForm(true);
  }, [publicOnly]);

  const load = async () => {
    setLoading(true);
    const { data } = await db
      .from('employee_requests')
      .select('*')
      .order('created_at', { ascending: false });
    const nextItems = data || [];
    setItems(nextItems);
    const newestSubmitted = nextItems.find((item: EmployeeRequest) => item.overall_status === 'Diajukan' && !item.trashed_at);
    if (newestSubmitted) {
      notifyPortalOnce(`prk-incoming:${newestSubmitted.id}:${newestSubmitted.updated_at || newestSubmitted.created_at}`, 'PRK baru masuk', `${newestSubmitted.request_number || 'PRK'} untuk posisi ${newestSubmitted.position_needed} menunggu approval.`);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Dashboard menyimpan ID PRK yang diklik sebelum berpindah halaman.
  // Setelah daftar selesai dimuat, modal detail langsung dibuka untuk PRK itu.
  useEffect(() => {
    const requestedId = sessionStorage.getItem('portal:open-prk-id');
    if (requestedId) {
      setDetailId(requestedId);
      sessionStorage.removeItem('portal:open-prk-id');
    }
  }, []);

  const visibleItems = useMemo(() => {
    const source = items.filter((item) => listMode === 'trash' ? Boolean(item.trashed_at) : !item.trashed_at);
    if (listMode === 'trash' || statusTab === 'all') return source;
    return source.filter((i) => i.overall_status === statusTab);
  }, [items, statusTab, listMode]);

  const counts = useMemo(() => {
    const activeItems = items.filter((item) => !item.trashed_at);
    const trashedItems = items.filter((item) => Boolean(item.trashed_at));
    const c: Record<string, number> = { all: activeItems.length, trash: trashedItems.length };
    for (const s of OVERALL_STATUSES) c[s] = activeItems.filter((i) => i.overall_status === s).length;
    return c;
  }, [items]);

  const detail = items.find((i) => i.id === detailId) || null;

  useEffect(() => {
    setApprovalRole('Kepala Direktorat');
    setCustomApprovalRole('');
    setNote('');
  }, [detail?.id]);

  // -- Form (buat / edit draft) --------------------------------------------

  const openEdit = (r: EmployeeRequest) => {
    setEditingId(r.id);
    setForm({
      request_type: r.request_type,
      replacement_for: r.replacement_for || '',
      request_date: r.request_date,
      needed_date: r.needed_date || '',
      div_job_site: r.div_job_site,
      position_needed: r.position_needed,
      quantity: r.quantity,
      education_level: r.education_level || '',
      major: r.major || '',
      gender: r.gender || '',
      marital_status: r.marital_status || '',
      age_requirement: r.age_requirement || '',
      personal_characteristics: r.personal_characteristics || '',
      work_experience: r.work_experience || '',
      special_skill: r.special_skill || '',
      employment_status: r.employment_status || EMPLOYMENT_STATUSES[0],
      responsible_to: r.responsible_to || '',
      main_duties: r.main_duties || '',
      additional_skills: r.additional_skills || '',
      reason: r.reason || '',
    });
    // Coba temukan Regional & Area dari Deskripsi (div_job_site) yang tersimpan.
    // Kalau tidak ketemu (data lama sebelum fitur ini ada), biarkan kosong --
    // dropdown Deskripsi tetap menampilkan nilai lama sebagai opsi tambahan.
    const loc = findLocationByDescription(r.div_job_site);
    setCcRegional(loc?.regional || '');
    setCcArea(loc?.area || '');
    setAttachment(null);
    setAttachmentError('');
    setShowForm(true);
    setDetailId(null);
  };

  const saveDraft = async (submitNow: boolean) => {
    if (submitNow) {
      const missing = getRequestCompleteness(form);
      if (missing.length) {
        setSubmissionNotice({ kind: 'error', title: 'PRK belum lengkap', message: `Lengkapi sebelum mengajukan: ${missing.join(', ')}.` });
        return;
      }
    }
    if (attachmentError) return;
    setSaving(true);
    try {
      let requestId = editingId;
      let requestNumber = editingId ? items.find((item) => item.id === editingId)?.request_number : null;
      if (editingId) {
          const patch: Partial<EmployeeRequest> = { ...form };
          if (submitNow) {
            patch.overall_status = 'Diajukan';
            patch.submitted_by_name = user?.name || user?.email || 'Pemohon';
            patch.submitted_by_role = user?.accessLevel || 'Pemohon PRK';
            patch.approval_status = 'Menunggu';
            patch.approval_note = null;
            patch.approver_name = null;
            patch.approver_role = null;
            patch.approved_at = null;
            patch.acknowledgement_status = 'Belum Diketahui';
            patch.acknowledger_name = null;
            patch.acknowledger_role = null;
            patch.acknowledged_at = null;
          }
        const { error } = await db.from('employee_requests').update(patch).eq('id', editingId);
        if (error) throw error;
      } else {
        const sequence = items.length + 1;
        const payload = {
          ...form,
          request_number: generateRequestNumber(sequence),
          submitted_by_name: submitNow ? user?.name || user?.email || 'Pemohon' : null,
          submitted_by_role: submitNow ? user?.accessLevel || 'Pemohon PRK' : null,
          overall_status: submitNow ? 'Diajukan' : 'Draft',
          approval_status: submitNow ? 'Menunggu' : 'Belum Diproses',
          approval_note: null,
          approver_name: null,
          approver_role: null,
          approved_at: null,
          acknowledgement_status: 'Belum Diketahui',
          acknowledger_name: null,
          acknowledger_role: null,
          acknowledged_at: null,
        };
        const { data, error } = await db.from('employee_requests').insert(payload).select('id').single();
        if (error) throw error;
        requestId = data.id;
        requestNumber = payload.request_number;
      }
      if (attachment && requestId) {
        const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, '-');
        const path = `${requestId}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await db.storage.from('prk-documents').upload(path, attachment, { upsert: false, contentType: attachment.type || undefined });
        if (uploadError) throw uploadError;
        const { data: publicData } = db.storage.from('prk-documents').getPublicUrl(path);
        const { error: metadataError } = await db.from('employee_requests').update({
          attachment_url: publicData.publicUrl,
          attachment_name: attachment.name,
          attachment_size: attachment.size,
          attachment_type: attachment.type || null,
        }).eq('id', requestId);
        if (metadataError) throw metadataError;
      }
      setShowForm(false);
      setEditingId(null);
      setAttachment(null);
      setAttachmentError('');
      setSubmissionNotice({
        kind: 'success',
        title: submitNow ? 'PRK berhasil dikirim' : 'Draft PRK berhasil disimpan',
        message: submitNow
            ? `Pengajuan ${requestNumber || ''} sudah terkirim dan menunggu persetujuan Kepala Direktorat.`
          : `Pengajuan ${requestNumber || ''} tersimpan sebagai draft. Kirim pengajuan dari daftar PRK saat sudah siap.`,
      });
      notifyPortal(
        submitNow ? 'PRK diajukan' : 'PRK disimpan',
        submitNow
          ? `${requestNumber || 'PRK'} untuk posisi ${form.position_needed} berhasil dikirim dan menunggu approval.`
          : `${requestNumber || 'PRK'} untuk posisi ${form.position_needed} berhasil disimpan sebagai draft dan tampil di Dashboard Recruitment.`,
      );
      load();
    } catch (error) {
      setSubmissionNotice({
        kind: 'error',
        title: submitNow ? 'PRK belum terkirim' : 'Draft PRK belum tersimpan',
        message: `${describePrkError(error)} Silakan coba lagi.`,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAttachment = (file: File | undefined) => {
    setAttachmentError('');
    if (!file) { setAttachment(null); return; }
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowed.includes(file.type) && !/\.(pdf|doc|docx|xls|xlsx)$/i.test(file.name)) {
      setAttachment(null);
      setAttachmentError('Format berkas harus PDF, Word, atau Excel.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAttachment(null);
      setAttachmentError('Ukuran berkas maksimal 10 MB.');
      return;
    }
    setAttachment(file);
  };

  const moveToTrash = async (request: EmployeeRequest) => {
    if (!canManageStatus || request.trashed_at || busy) return;
    const isPublished = request.publication_status === 'Dipublikasikan';
    const message = [
      `Pindahkan PRK ${request.request_number || ''} ke Sampah?`,
      'Data tetap tersimpan dan dapat dipulihkan dari tab Sampah.',
      isPublished ? 'Lowongan terkait akan dinonaktifkan sampai PRK dipulihkan dan dipublikasikan kembali.' : '',
    ].filter(Boolean).join('\n\n');
    if (!window.confirm(message)) return;

    setBusy(true);
    try {
      let linkedOpeningWasActive = false;
      if (request.linked_job_opening_id) {
        const { data: opening, error: openingError } = await db
          .from('job_openings')
          .select('is_active')
          .eq('id', request.linked_job_opening_id)
          .maybeSingle();
        if (openingError) throw openingError;
        linkedOpeningWasActive = opening?.is_active === true;
        if (linkedOpeningWasActive) {
          const { error: unpublishError } = await db
            .from('job_openings')
            .update({ is_active: false })
            .eq('id', request.linked_job_opening_id);
          if (unpublishError) throw unpublishError;
        }
      }

      const patch: Partial<EmployeeRequest> = { trashed_at: new Date().toISOString() };
      if (request.linked_job_opening_id || isPublished) {
        patch.publication_status = 'Draft';
        patch.published_at = null;
        patch.published_by_name = null;
      }
      const { error } = await db
        .from('employee_requests')
        .update(patch)
        .eq('id', request.id)
        .is('trashed_at', null);
      if (error) {
        if (linkedOpeningWasActive && request.linked_job_opening_id) {
          await db.from('job_openings').update({ is_active: true }).eq('id', request.linked_job_opening_id);
        }
        throw error;
      }

      setDetailId(null);
      setListMode('active');
      setStatusTab('all');
      setSubmissionNotice({ kind: 'success', title: 'PRK dipindahkan ke Sampah', message: 'Data PRK tidak dihapus permanen dan bisa dipulihkan kapan saja dari tab Sampah.' });
      await load();
    } catch (error) {
      setSubmissionNotice({ kind: 'error', title: 'PRK belum dipindahkan', message: describePrkError(error) });
    } finally {
      setBusy(false);
    }
  };

  const restoreFromTrash = async (request: EmployeeRequest) => {
    if (!canManageStatus || !request.trashed_at || busy) return;
    setBusy(true);
    try {
      const { error } = await db
        .from('employee_requests')
        .update({ trashed_at: null })
        .eq('id', request.id)
        .not('trashed_at', 'is', null);
      if (error) throw error;
      setDetailId(null);
      setListMode('active');
      setStatusTab('all');
      setSubmissionNotice({ kind: 'success', title: 'PRK dipulihkan', message: 'PRK kembali ke daftar aktif. Jika sebelumnya memiliki lowongan, lowongan tetap berupa draft dan perlu dipublikasikan kembali.' });
      await load();
    } catch (error) {
      setSubmissionNotice({ kind: 'error', title: 'PRK belum dipulihkan', message: describePrkError(error) });
    } finally {
      setBusy(false);
    }
  };

  const deletePermanently = async (request: EmployeeRequest) => {
    if (!canManageStatus || !request.trashed_at || busy) return;
    const confirmation = [
      `Hapus permanen PRK ${request.request_number || ''}?`,
      'Tindakan ini tidak dapat dibatalkan. Catatan lowongan terkait tetap dipertahankan, tetapi tidak lagi terhubung ke PRK ini.',
      request.attachment_url ? 'Berkas lampiran PRK juga akan dihapus dari penyimpanan bila izin storage tersedia.' : '',
    ].filter(Boolean).join('\n\n');
    if (!window.confirm(confirmation)) return;

    setBusy(true);
    try {
      if (request.linked_job_opening_id) {
        const { data: opening, error: openingError } = await db
          .from('job_openings')
          .select('is_active')
          .eq('id', request.linked_job_opening_id)
          .maybeSingle();
        if (openingError) throw openingError;
        if (opening?.is_active) {
          const { error: unpublishError } = await db
            .from('job_openings')
            .update({ is_active: false })
            .eq('id', request.linked_job_opening_id);
          if (unpublishError) throw unpublishError;
        }
      }

      const { error } = await db
        .from('employee_requests')
        .delete()
        .eq('id', request.id)
        .not('trashed_at', 'is', null);
      if (error) throw error;

      let fileWarning = '';
      const storageMarker = '/storage/v1/object/public/prk-documents/';
      if (request.attachment_url?.includes(storageMarker)) {
        const storagePath = decodeURIComponent(request.attachment_url.split(storageMarker)[1].split('?')[0]);
        const { error: storageError } = await db.storage.from('prk-documents').remove([storagePath]);
        if (storageError) fileWarning = ' Data PRK terhapus, tetapi berkas lampiran tidak berhasil dihapus dari storage.';
      }
      setDetailId(null);
      setSubmissionNotice({ kind: 'success', title: 'PRK dihapus permanen', message: `Catatan PRK telah dihapus. Catatan lowongan terkait tetap dipertahankan.${fileWarning}` });
      await load();
    } catch (error) {
      setSubmissionNotice({ kind: 'error', title: 'PRK belum dihapus permanen', message: describePrkError(error) });
    } finally {
      setBusy(false);
    }
  };

  // -- Aksi approval (tahap 2 & 3) ------------------------------------------

  const approve = async (approved: boolean) => {
    if (!detail || detail.trashed_at) return;
    const selectedRole = approvalRole === 'Lainnya' ? customApprovalRole.trim() : approvalRole;
    if (!selectedRole) {
      setSubmissionNotice({ kind: 'error', title: 'Jabatan approval belum diisi', message: 'Pilih kapasitas approval atau isi jabatan pada pilihan Lainnya.' });
      return;
    }
    setBusy(true);
    try {
      const { error } = await db.from('employee_requests').update({
        approval_status: approved ? 'Disetujui' : 'Ditolak',
        approval_note: note || null,
        approver_name: user?.name || null,
        approver_role: selectedRole,
        approved_at: new Date().toISOString(),
        overall_status: approved ? 'Validasi HR' : 'Ditolak',
      }).eq('id', detail.id);
      if (error) throw error;
      setNote('');
      notifyPortal('Approval PRK diproses', `${detail.request_number || 'PRK'} ${approved ? 'disetujui' : 'ditolak'} oleh ${user?.name || selectedRole}.`);
      await load();
    } catch (error) {
      setSubmissionNotice({ kind: 'error', title: 'Approval belum tersimpan', message: describePrkError(error) });
    } finally {
      setBusy(false);
    }
  };

  const acknowledge = async () => {
    if (!detail || detail.trashed_at) return;
    const selectedRole = hrApprovalRole === 'Lainnya' ? customHrApprovalRole.trim() : hrApprovalRole;
    if (!selectedRole) {
      setSubmissionNotice({ kind: 'error', title: 'Jabatan HR belum diisi', message: 'Pilih kapasitas HR atau isi jabatan pada pilihan Lainnya.' });
      return;
    }
    setBusy(true);
    try {
      const publishedAt = new Date().toISOString();
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 30);
      const publicJobDetails = buildPublicJobDetails(detail);

      // Setelah validasi HR selesai, PRK langsung menjadi sumber lowongan aktif.
      // Flyer bersifat opsional; kartu lowongan di Beranda cukup memakai data ini.
      let openingId = detail.linked_job_opening_id;
      let createdOpening = false;
      if (openingId) {
        const { error: openingError } = await db.from('job_openings').update({ is_active: true }).eq('id', openingId);
        if (openingError) throw openingError;
      } else {
        const { data: opening, error: openingError } = await db.from('job_openings').insert({
          title: detail.position_needed,
          division: detail.div_job_site,
          location: detail.div_job_site,
          type: detail.employment_status === 'Kontrak' ? 'Contract' : 'Full-time',
          color_index: 0,
          description: publicJobDetails.description,
          qualifications: publicJobDetails.qualifications,
          responsibilities: publicJobDetails.responsibilities,
          benefits: publicJobDetails.benefits,
          deadline: deadline.toISOString().slice(0, 10),
          featured: true,
          is_active: true,
        }).select('id').single();
        if (openingError || !opening?.id) throw openingError || new Error('Lowongan aktif tidak berhasil dibuat.');
        openingId = opening.id;
        createdOpening = true;
      }

      const { error } = await db.from('employee_requests').update({
        acknowledgement_status: 'Sudah Diketahui',
        acknowledger_name: user?.name || null,
        acknowledger_role: selectedRole,
        acknowledged_at: publishedAt,
        overall_status: 'Selesai',
        linked_job_opening_id: openingId,
        publication_status: 'Dipublikasikan',
        published_at: publishedAt,
        published_by_name: user?.name || user?.email || selectedRole,
      }).eq('id', detail.id);
      if (error) {
        await db.from('job_openings').update({ is_active: false }).eq('id', openingId);
        if (createdOpening) await db.from('job_openings').delete().eq('id', openingId);
        throw error;
      }
      notifyPortal('PRK disetujui dan lowongan tayang', `${detail.position_needed} sudah disetujui lengkap dan tampil di Beranda serta halaman Karier.`);
      await load();
    } catch (error) {
      setSubmissionNotice({ kind: 'error', title: 'Validasi HR belum tersimpan', message: describePrkError(error) });
    } finally {
      setBusy(false);
    }
  };

  const reopenApproval = async (request: EmployeeRequest | null = detail) => {
    if (!request || request.trashed_at || !canApprove) return;
    const isPublished = request.publication_status === 'Dipublikasikan';
    const confirmation = [
      'Kembalikan PRK ke tahap awal approval (Diajukan)?',
      'Status persetujuan dan tanda tangan yang sudah tercatat akan direset untuk diproses ulang.',
      isPublished ? 'Lowongan yang sedang tayang juga akan dinonaktifkan sampai PRK selesai disetujui kembali.' : '',
    ].filter(Boolean).join('\n\n');
    if (!window.confirm(confirmation)) return;
    setBusy(true);
    try {
      let wasOpeningActive = false;
      if (request.linked_job_opening_id) {
        const { data: opening, error: openingFetchError } = await db
          .from('job_openings')
          .select('is_active')
          .eq('id', request.linked_job_opening_id)
          .maybeSingle();
        if (openingFetchError) throw openingFetchError;
        wasOpeningActive = opening?.is_active === true;
      }
      if (request.linked_job_opening_id && wasOpeningActive) {
        const { error: unpublishError } = await db
          .from('job_openings')
          .update({ is_active: false })
          .eq('id', request.linked_job_opening_id);
        if (unpublishError) throw unpublishError;
      }
      const { error } = await db.from('employee_requests').update({
        overall_status: 'Diajukan',
        approval_status: 'Menunggu',
        approval_note: null,
        approver_name: null,
        approver_role: null,
        approved_at: null,
        acknowledgement_status: 'Belum Diketahui',
        acknowledger_name: null,
        acknowledger_role: null,
        acknowledged_at: null,
        publication_status: request.linked_job_opening_id ? 'Draft' : 'Belum Disiapkan',
        published_at: null,
        published_by_name: null,
      }).eq('id', request.id);
      if (error) {
        if (request.linked_job_opening_id && wasOpeningActive) {
          await db.from('job_openings').update({ is_active: true }).eq('id', request.linked_job_opening_id);
        }
        throw error;
      }
      setApprovalRole('Kepala Direktorat');
      setCustomApprovalRole('');
      setHrApprovalRole('HR');
      setCustomHrApprovalRole('');
      setNote('');
      await load();
    } catch (error) {
      setSubmissionNotice({ kind: 'error', title: 'Persetujuan belum dibuka kembali', message: (error as Error).message || 'Terjadi kesalahan saat mengulang proses persetujuan.' });
    } finally {
      setBusy(false);
    }
  };

  const openJobOpening = async (request: EmployeeRequest | null = detail) => {
    if (!request || request.trashed_at || !canPublish || request.overall_status !== 'Selesai') return;
    setBusy(true);
    try {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 30);
      const publicJobDetails = buildPublicJobDetails(request);
      const { data, error } = await db.from('job_openings').insert({
        title: request.position_needed,
        division: request.div_job_site,
        location: request.div_job_site,
        type: request.employment_status === 'Kontrak' ? 'Contract' : 'Full-time',
        color_index: 0,
        description: publicJobDetails.description,
        qualifications: publicJobDetails.qualifications,
        responsibilities: publicJobDetails.responsibilities,
        benefits: publicJobDetails.benefits,
        deadline: deadline.toISOString().slice(0, 10),
        featured: false,
        // Lowongan dibuat sebagai draft terlebih dahulu. Recruitment harus
        // meninjau data lalu menekan tombol publikasi secara sadar.
        is_active: false,
      }).select('id').single();
      if (error) throw error;
      if (data?.id) {
        const { error: linkError } = await db.from('employee_requests').update({
          linked_job_opening_id: data.id,
          publication_status: 'Draft',
        }).eq('id', request.id);
        if (linkError) {
          await db.from('job_openings').delete().eq('id', data.id);
          throw linkError;
        }
        notifyPortal('Draft lowongan dibuat', `Lowongan ${request.position_needed} berhasil disiapkan dari ${request.request_number || 'PRK'}.`);
        await load();
      }
    } catch (error) {
      setSubmissionNotice({ kind: 'error', title: 'Lowongan belum dibuat', message: (error as Error).message || 'Terjadi kesalahan saat menyiapkan lowongan.' });
    } finally {
      setBusy(false);
    }
  };

  const publishJobOpening = async (request: EmployeeRequest | null = detail) => {
    if (!request?.linked_job_opening_id || request.trashed_at || !canPublish || request.overall_status !== 'Selesai') return;
    setBusy(true);
    try {
      const { error: openingError } = await db.from('job_openings').update({ is_active: true }).eq('id', request.linked_job_opening_id);
      if (openingError) throw openingError;
      const { error: requestError } = await db.from('employee_requests').update({
        publication_status: 'Dipublikasikan',
        published_at: new Date().toISOString(),
        published_by_name: user?.name || null,
      }).eq('id', request.id);
      if (requestError) {
        await db.from('job_openings').update({ is_active: false }).eq('id', request.linked_job_opening_id);
        throw requestError;
      }
      await load();
      notifyPortal('Lowongan dipublikasikan', `${request.position_needed} sekarang aktif dan dapat dilihat publik.`);
    } catch (error) {
      setSubmissionNotice({ kind: 'error', title: 'Lowongan belum dipublikasikan', message: (error as Error).message || 'Terjadi kesalahan saat mempublikasikan lowongan.' });
    } finally {
      setBusy(false);
    }
  };

  const handleListPreparation = (request: EmployeeRequest) => {
    if (request.trashed_at || request.overall_status !== 'Selesai' || !canPublish || busy) return;
    if (request.linked_job_opening_id) return;
    setDetailId(request.id);
    void openJobOpening(request);
  };

  const submitDraft = async (r: EmployeeRequest) => {
      if (r.trashed_at) return;
      const missing = getRequestCompleteness({
        request_type: r.request_type, request_date: r.request_date, needed_date: r.needed_date || '',
        div_job_site: r.div_job_site, position_needed: r.position_needed, quantity: r.quantity,
        employment_status: r.employment_status || '', reason: r.reason || '', replacement_for: r.replacement_for || '',
      });
      if (missing.length) {
        setSubmissionNotice({ kind: 'error', title: 'PRK belum lengkap', message: `Buka Edit Surat untuk melengkapi: ${missing.join(', ')}.` });
        return;
      }
      await db.from('employee_requests').update({
        overall_status: 'Diajukan',
        submitted_by_name: user?.name || user?.email || 'Pemohon',
        submitted_by_role: user?.accessLevel || 'Pemohon PRK',
        approval_status: 'Menunggu',
        approval_note: null,
        approver_name: null,
        approver_role: null,
        approved_at: null,
        acknowledgement_status: 'Belum Diketahui',
        acknowledger_name: null,
        acknowledger_role: null,
        acknowledged_at: null,
      }).eq('id', r.id);
    load();
  };

  return (
    <div>
      {showHeader && (
        <section className="relative mb-6 overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-[#f0fbf8] via-white to-sky-50 px-5 py-5 shadow-sm sm:px-6 sm:py-6">
          <div aria-hidden="true" className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-teal-200/30 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-900/15">
                <FileText className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">Recruitment · Perencanaan</p>
                <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Pengajuan Karyawan Baru</h1>
                <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-600">Kelola kebutuhan tenaga kerja, approval PRK, validasi HR, hingga persiapan lowongan.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('portal:navigate-home'))}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white bg-white/80 px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-white hover:text-teal-800"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali ke Dashboard
            </button>
          </div>
        </section>
      )}

      {!publicOnly && (
        <section className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-white via-white to-teal-50/70 px-4 py-4 sm:px-5">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-700">{listMode === 'trash' ? 'Arsip sementara' : 'Inbox Recruitment'}</p>
              <h2 className="mt-1 text-base font-bold text-slate-900">{listMode === 'trash' ? 'Sampah PRK' : 'Data masuk dari Formulir PRK'}</h2>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                {listMode === 'trash' ? 'Pulihkan pengajuan untuk melanjutkan proses. Penghapusan permanen tidak dapat dibatalkan.' : 'Tinjau pengajuan, ikuti status approval, lalu siapkan lowongan setelah PRK selesai disetujui.'}
              </p>
            </div>
            <div className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 shadow-inner">
              <button
                type="button"
                onClick={() => { setListMode('active'); setStatusTab('all'); }}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${listMode === 'active' ? 'bg-white text-teal-800 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'}`}
              >
                PRK Aktif <span className={`rounded-full px-2 py-0.5 text-[11px] ${listMode === 'active' ? 'bg-teal-50 text-teal-800' : 'bg-slate-200/70 text-slate-600'}`}>{counts.all}</span>
              </button>
              <button
                type="button"
                onClick={() => { setListMode('trash'); setStatusTab('all'); }}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all ${listMode === 'trash' ? 'bg-white text-amber-800 shadow-sm ring-1 ring-slate-200/80' : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'}`}
              >
                <Trash2 className="h-4 w-4" /> Sampah <span className={`rounded-full px-2 py-0.5 text-[11px] ${listMode === 'trash' ? 'bg-amber-50 text-amber-800' : 'bg-slate-200/70 text-slate-600'}`}>{counts.trash}</span>
              </button>
            </div>
          </div>
          {listMode === 'active' && (
            <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                <span>Status pengajuan</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setStatusTab('all')}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${statusFilterClasses('all', statusTab === 'all')}`}
                >
                  Semua <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px]">{counts.all}</span>
                </button>
                {OVERALL_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusTab(s)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${statusFilterClasses(s, statusTab === s)}`}
                  >
                    {s} <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px]">{counts[s] || 0}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {!publicOnly && (loading ? (
        <LoadingState />
      ) : visibleItems.length === 0 ? (
        <Card className="!rounded-2xl p-8 shadow-sm"><EmptyState message={listMode === 'trash' ? 'Sampah kosong. PRK yang dipindahkan ke Sampah akan muncul di sini dan dapat dipulihkan.' : 'Belum ada PRK masuk pada status ini. Pengajuan baru akan muncul setelah pemohon mengisi formulir PRK di navbar Beranda.'} /></Card>
      ) : (
        <Card className="overflow-hidden !rounded-2xl shadow-sm shadow-slate-900/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
            <div>
              <p className="text-sm font-bold text-slate-900">{listMode === 'trash' ? 'PRK di Sampah' : 'Daftar Pengajuan PRK'}</p>
              <p className="mt-0.5 text-xs text-slate-500">{listMode === 'trash' ? 'Pengajuan sementara yang dapat dipulihkan atau dihapus permanen.' : 'Gunakan detail untuk meninjau data dan melanjutkan proses approval.'}</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">{visibleItems.length} {listMode === 'trash' ? 'item' : 'pengajuan'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] table-fixed text-sm">
              <colgroup>
                <col style={{ width: '17%' }} />
                <col style={{ width: '19%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '18%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Pengajuan</th>
                  <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Posisi &amp; Kebutuhan</th>
                  <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Jenis / Unit</th>
                  <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Berkas</th>
                  <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Status</th>
                  <th className="px-3 py-3 text-center text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((r) => (
                  <tr key={r.id} className="group border-b border-slate-100 transition-colors last:border-0 hover:bg-teal-50/35">
                    <td className="px-3 py-3 align-middle">
                      <p className="font-semibold text-slate-800">{r.request_number || 'No. PRK —'}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatDateID(r.request_date)}</p>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <p className="max-w-[220px] font-semibold leading-5 text-slate-800">{r.position_needed}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{r.quantity} orang dibutuhkan</p>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className={`inline-flex max-w-full whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${requestTypeColor(r.request_type) === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {r.request_type}
                        </span>
                        <p className="max-w-full text-xs leading-4 text-slate-600">{r.div_job_site}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      {r.attachment_url ? (
                        <button type="button" onClick={() => void openPrkAttachment(r.attachment_url!)} title={r.attachment_name || 'Buka berkas'} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-100 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:border-sky-200 hover:bg-sky-100">
                          <Paperclip className="h-3.5 w-3.5" />Buka
                        </button>
                      ) : <span className="text-xs text-slate-400">Tidak ada</span>}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <div className="flex flex-col items-start gap-1.5">
                        {r.trashed_at ? <Badge text="Di Sampah" color="slate" /> : canManageStatus ? (
                          <Badge text={r.overall_status === 'Ditolak' ? 'Ditolak · Arsip' : r.overall_status} color={OVERALL_STATUS_COLORS[r.overall_status]} />
                        ) : (
                          <button type="button" onClick={() => setDetailId(r.id)} title="Buka detail dan proses persetujuan"><Badge text={r.overall_status} color={OVERALL_STATUS_COLORS[r.overall_status]} /></button>
                        )}
                        {listMode === 'active' && r.overall_status === 'Selesai' && (
                          <span className={`text-[11px] font-medium ${r.publication_status === 'Dipublikasikan' ? 'text-emerald-700' : 'text-slate-500'}`}>
                            Lowongan: {r.publication_status === 'Dipublikasikan' ? 'Tayang' : r.linked_job_opening_id ? 'Draft' : 'Belum disiapkan'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center align-middle">
                      <div className="flex min-w-max items-center justify-center gap-1.5">
                        {listMode === 'active' && r.overall_status === 'Selesai' && canPublish && !r.linked_job_opening_id && (
                          <Button
                            variant="secondary"
                            className="!px-2 !py-1.5 !text-xs"
                            disabled={busy}
                            onClick={() => handleListPreparation(r)}
                          >
                            <Briefcase className="mr-1 inline h-3.5 w-3.5" />
                            Siapkan Draft
                          </Button>
                        )}
                        <Button variant="secondary" className="!px-2.5 !py-1.5 !text-xs" onClick={() => setDetailId(r.id)}>Detail</Button>
                        {listMode === 'active' ? (
                          <button type="button" aria-label="Pindahkan ke sampah" title="Pindahkan ke sampah" className="rounded-lg p-2 text-slate-400 transition hover:bg-amber-50 hover:text-amber-700" disabled={busy} onClick={() => moveToTrash(r)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <>
                            <Button variant="secondary" className="!px-2.5 !py-1.5 !text-xs" disabled={busy} onClick={() => restoreFromTrash(r)}><RotateCcw className="mr-1 inline h-3.5 w-3.5" />Pulihkan</Button>
                            <button type="button" aria-label="Hapus permanen" title="Hapus permanen" className="rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-600" disabled={busy} onClick={() => deletePermanently(r)}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {/* ---- Modal: Form buat / edit surat (draft) ---- */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-md">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-slate-300 bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div><h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit Formulir PRK' : 'Formulir Permintaan Rekrutmen Karyawan (PRK)'}</h2><p className="mt-1 text-xs text-slate-500">Nomor dokumen dibuat otomatis setelah formulir disimpan.</p></div>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              <div className={`rounded-xl border p-4 ${getRequestCompleteness(form).length ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}><p className="text-sm font-semibold text-slate-800">Pemeriksaan kelengkapan PRK</p>{getRequestCompleteness(form).length ? <p className="mt-1 text-xs text-amber-800">Masih perlu dilengkapi: {getRequestCompleteness(form).join(', ')}. Draft tetap dapat disimpan; PRK belum dapat diajukan.</p> : <p className="mt-1 text-xs text-emerald-800">Data wajib lengkap. PRK siap diajukan ke Kepala Direktorat.</p>}</div>
              <div className="border border-slate-300"><h3 className="border-b border-slate-300 bg-slate-50 px-4 py-2 text-sm font-bold uppercase tracking-wide text-slate-700">1. Informasi Permintaan</h3>
              <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                <Select label="Jenis Pengajuan" value={form.request_type} onChange={(v) => setForm({ ...form, request_type: v })} options={[...REQUEST_TYPES]} required />
                {form.request_type === 'Replacement' && (
                  <Input label="Menggantikan (nama karyawan)" value={form.replacement_for} onChange={(v) => setForm({ ...form, replacement_for: v })} placeholder="Nama karyawan yang digantikan" required />
                )}
                <DateInput label="Tanggal Pengajuan" value={form.request_date} onChange={(v) => setForm({ ...form, request_date: v })} required />
                <DateInput label="Tanggal Dibutuhkan" value={form.needed_date} onChange={(v) => setForm({ ...form, needed_date: v })} required />

                <div className="sm:col-span-2">
                  <p className="mb-1.5 text-sm font-medium text-slate-700">
                    Div / Job Site <span className="text-red-500">*</span>
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Select
                      label="Regional"
                      value={ccRegional}
                      onChange={(v) => {
                        setCcRegional(v);
                        setCcArea('');
                        setForm({ ...form, div_job_site: '' });
                      }}
                      options={REGIONAL_OPTIONS}
                      required
                    />
                    <Select
                      label="Area"
                      value={ccArea}
                      onChange={(v) => {
                        setCcArea(v);
                        setForm({ ...form, div_job_site: '' });
                      }}
                      options={getAreaOptions(ccRegional)}
                      disabled={!ccRegional}
                      placeholder={ccRegional ? '-- Pilih --' : '-- Pilih Regional dahulu --'}
                      required
                    />
                    <Select
                      label="Deskripsi (Cost Center)"
                      value={form.div_job_site}
                      onChange={(v) => setForm({ ...form, div_job_site: v })}
                      options={
                        // Kalau sedang edit data lama dan nilainya tidak ada di
                        // daftar resmi, tetap tampilkan supaya tidak hilang.
                        form.div_job_site && !getDescriptionOptions(ccRegional, ccArea).includes(form.div_job_site)
                          ? [...getDescriptionOptions(ccRegional, ccArea), form.div_job_site]
                          : getDescriptionOptions(ccRegional, ccArea)
                      }
                      disabled={!ccArea}
                      placeholder={ccArea ? '-- Pilih --' : '-- Pilih Area dahulu --'}
                      required
                    />
                  </div>
                </div>

                <Input label="Untuk Jabatan" value={form.position_needed} onChange={(v) => setForm({ ...form, position_needed: v })} placeholder="cth. Office Boy, Security" required />
                <NumberInput label="Jumlah Dibutuhkan" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} required />
                <Select label="Status Hubungan Kerja" value={form.employment_status} onChange={(v) => setForm({ ...form, employment_status: v })} options={[...EMPLOYMENT_STATUSES]} required />
              </div>
              </div>

              <div className="border border-slate-300">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">2. Dasar / Alasan Permintaan Rekrutmen</h3>
                <div className="px-4 pb-4"><TextArea label="Dasar / Alasan Permintaan" value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} placeholder="Jelaskan dasar kebutuhan: penambahan, replacement, ekspansi, atau alasan lainnya" required /></div>
              </div>

              <div className="border border-slate-300">
                <h3 className="border-b border-slate-300 bg-slate-50 px-4 py-2 text-sm font-bold uppercase tracking-wide text-slate-700">3. Persyaratan Calon Karyawan & Informasi Jabatan</h3>
                <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                  <Select label="Tingkat Pendidikan" value={form.education_level} onChange={(v) => setForm({ ...form, education_level: v })} options={EDUCATION_LEVEL_OPTIONS} />
                  <Input label="Jurusan" value={form.major} onChange={(v) => setForm({ ...form, major: v })} placeholder="cth. Semua Jurusan" />
                  <Select label="Jenis Kelamin" value={form.gender} onChange={(v) => setForm({ ...form, gender: v })} options={GENDER_OPTIONS} />
                  <Select label="Status Perkawinan" value={form.marital_status} onChange={(v) => setForm({ ...form, marital_status: v })} options={MARITAL_STATUS_OPTIONS} />
                  <Input label="Usia" value={form.age_requirement} onChange={(v) => setForm({ ...form, age_requirement: v })} placeholder="cth. < 30 tahun" />
                  <Input label="Pengalaman Kerja" value={form.work_experience} onChange={(v) => setForm({ ...form, work_experience: v })} placeholder="cth. > 1 tahun" />
                  <Input label="Karakteristik Pribadi" value={form.personal_characteristics} onChange={(v) => setForm({ ...form, personal_characteristics: v })} placeholder="cth. Rajin, tekun, jujur, disiplin" />
                  <Input label="Keahlian Khusus" value={form.special_skill} onChange={(v) => setForm({ ...form, special_skill: v })} placeholder="cth. sertifikat OB diutamakan" />
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Tanggung Jawab & Uraian Tugas</h3>
                <div className="space-y-4">
                  <Input label="Bertanggung Jawab Kepada" value={form.responsible_to} onChange={(v) => setForm({ ...form, responsible_to: v })} placeholder="cth. Kebersihan, kenyamanan area kerja Gudang X" />
                  <TextArea label="Uraian Tugas Utama" value={form.main_duties} onChange={(v) => setForm({ ...form, main_duties: v })} placeholder="Deskripsikan tugas utama pekerjaan ini" />
                  <TextArea label="Kemampuan Tambahan Yang Mendukung" value={form.additional_skills} onChange={(v) => setForm({ ...form, additional_skills: v })} />
                </div>
              </div>

                <div className="border border-slate-300"><h3 className="border-b border-slate-300 bg-slate-50 px-4 py-2 text-sm font-bold uppercase tracking-wide text-slate-700">4. Berkas Pendukung</h3><div className="p-4"><input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" className="hidden" onChange={(e) => handleAttachment(e.target.files?.[0])} /><button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sky-200 bg-sky-50 px-4 py-5 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-100"><UploadCloud className="h-5 w-5" />Pilih berkas hasil pengajuan PRK</button><p className="mt-2 text-xs text-slate-500">PDF, Word, atau Excel — maksimal 10 MB.</p>{attachment && <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="flex min-w-0 items-center gap-2 truncate"><Paperclip className="h-4 w-4 shrink-0 text-sky-600" />{attachment.name}</span><button type="button" onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="ml-3 text-slate-400 hover:text-red-600"><X className="h-4 w-4" /></button></div>}{attachmentError && <p className="mt-2 text-xs font-medium text-red-600">{attachmentError}</p>}</div></div>
                <div className="border border-slate-300"><h3 className="border-b border-slate-300 bg-slate-50 px-4 py-2 text-sm font-bold uppercase tracking-wide text-slate-700">5. Persetujuan &amp; tindak lanjut</h3><div className="grid grid-cols-3 divide-x divide-slate-300"><div className="min-h-28 p-3"><p className="text-xs font-semibold text-slate-600">Diajukan Oleh</p><p className="mt-12 text-center text-xs text-slate-400">Pemohon</p></div><div className="min-h-28 p-3"><p className="text-xs font-semibold text-slate-600">Disetujui Oleh</p><p className="mt-12 text-center text-xs text-slate-400">Kepala Direktorat</p></div><div className="min-h-28 p-3"><p className="text-xs font-semibold text-slate-600">Tahap Berikutnya</p><p className="mt-12 text-center text-xs text-slate-400">Validasi &amp; analisis HR</p></div></div><p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">PRK yang ditolak akan diarsipkan. PRK yang disetujui diteruskan ke HR untuk validasi kebutuhan.</p></div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Batal</Button>
              <Button variant="secondary" disabled={saving} onClick={() => saveDraft(false)}>Simpan Draft</Button>
              <Button disabled={saving} onClick={() => saveDraft(true)}>{saving ? 'Menyimpan...' : 'Simpan & Ajukan'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Modal: Detail surat + approval + cetak ---- */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:static print:block print:bg-white print:p-0">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl print:max-h-none print:w-auto print:overflow-visible print:rounded-none print:shadow-none">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 print:hidden">
              <h2 className="text-lg font-bold text-slate-900">Detail Surat Pengajuan</h2>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => window.print()}><Printer className="inline h-4 w-4 -mt-0.5 mr-1" />Cetak Surat</Button>
                <button onClick={() => setDetailId(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Bagian ini yang ikut tercetak -- meniru layout kop surat asli */}
            <div className="px-8 py-6 print:px-10 print:py-8">
              <div className="mb-4 text-center">
                <p className="text-xs text-slate-400 print:hidden">PT. BINTANG SAYAP UTAMA</p>
                <h1 className="text-xl font-bold underline">Surat Pengajuan {detail.request_type === 'Replacement' ? 'Replacement Karyawan' : 'Penambahan Karyawan Baru'}</h1>
                <p className="text-sm text-slate-500">No. {detail.request_number || '-'}</p>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div><span className="text-slate-500">Tanggal Pengajuan</span> : {formatDateID(detail.request_date)}</div>
                <div><span className="text-slate-500">Div / Job Site</span> : {detail.div_job_site}</div>
                <div><span className="text-slate-500">Tanggal Dibutuhkan</span> : {formatDateID(detail.needed_date)}</div>
                <div><span className="text-slate-500">Untuk Jabatan</span> : {detail.position_needed} {detail.quantity > 1 && `(${detail.quantity} Orang)`}</div>
                {detail.request_type === 'Replacement' && (
                  <div className="col-span-2"><span className="text-slate-500">Menggantikan</span> : {detail.replacement_for || '-'}</div>
                )}
              </div>

              <div className="mb-2 border-t border-b border-slate-800 py-1 text-center text-sm font-bold">PERSYARATAN CALON KARYAWAN</div>
              <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div>
                  <div><span className="text-slate-500">Tingkat Pendidikan</span> : {detail.education_level || '-'}</div>
                  <div><span className="text-slate-500">Jurusan</span> : {detail.major || '-'}</div>
                  <div><span className="text-slate-500">Jenis Kelamin</span> : {detail.gender || '-'}</div>
                  <div><span className="text-slate-500">Status Perkawinan</span> : {detail.marital_status || '-'}</div>
                  <div><span className="text-slate-500">Usia</span> : {detail.age_requirement || '-'}</div>
                  <div><span className="text-slate-500">Karakteristik Pribadi</span> : {detail.personal_characteristics || '-'}</div>
                  <div><span className="text-slate-500">Pengalaman Kerja</span> : {detail.work_experience || '-'}</div>
                  <div><span className="text-slate-500">Keahlian Khusus</span> : {detail.special_skill || '-'}</div>
                </div>
                <div>
                  <div><span className="text-slate-500">Status Hubungan Kerja</span> : {detail.employment_status || '-'}</div>
                  <div className="mt-2"><span className="text-slate-500">Bertanggung Jawab Kepada</span> : {detail.responsible_to || '-'}</div>
                  <div className="mt-2"><span className="text-slate-500">Uraian Tugas Utama</span> : {detail.main_duties || '-'}</div>
                  <div className="mt-2"><span className="text-slate-500">Kemampuan Tambahan</span> : {detail.additional_skills || '-'}</div>
                </div>
              </div>

              <div className="mb-2 border-t border-b border-slate-800 py-1 text-center text-sm font-bold">ALASAN PENAMBAHAN KARYAWAN</div>
              <p className="mb-6 text-sm">{detail.reason || '-'}</p>

              {/* Tanda tangan digital dan status persetujuan setiap tahap */}
              <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-600">Approval workflow</p><h3 className="mt-1 text-base font-bold text-slate-900">Persetujuan &amp; tanda tangan digital</h3></div><div className="rounded-xl bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700">3 tahap verifikasi</div></div>
                <div className="grid grid-cols-1 gap-4 text-center text-sm md:grid-cols-3">
                  {buildApprovalSteps(detail).map((step) => (
                    <div key={step.label} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <p className="text-xs text-slate-400">{step.label}</p>
                      <p className="mt-1 font-semibold text-slate-900">{step.name || '-'}</p>
                      <p className="text-xs text-slate-500">{step.role}</p>
                      <div className="mt-2">
                        {step.status === 'done' && <Badge text="Selesai" color="green" />}
                        {step.status === 'rejected' && <Badge text="Ditolak" color="red" />}
                        {step.status === 'waiting' && <Badge text="Menunggu" color="yellow" />}
                        {step.status === 'pending' && <Badge text="Belum" color="slate" />}
                      </div>
                      <DigitalSignature
                        name={step.name}
                        role={step.role}
                        at={step.at}
                        status={step.status}
                        stageLabel={step.label}
                            qrValue={(step.status === 'done' || step.status === 'rejected') ? buildApprovalVerificationUrl(detail.id, step.label === 'Diajukan oleh' ? 'requester' : step.label === 'Validasi kebutuhan oleh HR' ? 'hr' : 'director') : null}
                      />
                    </div>
                  ))}
                </div>
              </div>
              {detail.attachment_url && <div className="mb-6 rounded-xl border border-sky-100 bg-sky-50 p-4 print:hidden"><p className="text-xs font-bold uppercase tracking-wide text-sky-700">Berkas hasil pengajuan PRK</p><button type="button" onClick={() => void openPrkAttachment(detail.attachment_url!)} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-sky-800 hover:underline"><Download className="h-4 w-4" />{detail.attachment_name || 'Buka berkas lampiran'}</button><p className="mt-1 text-xs text-sky-700/70">Berkas tersimpan di penyimpanan dokumen Recruitment.</p></div>}
            </div>

            {/* Aksi approval dan arsip -- tidak ikut tercetak */}
            <div className="space-y-3 border-t border-slate-200 px-6 py-4 print:hidden">
              {detail.trashed_at ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">PRK berada di Sampah</p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">Data ini tidak dapat diproses approval atau dipakai untuk publikasi selama berada di Sampah. Pulihkan untuk mengaktifkan kembali pengelolaannya.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" disabled={busy} onClick={() => restoreFromTrash(detail)}><RotateCcw className="mr-1 inline h-4 w-4" />Pulihkan PRK</Button>
                    <Button variant="danger" disabled={busy} onClick={() => deletePermanently(detail)}><Trash2 className="mr-1 inline h-4 w-4" />Hapus Permanen</Button>
                  </div>
                </div>
              ) : (
              <>
              {detail.overall_status === 'Draft' && (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => openEdit(detail)}>Edit Surat</Button>
                  <Button variant="secondary" onClick={() => submitDraft(detail)}>Ajukan Sekarang</Button>
                </div>
              )}
              {detail.overall_status === 'Diajukan' && canApprove && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
                  <p className="mb-2 text-sm font-semibold text-slate-700">Persetujuan PRK</p>
                  <Select label="Approval sebagai" value={approvalRole} onChange={setApprovalRole} options={['Kepala Direktorat', 'Direktur', 'Atasan yang diberi wewenang', 'Lainnya']} />
                  {approvalRole === 'Lainnya' && <Input label="Jabatan / kapasitas approval" value={customApprovalRole} onChange={setCustomApprovalRole} placeholder="Contoh: Plt. Kepala Direktorat" required />}
                  <p className="mt-2 text-xs text-slate-500">Dicatat atas nama <strong>{user?.name || user?.email || 'Pengguna login'}</strong>. Identitas dan kapasitas ini tampil di barcode.</p>
                  <TextArea label="Catatan persetujuan / penolakan (opsional)" value={note} onChange={setNote} placeholder="Catatan keputusan" />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button disabled={busy} onClick={() => approve(true)}><CheckCircle2 className="inline h-4 w-4 -mt-0.5 mr-1" />Setujui &amp; Teruskan ke HR</Button>
                    <Button variant="danger" disabled={busy} onClick={() => approve(false)}><XCircle className="inline h-4 w-4 -mt-0.5 mr-1" />Tolak &amp; Arsipkan</Button>
                  </div>
                </div>
              )}
              {detail.overall_status === 'Diajukan' && !canApprove && (
                <p className="text-sm text-slate-400">Menunggu persetujuan Kepala Direktorat.</p>
              )}

              {detail.overall_status === 'Validasi HR' && canApprove && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
                  <p className="text-sm font-semibold text-blue-900">Validasi kebutuhan oleh HR</p>
                  <p className="mt-1 text-xs text-blue-700">Persetujuan Direktorat sudah selesai. Setelah validasi HR, sistem otomatis membuat dan menayangkan lowongan di Beranda serta halaman Karier.</p>
                  <div className="mt-3">
                    <Select label="Approval sebagai" value={hrApprovalRole} onChange={setHrApprovalRole} options={['HR', 'Recruitment', 'HR Manager', 'Lainnya']} />
                    {hrApprovalRole === 'Lainnya' && <Input label="Jabatan / kapasitas approval HR" value={customHrApprovalRole} onChange={setCustomHrApprovalRole} placeholder="Contoh: Head of HR" required />}
                  </div>
                  <p className="mt-2 text-xs text-blue-700">Dicatat atas nama <strong>{user?.name || user?.email || 'Pengguna login'}</strong>.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button disabled={busy} onClick={acknowledge}><CheckCircle2 className="inline h-4 w-4 -mt-0.5 mr-1" />Selesaikan Validasi HR &amp; Tanda Tangani</Button>
                    <Button variant="secondary" disabled={busy} onClick={() => reopenApproval()}>Kembalikan ke Persetujuan Direktorat</Button>
                  </div>
                </div>
              )}
              {detail.overall_status === 'Validasi HR' && !canApprove && <p className="text-sm text-slate-400">Menunggu validasi HR dan tanda tangan digital.</p>}
              {detail.overall_status === 'Disetujui Kabag Umum' && canApprove && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">ACC Tahap 3 — Head HRD Div.</p>
                  <Button disabled={busy} onClick={acknowledge}><CheckCircle2 className="inline h-4 w-4 -mt-0.5 mr-1" />Setujui &amp; Tanda Tangani</Button>
                </div>
              )}
              {detail.overall_status === 'Disetujui Kabag Umum' && !canApprove && (
                <p className="text-sm text-slate-400">Sudah disetujui Kabag Umum, menunggu diketahui Head HRD Div.</p>
              )}
              {detail.overall_status === 'Disetujui Head HRD Div.' && canManageStatus && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-sm font-semibold text-blue-900">Validasi HR sudah selesai dan QR tanda tangan tersimpan.</p><p className="mt-1 text-xs text-blue-700">Jika dikembalikan ke tahap sebelumnya, data tanda tangan HR dan Direktorat akan dihapus dan persetujuan dimulai ulang dari Direktorat.</p><Button variant="secondary" className="mt-3" disabled={busy} onClick={() => reopenApproval()}>Kembalikan ke Persetujuan Direktorat</Button></div>
              )}

              {detail.overall_status === 'Selesai' && canApprove && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">Perlu mengulang approval?</p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">PRK dapat dikembalikan ke tahap Diajukan. Persetujuan dan tanda tangan lama akan direset. Jika lowongan sedang tayang, lowongan akan dinonaktifkan sampai proses approval selesai kembali.</p>
                  <Button variant="secondary" className="mt-3" disabled={busy} onClick={() => reopenApproval()}><RotateCcw className="mr-1 inline h-4 w-4" />Mulai Ulang Approval</Button>
                </div>
              )}

              {detail.overall_status === 'Selesai' && !detail.linked_job_opening_id && canPublish && (
                <div><p className="mb-2 text-sm text-slate-600">PRK sudah disetujui dan ditandatangani, tetapi lowongan belum terhubung. Siapkan lowongan sebagai draft untuk ditinjau sebelum ditampilkan ke publik.</p><Button disabled={busy} onClick={() => openJobOpening()}><Briefcase className="inline h-4 w-4 -mt-0.5 mr-1" />Siapkan Lowongan Draft</Button></div>
              )}
              {detail.overall_status === 'Selesai' && !detail.linked_job_opening_id && !canPublish && (
                <p className="text-sm text-slate-400">PRK sudah disetujui dan ditandatangani. Tim Recruitment dapat menyiapkan lowongan draft.</p>
              )}
              {detail.overall_status === 'Selesai' && detail.linked_job_opening_id && detail.publication_status !== 'Dipublikasikan' && canPublish && (
                <div><div className="mb-2 flex items-center gap-2"><span className="text-sm text-slate-600">Status lowongan</span><Badge text="Draft" color={PUBLICATION_STATUS_COLORS.Draft} /></div><p className="mb-2 text-xs text-slate-500">Periksa detail lowongan di menu Kelola Lowongan. Flyer bersifat opsional; publikasikan jika data draft sudah benar.</p><Button disabled={busy} onClick={() => publishJobOpening()}><Briefcase className="inline h-4 w-4 -mt-0.5 mr-1" />Publikasikan ke Halaman Karier</Button></div>
              )}
              {detail.overall_status === 'Selesai' && detail.linked_job_opening_id && detail.publication_status !== 'Dipublikasikan' && !canPublish && <p className="text-sm text-slate-400">Lowongan sudah disiapkan sebagai draft. Tim Recruitment dapat mempublikasikannya setelah review.</p>}
              {detail.overall_status === 'Selesai' && detail.publication_status === 'Dipublikasikan' && (
                <p className="text-sm text-green-600">Lowongan sudah dipublikasikan di halaman Karier dan Beranda.</p>
              )}

              {detail.overall_status === 'Ditolak' && detail.approval_note && (
                <p className="text-sm text-red-500">Catatan penolakan: {detail.approval_note}</p>
              )}
              {detail.overall_status === 'Ditolak' && canApprove && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4"><p className="text-sm font-semibold text-red-800">Persetujuan ditolak</p><p className="mt-1 text-xs text-red-700">Buka kembali PRK untuk menghapus TTD penolakan dan mengulang proses dari tahap Diajukan.</p><Button variant="secondary" className="mt-3" disabled={busy} onClick={() => reopenApproval()}>Buka Kembali untuk Persetujuan</Button></div>
              )}
              <div className="border-t border-slate-100 pt-3">
                <p className="mb-2 text-xs text-slate-500">Jika PRK tidak lagi digunakan, pindahkan ke Sampah. Data dapat dipulihkan dari tab Sampah.</p>
                <Button variant="danger" disabled={busy} onClick={() => moveToTrash(detail)}><Trash2 className="mr-1 inline h-4 w-4" />Pindahkan ke Sampah</Button>
              </div>
              </>
              )}
            </div>
          </div>
        </div>
      )}


      {submissionNotice && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="prk-notice-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${submissionNotice.kind === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {submissionNotice.kind === 'success' ? <CheckCircle2 className="h-7 w-7" /> : <AlertCircle className="h-7 w-7" />}
            </div>
            <h2 id="prk-notice-title" className="mt-4 text-center text-lg font-bold text-slate-900">{submissionNotice.title}</h2>
            <p className="mt-2 text-center text-sm leading-6 text-slate-500">{submissionNotice.message}</p>
            <Button className="mt-6 w-full justify-center" onClick={() => setSubmissionNotice(null)}>Mengerti</Button>
          </div>
        </div>
      )}
    </div>
  );
}
