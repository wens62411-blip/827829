import type { CityId, CountryId, RegionId } from '../constants/geography';
import { ReviewStatus, VerificationState } from './enums';
import type {
  EnrollmentState,
  EventState,
  FriendshipState,
  MediaRightsState,
  OperationalState,
  PaymentState,
  ProjectionInvalidationKind,
  PublicationState,
  RecordOrigin,
  RuntimeMode,
  Visibility,
} from './enums';
import type {
  AuditEntryId,
  CardId,
  ClubNodeId,
  CollectionId,
  ContentId,
  ContentIntentId,
  EnrollmentId,
  EventId,
  FriendshipId,
  IanaTimezone,
  LocalizedName,
  MediaAssetId,
  MediaRights,
  OptimisticVersion,
  OrganizerId,
  ProjectionInvalidationId,
  ReportId,
  RequestId,
  ReviewCaseId,
  ShareTokenId,
  StableId,
  UserId,
  UtcInstant,
  VerificationClaimId,
  VerificationRequestId,
  VersionedRecord,
} from './primitives';

export interface SessionProjection {
  readonly userId: UserId;
  readonly roles: readonly ('MEMBER' | 'ORGANIZER' | 'REVIEWER' | 'ADMIN')[];
  readonly runtimeMode: RuntimeMode;
  readonly contractVersion: '1.0.0';
  readonly profileComplete: boolean;
  readonly expiresAt: UtcInstant;
}

export interface ProfilePrivateDto extends VersionedRecord {
  readonly profileId: StableId<'profile'>;
  readonly userId: UserId;
  readonly displayName: string;
  readonly phoneMasked?: string;
  readonly emailMasked?: string;
  readonly cityId?: CityId;
  readonly biography?: string;
  readonly avatarAssetId?: MediaAssetId;
}

export interface PublicVerificationClaimProjection extends VersionedRecord {
  readonly claimId: VerificationClaimId;
  readonly subjectUserId: UserId;
  readonly labelId: StableId<'label'>;
  readonly labelText: LocalizedName;
  readonly reviewStatus: typeof ReviewStatus.APPROVED;
  readonly verificationState: typeof VerificationState.HUMAN_REVIEWED;
  readonly publicVisible: true;
  readonly validFrom: UtcInstant;
  readonly validUntil?: UtcInstant;
}

export interface ViewerRelationshipProjection extends VersionedRecord {
  readonly viewerUserId: UserId;
  readonly subjectUserId: UserId;
  readonly friendshipId?: FriendshipId;
  readonly friendshipState?: FriendshipState;
  readonly viewerBlockedSubject: boolean;
  readonly subjectBlockedViewer: boolean;
  readonly mayViewFriendsOnlyFields: boolean;
  readonly sourceVersion: OptimisticVersion;
}

export interface PublicCardProjection extends VersionedRecord {
  readonly cardId: CardId;
  readonly ownerUserId: UserId;
  readonly displayName: string;
  readonly headline?: string;
  readonly cityId?: CityId;
  readonly avatarUrl?: string;
  readonly biography?: string;
  readonly visibility: Visibility;
  readonly claims: readonly PublicVerificationClaimProjection[];
  readonly origin: RecordOrigin;
  readonly verificationState: VerificationState;
}

interface ShareResolutionProjectionBase {
  readonly tokenId: ShareTokenId;
  readonly resolvedAt: UtcInstant;
  readonly expiresAt?: UtcInstant;
  /** A revoked or expired token must return ApiFailure, never this projection. */
  readonly revoked: false;
}

export type ShareResolutionProjection = ShareResolutionProjectionBase & (
  | {
      readonly targetType: 'CARD';
      readonly targetId: CardId;
      readonly card: PublicCardProjection;
      readonly event?: never;
    }
  | {
      readonly targetType: 'EVENT';
      readonly targetId: EventId;
      readonly card?: never;
      readonly event: PublicEventProjection;
    }
);

export interface PublicOrganizerProjection extends VersionedRecord {
  readonly organizerId: OrganizerId;
  readonly name: LocalizedName;
  readonly summary: string;
  readonly cityIds: readonly CityId[];
  readonly reviewStatus: typeof ReviewStatus.APPROVED;
  readonly verificationState: typeof VerificationState.HUMAN_REVIEWED;
}

export interface PublicClubNodeProjection extends VersionedRecord {
  readonly nodeId: ClubNodeId;
  readonly cityId: CityId;
  readonly name: LocalizedName;
  readonly operationalState: OperationalState;
  readonly organizer?: PublicOrganizerProjection;
}

export interface PublicEventProjection extends VersionedRecord {
  readonly eventId: EventId;
  readonly clubNodeId: ClubNodeId;
  readonly organizerId: OrganizerId;
  readonly cityId: CityId;
  readonly title: string;
  readonly summary: string;
  readonly startsAt: UtcInstant;
  readonly endsAt: UtcInstant;
  readonly timezone: IanaTimezone;
  readonly state: EventState;
  readonly publicationState: PublicationState;
  readonly reservationAvailable: boolean;
  readonly coverAssetId?: MediaAssetId;
  readonly origin: RecordOrigin;
  readonly verificationState: VerificationState;
}

export interface PublicContentProjection extends VersionedRecord {
  readonly contentId: ContentId;
  readonly collectionId?: CollectionId;
  readonly creatorId: StableId<'creator'>;
  readonly title: string;
  readonly summary: string;
  readonly category: 'ART' | 'ANTIQUE' | 'JEWELRY';
  readonly publicationState: PublicationState;
  readonly coverAssetId?: MediaAssetId;
  readonly mediaRightsState: MediaRightsState;
  readonly origin: RecordOrigin;
  readonly verificationState: VerificationState;
}

export interface ReviewCaseProjection extends VersionedRecord {
  readonly reviewCaseId: ReviewCaseId;
  readonly domain: 'SOCIAL' | 'EVENT' | 'CONTENT' | 'ORGANIZER' | 'REPORT';
  readonly aggregateId: StableId;
  readonly status: ReviewStatus;
  readonly title: string;
  readonly summary: string;
  readonly submitterUserId?: UserId;
  readonly evidenceAssetIds: readonly MediaAssetId[];
  readonly assignedReviewerUserId?: UserId;
}

export interface AuditEntryProjection {
  readonly auditEntryId: AuditEntryId;
  readonly actorUserId?: UserId;
  readonly actorRole: 'SYSTEM' | 'MEMBER' | 'ORGANIZER' | 'REVIEWER' | 'ADMIN';
  readonly action: string;
  readonly targetType: string;
  readonly targetId: StableId;
  readonly requestId: RequestId;
  readonly occurredAt: UtcInstant;
  readonly result: 'SUCCEEDED' | 'FAILED';
  readonly reasonCode?: string;
}

export interface ProjectionInvalidation {
  readonly eventId: ProjectionInvalidationId;
  readonly kind: ProjectionInvalidationKind;
  readonly sourceAggregateId: StableId;
  readonly sourceVersion: OptimisticVersion;
  readonly occurredAt: UtcInstant;
  readonly reason: string;
  readonly requestId: RequestId;
}

export interface FriendRequestProjection extends VersionedRecord {
  readonly friendshipId: FriendshipId;
  readonly requester: PublicCardProjection;
  readonly state: FriendshipState;
  readonly message?: string;
}

export interface VerificationRequestProjection extends VersionedRecord {
  readonly verificationRequestId: VerificationRequestId;
  readonly labelId: StableId<'label'>;
  readonly status: ReviewStatus;
  readonly evidenceAssetIds: readonly MediaAssetId[];
  readonly reviewerNote?: string;
}

export interface LabelDefinitionProjection extends VersionedRecord {
  readonly labelId: StableId<'label'>;
  readonly name: LocalizedName;
  readonly description: LocalizedName;
  readonly enabled: boolean;
}

export interface EventEligibilityProjection {
  readonly eventId: EventId;
  readonly eligible: boolean;
  readonly evaluatedAt: UtcInstant;
  readonly requiredLabelIds: readonly StableId<'label'>[];
  readonly satisfiedClaimIds: readonly VerificationClaimId[];
  readonly failureReason?: 'MISSING_APPROVED_CLAIM' | 'EVENT_UNAVAILABLE' | 'BLOCKED';
}

export interface EnrollmentProjection extends VersionedRecord {
  readonly enrollmentId: EnrollmentId;
  readonly eventId: EventId;
  readonly userId: UserId;
  readonly state: EnrollmentState;
  readonly paymentState: PaymentState;
}

export interface PaymentCapabilityProjection {
  readonly state: PaymentState;
  readonly enabled: boolean;
  readonly reason: 'P0_DISABLED' | 'EVENT_FREE' | 'CAPABILITY_AVAILABLE';
}

export interface ContentCollectionProjection extends VersionedRecord {
  readonly collectionId: CollectionId;
  readonly title: LocalizedName;
  readonly summary: string;
  readonly publicationState: PublicationState;
}

export interface ContentCreatorProjection extends VersionedRecord {
  readonly creatorId: StableId<'creator'>;
  readonly displayName: string;
  readonly biography: string;
  readonly verificationState: VerificationState;
}

export interface ContentIntentProjection extends VersionedRecord {
  readonly intentId: ContentIntentId;
  readonly contentId: ContentId;
  readonly userId: UserId;
  readonly state: 'ACTIVE' | 'CANCELLED';
}

export interface ReportProjection extends VersionedRecord {
  readonly reportId: ReportId;
  readonly targetType: 'USER' | 'EVENT' | 'CONTENT';
  readonly targetId: StableId;
  readonly status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  readonly reasonCode: string;
}

export interface MediaAssetProjection extends VersionedRecord {
  readonly mediaAssetId: MediaAssetId;
  readonly ownerUserId: UserId;
  readonly mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  readonly rights: MediaRights;
  readonly publicUrl?: string;
}

export interface RegionProjection {
  readonly id: RegionId;
  readonly name: LocalizedName;
}

export interface CountryProjection {
  readonly id: CountryId;
  readonly regionId: RegionId;
  readonly name: LocalizedName;
}

export interface CityProjection {
  readonly id: CityId;
  readonly countryId: CountryId;
  readonly regionId: RegionId;
  readonly name: LocalizedName;
  readonly timezone: IanaTimezone;
  readonly operationalState: OperationalState;
}
