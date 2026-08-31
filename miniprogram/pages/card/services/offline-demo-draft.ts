import { CITY_DIRECTORY, CityId, type CityId as CityIdValue } from '../../../shared/constants/geography';
import type { PublicCardProjection } from '../../../shared/types/projections';
import {
  OFFLINE_DEMO_CARD,
  OFFLINE_DEMO_FIELDS,
  OFFLINE_DEMO_SELECTED_LABELS,
} from './offline-demo';

export const MAX_PROFILE_LABELS = 5;
export const MAX_PROFILE_LABEL_CHARACTERS = 10;

const OFFLINE_DEMO_DRAFT_STORAGE_KEY = 'ab.club.card.offline-demo-draft.v1';
const OFFLINE_DEMO_DRAFT_CONTRACT_VERSION = 1;
const CITY_IDS = new Set<string>(CITY_DIRECTORY.map((city) => city.id));
const CONTROL_OR_FORMAT_CHARACTER = /[\p{Cc}\p{Cf}]/u;

// 遗留演示占位名：旧版本曾把示例名片默认写成这些中文/示例名，升级后本机存储里可能仍残留，
// 导致新版本读到的还是旧名。读到这些名时一次性重置为当前默认（Display Name）。
const LEGACY_DEMO_DISPLAY_NAMES: ReadonlySet<string> = new Set([
  '林知遥',
  '林志瑶',
  'AB Club 示例会员',
]);

function isLegacyDemoDisplayName(name: string): boolean {
  return LEGACY_DEMO_DISPLAY_NAMES.has(name);
}

type PublicContactKey = 'phone' | 'email';

export interface OfflineDemoPublicField {
  readonly key: string;
  readonly label: string;
  readonly value: string | readonly string[];
}

export interface OfflineDemoDraft {
  readonly contractVersion: 1;
  readonly displayName: string;
  readonly biography: string;
  readonly profession: string;
  readonly cityId: CityIdValue;
  readonly selectedLabels: readonly string[];
  readonly showTags: boolean;
  readonly phone: string;
  readonly email: string;
  readonly showPhone: boolean;
  readonly showEmail: boolean;
}

export type ProfileLabelFailureCode =
  | 'EMPTY'
  | 'CONTROL_CHARACTER'
  | 'TOO_LONG'
  | 'DUPLICATE'
  | 'MAX_COUNT';

export type ProfileLabelValidation =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly code: Exclude<ProfileLabelFailureCode, 'DUPLICATE' | 'MAX_COUNT'> };

export type AddProfileLabelResult =
  | { readonly ok: true; readonly labels: string[] }
  | { readonly ok: false; readonly code: ProfileLabelFailureCode; readonly labels: string[] };

export function compactText(value: unknown, maximumLength: number): string {
  if (typeof value !== 'string') return '';
  return Array.from(value.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim())
    .slice(0, maximumLength)
    .join('');
}

export function normalizePhone(value: unknown): string {
  const candidate = compactText(value, 24);
  return candidate.length >= 6 && /^\+?[0-9](?:[0-9 ()-]*[0-9])$/.test(candidate)
    ? candidate
    : '';
}

export function normalizeEmail(value: unknown): string {
  const candidate = compactText(value, 72);
  if (!candidate || /\s/.test(candidate)) return '';
  const parts = candidate.split('@');
  return parts.length === 2
    && Boolean(parts[0])
    && /^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(parts[1] ?? '')
    ? candidate
    : '';
}

export function validateProfileLabel(value: unknown): ProfileLabelValidation {
  if (typeof value !== 'string') return { ok: false, code: 'EMPTY' };
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, code: 'EMPTY' };
  if (CONTROL_OR_FORMAT_CHARACTER.test(trimmed)) return { ok: false, code: 'CONTROL_CHARACTER' };
  if (Array.from(trimmed).length > MAX_PROFILE_LABEL_CHARACTERS) {
    return { ok: false, code: 'TOO_LONG' };
  }
  return { ok: true, value: trimmed };
}

export function normalizeProfileLabels(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const candidate of values) {
    const result = validateProfileLabel(candidate);
    if (!result.ok) continue;
    const dedupeKey = result.value.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    labels.push(result.value);
    if (labels.length === MAX_PROFILE_LABELS) break;
  }
  return labels;
}

export function addProfileLabel(currentValues: unknown, candidate: unknown): AddProfileLabelResult {
  const labels = normalizeProfileLabels(currentValues);
  const validation = validateProfileLabel(candidate);
  if (!validation.ok) return { ok: false, code: validation.code, labels };
  if (labels.some((label) => label.toLowerCase() === validation.value.toLowerCase())) {
    return { ok: false, code: 'DUPLICATE', labels };
  }
  if (labels.length >= MAX_PROFILE_LABELS) return { ok: false, code: 'MAX_COUNT', labels };
  return { ok: true, labels: [...labels, validation.value] };
}

export function createDefaultOfflineDemoDraft(): OfflineDemoDraft {
  return {
    contractVersion: OFFLINE_DEMO_DRAFT_CONTRACT_VERSION,
    displayName: 'Display Name',
    biography: OFFLINE_DEMO_CARD.biography ?? '',
    profession: OFFLINE_DEMO_CARD.headline ?? '',
    cityId: CityId.CN_HANGZHOU,
    selectedLabels: normalizeProfileLabels(OFFLINE_DEMO_SELECTED_LABELS),
    showTags: true,
    phone: '+41 44 555 01 10',
    email: 'demo@abclub.example',
    showPhone: true,
    showEmail: true,
  };
}

export function normalizeOfflineDemoDraft(value: unknown): OfflineDemoDraft {
  const fallback = createDefaultOfflineDemoDraft();
  if (!value || typeof value !== 'object') return fallback;
  const input = value as Record<string, unknown>;
  const cityCandidate = typeof input.cityId === 'string' && CITY_IDS.has(input.cityId)
    ? input.cityId as CityIdValue
    : fallback.cityId;
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  return {
    contractVersion: OFFLINE_DEMO_DRAFT_CONTRACT_VERSION,
    displayName: compactText(input.displayName, 60) || fallback.displayName,
    biography: compactText(input.biography, 240) || fallback.biography,
    profession: compactText(input.profession, 80) || fallback.profession,
    cityId: cityCandidate,
    selectedLabels: normalizeProfileLabels(input.selectedLabels),
    showTags: input.showTags === true,
    phone,
    email,
    showPhone: input.showPhone === true && Boolean(phone),
    showEmail: input.showEmail === true && Boolean(email),
  };
}

export function readOfflineDemoDraft(): OfflineDemoDraft {
  try {
    const stored = wx.getStorageSync<unknown>(OFFLINE_DEMO_DRAFT_STORAGE_KEY);
    if (!stored || typeof stored !== 'object') return createDefaultOfflineDemoDraft();
    const normalized = normalizeOfflineDemoDraft(stored);
    if (isLegacyDemoDisplayName(normalized.displayName)) {
      // 旧版本残留的示例占位名：重置为当前默认（Display Name）并写回，避免反复显示旧名。
      const fresh = createDefaultOfflineDemoDraft();
      writeOfflineDemoDraft(fresh);
      return fresh;
    }
    return normalized;
  } catch (_error) {
    return createDefaultOfflineDemoDraft();
  }
}

export function hasOfflineDemoDraft(): boolean {
  try {
    const stored = wx.getStorageSync<unknown>(OFFLINE_DEMO_DRAFT_STORAGE_KEY);
    return Boolean(stored && typeof stored === 'object');
  } catch (_error) {
    return false;
  }
}

export function writeOfflineDemoDraft(value: unknown): boolean {
  try {
    wx.setStorageSync(OFFLINE_DEMO_DRAFT_STORAGE_KEY, normalizeOfflineDemoDraft(value));
    return true;
  } catch (_error) {
    return false;
  }
}

export function publicLabelsForDraft(value: unknown): string[] {
  const draft = normalizeOfflineDemoDraft(value);
  return draft.showTags ? [...draft.selectedLabels] : [];
}

export function materializeOfflineDemoCard(value: unknown): PublicCardProjection {
  const draft = normalizeOfflineDemoDraft(value);
  return {
    ...OFFLINE_DEMO_CARD,
    displayName: draft.displayName,
    headline: draft.profession,
    biography: draft.biography,
    cityId: draft.cityId,
  };
}

function publicContact(
  key: PublicContactKey,
  label: string,
  value: string,
  visible: boolean,
): OfflineDemoPublicField[] {
  return visible && value ? [{ key, label, value }] : [];
}

export function materializeOfflineDemoFields(value: unknown): OfflineDemoPublicField[] {
  const draft = normalizeOfflineDemoDraft(value);
  const baseFields: OfflineDemoPublicField[] = OFFLINE_DEMO_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    value: field.value,
  }));
  const professionIndex = baseFields.findIndex((field) => field.key === 'profession');
  if (professionIndex >= 0) {
    baseFields[professionIndex] = {
      key: 'profession',
      label: '职业',
      value: draft.profession,
    };
  }
  return [
    ...baseFields,
    ...publicContact('phone', '电话', draft.phone, draft.showPhone),
    ...publicContact('email', '邮箱', draft.email, draft.showEmail),
  ];
}
