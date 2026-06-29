import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Edit3, Plus, Power, Save } from 'lucide-react';
import { formatDate, formatDateTime, trimAndCollapseSpaces } from '../lib/confirmation';
import type { EventConfig } from '../types/api';

export default function EventConfigPanel({
  events,
  saving,
  onSave,
  onToggleStatus,
}: {
  events: EventConfig[];
  saving: boolean;
  onSave: (payload: {
    evento_id?: string;
    nome_evento: string;
    data_evento: string;
    pix_adulto: string;
    pix_adolescente: string;
    ativo: 'Sim' | 'Não';
  }) => Promise<void> | void;
  onToggleStatus: (evento_id: string) => Promise<void> | void;
}) {
  const [editingId, setEditingId] = useState('');
  const [nomeEvento, setNomeEvento] = useState('');
  const [dataEvento, setDataEvento] = useState('');
  const [pixAdulto, setPixAdulto] = useState('');
  const [pixAdolescente, setPixAdolescente] = useState('');
  const [ativo, setAtivo] = useState<'Sim' | 'Não'>('Sim');
  const [error, setError] = useState('');

  const editingEvent = useMemo(() => events.find((event) => event.evento_id === editingId), [editingId, events]);

  useEffect(() => {
    if (!editingEvent) {
      return;
    }

    setNomeEvento(editingEvent.nome_evento);
    setDataEvento(editingEvent.data_evento);
    setPixAdulto(editingEvent.pix_adulto);
    setPixAdolescente(editingEvent.pix_adolescente);
    setAtivo(editingEvent.ativo);
  }, [editingEvent]);

  const clearForm = () => {
    setEditingId('');
    setNomeEvento('');
    setDataEvento('');
    setPixAdulto('');
    setPixAdolescente('');
    setAtivo('Sim');
    setError('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const payload = {
      evento_id: editingId || undefined,
      nome_evento: trimAndCollapseSpaces(nomeEvento),
      data_evento: dataEvento,
      pix_adulto: trimAndCollapseSpaces(pixAdulto),
      pix_adolescente: trimAndCollapseSpaces(pixAdolescente),
      ativo,
    };

    if (!payload.nome_evento) {
      setError('Informe o nome do evento.');
      return;
    }

    if (!payload.data_evento) {
      setError('Informe a data do evento.');
      return;
    }

    if (!payload.pix_adulto) {
      setError('Informe a chave PIX do adulto.');
      return;
    }

    if (!payload.pix_adolescente) {
      setError('Informe a chave PIX do adolescente.');
      return;
    }

    setError('');
    await onSave(payload);
    clearForm();
  };

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_26px_80px_rgba(15,23,42,0.12)] md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Eventos</div>
          <h3 className="mt-2 text-[24px] font-black text-slate-950">Cadastro e ativação</h3>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-600">
            O evento ativo aparece no formulário público. Use a tela para criar, editar, inativar e reativar eventos sem apagar o histórico.
          </p>
        </div>

        <button
          type="button"
          onClick={clearForm}
          className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-semibold text-slate-800 transition hover:border-slate-400"
        >
          <Plus size={16} />
          Novo evento
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Nome do evento</label>
            <input value={nomeEvento} onChange={(e) => setNomeEvento(e.target.value)} className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-[#0b4f7a]" />
          </div>
          <div>
            <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Data do evento</label>
            <input type="date" value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-[#0b4f7a]" />
          </div>
        </div>

        <div>
          <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Chave PIX adulto</label>
          <input value={pixAdulto} onChange={(e) => setPixAdulto(e.target.value)} className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-[#0b4f7a]" />
        </div>
        <div>
          <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Chave PIX adolescente</label>
          <input value={pixAdolescente} onChange={(e) => setPixAdolescente(e.target.value)} className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-[#0b4f7a]" />
        </div>

        <div className="lg:col-span-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Status</label>
            <div className="mt-2 grid grid-cols-2 gap-3 md:w-[260px]">
              {(['Sim', 'Não'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setAtivo(option)}
                  className={`rounded-[18px] border px-4 py-3 text-[14px] font-semibold transition ${ativo === option ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-[18px] bg-slate-950 px-5 py-3 text-[14px] font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save size={16} />
              Salvar evento
            </button>
            {editingId ? (
              <button type="button" onClick={clearForm} className="rounded-[18px] border border-slate-200 bg-white px-5 py-3 text-[14px] font-semibold text-slate-700">
                Cancelar edição
              </button>
            ) : null}
          </div>
        </div>

        {error ? <div className="lg:col-span-2 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">{error}</div> : null}
      </form>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full border-collapse text-[14px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="px-4 py-3 text-left">Evento</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">PIX adulto</th>
                <th className="px-4 py-3 text-left">PIX adolescente</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Atualizado</th>
                <th className="px-4 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.evento_id} className="border-t border-slate-200">
                  <td className="px-4 py-4 font-semibold text-slate-950">{event.nome_evento}</td>
                  <td className="px-4 py-4 text-slate-700">{formatDate(event.data_evento)}</td>
                  <td className="px-4 py-4 text-slate-700">{event.pix_adulto}</td>
                  <td className="px-4 py-4 text-slate-700">{event.pix_adolescente}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${event.ativo === 'Sim' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{event.ativo}</span>
                  </td>
                  <td className="px-4 py-4 text-slate-500">{event.atualizado_em ? formatDateTime(event.atualizado_em) : '-'}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(event.evento_id);
                          setNomeEvento(event.nome_evento);
                          setDataEvento(event.data_evento);
                          setPixAdulto(event.pix_adulto);
                          setPixAdolescente(event.pix_adolescente);
                          setAtivo(event.ativo);
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700"
                      >
                        <Edit3 size={14} />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleStatus(event.evento_id)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-950 px-3 py-2 text-[12px] font-semibold text-white"
                      >
                        <Power size={14} />
                        {event.ativo === 'Sim' ? 'Inativar' : 'Reativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Nenhum evento cadastrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}





