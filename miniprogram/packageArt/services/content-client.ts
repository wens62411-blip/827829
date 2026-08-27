import type {
  ContentGetResponse,
  ContentListCollectionsResponse,
  ContentListRelatedEventsResponse,
  ContentListResponse,
} from '../../shared/contracts';
import { callCloudAction } from '../../shared/services';
import { createRequestId } from '../../shared/utils/request-id';
import type { ApiErrorCode } from '../../shared/types/api';
import type {
  ContentId,
  ContentIntentId,
  IdempotencyKey,
  OptimisticVersion,
  PaginationCursor,
} from '../../shared/types/primitives';
import type { RuntimeMode } from '../../shared/types/enums';
import type {
  ArtCategory,
  ArtCollection,
  ArtContentDetail,
  ArtCreator,
  ArtIntentProjection,
} from '../model';
import {
  isArtIntentProjection,
  isKnownCityId,
  isPublicArtCollection,
  isPublicArtContent,
  isPublicArtCreator,
} from '../model';

export { isArtIntentProjection } from '../model';

const CONTRACT_VERSION = '1.0.0' as const;
const INVALID_PUBLIC_DATA_MESSAGE = '公开内容字段不完整或状态不可公开，已停止展示。';
const TRANSPORT_MESSAGE = '当前无法连接内容服务，未产生成功结果。请检查网络后重试。';

interface ArtAppGlobalData {
  readonly runtimeMode?: RuntimeMode;
  readonly cloudEnvironmentConfigured?: boolean;
}

interface ArtApp {
  readonly globalData?: ArtAppGlobalData;
}

export interface RuntimeEvidence {
  readonly runtimeMode: RuntimeMode;
  readonly cloudConfigured: boolean;
}

export type ArtClientSuccess<T> = {
  readonly ok: true;
  readonly data: T;
  readonly requestId: string;
};

export type ArtClientFailure = {
  readonly ok: false;
  readonly code?: ApiErrorCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly requestId: string;
};

export type ArtClientResult<T> = ArtClientSuccess<T> | ArtClientFailure;

export interface ArtIntentResponse {
  readonly intent: ArtIntentProjection;
}

function failure(requestId: string, message: string, retryable: boolean, code?: ApiErrorCode): ArtClientFailure {
  return {
    ok: false,
    message,
    retryable,
    requestId,
    ...(code === undefined ? {} : { code }),
  };
}

export function getRuntimeEvidence(): RuntimeEvidence {
  try {
    const app = getApp<ArtApp>();
    return {
      runtimeMode: app.globalData?.runtimeMode ?? 'OFFLINE_DEMO',
      cloudConfigured: app.globalData?.cloudEnvironmentConfigured === true,
    };
  } catch (_error) {
    return { runtimeMode: 'OFFLINE_DEMO', cloudConfigured: false };
  }
}

async function invoke<Action extends
  | 'content.list'
  | 'content.get'
  | 'content.listCollections'
  | 'content.listRelatedEvents'
  | 'content.intent.create'
  | 'content.intent.cancel'>(
  action: Action,
  payload: Parameters<typeof callCloudAction<Action>>[2],
): Promise<ArtClientResult<unknown>> {
  const requestId = createRequestId();
  try {
    const evidence = await callCloudAction(action, requestId, payload);
    if (!evidence.apiResult.ok) {
      return failure(
        requestId,
        evidence.apiResult.error.message,
        evidence.apiResult.error.retryable,
        evidence.apiResult.error.code,
      );
    }
    return { ok: true, data: evidence.apiResult.data, requestId };
  } catch (_error) {
    return failure(requestId, TRANSPORT_MESSAGE, true);
  }
}

export async function listPublicContent(input: {
  readonly category?: ArtCategory;
  readonly cursor?: PaginationCursor;
  readonly limit?: number;
}): Promise<ArtClientResult<{
  readonly items: readonly ArtContentDetail[];
  readonly nextCursor?: PaginationCursor;
  readonly hasMore: boolean;
}>> {
  const result = await invoke('content.list', {
    contractVersion: CONTRACT_VERSION,
    limit: input.limit ?? 12,
    ...(input.category === undefined ? {} : { category: input.category }),
    ...(input.cursor === undefined ? {} : { cursor: input.cursor }),
  });
  if (!result.ok) return result;
  const response = result.data as ContentListResponse;
  if (
    !response.page ||
    !Array.isArray(response.page.items) ||
    !response.page.items.every(isPublicArtContent) ||
    (input.category !== undefined && !response.page.items.every((item) => item.category === input.category))
  ) {
    return failure(result.requestId, INVALID_PUBLIC_DATA_MESSAGE, false);
  }
  return {
    ok: true,
    requestId: result.requestId,
    data: {
      items: response.page.items,
      hasMore: response.page.hasMore === true,
      ...(response.page.nextCursor === undefined ? {} : { nextCursor: response.page.nextCursor }),
    },
  };
}

export async function listPublicCollections(category?: ArtCategory): Promise<ArtClientResult<readonly ArtCollection[]>> {
  const result = await invoke('content.listCollections', {
    contractVersion: CONTRACT_VERSION,
    limit: 12,
    ...(category === undefined ? {} : { category }),
  });
  if (!result.ok) return result;
  const response = result.data as ContentListCollectionsResponse;
  if (
    !response.page ||
    !Array.isArray(response.page.items) ||
    !response.page.items.every(isPublicArtCollection) ||
    (category !== undefined && !response.page.items.every((item) =>
      isPublicArtCollection(item) && item.categories.includes(category)
    ))
  ) {
    return failure(result.requestId, INVALID_PUBLIC_DATA_MESSAGE, false);
  }
  return { ok: true, requestId: result.requestId, data: response.page.items };
}

export async function getPublicContent(contentId: ContentId): Promise<ArtClientResult<{
  readonly content: ArtContentDetail;
  readonly creator: ArtCreator;
}>> {
  const result = await invoke('content.get', { contractVersion: CONTRACT_VERSION, contentId });
  if (!result.ok) return result;
  const response = result.data as ContentGetResponse & {
    readonly content: ArtContentDetail;
    readonly creator: ArtCreator;
  };
  if (
    !isPublicArtContent(response.content) ||
    !isPublicArtCreator(response.creator) ||
    response.creator.creatorId !== response.content.creatorId ||
    response.creator.displayName !== response.content.creatorDisplayName
  ) {
    return failure(result.requestId, INVALID_PUBLIC_DATA_MESSAGE, false);
  }
  return { ok: true, requestId: result.requestId, data: response };
}

export async function listRelatedEvents(contentId: ContentId): Promise<ArtClientResult<ContentListRelatedEventsResponse>> {
  const result = await invoke('content.listRelatedEvents', { contractVersion: CONTRACT_VERSION, contentId });
  if (!result.ok) return result;
  const response = result.data as ContentListRelatedEventsResponse;
  if (!Array.isArray(response.events)) return failure(result.requestId, INVALID_PUBLIC_DATA_MESSAGE, false);
  const events = response.events.filter((event) =>
    event.publicationState === 'PUBLISHED' && event.state === 'PUBLISHED' && isKnownCityId(event.cityId),
  );
  return {
    ok: true,
    requestId: result.requestId,
    data: { events, filteredUnavailableCount: response.filteredUnavailableCount },
  };
}

function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, '0')).join('');
}

export async function createArtIdempotencyKey(): Promise<IdempotencyKey> {
  const entropy = await new Promise<string | undefined>((resolve) => {
    wx.getRandomValues({
      length: 16,
      success: (result) => resolve(bytesToHex(result.randomValues)),
      fail: () => resolve(undefined),
    });
  });
  return `idem_art_${entropy ?? `${Date.now().toString(36)}_${createRequestId()}`}` as IdempotencyKey;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateArtIntentResponse(
  result: ArtClientSuccess<unknown>,
  expected: {
    readonly intentId?: ContentIntentId;
    readonly contentId?: ContentId;
    readonly state: 'ACTIVE' | 'CANCELLED';
    readonly versionGreaterThan?: OptimisticVersion;
  },
): ArtClientResult<ArtIntentResponse> {
  const response = result.data;
  if (!isRecord(response) || !isArtIntentProjection(response.intent)) {
    return failure(result.requestId, INVALID_PUBLIC_DATA_MESSAGE, false);
  }
  const intent = response.intent;
  if (
    intent.state !== expected.state ||
    (expected.intentId !== undefined && intent.intentId !== expected.intentId) ||
    (expected.contentId !== undefined && intent.contentId !== expected.contentId) ||
    (expected.versionGreaterThan !== undefined && intent.version <= expected.versionGreaterThan)
  ) {
    return failure(result.requestId, INVALID_PUBLIC_DATA_MESSAGE, false);
  }
  return { ok: true, requestId: result.requestId, data: { intent } };
}

export async function createContentIntent(input: {
  readonly contentId: ContentId;
  readonly message: string;
  readonly idempotencyKey: IdempotencyKey;
  readonly expectedVersion?: OptimisticVersion;
}): Promise<ArtClientResult<ArtIntentResponse>> {
  const result = await invoke('content.intent.create', {
    contractVersion: CONTRACT_VERSION,
    contentId: input.contentId,
    message: input.message,
    idempotencyKey: input.idempotencyKey,
    ...(input.expectedVersion === undefined ? {} : { expectedVersion: input.expectedVersion }),
  });
  if (!result.ok) return result;
  return validateArtIntentResponse(result, { contentId: input.contentId, state: 'ACTIVE' });
}

export async function cancelContentIntent(input: {
  readonly intentId: ContentIntentId;
  readonly expectedVersion: OptimisticVersion;
  readonly idempotencyKey: IdempotencyKey;
}): Promise<ArtClientResult<ArtIntentResponse>> {
  const result = await invoke('content.intent.cancel', {
    contractVersion: CONTRACT_VERSION,
    intentId: input.intentId,
    expectedVersion: input.expectedVersion,
    idempotencyKey: input.idempotencyKey,
  });
  if (!result.ok) return result;
  return validateArtIntentResponse(result, {
    intentId: input.intentId,
    state: 'CANCELLED',
    versionGreaterThan: input.expectedVersion,
  });
}
