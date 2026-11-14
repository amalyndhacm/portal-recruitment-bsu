import { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, FileCheck2, LoaderCircle, X } from 'lucide-react';
import { db } from '@/lib/database';
import { formatDateID } from '@/lib/employeeRequest';

type VerificationStage = 'requester' | 'director' | 'hr';
type VerificationRecord = {
  id: string;
  request_number: string | null;
  request_date: string;
  position_needed: string;
  overall_status: string;
  submitted_by_name: string | null;
  submitted_by_role: string | null;
  created_at: string;
  approval_status: string;
  approver_name: string | null;
  approver_role: string | null;
  approved_at: string | null;
  acknowledgement_status: string;
  acknowledger_name: string | null;
  acknowledger_role: string | null;
  acknowledged_at: string | null;
};

export default function ApprovalVerificationPage({ requestId, stage, modal = false, onClose }: { requestId: string; stage: VerificationStage; modal?: boolean; onClose?: () => void }) {
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    db.rpc('portal_verify_employee_request', { request_id: requestId })
      .then(({ data, error: fetchError }) => {
        if (!active) return;
        if (fetchError) setError(fetchError.message);
        else if (!data) setError('Data PRK tidak ditemukan. QR mungkin sudah tidak berlaku.');
        else setRecord(data as VerificationRecord);
        setLoading(false);
      });
    return () => { active = false; };
  }, [requestId]);

  const requesterStage = stage === 'requester';
  const directorStage = stage === 'director';
  const stageLabel = requesterStage ? 'Pengajuan oleh Pemohon' : directorStage ? 'Persetujuan Kepala Direktorat' : 'Validasi kebutuhan oleh HR';
  const signed = record ? requesterStage
    ? record.overall_status !== 'Draft' && Boolean(record.submitted_by_name)
    : directorStage
      ? Boolean(record.approved_at && ['Disetujui', 'Ditolak'].includes(record.approval_status))
      : Boolean(record.acknowledged_at && record.acknowledgement_status === 'Sudah Diketahui') : false;
  const name = record ? requesterStage
    ? record.submitted_by_name === 'Pemohon Beranda' ? 'Pemohon' : record.submitted_by_name
    : directorStage ? record.approver_name : record.acknowledger_name : null;
  const role = record ? requesterStage
    ? record.submitted_by_role || 'Pemohon PRK'
    : directorStage ? record.approver_role : record.acknowledger_role : null;
  const signedAt = record ? requesterStage ? record.request_date : directorStage ? record.approved_at : record.acknowledged_at : null;
  const decision = record ? requesterStage
    ? 'PRK diajukan'
    : directorStage ? record.approval_status === 'Ditolak' ? 'Ditolak' : 'Disetujui'
    : 'Validasi HR tercatat' : '';
  const timeText = signed && signedAt ? requesterStage
    ? formatDateID(signedAt)
    : `${formatDateID(signedAt)}, ${new Date(signedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : '-';

  return (
    <main className={modal ? 'fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/70 px-4 py-8 backdrop-blur-sm print:hidden' : 'flex min-h-screen items-center justify-center bg-slate-900/50 px-4 py-10'} onClick={modal ? onClose : undefined}>
      <section className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="relative bg-gradient-to-r from-sky-700 to-cyan-600 px-7 py-8 text-white">
          {modal && <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Tutup detail approval"><X className="h-5 w-5" /></button>}
          <div className="flex items-center gap-3">
            <FileCheck2 className="h-8 w-8" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">Portal Recruitment</p>
              <h1 className="mt-1 text-2xl font-bold">Detail Approval PRK</h1>
            </div>
          </div>
        </div>
        <div className="p-7">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" />Memeriksa data approval…</div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800"><CircleAlert className="mb-2 h-6 w-6" /><p className="font-semibold">Verifikasi tidak berhasil</p><p className="mt-1 text-sm">{error}</p></div>
          ) : record ? (
            <>
              <div className={`flex items-center gap-3 rounded-2xl border p-4 ${signed && decision !== 'Ditolak' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : decision === 'Ditolak' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                <CheckCircle2 className="h-7 w-7 shrink-0" />
                <div><p className="font-bold">{signed ? decision : 'Belum tercatat'}</p><p className="text-sm">{signed ? 'Data ini sesuai dengan catatan PRK yang tersimpan di portal.' : 'Tahap ini belum memiliki catatan yang tersimpan.'}</p></div>
              </div>
              <dl className="mt-6 divide-y divide-slate-100 text-sm">
                <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Nomor PRK</dt><dd className="text-right font-semibold text-slate-900">{record.request_number || record.id}</dd></div>
                <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Posisi</dt><dd className="text-right font-semibold text-slate-900">{record.position_needed || '-'}</dd></div>
                <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Tahap</dt><dd className="text-right font-semibold text-slate-900">{stageLabel}</dd></div>
                <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">{requesterStage ? 'Pemohon' : 'Disetujui sebagai'}</dt><dd className="text-right font-semibold text-slate-900">{signed ? role || '-' : '-'}</dd></div>
                <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Nama</dt><dd className="text-right font-semibold text-slate-900">{signed ? name || '-' : '-'}</dd></div>
                <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Waktu</dt><dd className="text-right font-semibold text-slate-900">{timeText}</dd></div>
                <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Status PRK terkini</dt><dd className="text-right font-semibold text-slate-900">{record.overall_status}</dd></div>
              </dl>
              <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">QR ini membuka detail pengajuan atau persetujuan yang tersimpan pada portal. Informasi ditampilkan untuk pemeriksaan dan bukan tanda tangan elektronik tersertifikasi.</p>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
