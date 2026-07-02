import type {
  AdminListConfirmationsPayload,
  AdminListConfirmationsResult,
  AdminListEventsResult,
  AdminLoginResult,
  AdminSaveEventPayload,
  AdminSubmitConfirmationPayload,
  AdminToggleEventStatusPayload,
  AdminValidateTokenResult,
  BootstrapData,
  ConfirmationRecord,
  DashboardData,
  EventConfig,
  MarkOrderStockSettledResult,
  PublicBootstrapData,
  SettleReplenishmentResult,
  SubmitConfirmationPayload,
  SubmitOrderPayload,
  SubmitOrderResult,
} from '../types/api';

const MOCK_MODE = import.meta.env.VITE_USE_MOCK_API === 'true';
const GAS_URL = (import.meta.env.VITE_GAS_WEB_APP_URL || '').trim();
const ADMIN_TOKEN_KEY = 'event-confirmation-admin-token';
const MOCK_STATE_KEY = 'event-confirmation-mock-state';
const MOCK_ADMIN_PASSWORD = 'admin123';
const TOKEN_TTL_MS = 3 * 60 * 60 * 1000;
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];

type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

type MockState = {
  events: EventConfig[];
  confirmations: ConfirmationRecord[];
  tokens: Record<string, number>;
};

function ensureApiEnabled() {
  if (MOCK_MODE) {
    return;
  }

  if (!GAS_URL) {
    throw new Error('Defina VITE_GAS_WEB_APP_URL no .env.local');
  }
}

async function callGas<T>(action: string, payload?: unknown): Promise<T> {
  if (MOCK_MODE) {
    return handleMockAction<T>(action, payload);
  }

  ensureApiEnabled();

  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({ action, payload }),
  });

  let parsed: ApiEnvelope<T> | null = null;
  try {
    parsed = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new Error('Resposta invalida do Apps Script.');
  }

  if (!response.ok || !parsed || !parsed.ok) {
    throw new Error(parsed?.error || 'Falha ao consultar Apps Script.');
  }

  if (typeof parsed.data === 'undefined') {
    throw new Error('Resposta sem dados do Apps Script.');
  }

  return parsed.data;
}

function hasWindow() {
  return typeof window !== 'undefined';
}

function readStorage<T>(key: string, fallback: T): T {
  if (!hasWindow()) return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (!hasWindow()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value: string) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function generateId(prefix: string) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

function seedMockState(): MockState {
  return {
    events: [
      {
        evento_id: 'EVT-20260712-001',
        nome_evento: 'PÃ³s Social EAC',
        data_evento: '2026-07-12',
        pix_adulto: 'chavepixadulto@email.com',
        pix_adolescente: 'chavepixadolescente@email.com',
        ativo: 'Sim',
        criado_em: '2026-06-28T12:00:00.000Z',
        atualizado_em: '2026-06-28T12:00:00.000Z',
      },
      {
        evento_id: 'EVT-20260720-002',
        nome_evento: 'Encontro de Jovens',
        data_evento: '2026-07-20',
        pix_adulto: 'adulto@pix.com',
        pix_adolescente: 'adolescente@pix.com',
        ativo: 'Sim',
        criado_em: '2026-06-28T12:00:00.000Z',
        atualizado_em: '2026-06-28T12:00:00.000Z',
      },
    ],
    confirmations: [],
    tokens: {},
  };
}

function getMockState(): MockState {
  const state = readStorage<MockState>(MOCK_STATE_KEY, seedMockState());
  if (!state.events?.length) {
    const seeded = seedMockState();
    writeStorage(MOCK_STATE_KEY, seeded);
    return seeded;
  }
  return state;
}

function setMockState(state: MockState) {
  writeStorage(MOCK_STATE_KEY, state);
}

function validatePhone(phone: string) {
  return /^55\d{10,11}$/.test(phone);
}

function ensureAllowedFile(proofFile: { name: string; size: number } | null | undefined) {
  if (!proofFile) return;
  const ext = String(proofFile.name || '').split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error('Arquivo invÃ¡lido. Envie PDF, JPG, JPEG ou PNG.');
  }
  if (Number(proofFile.size) > 10 * 1024 * 1024) {
    throw new Error('O comprovante excede o limite de 10 MB.');
  }
}

function assertAdminToken(state: MockState, token: string) {
  const expiresAt = state.tokens[token];
  if (!token || !expiresAt || expiresAt < Date.now()) {
    throw new Error('Token admin invÃ¡lido ou expirado.');
  }
}

function normalizeEventInput(input: Partial<EventConfig> & { nome_evento: string; data_evento: string; pix_adulto: string; pix_adolescente: string; ativo: 'Sim' | 'Não'; }) {
  const nome_evento = String(input.nome_evento || '').trim();
  const data_evento = String(input.data_evento || '').trim();
  const pix_adulto = String(input.pix_adulto || '').trim();
  const pix_adolescente = String(input.pix_adolescente || '').trim();
  if (!nome_evento) throw new Error('Informe o nome do evento.');
  if (!data_evento) throw new Error('Informe a data do evento.');
  if (!pix_adulto) throw new Error('Informe a chave PIX do adulto.');
  if (!pix_adolescente) throw new Error('Informe a chave PIX do adolescente.');
  return {
    nome_evento,
    data_evento,
    pix_adulto,
    pix_adolescente,
    ativo: input.ativo === 'Não' ? 'Não' : 'Sim',
  } as const;
}

function getMockBootstrap(): PublicBootstrapData {
  const state = getMockState();
  return {
    events: [...state.events]
      .filter((event) => event.ativo === 'Sim')
      .sort((a, b) => a.data_evento.localeCompare(b.data_evento)),
    allowedExtensions: [...ALLOWED_EXTENSIONS],
  };
}

function findEvent(state: MockState, evento_id: string) {
  return state.events.find((event) => event.evento_id === evento_id) || null;
}

function submitConfirmationLike(
  state: MockState,
  payload: SubmitConfirmationPayload | AdminSubmitConfirmationPayload,
  origin: 'Publico' | 'Admin',
): { confirmation: ConfirmationRecord; proofUrl: string } {
  const event = findEvent(state, payload.evento_id);
  if (!event) {
    throw new Error('Evento Não encontrado.');
  }
  if (event.ativo !== 'Sim') {
    throw new Error('O evento escolhido estÃ¡ inativo.');
  }

  const nome_completo = String(payload.nome_completo || '').trim().replace(/\s+/g, ' ');
  const telefone = String(payload.telefone || '').replace(/\D/g, '');
  const tipo_participante = payload.tipo_participante;
  const proofFile = payload.proofFile ?? null;

  if (!nome_completo || nome_completo.split(' ').filter(Boolean).length < 2) {
    throw new Error('Informe o nome completo com pelo menos duas palavras.');
  }
  if (!validatePhone(telefone)) {
    throw new Error('Informe o telefone no formato 55DDXXXXXXXXX. Exemplo: 5521999999999.');
  }
  if (tipo_participante !== 'Adulto' && tipo_participante !== 'Adolescente') {
    throw new Error('Tipo de participante invÃ¡lido.');
  }
  if (origin === 'Publico' || proofFile) {
    ensureAllowedFile(proofFile);
  }

  const duplicate = state.confirmations.find(
    (record) => record.evento_id === event.evento_id && record.telefone === telefone,
  );
  if (duplicate && origin === 'Publico') {
    throw new Error('JÃ¡ existe uma confirmaÃ§Ã£o para este telefone neste evento. Se precisar corrigir alguma informaÃ§Ã£o, fale com a coordenaÃ§Ã£o.');
  }

  const confirmationId = generateId('CONF');
  const proofUrl = proofFile ? `https://drive.mock/${confirmationId}/${encodeURIComponent(proofFile.name)}` : '';
  const record: ConfirmationRecord = {
    confirmacao_id: confirmationId,
    data_hora: nowIso(),
    evento_id: event.evento_id,
    nome_evento: event.nome_evento,
    data_evento: event.data_evento,
    nome_completo,
    telefone,
    tipo_participante,
    chave_pix_utilizada: tipo_participante === 'Adulto' ? event.pix_adulto : event.pix_adolescente,
    nome_arquivo_comprovante: proofFile?.name || '',
    link_comprovante: proofUrl,
    origem_registro: origin,
    registrado_por_admin: origin === 'Admin' ? 'Sim' : 'Não',
    status_confirmacao: origin === 'Admin' && !proofFile ? 'Registrado pelo Admin' : 'Confirmado',
    observacao: 'observacao' in payload ? String(payload.observacao || '').trim() : '',
    criado_em: nowIso(),
    atualizado_em: nowIso(),
  };

  state.confirmations.unshift(record);
  setMockState(state);

  return { confirmation: record, proofUrl };
}

async function handleMockAction<T>(action: string, payload?: unknown): Promise<T> {
  const state = getMockState();

  switch (action) {
    case 'setupEnvironment': {
      setMockState(state);
      return {
        success: true,
        message: 'Ambiente mock preparado com sucesso.',
      } as T;
    }
    case 'getPublicBootstrap':
      return getMockBootstrap() as T;
    case 'submitConfirmation': {
      const result = submitConfirmationLike(state, payload as SubmitConfirmationPayload, 'Publico');
      return {
        success: true,
        confirmacao_id: result.confirmation.confirmacao_id,
        message: 'ConfirmaÃ§Ã£o registrada com sucesso.',
        proofUrl: result.proofUrl,
      } as T;
    }
    case 'adminLogin': {
      const password = String((payload as { password?: string } | undefined)?.password || '');
      if (password !== MOCK_ADMIN_PASSWORD) {
        throw new Error('Senha administrativa invÃ¡lida.');
      }
      const adminToken = generateId('ADM');
      const expiresAt = Date.now() + TOKEN_TTL_MS;
      state.tokens[adminToken] = expiresAt;
      setMockState(state);
      return {
        success: true,
        adminToken,
        expiresAt: new Date(expiresAt).toISOString(),
        message: 'Login realizado com sucesso.',
      } as T;
    }
    case 'adminValidateToken': {
      const adminToken = String((payload as { adminToken?: string } | undefined)?.adminToken || '');
      const valid = Boolean(adminToken && state.tokens[adminToken] && state.tokens[adminToken] > Date.now());
      return {
        valid,
        expiresAt: valid ? new Date(state.tokens[adminToken]).toISOString() : undefined,
      } as T;
    }
    case 'adminListEvents': {
      assertAdminToken(state, String((payload as { adminToken?: string } | undefined)?.adminToken || ''));
      return { events: [...state.events].sort((a, b) => a.data_evento.localeCompare(b.data_evento)) } as T;
    }
    case 'adminSaveEvent': {
      const request = payload as AdminSaveEventPayload;
      assertAdminToken(state, request.adminToken);
      const normalized = normalizeEventInput(request);
      const eventId = request.evento_id || generateId('EVT');
      const existingIndex = state.events.findIndex((event) => event.evento_id === eventId);
      const timestamp = nowIso();
      const next: EventConfig = {
        evento_id: eventId,
        nome_evento: normalized.nome_evento,
        data_evento: normalized.data_evento,
        pix_adulto: normalized.pix_adulto,
        pix_adolescente: normalized.pix_adolescente,
        ativo: normalized.ativo,
        criado_em: existingIndex >= 0 ? state.events[existingIndex].criado_em : timestamp,
        atualizado_em: timestamp,
      };
      if (existingIndex >= 0) {
        state.events[existingIndex] = next;
      } else {
        state.events.unshift(next);
      }
      setMockState(state);
      return { success: true, event: next } as T;
    }
    case 'adminToggleEventStatus': {
      const request = payload as AdminToggleEventStatusPayload;
      assertAdminToken(state, request.adminToken);
      const event = findEvent(state, request.evento_id);
      if (!event) throw new Error('Evento Não encontrado.');
      event.ativo = event.ativo === 'Sim' ? 'Não' : 'Sim';
      event.atualizado_em = nowIso();
      setMockState(state);
      return { success: true, event } as T;
    }
    case 'adminListConfirmations': {
      const request = payload as AdminListConfirmationsPayload;
      assertAdminToken(state, request.adminToken);
      const filters = request.filters || {};
      const search = normalizeText(filters.search || '');
      const confirmations = [...state.confirmations].filter((record) => {
        if (filters.evento_id && record.evento_id !== filters.evento_id) return false;
        if (filters.tipo_participante && record.tipo_participante !== filters.tipo_participante) return false;
        if (filters.telefone && !record.telefone.includes(filters.telefone)) return false;
        if (filters.status && normalizeText(record.status_confirmacao) !== normalizeText(filters.status)) return false;
        if (search) {
          const haystack = normalizeText(`${record.nome_completo} ${record.nome_evento} ${record.telefone}`);
          return haystack.includes(search);
        }
        return true;
      });
      return { confirmations } as T;
    }
    case 'adminSubmitConfirmation': {
      const request = payload as AdminSubmitConfirmationPayload;
      assertAdminToken(state, request.adminToken);
      const result = submitConfirmationLike(state, request, 'Admin');
      if (!request.proofFile) {
        result.confirmation.status_confirmacao = 'Registrado pelo Admin';
        result.confirmation.nome_arquivo_comprovante = '';
        result.confirmation.link_comprovante = '';
      }
      setMockState(state);
      return {
        success: true,
        confirmacao_id: result.confirmation.confirmacao_id,
        message: request.proofFile ? 'ConfirmaÃ§Ã£o registrada com sucesso.' : 'Registro realizado pelo admin.',
        proofUrl: result.proofUrl,
      } as T;
    }
    default:
      throw new Error(`Action invÃ¡lida: ${action}`);
  }
}

export function isMockApiEnabled() {
  return MOCK_MODE;
}

export async function getPublicBootstrap(): Promise<PublicBootstrapData> {
  return callGas<PublicBootstrapData>('getPublicBootstrap');
}

export async function submitConfirmation(payload: SubmitConfirmationPayload) {
  return callGas<{ success: boolean; confirmacao_id: string; message: string; proofUrl: string }>('submitConfirmation', payload);
}

export async function adminLogin(password: string): Promise<AdminLoginResult> {
  return callGas<AdminLoginResult>('adminLogin', { password });
}

export async function adminValidateToken(adminToken: string): Promise<AdminValidateTokenResult> {
  return callGas<AdminValidateTokenResult>('adminValidateToken', { adminToken });
}

export async function adminListEvents(adminToken: string): Promise<AdminListEventsResult> {
  return callGas<AdminListEventsResult>('adminListEvents', { adminToken });
}

export async function adminSaveEvent(payload: AdminSaveEventPayload) {
  return callGas<{ success: boolean; event: EventConfig }>('adminSaveEvent', payload);
}

export async function adminToggleEventStatus(payload: AdminToggleEventStatusPayload) {
  return callGas<{ success: boolean; event: EventConfig }>('adminToggleEventStatus', payload);
}

export async function adminListConfirmations(payload: AdminListConfirmationsPayload): Promise<AdminListConfirmationsResult> {
  return callGas<AdminListConfirmationsResult>('adminListConfirmations', payload);
}

export async function adminSubmitConfirmation(payload: AdminSubmitConfirmationPayload) {
  return callGas<{ success: boolean; confirmacao_id: string; message: string; proofUrl: string }>('adminSubmitConfirmation', payload);
}

export async function setupEnvironment() {
  return callGas<{ success: boolean; message: string }>('setupEnvironment');
}

export function getStoredAdminToken() {
  if (!hasWindow()) return '';
  return window.sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

export function storeAdminToken(token: string) {
  if (!hasWindow()) return;
  window.sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  if (!hasWindow()) return;
  window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

// Legacy compatibility for the old app code still present in src/.
export async function fetchBootstrapData(): Promise<BootstrapData> {
  return callGas<BootstrapData>('getBootstrapData');
}

export async function submitOrder(payload: SubmitOrderPayload): Promise<SubmitOrderResult> {
  return callGas<SubmitOrderResult>('submitOrder', payload);
}

export async function fetchDashboardData(): Promise<DashboardData> {
  return callGas<DashboardData>('getDashboardData');
}

export async function markOrderDelivered(requestId: string): Promise<{ success: boolean; requestId: string; deliveredAt: string }> {
  return callGas<{ success: boolean; requestId: string; deliveredAt: string }>('markOrderDelivered', { requestId });
}

export async function markOrderStockSettled(requestId: string): Promise<MarkOrderStockSettledResult> {
  return callGas<MarkOrderStockSettledResult>('markOrderStockSettled', { requestId });
}

export async function settleReplenishment(
  requestId: string,
  ordemItem: number,
  quantidadeRecebida?: number,
): Promise<SettleReplenishmentResult> {
  return callGas<SettleReplenishmentResult>('settleReplenishment', {
    requestId,
    ordemItem,
    quantidadeRecebida,
  });
}


