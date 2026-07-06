export function trimAndCollapseSpaces(value: string) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function countWords(value: string) {
  return trimAndCollapseSpaces(value).split(' ').filter(Boolean).length;
}

export function normalizePhoneInput(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  if (/^\d{10,11}$/.test(digits) && !digits.startsWith('55')) {
    return `55${digits}`;
  }
  return digits;
}

export function isValidPhone(value: string) {
  return /^55\d{10,11}$/.test(value);
}

function formatDateFromIsoParts(value: string) {
  const text = String(value || '').trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  }

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (iso) {
    return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }

  return text;
}

export function formatDate(value?: string) {
  if (!value) return '-';
  return formatDateFromIsoParts(String(value));
}

export function formatDateTime(value?: string) {
  if (!value) return '-';
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (iso) {
    return `${iso[3]}/${iso[2]}/${iso[1]} ${iso[4]}:${iso[5]}`;
  }

  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]} 00:00`;
  }

  return text;
}

export async function fileToBase64(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const [, base64] = result.split(',');
      if (!base64) {
        reject(new Error('Nao foi possivel ler o arquivo.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Falha ao processar o arquivo.'));
    reader.readAsDataURL(file);
  });
}

export async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const input = document.createElement('textarea');
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
}

type ConfirmationImageData = {
  confirmacaoId: string;
  nomeEvento: string;
  dataEvento: string;
  nomeCompleto: string;
  telefone: string;
  tipoParticipante: string;
  proofUrl?: string;
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = String(text || '').split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const testLine = current ? `${current} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = testLine;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export async function downloadConfirmationImage(data: ConfirmationImageData) {
  if (typeof document === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Nao foi possivel gerar a imagem da confirmação.');
  }

  const bg = ctx.createLinearGradient(0, 0, 1080, 1350);
  bg.addColorStop(0, '#0b4f7a');
  bg.addColorStop(0.55, '#083654');
  bg.addColorStop(1, '#f5f7fb');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1350);

  ctx.fillStyle = 'rgba(11, 79, 122, 0.14)';
  ctx.beginPath();
  ctx.arc(120, 140, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
  ctx.beginPath();
  ctx.arc(980, 170, 220, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  drawRoundedRect(ctx, 80, 90, 920, 1170, 36);
  ctx.fill();

  ctx.fillStyle = '#083654';
  ctx.font = '700 26px sans-serif';
  ctx.fillText('Confirmação registrada', 120, 170);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 22px sans-serif';
  ctx.fillText('Use esta imagem para compartilhar a confirmação.', 120, 210);

  ctx.fillStyle = '#f8fafc';
  drawRoundedRect(ctx, 120, 260, 840, 220, 28);
  ctx.fill();

  ctx.fillStyle = '#083654';
  ctx.font = '700 20px sans-serif';
  ctx.fillText('ID da confirmação', 150, 315);
  ctx.font = '800 34px sans-serif';
  ctx.fillText(data.confirmacaoId, 150, 365);

  ctx.fillStyle = '#475569';
  ctx.font = '600 24px sans-serif';
  const eventLines = wrapText(ctx, `Evento: ${data.nomeEvento}`, 760);
  eventLines.forEach((line, index) => ctx.fillText(line, 150, 430 + index * 32));
  ctx.fillText(`Data: ${data.dataEvento}`, 150, 502);

  ctx.fillStyle = '#f8fafc';
  drawRoundedRect(ctx, 120, 530, 840, 290, 28);
  ctx.fill();

  ctx.fillStyle = '#083654';
  ctx.font = '700 22px sans-serif';
  ctx.fillText('Dados do participante', 150, 585);

  ctx.font = '600 24px sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(`Nome: ${data.nomeCompleto}`, 150, 635);
  ctx.fillText(`Telefone: ${data.telefone}`, 150, 680);
  ctx.fillText(`Tipo: ${data.tipoParticipante}`, 150, 725);

  ctx.fillStyle = '#083654';
  ctx.font = '700 20px sans-serif';
  ctx.fillText('Orientação', 120, 910);

  ctx.fillStyle = '#475569';
  ctx.font = '500 22px sans-serif';
  const lines = wrapText(
    ctx,
    data.proofUrl
      ? 'Salve esta imagem no seu celular e compartilhe pelos meios que desejar. O comprovante também foi registrado no sistema.'
      : 'Salve esta imagem no seu celular e compartilhe pelos meios que desejar.',
    840,
  );
  lines.forEach((line, index) => ctx.fillText(line, 120, 955 + index * 30));

  if (data.proofUrl) {
    ctx.fillStyle = '#e2e8f0';
    drawRoundedRect(ctx, 120, 1030, 840, 110, 22);
    ctx.fill();
    ctx.fillStyle = '#475569';
    ctx.font = '600 18px sans-serif';
    ctx.fillText('Link do comprovante registrado no sistema:', 150, 1070);
    ctx.font = '500 16px sans-serif';
    const proofLines = wrapText(ctx, data.proofUrl, 780);
    proofLines.forEach((line, index) => ctx.fillText(line, 150, 1095 + index * 22));
  }

  ctx.fillStyle = '#0b4f7a';
  ctx.beginPath();
  ctx.arc(905, 165, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(890, 165);
  ctx.lineTo(900, 177);
  ctx.lineTo(922, 150);
  ctx.stroke();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error('Nao foi possivel gerar a imagem da confirmação.'));
        return;
      }
      resolve(result);
    }, 'image/png');
  });

  const fileName = `confirmacao_${data.confirmacaoId}.png`;
  const file = new File([blob], fileName, { type: 'image/png' });

  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    await navigator.share({
      files: [file],
      title: 'Confirmação registrada',
      text: 'Imagem da confirmação para compartilhar.',
    });
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}


