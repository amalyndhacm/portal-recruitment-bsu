import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { db, type ChatbotMessage } from '@/lib/database';

// ---------------------------------------------------------------------------
// Chatbot FAQ sederhana untuk pengunjung Beranda (calon kandidat / karyawan).
// Balasan bot berbasis pencocokan kata kunci lokal (tanpa API AI eksternal).
// Percakapan disimpan sementara ke tabel `chatbot_messages` di Supabase
// selama widget masih terbuka, tapi begitu pengunjung MENUTUP gelembung
// chat, seluruh riwayat sesi tersebut otomatis dihapus (baik dari Supabase
// maupun state lokal) — sesi berikutnya akan mulai dari nol.
// ---------------------------------------------------------------------------

const FAQ_RULES: { keywords: string[]; answer: string }[] = [
  {
    keywords: ['lowongan', 'posisi', 'karier', 'karir', 'kerja'],
    answer:
      'Lowongan yang sedang dibuka bisa dilihat di bagian "Karier" pada halaman ini, seperti Staff Accounting, Recruitment Officer, Payroll & Benefit Staff, dan Management Trainee. Klik menu "Karier" di navbar untuk detailnya.',
  },
  {
    keywords: ['proses', 'tahap', 'rekrutmen', 'seleksi', 'interview', 'wawancara'],
    answer:
      'Proses rekrutmen kami terdiri dari 6 tahap: Sourcing, Screening, Interview, Psikotest, Offering, dan Onboarding. Detail tiap tahap ada di bagian "Karier & Rekrutmen" pada halaman ini.',
  },
  {
    keywords: ['gaji', 'salary', 'kompensasi', 'benefit', 'tunjangan'],
    answer:
      'Informasi gaji dan benefit disampaikan langsung oleh tim Recruitment saat tahap Offering, menyesuaikan posisi yang dilamar. Silakan tinggalkan email/nomor kontak di sini, nanti tim kami akan menghubungi.',
  },
  {
    keywords: ['login', 'masuk', 'akun', 'password', 'lupa'],
    answer:
      'Untuk masuk ke portal karyawan, klik tombol "Masuk Karyawan" di pojok kanan atas, lalu gunakan email kantor atau NIK Anda. Kalau lupa password, gunakan tautan "Lupa password?" di halaman login.',
  },
  {
    keywords: ['kontak', 'hubungi', 'telepon', 'email', 'alamat'],
    answer:
      'Kamu bisa menghubungi kami di hr@bsu.co.id atau (0341) 000-000. Kantor kami berada di Malang, Jawa Timur — detail lengkap ada di bagian "Kontak" pada footer halaman ini.',
  },
  {
    keywords: ['profil', 'visi', 'misi', 'nilai', 'perusahaan', 'tentang'],
    answer:
      'PT Bintang Sayap Utama menghimpun 5 pilar: HR, Recruitment & Training, Compensation & Benefit, People Care, dan Leadership. Visi & misi lengkap ada di bagian "Profil Perusahaan" pada halaman ini.',
  },
];

const FALLBACK_ANSWER =
  'Terima kasih, pertanyaan Anda sudah kami catat. Tim Recruitment & Training kami akan meninjau dan menghubungi balik jika diperlukan. Ada hal lain yang ingin ditanyakan?';

function matchFaqAnswer(text: string): string {
  const lower = text.toLowerCase();
  const found = FAQ_RULES.find((rule) => rule.keywords.some((k) => lower.includes(k)));
  return found ? found.answer : FALLBACK_ANSWER;
}

const SESSION_KEY = 'hr-portal-chatbot-session';
const SESSION_SECRET_KEY = 'hr-portal-chatbot-capability';

function getOrCreateSessionSecret(): string {
  let secret = sessionStorage.getItem(SESSION_SECRET_KEY);
  if (!secret) {
    secret = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    sessionStorage.setItem(SESSION_SECRET_KEY, secret);
  }
  return secret;
}

function createGreeting(sessionId: string): ChatbotMessage {
  return {
    id: 'greeting',
    session_id: sessionId,
    sender: 'bot',
    message:
      'Halo! Saya asisten virtual PT Bintang Sayap Utama. Ada yang bisa dibantu seputar profil perusahaan atau rekrutmen?',
    created_at: new Date().toISOString(),
  };
}

function getOrCreateSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function startNewSessionId(): string {
  const id = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

function startNewSessionSecret(): string {
  const secret = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  sessionStorage.setItem(SESSION_SECRET_KEY, secret);
  return secret;
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(getOrCreateSessionId);
  const [sessionSecret, setSessionSecret] = useState(getOrCreateSessionSecret);
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Muat riwayat sesi ini (kalau widget dibuka-tutup di halaman yang sama,
  // sebelum ditutup lewat tombol X — lihat handleClose di bawah)
  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingHistory(true);
      const { data } = await db.rpc('portal_chatbot_messages', { session_id: sessionId, session_secret: sessionSecret });
      if (active) {
        if (data && data.length > 0) {
          setMessages(data as ChatbotMessage[]);
        } else {
          // Sapaan pembuka — tidak disimpan ke Supabase, cukup tampil lokal
          setMessages([createGreeting(sessionId)]);
        }
        setLoadingHistory(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [sessionId, sessionSecret]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');

    const optimisticVisitor: ChatbotMessage = {
      id: `local-${Date.now()}`,
      session_id: sessionId,
      sender: 'visitor',
      message: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticVisitor]);

    await db.from('chatbot_messages').insert({ session_id: sessionId, session_secret: sessionSecret, sender: 'visitor', message: text });

    const reply = matchFaqAnswer(text);
    const { data: inserted } = await db
      .from('chatbot_messages')
      .insert({ session_id: sessionId, session_secret: sessionSecret, sender: 'bot', message: reply })
      .select()
      .maybeSingle();

    setMessages((prev) => [
      ...prev,
      (inserted as ChatbotMessage) ?? {
        id: `local-bot-${Date.now()}`,
        session_id: sessionId,
        sender: 'bot',
        message: reply,
        created_at: new Date().toISOString(),
      },
    ]);
    setSending(false);
  }

  // Dipanggil setiap kali gelembung chat DITUTUP (baik lewat tombol X di
  // panel, maupun klik ulang tombol bubble mengambang saat panel terbuka).
  // Menghapus seluruh riwayat percakapan sesi ini dari Supabase, lalu
  // memulai sessionId baru supaya pembukaan berikutnya bersih tanpa bekas.
  async function handleClose() {
    setOpen(false);
    

    const closingSessionId = sessionId;

    // Hapus riwayat di PostgreSQL untuk sesi yang baru saja ditutup.
    try {
      await db.rpc('portal_delete_chatbot_session', { session_id: closingSessionId, session_secret: sessionSecret });
    } catch (err) {
      console.error('Gagal menghapus riwayat chatbot:', err);
    }

    // Reset state lokal & mulai sesi baru
    const newSessionId = startNewSessionId();
    const newSessionSecret = startNewSessionSecret();
    setSessionId(newSessionId);
    setSessionSecret(newSessionSecret);
    setMessages([createGreeting(newSessionId)]);
    setInput('');
  }

  function handleToggle() {
    if (open) {
      handleClose();
    } else {
      setOpen(true);
    }
  }

  return (
    <>
      {/* Tombol mengambang */}
      <button
        onClick={handleToggle}
        aria-label={open ? 'Tutup chatbot' : 'Buka chatbot'}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-sky-600 text-white shadow-lg transition-transform hover:scale-105"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Panel chat */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[28rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-blue-600 to-sky-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} />
              <div>
                <p className="text-sm font-semibold leading-tight">Asisten HR</p>
                <p className="text-xs text-sky-100">PT Bintang Sayap Utama</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              aria-label="Tutup chatbot dan hapus riwayat"
              className="rounded-full p-1 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                <Loader2 size={16} className="animate-spin" /> Memuat percakapan...
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === 'visitor' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                      m.sender === 'visitor'
                        ? 'rounded-br-sm bg-sky-600 text-white'
                        : 'rounded-bl-sm bg-slate-100 text-slate-700'
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2 text-sm text-slate-400">
                  <Loader2 size={14} className="animate-spin" /> Mengetik...
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-slate-100 p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tulis pertanyaan Anda..."
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Kirim pesan"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 text-white disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
