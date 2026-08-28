import { CityId } from '../../../shared/constants/geography';
import { RecordOrigin, VerificationState, Visibility } from '../../../shared/types/enums';
import type { CardId, OptimisticVersion, StableId, UserId, UtcInstant } from '../../../shared/types/primitives';
import type { ProfilePrivateDto, PublicCardProjection } from '../../../shared/types/projections';

const DEMO_TIME = '2026-08-27T00:00:00.000Z' as UtcInstant;
const DEMO_VERSION = 1 as OptimisticVersion;
const DEMO_USER_ID = 'user_synthetic_ab_demo' as UserId;

/**
 * Visual-only fixtures for the explicit OFFLINE_DEMO runtime. They never enter
 * cloud writes, share payloads, local storage or human-review projections.
 */
export const OFFLINE_DEMO_CARD = {
  cardId: 'card_synthetic_ab_demo' as CardId,
  ownerUserId: DEMO_USER_ID,
  displayName: 'AB Club 示例会员',
  headline: '全球商业连接 · 艺术与珠宝交流',
  cityId: CityId.CH_ZURICH,
  biography: '合成资料，仅用于预览数字名片的层级、隐私与审核流程；不对应任何真实用户。',
  visibility: Visibility.PUBLIC,
  claims: [],
  origin: RecordOrigin.SYNTHETIC,
  verificationState: VerificationState.USER_DECLARED,
  version: DEMO_VERSION,
  createdAt: DEMO_TIME,
  updatedAt: DEMO_TIME,
} satisfies PublicCardProjection;

export const OFFLINE_DEMO_PROFILE = {
  profileId: 'profile_synthetic_ab_demo' as StableId<'profile'>,
  userId: DEMO_USER_ID,
  displayName: OFFLINE_DEMO_CARD.displayName,
  cityId: CityId.CH_ZURICH,
  biography: OFFLINE_DEMO_CARD.biography,
  version: DEMO_VERSION,
  createdAt: DEMO_TIME,
  updatedAt: DEMO_TIME,
} satisfies ProfilePrivateDto;

export const OFFLINE_DEMO_FIELDS = [
  { key: 'industry', label: '方向', value: '全球商业 · 艺术文化' },
  { key: 'company', label: '机构', value: 'AB Atelier（虚构示例）' },
  { key: 'position', label: '角色', value: '跨城市连接者（示例）' },
  { key: 'experience', label: '关注', value: '品牌出海 · 同城活动 · 私人收藏' },
  { key: 'interests', label: '兴趣', value: ['当代艺术', '古董', '珠宝', '城市漫游'] },
] as const;

export const OFFLINE_DEMO_REVIEW_ITEMS = [
  { label: '艺术与古董兴趣', state: '未提交', note: '提交材料后进入人工审核；当前不会公开显示。' },
  { label: '城市主理人', state: '未申请', note: '仅人工审核通过且仍有效时，才会成为公开标签。' },
] as const;

export function isOfflineDemo(runtime: { readonly runtimeMode: string; readonly cloudConfigured: boolean }): boolean {
  return runtime.runtimeMode === 'OFFLINE_DEMO' && !runtime.cloudConfigured;
}
