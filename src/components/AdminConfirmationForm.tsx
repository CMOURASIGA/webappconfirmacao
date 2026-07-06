import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Loader2, MessageSquareText, Phone, Upload, Users } from 'lucide-react';
import { copyToClipboard, countWords, fileToBase64, isValidPhone, normalizePhoneInput, trimAndCollapseSpaces } from '../lib/confirmation';
import type { EventConfig, ProofFilePayload } from '../types/api';

export default function AdminConfirmationForm({
  events,
  submitting,
  onSubmit,
}: {
  events: EventConfig[];
  submitting: boolean;
  onSubmit: (payload: {
    evento_id: string;
    nome_completo: string;
    telefone: string;
    tipo_participante: 'Adulto' | 'Adolescente';
    observacao?: string;
    proofFile?: ProofFilePayload | null;
  }) => Promise<void> | void;
}) {
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.evento_id || '');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tipoParticipante, setTipoParticipante] = useState<'Adulto' | 'Adolescente'>('Adulto');
  const [observacao, setObservacao] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (!selectedEventId && events[0]?.evento_id) {
      setSelectedEventId(events[0].evento_id);
    }
  }, [events, selectedEventId]);

  const event = useMemo(() => events.find((item) => item.evento_id === selectedEventId), [events, selectedEventId]);

  const handleCopy = async (label: string, value: string) => {
    try {
      await copyToClipboard(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1600);
    } catch {
      setError('Nao foi possivel copiar a chave PIX.');
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const normalizedName = trimAndCollapseSpaces(nomeCompleto);
    const normalizedPhone = normalizePhoneInput(telefone);

    if (!selectedEventId) {
      setError('Selecione um evento.');
      return;
    }

    if (!normalizedName || countWords(normalizedName) < 2) {
      setError('Informe o nome completo com pelo menos duas palavras.');
      return;
    }

    if (!isValidPhone(normalizedPhone)) {
      setError('Informe o telefone no formato 55DDXXXXXXXXX. Exemplo: 5521999999999.');
      return;
    }

    let proofFilePayload: ProofFilePayload | null = null;
    if (proofFile) {
      const ext = proofFile.name.split('.').pop()?.toLowerCase() || '';
      const allowed = ['pdf', 'jpg', 'jpeg', 'png'];
      if (!allowed.includes(ext)) {
        setError('Arquivo inválido. Use PDF, JPG, JPEG ou PNG.');
        return;
      }
      if (proofFile.size > 10 * 1024 * 1024) {
        setError('O comprovante excede 10 MB.');
        return;
      }
      proofFilePayload = {
        name: proofFile.name,
        type: proofFile.type,
        size: proofFile.size,
        base64: await fileToBase64(proofFile),
      };
    }

    await onSubmit({
      evento_id: selectedEventId,
      nome_completo: normalizedName,
      telefone: normalizedPhone,
      tipo_participante: tipoParticipante,
      observacao: trimAndCollapseSpaces(observacao),
      proofFile: proofFilePayload,
    });
  };

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_26px_80px_rgba(15,23,42,0.12)] md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Registro manual</div>
          <h3 className="mt-2 text-[24px] font-black text-slate-950">Confirmação pelo admin</h3>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-600">
            O admin pode registrar sem comprovante e incluir observações internas quando necessário.
          </p>
        </div>
        <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white md:flex">
          <Users size={22} />
        </div>
      </div>

      {event ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Evento selecionado</div>
            <div className="mt-2 text-[18px] font-bold text-slate-950">{event.nome_evento}</div>
            <div className="mt-1 text-[13px] text-slate-500">{event.data_evento}</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => handleCopy('PIX adulto', event.pix_adulto)} className="rounded-[22px] border border-slate-200 bg-white p-4 text-left">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">PIX adulto</div>
              <div className="mt-2 break-all text-[14px] font-semibold text-slate-950">{event.pix_adulto}</div>
            </button>
            <button type="button" onClick={() => handleCopy('PIX adolescente', event.pix_adolescente)} className="rounded-[22px] border border-slate-200 bg-white p-4 text-left">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">PIX adolescente</div>
              <div className="mt-2 break-all text-[14px] font-semibold text-slate-950">{event.pix_adolescente}</div>
            </button>
          </div>
        </div>
      ) : null}

      {copied ? <div className="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[14px] text-emerald-700">Chave PIX copiada.</div> : null}

      {error ? <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{error}</div> : null}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Evento</label>
          <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-[#0b4f7a]">
            {events.map((item) => (
              <option key={item.evento_id} value={item.evento_id}>
                {item.nome_evento}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Nome completo</label>
          <input value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-[#0b4f7a]" />
        </div>

        <div>
          <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Telefone</label>
          <div className="mt-2 flex items-center rounded-[18px] border border-slate-200 bg-white px-4 py-3">
            <Phone size={18} className="text-slate-400" />
            <input value={telefone} onChange={(e) => setTelefone(normalizePhoneInput(e.target.value))} placeholder="21999999999 ou 5521999999999" className="ml-3 w-full bg-transparent text-[15px] outline-none" />
          </div>
          <div className="mt-2 text-[12px] text-slate-500">Se informar apenas `DDD + número`, o sistema completa com `55` automaticamente.</div>
        </div>

        <div>
          <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Tipo de participante</label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {(['Adulto', 'Adolescente'] as const).map((option) => (
              <button key={option} type="button" onClick={() => setTipoParticipante(option)} className={`rounded-[18px] border px-4 py-3 text-[14px] font-semibold transition ${tipoParticipante === option ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                {option}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Anexo do comprovante</label>
          <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-[#0b4f7a] hover:bg-sky-50/60">
            <Upload size={22} className="text-slate-500" />
            <span className="mt-3 text-[14px] font-semibold text-slate-900">{proofFile ? proofFile.name : 'Opcional para registro pelo admin'}</span>
            <span className="mt-1 text-[12px] text-slate-500">PDF, JPG, JPEG ou PNG, até 10 MB.</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
          </label>
        </div>

        <div>
          <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Observação administrativa</label>
          <div className="mt-2 flex items-start rounded-[18px] border border-slate-200 bg-white px-4 py-3">
            <MessageSquareText size={18} className="mt-0.5 text-slate-400" />
            <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={4} className="ml-3 w-full resize-none bg-transparent text-[15px] outline-none" placeholder="Campo livre para observação interna" />
          </div>
        </div>

        <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-slate-950 px-5 py-4 text-[15px] font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70">
          {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
          Registrar confirmação
        </button>
      </form>
    </section>
  );
}







