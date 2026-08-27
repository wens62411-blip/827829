import type {
  AdminBootstrapRequest,
  AdminBootstrapResponse,
  AuditListRequest,
  AuditListResponse,
  BlockCreateRequest,
  BlockCreateResponse,
  BlockRemoveRequest,
  BlockRemoveResponse,
  CardGetForViewerRequest,
  CardGetForViewerResponse,
  CardGetMineRequest,
  CardGetMineResponse,
  CardRefreshProjectionRequest,
  CardRefreshProjectionResponse,
  ContentGetCreatorRequest,
  ContentGetCreatorResponse,
  ContentGetRequest,
  ContentGetResponse,
  ContentIntentCancelRequest,
  ContentIntentCancelResponse,
  ContentIntentCreateRequest,
  ContentIntentCreateResponse,
  ContentListCollectionsRequest,
  ContentListCollectionsResponse,
  ContentListRelatedEventsRequest,
  ContentListRelatedEventsResponse,
  ContentListRequest,
  ContentListResponse,
  ContentReviewRequest,
  ContentReviewResponse,
  EventCancelInterestRequest,
  EventCancelInterestResponse,
  EventCheckEligibilityRequest,
  EventCheckEligibilityResponse,
  EventGetEnrollmentRequest,
  EventGetEnrollmentResponse,
  EventGetRequest,
  EventGetResponse,
  EventListRequest,
  EventListResponse,
  EventRegisterInterestRequest,
  EventRegisterInterestResponse,
  EventReviewRequest,
  EventReviewResponse,
  FriendAcceptRequest,
  FriendAcceptResponse,
  FriendCancelRequest,
  FriendCancelResponse,
  FriendListAcceptedRequest,
  FriendListAcceptedResponse,
  FriendListIncomingRequest,
  FriendListIncomingResponse,
  FriendRejectRequest,
  FriendRejectResponse,
  FriendRemoveRequest,
  FriendRemoveResponse,
  FriendRequestRequest,
  FriendRequestResponse,
  GeoGetNodeRequest,
  GeoGetNodeResponse,
  GeoListCitiesRequest,
  GeoListCitiesResponse,
  GeoListCountriesRequest,
  GeoListCountriesResponse,
  GeoListRegionsRequest,
  GeoListRegionsResponse,
  IdentityBootstrapRequest,
  IdentityBootstrapResponse,
  OrganizerGetPublicRequest,
  OrganizerGetPublicResponse,
  OrganizerReviewRequest,
  OrganizerReviewResponse,
  PaymentGetCapabilityRequest,
  PaymentGetCapabilityResponse,
  ProfileGetMineRequest,
  ProfileGetMineResponse,
  ProfileUpdateMineRequest,
  ProfileUpdateMineResponse,
  ReportCreateRequest,
  ReportCreateResponse,
  ReportListRequest,
  ReportListResponse,
  ReportResolveRequest,
  ReportResolveResponse,
  ReviewApproveRequest,
  ReviewApproveResponse,
  ReviewGetRequest,
  ReviewGetResponse,
  ReviewListRequest,
  ReviewListResponse,
  ReviewRejectRequest,
  ReviewRejectResponse,
  ReviewRequestChangesRequest,
  ReviewRequestChangesResponse,
  ReviewRevokeRequest,
  ReviewRevokeResponse,
  ShareCreateQrSceneRequest,
  ShareCreateQrSceneResponse,
  ShareCreateRequest,
  ShareCreateResponse,
  ShareResolveRequest,
  ShareResolveResponse,
  ShareRevokeRequest,
  ShareRevokeResponse,
  TagCatalogRequest,
  TagCatalogResponse,
  VerificationCreateDraftRequest,
  VerificationCreateDraftResponse,
  VerificationGetMineRequest,
  VerificationGetMineResponse,
  VerificationListMineRequest,
  VerificationListMineResponse,
  VerificationSubmitRequest,
  VerificationSubmitResponse,
  VerificationUploadPolicyRequest,
  VerificationUploadPolicyResponse,
  VerificationWithdrawRequest,
  VerificationWithdrawResponse,
} from './action-types';

interface CloudActionDtoMap {
  readonly 'identity.bootstrap': { readonly request: IdentityBootstrapRequest; readonly response: IdentityBootstrapResponse };
  readonly 'profile.getMine': { readonly request: ProfileGetMineRequest; readonly response: ProfileGetMineResponse };
  readonly 'profile.updateMine': { readonly request: ProfileUpdateMineRequest; readonly response: ProfileUpdateMineResponse };
  readonly 'card.getMine': { readonly request: CardGetMineRequest; readonly response: CardGetMineResponse };
  readonly 'card.getForViewer': { readonly request: CardGetForViewerRequest; readonly response: CardGetForViewerResponse };
  readonly 'card.refreshProjection': { readonly request: CardRefreshProjectionRequest; readonly response: CardRefreshProjectionResponse };
  readonly 'share.create': { readonly request: ShareCreateRequest; readonly response: ShareCreateResponse };
  readonly 'share.resolve': { readonly request: ShareResolveRequest; readonly response: ShareResolveResponse };
  readonly 'share.revoke': { readonly request: ShareRevokeRequest; readonly response: ShareRevokeResponse };
  readonly 'share.createQrScene': { readonly request: ShareCreateQrSceneRequest; readonly response: ShareCreateQrSceneResponse };

  readonly 'friend.request': { readonly request: FriendRequestRequest; readonly response: FriendRequestResponse };
  readonly 'friend.listIncoming': { readonly request: FriendListIncomingRequest; readonly response: FriendListIncomingResponse };
  readonly 'friend.listAccepted': { readonly request: FriendListAcceptedRequest; readonly response: FriendListAcceptedResponse };
  readonly 'friend.accept': { readonly request: FriendAcceptRequest; readonly response: FriendAcceptResponse };
  readonly 'friend.reject': { readonly request: FriendRejectRequest; readonly response: FriendRejectResponse };
  readonly 'friend.cancel': { readonly request: FriendCancelRequest; readonly response: FriendCancelResponse };
  readonly 'friend.remove': { readonly request: FriendRemoveRequest; readonly response: FriendRemoveResponse };
  readonly 'block.create': { readonly request: BlockCreateRequest; readonly response: BlockCreateResponse };
  readonly 'block.remove': { readonly request: BlockRemoveRequest; readonly response: BlockRemoveResponse };
  readonly 'report.create': { readonly request: ReportCreateRequest; readonly response: ReportCreateResponse };
  readonly 'tag.catalog': { readonly request: TagCatalogRequest; readonly response: TagCatalogResponse };
  readonly 'verification.createDraft': { readonly request: VerificationCreateDraftRequest; readonly response: VerificationCreateDraftResponse };
  readonly 'verification.uploadPolicy': { readonly request: VerificationUploadPolicyRequest; readonly response: VerificationUploadPolicyResponse };
  readonly 'verification.submit': { readonly request: VerificationSubmitRequest; readonly response: VerificationSubmitResponse };
  readonly 'verification.listMine': { readonly request: VerificationListMineRequest; readonly response: VerificationListMineResponse };
  readonly 'verification.getMine': { readonly request: VerificationGetMineRequest; readonly response: VerificationGetMineResponse };
  readonly 'verification.withdraw': { readonly request: VerificationWithdrawRequest; readonly response: VerificationWithdrawResponse };

  readonly 'geo.listRegions': { readonly request: GeoListRegionsRequest; readonly response: GeoListRegionsResponse };
  readonly 'geo.listCountries': { readonly request: GeoListCountriesRequest; readonly response: GeoListCountriesResponse };
  readonly 'geo.listCities': { readonly request: GeoListCitiesRequest; readonly response: GeoListCitiesResponse };
  readonly 'geo.getNode': { readonly request: GeoGetNodeRequest; readonly response: GeoGetNodeResponse };
  readonly 'event.list': { readonly request: EventListRequest; readonly response: EventListResponse };
  readonly 'event.get': { readonly request: EventGetRequest; readonly response: EventGetResponse };
  readonly 'event.checkEligibility': { readonly request: EventCheckEligibilityRequest; readonly response: EventCheckEligibilityResponse };
  readonly 'event.registerInterest': { readonly request: EventRegisterInterestRequest; readonly response: EventRegisterInterestResponse };
  readonly 'event.cancelInterest': { readonly request: EventCancelInterestRequest; readonly response: EventCancelInterestResponse };
  readonly 'event.getEnrollment': { readonly request: EventGetEnrollmentRequest; readonly response: EventGetEnrollmentResponse };
  readonly 'organizer.getPublic': { readonly request: OrganizerGetPublicRequest; readonly response: OrganizerGetPublicResponse };
  readonly 'payment.getCapability': { readonly request: PaymentGetCapabilityRequest; readonly response: PaymentGetCapabilityResponse };

  readonly 'content.list': { readonly request: ContentListRequest; readonly response: ContentListResponse };
  readonly 'content.get': { readonly request: ContentGetRequest; readonly response: ContentGetResponse };
  readonly 'content.listCollections': { readonly request: ContentListCollectionsRequest; readonly response: ContentListCollectionsResponse };
  readonly 'content.getCreator': { readonly request: ContentGetCreatorRequest; readonly response: ContentGetCreatorResponse };
  readonly 'content.listRelatedEvents': { readonly request: ContentListRelatedEventsRequest; readonly response: ContentListRelatedEventsResponse };
  readonly 'content.intent.create': { readonly request: ContentIntentCreateRequest; readonly response: ContentIntentCreateResponse };
  readonly 'content.intent.cancel': { readonly request: ContentIntentCancelRequest; readonly response: ContentIntentCancelResponse };

  readonly 'admin.bootstrap': { readonly request: AdminBootstrapRequest; readonly response: AdminBootstrapResponse };
  readonly 'review.list': { readonly request: ReviewListRequest; readonly response: ReviewListResponse };
  readonly 'review.get': { readonly request: ReviewGetRequest; readonly response: ReviewGetResponse };
  readonly 'review.approve': { readonly request: ReviewApproveRequest; readonly response: ReviewApproveResponse };
  readonly 'review.reject': { readonly request: ReviewRejectRequest; readonly response: ReviewRejectResponse };
  readonly 'review.requestChanges': { readonly request: ReviewRequestChangesRequest; readonly response: ReviewRequestChangesResponse };
  readonly 'review.revoke': { readonly request: ReviewRevokeRequest; readonly response: ReviewRevokeResponse };
  readonly 'organizer.review': { readonly request: OrganizerReviewRequest; readonly response: OrganizerReviewResponse };
  readonly 'event.review': { readonly request: EventReviewRequest; readonly response: EventReviewResponse };
  readonly 'content.review': { readonly request: ContentReviewRequest; readonly response: ContentReviewResponse };
  readonly 'report.list': { readonly request: ReportListRequest; readonly response: ReportListResponse };
  readonly 'report.resolve': { readonly request: ReportResolveRequest; readonly response: ReportResolveResponse };
  readonly 'audit.list': { readonly request: AuditListRequest; readonly response: AuditListResponse };
}

export type CloudActionMap = {
  readonly [Action in keyof CloudActionDtoMap]: {
    readonly payload: CloudActionDtoMap[Action]['request'];
    readonly data: CloudActionDtoMap[Action]['response'];
  };
};

export type CloudAction = keyof CloudActionMap;
export type CloudActionPayload<Action extends CloudAction> = CloudActionMap[Action]['payload'];
export type CloudActionData<Action extends CloudAction> = CloudActionMap[Action]['data'];
export type CloudActionRequest<Action extends CloudAction> = CloudActionPayload<Action>;
export type CloudActionResponse<Action extends CloudAction> = CloudActionData<Action>;

export const CLOUD_ACTIONS_BY_FUNCTION = {
  identityApi: [
    'identity.bootstrap', 'profile.getMine', 'profile.updateMine', 'card.getMine',
    'card.getForViewer', 'card.refreshProjection', 'share.create', 'share.resolve',
    'share.revoke', 'share.createQrScene',
  ],
  socialApi: [
    'friend.request', 'friend.listIncoming', 'friend.listAccepted', 'friend.accept',
    'friend.reject', 'friend.cancel', 'friend.remove', 'block.create', 'block.remove',
    'report.create', 'tag.catalog', 'verification.createDraft', 'verification.uploadPolicy',
    'verification.submit', 'verification.listMine', 'verification.getMine', 'verification.withdraw',
  ],
  eventApi: [
    'geo.listRegions', 'geo.listCountries', 'geo.listCities', 'geo.getNode', 'event.list',
    'event.get', 'event.checkEligibility', 'event.registerInterest', 'event.cancelInterest',
    'event.getEnrollment', 'organizer.getPublic', 'payment.getCapability',
  ],
  contentApi: [
    'content.list', 'content.get', 'content.listCollections', 'content.getCreator',
    'content.listRelatedEvents', 'content.intent.create', 'content.intent.cancel',
  ],
  adminApi: [
    'admin.bootstrap', 'review.list', 'review.get', 'review.approve', 'review.reject',
    'review.requestChanges', 'review.revoke', 'organizer.review', 'event.review',
    'content.review', 'report.list', 'report.resolve', 'audit.list',
  ],
} as const satisfies {
  readonly [FunctionName in CloudFunctionName]: readonly CloudAction[];
};

export type CloudFunctionName = 'identityApi' | 'socialApi' | 'eventApi' | 'contentApi' | 'adminApi';
