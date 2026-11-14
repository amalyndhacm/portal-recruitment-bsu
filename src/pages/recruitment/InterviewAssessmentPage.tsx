import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ClipboardCheck, Download, Plus, Save, Trash2 } from 'lucide-react';
import { db, type InterviewScheduleWithApplicant } from '@/lib/database';

const RECOMMENDATIONS = ['Dapat disarankan', 'Dipertimbangkan', 'Tidak disarankan'] as const;
type Recommendation = typeof RECOMMENDATIONS[number] | '';
type Dimension = { id: string; no: number; label: string; description: string; optional?: boolean; score: number | null };
type InterviewPart = { recommendation: Recommendation; suggestion: string; location: string; interviewer: string };

const DEFAULT_DIMENSIONS: Dimension[] = [
  { id: 'pendidikan-formal', no: 1, label: 'PENDIDIKAN FORMAL', description: 'Tingkat pendidikan (formal) yang dapat menunjang posisi yang dilamar', score: null },
  { id: 'pengalaman-kerja', no: 2, label: 'PENGALAMAN KERJA', description: 'Kesesuaian antara berbagai hal yang pernah ditangani dalam pekerjaan sebelumnya dengan pekerjaan yang dilamar', score: null },
  { id: 'pengetahuan-teknis', no: 3, label: 'PENGETAHUAN TEKNIS', description: 'Pengetahuan praktis dan teoritis yang dikuasai berkenaan dengan posisi yang dilamar', score: null },
  { id: 'keterampilan-teknis', no: 4, label: 'KETERAMPILAN TEKNIS', description: 'Kemampuan mengatasi permasalahan yang mungkin terjadi pada posisi yang dilamar', score: null },
  { id: 'motivasi', no: 5, label: 'MOTIVASI', description: 'Menunjukkan besarnya semangat serta minat terhadap kondisi pekerjaan yang dilamar', score: null },
  { id: 'kerja-sama', no: 6, label: 'KERJA SAMA (TEAM WORK)', description: 'Kemampuan beradaptasi dan bekerja sama dengan rekan kerja', score: null },
  { id: 'etika', no: 7, label: 'ETIKA (SOPAN SANTUN)', description: 'Menunjukkan sikap sopan santun dalam bertutur kata maupun bertingkah laku', score: null },
  { id: 'kemampuan-komunikasi', no: 8, label: 'KEMAMPUAN KOMUNIKASI', description: 'Kemampuan mengungkap ide secara sistematis dan jelas sehingga dapat dipahami dengan benar oleh orang lain', score: null },
  { id: 'penampilan-diri', no: 9, label: 'PENAMPILAN DIRI', description: 'Cara berpakaian, kerapihan serta keadaan fisik secara umum. Ada tidaknya cacat fisik', score: null },
  { id: 'bahasa-asing', no: 10, label: 'KEMAMPUAN BAHASA ASING', description: 'Kemampuan menggunakan bahasa asing yang menunjang pekerjaan.', optional: true, score: null },
  { id: 'kepemimpinan', no: 11, label: 'KEMAMPUAN MEMIMPIN (LEADERSHIP)', description: 'Kemampuan memimpin, mengarahkan, dan mengambil keputusan.', optional: true, score: null },
  { id: 'pemeriksaan-referensi', no: 12, label: 'PEMERIKSAAN REFERENSI', description: 'Hasil pemeriksaan dan konfirmasi referensi kandidat.', optional: true, score: null },
];

type Props = { schedule: InterviewScheduleWithApplicant; onBack: () => void; onSaved: (summary?: { score: number | null; result: string }) => void | Promise<void> };

function average(scores: Dimension[]) {
  const values = scores.filter((item) => item.score !== null).map((item) => item.score as number);
  return values.length ? Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10 : null;
}
function rating(value: number | null) {
  if (value === null) return 'Belum dinilai';
  if (value <= 60) return 'Kurang';
  if (value <= 70) return 'Cukup';
  if (value <= 80) return 'Baik';
  return 'Sangat Baik';
}
function InterviewSection({ title, value, onChange, readOnly }: { title: string; value: InterviewPart; onChange: (next: InterviewPart) => void; readOnly: boolean }) {
  return <section className="rounded-xl border border-slate-200 p-4"><h3 className="mb-3 text-sm font-bold text-slate-900">{title}</h3><div className="mb-3 flex flex-wrap gap-2">{RECOMMENDATIONS.map((option) => <button key={option} type="button" onClick={() => onChange({ ...value, recommendation: option })} disabled={readOnly} className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${value.recommendation === option ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>{option}</button>)}</div><label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Kesimpulan & Saran</label><textarea value={value.suggestion} onChange={(event) => onChange({ ...value, suggestion: event.target.value })} readOnly={readOnly} placeholder="Tuliskan kesimpulan dan saran hasil wawancara..." rows={3} className="mb-3 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none read-only:bg-slate-50 read-only:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" /><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Lokasi<input value={value.location} onChange={(event) => onChange({ ...value, location: event.target.value })} readOnly={readOnly} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none read-only:bg-slate-50 read-only:text-slate-500 focus:border-indigo-500" /></label><label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Nama Pewawancara<input value={value.interviewer} onChange={(event) => onChange({ ...value, interviewer: event.target.value })} readOnly={readOnly} placeholder="Nama & jabatan" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none read-only:bg-slate-50 read-only:text-slate-500 focus:border-indigo-500" /></label></div></section>;
}

export default function InterviewAssessmentPage({ schedule, onBack, onSaved }: Props) {
  const applicant = schedule.job_applicants;
  const [existing] = useState(() => ({ dimensions: DEFAULT_DIMENSIONS, interview1: { recommendation: '', suggestion: '', location: '', interviewer: schedule.interviewer_name || '' } as InterviewPart, interview2: { recommendation: '', suggestion: '', location: '', interviewer: '' } as InterviewPart, interviewDate: schedule.scheduled_date }));
  const [dimensions, setDimensions] = useState(existing.dimensions);
  const [interview1, setInterview1] = useState(existing.interview1);
  const [interview2, setInterview2] = useState(existing.interview2);
  const [interviewDate, setInterviewDate] = useState(existing.interviewDate);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [editing, setEditing] = useState(true);
  const [loadingExisting, setLoadingExisting] = useState(true);
  // Sembilan baris pertama adalah dimensi wajib sesuai Form Interview.
  // Tiga baris terakhir hanya ditampilkan jika pengguna menambahkannya.
  const required = dimensions.slice(0, 9);
  const optional = dimensions.slice(9);
  const shownOptional = optional.filter((item) => item.score !== null);
  const hiddenOptional = optional.filter((item) => item.score === null);
  const avg = useMemo(() => average(dimensions), [dimensions]);
  const locked = loadingExisting || !editing;
  useEffect(() => {
    let active = true;
    setLoadingExisting(true);
    db.from('candidate_assessments').select('id, notes, assessed_date, assessor').eq('applicant_id', schedule.applicant_id).eq('assessment_type', schedule.stage).order('created_at', { ascending: false }).limit(1).maybeSingle().then(({ data }) => {
      if (!active) return;
      if (data?.id) {
        setAssessmentId(data.id);
        try {
          const saved = JSON.parse(data.notes || '{}') as { dimensions?: Dimension[]; interview1?: InterviewPart; interview2?: InterviewPart; interviewDate?: string };
          if (saved.dimensions?.length) setDimensions(DEFAULT_DIMENSIONS.map((item) => saved.dimensions?.find((savedItem) => savedItem.id === item.id) || item));
          if (saved.interview1) setInterview1(saved.interview1);
          if (saved.interview2) setInterview2(saved.interview2);
          if (saved.interviewDate) setInterviewDate(saved.interviewDate);
        } catch {
          setMessage('Data penilaian lama tidak dapat dibaca.');
        }
        setEditing(false);
      } else {
        setEditing(true);
      }
      setLoadingExisting(false);
    });
    return () => { active = false; };
  }, [schedule.applicant_id, schedule.stage]);
  const setScore = (id: string, raw: string) => setDimensions((items) => items.map((item) => item.id === id ? { ...item, score: raw.trim() === '' ? null : (Number.isNaN(Number(raw)) ? null : Number(raw)) } : item));
  const updateInterview = (which: 1 | 2, value: InterviewPart) => which === 1 ? setInterview1(value) : setInterview2(value);
  const save = async () => {
    setSaving(true); setMessage('');
    const notes = JSON.stringify({ dimensions, interview1, interview2, interviewDate });
    const result = interview1.recommendation === 'Tidak disarankan' || interview2.recommendation === 'Tidak disarankan' ? 'Tidak Lulus' : interview1.recommendation === 'Dapat disarankan' || interview2.recommendation === 'Dapat disarankan' ? 'Lulus' : 'Menunggu';
    const recordId = assessmentId || crypto.randomUUID();
    const fields = { applicant_id: schedule.applicant_id, assessment_type: schedule.stage === 'Interview Final' ? 'Interview Final' : 'Interview User', assessed_date: interviewDate || null, score: avg, result, assessor: interview1.interviewer || schedule.interviewer_name || null, notes };
    const { error } = assessmentId
      ? await db.from('candidate_assessments').update(fields).eq('id', assessmentId)
      : await db.from('candidate_assessments').insert({ id: recordId, ...fields });
    setSaving(false);
    if (error) { setMessage(`Penilaian belum tersimpan: ${error.message}`); return; }
    setAssessmentId(recordId);
    if (schedule.stage !== 'Interview Final') {
      await db.from('interview_schedules').update({ stage: 'Interview Final' }).eq('id', schedule.id);
    }
    setEditing(false);
    setMessage('Penilaian berhasil disimpan.');
    await onSaved({ score: avg, result });
    onBack();
  };
  const print = () => window.print();
  return <div className="animate-fade-in"><div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft size={16} /> Kembali ke detail kandidat</button><div className="flex items-center gap-2"><ClipboardCheck className="text-indigo-600" /><div><h1 className="text-2xl font-bold text-slate-900">Form Penilaian Interview</h1><p className="text-sm text-slate-500">{applicant?.full_name} · {applicant?.position}</p><p className="mt-1 text-xs font-semibold text-emerald-600">{assessmentId ? (editing ? 'Mode edit aktif' : 'Sudah diisi') : 'Belum diisi'}</p></div></div></div><button onClick={print} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"><Download size={15} /> Cetak / Simpan PDF</button></div><div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nama Lengkap</p><p className="text-sm text-slate-800">{applicant?.full_name}</p></div><div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Usia</p><p className="text-sm text-slate-800">{(applicant as { age?: number | null })?.age || '-'}</p></div><div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Posisi yang Dilamar</p><p className="text-sm text-slate-800">{applicant?.position}</p></div><label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tanggal Interview<input type="date" value={interviewDate} onChange={(event) => setInterviewDate(event.target.value)} disabled={locked} className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-normal normal-case tracking-normal text-slate-800" /></label></div><section><div className="mb-2 flex items-center justify-between"><div><label className="text-xs font-semibold uppercase tracking-wide text-slate-600">Dimensi Penilaian</label><p className="mt-0.5 text-xs text-slate-400">9 dimensi wajib</p></div><span className="text-xs text-slate-400">Skor 50–100</span></div><div className="overflow-hidden rounded-lg border border-slate-200"><table className="w-full text-sm"><thead><tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase text-slate-500"><th className="w-10 px-3 py-2">No</th><th className="px-3 py-2">Dimensi & Uraian</th><th className="w-28 px-3 py-2 text-center">Hasil</th></tr></thead><tbody>{[...required, ...shownOptional].map((item) => <tr key={item.id} className={`border-t border-slate-100 ${item.optional ? 'bg-indigo-50/30' : ''}`}><td className="px-3 py-2 align-top text-slate-500">{item.no}</td><td className="px-3 py-2 align-top"><p className="font-semibold text-slate-800">{item.label}</p><p className="text-xs text-slate-500">{item.description}</p></td><td className="px-3 py-2 align-top"><div className="flex items-center justify-center gap-1"><input type="text" inputMode="numeric" pattern="[0-9]*" value={item.score ?? ''} onChange={(event) => setScore(item.id, event.target.value)} disabled={locked} className="w-20 rounded-md border border-slate-200 px-2 py-1.5 text-center text-sm text-slate-800 outline-none focus:border-indigo-500" />{item.optional && <button onClick={() => setDimensions((items) => items.map((current) => current.id === item.id ? { ...current, score: null } : current))} disabled={locked} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>}</div></td></tr>)}</tbody></table></div><div className="mt-2 flex flex-wrap gap-2">{hiddenOptional.map((item) => <button key={item.id} onClick={() => setDimensions((items) => items.map((current) => current.id === item.id ? { ...current, score: 50 } : current))} disabled={locked} className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500 hover:border-indigo-400 hover:text-indigo-600"><Plus size={13} /> Tambah {item.label}</button>)}</div></section><div className="flex flex-wrap items-center gap-5 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500">Average</p><p className="text-2xl font-bold text-indigo-700">{avg ?? '-'}</p></div><div><p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500">Keterangan</p><p className="text-sm font-medium text-indigo-700">{rating(avg)}</p></div><div className="text-xs leading-relaxed text-indigo-400">50–60 Kurang · 61–70 Cukup · 71–80 Baik · 81–100 Sangat Baik</div></div><InterviewSection title="Kesimpulan & Saran — Wawancara 1" value={interview1} onChange={(value) => updateInterview(1, value)} readOnly={locked} /><InterviewSection title="Kesimpulan & Saran — Wawancara 2" value={interview2} onChange={(value) => updateInterview(2, value)} readOnly={locked} /><div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4"><p className="text-sm text-slate-500">{message}</p><div className="flex flex-wrap gap-2"><button onClick={() => { setEditing(true); setMessage('Mode edit aktif. Field dapat diubah.'); }} disabled={loadingExisting || editing} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50">Edit Penilaian</button><button onClick={save} disabled={saving || locked} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"><Save size={16} /> {saving ? 'Menyimpan...' : 'Simpan Penilaian'}</button></div></div></div></div>;
}
