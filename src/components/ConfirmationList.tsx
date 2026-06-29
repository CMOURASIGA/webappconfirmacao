import { useMemo, useState } from 'react';
import { Filter, Search } from 'lucide-react';
import { formatDateTime, trimAndCollapseSpaces } from '../lib/confirmation';
import type { ConfirmationRecord, EventConfig } from '../types/api';

export default function ConfirmationList({
  events,
  confirmations,
  loading,
  onRefresh,
}: {
  events: EventConfig[];
  confirmations: ConfirmationRecord[];
  loading: boolean;
  onRefresh: (filters: {
    evento_id?: string;
    tipo_participante?: 'Adulto' | 'Adolescente' | '';
    search?: string;
    telefone?: string;
    status?: string;
  }) => Promise<void> | void;
}) {
  const [eventoId, setEventoId] = useState('');
  const [tipoParticipante, setTipoParticipante] = useState<'Adulto' | 'Adolescente' | ''>('');
  const [search, setSearch] = useState('');
  const [telefone, setTelefone] = useState('');
  const [status, setStatus] = useState('');

  const indicators = useMemo(() => {
    const total = confirmations.length;
    const totalAdulto = confirmations.filter((item) => item.tipo_participante === 'Adulto').length;
    const totalAdolescente = confirmations.filter((item) => item.tipo_participante === 'Adolescente').length;
    const totalComComprovante = confirmations.filter((item) => item.link_comprovante).length;
    const totalSemComprovante = confirmations.filter((item) => !item.link_comprovante).length;
    const totalAdmin = confirmations.filter((item) => item.origem_registro === 'Admin').length;

    return { total, totalAdulto, totalAdolescente, totalComComprovante, totalSemComprovante, totalAdmin };
  }, [confirmations]);

  const handleFilter = async () => {
    await onRefresh({
      evento_id: eventoId,
      tipo_participante: tipoParticipante,
      search: trimAndCollapseSpaces(search),
      telefone: telefone.replace(/\D/g, ''),
      status: trimAndCollapseSpaces(status),
    });
  };

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_26px_80px_rgba(15,23,42,0.12)] md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Confirmações</div>
          <h3 className="mt-2 text-[24px] font-black text-slate-950">Consulta e filtros</h3>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-600">
            Consulte os registros mais recentes, filtre por evento e veja rapidamente os totais de presença, comprovante e lançamentos manuais.
          </p>
        </div>
        <button type="button" onClick={handleFilter} className="inline-flex items-center justify-center gap-2 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-semibold text-slate-800">
          <Filter size={16} />
          Atualizar filtros
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4"><div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Total</div><div className="mt-2 text-[24px] font-black text-slate-950">{indicators.total}</div></div>
        <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4"><div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Adulto</div><div className="mt-2 text-[24px] font-black text-slate-950">{indicators.totalAdulto}</div></div>
        <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4"><div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Adolescente</div><div className="mt-2 text-[24px] font-black text-slate-950">{indicators.totalAdolescente}</div></div>
        <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4"><div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Com comprovante</div><div className="mt-2 text-[24px] font-black text-slate-950">{indicators.totalComComprovante}</div></div>
        <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-4"><div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Admin</div><div className="mt-2 text-[24px] font-black text-slate-950">{indicators.totalAdmin}</div></div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        <div>
          <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Evento</label>
          <select value={eventoId} onChange={(e) => setEventoId(e.target.value)} className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-[#0b4f7a]">
            <option value="">Todos</option>
            {events.map((event) => (
              <option key={event.evento_id} value={event.evento_id}>{event.nome_evento}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Tipo</label>
          <select value={tipoParticipante} onChange={(e) => setTipoParticipante(e.target.value as 'Adulto' | 'Adolescente' | '')} className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-[#0b4f7a]">
            <option value="">Todos</option>
            <option value="Adulto">Adulto</option>
            <option value="Adolescente">Adolescente</option>
          </select>
        </div>
        <div>
          <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Status</label>
          <input value={status} onChange={(e) => setStatus(e.target.value)} className="mt-2 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-[#0b4f7a]" />
        </div>
        <div>
          <label className="text-[12px] font-semibold uppercase tracking-[0.22em] text-slate-500">Busca</label>
          <div className="mt-2 flex items-center rounded-[18px] border border-slate-200 bg-white px-4 py-3">
            <Search size={18} className="text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="ml-3 w-full bg-transparent text-[15px] outline-none" placeholder="Nome, telefone ou evento" />
          </div>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-[1280px] w-full border-collapse text-[14px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="px-4 py-3 text-left">Data/hora</th>
                <th className="px-4 py-3 text-left">Evento</th>
                <th className="px-4 py-3 text-left">Data do evento</th>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Telefone</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Comprovante</th>
                <th className="px-4 py-3 text-left">Origem</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Carregando confirmações...</td></tr>
              ) : confirmations.length ? confirmations.map((item) => (
                <tr key={item.confirmacao_id} className="border-t border-slate-200">
                  <td className="px-4 py-4 text-slate-600">{formatDateTime(item.data_hora)}</td>
                  <td className="px-4 py-4 font-semibold text-slate-950">{item.nome_evento}</td>
                  <td className="px-4 py-4 text-slate-700">{item.data_evento}</td>
                  <td className="px-4 py-4 text-slate-700">{item.nome_completo}</td>
                  <td className="px-4 py-4 text-slate-700">{item.telefone}</td>
                  <td className="px-4 py-4 text-slate-700">{item.tipo_participante}</td>
                  <td className="px-4 py-4 text-slate-700">{item.link_comprovante ? <a className="font-semibold text-[#0b4f7a]" href={item.link_comprovante} target="_blank" rel="noreferrer">Abrir</a> : '-'}</td>
                  <td className="px-4 py-4 text-slate-700">{item.origem_registro}</td>
                  <td className="px-4 py-4 text-slate-700">{item.status_confirmacao}</td>
                </tr>
              )) : (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Nenhuma confirmação encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}


