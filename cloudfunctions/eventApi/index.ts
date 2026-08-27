import {
  CITY_DIRECTORY,
  COUNTRY_DIRECTORY,
  REGION_DIRECTORY,
  type CityId,
  type CountryId,
  type RegionId,
} from '../../miniprogram/shared/constants/geography';
import type { CloudAction } from '../../miniprogram/shared/contracts';
import type { ApiResult } from '../../miniprogram/shared/types/api';
import {
  EnrollmentState,
  EventState,
  MediaRightsState,
  OperationalState,
  PaymentState,
  PublicationState,
  RecordOrigin,
  ReviewStatus,
  VerificationState,
} from '../../miniprogram/shared/types/enums';
import type {
  CityProjection,
  CountryProjection,
  EnrollmentProjection,
  EventEligibilityProjection,
  PaymentCapabilityProjection,
  PublicClubNodeProjection,
  PublicEventProjection,
  PublicOrganizerProjection,
  PublicVerificationClaimProjection,
  RegionProjection,
} from '../../miniprogram/shared/types/projections';
import type {
  EnrollmentId,
  EventId,
  OptimisticVersion,
  OrganizerId,
  RequestId,
  StableId,
  UserId,
  UtcInstant,
} from '../../miniprogram/shared/types/primitives';
import {
  requireTrustedPrincipal,
  type TrustedPrincipal,
  type TrustedWxContext,
} from '../_shared/auth';
import { ApiErrorCode, SafeApiError, safeFailureFromError } from '../_shared/errors';
import { createNotImplementedEndpoint } from '../_shared/errors/envelope';
import {
  assertIdempotencyCompatible,
  createIdempotencyClaim,
  fingerprintPayload,
  requireIdempotencyKey,
  type ExistingIdempotencyRecord,
  type JsonValue,
} from '../_shared/idempotency';
import { parseReadOnlyProjection } from '../_shared/projections';
import { isPlainRecord, requireExpectedVersion, validateCallEnvelope } from '../_shared/validation';

export const ACTIONS = [
  'geo.listRegions', 'geo.listCountries', 'geo.listCities', 'geo.getNode', 'event.list',
  'event.get', 'event.checkEligibility', 'event.registerInterest', 'event.cancelInterest',
  'event.getEnrollment', 'organizer.getPublic', 'payment.getCapability',
] as const satisfies readonly CloudAction[];

export const EVENT_INTEREST_TERMS_VERSION = 'event-interest-terms-v1';

const UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const STABLE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const ACTIVE_ENROLLMENTS = new Set<string>([
  EnrollmentState.INTERESTED, EnrollmentState.WAITLISTED, EnrollmentState.CONFIRMED,
]);
const OPERATING_STATES = new Set<string>([OperationalState.PILOT, OperationalState.LIVE]);
const CITY_STATES = new Set<string>(Object.values(OperationalState));
const CITY_BY_ID = new Map(CITY_DIRECTORY.map((city) => [city.id, city] as const));
const COUNTRY_BY_ID = new Map(COUNTRY_DIRECTORY.map((country) => [country.id, country] as const));
const REGION_BY_ID = new Map(REGION_DIRECTORY.map((region) => [region.id, region] as const));

export interface CityOperationalOverlay {
  readonly _id: CityId;
  readonly operationalState: OperationalState;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ClubNodeRecord {
  readonly _id: string;
  readonly cityId: CityId;
  readonly name: { readonly zh: string; readonly en: string };
  readonly operationalState: OperationalState;
  readonly reviewStatus: ReviewStatus;
  readonly organizerId?: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OrganizerRecord {
  readonly _id: string;
  readonly ownerUserId: string;
  readonly name: { readonly zh: string; readonly en: string };
  readonly summary: string;
  readonly cityIds: readonly CityId[];
  readonly reviewStatus: ReviewStatus;
  readonly verificationState: VerificationState;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EventRecord {
  readonly _id: string;
  readonly organizerId: string;
  readonly clubNodeId: string;
  readonly cityId: CityId;
  readonly title: string;
  readonly summary: string;
  readonly source: {
    readonly kind: 'OFFICIAL_ORGANIZER' | 'AUTHORIZED_PARTNER' | 'INTERNAL_DEMO';
    readonly label: string;
    readonly sourcePageUrl?: string;
    readonly retrievedAt: string;
    readonly contentStatus: 'VERIFIED' | 'CONTENT_LIVE_UNVERIFIED' | 'DEMO_ONLY';
  };
  readonly startsAt: string;
  readonly endsAt: string;
  readonly timezone: string;
  readonly addressScope: string;
  readonly registrationMethod: 'INTEREST' | 'OFFICIAL_URL' | 'WECHAT_PAYMENT';
  readonly officialRegistrationUrl?: string;
  readonly capacity: number;
  readonly requiredLabelIds: readonly string[];
  readonly minParticipantsEnabled: boolean;
  readonly minParticipants?: number;
  readonly termsVersion: string;
  readonly requiresPayment: boolean;
  readonly state: EventState;
  readonly publicationState: PublicationState;
  readonly reservationAvailable: boolean;
  readonly coverAssetId?: string;
  readonly imageRights: {
    readonly state: MediaRightsState;
    readonly sourcePageUrl?: string;
    readonly author?: string;
    readonly license?: string;
    readonly downloadedAt?: string;
    readonly sha256?: string;
    readonly width?: number;
    readonly height?: number;
    readonly alt: string;
  };
  readonly origin: RecordOrigin;
  readonly verificationState: VerificationState;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PrincipalRecord extends TrustedPrincipal {
  readonly userId: UserId;
}

export type VerificationClaimRecord = PublicVerificationClaimProjection;

export interface PaymentConfiguration {
  readonly featureFlag: 'DISABLED' | 'ENABLED';
  readonly subjectQualified: boolean;
  readonly categoryApproved: boolean;
  readonly filingComplete: boolean;
  readonly merchantIdConfigured: boolean;
  readonly certificateConfigured: boolean;
  readonly callbackVerified: boolean;
  readonly reconciliationReady: boolean;
  readonly refundSlaApproved: boolean;
}

export interface StoredEnrollmentRecord {
  readonly _id: string;
  readonly eventId: string;
  readonly userId: UserId;
  readonly state: EnrollmentState;
  readonly paymentState: PaymentState;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface StoredIdempotencyRecord extends ExistingIdempotencyRecord {
  readonly response: EnrollmentProjection;
}

export interface EventAuditRecord {
  readonly _id: string;
  readonly actorUserId: UserId;
  readonly actorRole: 'MEMBER' | 'ORGANIZER' | 'REVIEWER' | 'ADMIN';
  readonly action: 'event.registerInterest' | 'event.cancelInterest';
  readonly targetType: 'EVENT_ENROLLMENT';
  readonly targetId: string;
  readonly requestId: string;
  readonly occurredAt: string;
  readonly result: 'SUCCEEDED';
}

export interface EventApiSeed {
  readonly cityOverlays: readonly CityOperationalOverlay[];
  readonly clubNodes?: readonly ClubNodeRecord[];
  readonly organizers?: readonly OrganizerRecord[];
  readonly events?: readonly EventRecord[];
  readonly principals?: readonly PrincipalRecord[];
  readonly claims?: readonly VerificationClaimRecord[];
  readonly dirtyVerificationUserIds?: readonly UserId[];
  readonly enrollments?: readonly StoredEnrollmentRecord[];
  readonly blockedEventUsers?: readonly { readonly eventId: string; readonly userId: UserId }[];
  readonly payment?: PaymentConfiguration;
}

const SEED_TIME = '2026-08-27T00:00:00Z';
export const DEFAULT_CITY_OVERLAYS: readonly CityOperationalOverlay[] = Object.freeze(
  CITY_DIRECTORY.map((city) => Object.freeze({
    _id: city.id,
    operationalState: OperationalState.PLANNED,
    version: 1,
    createdAt: SEED_TIME,
    updatedAt: SEED_TIME,
  })),
);

export const DEFAULT_PAYMENT_CONFIGURATION: PaymentConfiguration = Object.freeze({
  featureFlag: 'DISABLED',
  subjectQualified: false,
  categoryApproved: false,
  filingComplete: false,
  merchantIdConfigured: false,
  certificateConfigured: false,
  callbackVerified: false,
  reconciliationReady: false,
  refundSlaApproved: false,
});

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isUtc(value: unknown): value is string {
  return typeof value === 'string' && UTC_PATTERN.test(value) && !Number.isNaN(Date.parse(value));
}

function isStableId(value: unknown): value is string {
  return typeof value === 'string' && STABLE_ID_PATTERN.test(value);
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function exactKeys(record: Readonly<Record<string, unknown>>, expected: readonly string[]): boolean {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

export function assertFrozenCityOverlays(value: unknown): asserts value is readonly CityOperationalOverlay[] {
  if (!Array.isArray(value) || value.length !== CITY_DIRECTORY.length) {
    throw new Error('cities seed must contain exactly the frozen 13 operational overlays');
  }
  const expectedIds = CITY_DIRECTORY.map((city) => city.id);
  const actualIds: string[] = [];
  for (const entry of value) {
    if (!isPlainRecord(entry)
      || !exactKeys(entry, ['_id', 'operationalState', 'version', 'createdAt', 'updatedAt'])) {
      throw new Error('cities seed may contain operational overlay fields only');
    }
    if (typeof entry._id !== 'string') throw new Error('cities seed contains an invalid city id');
    actualIds.push(entry._id);
    if (!CITY_STATES.has(String(entry.operationalState))
      || !Number.isSafeInteger(entry.version) || Number(entry.version) < 1
      || !isUtc(entry.createdAt) || !isUtc(entry.updatedAt)) {
      throw new Error(`cities seed contains invalid data for ${entry._id}`);
    }
  }
  if (new Set(actualIds).size !== actualIds.length
    || actualIds.some((id, index) => id !== expectedIds[index])) {
    throw new Error('cities seed ids must match frozen directory order without drift');
  }
}

function assertVersioned(record: { readonly version: number; readonly createdAt: string; readonly updatedAt: string }): void {
  if (!Number.isSafeInteger(record.version) || record.version < 1
    || !isUtc(record.createdAt) || !isUtc(record.updatedAt)) {
    throw new Error('record has an invalid version or timestamp');
  }
}

function assertUniqueIds<T extends { readonly _id: string }>(label: string, records: readonly T[]): void {
  if (new Set(records.map((record) => record._id)).size !== records.length) {
    throw new Error(`${label} seed contains duplicate ids`);
  }
}

export function assertEventApiSeed(seed: EventApiSeed): void {
  assertFrozenCityOverlays(seed.cityOverlays);
  const nodes = seed.clubNodes ?? [];
  const organizers = seed.organizers ?? [];
  const events = seed.events ?? [];
  const claims = seed.claims ?? [];
  assertUniqueIds('club_nodes', nodes);
  assertUniqueIds('organizers', organizers);
  assertUniqueIds('events', events);
  if (new Set(claims.map((claim) => claim.claimId)).size !== claims.length) {
    throw new Error('verification claim seed contains duplicate ids');
  }
  for (const claim of claims) parseReadOnlyProjection('PublicVerificationClaimProjection', claim);
  if (new Set(seed.dirtyVerificationUserIds ?? []).size !== (seed.dirtyVerificationUserIds ?? []).length
    || (seed.dirtyVerificationUserIds ?? []).some((userId) => !isStableId(userId))) {
    throw new Error('dirty verification user seed contains invalid ids');
  }
  const nodeMap = new Map(nodes.map((node) => [node._id, node] as const));
  const organizerMap = new Map(organizers.map((organizer) => [organizer._id, organizer] as const));
  const overlayMap = new Map(seed.cityOverlays.map((overlay) => [overlay._id, overlay] as const));
  if (new Set(nodes.map((node) => node.cityId)).size !== nodes.length) {
    throw new Error('club_nodes seed must contain at most one AB Club node per frozen city');
  }
  for (const node of nodes) {
    if (!isStableId(node._id) || !CITY_BY_ID.has(node.cityId)) {
      throw new Error(`club node ${node._id} contains directory drift`);
    }
    const overlay = overlayMap.get(node.cityId);
    const organizer = node.organizerId === undefined ? undefined : organizerMap.get(node.organizerId);
    if (overlay === undefined || overlay.operationalState !== node.operationalState
      || (node.organizerId !== undefined
        && (organizer === undefined || !organizer.cityIds.includes(node.cityId)))) {
      throw new Error(`club node ${node._id} has inconsistent city operations or organizer scope`);
    }
    assertVersioned(node);
  }
  for (const organizer of organizers) {
    if (!isStableId(organizer._id) || !isStableId(organizer.ownerUserId)
      || organizer.name.zh.trim().length === 0 || organizer.name.en.trim().length === 0
      || organizer.summary.trim().length === 0 || organizer.cityIds.length === 0
      || new Set(organizer.cityIds).size !== organizer.cityIds.length
      || organizer.cityIds.some((cityId) => !CITY_BY_ID.has(cityId))) {
      throw new Error(`organizer ${organizer._id} contains directory drift`);
    }
    assertVersioned(organizer);
  }
  for (const event of events) {
    const city = CITY_BY_ID.get(event.cityId);
    const node = nodeMap.get(event.clubNodeId);
    if (city === undefined || node === undefined || node.cityId !== event.cityId
      || !organizerMap.has(event.organizerId)
      || node.organizerId !== event.organizerId) {
      throw new Error(`event ${event._id} violates frozen hierarchy`);
    }
    if (!isStableId(event._id) || !isStableId(event.organizerId) || !isStableId(event.clubNodeId)
      || event.title.trim().length === 0 || event.summary.trim().length === 0
      || event.addressScope.trim().length === 0 || event.source.label.trim().length === 0
      || !isUtc(event.source.retrievedAt) || !isUtc(event.startsAt) || !isUtc(event.endsAt)
      || Date.parse(event.endsAt) <= Date.parse(event.startsAt) || event.timezone !== city.timezone
      || !Number.isSafeInteger(event.capacity) || event.capacity < 1
      || !event.requiredLabelIds.every(isStableId) || event.termsVersion.trim().length === 0
      || !['INTEREST', 'OFFICIAL_URL', 'WECHAT_PAYMENT'].includes(event.registrationMethod)
      || typeof event.minParticipantsEnabled !== 'boolean'
      || typeof event.requiresPayment !== 'boolean'
      || typeof event.reservationAvailable !== 'boolean'
      || event.imageRights.alt.trim().length === 0
      || !['OFFICIAL_ORGANIZER', 'AUTHORIZED_PARTNER', 'INTERNAL_DEMO'].includes(event.source.kind)
      || !['VERIFIED', 'CONTENT_LIVE_UNVERIFIED', 'DEMO_ONLY'].includes(event.source.contentStatus)
      || !Object.values(EventState).includes(event.state)
      || !Object.values(PublicationState).includes(event.publicationState)
      || !Object.values(RecordOrigin).includes(event.origin)
      || !Object.values(VerificationState).includes(event.verificationState)
      || !Object.values(MediaRightsState).includes(event.imageRights.state)) {
      throw new Error(`event ${event._id} is missing required fields`);
    }
    if (event.registrationMethod === 'INTEREST' && event.termsVersion !== EVENT_INTEREST_TERMS_VERSION) {
      throw new Error(`event ${event._id} uses an unsupported interest terms version`);
    }
    if (event.requiresPayment !== (event.registrationMethod === 'WECHAT_PAYMENT')) {
      throw new Error(`event ${event._id} has inconsistent payment registration fields`);
    }
    if (event.registrationMethod === 'OFFICIAL_URL' && !isHttpsUrl(event.officialRegistrationUrl)) {
      throw new Error(`event ${event._id} requires an official registration URL`);
    }
    if (event.registrationMethod !== 'OFFICIAL_URL' && event.officialRegistrationUrl !== undefined) {
      throw new Error(`event ${event._id} has an unexpected official registration URL`);
    }
    if (event.minParticipantsEnabled) {
      if (!Number.isSafeInteger(event.minParticipants) || Number(event.minParticipants) < 1
        || Number(event.minParticipants) > event.capacity) {
        throw new Error(`event ${event._id} has invalid minParticipants`);
      }
    } else if (event.minParticipants !== undefined) {
      throw new Error(`event ${event._id} must omit minParticipants while disabled`);
    }
    if (event.coverAssetId !== undefined) {
      if (event.imageRights.state !== MediaRightsState.APPROVED
        || !isHttpsUrl(event.imageRights.sourcePageUrl) || !event.imageRights.author || !event.imageRights.license
        || !isUtc(event.imageRights.downloadedAt)
        || typeof event.imageRights.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(event.imageRights.sha256)
        || !Number.isSafeInteger(event.imageRights.width) || Number(event.imageRights.width) < 1
        || !Number.isSafeInteger(event.imageRights.height) || Number(event.imageRights.height) < 1) {
        throw new Error(`event ${event._id} cannot use an image without complete approved rights evidence`);
      }
    }
    if (event.state === EventState.PUBLISHED || event.publicationState === PublicationState.PUBLISHED) {
      const organizer = organizerMap.get(event.organizerId);
      const overlay = overlayMap.get(event.cityId);
      if (event.state !== EventState.PUBLISHED || event.publicationState !== PublicationState.PUBLISHED
        || event.origin !== RecordOrigin.REAL
        || event.verificationState !== VerificationState.HUMAN_REVIEWED
        || event.source.contentStatus !== 'VERIFIED' || !isHttpsUrl(event.source.sourcePageUrl)
         || organizer === undefined || organizer.reviewStatus !== ReviewStatus.APPROVED
         || organizer.verificationState !== VerificationState.HUMAN_REVIEWED
         || !organizer.cityIds.includes(event.cityId)
         || node.reviewStatus !== ReviewStatus.APPROVED
         || !OPERATING_STATES.has(node.operationalState)
         || overlay === undefined || !OPERATING_STATES.has(overlay.operationalState)
         || overlay.operationalState !== node.operationalState) {
        throw new Error(`event ${event._id} cannot be published without complete human approval and source evidence`);
      }
    } else if (event.reservationAvailable) {
      throw new Error(`event ${event._id} cannot accept reservations before publication`);
    }
    assertVersioned(event);
  }
}

interface EventApiReadStore {
  listCityOverlays(): Promise<readonly CityOperationalOverlay[]>;
  getCityOverlay(cityId: CityId): Promise<CityOperationalOverlay | undefined>;
  getNodeByCity(cityId: CityId): Promise<ClubNodeRecord | undefined>;
  getNode(nodeId: string): Promise<ClubNodeRecord | undefined>;
  getOrganizer(organizerId: string): Promise<OrganizerRecord | undefined>;
  listEvents(): Promise<readonly EventRecord[]>;
  getEvent(eventId: string): Promise<EventRecord | undefined>;
  loadPrincipal(openId: string): Promise<TrustedPrincipal | null>;
  listClaims(userId: UserId): Promise<readonly VerificationClaimRecord[]>;
  hasDirtyVerificationProjection(userId: UserId): Promise<boolean>;
  getEnrollment(eventId: string, userId: UserId): Promise<StoredEnrollmentRecord | undefined>;
  countActiveEnrollments(eventId: string): Promise<number>;
  isBlocked(eventId: string, userId: UserId): Promise<boolean>;
  getPaymentConfiguration(): Promise<PaymentConfiguration>;
}

interface EventApiTransaction extends EventApiReadStore {
  getIdempotency(namespace: string): Promise<StoredIdempotencyRecord | null>;
  saveIdempotency(record: StoredIdempotencyRecord): Promise<void>;
  saveEnrollment(record: StoredEnrollmentRecord): Promise<void>;
  appendAudit(record: EventAuditRecord): Promise<void>;
}

export interface EventApiStore extends EventApiReadStore {
  runTransaction<T>(operation: (transaction: EventApiTransaction) => Promise<T>): Promise<T>;
}

class InMemoryEventApiStore implements EventApiStore {
  private readonly cityOverlays: Map<string, CityOperationalOverlay>;
  private readonly nodes: Map<string, ClubNodeRecord>;
  private readonly organizers: Map<string, OrganizerRecord>;
  private readonly events: Map<string, EventRecord>;
  private readonly principals: Map<string, PrincipalRecord>;
  private readonly claims: readonly VerificationClaimRecord[];
  private readonly dirtyVerificationUserIds: ReadonlySet<UserId>;
  private enrollments: Map<string, StoredEnrollmentRecord>;
  private idempotency = new Map<string, StoredIdempotencyRecord>();
  private audits: EventAuditRecord[] = [];
  private readonly blocked: ReadonlySet<string>;
  private readonly payment: PaymentConfiguration;
  private transactionTail: Promise<void> = Promise.resolve();

  constructor(seed: EventApiSeed) {
    assertEventApiSeed(seed);
    this.cityOverlays = new Map(seed.cityOverlays.map((record) => [record._id, clone(record)]));
    this.nodes = new Map((seed.clubNodes ?? []).map((record) => [record._id, clone(record)]));
    this.organizers = new Map((seed.organizers ?? []).map((record) => [record._id, clone(record)]));
    this.events = new Map((seed.events ?? []).map((record) => [record._id, clone(record)]));
    this.principals = new Map((seed.principals ?? []).map((record) => [record.openId, clone(record)]));
    this.claims = clone(seed.claims ?? []);
    this.dirtyVerificationUserIds = new Set(seed.dirtyVerificationUserIds ?? []);
    this.enrollments = new Map((seed.enrollments ?? []).map((record) => [this.key(record.eventId, record.userId), clone(record)]));
    this.blocked = new Set((seed.blockedEventUsers ?? []).map((entry) => `${entry.eventId}:${entry.userId}`));
    this.payment = clone(seed.payment ?? DEFAULT_PAYMENT_CONFIGURATION);
  }

  private key(eventId: string, userId: UserId): string { return `${eventId}:${userId}`; }
  async listCityOverlays(): Promise<readonly CityOperationalOverlay[]> { return clone([...this.cityOverlays.values()]); }
  async getCityOverlay(cityId: CityId): Promise<CityOperationalOverlay | undefined> {
    const value = this.cityOverlays.get(cityId); return value === undefined ? undefined : clone(value);
  }
  async getNodeByCity(cityId: CityId): Promise<ClubNodeRecord | undefined> {
    const value = [...this.nodes.values()].find((record) => record.cityId === cityId);
    return value === undefined ? undefined : clone(value);
  }
  async getNode(nodeId: string): Promise<ClubNodeRecord | undefined> {
    const value = this.nodes.get(nodeId); return value === undefined ? undefined : clone(value);
  }
  async getOrganizer(organizerId: string): Promise<OrganizerRecord | undefined> {
    const value = this.organizers.get(organizerId); return value === undefined ? undefined : clone(value);
  }
  async listEvents(): Promise<readonly EventRecord[]> { return clone([...this.events.values()]); }
  async getEvent(eventId: string): Promise<EventRecord | undefined> {
    const value = this.events.get(eventId); return value === undefined ? undefined : clone(value);
  }
  async loadPrincipal(openId: string): Promise<TrustedPrincipal | null> {
    const value = this.principals.get(openId); return value === undefined ? null : clone(value);
  }
  async listClaims(userId: UserId): Promise<readonly VerificationClaimRecord[]> {
    return clone(this.claims.filter((claim) => claim.subjectUserId === userId));
  }
  async hasDirtyVerificationProjection(userId: UserId): Promise<boolean> {
    return this.dirtyVerificationUserIds.has(userId);
  }
  async getEnrollment(eventId: string, userId: UserId): Promise<StoredEnrollmentRecord | undefined> {
    const value = this.enrollments.get(this.key(eventId, userId)); return value === undefined ? undefined : clone(value);
  }
  async countActiveEnrollments(eventId: string): Promise<number> {
    return [...this.enrollments.values()].filter((record) => record.eventId === eventId && ACTIVE_ENROLLMENTS.has(record.state)).length;
  }
  async isBlocked(eventId: string, userId: UserId): Promise<boolean> { return this.blocked.has(`${eventId}:${userId}`); }
  async getPaymentConfiguration(): Promise<PaymentConfiguration> { return clone(this.payment); }

  async runTransaction<T>(operation: (transaction: EventApiTransaction) => Promise<T>): Promise<T> {
    let unlock: (() => void) | undefined;
    const ticket = new Promise<void>((resolve) => { unlock = resolve; });
    const previous = this.transactionTail;
    this.transactionTail = previous.then(() => ticket);
    await previous;
    const enrollments = new Map([...this.enrollments.entries()].map(([key, value]) => [key, clone(value)]));
    const idempotency = new Map([...this.idempotency.entries()].map(([key, value]) => [key, clone(value)]));
    const audits = clone(this.audits);
    const base = this;
    const transaction: EventApiTransaction = {
      listCityOverlays: () => base.listCityOverlays(),
      getCityOverlay: (cityId) => base.getCityOverlay(cityId),
      getNodeByCity: (cityId) => base.getNodeByCity(cityId),
      getNode: (nodeId) => base.getNode(nodeId),
      getOrganizer: (organizerId) => base.getOrganizer(organizerId),
      listEvents: () => base.listEvents(),
      getEvent: (eventId) => base.getEvent(eventId),
      loadPrincipal: (openId) => base.loadPrincipal(openId),
      listClaims: (userId) => base.listClaims(userId),
      hasDirtyVerificationProjection: (userId) => base.hasDirtyVerificationProjection(userId),
      getEnrollment: async (eventId, userId) => {
        const value = enrollments.get(base.key(eventId, userId)); return value === undefined ? undefined : clone(value);
      },
      countActiveEnrollments: async (eventId) => [...enrollments.values()]
        .filter((record) => record.eventId === eventId && ACTIVE_ENROLLMENTS.has(record.state)).length,
      isBlocked: (eventId, userId) => base.isBlocked(eventId, userId),
      getPaymentConfiguration: () => base.getPaymentConfiguration(),
      getIdempotency: async (namespace) => {
        const value = idempotency.get(namespace); return value === undefined ? null : clone(value);
      },
      saveIdempotency: async (record) => { idempotency.set(record.namespace, clone(record)); },
      saveEnrollment: async (record) => { enrollments.set(base.key(record.eventId, record.userId), clone(record)); },
      appendAudit: async (record) => { audits.push(clone(record)); },
    };
    try {
      const result = await operation(transaction);
      this.enrollments = enrollments;
      this.idempotency = idempotency;
      this.audits = audits;
      return clone(result);
    } finally {
      if (unlock !== undefined) unlock();
    }
  }

  snapshot(): { readonly enrollments: readonly StoredEnrollmentRecord[]; readonly audits: readonly EventAuditRecord[] } {
    return clone({ enrollments: [...this.enrollments.values()], audits: this.audits });
  }
}

export function createInMemoryEventApiStore(seed: EventApiSeed): EventApiStore & {
  snapshot(): { readonly enrollments: readonly StoredEnrollmentRecord[]; readonly audits: readonly EventAuditRecord[] };
} {
  return new InMemoryEventApiStore(seed);
}

function invalid(field: string, reason: string): never {
  throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, 'The request payload is invalid.', {
    details: { code: ApiErrorCode.INVALID_REQUEST, field, reason },
  });
}

function notFound(resourceType: string, resourceId?: string): never {
  throw new SafeApiError(ApiErrorCode.NOT_FOUND, 'The requested resource was not found.', {
    details: {
      code: ApiErrorCode.NOT_FOUND,
      resourceType,
      ...(resourceId === undefined ? {} : { resourceId: resourceId as StableId }),
    },
  });
}

function assertPayload(
  payload: Readonly<Record<string, unknown>>,
  allowed: readonly string[],
  required: readonly string[] = [],
): void {
  const allowedKeys = new Set(['contractVersion', ...allowed]);
  const extra = Object.keys(payload).find((key) => !allowedKeys.has(key));
  if (extra !== undefined) invalid(extra, 'UNEXPECTED_FIELD');
  const missing = required.find((key) => !(key in payload));
  if (missing !== undefined) invalid(missing, 'REQUIRED');
  if (payload.contractVersion !== undefined && payload.contractVersion !== '1.0.0') {
    invalid('contractVersion', 'CONTRACT_VERSION_MISMATCH');
  }
}

function requireString(payload: Readonly<Record<string, unknown>>, field: string): string {
  const value = payload[field];
  if (typeof value !== 'string' || value.trim().length === 0) invalid(field, 'NON_EMPTY_STRING_REQUIRED');
  return value;
}

function requireStableId(payload: Readonly<Record<string, unknown>>, field: string): string {
  const value = requireString(payload, field);
  if (!isStableId(value)) invalid(field, 'MALFORMED_STABLE_ID');
  return value;
}

function requireCityId(value: unknown, field = 'cityId'): CityId {
  if (typeof value !== 'string' || !CITY_BY_ID.has(value as CityId)) invalid(field, 'FROZEN_CITY_ID_REQUIRED');
  return value as CityId;
}

function requireCountryId(value: unknown): CountryId {
  if (typeof value !== 'string' || !COUNTRY_BY_ID.has(value as CountryId)) invalid('countryId', 'FROZEN_COUNTRY_ID_REQUIRED');
  return value as CountryId;
}

function requireRegionId(value: unknown): RegionId {
  if (typeof value !== 'string' || !REGION_BY_ID.has(value as RegionId)) invalid('regionId', 'FROZEN_REGION_ID_REQUIRED');
  return value as RegionId;
}

function requireUtc(payload: Readonly<Record<string, unknown>>, field: string): string {
  const value = payload[field];
  if (!isUtc(value)) invalid(field, 'RFC3339_UTC_REQUIRED');
  return value;
}

function requirePositiveVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    throw new SafeApiError(ApiErrorCode.VALIDATION_FAILED, 'expectedVersion must be a positive integer.', {
      details: { code: ApiErrorCode.VALIDATION_FAILED, issues: [{ field: 'expectedVersion', rule: 'POSITIVE_INTEGER' }] },
    });
  }
  return Number(value);
}

function optionalPositiveVersion(value: unknown): number | undefined {
  return value === undefined ? undefined : requirePositiveVersion(value);
}

function regions(): readonly RegionProjection[] {
  return REGION_DIRECTORY.map((region) => Object.freeze({ id: region.id, name: clone(region.name) }));
}

function countries(regionId?: RegionId): readonly CountryProjection[] {
  return COUNTRY_DIRECTORY
    .filter((country) => regionId === undefined || country.parentId === regionId)
    .map((country) => Object.freeze({ id: country.id, regionId: country.parentId, name: clone(country.name) }));
}

async function cityProjection(store: EventApiReadStore, cityId: CityId): Promise<CityProjection> {
  const city = CITY_BY_ID.get(cityId);
  if (city === undefined) notFound('CITY', cityId);
  const overlay = await store.getCityOverlay(cityId);
  if (overlay === undefined) throw new Error(`missing operational overlay for ${cityId}`);
  return Object.freeze({
    id: city.id,
    countryId: city.parentId,
    regionId: city.regionId,
    name: clone(city.name),
    timezone: city.timezone,
    operationalState: overlay.operationalState,
  });
}

function approvedOrganizer(record: OrganizerRecord | undefined): record is OrganizerRecord {
  return record !== undefined
    && record.reviewStatus === ReviewStatus.APPROVED
    && record.verificationState === VerificationState.HUMAN_REVIEWED;
}

function organizerProjection(record: OrganizerRecord): PublicOrganizerProjection {
  const organizerId = record._id;
  if (!approvedOrganizer(record)) notFound('ORGANIZER', organizerId);
  return Object.freeze({
    organizerId: record._id as OrganizerId,
    name: clone(record.name),
    summary: record.summary,
    cityIds: Object.freeze([...record.cityIds]),
    reviewStatus: ReviewStatus.APPROVED,
    verificationState: VerificationState.HUMAN_REVIEWED,
    version: record.version as OptimisticVersion,
    createdAt: record.createdAt as UtcInstant,
    updatedAt: record.updatedAt as UtcInstant,
  });
}

function paymentReady(configuration: PaymentConfiguration): boolean {
  return configuration.featureFlag === 'ENABLED'
    && configuration.subjectQualified === true
    && configuration.categoryApproved === true
    && configuration.filingComplete === true
    && configuration.merchantIdConfigured === true
    && configuration.certificateConfigured === true
    && configuration.callbackVerified === true
    && configuration.reconciliationReady === true
    && configuration.refundSlaApproved === true;
}

async function isEventPublic(store: EventApiReadStore, event: EventRecord): Promise<boolean> {
  if (event.state !== EventState.PUBLISHED
    || event.publicationState !== PublicationState.PUBLISHED
    || event.origin !== RecordOrigin.REAL
    || event.verificationState !== VerificationState.HUMAN_REVIEWED
    || event.source.contentStatus !== 'VERIFIED'
    || !isHttpsUrl(event.source.sourcePageUrl)) return false;
  const [overlay, node, organizer] = await Promise.all([
    store.getCityOverlay(event.cityId),
    store.getNode(event.clubNodeId),
    store.getOrganizer(event.organizerId),
  ]);
  return overlay !== undefined
    && OPERATING_STATES.has(overlay.operationalState)
    && node !== undefined
    && node.cityId === event.cityId
    && node.organizerId === event.organizerId
    && node.reviewStatus === ReviewStatus.APPROVED
    && OPERATING_STATES.has(node.operationalState)
    && node.operationalState === overlay.operationalState
    && approvedOrganizer(organizer)
    && organizer.cityIds.includes(event.cityId)
    && (event.coverAssetId === undefined || (
      event.imageRights.state === MediaRightsState.APPROVED
      && isHttpsUrl(event.imageRights.sourcePageUrl)
      && Boolean(event.imageRights.author?.trim())
      && Boolean(event.imageRights.license?.trim())
      && isUtc(event.imageRights.downloadedAt)
      && typeof event.imageRights.sha256 === 'string'
      && /^[a-f0-9]{64}$/i.test(event.imageRights.sha256)
      && Number.isSafeInteger(event.imageRights.width)
      && Number(event.imageRights.width) > 0
      && Number.isSafeInteger(event.imageRights.height)
      && Number(event.imageRights.height) > 0
      && event.imageRights.alt.trim().length > 0
    ));
}

function eventProjection(event: EventRecord, now: string): PublicEventProjection {
  const projection = {
    eventId: event._id as EventId,
    clubNodeId: event.clubNodeId as StableId<'club-node'>,
    organizerId: event.organizerId as OrganizerId,
    cityId: event.cityId,
    title: event.title,
    summary: event.summary,
    startsAt: event.startsAt as UtcInstant,
    endsAt: event.endsAt as UtcInstant,
    timezone: event.timezone as PublicEventProjection['timezone'],
    state: EventState.PUBLISHED,
    publicationState: PublicationState.PUBLISHED,
    reservationAvailable: event.reservationAvailable
      && event.registrationMethod === 'INTEREST'
      && Date.parse(event.startsAt) > Date.parse(now),
    ...(event.coverAssetId === undefined ? {} : { coverAssetId: event.coverAssetId as StableId<'media-asset'> }),
    origin: RecordOrigin.REAL,
    verificationState: event.verificationState,
    version: event.version as OptimisticVersion,
    createdAt: event.createdAt as UtcInstant,
    updatedAt: event.updatedAt as UtcInstant,
  } satisfies PublicEventProjection;
  return parseReadOnlyProjection('PublicEventProjection', projection);
}

function enrollmentProjection(record: StoredEnrollmentRecord): EnrollmentProjection {
  return Object.freeze({
    enrollmentId: record._id as EnrollmentId,
    eventId: record.eventId as EventId,
    userId: record.userId,
    state: record.state,
    paymentState: record.paymentState,
    version: record.version as OptimisticVersion,
    createdAt: record.createdAt as UtcInstant,
    updatedAt: record.updatedAt as UtcInstant,
  });
}

function effectiveClaims(
  claims: readonly VerificationClaimRecord[],
  now: string,
): readonly VerificationClaimRecord[] {
  return claims
    .map((claim) => parseReadOnlyProjection('PublicVerificationClaimProjection', claim))
    .filter((claim) => (
    Date.parse(claim.validFrom) <= Date.parse(now)
    && (claim.validUntil === undefined || Date.parse(now) < Date.parse(claim.validUntil))
  ));
}

async function effectiveClaimsForUser(
  store: EventApiReadStore,
  userId: UserId,
  now: string,
): Promise<readonly VerificationClaimRecord[]> {
  if (await store.hasDirtyVerificationProjection(userId)) return Object.freeze([]);
  return effectiveClaims(await store.listClaims(userId), now);
}

async function evaluateEligibility(
  store: EventApiReadStore,
  event: EventRecord,
  userId: UserId,
  now: string,
): Promise<EventEligibilityProjection> {
  if (!await isEventPublic(store, event)
    || Date.parse(event.startsAt) <= Date.parse(now)
    || !event.reservationAvailable
    || event.registrationMethod !== 'INTEREST') {
    return Object.freeze({
      eventId: event._id as EventId,
      eligible: false,
      evaluatedAt: now as UtcInstant,
      requiredLabelIds: Object.freeze([]),
      satisfiedClaimIds: Object.freeze([]),
      failureReason: 'EVENT_UNAVAILABLE',
    });
  }
  const requiredLabelIds = Object.freeze(event.requiredLabelIds.map((id) => id as StableId<'label'>));
  if (await store.isBlocked(event._id, userId)) {
    return Object.freeze({
      eventId: event._id as EventId,
      eligible: false,
      evaluatedAt: now as UtcInstant,
      requiredLabelIds,
      satisfiedClaimIds: Object.freeze([]),
      failureReason: 'BLOCKED',
    });
  }
  const claims = await effectiveClaimsForUser(store, userId, now);
  const matching = claims.filter((claim) => event.requiredLabelIds.includes(claim.labelId));
  const labels = new Set<string>(matching.map((claim) => claim.labelId));
  const eligible = event.requiredLabelIds.every((labelId) => labels.has(labelId));
  return Object.freeze({
    eventId: event._id as EventId,
    eligible,
    evaluatedAt: now as UtcInstant,
    requiredLabelIds,
    satisfiedClaimIds: Object.freeze(matching.map((claim) => claim.claimId)),
    ...(eligible ? {} : { failureReason: 'MISSING_APPROVED_CLAIM' as const }),
  });
}

function actorRole(principal: TrustedPrincipal): EventAuditRecord['actorRole'] {
  for (const role of ['ADMIN', 'REVIEWER', 'ORGANIZER'] as const) {
    if (principal.roles.includes(role)) return role;
  }
  return 'MEMBER';
}

function principalUserId(principal: TrustedPrincipal): UserId {
  if (principal.userId === undefined) {
    throw new SafeApiError(ApiErrorCode.AUTH_REQUIRED, 'A linked user account is required.', {
      details: { code: ApiErrorCode.AUTH_REQUIRED, required: true },
    });
  }
  return principal.userId;
}

function success<T>(requestId: string, data: T): ApiResult<T> {
  return { ok: true, data, requestId: requestId as RequestId };
}

interface CursorPayload { readonly version: 1; readonly offset: number; readonly filter: string }

function encodeCursor(offset: number, filter: string): string {
  return Buffer.from(JSON.stringify({ version: 1, offset, filter } satisfies CursorPayload), 'utf8').toString('base64url');
}

function decodeCursor(value: unknown, expectedFilter: string): number {
  if (typeof value !== 'string' || value.length < 4 || value.length > 512) {
    throw new SafeApiError(ApiErrorCode.INVALID_CURSOR, 'The pagination cursor is malformed.', {
      details: { code: ApiErrorCode.INVALID_CURSOR, reason: 'MALFORMED' },
    });
  }
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    if (!isPlainRecord(parsed) || parsed.version !== 1
      || !Number.isSafeInteger(parsed.offset) || Number(parsed.offset) < 0
      || typeof parsed.filter !== 'string') throw new Error('malformed');
    if (parsed.filter !== expectedFilter) {
      throw new SafeApiError(ApiErrorCode.INVALID_CURSOR, 'The pagination cursor does not match the filters.', {
        details: { code: ApiErrorCode.INVALID_CURSOR, reason: 'FILTER_MISMATCH' },
      });
    }
    return Number(parsed.offset);
  } catch (error) {
    if (error instanceof SafeApiError) throw error;
    throw new SafeApiError(ApiErrorCode.INVALID_CURSOR, 'The pagination cursor is malformed.', {
      details: { code: ApiErrorCode.INVALID_CURSOR, reason: 'MALFORMED' },
    });
  }
}

export interface EventApiDependencies {
  readonly store: EventApiStore;
  readonly now?: () => string;
  readonly getWxContext?: (context: Readonly<Record<string, unknown>> | undefined) => TrustedWxContext;
}

export interface ImplementedEventApi {
  readonly actions: typeof ACTIONS;
  readonly main: (event: unknown, context?: Readonly<Record<string, unknown>>) => Promise<ApiResult<unknown>>;
}

export function createEventApi(dependencies: EventApiDependencies): ImplementedEventApi {
  const now = dependencies.now ?? (() => new Date().toISOString());
  const getWxContext = dependencies.getWxContext ?? ((context) => ({
    ...(typeof context?.OPENID === 'string' ? { OPENID: context.OPENID } : {}),
  }));

  async function authenticate(context: Readonly<Record<string, unknown>> | undefined): Promise<TrustedPrincipal> {
    return requireTrustedPrincipal(
      () => getWxContext(context),
      (openId) => dependencies.store.loadPrincipal(openId),
    );
  }

  async function implementedMain(
    rawEvent: unknown,
    context?: Readonly<Record<string, unknown>>,
  ): Promise<ApiResult<unknown>> {
    let responseRequestId = `srv_event_${Date.now()}` as RequestId;
    try {
      const request = validateCallEnvelope(rawEvent, ACTIONS);
      responseRequestId = request.requestId as RequestId;
      const payload = request.payload;

      switch (request.action) {
        case 'geo.listRegions': {
          assertPayload(payload, ['includeOperationalSummary'], ['includeOperationalSummary']);
          if (typeof payload.includeOperationalSummary !== 'boolean') invalid('includeOperationalSummary', 'BOOLEAN_REQUIRED');
          await dependencies.store.listCityOverlays();
          return success(request.requestId, { regions: regions() });
        }
        case 'geo.listCountries': {
          assertPayload(payload, ['regionId']);
          const regionId = payload.regionId === undefined ? undefined : requireRegionId(payload.regionId);
          return success(request.requestId, { countries: countries(regionId) });
        }
        case 'geo.listCities': {
          assertPayload(payload, ['regionId', 'countryId']);
          const regionId = payload.regionId === undefined ? undefined : requireRegionId(payload.regionId);
          const countryId = payload.countryId === undefined ? undefined : requireCountryId(payload.countryId);
          if (regionId !== undefined && countryId !== undefined
            && COUNTRY_BY_ID.get(countryId)?.parentId !== regionId) invalid('countryId', 'FILTER_CONFLICT');
          const selected = CITY_DIRECTORY.filter((city) => (
            (regionId === undefined || city.regionId === regionId)
            && (countryId === undefined || city.parentId === countryId)
          ));
          const cities = await Promise.all(selected.map((city) => cityProjection(dependencies.store, city.id)));
          return success(request.requestId, { cities });
        }
        case 'geo.getNode': {
          assertPayload(payload, ['cityId'], ['cityId']);
          const cityId = requireCityId(payload.cityId);
          const city = await cityProjection(dependencies.store, cityId);
          const record = await dependencies.store.getNodeByCity(cityId);
          let node: PublicClubNodeProjection | undefined;
          if (record !== undefined && record.reviewStatus === ReviewStatus.APPROVED
            && record.organizerId !== undefined
            && record.operationalState === city.operationalState) {
            const organizer = await dependencies.store.getOrganizer(record.organizerId);
            if (approvedOrganizer(organizer) && organizer.cityIds.includes(cityId)) {
              node = Object.freeze({
                nodeId: record._id as StableId<'club-node'>,
                cityId,
                name: clone(record.name),
                operationalState: record.operationalState,
                organizer: organizerProjection(organizer),
                version: record.version as OptimisticVersion,
                createdAt: record.createdAt as UtcInstant,
                updatedAt: record.updatedAt as UtcInstant,
              });
            }
          }
          return success(request.requestId, { city, ...(node === undefined ? {} : { node }) });
        }
        case 'event.list': {
          assertPayload(payload, ['cityId', 'startsAfter', 'startsBefore', 'cursor', 'limit'], ['limit']);
          if (!Number.isSafeInteger(payload.limit) || Number(payload.limit) < 1 || Number(payload.limit) > 50) {
            invalid('limit', 'INTEGER_1_TO_50_REQUIRED');
          }
          const cityId = payload.cityId === undefined ? undefined : requireCityId(payload.cityId);
          const startsAfter = payload.startsAfter === undefined ? undefined : requireUtc(payload, 'startsAfter');
          const startsBefore = payload.startsBefore === undefined ? undefined : requireUtc(payload, 'startsBefore');
          if (startsAfter !== undefined && startsBefore !== undefined
            && Date.parse(startsAfter) >= Date.parse(startsBefore)) invalid('startsBefore', 'MUST_BE_AFTER_STARTS_AFTER');
          const filter = JSON.stringify({ cityId: cityId ?? null, startsAfter: startsAfter ?? null, startsBefore: startsBefore ?? null });
          const offset = payload.cursor === undefined ? 0 : decodeCursor(payload.cursor, filter);
          const currentTime = now();
          if (!isUtc(currentTime)) throw new Error('runtime clock must return RFC3339 UTC');
          const candidates = (await dependencies.store.listEvents())
            .filter((event) => cityId === undefined || event.cityId === cityId)
            .filter((event) => startsAfter === undefined || Date.parse(event.startsAt) >= Date.parse(startsAfter))
            .filter((event) => startsBefore === undefined || Date.parse(event.startsAt) < Date.parse(startsBefore))
            .sort((left, right) => left.startsAt.localeCompare(right.startsAt) || left._id.localeCompare(right._id));
          const visible: EventRecord[] = [];
          for (const event of candidates) if (await isEventPublic(dependencies.store, event)) visible.push(event);
          const limit = Number(payload.limit);
          const selected = visible.slice(offset, offset + limit);
          const nextOffset = offset + selected.length;
          const hasMore = nextOffset < visible.length;
          return success(request.requestId, {
            page: {
              items: selected.map((event) => eventProjection(event, currentTime)),
              ...(hasMore ? { nextCursor: encodeCursor(nextOffset, filter) } : {}),
              hasMore,
            },
          });
        }
        case 'event.get': {
          assertPayload(payload, ['eventId'], ['eventId']);
          const eventId = requireStableId(payload, 'eventId');
          const event = await dependencies.store.getEvent(eventId);
          if (event === undefined || !await isEventPublic(dependencies.store, event)) {
            throw new SafeApiError(ApiErrorCode.EVENT_NOT_AVAILABLE, 'The event is not publicly available.', {
              details: { code: ApiErrorCode.EVENT_NOT_AVAILABLE, eventState: 'UNAVAILABLE' },
            });
          }
          const organizer = await dependencies.store.getOrganizer(event.organizerId);
          if (!approvedOrganizer(organizer)) notFound('ORGANIZER', event.organizerId);
          return success(request.requestId, {
            event: eventProjection(event, now()),
            organizer: organizerProjection(organizer),
          });
        }
        case 'event.checkEligibility': {
          assertPayload(payload, ['eventId'], ['eventId']);
          const eventId = requireStableId(payload, 'eventId');
          const principal = await authenticate(context);
          const userId = principalUserId(principal);
          const event = await dependencies.store.getEvent(eventId);
          const evaluatedAt = now();
          if (!isUtc(evaluatedAt)) throw new Error('runtime clock must return RFC3339 UTC');
          if (event === undefined) {
            return success(request.requestId, {
              eligibility: Object.freeze({
                eventId: eventId as EventId,
                eligible: false,
                evaluatedAt: evaluatedAt as UtcInstant,
                requiredLabelIds: Object.freeze([]),
                satisfiedClaimIds: Object.freeze([]),
                failureReason: 'EVENT_UNAVAILABLE' as const,
              }),
            });
          }
          return success(request.requestId, {
            eligibility: await evaluateEligibility(dependencies.store, event, userId, evaluatedAt),
          });
        }
        case 'event.registerInterest': {
          assertPayload(payload, ['eventId', 'acknowledgedTermsVersion', 'idempotencyKey', 'expectedVersion'], [
            'eventId', 'acknowledgedTermsVersion', 'idempotencyKey',
          ]);
          const eventId = requireStableId(payload, 'eventId');
          const termsVersion = requireString(payload, 'acknowledgedTermsVersion');
          const key = requireIdempotencyKey(payload.idempotencyKey);
          const expectedVersion = optionalPositiveVersion(payload.expectedVersion);
          const principal = await authenticate(context);
          const userId = principalUserId(principal);
          const currentTime = now();
          if (!isUtc(currentTime)) throw new Error('runtime clock must return RFC3339 UTC');
          const response = await dependencies.store.runTransaction(async (transaction) => {
            const fingerprintPayload = {
              eventId,
              acknowledgedTermsVersion: termsVersion,
              expectedVersion: expectedVersion ?? null,
              contractVersion: typeof payload.contractVersion === 'string' ? payload.contractVersion : null,
            } satisfies JsonValue;
            const claim = createIdempotencyClaim({
              functionName: 'eventApi', action: 'event.registerInterest', openId: principal.openId,
              key, payload: fingerprintPayload, requestId: request.requestId as RequestId,
              expiresAt: new Date(Date.parse(currentTime) + 86_400_000).toISOString(),
            });
            const stored = await transaction.getIdempotency(claim.namespace);
            const disposition = assertIdempotencyCompatible(claim, stored);
            if (disposition === 'REPLAY' && stored !== null) return stored.response;
            if (disposition === 'IN_PROGRESS') {
              throw new SafeApiError(ApiErrorCode.CONFLICT, 'The request is still in progress.', {
                details: { code: ApiErrorCode.CONFLICT, conflictType: 'IDEMPOTENCY_IN_PROGRESS' },
              });
            }
            const event = await transaction.getEvent(eventId);
            if (event === undefined || !await isEventPublic(transaction, event)
              || Date.parse(event.startsAt) <= Date.parse(currentTime)
              || Date.parse(event.endsAt) <= Date.parse(currentTime)
              || !event.reservationAvailable || event.registrationMethod === 'OFFICIAL_URL') {
              throw new SafeApiError(ApiErrorCode.EVENT_NOT_AVAILABLE, 'The event cannot accept interest.', {
                details: { code: ApiErrorCode.EVENT_NOT_AVAILABLE, eventState: 'UNAVAILABLE' },
              });
            }
            if (expectedVersion !== undefined) requireExpectedVersion(expectedVersion, event.version);
            if (termsVersion !== event.termsVersion) {
              throw new SafeApiError(ApiErrorCode.VALIDATION_FAILED, 'The current terms must be acknowledged.', {
                details: { code: ApiErrorCode.VALIDATION_FAILED, issues: [
                  { field: 'acknowledgedTermsVersion', rule: 'CURRENT_TERMS_VERSION_REQUIRED' },
                ] },
              });
            }
            if (event.registrationMethod === 'WECHAT_PAYMENT'
              && !paymentReady(await transaction.getPaymentConfiguration())) {
              throw new SafeApiError(ApiErrorCode.PAYMENT_DISABLED, 'Payment capability is disabled.', {
                details: { code: ApiErrorCode.PAYMENT_DISABLED, featureFlag: 'payment' },
              });
            }
            const evaluated = await evaluateEligibility(transaction, event, userId, currentTime);
            if (!evaluated.eligible) {
              const claims = await effectiveClaimsForUser(transaction, userId, currentTime);
              const labels = new Set<string>(claims.map((candidate) => candidate.labelId));
              const missing = event.requiredLabelIds.filter((required) => !labels.has(required));
              throw new SafeApiError(ApiErrorCode.ELIGIBILITY_NOT_MET, 'Event eligibility is not met.', {
                details: { code: ApiErrorCode.ELIGIBILITY_NOT_MET, missingLabelIds: missing.map((id) => id as StableId<'label'>) },
              });
            }
            const existing = await transaction.getEnrollment(eventId, userId);
            if (existing !== undefined) {
              throw new SafeApiError(ApiErrorCode.CONFLICT, 'An enrollment already exists for this event.', {
                details: {
                  code: ApiErrorCode.CONFLICT,
                  conflictType: ACTIVE_ENROLLMENTS.has(existing.state)
                    ? 'DUPLICATE_ACTIVE_ENROLLMENT'
                    : 'ENROLLMENT_STATE_TRANSITION',
                },
              });
            }
            if (await transaction.countActiveEnrollments(eventId) >= event.capacity) {
              throw new SafeApiError(ApiErrorCode.CONFLICT, 'The event has reached capacity.', {
                details: { code: ApiErrorCode.CONFLICT, conflictType: 'CAPACITY_REACHED' },
              });
            }
            const enrollment: StoredEnrollmentRecord = {
              _id: `enrollment_${eventId}_${userId}`.slice(0, 120),
              eventId, userId, state: EnrollmentState.INTERESTED,
              paymentState: event.requiresPayment ? PaymentState.PENDING : PaymentState.NOT_REQUIRED,
              version: 1,
              createdAt: currentTime,
              updatedAt: currentTime,
            };
            await transaction.saveEnrollment(enrollment);
            const projection = enrollmentProjection(enrollment);
            await transaction.saveIdempotency({ ...claim, status: 'COMPLETED', response: projection });
            await transaction.appendAudit({
              _id: `audit_${request.requestId}`, actorUserId: userId, actorRole: actorRole(principal),
              action: 'event.registerInterest', targetType: 'EVENT_ENROLLMENT', targetId: enrollment._id,
              requestId: request.requestId, occurredAt: currentTime, result: 'SUCCEEDED',
            });
            return projection;
          });
          return success(request.requestId, { enrollment: response });
        }
        case 'event.cancelInterest': {
          assertPayload(payload, ['eventId', 'reasonCode', 'idempotencyKey', 'expectedVersion'], [
            'eventId', 'idempotencyKey',
          ]);
          const eventId = requireStableId(payload, 'eventId');
          if (payload.reasonCode !== undefined
            && !['SCHEDULE', 'TRAVEL', 'OTHER'].includes(String(payload.reasonCode))) invalid('reasonCode', 'ENUM_REQUIRED');
          const key = requireIdempotencyKey(payload.idempotencyKey);
          const expectedVersion = optionalPositiveVersion(payload.expectedVersion);
          const principal = await authenticate(context);
          const userId = principalUserId(principal);
          const currentTime = now();
          if (!isUtc(currentTime)) throw new Error('runtime clock must return RFC3339 UTC');
          const response = await dependencies.store.runTransaction(async (transaction) => {
            const fingerprintPayload = {
              eventId,
              reasonCode: typeof payload.reasonCode === 'string' ? payload.reasonCode : null,
              expectedVersion: expectedVersion ?? null,
              contractVersion: typeof payload.contractVersion === 'string' ? payload.contractVersion : null,
            } satisfies JsonValue;
            const claim = createIdempotencyClaim({
              functionName: 'eventApi', action: 'event.cancelInterest', openId: principal.openId,
              key, payload: fingerprintPayload, requestId: request.requestId as RequestId,
              expiresAt: new Date(Date.parse(currentTime) + 86_400_000).toISOString(),
            });
            const stored = await transaction.getIdempotency(claim.namespace);
            const disposition = assertIdempotencyCompatible(claim, stored);
            if (disposition === 'REPLAY' && stored !== null) return stored.response;
            if (disposition === 'IN_PROGRESS') {
              throw new SafeApiError(ApiErrorCode.CONFLICT, 'The request is still in progress.', {
                details: { code: ApiErrorCode.CONFLICT, conflictType: 'IDEMPOTENCY_IN_PROGRESS' },
              });
            }
            const existing = await transaction.getEnrollment(eventId, userId);
            if (existing === undefined) {
              throw new SafeApiError(ApiErrorCode.ENROLLMENT_NOT_FOUND, 'No enrollment exists for this event.', {
                details: { code: ApiErrorCode.ENROLLMENT_NOT_FOUND, eventId: eventId as EventId },
              });
            }
            const event = await transaction.getEvent(eventId);
            if (event === undefined) {
              throw new SafeApiError(ApiErrorCode.EVENT_NOT_AVAILABLE, 'The event cannot be cancelled.', {
                details: { code: ApiErrorCode.EVENT_NOT_AVAILABLE, eventState: 'UNAVAILABLE' },
              });
            }
            if (event.state !== EventState.PUBLISHED
              && event.state !== EventState.PAUSED
              && event.state !== EventState.CANCELLED) {
              throw new SafeApiError(ApiErrorCode.CONFLICT, 'The event state does not allow cancellation.', {
                details: { code: ApiErrorCode.CONFLICT, conflictType: 'EVENT_STATE_TRANSITION' },
              });
            }
            if (Date.parse(event.startsAt) <= Date.parse(currentTime)) {
              throw new SafeApiError(ApiErrorCode.CONFLICT, 'Cancellation is closed after the event starts.', {
                details: { code: ApiErrorCode.CONFLICT, conflictType: 'CANCELLATION_WINDOW_CLOSED' },
              });
            }
            if (expectedVersion !== undefined) requireExpectedVersion(expectedVersion, existing.version);
            if (!ACTIVE_ENROLLMENTS.has(existing.state)) {
              throw new SafeApiError(ApiErrorCode.CONFLICT, 'The enrollment cannot be cancelled.', {
                details: { code: ApiErrorCode.CONFLICT, conflictType: 'ENROLLMENT_STATE_TRANSITION' },
              });
            }
            if (existing.paymentState === PaymentState.AUTHORIZED || existing.paymentState === PaymentState.PAID) {
              throw new SafeApiError(ApiErrorCode.CONFLICT, 'Paid enrollment requires the refund workflow.', {
                details: { code: ApiErrorCode.CONFLICT, conflictType: 'REFUND_WORKFLOW_REQUIRED' },
              });
            }
            const enrollment: StoredEnrollmentRecord = {
              ...existing,
              state: EnrollmentState.CANCELLED,
              paymentState: existing.paymentState === PaymentState.PENDING
                ? PaymentState.CANCELLED
                : existing.paymentState,
              version: existing.version + 1,
              updatedAt: currentTime,
            };
            await transaction.saveEnrollment(enrollment);
            const projection = enrollmentProjection(enrollment);
            await transaction.saveIdempotency({ ...claim, status: 'COMPLETED', response: projection });
            await transaction.appendAudit({
              _id: `audit_${request.requestId}`, actorUserId: userId, actorRole: actorRole(principal),
              action: 'event.cancelInterest', targetType: 'EVENT_ENROLLMENT', targetId: enrollment._id,
              requestId: request.requestId, occurredAt: currentTime, result: 'SUCCEEDED',
            });
            return projection;
          });
          return success(request.requestId, { enrollment: response });
        }
        case 'event.getEnrollment': {
          assertPayload(payload, ['eventId'], ['eventId']);
          const eventId = requireStableId(payload, 'eventId');
          const principal = await authenticate(context);
          const userId = principalUserId(principal);
          const enrollment = await dependencies.store.getEnrollment(eventId, userId);
          return success(request.requestId, enrollment === undefined
            ? {}
            : { enrollment: enrollmentProjection(enrollment) });
        }
        case 'organizer.getPublic': {
          assertPayload(payload, ['organizerId'], ['organizerId']);
          const organizerId = requireStableId(payload, 'organizerId');
          const organizer = await dependencies.store.getOrganizer(organizerId);
          if (!approvedOrganizer(organizer)) notFound('ORGANIZER', organizerId);
          return success(request.requestId, { organizer: organizerProjection(organizer) });
        }
        case 'payment.getCapability': {
          assertPayload(payload, ['eventId']);
          await authenticate(context);
          let event: EventRecord | undefined;
          if (payload.eventId !== undefined) {
            const eventId = requireStableId(payload, 'eventId');
            event = await dependencies.store.getEvent(eventId);
            if (event === undefined || !await isEventPublic(dependencies.store, event)) notFound('EVENT', eventId);
          }
          let capability: PaymentCapabilityProjection;
          if (event !== undefined && !event.requiresPayment) {
            capability = Object.freeze({ state: PaymentState.NOT_REQUIRED, enabled: false, reason: 'EVENT_FREE' });
          } else if (paymentReady(await dependencies.store.getPaymentConfiguration())) {
            capability = Object.freeze({ state: PaymentState.PENDING, enabled: true, reason: 'CAPABILITY_AVAILABLE' });
          } else {
            capability = Object.freeze({ state: PaymentState.DISABLED, enabled: false, reason: 'P0_DISABLED' });
          }
          return success(request.requestId, { capability });
        }
      }
    } catch (error) {
      return safeFailureFromError(
        responseRequestId,
        error instanceof Error ? error : new Error('Non-error thrown at eventApi boundary'),
      );
    }
  }

  return Object.freeze({ actions: ACTIONS, main: implementedMain });
}

/**
 * Foundation compatibility entrypoint. It remains fail-closed until final
 * integration injects a CloudBase-backed EventApiStore and trusted WX context.
 * `createEventApi` is the complete transaction-tested feature service.
 */
export const endpoint = createNotImplementedEndpoint('eventApi', ACTIONS);
export const main = endpoint.main;
