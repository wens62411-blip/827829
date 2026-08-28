import { CITY_DIRECTORY, type CityId } from '../../../shared/constants/geography';
import type { PublicCardProjection } from '../../../shared/types/projections';
import { normalizeCardTheme, type CardTheme } from './card-theme-preference';
import {
  createDefaultOfflineDemoDraft,
  materializeOfflineDemoCard,
  materializeOfflineDemoFields,
  normalizeOfflineDemoDraft,
  normalizeProfileLabels,
  publicLabelsForDraft,
  type OfflineDemoDraft,
  type OfflineDemoPublicField,
} from './offline-demo-draft';
import { OFFLINE_DEMO_FIELDS } from './offline-demo';

export const OFFLINE_DEMO_SHARE_PATH_BUDGET = 960;

const SHARE_PATH = '/pages/card-share/index';
const SNAPSHOT_VERSION = 1;
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const CITY_IDS = new Set<string>(CITY_DIRECTORY.map((city) => city.id));
const THEMES = new Set<CardTheme>(['ivory', 'ink', 'champagne', 'stone']);
const PAYLOAD_KEYS = ['b', 'c', 'e', 'h', 'l', 'n', 'p', 't', 'v'] as const;

interface CompactSnapshotPayload {
  readonly v: 1;
  readonly n: string;
  readonly h: string;
  readonly b: string;
  readonly c: string;
  readonly p: string;
  readonly e: string;
  readonly l: readonly string[];
  readonly t: CardTheme;
}

export interface OfflineDemoShareSnapshot {
  readonly card: PublicCardProjection;
  readonly fields: readonly OfflineDemoPublicField[];
  readonly publicLabels: readonly string[];
  readonly cardTheme: CardTheme;
}

export type BuildOfflineDemoSharePathResult =
  | { readonly ok: true; readonly path: string; readonly encodedSnapshot: string }
  | { readonly ok: false; readonly code: 'PATH_TOO_LONG'; readonly pathLength: number };

export type DecodeOfflineDemoShareSnapshotResult =
  | { readonly ok: true; readonly snapshot: OfflineDemoShareSnapshot }
  | { readonly ok: false; readonly code: 'MISSING' | 'MALFORMED' | 'CHECKSUM_MISMATCH' };

function encodeUtf8(value: string): number[] {
  const bytes: number[] = [];
  for (const character of Array.from(value)) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return bytes;
}

function decodeUtf8(bytes: readonly number[]): string | undefined {
  const codePoints: number[] = [];
  for (let index = 0; index < bytes.length;) {
    const first = bytes[index];
    if (first === undefined) return undefined;
    if (first <= 0x7f) {
      codePoints.push(first);
      index += 1;
      continue;
    }
    const width = first >= 0xf0 ? 4 : first >= 0xe0 ? 3 : first >= 0xc2 ? 2 : 0;
    if (!width || index + width > bytes.length) return undefined;
    let codePoint = first & (0x7f >> width);
    for (let offset = 1; offset < width; offset += 1) {
      const continuation = bytes[index + offset];
      if (continuation === undefined || (continuation & 0xc0) !== 0x80) return undefined;
      codePoint = (codePoint << 6) | (continuation & 0x3f);
    }
    if (
      (width === 2 && codePoint < 0x80)
      || (width === 3 && codePoint < 0x800)
      || (width === 4 && codePoint < 0x10000)
      || codePoint > 0x10ffff
      || (codePoint >= 0xd800 && codePoint <= 0xdfff)
    ) return undefined;
    codePoints.push(codePoint);
    index += width;
  }
  try {
    return String.fromCodePoint(...codePoints);
  } catch (_error) {
    return undefined;
  }
}

function bytesToBase64Url(bytes: readonly number[]): string {
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const group = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    result += BASE64_ALPHABET[(group >> 18) & 63] ?? '';
    result += BASE64_ALPHABET[(group >> 12) & 63] ?? '';
    result += second === undefined ? '=' : BASE64_ALPHABET[(group >> 6) & 63] ?? '';
    result += third === undefined ? '=' : BASE64_ALPHABET[group & 63] ?? '';
  }
  return result.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): number[] | undefined {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value)) return undefined;
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
  const bytes: number[] = [];
  for (let index = 0; index < padded.length; index += 4) {
    const symbols = padded.slice(index, index + 4);
    const indices = Array.from(symbols).map((symbol) => symbol === '=' ? 0 : BASE64_ALPHABET.indexOf(symbol));
    if (indices.length !== 4 || indices.some((entry) => entry < 0)) return undefined;
    const first = indices[0] ?? 0;
    const second = indices[1] ?? 0;
    const third = indices[2] ?? 0;
    const fourth = indices[3] ?? 0;
    const group = (first << 18) | (second << 12) | (third << 6) | fourth;
    bytes.push((group >> 16) & 0xff);
    if (symbols[2] !== '=') bytes.push((group >> 8) & 0xff);
    if (symbols[3] !== '=') bytes.push(group & 0xff);
  }
  return bytes;
}

function checksum(bytes: readonly number[]): string {
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function isExactPayload(value: unknown): value is CompactSnapshotPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).sort().join(',') !== [...PAYLOAD_KEYS].sort().join(',')) return false;
  if (input.v !== SNAPSHOT_VERSION) return false;
  if (
    typeof input.n !== 'string' || !input.n || Array.from(input.n).length > 60
    || typeof input.h !== 'string' || Array.from(input.h).length > 80
    || typeof input.b !== 'string' || !input.b || Array.from(input.b).length > 240
    || typeof input.c !== 'string' || !CITY_IDS.has(input.c)
    || typeof input.p !== 'string' || Array.from(input.p).length > 24
    || typeof input.e !== 'string' || Array.from(input.e).length > 72
    || typeof input.t !== 'string' || !THEMES.has(input.t as CardTheme)
  ) return false;
  const normalizedLabels = normalizeProfileLabels(input.l);
  return JSON.stringify(normalizedLabels) === JSON.stringify(input.l);
}

function compactPayload(draftValue: unknown, theme: CardTheme): CompactSnapshotPayload {
  const draft = normalizeOfflineDemoDraft(draftValue);
  return {
    v: SNAPSHOT_VERSION,
    n: draft.displayName,
    h: draft.profession,
    b: draft.biography,
    c: draft.cityId,
    p: draft.showPhone ? draft.phone : '',
    e: draft.showEmail ? draft.email : '',
    l: publicLabelsForDraft(draft),
    t: normalizeCardTheme(theme),
  };
}

function draftFromPayload(payload: CompactSnapshotPayload): OfflineDemoDraft {
  return normalizeOfflineDemoDraft({
    ...createDefaultOfflineDemoDraft(),
    displayName: payload.n,
    profession: payload.h,
    biography: payload.b,
    cityId: payload.c as CityId,
    phone: payload.p,
    email: payload.e,
    showPhone: Boolean(payload.p),
    showEmail: Boolean(payload.e),
    selectedLabels: payload.l,
    showTags: payload.l.length > 0,
  });
}

function decodeContactFields(payload: CompactSnapshotPayload): OfflineDemoPublicField[] {
  const draft = draftFromPayload(payload);
  const baseKeys = new Set(OFFLINE_DEMO_FIELDS.map((field) => field.key));
  return materializeOfflineDemoFields(draft).filter((field) => (
    baseKeys.has(field.key as typeof OFFLINE_DEMO_FIELDS[number]['key'])
    || field.key === 'phone'
    || field.key === 'email'
  ));
}

export function encodeOfflineDemoShareSnapshot(draftValue: unknown, theme: CardTheme): string {
  const bytes = encodeUtf8(JSON.stringify(compactPayload(draftValue, theme)));
  return `${bytesToBase64Url(bytes)}.${checksum(bytes)}`;
}

export function buildOfflineDemoSharePath(
  draftValue: unknown,
  theme: CardTheme,
): BuildOfflineDemoSharePathResult {
  const encodedSnapshot = encodeOfflineDemoShareSnapshot(draftValue, theme);
  const path = `${SHARE_PATH}?demo=1&snapshot=${encodedSnapshot}`;
  if (path.length > OFFLINE_DEMO_SHARE_PATH_BUDGET) {
    return { ok: false, code: 'PATH_TOO_LONG', pathLength: path.length };
  }
  return { ok: true, path, encodedSnapshot };
}

export function decodeOfflineDemoShareSnapshot(
  encodedValue: unknown,
): DecodeOfflineDemoShareSnapshotResult {
  if (typeof encodedValue !== 'string' || !encodedValue) return { ok: false, code: 'MISSING' };
  const parts = encodedValue.split('.');
  if (parts.length !== 2) return { ok: false, code: 'MALFORMED' };
  const encodedPayload = parts[0];
  const expectedChecksum = parts[1];
  if (!encodedPayload || !expectedChecksum || !/^[0-9a-f]{8}$/.test(expectedChecksum)) {
    return { ok: false, code: 'MALFORMED' };
  }
  const bytes = base64UrlToBytes(encodedPayload);
  if (!bytes) return { ok: false, code: 'MALFORMED' };
  if (checksum(bytes) !== expectedChecksum) return { ok: false, code: 'CHECKSUM_MISMATCH' };
  const json = decodeUtf8(bytes);
  if (!json) return { ok: false, code: 'MALFORMED' };
  try {
    const payload: unknown = JSON.parse(json);
    if (!isExactPayload(payload)) return { ok: false, code: 'MALFORMED' };
    const draft = draftFromPayload(payload);
    return {
      ok: true,
      snapshot: {
        card: materializeOfflineDemoCard(draft),
        fields: decodeContactFields(payload),
        publicLabels: publicLabelsForDraft(draft),
        cardTheme: payload.t,
      },
    };
  } catch (_error) {
    return { ok: false, code: 'MALFORMED' };
  }
}

export function createOfflineDemoShareSnapshot(
  draftValue: unknown,
  theme: CardTheme,
): OfflineDemoShareSnapshot {
  const payload = compactPayload(draftValue, theme);
  const draft = draftFromPayload(payload);
  return {
    card: materializeOfflineDemoCard(draft),
    fields: decodeContactFields(payload),
    publicLabels: publicLabelsForDraft(draft),
    cardTheme: payload.t,
  };
}
