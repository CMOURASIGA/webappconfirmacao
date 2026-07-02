const SPREADSHEET_ID = '1TH_aBuPEdHva6wJisAIAAPcWouyGEw4f6YF4wJrjsn4';
const EVENT_SHEET_NAME = 'evento';
const CONFIRMATION_SHEET_NAME = 'lista_de_confirmacao';
const PROOF_FOLDER_NAME = 'Comprovantes Eventos EAC';
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const TOKEN_TTL_SECONDS = 21600;

const EVENT_HEADERS = [
  'evento_id',
  'nome_evento',
  'data_evento',
  'pix_adulto',
  'pix_adolescente',
  'ativo',
  'criado_em',
  'atualizado_em',
];

const CONFIRMATION_HEADERS = [
  'confirmacao_id',
  'data_hora',
  'evento_id',
  'nome_evento',
  'data_evento',
  'nome_completo',
  'telefone',
  'tipo_participante',
  'chave_pix_utilizada',
  'nome_arquivo_comprovante',
  'link_comprovante',
  'origem_registro',
  'registrado_por_admin',
  'status_confirmacao',
  'observacao',
  'criado_em',
  'atualizado_em',
];

function doGet() {
  return jsonResponse_({
    ok: true,
    message: 'Web App ativo. Use POST com { action, payload }.',
    actions: [
      'getPublicBootstrap',
      'submitConfirmation',
      'adminLogin',
      'adminValidateToken',
      'adminListEvents',
      'adminSaveEvent',
      'adminToggleEventStatus',
      'adminListConfirmations',
      'adminSubmitConfirmation',
      'setupEnvironment',
    ],
  });
}

function doPost(e) {
  try {
    var body = parseJsonBody_(e);
    var action = String(body.action || '').trim();
    var payload = body.payload;

    if (!action) {
      return jsonResponse_({ ok: false, error: 'Parametro action obrigatorio.' });
    }

    switch (action) {
      case 'getPublicBootstrap':
        return jsonResponse_({ ok: true, data: getPublicBootstrap_() });
      case 'submitConfirmation':
        return jsonResponse_({ ok: true, data: submitConfirmation_(payload, false) });
      case 'adminLogin':
        return jsonResponse_({ ok: true, data: adminLogin_(payload) });
      case 'adminValidateToken':
        return jsonResponse_({ ok: true, data: adminValidateToken_(payload) });
      case 'adminListEvents':
        return jsonResponse_({ ok: true, data: adminListEvents_(payload) });
      case 'adminSaveEvent':
        return jsonResponse_({ ok: true, data: adminSaveEvent_(payload) });
      case 'adminToggleEventStatus':
        return jsonResponse_({ ok: true, data: adminToggleEventStatus_(payload) });
      case 'adminListConfirmations':
        return jsonResponse_({ ok: true, data: adminListConfirmations_(payload) });
      case 'adminSubmitConfirmation':
        return jsonResponse_({ ok: true, data: submitConfirmation_(payload, true) });
      case 'setupEnvironment':
        return jsonResponse_({ ok: true, data: setupEnvironment_() });
      default:
        return jsonResponse_({ ok: false, error: 'Action invalida: ' + action });
    }
  } catch (error) {
    return jsonResponse_({ ok: false, error: getErrorMessage_(error) });
  }
}

function setupEnvironment_() {
  var eventSheet = ensureSheet_(EVENT_SHEET_NAME, EVENT_HEADERS);
  var confirmationSheet = ensureSheet_(CONFIRMATION_SHEET_NAME, CONFIRMATION_HEADERS);
  ensureProofFolder_();
  return {
    success: true,
    message: 'Ambiente preparado com sucesso.',
    eventSheet: eventSheet.getName(),
    confirmationSheet: confirmationSheet.getName(),
  };
}

function getPublicBootstrap_() {
  ensureSheet_(EVENT_SHEET_NAME, EVENT_HEADERS);
  ensureSheet_(CONFIRMATION_SHEET_NAME, CONFIRMATION_HEADERS);
  var events = readEvents_().filter(function (event) {
    return event.ativo === 'Sim';
  }).sort(function (a, b) {
    return String(a.data_evento || '').localeCompare(String(b.data_evento || ''));
  });

  return {
    events: events,
    allowedExtensions: ALLOWED_EXTENSIONS.slice(),
  };
}

function adminLogin_(payload) {
  var password = String(payload && payload.password || '').trim();
  var configured = String(PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || '').trim();
  if (!configured) {
    throw new Error('ADMIN_PASSWORD nao configurada nas Script Properties.');
  }
  if (!password || password !== configured) {
    throw new Error('Senha administrativa invalida.');
  }

  var token = generateId_('ADM');
  var expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();
  CacheService.getScriptCache().put(tokenKey_(token), expiresAt, TOKEN_TTL_SECONDS);

  return {
    success: true,
    adminToken: token,
    expiresAt: expiresAt,
    message: 'Login realizado com sucesso.',
  };
}

function adminValidateToken_(payload) {
  var token = String(payload && payload.adminToken || '').trim();
  return { valid: isAdminTokenValid_(token), expiresAt: getAdminTokenExpiry_(token) };
}

function adminListEvents_(payload) {
  requireAdminToken_(payload);
  return {
    events: readEvents_().sort(function (a, b) {
      return String(a.data_evento || '').localeCompare(String(b.data_evento || ''));
    }),
  };
}

function adminSaveEvent_(payload) {
  requireAdminToken_(payload);

  var normalized = normalizeEventInput_(payload);
  var events = readEvents_();
  var now = nowIso_();
  var eventId = String(payload && payload.evento_id || '').trim() || generateId_('EVT');
  var index = -1;

  for (var i = 0; i < events.length; i++) {
    if (events[i].evento_id === eventId) {
      index = i;
      break;
    }
  }

  var existing = index >= 0 ? events[index] : null;
  var record = {
    evento_id: eventId,
    nome_evento: normalized.nome_evento,
    data_evento: normalized.data_evento,
    pix_adulto: normalized.pix_adulto,
    pix_adolescente: normalized.pix_adolescente,
    ativo: normalized.ativo,
    criado_em: existing && existing.criado_em ? existing.criado_em : now,
    atualizado_em: now,
  };

  if (index >= 0) {
    events[index] = record;
  } else {
    events.push(record);
  }

  writeEvents_(events);
  return { success: true, event: record };
}

function adminToggleEventStatus_(payload) {
  requireAdminToken_(payload);

  var eventoId = String(payload && payload.evento_id || '').trim();
  if (!eventoId) throw new Error('evento_id obrigatorio.');

  var events = readEvents_();
  var updated = null;

  for (var i = 0; i < events.length; i++) {
    if (events[i].evento_id === eventoId) {
      events[i].ativo = events[i].ativo === 'Sim' ? 'Não' : 'Sim';
      events[i].atualizado_em = nowIso_();
      updated = events[i];
      break;
    }
  }

  if (!updated) throw new Error('Evento nao encontrado.');
  writeEvents_(events);
  return { success: true, event: updated };
}

function adminListConfirmations_(payload) {
  requireAdminToken_(payload);

  var confirmationSheet = ensureSheet_(CONFIRMATION_SHEET_NAME, CONFIRMATION_HEADERS);
  var data = confirmationSheet.getDataRange().getValues();
  if (data.length < 2) {
    return { confirmations: [] };
  }

  var headers = data[0];
  var filters = payload && payload.filters ? payload.filters : {};
  var rows = data.slice(1).map(function (row) {
    return mapConfirmationRow_(headers, row);
  }).filter(function (record) {
    if (filters.evento_id && record.evento_id !== filters.evento_id) return false;
    if (filters.tipo_participante && record.tipo_participante !== filters.tipo_participante) return false;
    if (filters.telefone && String(record.telefone || '').indexOf(String(filters.telefone)) === -1) return false;
    if (filters.status && normalizeText_(record.status_confirmacao) !== normalizeText_(filters.status)) return false;
    if (filters.search) {
      var needle = normalizeText_(filters.search);
      var haystack = normalizeText_([record.nome_completo, record.nome_evento, record.telefone].join(' '));
      return haystack.indexOf(needle) > -1;
    }
    return true;
  });

  rows.sort(function (a, b) {
    return String(b.data_hora || '').localeCompare(String(a.data_hora || ''));
  });

  return { confirmations: rows };
}

function submitConfirmation_(payload, isAdmin) {
  var normalized = normalizeConfirmationInput_(payload, isAdmin);
  var event = findEventById_(normalized.evento_id);
  if (!event) {
    throw new Error('Evento nao encontrado.');
  }
  if (event.ativo !== 'Sim') {
    throw new Error('O evento escolhido esta inativo.');
  }

  var confirmationSheet = ensureSheet_(CONFIRMATION_SHEET_NAME, CONFIRMATION_HEADERS);
  var existingDuplicate = findDuplicateConfirmation_(confirmationSheet, normalized.evento_id, normalized.telefone);
  if (existingDuplicate && !isAdmin) {
    throw new Error('Ja existe uma confirmacao para este telefone neste evento. Se precisar corrigir alguma informacao, fale com a coordenacao.');
  }

  var proofInfo = null;
  if (normalized.proofFile) {
    proofInfo = saveProofFile_(normalized.proofFile, normalized.evento_id, normalized.nome_completo);
  }

  var confirmationId = generateId_('CONF');
  var now = nowIso_();
  var record = {
    confirmacao_id: confirmationId,
    data_hora: now,
    evento_id: event.evento_id,
    nome_evento: event.nome_evento,
    data_evento: event.data_evento,
    nome_completo: normalized.nome_completo,
    telefone: normalized.telefone,
    tipo_participante: normalized.tipo_participante,
    chave_pix_utilizada: normalized.tipo_participante === 'Adulto' ? event.pix_adulto : event.pix_adolescente,
    nome_arquivo_comprovante: proofInfo ? proofInfo.name : '',
    link_comprovante: proofInfo ? proofInfo.url : '',
    origem_registro: isAdmin ? 'Admin' : 'Publico',
    registrado_por_admin: isAdmin ? 'Sim' : 'Não',
    status_confirmacao: isAdmin && !proofInfo ? 'Registrado pelo Admin' : 'Confirmado',
    observacao: normalized.observacao,
    criado_em: now,
    atualizado_em: now,
  };

  appendConfirmationRow_(confirmationSheet, record);

  return {
    success: true,
    confirmacao_id: confirmationId,
    message: isAdmin && !proofInfo ? 'Registro realizado pelo admin.' : 'Confirmação registrada com sucesso.',
    proofUrl: proofInfo ? proofInfo.url : '',
  };
}

function normalizeEventInput_(payload) {
  var nome_evento = String(payload && payload.nome_evento || '').trim().replace(/\s+/g, ' ');
  var data_evento = String(payload && payload.data_evento || '').trim();
  var pix_adulto = String(payload && payload.pix_adulto || '').trim();
  var pix_adolescente = String(payload && payload.pix_adolescente || '').trim();
  var ativo = String(payload && payload.ativo || 'Sim').trim() === 'Não' ? 'Não' : 'Sim';

  if (!nome_evento) throw new Error('Informe o nome do evento.');
  if (!data_evento) throw new Error('Informe a data do evento.');
  if (!pix_adulto) throw new Error('Informe a chave PIX do adulto.');
  if (!pix_adolescente) throw new Error('Informe a chave PIX do adolescente.');

  return {
    nome_evento: nome_evento,
    data_evento: data_evento,
    pix_adulto: pix_adulto,
    pix_adolescente: pix_adolescente,
    ativo: ativo,
  };
}

function normalizeConfirmationInput_(payload, isAdmin) {
  var evento_id = String(payload && payload.evento_id || '').trim();
  var nome_completo = String(payload && payload.nome_completo || payload && payload.nomeCompleto || '').trim().replace(/\s+/g, ' ');
  var telefone = String(payload && payload.telefone || '').replace(/\D/g, '');
  var tipo_participante = String(payload && payload.tipo_participante || '').trim();
  var observacao = String(payload && payload.observacao || '').trim();
  var proofFile = payload && payload.proofFile ? payload.proofFile : null;

  if (!evento_id) throw new Error('evento_id obrigatorio.');
  if (!nome_completo || nome_completo.split(' ').filter(Boolean).length < 2) {
    throw new Error('Informe o nome completo com pelo menos duas palavras.');
  }
  if (!/^55\d{10,11}$/.test(telefone)) {
    throw new Error('Informe o telefone no formato 55DDXXXXXXXXX. Exemplo: 5521999999999.');
  }
  if (tipo_participante !== 'Adulto' && tipo_participante !== 'Adolescente') {
    throw new Error('Tipo de participante invalido.');
  }
  if (proofFile) {
    validateProofFile_(proofFile);
  }

  return {
    evento_id: evento_id,
    nome_completo: nome_completo,
    telefone: telefone,
    tipo_participante: tipo_participante,
    observacao: observacao,
    proofFile: proofFile,
    isAdmin: isAdmin,
  };
}

function validateProofFile_(proofFile) {
  var fileName = String(proofFile.name || '').trim();
  var extension = getFileExtension_(fileName);
  var size = Number(proofFile.size) || 0;
  if (ALLOWED_EXTENSIONS.indexOf(extension) < 0) {
    throw new Error('Arquivo invalido. Envie PDF, JPG, JPEG ou PNG.');
  }
  if (size > MAX_FILE_SIZE_BYTES) {
    throw new Error('O comprovante excede o limite de 10 MB.');
  }
}

function saveProofFile_(proofFile, confirmationId, nomeCompleto) {
  var folder = ensureProofFolder_();
  validateProofFile_(proofFile);
  var extension = getFileExtension_(String(proofFile.name || ''));
  var normalizedName = normalizeFileName_(nomeCompleto || 'PARTICIPANTE');
  var fileName = 'CONFIRMACAO_EVENTO_' + confirmationId + '_' + normalizedName + '.' + extension;
  var bytes = Utilities.base64Decode(String(proofFile.base64 || ''));
  var blob = Utilities.newBlob(bytes, getMimeTypeFromExtension_(extension), fileName);
  var file = folder.createFile(blob).setName(fileName);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (error) {
    // Keep default permissions if link sharing is restricted.
  }
  return {
    name: fileName,
    url: file.getUrl(),
  };
}

function appendConfirmationRow_(sheet, record) {
  sheet.appendRow([
    record.confirmacao_id,
    record.data_hora,
    record.evento_id,
    record.nome_evento,
    record.data_evento,
    record.nome_completo,
    record.telefone,
    record.tipo_participante,
    record.chave_pix_utilizada,
    record.nome_arquivo_comprovante,
    record.link_comprovante,
    record.origem_registro,
    record.registrado_por_admin,
    record.status_confirmacao,
    record.observacao,
    record.criado_em,
    record.atualizado_em,
  ]);
}

function readEvents_() {
  var sheet = ensureSheet_(EVENT_SHEET_NAME, EVENT_HEADERS);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function (row) {
    return mapEventRow_(headers, row);
  }).filter(function (event) {
    return Boolean(event.evento_id);
  });
}

function writeEvents_(events) {
  var sheet = ensureSheet_(EVENT_SHEET_NAME, EVENT_HEADERS);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, EVENT_HEADERS.length).setValues([EVENT_HEADERS]);
  if (!events.length) return;
  var rows = events.map(function (event) {
    return [
      event.evento_id,
      event.nome_evento,
      event.data_evento,
      event.pix_adulto,
      event.pix_adolescente,
      event.ativo,
      event.criado_em,
      event.atualizado_em,
    ];
  });
  sheet.getRange(2, 1, rows.length, EVENT_HEADERS.length).setValues(rows);
}

function mapEventRow_(headers, row) {
  return {
    evento_id: getByHeader_(headers, row, 'evento_id'),
    nome_evento: getByHeader_(headers, row, 'nome_evento'),
    data_evento: getByHeader_(headers, row, 'data_evento'),
    pix_adulto: getByHeader_(headers, row, 'pix_adulto'),
    pix_adolescente: getByHeader_(headers, row, 'pix_adolescente'),
    ativo: normalizeText_(getByHeader_(headers, row, 'ativo')) === 'Não' ? 'Não' : 'Sim',
    criado_em: getByHeader_(headers, row, 'criado_em'),
    atualizado_em: getByHeader_(headers, row, 'atualizado_em'),
  };
}

function mapConfirmationRow_(headers, row) {
  return {
    confirmacao_id: getByHeader_(headers, row, 'confirmacao_id'),
    data_hora: getByHeader_(headers, row, 'data_hora'),
    evento_id: getByHeader_(headers, row, 'evento_id'),
    nome_evento: getByHeader_(headers, row, 'nome_evento'),
    data_evento: getByHeader_(headers, row, 'data_evento'),
    nome_completo: getByHeader_(headers, row, 'nome_completo'),
    telefone: getByHeader_(headers, row, 'telefone'),
    tipo_participante: getByHeader_(headers, row, 'tipo_participante'),
    chave_pix_utilizada: getByHeader_(headers, row, 'chave_pix_utilizada'),
    nome_arquivo_comprovante: getByHeader_(headers, row, 'nome_arquivo_comprovante'),
    link_comprovante: getByHeader_(headers, row, 'link_comprovante'),
    origem_registro: getByHeader_(headers, row, 'origem_registro'),
    registrado_por_admin: getByHeader_(headers, row, 'registrado_por_admin'),
    status_confirmacao: getByHeader_(headers, row, 'status_confirmacao'),
    observacao: getByHeader_(headers, row, 'observacao'),
    criado_em: getByHeader_(headers, row, 'criado_em'),
    atualizado_em: getByHeader_(headers, row, 'atualizado_em'),
  };
}

function findEventById_(eventoId) {
  var events = readEvents_();
  for (var i = 0; i < events.length; i++) {
    if (events[i].evento_id === eventoId) {
      return events[i];
    }
  }
  return null;
}

function findDuplicateConfirmation_(sheet, eventoId, telefone) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;
  var headers = data[0];
  var idxEvento = getHeaderIndex_(headers, 'evento_id');
  var idxTelefone = getHeaderIndex_(headers, 'telefone');
  if (idxEvento < 0 || idxTelefone < 0) return null;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idxEvento] || '').trim() === eventoId && String(data[i][idxTelefone] || '').trim() === telefone) {
      return mapConfirmationRow_(headers, data[i]);
    }
  }
  return null;
}

function requireAdminToken_(payload) {
  var token = String(payload && payload.adminToken || '').trim();
  if (!isAdminTokenValid_(token)) {
    throw new Error('Token admin invalido ou expirado.');
  }
}

function isAdminTokenValid_(token) {
  if (!token) return false;
  return Boolean(CacheService.getScriptCache().get(tokenKey_(token)));
}

function getAdminTokenExpiry_(token) {
  if (!token) return null;
  return CacheService.getScriptCache().get(tokenKey_(token));
}

function tokenKey_(token) {
  return 'admin-token:' + token;
}

function ensureSheet_(name, headers) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (headers && headers.length) {
    ensureHeaders_(sheet, headers);
  }
  return sheet;
}

function ensureHeaders_(sheet, headers) {
  var lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return;
  }

  var currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var changed = false;
  for (var i = 0; i < headers.length; i++) {
    if (currentHeaders.indexOf(headers[i]) === -1) {
      currentHeaders.push(headers[i]);
      changed = true;
    }
  }
  if (changed) {
    sheet.getRange(1, 1, 1, currentHeaders.length).setValues([currentHeaders]);
  }
}

function ensureProofFolder_() {
  var folders = DriveApp.getFoldersByName(PROOF_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(PROOF_FOLDER_NAME);
}

function getHeaderIndex_(headers, name) {
  var normalized = normalizeText_(name);
  for (var i = 0; i < headers.length; i++) {
    if (normalizeText_(headers[i]) === normalized) {
      return i;
    }
  }
  return -1;
}

function getByHeader_(headers, row, name) {
  var index = getHeaderIndex_(headers, name);
  return index >= 0 ? row[index] : '';
}

function parseJsonBody_(e) {
  var raw = e && e.postData && e.postData.contents ? String(e.postData.contents) : '';
  if (!raw) return {};
  return JSON.parse(raw);
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getErrorMessage_(error) {
  if (!error) return 'Erro inesperado.';
  if (typeof error === 'string') return error;
  return error && error.message ? String(error.message) : String(error);
}

function nowIso_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function generateId_(prefix) {
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
  var rand = Math.floor(Math.random() * 9000 + 1000);
  return prefix + '-' + stamp + '-' + rand;
}

function normalizeText_(value) {
  return String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function normalizeFileName_(value) {
  return String(value || 'PARTICIPANTE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function getFileExtension_(name) {
  var parts = String(name || '').toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function getMimeTypeFromExtension_(extension) {
  var map = {
    pdf: MimeType.PDF,
    jpg: MimeType.JPEG,
    jpeg: MimeType.JPEG,
    png: MimeType.PNG,
  };
  return map[extension] || MimeType.PLAIN_TEXT;
}

