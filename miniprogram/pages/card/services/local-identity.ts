import { CITY_DIRECTORY, type CityId as CityIdValue } from '../../../shared/constants/geography';
import type { PublicCardProjection } from '../../../shared/types/projections';
import { OFFLINE_DEMO_CARD, OFFLINE_DEMO_FIELDS } from './offline-demo';
import {
  compactText,
  normalizeEmail,
  normalizePhone,
  normalizeProfileLabels,
  type OfflineDemoPublicField,
} from './offline-demo-draft';

export const LOCAL_IDENTITY_STORAGE_KEY = 'ab.club.local-identity.v1';
export const LOCAL_IDENTITY_CONTRACT_VERSION = 1;

const CITY_IDS = new Set<string>(CITY_DIRECTORY.map((city) => city.id));

/**
 * A user-owned identity persisted only on the local device in OFFLINE_DEMO mode.
 * It is never uploaded and never enters cloud writes or stranger-facing projections.
 * Presence of a stored identity flips the UI out of the synthetic "体验版" state.
 */
export interface LocalIdentity {
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
  readonly registeredAt: string;
}

type PublicContactKey = 'phone' | 'email';

function normalizeCityId(value: unknown): CityIdValue {
  const fallback = CITY_DIRECTORY[0].id as CityIdValue;
  return typeof value === 'string' && CITY_IDS.has(value) ? (value as CityIdValue) : fallback;
}

export function normalizeLocalIdentity(value: unknown): LocalIdentity {
  const input = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  return {
    contractVersion: LOCAL_IDENTITY_CONTRACT_VERSION,
    displayName: compactText(input.displayName, 60),
    biography: compactText(input.biography, 240),
    profession: compactText(input.profession, 80),
    cityId: normalizeCityId(input.cityId),
    selectedLabels: normalizeProfileLabels(input.selectedLabels),
    showTags: input.showTags === true,
    phone,
    email,
    showPhone: input.showPhone === true && Boolean(phone),
    showEmail: input.showEmail === true && Boolean(email),
    registeredAt: typeof input.registeredAt === 'string' && input.registeredAt
      ? input.registeredAt
      : new Date().toISOString(),
  };
}

export function readLocalIdentity(): LocalIdentity | null {
  try {
    const stored = wx.getStorageSync<unknown>(LOCAL_IDENTITY_STORAGE_KEY);
    if (!stored || typeof stored !== 'object') return null;
    const candidate = normalizeLocalIdentity(stored);
    if (!candidate.displayName) return null;
    return candidate;
  } catch (_error) {
    return null;
  }
}

export function hasLocalIdentity(): boolean {
  return readLocalIdentity() !== null;
}

export function saveLocalIdentity(value: unknown): boolean {
  try {
    wx.setStorageSync(LOCAL_IDENTITY_STORAGE_KEY, normalizeLocalIdentity(value));
    return true;
  } catch (_error) {
    return false;
  }
}

export function clearLocalIdentity(): boolean {
  try {
    wx.removeStorageSync(LOCAL_IDENTITY_STORAGE_KEY);
    return true;
  } catch (_error) {
    return false;
  }
}

export function materializeLocalIdentityCard(value: LocalIdentity): PublicCardProjection {
  return {
    ...OFFLINE_DEMO_CARD,
    displayName: value.displayName,
    headline: value.profession,
    biography: value.biography,
    cityId: value.cityId,
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

export function materializeLocalIdentityFields(value: LocalIdentity): OfflineDemoPublicField[] {
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
      value: value.profession,
    };
  }
  return [
    ...baseFields,
    ...publicContact('phone', '电话', value.phone, value.showPhone),
    ...publicContact('email', '邮箱', value.email, value.showEmail),
  ];
}

export function publicLabelsForLocalIdentity(value: LocalIdentity): string[] {
  return value.showTags ? [...value.selectedLabels] : [];
}
