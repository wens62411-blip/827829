import type {
  CardGetForViewerResponse,
  CardGetMineResponse,
  CardRefreshProjectionResponse,
  IdentityBootstrapResponse,
  ProfileGetMineResponse,
  ProfileUpdateInput,
  ProfileUpdateMineResponse,
  ShareCreateQrSceneResponse,
  ShareCreateResponse,
  ShareResolveResponse,
  ShareRevokeResponse,
} from '../../../shared/contracts';
import { callCloudAction } from '../../../shared/services';
import { createRequestId } from '../../../shared/utils/request-id';
import type { ApiErrorCode } from '../../../shared/types/api';
import type {
  CardId,
  IdempotencyKey,
  OptimisticVersion,
  ShareTokenId,
  UserId,
  UtcInstant,
} from '../../../shared/types/primitives';

export type IdentityClientSuccess<T> = {
  readonly ok: true;
  readonly data: T;
  readonly requestId: string;
  readonly platformRequestId: string | undefined;
};

export type IdentityClientFailure = {
  readonly ok: false;
  readonly kind: 'API' | 'TRANSPORT';
  readonly code: ApiErrorCode | undefined;
  readonly message: string;
  readonly retryable: boolean;
  readonly requestId: string;
};

export type IdentityClientResult<T> = IdentityClientSuccess<T> | IdentityClientFailure;

type IdentityAction =
  | 'identity.bootstrap'
  | 'profile.getMine'
  | 'profile.updateMine'
  | 'card.getMine'
  | 'card.getForViewer'
  | 'card.refreshProjection'
  | 'share.create'
  | 'share.resolve'
  | 'share.revoke'
  | 'share.createQrScene';

type ActionPayload = {
  readonly 'identity.bootstrap': Parameters<typeof callCloudAction<'identity.bootstrap'>>[2];
  readonly 'profile.getMine': Parameters<typeof callCloudAction<'profile.getMine'>>[2];
  readonly 'profile.updateMine': Parameters<typeof callCloudAction<'profile.updateMine'>>[2];
  readonly 'card.getMine': Parameters<typeof callCloudAction<'card.getMine'>>[2];
  readonly 'card.getForViewer': Parameters<typeof callCloudAction<'card.getForViewer'>>[2];
  readonly 'card.refreshProjection': Parameters<typeof callCloudAction<'card.refreshProjection'>>[2];
  readonly 'share.create': Parameters<typeof callCloudAction<'share.create'>>[2];
  readonly 'share.resolve': Parameters<typeof callCloudAction<'share.resolve'>>[2];
  readonly 'share.revoke': Parameters<typeof callCloudAction<'share.revoke'>>[2];
  readonly 'share.createQrScene': Parameters<typeof callCloudAction<'share.createQrScene'>>[2];
};

type ActionResponse = {
  readonly 'identity.bootstrap': IdentityBootstrapResponse;
  readonly 'profile.getMine': ProfileGetMineResponse;
  readonly 'profile.updateMine': ProfileUpdateMineResponse;
  readonly 'card.getMine': CardGetMineResponse;
  readonly 'card.getForViewer': CardGetForViewerResponse;
  readonly 'card.refreshProjection': CardRefreshProjectionResponse;
  readonly 'share.create': ShareCreateResponse;
  readonly 'share.resolve': ShareResolveResponse;
  readonly 'share.revoke': ShareRevokeResponse;
  readonly 'share.createQrScene': ShareCreateQrSceneResponse;
};

interface CardAppGlobalData {
  readonly contractVersion?: string;
  readonly runtimeMode?: string;
  readonly cloudEnvironmentConfigured?: boolean;
}

interface CardApp {
  readonly globalData?: CardAppGlobalData;
}

const CONTRACT_VERSION = '1.0.0' as const;
const TRANSPORT_MESSAGE = '当前无法连接身份服务，未产生任何成功结果。请检查网络或稍后重试。';

function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, '0')).join('');
}

async function secureRandomHex(): Promise<string | undefined> {
  return new Promise((resolve) => {
    wx.getRandomValues({
      length: 16,
      success: (result) => resolve(bytesToHex(result.randomValues)),
      fail: () => resolve(undefined),
    });
  });
}

async function createIdempotencyKey(requestId: string): Promise<IdempotencyKey> {
  const entropy = await secureRandomHex();
  const suffix = entropy ?? `${Date.now().toString(36)}_${requestId}`;
  return `idem_${suffix}` as IdempotencyKey;
}

async function invoke<Action extends IdentityAction>(
  action: Action,
  payload: ActionPayload[Action],
): Promise<IdentityClientResult<ActionResponse[Action]>> {
  const requestId = createRequestId();
  try {
    const evidence = await callCloudAction(action, requestId, payload);
    if (!evidence.apiResult.ok) {
      return {
        ok: false,
        kind: 'API',
        code: evidence.apiResult.error.code,
        message: evidence.apiResult.error.message,
        retryable: evidence.apiResult.error.retryable,
        requestId,
      };
    }
    return {
      ok: true,
      data: evidence.apiResult.data as ActionResponse[Action],
      requestId,
      platformRequestId: evidence.platformRequestId,
    };
  } catch (_error) {
    return {
      ok: false,
      kind: 'TRANSPORT',
      code: undefined,
      message: TRANSPORT_MESSAGE,
      retryable: true,
      requestId,
    };
  }
}

async function mutationPayload(
  expectedVersion: OptimisticVersion | undefined,
): Promise<{
  readonly contractVersion: typeof CONTRACT_VERSION;
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedVersion?: OptimisticVersion;
}> {
  const requestId = createRequestId();
  const idempotencyKey = await createIdempotencyKey(requestId);
  return {
    contractVersion: CONTRACT_VERSION,
    idempotencyKey,
    ...(expectedVersion === undefined ? {} : { expectedVersion }),
  };
}

export function getRuntimeEvidence(): {
  readonly cloudConfigured: boolean;
  readonly runtimeMode: string;
} {
  try {
    const app = getApp<CardApp>();
    return {
      cloudConfigured: app.globalData?.cloudEnvironmentConfigured === true,
      runtimeMode: app.globalData?.runtimeMode ?? 'OFFLINE_DEMO',
    };
  } catch (_error) {
    return { cloudConfigured: false, runtimeMode: 'OFFLINE_DEMO' };
  }
}

export async function bootstrapIdentity(): Promise<IdentityClientResult<IdentityBootstrapResponse>> {
  const write = await mutationPayload(undefined);
  return invoke('identity.bootstrap', {
    ...write,
    requestedRuntime: 'CLOUD',
  });
}

export function getMyProfile(): Promise<IdentityClientResult<ProfileGetMineResponse>> {
  return invoke('profile.getMine', {
    contractVersion: CONTRACT_VERSION,
    includeCompletion: true,
  });
}

export async function updateMyProfile(
  profile: ProfileUpdateInput,
  expectedVersion?: OptimisticVersion,
): Promise<IdentityClientResult<ProfileUpdateMineResponse>> {
  const write = await mutationPayload(expectedVersion);
  return invoke('profile.updateMine', {
    ...write,
    profile,
  });
}

export function getMyCard(): Promise<IdentityClientResult<CardGetMineResponse>> {
  return invoke('card.getMine', {
    contractVersion: CONTRACT_VERSION,
    includePrivatePreview: true,
  });
}

/**
 * Returns the owner's card through the same STRANGER visibility policy used
 * for public sharing. Share titles, posters and other export surfaces must use
 * this function instead of the owner-only private preview above.
 */
export function getMyPublicCard(): Promise<IdentityClientResult<CardGetMineResponse>> {
  return invoke('card.getMine', {
    contractVersion: CONTRACT_VERSION,
    includePrivatePreview: false,
  });
}

export function getCardForViewer(
  ownerUserId: UserId,
): Promise<IdentityClientResult<CardGetForViewerResponse>> {
  return invoke('card.getForViewer', {
    contractVersion: CONTRACT_VERSION,
    ownerUserId,
  });
}

export async function refreshMyCard(
  expectedVersion: OptimisticVersion,
): Promise<IdentityClientResult<CardRefreshProjectionResponse>> {
  const write = await mutationPayload(expectedVersion);
  return invoke('card.refreshProjection', {
    ...write,
    reason: 'PROFILE_CHANGED',
  });
}

export async function createCardShare(
  cardId: CardId,
  expectedVersion: OptimisticVersion,
  expiresAt?: UtcInstant,
): Promise<IdentityClientResult<ShareCreateResponse>> {
  const write = await mutationPayload(expectedVersion);
  return invoke('share.create', {
    ...write,
    targetType: 'CARD',
    targetId: cardId,
    ...(expiresAt === undefined ? {} : { expiresAt }),
  });
}

export function resolveCardShare(
  reference: { readonly token: string } | { readonly scene: string },
): Promise<IdentityClientResult<ShareResolveResponse>> {
  return invoke('share.resolve', {
    contractVersion: CONTRACT_VERSION,
    ...reference,
  });
}

export async function revokeCardShare(
  shareTokenId: ShareTokenId,
  expectedVersion: OptimisticVersion,
): Promise<IdentityClientResult<ShareRevokeResponse>> {
  const write = await mutationPayload(expectedVersion);
  return invoke('share.revoke', {
    ...write,
    shareTokenId,
  });
}

export async function createCardQrScene(
  shareTokenId: ShareTokenId,
  expectedVersion: OptimisticVersion,
): Promise<IdentityClientResult<ShareCreateQrSceneResponse>> {
  const write = await mutationPayload(expectedVersion);
  return invoke('share.createQrScene', {
    ...write,
    shareTokenId,
    targetType: 'CARD',
    page: 'pages/card-share/index',
  });
}
