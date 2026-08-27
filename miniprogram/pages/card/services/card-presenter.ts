import { CITY_DIRECTORY } from '../../../shared/constants/geography';
import { ReviewStatus, VerificationState } from '../../../shared/types/enums';
import type {
  PublicCardProjection,
  PublicVerificationClaimProjection,
  ViewerRelationshipProjection,
} from '../../../shared/types/projections';

export type CardViewerMode = 'SELF' | 'FRIEND' | 'STRANGER';

const CITY_NAMES = new Map(CITY_DIRECTORY.map((city) => [city.id, city.name.zh]));

export function cityDisplayName(cityId: string | undefined): string {
  if (!cityId) return '城市未填写';
  return CITY_NAMES.get(cityId as (typeof CITY_DIRECTORY)[number]['id']) ?? '城市信息不可用';
}

export function isEffectivePublicClaim(
  claim: PublicVerificationClaimProjection,
  nowMs: number = Date.now(),
): boolean {
  if (
    !claim ||
    typeof claim !== 'object' ||
    typeof claim.claimId !== 'string' ||
    typeof claim.subjectUserId !== 'string' ||
    typeof claim.labelId !== 'string' ||
    !claim.labelText ||
    typeof claim.labelText.zh !== 'string' ||
    typeof claim.labelText.en !== 'string' ||
    claim.reviewStatus !== ReviewStatus.APPROVED ||
    claim.verificationState !== VerificationState.HUMAN_REVIEWED ||
    claim.publicVisible !== true
  ) {
    return false;
  }
  const startsAt = Date.parse(claim.validFrom);
  if (!Number.isFinite(startsAt) || startsAt > nowMs) return false;
  if (claim.validUntil !== undefined) {
    const endsAt = Date.parse(claim.validUntil);
    if (!Number.isFinite(endsAt) || endsAt <= nowMs) return false;
  }
  return true;
}

function sanitizePublicClaim(
  claim: PublicVerificationClaimProjection,
): PublicVerificationClaimProjection | undefined {
  if (!isEffectivePublicClaim(claim)) return undefined;
  return {
    version: claim.version,
    createdAt: claim.createdAt,
    updatedAt: claim.updatedAt,
    claimId: claim.claimId,
    subjectUserId: claim.subjectUserId,
    labelId: claim.labelId,
    labelText: { zh: claim.labelText.zh, en: claim.labelText.en },
    reviewStatus: ReviewStatus.APPROVED,
    verificationState: VerificationState.HUMAN_REVIEWED,
    publicVisible: true,
    validFrom: claim.validFrom,
    ...(claim.validUntil === undefined ? {} : { validUntil: claim.validUntil }),
  };
}

export function sanitizePublicCard(
  card: PublicCardProjection,
  responseClaims?: readonly PublicVerificationClaimProjection[],
): PublicCardProjection {
  const candidates = Array.isArray(responseClaims)
    ? responseClaims
    : Array.isArray(card.claims)
      ? card.claims
      : [];
  const claims = candidates.flatMap((claim) => {
    const sanitized = sanitizePublicClaim(claim);
    return sanitized ? [sanitized] : [];
  });
  return {
    version: card.version,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    cardId: card.cardId,
    ownerUserId: card.ownerUserId,
    displayName: card.displayName,
    ...(typeof card.headline === 'string' ? { headline: card.headline } : {}),
    ...(typeof card.cityId === 'string' ? { cityId: card.cityId } : {}),
    ...(typeof card.avatarUrl === 'string' ? { avatarUrl: card.avatarUrl } : {}),
    ...(typeof card.biography === 'string' ? { biography: card.biography } : {}),
    visibility: card.visibility,
    claims,
    origin: card.origin,
    verificationState: card.verificationState,
  };
}

export function viewerModeFromRelationship(
  relationship: ViewerRelationshipProjection,
): CardViewerMode {
  return relationship.mayViewFriendsOnlyFields ? 'FRIEND' : 'STRANGER';
}

export function safeShareTitle(_displayName?: string): string {
  // A caller can hold an owner or FRIENDS_ONLY projection. A fixed title keeps
  // those view-specific values out of the WeChat share envelope when the link
  // is forwarded to someone with a narrower relationship.
  return 'AB Club 数字名片';
}

export function shareExpiry(days: number = 7, nowMs: number = Date.now()): string {
  return new Date(nowMs + days * 24 * 60 * 60 * 1000).toISOString();
}

export function isSafeShareBearer(value: unknown): value is string {
  return typeof value === 'string' && /^sc_[A-Za-z0-9_-]{27}$/.test(value);
}

export function normalizeShareReference(options: Record<string, string | undefined>):
  | { readonly ok: true; readonly reference: { readonly token: string } | { readonly scene: string } }
  | { readonly ok: false; readonly message: string } {
  const rawToken = options.token?.trim();
  const rawScene = options.scene?.trim();
  if ((rawToken && rawScene) || (!rawToken && !rawScene)) {
    return { ok: false, message: '分享入口参数缺失或冲突，请让分享者重新生成入口。' };
  }
  const raw = rawToken ?? rawScene ?? '';
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch (_error) {
    return { ok: false, message: '分享入口参数无法识别，请重新获取。' };
  }
  if (!isSafeShareBearer(decoded)) {
    return { ok: false, message: '分享入口参数无效，请让分享者重新生成。' };
  }
  return rawToken
    ? { ok: true, reference: { token: decoded } }
    : { ok: true, reference: { scene: decoded } };
}
