import { useEffect, useMemo, useState } from 'react';
import { Activity, LogOut, RefreshCcw, Settings2 } from 'lucide-react';
import BrandLogo from './BrandLogo';
import AdminConfirmationForm from './AdminConfirmationForm';
import AdminLogin from './AdminLogin';
import ConfirmationList from './ConfirmationList';
import EventConfigPanel from './EventConfig';
import { adminListConfirmations, adminListEvents, adminLogin, adminSaveEvent, adminSubmitConfirmation, adminToggleEventStatus, adminValidateToken, clearAdminToken, getStoredAdminToken, setupEnvironment, storeAdminToken } from '../services/api';
import type { ConfirmationRecord, EventConfig } from '../types/api';

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 text-[24px] font-black text-slate-950">{value}</div>
    </div>
  );
}

export default function AdminPanel() {
  const [token, setToken] = useState(() => getStoredAdminToken());
  const [tokenValid, setTokenValid] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(Boolean(token));
  const [events, setEvents] = useState<EventConfig[]>([]);
  const [confirmations, setConfirmations] = useState<ConfirmationRecord[]>([]);
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingConfirmations, setLoadingConfirmations] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [savingConfirmation, setSavingConfirmation] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'eventos' | 'registro' | 'lista'>('eventos');

  const loadEvents = async (currentToken: string) => {
    setLoadingEvents(true);
    try {
      const result = await adminListEvents(currentToken);
      setEvents(result.events);
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadConfirmations = async (currentToken: string, filters?: Parameters<typeof adminListConfirmations>[0]['filters']) => {
    setLoadingConfirmations(true);
    try {
      const result = await adminListConfirmations({ adminToken: currentToken, filters });
      setConfirmations(result.confirmations);
    } finally {
      setLoadingConfirmations(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        await setupEnvironment();
      } catch {
        // bootstrap is best effort.
      }

      if (!token) {
        if (active) setCheckingAuth(false);
        return;
      }

      try {
        const result = await adminValidateToken(token);
        if (!active) return;
        if (!result.valid) {
          clearAdminToken();
          setToken('');
          setTokenValid(false);
          setMessage({ type: 'info', text: 'Sua sessão expirou. Faça login novamente.' });
          return;
        }

        setTokenValid(true);
        await Promise.all([loadEvents(token), loadConfirmations(token)]);
      } catch (error) {
        if (!active) return;
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Falha ao validar a sessão.' });
      } finally {
        if (active) setCheckingAuth(false);
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, [token]);

  const handleLogin = async (password: string) => {
    setAuthLoading(true);
    setMessage(null);
    try {
      const result = await adminLogin(password);
      storeAdminToken(result.adminToken);
      setToken(result.adminToken);
      setTokenValid(true);
      setMessage({ type: 'success', text: 'Login realizado com sucesso.' });
      await Promise.all([loadEvents(result.adminToken), loadConfirmations(result.adminToken)]);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Falha ao autenticar.' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearAdminToken();
    setToken('');
    setTokenValid(false);
    setEvents([]);
    setConfirmations([]);
    setMessage({ type: 'info', text: 'Sessão encerrada.' });
  };

  const handleSaveEvent = async (payload: {
    evento_id?: string;
    nome_evento: string;
    data_evento: string;
    pix_adulto: string;
    pix_adolescente: string;
    ativo: 'Sim' | 'Não';
  }) => {
    if (!token) return;
    setSavingEvent(true);
    try {
      await adminSaveEvent({ adminToken: token, ...payload });
      await loadEvents(token);
      setMessage({ type: 'success', text: payload.evento_id ? 'Evento atualizado.' : 'Evento criado.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Falha ao salvar evento.' });
    } finally {
      setSavingEvent(false);
    }
  };

  const handleToggleStatus = async (evento_id: string) => {
    if (!token) return;
    try {
      await adminToggleEventStatus({ adminToken: token, evento_id });
      await loadEvents(token);
      setMessage({ type: 'success', text: 'Status do evento atualizado.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Falha ao alterar status do evento.' });
    }
  };

  const handleAdminConfirmation = async (payload: {
    evento_id: string;
    nome_completo: string;
    telefone: string;
    tipo_participante: 'Adulto' | 'Adolescente';
    observacao?: string;
    proofFile?: Parameters<typeof adminSubmitConfirmation>[0]['proofFile'];
  }) => {
    if (!token) return;
    setSavingConfirmation(true);
    try {
      await adminSubmitConfirmation({ adminToken: token, ...payload });
      await loadConfirmations(token);
      setMessage({ type: 'success', text: 'Registro manual realizado.' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Falha ao registrar confirmação.' });
    } finally {
      setSavingConfirmation(false);
    }
  };

  const handleRefreshConfirmations = async (filters: Parameters<typeof adminListConfirmations>[0]['filters']) => {
    if (!token) return;
    await loadConfirmations(token, filters);
  };

  const stats = useMemo(() => ({
    events: events.length,
    active: events.filter((event) => event.ativo === 'Sim').length,
    confirmations: confirmations.length,
    manual: confirmations.filter((item) => item.origem_registro === 'Admin').length,
  }), [events, confirmations]);

  if (checkingAuth) {
    return <div className="min-h-screen bg-[#f5f7fb] px-4 py-12 text-slate-700">Validando sessão administrativa...</div>;
  }

  return (
    <main className="bg-[linear-gradient(180deg,_#07101d_0%,_#f5f7fb_0%,_#f5f7fb_100%)] px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_28px_90px_rgba(15,23,42,0.12)] md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <BrandLogo size="sm" showText tone="dark" />
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                <Settings2 size={14} />
                Painel admin
              </div>
              <h1 className="mt-4 text-[34px] font-black text-slate-950 md:text-[44px]">Gestão de eventos e confirmações</h1>
              <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-600">
                Cadastre os eventos, configure as chaves PIX, registre confirmações manuais e consulte os lançamentos da planilha.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => token && Promise.all([loadEvents(token), loadConfirmations(token)])} className="inline-flex items-center gap-2 rounded-[16px] border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold text-slate-700">
                <RefreshCcw size={16} />
                Recarregar
              </button>
              {tokenValid ? (
                <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 rounded-[16px] bg-slate-950 px-4 py-3 text-[14px] font-semibold text-white">
                  <LogOut size={16} />
                  Sair
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <Metric label="Eventos" value={String(stats.events)} />
            <Metric label="Ativos" value={String(stats.active)} />
            <Metric label="Confirmações" value={String(stats.confirmations)} />
            <Metric label="Registros admin" value={String(stats.manual)} />
          </div>

          {message ? <div className={`mt-5 rounded-[18px] border px-4 py-3 text-[14px] ${message.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>{message.text}</div> : null}
        </section>

        {!tokenValid ? (
          <AdminLogin loading={authLoading} onLogin={handleLogin} />
        ) : (
          <>
            <section className="rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="flex flex-wrap gap-2 p-2">
                {([
                  ['eventos', 'Eventos'],
                  ['registro', 'Registro manual'],
                  ['lista', 'Confirmações'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={`rounded-[16px] px-4 py-3 text-[14px] font-semibold transition ${activeTab === key ? 'bg-slate-950 text-white' : 'bg-transparent text-slate-600 hover:bg-slate-100'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {activeTab === 'eventos' ? (
              <EventConfigPanel events={events} saving={savingEvent} onSave={handleSaveEvent} onToggleStatus={handleToggleStatus} />
            ) : null}

            {activeTab === 'registro' ? (
              <AdminConfirmationForm events={events.filter((event) => event.ativo === 'Sim')} submitting={savingConfirmation} onSubmit={handleAdminConfirmation} />
            ) : null}

            {activeTab === 'lista' ? (
              <ConfirmationList events={events} confirmations={confirmations} loading={loadingConfirmations} onRefresh={handleRefreshConfirmations} />
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}



