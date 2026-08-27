import { CityId } from '../../shared/constants/geography';
import {
  EventState,
  MediaRightsState,
  PublicationState,
  RecordOrigin,
  VerificationState,
} from '../../shared/types/enums';
import type {
  CollectionId,
  ContentId,
  EventId,
  OptimisticVersion,
  OrganizerId,
  ClubNodeId,
  StableId,
  UtcInstant,
} from '../../shared/types/primitives';
import type { PublicEventProjection } from '../../shared/types/projections';
import type {
  ArtCategoryFilter,
  ArtCollection,
  ArtContentDetail,
  ArtCreator,
} from '../model';

const CREATED_AT = '2026-08-27T08:00:00Z' as UtcInstant;
const REVIEWED_AT = '2026-08-27T08:30:00Z' as UtcInstant;
const VERSION = 1 as OptimisticVersion;

const common = {
  publicationState: PublicationState.PUBLISHED,
  mediaRightsState: MediaRightsState.UNVERIFIED,
  rightsStatus: MediaRightsState.UNVERIFIED,
  origin: RecordOrigin.SYNTHETIC,
  recordOrigin: RecordOrigin.SYNTHETIC,
  verificationState: VerificationState.NOT_APPLICABLE,
  evidenceScope: 'DEMO_ONLY',
  rightsSummary: '未配置可公开展示的图片权利依据，因此仅显示文字占位。',
  reviewedAt: REVIEWED_AT,
  createdAt: CREATED_AT,
  updatedAt: REVIEWED_AT,
  version: VERSION,
} as const;

export const DEMO_ART_CONTENT: readonly ArtContentDetail[] = [
  {
    ...common,
    contentId: 'content_demo_art_ink_001' as ContentId,
    collectionId: 'collection_demo_art_editorial' as CollectionId,
    creatorId: 'creator_demo_lin' as StableId<'creator'>,
    creatorDisplayName: '林墨（虚构演示）',
    title: '潮汐之后，纸上仍有一条缓慢移动的岸线 / After the Tide, A Shoreline Continues to Move Across the Paper',
    summary: '用于验证超长中英文标题、来源分区与无图状态的合成内容，不对应任何真实作品。',
    category: 'ART',
    cityId: CityId.CN_SHENZHEN,
    sourceTitle: 'AB Club 脱敏演示资料',
    sourceUrl: 'https://example.invalid/ab-club/art-demo/art-001',
    alt: '本条合成艺术演示内容未配置作品图片',
    artwork: {
      author: '林墨（虚构演示）',
      workTitle: '潮汐之后（合成演示）',
      year: '2026（演示字段）',
      medium: '纸本综合媒介（演示声明）',
      dimensions: '78 × 112 cm（演示字段）',
      edition: '单件演示记录，不构成实物声明',
      exhibitionHistory: '无；该记录为 DEMO_ONLY。',
      provenanceInformation: '由本地脱敏 fixture 生成，不对应真实持有人或流转记录。',
    },
  },
  {
    ...common,
    contentId: 'content_demo_antique_vessel_001' as ContentId,
    collectionId: 'collection_demo_antique_notes' as CollectionId,
    creatorId: 'creator_demo_research_desk' as StableId<'creator'>,
    creatorDisplayName: '器物资料组（虚构演示）',
    title: '一件年代信息仍待交叉核对的器物记录：长标题用于检验古董资料页不会把第三方报告引用误写为平台鉴定结论',
    summary: '合成古董资料条目，仅演示年代区间、已知来源和状况说明的独立表达。',
    category: 'ANTIQUE',
    cityId: CityId.CN_SHANGHAI,
    sourceTitle: 'AB Club 脱敏器物演示资料',
    sourceUrl: 'https://example.invalid/ab-club/art-demo/antique-001',
    alt: '本条合成古董演示内容未配置器物图片',
    antique: {
      periodRange: '20 世纪上半叶（仅演示范围）',
      objectType: '陈设器物（演示分类）',
      knownProvenance: '无真实来源链；本地 fixture 明确标记为 SYNTHETIC。',
      conditionStatement: '无实物可供检查；此处仅验证状况说明字段的展示。',
      thirdPartyReportReference: 'DEMO-REPORT-ANTIQUE-001；非真实报告，不构成鉴定依据。',
    },
  },
  {
    ...common,
    contentId: 'content_demo_jewelry_pearl_001' as ContentId,
    collectionId: 'collection_demo_jewelry_materials' as CollectionId,
    creatorId: 'creator_demo_material_lab' as StableId<'creator'>,
    creatorDisplayName: '材质档案室（虚构演示）',
    title: '海水珍珠项饰材质记录 / Synthetic Pearl Jewellery Material Record for Layout and Disclosure Testing',
    summary: '珍珠作为 JEWELRY 子类的合成演示条目；不对应商品、库存或投资标的。',
    category: 'JEWELRY',
    cityId: CityId.FR_PARIS,
    sourceTitle: 'AB Club 脱敏珠宝演示资料',
    sourceUrl: 'https://example.invalid/ab-club/art-demo/jewelry-pearl-001',
    alt: '本条合成珍珠珠宝演示内容未配置首饰图片',
    jewelry: {
      jewelryKind: 'PEARL',
      materialStatement: '白色金属与海水珍珠描述均为演示声明，未对应实物检测。',
      gemstoneOrPearlInformation: '圆形珠，演示尺寸约 7.5–8.0 mm；未提供真实分级。',
      dimensions: '演示链长 420 mm',
      reportReference: 'DEMO-REPORT-JEWELRY-001；非真实检测报告。',
      displayAuthorization: '未配置图片展示授权，界面必须使用无图状态。',
    },
  },
] as const;

export const DEMO_ART_COLLECTIONS: readonly ArtCollection[] = [
  {
    collectionId: 'collection_demo_art_editorial' as CollectionId,
    title: { zh: '纸上叙事', en: 'Narratives on Paper' },
    summary: '合成艺术编辑选集，用于频道排版验证。',
    publicationState: PublicationState.PUBLISHED,
    categories: ['ART'],
    evidenceScope: 'DEMO_ONLY',
    recordOrigin: RecordOrigin.SYNTHETIC,
    sourceTitle: 'AB Club 脱敏策展演示资料',
    sourceUrl: 'https://example.invalid/ab-club/art-demo/collection-art',
    reviewedAt: REVIEWED_AT,
    createdAt: CREATED_AT,
    updatedAt: REVIEWED_AT,
    version: VERSION,
  },
  {
    collectionId: 'collection_demo_antique_notes' as CollectionId,
    title: { zh: '器物笔记', en: 'Object Notes' },
    summary: '只陈述资料来源与状况边界的合成选集。',
    publicationState: PublicationState.PUBLISHED,
    categories: ['ANTIQUE'],
    evidenceScope: 'DEMO_ONLY',
    recordOrigin: RecordOrigin.SYNTHETIC,
    sourceTitle: 'AB Club 脱敏策展演示资料',
    sourceUrl: 'https://example.invalid/ab-club/art-demo/collection-antique',
    reviewedAt: REVIEWED_AT,
    createdAt: CREATED_AT,
    updatedAt: REVIEWED_AT,
    version: VERSION,
  },
  {
    collectionId: 'collection_demo_jewelry_materials' as CollectionId,
    title: { zh: '珠宝材质档案', en: 'Jewellery Material Notes' },
    summary: '包含珍珠子类字段的合成资料选集。',
    publicationState: PublicationState.PUBLISHED,
    categories: ['JEWELRY'],
    evidenceScope: 'DEMO_ONLY',
    recordOrigin: RecordOrigin.SYNTHETIC,
    sourceTitle: 'AB Club 脱敏策展演示资料',
    sourceUrl: 'https://example.invalid/ab-club/art-demo/collection-jewelry',
    reviewedAt: REVIEWED_AT,
    createdAt: CREATED_AT,
    updatedAt: REVIEWED_AT,
    version: VERSION,
  },
] as const;

export const DEMO_ART_CREATORS: readonly ArtCreator[] = [
  {
    creatorId: 'creator_demo_lin' as StableId<'creator'>,
    displayName: '林墨（虚构演示）',
    biography: '用于验证艺术家摘要排版的合成人物，不代表真实艺术家或合作关系。',
    verificationState: VerificationState.NOT_APPLICABLE,
    creatorKind: 'ARTIST',
    sourceTitle: 'AB Club 脱敏创作者演示资料',
    sourceUrl: 'https://example.invalid/ab-club/art-demo/creator-lin',
    reviewedAt: REVIEWED_AT,
    cityId: CityId.CN_SHENZHEN,
    evidenceScope: 'DEMO_ONLY',
    recordOrigin: RecordOrigin.SYNTHETIC,
    createdAt: CREATED_AT,
    updatedAt: REVIEWED_AT,
    version: VERSION,
  },
  {
    creatorId: 'creator_demo_research_desk' as StableId<'creator'>,
    displayName: '器物资料组（虚构演示）',
    biography: '合成机构摘要，只演示资料整理角色，不代表鉴定机构。',
    verificationState: VerificationState.NOT_APPLICABLE,
    creatorKind: 'INSTITUTION',
    sourceTitle: 'AB Club 脱敏机构演示资料',
    sourceUrl: 'https://example.invalid/ab-club/art-demo/creator-research-desk',
    reviewedAt: REVIEWED_AT,
    cityId: CityId.CN_SHANGHAI,
    evidenceScope: 'DEMO_ONLY',
    recordOrigin: RecordOrigin.SYNTHETIC,
    createdAt: CREATED_AT,
    updatedAt: REVIEWED_AT,
    version: VERSION,
  },
  {
    creatorId: 'creator_demo_material_lab' as StableId<'creator'>,
    displayName: '材质档案室（虚构演示）',
    biography: '用于珠宝与珍珠字段展示的合成机构，不代表检测实验室。',
    verificationState: VerificationState.NOT_APPLICABLE,
    creatorKind: 'INSTITUTION',
    sourceTitle: 'AB Club 脱敏机构演示资料',
    sourceUrl: 'https://example.invalid/ab-club/art-demo/creator-material-lab',
    reviewedAt: REVIEWED_AT,
    cityId: CityId.FR_PARIS,
    evidenceScope: 'DEMO_ONLY',
    recordOrigin: RecordOrigin.SYNTHETIC,
    createdAt: CREATED_AT,
    updatedAt: REVIEWED_AT,
    version: VERSION,
  },
] as const;

export const DEMO_RELATED_EVENTS: readonly PublicEventProjection[] = [
  {
    eventId: 'event_demo_art_reading_001' as EventId,
    clubNodeId: 'club-node_demo_shenzhen' as ClubNodeId,
    organizerId: 'organizer_demo_art' as OrganizerId,
    cityId: CityId.CN_SHENZHEN,
    title: '作品资料阅读会（DEMO_ONLY）',
    summary: '合成线下活动摘要；不代表真实排期或官方合作。',
    startsAt: '2026-09-12T10:00:00Z' as UtcInstant,
    endsAt: '2026-09-12T12:00:00Z' as UtcInstant,
    timezone: 'Asia/Shanghai',
    state: EventState.PUBLISHED,
    publicationState: PublicationState.PUBLISHED,
    reservationAvailable: false,
    origin: RecordOrigin.SYNTHETIC,
    verificationState: VerificationState.NOT_APPLICABLE,
    createdAt: CREATED_AT,
    updatedAt: REVIEWED_AT,
    version: VERSION,
  },
] as const;

export function listDemoContent(category: ArtCategoryFilter): readonly ArtContentDetail[] {
  return category === 'ALL' ? DEMO_ART_CONTENT : DEMO_ART_CONTENT.filter((item) => item.category === category);
}

export function listDemoCollections(category: ArtCategoryFilter): readonly ArtCollection[] {
  return category === 'ALL' ? DEMO_ART_COLLECTIONS : DEMO_ART_COLLECTIONS.filter((item) => item.categories.includes(category));
}

export function getDemoContent(contentId: string): ArtContentDetail | undefined {
  return DEMO_ART_CONTENT.find((item) => item.contentId === contentId);
}

export function getDemoCreator(creatorId: string): ArtCreator | undefined {
  return DEMO_ART_CREATORS.find((creator) => creator.creatorId === creatorId);
}

export function listDemoRelatedEvents(contentId: string): readonly PublicEventProjection[] {
  return contentId === 'content_demo_art_ink_001' ? DEMO_RELATED_EVENTS : [];
}
