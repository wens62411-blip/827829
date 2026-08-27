import { CITY_DIRECTORY, type CityId } from '../shared/constants/geography';
import type {
  ContentCollectionProjection,
  ContentCreatorProjection,
  ContentIntentProjection,
  PublicContentProjection,
  PublicEventProjection,
} from '../shared/types/projections';
import type {
  ContentId,
  MediaAssetId,
  Sha256Digest,
  StableId,
  UtcInstant,
} from '../shared/types/primitives';
import { MediaRightsState, VerificationState, type RecordOrigin } from '../shared/types/enums';

export type ArtCategory = PublicContentProjection['category'];
export type ArtCategoryFilter = 'ALL' | ArtCategory;
export type ArtEvidenceScope = 'PUBLIC' | 'DEMO_ONLY';
export type IntentPurpose = 'VIEWING' | 'COLLABORATION';

export type ArtIntentProjection = ContentIntentProjection & {
  readonly purpose: IntentPurpose;
  readonly message?: string;
};

export interface ArtImageEvidence {
  readonly mediaAssetId: MediaAssetId;
  readonly url: string;
  readonly sourceUrl: string;
  readonly license: string;
  readonly rightsHolder: string;
  readonly sha256: Sha256Digest;
  readonly permittedUses: readonly ('THUMBNAIL' | 'DETAIL' | 'SHARE')[];
  readonly alt: string;
  readonly rightsReviewedAt: UtcInstant;
}

interface ArtContentEvidenceExtension {
  readonly recordOrigin: RecordOrigin;
  readonly evidenceScope: ArtEvidenceScope;
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly rightsStatus: MediaRightsState;
  readonly rightsReviewedAt?: UtcInstant;
  readonly rightsSummary: string;
  readonly reviewedAt: UtcInstant;
  readonly cityId: CityId;
  readonly alt: string;
  readonly creatorDisplayName: string;
  readonly image?: ArtImageEvidence;
}

export interface ArtworkFields {
  readonly author: string;
  readonly workTitle: string;
  readonly year: string;
  readonly medium: string;
  readonly dimensions: string;
  readonly edition: string;
  readonly exhibitionHistory: string;
  readonly provenanceInformation: string;
}

export interface AntiqueFields {
  readonly periodRange: string;
  readonly objectType: string;
  readonly knownProvenance: string;
  readonly conditionStatement: string;
  readonly thirdPartyReportReference: string;
}

export interface JewelryFields {
  readonly jewelryKind: 'PEARL' | 'GEMSTONE' | 'METALWORK' | 'OTHER';
  readonly materialStatement: string;
  readonly gemstoneOrPearlInformation: string;
  readonly dimensions: string;
  readonly reportReference: string;
  readonly displayAuthorization: string;
}

export type ArtContentDetail = PublicContentProjection & ArtContentEvidenceExtension & (
  | { readonly category: 'ART'; readonly artwork: ArtworkFields }
  | { readonly category: 'ANTIQUE'; readonly antique: AntiqueFields }
  | { readonly category: 'JEWELRY'; readonly jewelry: JewelryFields }
);

export type ArtCollection = ContentCollectionProjection & {
  readonly categories: readonly ArtCategory[];
  readonly evidenceScope: ArtEvidenceScope;
  readonly recordOrigin: RecordOrigin;
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly reviewedAt: UtcInstant;
};

export type ArtCreator = ContentCreatorProjection & {
  readonly creatorKind: 'ARTIST' | 'INSTITUTION' | 'MAKER';
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly reviewedAt: UtcInstant;
  readonly cityId: CityId;
  readonly evidenceScope: ArtEvidenceScope;
  readonly recordOrigin: RecordOrigin;
};

export interface ArtDetailBundle {
  readonly content: ArtContentDetail;
  readonly creator: ArtCreator;
  readonly events: readonly PublicEventProjection[];
}

export interface DetailRow {
  readonly label: string;
  readonly value: string;
}

export interface ArtCardView {
  readonly contentId: string;
  readonly title: string;
  readonly summary: string;
  readonly categoryLabel: string;
  readonly creatorName: string;
  readonly cityName: string;
  readonly recordOrigin: string;
  readonly evidenceScope: string;
  readonly imageUrl: string;
  readonly alt: string;
  readonly imageAllowed: boolean;
}

export interface RelatedEventView {
  readonly eventId: string;
  readonly title: string;
  readonly cityName: string;
  readonly startsAt: string;
  readonly reservationAvailable: boolean;
}

export const CATEGORY_TABS: readonly {
  readonly value: ArtCategoryFilter;
  readonly label: string;
  readonly en: string;
}[] = [
  { value: 'ALL', label: '全部', en: 'All' },
  { value: 'ART', label: '艺术', en: 'Art' },
  { value: 'ANTIQUE', label: '古董', en: 'Antiques' },
  { value: 'JEWELRY', label: '珠宝', en: 'Jewellery' },
];

const CATEGORY_LABELS: Readonly<Record<ArtCategory, string>> = {
  ART: '艺术',
  ANTIQUE: '古董',
  JEWELRY: '珠宝',
};

const CREATOR_KIND_LABELS: Readonly<Record<ArtCreator['creatorKind'], string>> = {
  ARTIST: '艺术家',
  INSTITUTION: '机构',
  MAKER: '创作者 / 制作者',
};

const CITY_NAME_BY_ID = new Map<string, string>(
  CITY_DIRECTORY.map((city) => [city.id, city.name.zh]),
);

export function categoryLabel(category: ArtCategory): string {
  return CATEGORY_LABELS[category];
}

export function creatorKindLabel(kind: ArtCreator['creatorKind']): string {
  return CREATOR_KIND_LABELS[kind];
}

export function cityName(cityId: CityId): string {
  return CITY_NAME_BY_ID.get(cityId) ?? '城市信息不可用';
}

export function isKnownCityId(value: unknown): value is CityId {
  return validCity(value);
}

export function normalizeCategory(value: string | undefined): ArtCategoryFilter {
  return value === 'ART' || value === 'ANTIQUE' || value === 'JEWELRY' ? value : 'ALL';
}

export function canDisplayImage(content: ArtContentDetail, use: 'THUMBNAIL' | 'DETAIL'): boolean {
  const image = content.image;
  return Boolean(
    image &&
      content.rightsStatus === 'APPROVED' &&
      content.mediaRightsState === 'APPROVED' &&
      content.alt.trim() &&
      image.url.startsWith('https://') &&
      image.sourceUrl.startsWith('https://') &&
      image.license.trim() &&
      image.rightsHolder.trim() &&
      /^[a-f0-9]{64}$/i.test(image.sha256) &&
      content.rightsReviewedAt !== undefined &&
      image.rightsReviewedAt === content.rightsReviewedAt &&
      image.alt === content.alt &&
      image.permittedUses.includes(use),
  );
}

export function toCardView(content: ArtContentDetail): ArtCardView {
  return {
    contentId: content.contentId,
    title: content.title,
    summary: content.summary,
    categoryLabel: content.category === 'JEWELRY' && content.jewelry.jewelryKind === 'PEARL'
      ? '珠宝 · 珍珠'
      : categoryLabel(content.category),
    creatorName: content.creatorDisplayName,
    cityName: cityName(content.cityId),
    recordOrigin: content.recordOrigin,
    evidenceScope: content.evidenceScope,
    imageUrl: canDisplayImage(content, 'THUMBNAIL') ? content.image!.url : '',
    alt: content.alt,
    imageAllowed: canDisplayImage(content, 'THUMBNAIL'),
  };
}

export function detailRows(content: ArtContentDetail): readonly DetailRow[] {
  if (content.category === 'ART') {
    return [
      { label: '作者', value: content.artwork.author },
      { label: '作品标题', value: content.artwork.workTitle },
      { label: '年份', value: content.artwork.year },
      { label: '媒介', value: content.artwork.medium },
      { label: '尺寸', value: content.artwork.dimensions },
      { label: '版数', value: content.artwork.edition },
      { label: '展览信息', value: content.artwork.exhibitionHistory },
      { label: '来源信息', value: content.artwork.provenanceInformation },
    ];
  }
  if (content.category === 'ANTIQUE') {
    return [
      { label: '年代区间', value: content.antique.periodRange },
      { label: '类别', value: content.antique.objectType },
      { label: '已知来源', value: content.antique.knownProvenance },
      { label: '状况说明', value: content.antique.conditionStatement },
      { label: '第三方报告引用', value: content.antique.thirdPartyReportReference },
    ];
  }
  return [
    { label: '珠宝子类', value: content.jewelry.jewelryKind === 'PEARL' ? '珍珠' : categoryLabel(content.category) },
    { label: '材质声明', value: content.jewelry.materialStatement },
    { label: '宝石 / 珍珠信息', value: content.jewelry.gemstoneOrPearlInformation },
    { label: '尺寸', value: content.jewelry.dimensions },
    { label: '报告引用', value: content.jewelry.reportReference },
    { label: '展示授权', value: content.jewelry.displayAuthorization },
  ];
}

export function toRelatedEventView(event: PublicEventProjection): RelatedEventView {
  return {
    eventId: event.eventId,
    title: event.title,
    cityName: cityName(event.cityId),
    startsAt: event.startsAt,
    reservationAvailable: event.reservationAvailable,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validUtc(value: unknown): value is UtcInstant {
  return nonEmpty(value) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) && !Number.isNaN(Date.parse(value));
}

const STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;

export function isArtIntentProjection(value: unknown): value is ArtIntentProjection {
  if (!isObject(value)) return false;
  const version = value.version;
  const createdAt = value.createdAt;
  const updatedAt = value.updatedAt;
  const message = value.message;
  // userId is server-derived, but this client has no trusted user projection to
  // compare against. Validate its shape only; never synthesize, persist, or show it.
  return nonEmpty(value.intentId) && STABLE_ID_PATTERN.test(value.intentId) &&
    nonEmpty(value.contentId) && STABLE_ID_PATTERN.test(value.contentId) &&
    nonEmpty(value.userId) &&
    (value.state === 'ACTIVE' || value.state === 'CANCELLED') &&
    (value.purpose === 'VIEWING' || value.purpose === 'COLLABORATION') &&
    typeof version === 'number' && Number.isSafeInteger(version) && version > 0 &&
    validUtc(createdAt) && validUtc(updatedAt) && Date.parse(updatedAt) >= Date.parse(createdAt) &&
    (message === undefined || (nonEmpty(message) && message.length <= 500));
}

function validCity(value: unknown): value is CityId {
  return typeof value === 'string' && CITY_NAME_BY_ID.has(value);
}

function validBaseFields(value: Record<string, unknown>): boolean {
  return nonEmpty(value.contentId) &&
    nonEmpty(value.creatorId) &&
    nonEmpty(value.title) &&
    nonEmpty(value.summary) &&
    (value.category === 'ART' || value.category === 'ANTIQUE' || value.category === 'JEWELRY') &&
    value.publicationState === 'PUBLISHED' &&
    (value.origin === 'REAL' || value.origin === 'SYNTHETIC') &&
    Object.values(VerificationState).includes(value.verificationState as VerificationState) &&
    value.recordOrigin === value.origin &&
    (value.evidenceScope === 'PUBLIC' || value.evidenceScope === 'DEMO_ONLY') &&
    nonEmpty(value.sourceTitle) &&
    nonEmpty(value.sourceUrl) &&
    value.sourceUrl.startsWith('https://') &&
    nonEmpty(value.rightsStatus) &&
    Object.values(MediaRightsState).includes(value.rightsStatus as MediaRightsState) &&
    value.rightsStatus === value.mediaRightsState &&
    nonEmpty(value.rightsSummary) &&
    validUtc(value.reviewedAt) &&
    validCity(value.cityId) &&
    nonEmpty(value.alt) &&
    nonEmpty(value.creatorDisplayName);
}

function validImage(value: unknown): boolean {
  if (!isObject(value)) return false;
  return nonEmpty(value.mediaAssetId) &&
    nonEmpty(value.url) && value.url.startsWith('https://') &&
    nonEmpty(value.sourceUrl) && value.sourceUrl.startsWith('https://') &&
    nonEmpty(value.license) &&
    nonEmpty(value.rightsHolder) &&
    nonEmpty(value.sha256) && /^[a-f0-9]{64}$/i.test(value.sha256) &&
    nonEmpty(value.alt) &&
    validUtc(value.rightsReviewedAt) &&
    Array.isArray(value.permittedUses) &&
    value.permittedUses.length > 0 &&
    value.permittedUses.every((use) => use === 'THUMBNAIL' || use === 'DETAIL' || use === 'SHARE');
}

function hasStringFields(value: unknown, fields: readonly string[]): boolean {
  return isObject(value) && fields.every((field) => nonEmpty(value[field]));
}

export function isPublicArtContent(value: unknown): value is ArtContentDetail {
  if (!isObject(value) || !validBaseFields(value)) return false;
  if (value.evidenceScope === 'DEMO_ONLY' && value.recordOrigin !== 'SYNTHETIC') return false;
  if (value.image !== undefined && !validImage(value.image)) return false;
  if (value.category === 'ART') {
    return hasStringFields(value.artwork, [
      'author', 'workTitle', 'year', 'medium', 'dimensions', 'edition',
      'exhibitionHistory', 'provenanceInformation',
    ]);
  }
  if (value.category === 'ANTIQUE') {
    return hasStringFields(value.antique, [
      'periodRange', 'objectType', 'knownProvenance', 'conditionStatement',
      'thirdPartyReportReference',
    ]);
  }
  return isObject(value.jewelry) &&
    ['PEARL', 'GEMSTONE', 'METALWORK', 'OTHER'].includes(String(value.jewelry.jewelryKind)) &&
    hasStringFields(value.jewelry, [
      'materialStatement', 'gemstoneOrPearlInformation', 'dimensions',
      'reportReference', 'displayAuthorization',
    ]);
}

export function isPublicArtCollection(value: unknown): value is ArtCollection {
  if (!isObject(value)) return false;
  const categories = value.categories;
  return nonEmpty(value.collectionId) &&
    isObject(value.title) &&
    nonEmpty(value.title.zh) &&
    nonEmpty(value.title.en) &&
    nonEmpty(value.summary) &&
    value.publicationState === 'PUBLISHED' &&
    Array.isArray(categories) &&
    categories.length > 0 &&
    new Set(categories).size === categories.length &&
    categories.every((category) => category === 'ART' || category === 'ANTIQUE' || category === 'JEWELRY') &&
    (value.recordOrigin === 'REAL' || value.recordOrigin === 'SYNTHETIC') &&
    (value.evidenceScope === 'PUBLIC' || value.evidenceScope === 'DEMO_ONLY') &&
    !(value.evidenceScope === 'DEMO_ONLY' && value.recordOrigin !== 'SYNTHETIC') &&
    nonEmpty(value.sourceTitle) &&
    nonEmpty(value.sourceUrl) &&
    value.sourceUrl.startsWith('https://') &&
    validUtc(value.reviewedAt);
}

export function isPublicArtCreator(value: unknown): value is ArtCreator {
  if (!isObject(value)) return false;
  return nonEmpty(value.creatorId) &&
    nonEmpty(value.displayName) &&
    nonEmpty(value.biography) &&
    Object.values(VerificationState).includes(value.verificationState as VerificationState) &&
    (value.creatorKind === 'ARTIST' || value.creatorKind === 'INSTITUTION' || value.creatorKind === 'MAKER') &&
    (value.recordOrigin === 'REAL' || value.recordOrigin === 'SYNTHETIC') &&
    (value.evidenceScope === 'PUBLIC' || value.evidenceScope === 'DEMO_ONLY') &&
    !(value.evidenceScope === 'DEMO_ONLY' && value.recordOrigin !== 'SYNTHETIC') &&
    nonEmpty(value.sourceTitle) &&
    nonEmpty(value.sourceUrl) &&
    value.sourceUrl.startsWith('https://') &&
    validUtc(value.reviewedAt) &&
    validCity(value.cityId);
}

export function asContentId(value: string): ContentId {
  return value as ContentId;
}

export function asCreatorId(value: string): StableId<'creator'> {
  return value as StableId<'creator'>;
}
