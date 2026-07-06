export interface StockOptionRow {
  tamanho: string;
  cor: string;
  quantidade: number;
  reserva: number;
  disponivel: number;
}

export interface BootstrapData {
  logoUrl: string;
  instagramUrl: string;
  allowedExtensions: string[];
  stockOptions: {
    colors: string[];
    specificReserveColors?: string[];
    rows: StockOptionRow[];
  };
}

export interface SubmitOrderItem {
  tamanho: string;
  cor: string;
  quantidade: number;
  aceitaTamanhoAlternativo: boolean;
  aceitaOutraCor: boolean;
}

export interface SubmitOrderPayload {
  nomeCompleto: string;
  email: string;
  equipe: string;
  items: SubmitOrderItem[];
  proofFile: {
    name: string;
    type: string;
    size: number;
    base64: string;
  };
}

export interface SubmitOrderResult {
  success: boolean;
  requestId: string;
  statusGeral: string;
  observacaoGeral: string;
  proofUrl: string;
  message: string;
}

export interface DashboardRow {
  tamanho: string;
  cor: string;
  quantidade: number;
  reserva: number;
  disponivel: number;
  solicitacoes: number;
  reservados: number;
  alternativas: number;
  reposicoes: number;
  controlaSaldo?: boolean;
}

export interface DashboardOrderItem {
  ordemItem: number;
  tamanho: string;
  cor: string;
  quantidadeSolicitada: number;
  quantidadeAtendida: number;
  statusItem: string;
  alternativaSugerida: string;
  statusEntregaItem?: string;
  entregueItemEm?: string;
  statusBaixaItem?: string;
  baixaItemEm?: string;
}

export interface SettleReplenishmentResult {
  success: boolean;
  requestId: string;
  ordemItem: number;
  statusItem: string;
  quantidadeRecebida: number;
  estoqueAtualizado: {
    tamanho: string;
    cor: string;
    quantidade: number;
    disponivel: number;
  };
  updatedAt: string;
}

export interface DashboardOrder {
  requestId: string;
  dataHora: string;
  nomeCompleto: string;
  email: string;
  equipe: string;
  resumoPedido: string;
  statusGeral: string;
  statusEntrega: string;
  entregueEm: string;
  statusBaixaEstoque?: string;
  baixaEstoqueEm?: string;
  items: DashboardOrderItem[];
}

export interface DashboardData {
  logoUrl: string;
  instagramUrl: string;
  atualizadoEm: string;
  indicadores: {
    totalFisico: number;
    totalReserva: number;
    totalDisponivel: number;
    totalDisponivelReal: number;
    totalDisponivelGap: number;
    totalBrancaDisponivel: number;
    totalPretaDisponivel: number;
    totalAzulDisponivel: number;
    totalReservados: number;
    totalAlternativa: number;
    totalReposicao: number;
    totalCamisasAEntregar: number;
    totalCamisasEntregues: number;
    totalCamisasPendentesEntrega: number;
  };
  tabelaGerencial: DashboardRow[];
  pedidos: DashboardOrder[];
}

export interface MarkOrderStockSettledResult {
  success: boolean;
  requestId: string;
  stockSettledAt: string;
}

export interface EventConfig {
  evento_id: string;
  nome_evento: string;
  data_evento: string;
  pix_adulto: string;
  pix_adolescente: string;
  ativo: 'Sim' | 'Não';
  criado_em?: string;
  atualizado_em?: string;
}

export interface PublicBootstrapData {
  events: EventConfig[];
  allowedExtensions: string[];
}

export interface ProofFilePayload {
  name: string;
  type: string;
  size: number;
  base64: string;
}

export interface ConfirmationParticipantPayload {
  nome_completo: string;
  tipo_participante: 'Adulto' | 'Adolescente';
}

export interface SubmitConfirmationPayload {
  evento_id: string;
  nome_completo: string;
  telefone: string;
  tipo_participante: 'Adulto' | 'Adolescente';
  participants?: ConfirmationParticipantPayload[];
  proofFile?: ProofFilePayload | null;
}

export interface AdminSubmitConfirmationPayload {
  adminToken: string;
  evento_id: string;
  nome_completo: string;
  telefone: string;
  tipo_participante: 'Adulto' | 'Adolescente';
  observacao?: string;
  proofFile?: ProofFilePayload | null;
}

export interface AdminSaveEventPayload {
  adminToken: string;
  evento_id?: string;
  nome_evento: string;
  data_evento: string;
  pix_adulto: string;
  pix_adolescente: string;
  ativo: 'Sim' | 'Não';
}

export interface AdminToggleEventStatusPayload {
  adminToken: string;
  evento_id: string;
}

export interface ConfirmationRecord {
  confirmacao_id: string;
  data_hora: string;
  evento_id: string;
  nome_evento: string;
  data_evento: string;
  nome_completo: string;
  telefone: string;
  tipo_participante: 'Adulto' | 'Adolescente';
  chave_pix_utilizada: string;
  nome_arquivo_comprovante?: string;
  link_comprovante?: string;
  origem_registro: 'Publico' | 'Admin';
  registrado_por_admin: 'Sim' | 'Não';
  status_confirmacao: 'Confirmado' | 'Registrado pelo Admin' | 'Pendente de Comprovante';
  observacao?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface AdminListConfirmationsPayload {
  adminToken: string;
  filters?: {
    evento_id?: string;
    tipo_participante?: 'Adulto' | 'Adolescente' | '';
    search?: string;
    telefone?: string;
    status?: string;
  };
}

export interface AdminLoginResult {
  success: boolean;
  adminToken: string;
  expiresAt: string;
  message: string;
}

export interface AdminValidateTokenResult {
  valid: boolean;
  expiresAt?: string;
}

export interface AdminListEventsResult {
  events: EventConfig[];
}

export interface AdminListConfirmationsResult {
  confirmations: ConfirmationRecord[];
}

