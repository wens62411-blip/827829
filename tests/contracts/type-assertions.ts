import type {
  CardGetMineRequest,
  CardGetMineResponse,
  CloudActionData,
  CloudActionMap,
  CloudActionPayload,
  CloudActionRequest,
  CloudActionResponse,
  ShareCreateQrSceneRequest,
  ShareCreateRequest,
  ShareResolveRequest,
  VerificationWithdrawalTombstone,
  VerificationWithdrawRequest,
  VerificationWithdrawResponse,
} from '../../miniprogram/shared/contracts';
import { ReviewStatus } from '../../miniprogram/shared/types';
import type {
  EventId,
  OptimisticVersion,
  PublicEventProjection,
  ShareResolutionProjection,
  StableId,
} from '../../miniprogram/shared/types';

type Assert<Condition extends true> = Condition;
type Same<Left, Right> =
  [Left] extends [Right] ? ([Right] extends [Left] ? true : false) : false;

type CardActionKeysArePayloadAndData = Assert<
  Same<keyof CloudActionMap['card.getMine'], 'payload' | 'data'>
>;
type CardPayloadIsNamedDto = Assert<
  Same<CloudActionPayload<'card.getMine'>, CardGetMineRequest>
>;
type CardDataIsNamedDto = Assert<
  Same<CloudActionData<'card.getMine'>, CardGetMineResponse>
>;
type CompatibilityRequestAlias = Assert<
  Same<CloudActionRequest<'card.getMine'>, CloudActionPayload<'card.getMine'>>
>;
type CompatibilityResponseAlias = Assert<
  Same<CloudActionResponse<'card.getMine'>, CloudActionData<'card.getMine'>>
>;
type SpecificIdIsAcceptedByStableId = Assert<EventId extends StableId ? true : false>;
type EventShareTargetIsEventId = Assert<
  Same<Extract<ShareCreateRequest, { targetType: 'EVENT' }>['targetId'], EventId>
>;
type EventShareQrUsesEventPage = Assert<
  Same<Extract<ShareCreateQrSceneRequest, { targetType: 'EVENT' }>['page'], 'pages/event-share/index'>
>;
type ResolveAcceptsQrScene = Assert<
  Same<Extract<ShareResolveRequest, { scene: string }>['scene'], string>
>;
type EventResolutionCarriesPublicEvent = Assert<
  Same<Extract<ShareResolutionProjection, { targetType: 'EVENT' }>['event'], PublicEventProjection>
>;
type SuccessfulShareResolutionCannotBeRevoked = Assert<
  Same<ShareResolutionProjection['revoked'], false>
>;
type WithdrawalRequiresVersion = Assert<
  Same<VerificationWithdrawRequest['expectedVersion'], OptimisticVersion>
>;
type WithdrawalAllowedPreviousStatuses = Assert<
  Same<
    VerificationWithdrawalTombstone['previousStatus'],
    typeof ReviewStatus.DRAFT | typeof ReviewStatus.SUBMITTED
  >
>;
type WithdrawalReturnsOnlyTombstone = Assert<
  Same<keyof VerificationWithdrawResponse, 'withdrawal'>
>;

export type ContractTypeAssertions =
  | CardActionKeysArePayloadAndData
  | CardPayloadIsNamedDto
  | CardDataIsNamedDto
  | CompatibilityRequestAlias
  | CompatibilityResponseAlias
  | SpecificIdIsAcceptedByStableId
  | EventShareTargetIsEventId
  | EventShareQrUsesEventPage
  | ResolveAcceptsQrScene
  | EventResolutionCarriesPublicEvent
  | SuccessfulShareResolutionCannotBeRevoked
  | WithdrawalRequiresVersion
  | WithdrawalAllowedPreviousStatuses
  | WithdrawalReturnsOnlyTombstone;
