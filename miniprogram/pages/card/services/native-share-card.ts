import { normalizeCardTheme, type CardTheme } from './card-theme-preference';

export const NATIVE_SHARE_CARD_WIDTH = 600;
export const NATIVE_SHARE_CARD_HEIGHT = 480;

const MAX_SHARE_LABELS = 5;
const MAX_SHARE_LABEL_LENGTH = 10;

export interface NativeShareCardInput {
  readonly displayName?: unknown;
  readonly headline?: unknown;
  readonly biography?: unknown;
  readonly labels?: unknown;
  readonly phone?: unknown;
  readonly email?: unknown;
  readonly demoMode?: unknown;
  readonly theme?: unknown;
}

export interface NativeShareCardContent {
  readonly displayName: string;
  readonly headline: string;
  readonly biography: string;
  readonly labels: readonly string[];
  readonly phone: string;
  readonly email: string;
  readonly demoMode: boolean;
  readonly theme: CardTheme;
}

interface NativeSharePalette {
  readonly paper: readonly [string, string, string];
  readonly ink: string;
  readonly muted: string;
  readonly accent: string;
  readonly line: string;
}

const SHARE_PALETTES: Readonly<Record<CardTheme, NativeSharePalette>> = {
  ivory: { paper: ['#FBF8F1', '#F7F1E7', '#EEE3D1'], ink: '#211E1A', muted: '#514B44', accent: '#80602D', line: '#C5AD7C' },
  ink: { paper: ['#29251F', '#211E1A', '#1C1A17'], ink: '#FFFAF0', muted: '#C8C0B4', accent: '#E5D4B2', line: '#AA8448' },
  champagne: { paper: ['#F5EAD5', '#EFE2C7', '#E4D1AA'], ink: '#211E1A', muted: '#5C554B', accent: '#6D501F', line: '#B49B65' },
  stone: { paper: ['#E0DCD4', '#D8D3CA', '#C8C1B5'], ink: '#211E1A', muted: '#514C45', accent: '#65491F', line: '#A39170' },
};

export function resolveNativeShareCardPalette(theme: unknown): NativeSharePalette {
  return SHARE_PALETTES[normalizeCardTheme(theme)];
}

/** Export the existing personal share design from a page's hidden 2D canvas. */
export async function prepareNativeShareCardCover(
  page: WechatMiniprogram.Page.TrivialInstance | WechatMiniprogram.Component.TrivialInstance,
  input: NativeShareCardInput,
  selector: string = '#nativeCardShareCover',
): Promise<string | undefined> {
  let active = true;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      renderNativeShareCardCover(page, input, selector, () => active),
      new Promise<undefined>((resolve) => {
        deadline = setTimeout(() => { active = false; resolve(undefined); }, 1500);
      }),
    ]);
  } finally {
    active = false;
    if (deadline !== undefined) clearTimeout(deadline);
  }
}

async function renderNativeShareCardCover(
  page: WechatMiniprogram.Page.TrivialInstance | WechatMiniprogram.Component.TrivialInstance,
  input: NativeShareCardInput,
  selector: string,
  isCurrent: () => boolean,
): Promise<string | undefined> {
  if (typeof wx.createSelectorQuery !== 'function' || typeof wx.canvasToTempFilePath !== 'function') return undefined;
  try {
    if (typeof wx.nextTick === 'function') await new Promise<void>((resolve) => wx.nextTick(resolve));
    if (!isCurrent()) return undefined;
    const canvas = await new Promise<WechatMiniprogram.Canvas | undefined>((resolve) => {
      wx.createSelectorQuery().in(page).select(selector)
        .node((result) => resolve(result?.node as WechatMiniprogram.Canvas | undefined)).exec();
    });
    if (!canvas || !isCurrent()) return undefined;
    drawNativeShareCard(canvas, input);
    return await new Promise<string | undefined>((resolve) => {
      wx.canvasToTempFilePath({
        canvas,
        width: NATIVE_SHARE_CARD_WIDTH,
        height: NATIVE_SHARE_CARD_HEIGHT,
        destWidth: NATIVE_SHARE_CARD_WIDTH * 2,
        destHeight: NATIVE_SHARE_CARD_HEIGHT * 2,
        fileType: 'png',
        success: (result) => resolve(result.tempFilePath),
        fail: () => resolve(undefined),
      }, page);
    });
  } catch (_error) {
    return undefined;
  }
}

type CanvasContext = WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D;

interface WindowMetricsApi {
  readonly getWindowInfo?: () => { readonly pixelRatio?: number };
  readonly getSystemInfoSync?: () => { readonly pixelRatio?: number };
}

function readPixelRatio(read: (() => { readonly pixelRatio?: number }) | undefined): number | undefined {
  if (typeof read !== 'function') return undefined;
  try {
    const value = read().pixelRatio;
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

export function resolveNativeShareCardPixelRatio(api: WindowMetricsApi = wx): number {
  const pixelRatio = readPixelRatio(api.getWindowInfo?.bind(api))
    ?? readPixelRatio(api.getSystemInfoSync?.bind(api))
    ?? 1;
  return Math.max(1, Math.min(3, pixelRatio));
}

function compactText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return Array.from(value.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim())
    .slice(0, maxLength)
    .join('');
}

function normalizePhone(value: unknown): string {
  const phone = compactText(value, 24);
  return /^\+?[0-9](?:[0-9 ()-]*[0-9])$/.test(phone) && phone.length >= 6 ? phone : '';
}

function normalizeEmail(value: unknown): string {
  const email = compactText(value, 72);
  if (!email || /\s/.test(email)) return '';
  const parts = email.split('@');
  return parts.length === 2 && parts[0] && /^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(parts[1] ?? '')
    ? email
    : '';
}

function normalizeLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const label = compactText(entry, MAX_SHARE_LABEL_LENGTH);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
    if (labels.length === MAX_SHARE_LABELS) break;
  }
  return labels;
}

export function normalizeNativeShareCard(input: NativeShareCardInput): NativeShareCardContent {
  return {
    displayName: compactText(input.displayName, 12) || 'AB Club 会员',
    headline: compactText(input.headline, 42),
    biography: compactText(input.biography, 110),
    labels: normalizeLabels(input.labels),
    phone: normalizePhone(input.phone),
    email: normalizeEmail(input.email),
    demoMode: input.demoMode === true,
    theme: normalizeCardTheme(input.theme),
  };
}

function wrapText(
  context: CanvasContext,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  if (!text) return [];
  const result: string[] = [];
  let current = '';
  const characters = Array.from(text);
  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index] ?? '';
    const candidate = `${current}${character}`;
    if (!current || context.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    result.push(current);
    current = character;
    if (result.length === maxLines) break;
  }
  if (result.length < maxLines && current) result.push(current);
  if (result.length === maxLines && result.join('').length < characters.length) {
    const last = result[maxLines - 1] ?? '';
    result[maxLines - 1] = `${Array.from(last).slice(0, Math.max(1, Array.from(last).length - 1)).join('')}…`;
  }
  return result;
}

function drawVerticalName(context: CanvasContext, name: string, ink: string): void {
  const raw = Array.from(name);
  const characters = raw.length > 6 ? [...raw.slice(0, 5), '…'] : raw;
  const spacing = characters.length <= 4 ? 47 : 42;
  const startY = 126;
  context.save();
  context.fillStyle = ink;
  context.font = '600 32px serif';
  context.textAlign = 'center';
  characters.forEach((character, index) => {
    context.fillText(character, 65, startY + index * spacing);
  });
  context.restore();
}

function drawLabelRows(context: CanvasContext, labels: readonly string[], startY: number, palette: NativeSharePalette): number {
  if (labels.length === 0) return startY;
  let x = 148;
  let y = startY;
  context.font = '500 15px sans-serif';
  for (const label of labels) {
    const width = Math.min(132, Math.ceil(context.measureText(label).width) + 24);
    if (x + width > 566) {
      x = 148;
      y += 38;
    }
    context.strokeStyle = palette.line;
    context.lineWidth = 1;
    context.strokeRect(x, y - 21, width, 29);
    context.fillStyle = palette.accent;
    context.fillText(label, x + 12, y);
    x += width + 10;
  }
  return y + 34;
}

export function drawNativeShareCard(
  canvas: WechatMiniprogram.Canvas,
  input: NativeShareCardInput,
): NativeShareCardContent {
  const content = normalizeNativeShareCard(input);
  const palette = resolveNativeShareCardPalette(content.theme);
  const pixelRatio = resolveNativeShareCardPixelRatio();
  canvas.width = NATIVE_SHARE_CARD_WIDTH * pixelRatio;
  canvas.height = NATIVE_SHARE_CARD_HEIGHT * pixelRatio;
  const context = canvas.getContext('2d');
  context.scale(pixelRatio, pixelRatio);

  const paper = context.createLinearGradient(0, 0, NATIVE_SHARE_CARD_WIDTH, NATIVE_SHARE_CARD_HEIGHT);
  paper.addColorStop(0, palette.paper[0]);
  paper.addColorStop(0.58, palette.paper[1]);
  paper.addColorStop(1, palette.paper[2]);
  context.fillStyle = paper;
  context.fillRect(0, 0, NATIVE_SHARE_CARD_WIDTH, NATIVE_SHARE_CARD_HEIGHT);

  context.strokeStyle = palette.line;
  context.lineWidth = 1;
  context.strokeRect(18.5, 18.5, 563, 443);

  context.fillStyle = palette.accent;
  context.font = '600 14px serif';
  context.fillText('AB CLUB', 34, 48);
  context.fillStyle = palette.muted;
  context.font = '400 10px sans-serif';
  context.fillText('GLOBAL CHINESE COMMUNITY', 34, 65);
  if (content.demoMode) {
    context.textAlign = 'right';
    context.fillStyle = palette.accent;
    context.font = '500 10px sans-serif';
    context.fillText('演示名片', 564, 49);
    context.textAlign = 'left';
  }

  drawVerticalName(context, content.displayName, palette.ink);
  context.strokeStyle = palette.accent;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(112.5, 102);
  context.lineTo(112.5, 399);
  context.stroke();

  context.fillStyle = palette.ink;
  context.font = '600 25px serif';
  const headlineLines = wrapText(context, content.headline, 410, 2);
  headlineLines.forEach((line, index) => {
    context.fillText(line, 148, 137 + index * 31);
  });

  const labelStartY = headlineLines.length > 1 ? 205 : 181;
  const nextSectionY = drawLabelRows(context, content.labels, labelStartY, palette);
  context.fillStyle = palette.muted;
  context.font = '400 16px sans-serif';
  wrapText(context, content.biography, 410, 4).forEach((line, index) => {
    context.fillText(line, 148, nextSectionY + 29 + index * 25);
  });

  const contactLines = [
    content.phone ? `TEL  ${content.phone}` : '',
    content.email ? `MAIL  ${content.email}` : '',
  ].filter(Boolean);
  if (contactLines.length > 0) {
    context.fillStyle = palette.muted;
    context.font = '400 13px sans-serif';
    contactLines.slice(0, 2).forEach((line, index) => context.fillText(line, 148, 402 + index * 20));
  }

  context.fillStyle = palette.line;
  context.fillRect(34, 436, 532, 1);
  return content;
}
