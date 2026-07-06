import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CheckCircle2, Copy, Loader2, Phone, Ticket, Upload, Users } from 'lucide-react';
import { copyToClipboard, countWords, downloadConfirmationImage, fileToBase64, formatDate, isValidPhone, normalizePhoneInput, trimAndCollapseSpaces } from '../lib/confirmation';
import { getPublicBootstrap, submitConfirmation } from '../services/api';
import type { ConfirmationParticipantPayload, EventConfig, PublicBootstrapData, ProofFilePayload } from '../types/api';
import BrandLogo from './BrandLogo';

const initialPhone = '';
const MAX_PARTICIPANTS = 10;

function createParticipant(
  nome_completo = '',
  tipo_participante: 'Adulto' | 'Adolescente' = 'Adulto',
): ConfirmationParticipantPayload {
  return { nome_completo, tipo_participante };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
      <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">{label}</div>
      <div className="mt-2 text-[20px] font-bold text-white">{value}</div>
    </div>
  );
}

function PixCard({
  title,
  accent,
  disabled = false,
  onCopy,
}: {
  title: string;
  accent: string;
  disabled?: boolean;
  onCopy: () => void;
}) {
  return (
    <div className={`rounded-[22px] border border-white/10 bg-gradient-to-br ${accent} p-4 text-white shadow-lg`}>
      <div className="text-[11px] uppercase tracking-[0.24em] text-white/70">{title}</div>
      <div className="mt-2 text-[15px] font-semibold leading-6 text-white/95">
        <div className="text-[14px] uppercase tracking-[0.18em] text-white/55">Chave protegida</div>
        <div className="mt-2">Disponível para cópia no botão abaixo.</div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        disabled={disabled}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[12px] font-semibold transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Copy size={14} />
        Copiar chave
      </button>
    </div>
  );
}

export default function PublicConfirmationForm() {
  const [bootstrap, setBootstrap] = useState<PublicBootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [participantCount, setParticipantCount] = useState(1);
  const [participants, setParticipants] = useState<ConfirmationParticipantPayload[]>([createParticipant()]);
  const [telefone, setTelefone] = useState(initialPhone);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedTitle, setCopiedTitle] = useState('');
  const [success, setSuccess] = useState<{ open: boolean; confirmacao_id: string; confirmacaoIds: string[]; proofUrl: string; nomeEvento: string; dataEvento: string; nomesConfirmados: string[]; telefone: string; tiposParticipante: string[] }>({
    open: false,
    confirmacao_id: '',
    confirmacaoIds: [],
    proofUrl: '',
    nomeEvento: '',
    dataEvento: '',
    nomesConfirmados: [],
    telefone: '',
    tiposParticipante: [],
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await getPublicBootstrap();
        if (!active) return;
        const normalizedEvents = Array.isArray(data?.events) ? data.events.filter(Boolean) : [];
        const normalizedAllowedExtensions =
          Array.isArray(data?.allowedExtensions) && data.allowedExtensions.length
            ? data.allowedExtensions
            : ['pdf', 'jpg', 'jpeg', 'png'];

        setBootstrap({
          events: normalizedEvents,
          allowedExtensions: normalizedAllowedExtensions,
        });

        if (!normalizedEvents.length) {
          setMessage({
            type: 'info',
            text: 'Nenhum evento ativo está disponível no momento.',
          });
        }
      } catch (error) {
        if (!active) return;
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Falha ao carregar os eventos.',
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const events = useMemo(() => (Array.isArray(bootstrap?.events) ? bootstrap.events : []), [bootstrap]);
  const selectedEvent = useMemo<EventConfig | undefined>(() => events.find((event) => event.evento_id === selectedEventId), [events, selectedEventId]);
  const isGroupConfirmation = participantCount > 1;

  useEffect(() => {
    if (!events.length) {
      if (selectedEventId) {
        setSelectedEventId('');
      }
      return;
    }

    const stillAvailable = events.some((event) => event.evento_id === selectedEventId);
    if (!selectedEventId || !stillAvailable) {
      setSelectedEventId(events[0].evento_id);
    }
  }, [events, selectedEventId]);

  useEffect(() => {
    setParticipants((current) => {
      const normalizedCount = Math.max(1, Math.min(MAX_PARTICIPANTS, participantCount));
      const next = current.slice(0, normalizedCount);

      while (next.length < normalizedCount) {
        next.push(createParticipant());
      }

      return next;
    });
  }, [participantCount]);

  const updateParticipant = (index: number, updates: Partial<ConfirmationParticipantPayload>) => {
    setParticipants((current) => current.map((participant, currentIndex) => (
      currentIndex === index ? { ...participant, ...updates } : participant
    )));
  };

  const handleCopy = async (label: string, value: string) => {
    try {
      await copyToClipboard(value);
      setCopiedTitle(label);
      setMessage({ type: 'success', text: 'Chave PIX copiada.' });
      window.setTimeout(() => setCopiedTitle(''), 1800);
    } catch {
      setMessage({ type: 'error', text: 'Nao foi possivel copiar a chave PIX.' });
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);

    const normalizedPhone = normalizePhoneInput(telefone);
    const normalizedParticipants = participants
      .slice(0, participantCount)
      .map((participant) => ({
        nome_completo: trimAndCollapseSpaces(participant.nome_completo),
        tipo_participante: participant.tipo_participante,
      }));

    if (!selectedEvent) {
      setMessage({ type: 'error', text: 'Selecione um evento.' });
      return;
    }

    if (participantCount < 1 || participantCount > MAX_PARTICIPANTS) {
      setMessage({ type: 'error', text: `Informe uma quantidade entre 1 e ${MAX_PARTICIPANTS} participantes.` });
      return;
    }

    if (!isValidPhone(normalizedPhone)) {
      setMessage({ type: 'error', text: 'Informe o telefone no formato 55DDXXXXXXXXX. Exemplo: 5521999999999.' });
      return;
    }

    for (let index = 0; index < normalizedParticipants.length; index += 1) {
      if (!normalizedParticipants[index].nome_completo || countWords(normalizedParticipants[index].nome_completo) < 2) {
        setMessage({ type: 'error', text: `Informe o nome completo do participante ${index + 1} com pelo menos duas palavras.` });
        return;
      }
    }

    const allowed = bootstrap?.allowedExtensions || ['pdf', 'jpg', 'jpeg', 'png'];
    let proofFilePayload: ProofFilePayload | null = null;
    if (proofFile) {
      const ext = proofFile.name.split('.').pop()?.toLowerCase() || '';
      if (!allowed.includes(ext)) {
        setMessage({ type: 'error', text: `Arquivo inválido. Use: ${allowed.join(', ').toUpperCase()}.` });
        return;
      }

      if (proofFile.size > 10 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'O comprovante excede 10 MB.' });
        return;
      }

      proofFilePayload = {
        name: proofFile.name,
        type: proofFile.type,
        size: proofFile.size,
        base64: await fileToBase64(proofFile),
      };
    }

    setSubmitting(true);
    try {
      const response = await submitConfirmation({
        evento_id: selectedEvent.evento_id,
        nome_completo: normalizedParticipants[0].nome_completo,
        telefone: normalizedPhone,
        tipo_participante: normalizedParticipants[0].tipo_participante,
        participants: normalizedParticipants,
        proofFile: proofFilePayload,
      });

      setSuccess({
        open: true,
        confirmacao_id: response.confirmacao_id,
        confirmacaoIds: response.confirmacao_ids,
        proofUrl: response.proofUrl,
        nomeEvento: selectedEvent.nome_evento,
        dataEvento: selectedEvent.data_evento,
        nomesConfirmados: response.nomes_confirmados,
        telefone: normalizedPhone,
        tiposParticipante: normalizedParticipants.map((participant) => participant.tipo_participante),
      });
      setMessage({
        type: 'success',
        text: response.total_confirmacoes > 1
          ? `${response.total_confirmacoes} confirmações registradas com sucesso.`
          : 'Confirmação registrada com sucesso. Obrigado por confirmar sua participação.',
      });
      setParticipantCount(1);
      setParticipants([createParticipant()]);
      setTelefone('');
      setProofFile(null);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Falha ao enviar a confirmação.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveConfirmation = async () => {
    try {
      await downloadConfirmationImage({
        confirmacaoId: success.confirmacao_id,
        nomeEvento: success.nomeEvento,
        dataEvento: formatDate(success.dataEvento),
        nomeCompleto: success.nomesConfirmados.join(', '),
        telefone: success.telefone,
        tipoParticipante: success.tiposParticipante.length > 1 ? `${success.tiposParticipante.length} participantes` : (success.tiposParticipante[0] || ''),
        proofUrl: success.proofUrl,
      });
      setSuccess({ open: false, confirmacao_id: '', confirmacaoIds: [], proofUrl: '', nomeEvento: '', dataEvento: '', nomesConfirmados: [], telefone: '', tiposParticipante: [] });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Falha ao salvar a confirmação.' });
    }
  };

  return (
    <main className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(11,79,122,0.28),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.2),_transparent_28%),linear-gradient(180deg,_#0b4f7a_0%,_#083654_42%,_#f5f7fb_42%,_#f5f7fb_100%)] px-4 pb-16 pt-6 md:px-6">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.12fr_0.88fr]">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0a3d61]/85 text-white shadow-[0_30px_120px_rgba(2,8,23,0.45)] backdrop-blur-xl">
          <div className="border-b border-white/10 px-6 py-6 md:px-8">
            <BrandLogo size="lg" showText tone="light" />
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/60">
              <Ticket size={14} />
              Confirmação pública
            </div>
            <h1 className="mt-4 max-w-2xl text-[34px] font-black leading-[1.05] md:text-[48px]">
              Faça o PIX, copie a chave certa e confirme sua participação.
            </h1>
            <p className="mt-4 max-w-2xl text-[16px] leading-7 text-white/70 md:text-[17px]">
              A confirmação só deve ser enviada após o pagamento via PIX. Escolha a chave correta, faça o PIX e, se desejar, anexe o comprovante no final do formulário.
            </p>
          </div>

          <div className="grid gap-4 px-6 py-6 md:grid-cols-3 md:px-8">
            <Stat label="Fluxo" value="PIX antes" />
            <Stat label="Anexo" value="Opcional" />
            <Stat label="Acesso" value="Sem login" />
          </div>

          <div className="px-6 pb-6 md:px-8 md:pb-8">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 md:p-6">
              <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/55">Escolha o evento</label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    disabled={!events.length}
                    className="mt-2 w-full rounded-[18px] border border-white/10 bg-white/10 px-4 py-3 text-[15px] text-white outline-none transition focus:border-[#1d71b8]"
                  >
                    <option value="">Selecione um evento</option>
                    {events.map((event) => (
                      <option key={event.evento_id} value={event.evento_id}>
                        {event.nome_evento}
                      </option>
                    ))}
                  </select>

                  <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-4">
                    <div className="text-[11px] uppercase tracking-[0.26em] text-white/45">Evento selecionado</div>
                    <div className="mt-2 text-[20px] font-bold text-white">{selectedEvent?.nome_evento || 'Nenhum evento selecionado'}</div>
                    <div className="mt-2 text-[14px] text-white/65">Data do evento: {selectedEvent ? formatDate(selectedEvent.data_evento) : '-'}</div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <PixCard
                    title="PIX Adulto"
                    accent="from-[#0b4f7a] to-[#083654]"
                    disabled={!selectedEvent}
                    onCopy={() => {
                      if (selectedEvent) {
                        void handleCopy('PIX Adulto', selectedEvent.pix_adulto);
                      }
                    }}
                  />
                  <PixCard
                    title="PIX Adolescente"
                    accent="from-[#c81e2f] to-[#7f1220]"
                    disabled={!selectedEvent}
                    onCopy={() => {
                      if (selectedEvent) {
                        void handleCopy('PIX Adolescente', selectedEvent.pix_adolescente);
                      }
                    }}
                  />
                </div>
              </div>

              {!loading && !events.length ? (
                <div className="mt-5 rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-[14px] font-medium text-amber-900">
                  Não há eventos ativos para exibir. Quando a API retornar um evento válido, as chaves PIX aparecerão aqui.
                </div>
              ) : null}

              <div className="mt-5 rounded-[22px] border border-[#c81e2f]/20 bg-[#0b4f7a]/10 p-4 text-white">
                <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-white">Aviso</div>
                <ul className="mt-3 space-y-2 text-[14px] leading-6 text-white/90">
                  <li>1. Escolha o evento.</li>
                  <li>2. Copie a chave PIX correta: Adulto ou Adolescente.</li>
                  <li>3. Faça o pagamento.</li>
                  <li>4. Preencha seus dados.</li>
                  <li>5. Se quiser, anexe o comprovante.</li>
                  <li>6. Confirme sua participação.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_26px_80px_rgba(15,23,42,0.12)] md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.26em] text-slate-500">Formulário</div>
              <h2 className="mt-2 text-[26px] font-black text-slate-950">Confirme a participação</h2>
            </div>
            <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white md:flex">
              <Users size={22} />
            </div>
          </div>

          {loading && (
            <div className="mt-5 flex items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
              <Loader2 className="animate-spin" size={18} />
              Carregando eventos...
            </div>
          )}

          {message && (
            <div className={`mt-5 rounded-[18px] border px-4 py-3 text-[14px] font-medium ${message.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-sky-200 bg-sky-50 text-sky-800'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <div>
              <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Quantidade de confirmações</label>
              <input
                type="number"
                min={1}
                max={MAX_PARTICIPANTS}
                value={participantCount}
                onChange={(e) => setParticipantCount(Math.max(1, Math.min(MAX_PARTICIPANTS, Number(e.target.value) || 1)))}
                className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-950 outline-none transition focus:border-[#0b4f7a]"
              />
              <div className="mt-2 text-[12px] text-slate-500">Use de 1 a {MAX_PARTICIPANTS} participantes por confirmação.</div>
            </div>

            <div>
              <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {isGroupConfirmation ? 'Participantes' : 'Nome completo'}
              </label>
              {!isGroupConfirmation ? (
                <input
                  type="text"
                  value={participants[0]?.nome_completo || ''}
                  onChange={(e) => updateParticipant(0, { nome_completo: e.target.value })}
                  placeholder="Digite seu nome completo"
                  className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-950 outline-none transition focus:border-[#0b4f7a]"
                />
              ) : (
                <div className="mt-2 space-y-3">
                  {participants.slice(0, participantCount).map((participant, index) => (
                    <div key={`participant-${index + 1}`} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Participante {index + 1}</div>
                      <input
                        type="text"
                        value={participant.nome_completo}
                        onChange={(e) => updateParticipant(index, { nome_completo: e.target.value })}
                        placeholder={`Nome completo do participante ${index + 1}`}
                        className="mt-3 w-full rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-[15px] text-slate-950 outline-none transition focus:border-[#0b4f7a]"
                      />
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {(['Adulto', 'Adolescente'] as const).map((option) => (
                          <button
                            key={`${option}-${index + 1}`}
                            type="button"
                            onClick={() => updateParticipant(index, { tipo_participante: option })}
                            className={`rounded-[16px] border px-4 py-3 text-[14px] font-semibold transition ${participant.tipo_participante === option ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'}`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isGroupConfirmation ? (
              <div>
                <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Tipo de participante</label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {(['Adulto', 'Adolescente'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateParticipant(0, { tipo_participante: option })}
                      className={`rounded-[18px] border px-4 py-3 text-[15px] font-semibold transition ${participants[0]?.tipo_participante === option ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Telefone responsável</label>
              <div className="mt-2 flex items-center rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                <Phone size={18} className="text-slate-400" />
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(normalizePhoneInput(e.target.value))}
                  placeholder="5521999999999"
                  className="ml-3 w-full bg-transparent text-[15px] text-slate-950 outline-none"
                />
              </div>
              <div className="mt-2 text-[12px] text-slate-500">Informe o telefone no formato 55DDXXXXXXXXX. Ele será usado em todas as linhas geradas.</div>
            </div>

            <div>
              <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Anexo do comprovante</label>
              <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-[#0b4f7a] hover:bg-sky-50/60">
                <Upload size={24} className="text-slate-500" />
                <span className="mt-3 text-[15px] font-semibold text-slate-900">{proofFile ? proofFile.name : 'Clique para anexar PDF, JPG, JPEG ou PNG'}</span>
                <span className="mt-1 text-[12px] text-slate-500">Opcional. Se enviar, o limite é de 10 MB.</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting || loading || !selectedEvent}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-gradient-to-r from-[#0b4f7a] to-[#1d71b8] px-5 py-4 text-[15px] font-black text-[#111827] shadow-lg shadow-sky-500/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? <Loader2 className="animate-spin" size={18} /> : null}
              Confirmar participação
            </button>
          </form>
        </section>
      </div>

      {copiedTitle && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13px] font-semibold text-emerald-800 shadow-lg">
          {copiedTitle} copiado.
        </div>
      )}

      {success.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-emerald-200 bg-white p-6 text-center shadow-2xl">
            <CheckCircle2 size={46} className="mx-auto text-emerald-500" />
            <h3 className="mt-4 text-[24px] font-black text-slate-950">Confirmação registrada</h3>
            <p className="mt-2 text-[15px] text-slate-600">
              {success.confirmacaoIds.length > 1
                ? `${success.confirmacaoIds.length} participantes foram registrados com o mesmo comprovante.`
                : 'Obrigado por confirmar sua participação.'}
            </p>
            <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-left">
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">ID da confirmação</div>
              <div className="mt-2 break-all text-[15px] font-bold text-slate-950">{success.confirmacao_id}</div>
              {success.nomesConfirmados.length ? (
                <div className="mt-3 text-[13px] text-slate-600">{success.nomesConfirmados.join(', ')}</div>
              ) : null}
              {success.proofUrl ? <div className="mt-3 break-all text-[13px] text-slate-500">{success.proofUrl}</div> : null}
            </div>
            <button
              type="button"
              onClick={handleSaveConfirmation}
              className="mt-5 w-full rounded-[18px] bg-slate-950 px-4 py-3 text-[14px] font-bold text-white"
            >
              Salvar confirmação
            </button>
          </div>
        </div>
      )}
    </main>
  );
}




