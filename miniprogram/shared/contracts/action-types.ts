import type { CityId, CountryId, RegionId } from '../constants/geography';
import type { ApiErrorCode } from '../types/api';
import { ReviewStatus, type EventState } from '../types/enums';
import type {
  CursorPageRequest,
  CardId,
  EventId,
  IdempotentWrite,
  MediaAssetId,
  OptimisticVersion,
  OrganizerId,
  ReportId,
  ReviewCaseId,
  ShareTokenId,
  StableId,
  UtcInstant,
  UserId,
  VerificationRequestId,
} from '../types/primitives';
import type {
  AuditEntryProjection,
  CityProjection,
  ContentCollectionProjection,
  ContentCreatorProjection,
  ContentIntentProjection,
  CountryProjection,
  EnrollmentProjection,
  EventEligibilityProjection,
  FriendRequestProjection,
  LabelDefinitionProjection,
  PaymentCapabilityProjection,
  ProfilePrivateDto,
  PublicCardProjection,
  PublicClubNodeProjection,
  PublicContentProjection,
  PublicEventProjection,
  PublicOrganizerProjection,
  PublicVerificationClaimProjection,
  RegionProjection,
  ReportProjection,
  ReviewCaseProjection,
  SessionProjection,
  ShareResolutionProjection,
  VerificationRequestProjection,
  ViewerRelationshipProjection,
} from '../types/projections';
import type { CursorPage, IdempotencyKey } from '../types/primitives';

interface ContractRequest {
  readonly contractVersion?: '1.0.0';
}

export interface IdentityBootstrapRequest extends ContractRequest, IdempotentWrite {
  readonly requestedRuntime?: 'CLOUD';
}
export interface IdentityBootstrapResponse {
  readonly session: SessionProjection;
  readonly profile?: ProfilePrivateDto;
}

export interface ProfileGetMineRequest extends ContractRequest {
  readonly includeCompletion: boolean;
}
export interface ProfileGetMineResponse {
  readonly profile: ProfilePrivateDto;
  readonly completionPercent: number;
}

export interface ProfileUpdateInput {
  readonly displayName: string;
  readonly cityId?: CityId;
  readonly biography?: string;
  readonly avatarAssetId?: MediaAssetId;
}
export interface ProfileUpdateMineRequest extends ContractRequest, IdempotentWrite {
  readonly profile: ProfileUpdateInput;
}
export interface ProfileUpdateMineResponse {
  readonly profile: ProfilePrivateDto;
  readonly projectionRefreshRequested: boolean;
}

export interface CardGetMineRequest extends ContractRequest {
  readonly includePrivatePreview: boolean;
}
export interface CardGetMineResponse {
  readonly card: PublicCardProjection;
}

export interface CardGetForViewerRequest extends ContractRequest {
  readonly ownerUserId: UserId;
}
export interface CardGetForViewerResponse {
  readonly card: PublicCardProjection;
  readonly relationship: ViewerRelationshipProjection;
  readonly claims: readonly PublicVerificationClaimProjection[];
}

export interface CardRefreshProjectionRequest extends ContractRequest, IdempotentWrite {
  readonly reason: 'PROFILE_CHANGED' | 'RELATIONSHIP_CHANGED' | 'VERIFICATION_CHANGED' | 'MANUAL_REPAIR';
}
export interface CardRefreshProjectionResponse {
  readonly card: PublicCardProjection;
  readonly refreshedFromVersion: OptimisticVersion;
}

interface ShareCreateRequestBase extends ContractRequest, IdempotentWrite {
  readonly expiresAt?: UtcInstant;
}

export type ShareTargetReference =
  | { readonly targetType: 'CARD'; readonly targetId: CardId }
  | { readonly targetType: 'EVENT'; readonly targetId: EventId };

export type ShareCreateRequest = ShareCreateRequestBase & ShareTargetReference;
interface ShareCreateResponseBase {
  readonly shareTokenId: ShareTokenId;
  readonly token: string;
  readonly expiresAt?: UtcInstant;
}
export type ShareCreateResponse = ShareCreateResponseBase & ShareTargetReference;

export interface ShareEntryQuery {
  readonly scene?: string;
  readonly token?: string;
}

export type ShareResolveRequest = ContractRequest & (
  | { readonly token: string; readonly scene?: never }
  | { readonly scene: string; readonly token?: never }
);
export interface ShareResolveResponse {
  readonly resolution: ShareResolutionProjection;
}

export interface ShareRevokeRequest extends ContractRequest, IdempotentWrite {
  readonly shareTokenId: ShareTokenId;
}
export interface ShareRevokeResponse {
  readonly shareTokenId: ShareTokenId;
  readonly revokedAt: UtcInstant;
}

interface ShareCreateQrSceneRequestBase extends ContractRequest, IdempotentWrite {
  readonly shareTokenId: ShareTokenId;
}

export type ShareCreateQrSceneRequest = ShareCreateQrSceneRequestBase & (
  | { readonly targetType: 'CARD'; readonly page: 'pages/card-share/index' }
  | { readonly targetType: 'EVENT'; readonly page: 'pages/event-share/index' }
);
interface ShareCreateQrSceneResponseBase {
  readonly shareTokenId: ShareTokenId;
  readonly scene: string;
  readonly qrAssetId: MediaAssetId;
}
export type ShareCreateQrSceneResponse = ShareCreateQrSceneResponseBase & (
  | { readonly targetType: 'CARD'; readonly page: 'pages/card-share/index' }
  | { readonly targetType: 'EVENT'; readonly page: 'pages/event-share/index' }
);

export interface FriendRequestRequest extends ContractRequest, IdempotentWrite {
  readonly recipientUserId: UserId;
  readonly message?: string;
}
export interface FriendRequestResponse {
  readonly relationship: ViewerRelationshipProjection;
}

export interface FriendListIncomingRequest extends ContractRequest, CursorPageRequest {
  readonly includeExpired: boolean;
}
export interface FriendListIncomingResponse {
  readonly page: CursorPage<FriendRequestProjection>;
}

export interface FriendListAcceptedRequest extends ContractRequest, CursorPageRequest {
  readonly cityId?: CityId;
}
export interface FriendListAcceptedResponse {
  readonly page: CursorPage<PublicCardProjection>;
}

export interface FriendAcceptRequest extends ContractRequest, IdempotentWrite {
  readonly friendshipId: StableId<'friendship'>;
}
export interface FriendAcceptResponse {
  readonly relationship: ViewerRelationshipProjection;
}

export interface FriendRejectRequest extends ContractRequest, IdempotentWrite {
  readonly friendshipId: StableId<'friendship'>;
  readonly reasonCode?: 'NOT_KNOWN' | 'NOT_NOW' | 'OTHER';
}
export interface FriendRejectResponse {
  readonly relationship: ViewerRelationshipProjection;
}

export interface FriendCancelRequest extends ContractRequest, IdempotentWrite {
  readonly friendshipId: StableId<'friendship'>;
}
export interface FriendCancelResponse {
  readonly relationship: ViewerRelationshipProjection;
}

export interface FriendRemoveRequest extends ContractRequest, IdempotentWrite {
  readonly friendshipId: StableId<'friendship'>;
}
export interface FriendRemoveResponse {
  readonly removedAt: UtcInstant;
  readonly projectionDirty: true;
}

export interface BlockCreateRequest extends ContractRequest, IdempotentWrite {
  readonly blockedUserId: UserId;
  readonly reasonCode?: 'HARASSMENT' | 'SPAM' | 'PRIVACY' | 'OTHER';
}
export interface BlockCreateResponse {
  readonly blockedUserId: UserId;
  readonly createdAt: UtcInstant;
  readonly projectionDirty: true;
}

export interface BlockRemoveRequest extends ContractRequest, IdempotentWrite {
  readonly blockedUserId: UserId;
}
export interface BlockRemoveResponse {
  readonly blockedUserId: UserId;
  readonly removedAt: UtcInstant;
  readonly projectionDirty: true;
}

export interface ReportCreateRequest extends ContractRequest, IdempotentWrite {
  readonly targetType: 'USER' | 'EVENT' | 'CONTENT';
  readonly targetId: StableId;
  readonly reasonCode: 'HARASSMENT' | 'SPAM' | 'MISLEADING' | 'RIGHTS' | 'OTHER';
  readonly description?: string;
  readonly evidenceAssetIds: readonly MediaAssetId[];
}
export interface ReportCreateResponse {
  readonly report: ReportProjection;
}

export interface TagCatalogRequest extends ContractRequest {
  readonly includeDisabled: false;
}
export interface TagCatalogResponse {
  readonly labels: readonly LabelDefinitionProjection[];
}

export interface VerificationCreateDraftRequest extends ContractRequest, IdempotentWrite {
  readonly labelId: StableId<'label'>;
}
export interface VerificationCreateDraftResponse {
  readonly request: VerificationRequestProjection;
}

export interface VerificationUploadPolicyRequest extends ContractRequest, IdempotentWrite {
  readonly verificationRequestId: VerificationRequestId;
  readonly mediaType: 'IMAGE' | 'DOCUMENT';
  readonly fileSizeBytes: number;
  readonly sha256: string;
}
export interface VerificationUploadPolicyResponse {
  readonly mediaAssetId: MediaAssetId;
  readonly cloudPath: string;
  readonly uploadExpiresAt: UtcInstant;
  readonly maxBytes: number;
}

export interface VerificationSubmitRequest extends ContractRequest, IdempotentWrite {
  readonly verificationRequestId: VerificationRequestId;
  readonly evidenceAssetIds: readonly MediaAssetId[];
  readonly userStatement: string;
}
export interface VerificationSubmitResponse {
  readonly request: VerificationRequestProjection;
}

export interface VerificationListMineRequest extends ContractRequest, CursorPageRequest {
  readonly status?: ReviewStatus;
}
export interface VerificationListMineResponse {
  readonly page: CursorPage<VerificationRequestProjection>;
}

export interface VerificationGetMineRequest extends ContractRequest {
  readonly verificationRequestId: VerificationRequestId;
}
export interface VerificationGetMineResponse {
  readonly request: VerificationRequestProjection;
}

export interface VerificationWithdrawRequest extends ContractRequest, IdempotentWrite {
  readonly verificationRequestId: VerificationRequestId;
  readonly expectedVersion: OptimisticVersion;
}
export interface VerificationWithdrawalTombstone {
  readonly verificationRequestId: VerificationRequestId;
  readonly previousStatus: typeof ReviewStatus.DRAFT | typeof ReviewStatus.SUBMITTED;
  readonly deletedVersion: OptimisticVersion;
  readonly withdrawnAt: UtcInstant;
  readonly deletionMode: 'PHYSICAL';
  readonly projectionInvalidationAppended: true;
}
export interface VerificationWithdrawResponse {
  readonly withdrawal: VerificationWithdrawalTombstone;
}

export interface GeoListRegionsRequest extends ContractRequest {
  readonly includeOperationalSummary: boolean;
}
export interface GeoListRegionsResponse {
  readonly regions: readonly RegionProjection[];
}

export interface GeoListCountriesRequest extends ContractRequest {
  readonly regionId?: RegionId;
}
export interface GeoListCountriesResponse {
  readonly countries: readonly CountryProjection[];
}

export interface GeoListCitiesRequest extends ContractRequest {
  readonly regionId?: RegionId;
  readonly countryId?: CountryId;
}
export interface GeoListCitiesResponse {
  readonly cities: readonly CityProjection[];
}

export interface GeoGetNodeRequest extends ContractRequest {
  readonly cityId: CityId;
}
export interface GeoGetNodeResponse {
  readonly node?: PublicClubNodeProjection;
  readonly city: CityProjection;
}

export interface EventListRequest extends ContractRequest, CursorPageRequest {
  readonly cityId?: CityId;
  readonly startsAfter?: UtcInstant;
  readonly startsBefore?: UtcInstant;
}
export interface EventListResponse {
  readonly page: CursorPage<PublicEventProjection>;
}

export interface EventGetRequest extends ContractRequest {
  readonly eventId: EventId;
}
export interface EventGetResponse {
  readonly event: PublicEventProjection;
  readonly organizer: PublicOrganizerProjection;
}

export interface EventCheckEligibilityRequest extends ContractRequest {
  readonly eventId: EventId;
}
export interface EventCheckEligibilityResponse {
  readonly eligibility: EventEligibilityProjection;
}

export interface EventRegisterInterestRequest extends ContractRequest, IdempotentWrite {
  readonly eventId: EventId;
  readonly acknowledgedTermsVersion: string;
}
export interface EventRegisterInterestResponse {
  readonly enrollment: EnrollmentProjection;
}

export interface EventCancelInterestRequest extends ContractRequest, IdempotentWrite {
  readonly eventId: EventId;
  readonly reasonCode?: 'SCHEDULE' | 'TRAVEL' | 'OTHER';
}
export interface EventCancelInterestResponse {
  readonly enrollment: EnrollmentProjection;
}

export interface EventGetEnrollmentRequest extends ContractRequest {
  readonly eventId: EventId;
}
export interface EventGetEnrollmentResponse {
  readonly enrollment?: EnrollmentProjection;
}

export interface OrganizerGetPublicRequest extends ContractRequest {
  readonly organizerId: OrganizerId;
}
export interface OrganizerGetPublicResponse {
  readonly organizer: PublicOrganizerProjection;
}

export interface PaymentGetCapabilityRequest extends ContractRequest {
  readonly eventId?: EventId;
}
export interface PaymentGetCapabilityResponse {
  readonly capability: PaymentCapabilityProjection;
}

export interface ContentListRequest extends ContractRequest, CursorPageRequest {
  readonly category?: 'ART' | 'ANTIQUE' | 'JEWELRY';
  readonly collectionId?: StableId<'collection'>;
}
export interface ContentListResponse {
  readonly page: CursorPage<PublicContentProjection>;
}

export interface ContentGetRequest extends ContractRequest {
  readonly contentId: StableId<'content'>;
}
export interface ContentGetResponse {
  readonly content: PublicContentProjection;
  readonly creator: ContentCreatorProjection;
}

export interface ContentListCollectionsRequest extends ContractRequest, CursorPageRequest {
  readonly category?: 'ART' | 'ANTIQUE' | 'JEWELRY';
}
export interface ContentListCollectionsResponse {
  readonly page: CursorPage<ContentCollectionProjection>;
}

export interface ContentGetCreatorRequest extends ContractRequest {
  readonly creatorId: StableId<'creator'>;
}
export interface ContentGetCreatorResponse {
  readonly creator: ContentCreatorProjection;
}

export interface ContentListRelatedEventsRequest extends ContractRequest {
  readonly contentId: StableId<'content'>;
  readonly cityId?: CityId;
}
export interface ContentListRelatedEventsResponse {
  readonly events: readonly PublicEventProjection[];
  readonly filteredUnavailableCount: number;
}

export interface ContentIntentCreateRequest extends ContractRequest, IdempotentWrite {
  readonly contentId: StableId<'content'>;
  readonly message?: string;
}
export interface ContentIntentCreateResponse {
  readonly intent: ContentIntentProjection;
}

export interface ContentIntentCancelRequest extends ContractRequest, IdempotentWrite {
  readonly intentId: StableId<'content-intent'>;
}
export interface ContentIntentCancelResponse {
  readonly intent: ContentIntentProjection;
}

export interface AdminBootstrapRequest extends ContractRequest {
  readonly requestedScope: 'REVIEW' | 'OPERATIONS' | 'AUDIT';
}
export interface AdminBootstrapResponse {
  readonly session: SessionProjection;
  readonly availableQueues: readonly ('SOCIAL' | 'EVENT' | 'CONTENT' | 'ORGANIZER' | 'REPORT')[];
}

export interface ReviewListRequest extends ContractRequest, CursorPageRequest {
  readonly domain?: 'SOCIAL' | 'EVENT' | 'CONTENT' | 'ORGANIZER' | 'REPORT';
  readonly status?: ReviewStatus;
}
export interface ReviewListResponse {
  readonly page: CursorPage<ReviewCaseProjection>;
}

export interface ReviewGetRequest extends ContractRequest {
  readonly reviewCaseId: ReviewCaseId;
}
export interface ReviewGetResponse {
  readonly reviewCase: ReviewCaseProjection;
}

export interface ReviewApproveRequest extends ContractRequest, IdempotentWrite {
  readonly reviewCaseId: ReviewCaseId;
  readonly decisionNote: string;
}
export interface ReviewApproveResponse {
  readonly reviewCase: ReviewCaseProjection;
  readonly projectionInvalidated: true;
}

export interface ReviewRejectRequest extends ContractRequest, IdempotentWrite {
  readonly reviewCaseId: ReviewCaseId;
  readonly reasonCode: string;
  readonly decisionNote: string;
}
export interface ReviewRejectResponse {
  readonly reviewCase: ReviewCaseProjection;
  readonly projectionInvalidated: true;
}

export interface ReviewRequestChangesRequest extends ContractRequest, IdempotentWrite {
  readonly reviewCaseId: ReviewCaseId;
  readonly requiredChanges: readonly string[];
}
export interface ReviewRequestChangesResponse {
  readonly reviewCase: ReviewCaseProjection;
}

export interface ReviewRevokeRequest extends ContractRequest, IdempotentWrite {
  readonly reviewCaseId: ReviewCaseId;
  readonly reasonCode: string;
}
export interface ReviewRevokeResponse {
  readonly reviewCase: ReviewCaseProjection;
  readonly projectionInvalidated: true;
}

export interface OrganizerReviewRequest extends ContractRequest, IdempotentWrite {
  readonly reviewCaseId: ReviewCaseId;
  readonly organizerId: OrganizerId;
  readonly decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
  readonly note: string;
}
export interface OrganizerReviewResponse {
  readonly reviewCase: ReviewCaseProjection;
  readonly organizer: PublicOrganizerProjection;
}

export interface EventReviewRequest extends ContractRequest, IdempotentWrite {
  readonly reviewCaseId: ReviewCaseId;
  readonly eventId: EventId;
  readonly decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'PAUSE' | 'CANCEL';
  readonly note: string;
}
export interface EventReviewResponse {
  readonly reviewCase: ReviewCaseProjection;
  readonly event: PublicEventProjection;
}

export interface ContentReviewRequest extends ContractRequest, IdempotentWrite {
  readonly reviewCaseId: ReviewCaseId;
  readonly contentId: StableId<'content'>;
  readonly decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'UNPUBLISH';
  readonly note: string;
}
export interface ContentReviewResponse {
  readonly reviewCase: ReviewCaseProjection;
  readonly content: PublicContentProjection;
}

export interface ReportListRequest extends ContractRequest, CursorPageRequest {
  readonly status?: 'OPEN' | 'RESOLVED' | 'DISMISSED';
}
export interface ReportListResponse {
  readonly page: CursorPage<ReportProjection>;
}

export interface ReportResolveRequest extends ContractRequest, IdempotentWrite {
  readonly reportId: ReportId;
  readonly resolution: 'ACTION_TAKEN' | 'DISMISSED';
  readonly note: string;
}
export interface ReportResolveResponse {
  readonly report: ReportProjection;
}

export interface AuditListRequest extends ContractRequest, CursorPageRequest {
  readonly action?: string;
  readonly targetId?: StableId;
  readonly occurredAfter?: UtcInstant;
  readonly occurredBefore?: UtcInstant;
}
export interface AuditListResponse {
  readonly page: CursorPage<AuditEntryProjection>;
}

export interface ActionContractEntry<Request, Response> {
  readonly payload: Request;
  readonly data: Response;
}

export type ContractErrorCode = ApiErrorCode;
export type ContractIdempotencyKey = IdempotencyKey;
export type ContractEventState = EventState;
