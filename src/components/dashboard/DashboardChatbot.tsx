import { useEffect, useRef, useState } from 'react';
import { Bot, X, Send, Loader2, Sparkles } from 'lucide-react';
import { answerDataQuestion } from '@/lib/dataChatbot';

type ChatMsg = { id: string; sender: 'user' | 'bot'; text: string };

const SUGGESTIONS = [
  'Jumlah PA di area Malang berapa?',
  'Berapa karyawan resign di Surabaya?',
  'Total insentif yang sudah dibayar',
  'Jumlah rekrutmen di area Jakarta',
];

function greeting(): ChatMsg {
  return {
    id: 'greeting',
    sender: 'bot',
    text:
      'Halo! Saya Asisten Data Dashboard. Tanyakan seputar data yang tersimpan di sistem, misalnya jumlah Personnel Action (PA) di suatu area, jumlah karyawan resign per region, atau rekap rekrutmen & pelatihan.',
  };
}

export default function DashboardChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([greeting()]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setInput('');
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: 'user', text: trimmed }]);
    setSending(true);
    try {
      const answer = await answerDataQuestion(trimmed);
      setMessages((prev) => [...prev, { id: `b-${Date.now()}`, sender: 'bot', text: answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `b-${Date.now()}`, sender: 'bot', text: 'Maaf, terjadi kendala saat mengambil data. Silakan coba lagi.' },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Tutup asisten data' : 'Buka asisten data'}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg transition-transform hover:scale-105"
      >
        {open ? <X size={22} /> : <Bot size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex h-[30rem] w-[23rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3 text-white">
            <Bot size={18} />
            <div>
              <p className="text-sm font-semibold leading-tight">Asisten Data HR</p>
              <p className="text-xs text-emerald-100">Tanya data langsung dari database</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm ${
                    m.sender === 'user' ? 'rounded-br-sm bg-teal-600 text-white' : 'rounded-bl-sm bg-slate-100 text-slate-700'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2 text-sm text-slate-400">
                  <Loader2 size={14} className="animate-spin" /> Mengambil data...
                </div>
              </div>
            )}

            {messages.length <= 1 && !sending && (
              <div className="pt-1">
                <p className="mb-2 flex items-center gap-1 text-xs font-medium text-slate-400">
                  <Sparkles size={12} /> Coba tanyakan:
                </p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-left text-xs text-slate-600 hover:border-teal-300 hover:bg-teal-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-slate-100 p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Contoh: jumlah PA di area Malang"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Kirim pertanyaan"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 text-white disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}