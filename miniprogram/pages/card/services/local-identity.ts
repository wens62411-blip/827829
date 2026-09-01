import { CITY_DIRECTORY, type CityId as CityIdValue } from '../../../shared/constants/geography';
import { RecordOrigin, VerificationState, Visibility } from '../../../shared/types/enums';
import type {
  CardId,
  OptimisticVersion,
  ProfileId,
  UserId,
  UtcInstant,
} from '../../../shared/types/primitives';
import type { ProfilePrivateDto, PublicCardProjection } from '../../../shared/types/projections';
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
const LOCAL_CARD_ID = 'card_local_device_identity' as CardId;
const LOCAL_PROFILE_ID = 'profile_local_device_identity' as ProfileId;
const LOCAL_USER_ID = 'user_local_device_identity' as UserId;
const LOCAL_VERSION = 1 as OptimisticVersion;

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
    cardId: LOCAL_CARD_ID,
    ownerUserId: LOCAL_USER_ID,
    displayName: value.displayName,
    ...(value.profession ? { headline: value.profession } : {}),
    biography: value.biography,
    cityId: value.cityId,
    visibility: Visibility.PUBLIC,
    claims: [],
    origin: RecordOrigin.REAL,
    verificationState: VerificationState.USER_DECLARED,
    version: LOCAL_VERSION,
    createdAt: value.registeredAt as UtcInstant,
    updatedAt: value.registeredAt as UtcInstant,
  };
}

export function materializeLocalIdentityProfile(value: LocalIdentity): ProfilePrivateDto {
  return {
    profileId: LOCAL_PROFILE_ID,
    userId: LOCAL_USER_ID,
    displayName: value.displayName,
    cityId: value.cityId,
    biography: value.biography,
    version: LOCAL_VERSION,
    createdAt: value.registeredAt as UtcInstant,
    updatedAt: value.registeredAt as UtcInstant,
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
  return [
    ...(value.profession
      ? [{ key: 'profession', label: '职业', value: value.profession }]
      : []),
    ...publicContact('phone', '电话', value.phone, value.showPhone),
    ...publicContact('email', '邮箱', value.email, value.showEmail),
  ];
}

export function publicLabelsForLocalIdentity(value: LocalIdentity): string[] {
  return value.showTags ? [...value.selectedLabels] : [];
}
