import { normalizeCardTheme } from './card-theme-preference';

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

export interface NativeShareCardPalette {
  readonly paper: readonly [string, string, string];
  readonly ink: string;
  readonly muted: string;
  readonly accent: string;
  readonly line: string;
}

export function resolveNativeShareCardPalette(theme: unknown): NativeShareCardPalette {
  switch (normalizeCardTheme(theme)) {
    case 'ink': return { paper: ['#494138', '#3D3730', '#39342E'], ink: '#FFF8EB', muted: '#DBD0BE', accent: '#E2CAA0', line: '#9B8766' };
    case 'champagne': return { paper: ['#FAF4E7', '#F4EAD6', '#EDE0C5'], ink: '#332C23', muted: '#625747', accent: '#73542D', line: '#BFA67C' };
    case 'stone': return { paper: ['#F2EFE9', '#EAE5DD', '#E0D9CD'], ink: '#34312B', muted: '#635E54', accent: '#68593E', line: '#B9AC96' };
    default: return { paper: ['#FFFDF7', '#F8F4EB', '#EEE6D6'], ink: '#332D25', muted: '#6B6153', accent: '#7B5C30', line: '#C5AF86' };
  }
}

/** Fine double rules and symmetrical corners; no decorative text competes with the person. */
export function drawClassicalShareFrame(
  context: CanvasContext, width: number, height: number, palette: NativeShareCardPalette,
): void {
  context.save();
  context.strokeStyle = palette.line;
  context.lineWidth = 0.8;
  context.strokeRect(18.5, 18.5, width - 37, height - 37);
  context.lineWidth = 0.4;
  context.strokeRect(24.5, 24.5, width - 49, height - 49);
  for (const [x, y, dx, dy] of [[32, 32, 1, 1], [width - 32, 32, -1, 1], [32, height - 32, 1, -1], [width - 32, height - 32, -1, -1]] as const) {
    context.beginPath();
    context.moveTo(x, y + dy * 19);
    context.lineTo(x, y);
    context.lineTo(x + dx * 35, y);
    context.moveTo(x + dx * 5, y + dy * 24);
    context.lineTo(x + dx * 5, y + dy * 5);
    context.lineTo(x + dx * 40, y + dy * 5);
    context.stroke();
  }
  const center = width / 2;
  const y = height - 40;
  context.beginPath();
  context.moveTo(center - 70, y);
  context.lineTo(center - 12, y);
  context.moveTo(center + 12, y);
  context.lineTo(center + 70, y);
  context.moveTo(center, y - 4);
  context.lineTo(center + 5, y);
  context.lineTo(center, y + 4);
  context.lineTo(center - 5, y);
  context.closePath();
  context.stroke();
  context.restore();
}

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

function drawVerticalName(context: CanvasContext, name: string, palette: NativeShareCardPalette): void {
  const characters = Array.from(name).filter((character) => character !== ' ');
  const spacing = Math.min(47, 277 / Math.max(1, characters.length - 1));
  const startY = 126;
  context.save();
  context.fillStyle = palette.ink;
  context.font = `500 ${Math.min(32, spacing - 2)}px serif`;
  context.textAlign = 'center';
  characters.forEach((character, index) => {
    context.fillText(character, 65, startY + index * spacing);
  });
  context.restore();
}

function drawLabelRows(context: CanvasContext, labels: readonly string[], startY: number, palette: NativeShareCardPalette): number {
  if (labels.length === 0) return startY;
  let x = 148;
  let y = startY;
  context.font = '500 15px sans-serif';
  for (const label of labels) {
    const width = Math.ceil(context.measureText(label).width) + 24;
    if (x + width > 555) {
      x = 148;
      y += 38;
    }
    context.strokeStyle = palette.line;
    context.lineWidth = 0.5;
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
  const palette = resolveNativeShareCardPalette(input.theme);
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

  drawClassicalShareFrame(context, NATIVE_SHARE_CARD_WIDTH, NATIVE_SHARE_CARD_HEIGHT, palette);
  context.fillStyle = palette.accent;
  context.font = '500 13px serif';
  context.fillText('AB CLUB', 43, 62);

  drawVerticalName(context, content.displayName, palette);
  context.strokeStyle = palette.line;
  context.lineWidth = 0.7;
  context.beginPath();
  context.moveTo(112.5, 102);
  context.lineTo(112.5, 399);
  context.stroke();

  context.fillStyle = palette.ink;
  context.font = '500 25px serif';
  const headlineLines = wrapText(context, content.headline, 400, 2);
  headlineLines.forEach((line, index) => {
    context.fillText(line, 148, 124 + index * 31);
  });

  const labelStartY = headlineLines.length > 1 ? 204 : headlineLines.length === 1 ? 173 : 124;
  const nextSectionY = drawLabelRows(context, content.labels, labelStartY, palette);
  const hasContacts = Boolean(content.phone || content.email);
  const biographyLimit = hasContacts ? 349 : 406;
  const biographyLines = Math.max(0, Math.floor((biographyLimit - nextSectionY) / 25) + 1);
  context.fillStyle = palette.muted;
  context.font = '400 16px sans-serif';
  if (biographyLines > 0) wrapText(context, content.biography, 400, Math.min(4, biographyLines)).forEach((line, index) => {
    context.fillText(line, 148, nextSectionY + index * 25);
  });

  const contactLines = [
    content.phone,
    content.email,
  ].filter(Boolean);
  if (contactLines.length > 0) {
    context.strokeStyle = palette.line;
    context.lineWidth = 0.5;
    context.beginPath();
    context.moveTo(148, 367);
    context.lineTo(214, 367);
    context.stroke();
    context.fillStyle = palette.muted;
    context.font = '400 13px sans-serif';
    contactLines.slice(0, 2).forEach((line, index) => {
      const visible = wrapText(context, line, 400, 1)[0] ?? '';
      context.fillText(visible, 148, 391 + index * 20);
    });
  }
  return content;
}
