import { ExternalLink, FileDown } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui';

type Draft = Record<string, string>;

const fields: Array<[string, string, string?]> = [
  ['nomor_surat', 'Nomor surat'],
  ['tanggal_dokumen', 'Tanggal dokumen'],
  ['tempat_dokumen', 'Tempat dokumen'],
  ['tanggal_mulai', 'Tanggal mulai kontrak'],
  ['tanggal_selesai', 'Tanggal selesai kontrak'],
  ['gaji_pokok', 'Gaji pokok / bulan'],
  ['uang_makan_dalam_kota', 'Uang makan dalam kota / hari'],
  ['uang_makan_luar_kota', 'Uang makan luar kota / hari'],
];

export default function PKWTJatimEditor({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Draft;
  onChange: (next: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const set = (key: string, value: string) => onChange({ ...draft, [key]: value });
  return (
    <div className="mt-3 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-sm font-bold text-slate-900">Isi PKWT Jawa Timur</p><p className="mt-1 text-xs text-slate-500">Field ini mengikuti bagian yang berubah pada template asli. Data akan digunakan untuk tampilan cetak PDF.</p></div>
        <a href="/templates/offering/PKWT%20JATIM%20revisi.docx" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"><ExternalLink size={14} /> Template asli</a>
      </div>
      <div className="mb-4 rounded-xl border border-sky-100 bg-white p-3"><p className="text-xs font-bold uppercase tracking-wide text-sky-700">Data kandidat otomatis</p><p className="mt-1 text-xs text-slate-500">Data pihak kedua dan nama tanda tangan diambil dari data lamaran, sehingga tidak perlu diketik ulang.</p><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><ReadOnly label="Nama" value={draft.nama} /><ReadOnly label="Jenis kelamin" value={draft.jenis_kelamin} /><ReadOnly label="Tempat, tanggal lahir" value={[draft.tempat_lahir, draft.tanggal_lahir].filter(Boolean).join(', ')} /><ReadOnly label="Alamat sesuai KTP" value={draft.alamat_ktp} /><ReadOnly label="Telepon" value={draft.telepon} /><ReadOnly label="Jabatan / lokasi" value={[draft.jabatan, draft.lokasi_kerja].filter(Boolean).join(' · ')} /><ReadOnly label="Nama di tanda tangan" value={draft.nama_ttd_kandidat} /></div></div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Data yang perlu diisi manual</p><div className="grid gap-3 sm:grid-cols-2">
        {fields.map(([key, label]) => <label key={key} className="text-xs font-semibold text-slate-600">{label}<input value={draft[key] || ''} onChange={(e) => set(key, e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label>)}
      </div>
      <div className="mt-4 flex flex-wrap gap-2"><Button onClick={onSave}>Simpan Dokumen</Button><Button variant="secondary" onClick={onCancel}>Batal</Button><button type="button" onClick={() => exportPKWTJatimPdf(draft)} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"><FileDown size={16} /> Export PDF</button></div>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value?: string }) {
  return <div className="rounded-lg bg-slate-50 px-3 py-2"><p className="text-[11px] text-slate-400">{label}</p><p className="mt-0.5 min-h-5 font-medium text-slate-700">{value || 'Belum tersedia dari data lamaran'}</p></div>;
}

function renderPkwtHtml(data: Draft) {
  const esc = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] || char));
  const v = (key: string, fallback = '________________') => esc(data[key] || fallback);
  const page = (content: string) => `<main class="sheet"><img class="brand" src="${window.location.origin}/image1.jpeg"><div class="page-content">${content}</div></main>`;
  const heading = (bab: string, title: string, pasal: string) => `<div class="section">${bab}<br>${title}</div><div class="clause">${pasal}</div>`;
  const p = (text: string, className = 'justify') => `<p class="${className}">${text}</p>`;
  const row = (label: string, value: string) => `<div class="row"><span>${label}</span><span>:</span><span>${value}</span></div>`;
  const numbered = (number: string, label: string, value: string) => `<div class="numbered-row"><b>${number}.</b>${row(label, value)}</div>`;
  const numberedText = (number: string, text: string) => `<p class="numbered-text"><b>${number}.</b><span>${text}</span></p>`;
  const bullet = (label: string, text: string, className = 'bullet') => `<p class="${className}"><b>${label}</b><span>${text}</span></p>`;

  const page1 = `<div class="title">PERJANJIAN KERJA WAKTU TERTENTU (PKWT)</div><div class="number">No : ${v('nomor_surat')}</div>
    ${p('Yang bertandatangan di bawah ini masing–masing:', 'intro')}
    <div class="party">${numbered('1', 'N a m a', v('pihak_pertama_nama'))}${row('N.I.P', v('pihak_pertama_nip'))}${row('Jabatan', v('pihak_pertama_jabatan'))}${row('Alamat kantor', v('pihak_pertama_alamat'))}${p('Dalam hal ini bertindak untuk dan atas nama PT Bintang Sayap Utama dan untuk selanjutnya disebut <b>Pihak Pertama.</b>')}${numbered('2', 'N a m a', v('nama'))}${row('Jenis kelamin', v('jenis_kelamin'))}${row('Tempat, tanggal lahir', `${v('tempat_lahir')}, ${v('tanggal_lahir')}`)}${row('Alamat sesuai KTP', v('alamat_ktp'))}${row('Telepon', v('telepon'))}${p('Dalam hal ini bertindak untuk dan atas nama diri sendiri dan untuk selanjutnya disebut <b>Pihak Kedua.</b>')}</div>
    ${p(`Pada hari ini ${v('tanggal_dokumen')} bertempat di ${v('tempat_dokumen')} Kedua belah Pihak setuju dan mufakat untuk mengadakan Perjanjian Kerja Waktu Tertentu (PKWT) dengan ketentuan-ketentuan dan syarat-syarat yang diatur dalam pasal-pasal sebagai berikut:`)}
    ${heading('BAB I', 'MAKSUD DAN TUJUAN', 'Pasal 1')}
    ${numberedText('1', 'Bahwa PT Bintang Sayap Utama adalah sebuah badan hukum Perseroan Terbatas yang ruang lingkup kegiatan usaha bergerak dibidang perdagangan umum.')}
    ${numberedText('2', 'Bahwa untuk menjalankan ruang lingkup kegiatan usahannya, Perusahaan membutuhkan sumber daya manusia yang memiliki keahlian dan kecakapan dibidangnya untuk bekerja bagi PT Bintang Sayap Utama.')}
    ${numberedText('3', 'Bahwa dalam rangka menjalankan kegiatan usahannya tersebut, Pihak Pertama bermaksud mempekerjakan Pihak Kedua secara Perjanjian Kerja Waktu Tertentu (PKWT) untuk bekerja bagi PT Bintang Sayap Utama.')}
    ${heading('BAB II', 'STATUS KEPEGAWAIAN', 'Pasal 2')}
    ${numberedText('1', 'Pihak Pertama memberikan pekerjaan kepada Pihak Kedua dengan status kepegawaian secara Perjanjian Kerja Waktu Tertentu (PKWT).')}
    ${numberedText('2', `Sesuai perundang-undangan yang berlaku, maka Pihak Kedua wajib melaksanakan selama 3 (tiga) bulan dari tanggal ${v('tanggal_mulai')} sampai dengan tanggal ${v('tanggal_selesai')}.`)}
    ${numberedText('3', 'Apabila Pihak Kedua dinyatakan berhasil (lulus) melalui masa kontrak tersebut, maka Pihak Pertama akan menetapkan kepada Pihak Kedua sebagai Pegawai PT Bintang Sayap Utama sesuai Pasal 2 Ayat 1.')}`;

  const page2 = `${heading('BAB III', 'HAK DAN KEWAJIBAN', 'Pasal 3')}
    ${p('Hak dan kewajiban Pihak Pertama serta hak dan kewajiban Pihak Kedua mengacu kepada Peraturan Perusahaan Pihak Pertama.')}
    ${heading('BAB IV', 'TUGAS DAN TANGGUNGJAWAB', 'Pasal 4')}
    ${numberedText('1', `Pihak Pertama memberikan pekerjaan kepada Pihak Kedua dengan jabatan sebagai ${v('jabatan')} PT Bintang Sayap Utama yang berlokasi di ${v('lokasi_kerja')}`)}
    ${numberedText('2', 'Tugas dan tanggungjawab pekerjaan Pihak Kedua ditentukan oleh Pihak Pertama sesuai dengan uraian jabatannya (job description).')}
    ${numberedText('3', 'Lokasi penempatan kerja Pihak Kedua ditentukan oleh Pihak Pertama dan Pihak Kedua wajib bersedia untuk ditempatkan dan atau dipindahkan di lokasi manapun, dimana terdapat tempat usaha atau kantor cabang Pihak Pertama.')}
    ${numberedText('4', 'Dalam melaksanakan pekerjaannya Pihak Kedua bertanggungjawab kepada Pihak Pertama atau kepada pejabat lain yang ditunjuk oleh Pihak Pertama.')}
    ${numberedText('5', 'Pihak Kedua berkewajiban untuk melakukan pekerjaan sesuai dengan tugas dan tanggungjawab yang diberikan oleh Pihak Pertama.')}
    ${heading('BAB V', 'HARI, JAM KERJA DAN KERJA LEMBUR', 'Pasal 5')}
    ${numberedText('1', 'Penentuan mengenai hari kerja dan jam kerja Pihak Kedua diatur oleh Pihak Pertama dengan mengacu kepada Peraturan Perusahaan berdasarkan Undang Undang No. 6 tahun 2023 Cipta Kerja dan Peraturan Pemerintah No.35 tahun 2021.')}
    ${numberedText('2', 'Hari dan/atau jam kerja Pihak Kedua berbeda satu dengan lainnya sesuai dengan fungsi atau jabatan tersebut, namun tidak melebihi 7 jam sehari dan 40 jam seminggu untuk yang menerapkan 6 hari kerja, yaitu sebagai berikut:')}
    ${bullet('a.', 'Hari kerja : Sabtu s.d. Kamis (libur bekerja setiap hari Jum’at).', 'bullet nested')}${bullet('b.', '<span class="work-time-grid"><span>Jam kerja :</span><span>08.00 s.d.16.00 (Sabtu s.d Rabu, termasuk waktu istirahat 1 jam).</span><span></span><span>08.00 s.d.15.00 (Minggu, termasuk waktu istirahat 1 jam).</span></span>', 'bullet nested')}
    ${numberedText('3', 'Bukti kehadiran kerja dilakukan melalui Aplikasi Jpayroll (datang dan pulang) atau melalui pencatatan kehadiran secara tertulis (manual).')}
    ${numberedText('4', 'Ketentuan waktu kerja lembur untuk Pihak Kedua akan mengacu kepada Peraturan Perusahaan Pihak Pertama berdasarkan Undang Undang No. 6 tahun 2023 Cipta Kerja dan Peraturan Pemerintah No.35 tahun 2021.')}
    ${heading('BAB VI', 'PENGUPAHAN, TUNJANGAN DAN JAMINAN SOSIAL KERJA', 'Pasal 6')}
    ${p('Untuk pekerjaan ini Pihak Pertama akan memberikan kompensasi dan tunjangan (compensation&benefit) kepada Pihak Kedua berupa:')}${bullet('a.', 'Komponen upah seperti :', 'bullet nested')}${bullet('i.', 'Pendapatan bulanan', 'bullet nested-2')}${bullet('-', `Gaji pokok sejumlah : Rp. ${v('gaji_pokok')} / bulan`, 'bullet nested-3')}`;

  const page3 = `${bullet('ii.', 'Tunjangan uang makan', 'bullet nested-2')}${bullet('-', `Dalam kota (dikantor) : Rp. ${v('uang_makan_dalam_kota')} / hari`, 'bullet nested-3')}${bullet('-', `Luar kota (perjalanan dinas) : Rp. ${v('uang_makan_luar_kota')} / hari`, 'bullet nested-3')}${bullet('b.', 'Komponen non upah seperti : tunjangan hari raya.', 'bullet nested')}${bullet('c.', 'Jumlah dan tata cara pembayaran atas kompensasi pihak kedua tersebut mengacu kepada peraturan perusahaan pihak pertama.', 'bullet nested')}${bullet('d.', 'Kepesertaan BPJS Kesehatan dan Kepesertaan BP Jamsostek sesuai dengan syarat dan ketentuan pihak pertama.', 'bullet nested')}
    ${heading('BAB VII', 'CUTI DAN IZIN MENINGGALKAN PEKERJAAN', 'Pasal 7')}
    ${numberedText('1', 'Pihak Pertama memberikan cuti tahunan kepada Pihak Kedua selama 12 (dua belas) hari apabila telah mempunyai masa kerja selama 12 (dua belas) bulan berturut-turut terhitung sejak tanggal masa percobaan dilaksanakan.')}${numberedText('2', 'Pihak Pertama memberikan ijin meninggalkan pekerjaan kepada Pihak Kedua untuk keperluan tertentu sesuai dengan Peraturan Perusahaan dan/atau Undang Undang yang berlaku.')}${numberedText('3', 'Sehari sebelumnya Pihak Kedua harus mengajukan surat izin atau cuti dan disetujui oleh atasannya (sesuai formulir).')}${numberedText('4', 'Apabila Pihak Kedua tidak bekerja karena sakit, maka harus melampirkan surat keterangan sakit dari dokter.')}${numberedText('5', 'Pihak Pertama akan memberikan sanksi kepada Pihak Kedua apabila tidak bekerja tanpa ada izin atau pemberitahuan kepada Pihak Pertama.')}${numberedText('6', 'Ketentuan cuti dan izin meninggalkan pekerjaan Pihak Kedua akan mengacu kepada Peraturan Perusahaan dan/atau Undang Undang yang berlaku.')}
    ${heading('BAB VIII', 'TINDAKAN DISIPLIN DAN PEMUTUSAN HUBUNGAN KERJA', 'Pasal 8')}
    ${p('Tata cara tindakan disiplin atau prosedur pemutusan hubungan kerja dengan Pihak Kedua dilakukan berdasarkan ketentuan Undang-Undang No. 6 tahun 2023 Cipta Kerja dan Peraturan Pemerintah No.35 tahun 2021, yaitu:')}${numberedText('1', 'Tindakan disiplin kerja.')}${p('Pihak Pertama berhak memberikan teguran lisan, Surat Peringatan ke-1, Surat Peringatan ke-2, Surat Peringatan ke-3 bahkan mengakhiri hubungan kerja kepada Pihak Kedua apabila terjadi pelanggaran atas, perjanjian kerja, Peraturan Perusahaan dan/atau Undang-Undang yang berlaku.', 'indent')}${numberedText('2', 'Pemutusan hubungan kerja.')}${p('Hubungan kerja berakhir apabila Pihak Kedua, sebagai berikut:', 'indent')}${bullet('a.', 'Meninggal dunia.', 'bullet nested')}${bullet('b.', 'Mengalami sakit setelah 12 (dua belas) bulan dan atau dalam kurun waktu 2 (dua) tahun masih belum dapat menjalankan tugas pekerjaannya berdasarkan keterangan dokter yang sah.', 'bullet nested')}${bullet('c.', 'Mengunduran diri bekerja, yang disampaikan secara tertulis 1 (satu) bulan sebelum tanggal berakhirnya hubungan kerja dan Pihak Pertama menyetujui permohonan tersebut.', 'bullet nested')}${bullet('d.', 'Mangkir bekerja selama 5 (lima) hari berturut-turut.', 'bullet nested')}${bullet('e.', 'Melakukan kesalahan berat sebagaimana ditentukan dalam Peraturan Perusahaan dan/atau Peraturan perundang-undangan lainnya yang berlaku.', 'bullet nested')}${numberedText('3', 'Ketentuan lainnya atas berakhirnya hubungan kerja Pihak Kedua akan mengacu kepada Undang Undang No. 6 tahun 2023 Cipta Kerja dan Peraturan Pemerintah No.35 tahun 2021.')}`;

  const page4 = `${heading('BAB IX', 'MENJAGA KERAHASIAAN', 'Pasal 9')}${numberedText('1', 'Pihak Kedua yang telah ditetapkan sebagai pegawai PT Bintang Sayap Utama sesuai Pasal 3, berkewajiban menjaga kerahasiaan Perusahaan baik selama menjadi pegawai dan/atau setelah hubungan kerja berakhir.')}${numberedText('2', 'Bahwa kerahasiaan Perusahaan yang dimaksud dalam pasal 9 ayat 1 berupa kerahasiaan data, dokumen dan kerahasiaan lain yang sangat penting bagi Perusahan.')}${numberedText('3', 'Bahwa apabila Pihak Kedua melanggar ketentuan pada pasal 9 ayat 1 dan 2, Pihak Pertama akan melakukan tindakan hukum sesuai peraturan perundang-undangan yang berlaku.')}
    ${heading('BAB X', 'PENYELESAIAN PERSELISIHAN HUBUNGAN KERJA', 'Pasal 10')}${numberedText('1', 'Perjanjian ini tunduk pada hukum dan peraturan perundang-undangan yang berlaku di Indonesia.')}${numberedText('2', 'Pihak Pertama dan Pihak Kedua sepakat untuk menyelesaiakan perselisihan yang timbul sehubungan dengan pelaksanaan Perjanjian ini dengan cara musyawarah untuk mufakat.')}${numberedText('3', 'Dalam hal perselisihan tidak dapat diselesaikan secara musyawarah untuk mufakat, maka Pihak Pertama dan Pihak Kedua setuju untuk memilih menyelesaikan perselisihan di Pengadilan Negeri Kabupaten Malang.')}
    ${heading('BAB XI', 'BERAKHIRNYA PERJANJIAN', 'Pasal 11')}${p('Perjanjian kerja ini berlaku sejak tanggal ditandatanganinya perjanjian ini dan berakhir apabila terjadi Pemutusan Hubungan Kerja.')}
    ${heading('BAB XII', 'LAIN-LAIN', 'Pasal 12')}${numberedText('1', 'Hal-hal yang belum atau tidak diatur dalam Perjanjian Kerja ini akan ditetapkan lebih lanjut dalam bentuk tambahan perjanjian atau lampiran (addendum) yang tidak terpisahkan dari perjanjian ini dan mendapat persetujuan dari kedua belah pihak.')}${numberedText('2', 'Perjanjian ini tidak dapat diubah, ditambah, dialihkan dan/atau diakhiri tanpa mendapat persetujuan secara tertulis dari Pihak Pertama dan Pihak Kedua.')}${p('Demikianlah perjanjian kerja ini dibuat dalam 2 (dua) rangkap, bermaterai cukup dan memiliki kekuatan hukum yang sama serta disepakati kedua belah pihak dengan penuh kesadaran tanpa adanya paksaan maupun tekanan dari pihak manapun.')}
    <div class="signature"><div>Pihak Pertama<div class="space"></div><b>${v('pihak_pertama_nama')}</b><br>${v('pihak_pertama_jabatan')}</div><div>Pihak Kedua<div class="space"></div><b>${v('nama_ttd_kandidat', data.nama || '')}</b><br>Pegawai</div></div>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>PKWT - ${v('nama', 'Kandidat')}</title><style>
  @page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#e5e7eb;color:#111;font-family:"Times New Roman",serif;font-size:11pt;line-height:1.08}p{margin:0}.sheet{width:210mm;height:297mm;min-height:297mm;margin:0;background:#fff;padding:0 25.4mm 25.4mm;overflow:hidden;page-break-after:always}.brand{display:block;width:calc(100% + 50.8mm);height:36.7mm;margin:0 0 0 -25.4mm;object-fit:cover;object-position:left top}.page-content{padding-top:0}.title{text-align:center;font-weight:bold;text-decoration:underline;font-size:15pt;margin-top:4mm}.number{text-align:center;margin-top:1mm}.justify{text-align:justify}.intro{margin-top:6mm;margin-bottom:1.5mm}.party{margin:2mm 0 0 8mm}.numbered-row{display:grid;grid-template-columns:8mm 1fr;align-items:start}.party .numbered-row .row{margin:0}.party .numbered-row~.row{margin-left:8mm}.row{display:grid;grid-template-columns:42mm 5mm 1fr;gap:0}.section{text-align:center;font-weight:bold;margin:5mm 0 1.5mm}.clause{font-weight:bold;text-align:center;margin:1.5mm 0}.numbered-text,.bullet{display:grid;grid-template-columns:8mm 1fr;gap:1mm;margin:1.5mm 0;text-align:justify}.indent{margin-left:8mm}.nested{margin-left:8mm}.nested-2{margin-left:16mm}.nested-3{margin-left:24mm}.work-time-grid{display:grid;grid-template-columns:21mm 1fr;column-gap:0;row-gap:0}.work-time-grid>span{display:block}.signature{display:grid;grid-template-columns:1fr 1fr;gap:25mm;text-align:center;margin-top:8mm}.signature .space{height:22mm}.page-break{page-break-before:always}@media print{html,body{background:#fff}.sheet{margin:0}}
  </style></head><body>${page(page1)}${page(page2)}${page(page3)}${page(page4)}</body></html>`;
}

async function exportPKWTJatimPdf(data: Draft) {
  const html = renderPkwtHtml(data);
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.left = '-10000px';
  frame.style.top = '0';
  frame.style.width = '210mm';
  frame.style.height = '297mm';
  frame.style.border = '0';
  document.body.appendChild(frame);
  const frameDocument = frame.contentDocument;
  if (!frameDocument) { frame.remove(); alert('Preview PDF tidak dapat dibuat.'); return; }
  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();
  await new Promise((resolve) => setTimeout(resolve, 800));
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const sheets = Array.from(frameDocument.querySelectorAll<HTMLElement>('.sheet'));
    for (const [index, sheet] of sheets.entries()) {
      const content = sheet.querySelector<HTMLElement>('.page-content');
      const brand = sheet.querySelector<HTMLElement>('.brand');
      if (content && brand) {
        const availableHeight = sheet.clientHeight - brand.getBoundingClientRect().height - 8;
        const contentHeight = content.scrollHeight;
        if (contentHeight > availableHeight) {
          const fit = Math.max(0.82, availableHeight / contentHeight);
          content.style.transformOrigin = 'top left';
          content.style.transform = `scale(${fit})`;
          content.style.width = `${100 / fit}%`;
        }
      }
      const canvas = await html2canvas(sheet, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      if (index > 0) pdf.addPage();
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, 210, 297, 'F');
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, 210, 297);
    }
    pdf.save(`PKWT-${(data.nama || 'Kandidat').replace(/[^a-z0-9]+/gi, '-')}.pdf`);
  } catch (error) {
    console.error(error);
    alert('PDF gagal dibuat. Pastikan browser mengizinkan proses download.');
  } finally {
    frame.remove();
  }
}
