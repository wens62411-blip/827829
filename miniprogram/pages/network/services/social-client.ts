import type {
  CloudAction,
  CloudActionData,
  CloudActionPayload,
} from '../../../shared/contracts/action-map';
import { CLOUD_ACTION_REGISTRY } from '../../../shared/contracts/action-registry';
import { callCloudAction } from '../../../shared/services/cloud-client';
import type { IdempotencyKey, UserId } from '../../../shared/types/primitives';
import { createRequestId } from '../../../shared/utils/request-id';

export type SocialAction = {
  readonly [Action in CloudAction]:
    (typeof CLOUD_ACTION_REGISTRY)[Action]['functionName'] extends 'socialApi' ? Action : never;
}[CloudAction];

let idempotencySequence = 0;

export class SocialClientError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable: boolean) {
    super(message);
    this.name = 'SocialClientError';
    this.code = code;
    this.retryable = retryable;
  }
}

/** Keep one key for all retries of the same user intent. */
export function createSocialIdempotencyKey(scope: string): IdempotencyKey {
  idempotencySequence += 1;
  const safeScope = scope.replace(/[^a-z0-9_-]/gi, '-').slice(0, 32) || 'action';
  return `idem_social_${safeScope}_${Date.now().toString(36)}_${idempotencySequence.toString(36)}` as IdempotencyKey;
}

export async function callSocialAction<Action extends SocialAction>(
  action: Action,
  payload: CloudActionPayload<Action>,
): Promise<CloudActionData<Action>> {
  if (CLOUD_ACTION_REGISTRY[action].functionName !== 'socialApi') {
    throw new Error('Action is outside the frozen socialApi boundary.');
  }
  const evidence = await callCloudAction(action, createRequestId(), payload);
  if (!evidence.apiResult.ok) {
    throw new SocialClientError(
      evidence.apiResult.error.code,
      evidence.apiResult.error.message,
      evidence.apiResult.error.retryable,
    );
  }
  return evidence.apiResult.data;
}

/** Reads only the frozen card, relationship and public-claim projections. */
export async function loadRelationshipForViewer(
  ownerUserId: UserId,
): Promise<CloudActionData<'card.getForViewer'>> {
  const evidence = await callCloudAction('card.getForViewer', createRequestId(), { ownerUserId });
  if (!evidence.apiResult.ok) {
    throw new SocialClientError(
      evidence.apiResult.error.code,
      evidence.apiResult.error.message,
      evidence.apiResult.error.retryable,
    );
  }
  return evidence.apiResult.data;
}

export function socialErrorMessage(error: unknown): string {
  if (error instanceof SocialClientError) {
    switch (error.code) {
      case 'AUTH_REQUIRED': return '请先完成登录后再继续。';
      case 'SESSION_EXPIRED': return '登录状态已过期，请重新进入小程序。';
      case 'BLOCKED_RELATIONSHIP': return '当前关系不可执行此操作。';
      case 'VERSION_CONFLICT': return '状态刚刚发生变化，请刷新后重试。';
      case 'IDEMPOTENCY_CONFLICT': return '本次操作与之前请求不一致，请刷新后重试。';
      case 'RATE_LIMITED': return '操作过于频繁，请稍后再试。';
      case 'REVIEW_INVALID_TRANSITION': return '当前审核状态不允许此操作。';
      case 'REVIEW_EVIDENCE_REQUIRED': return '请补齐必要材料后再提交。';
      case 'MEDIA_RIGHTS_REQUIRED': return '部分材料缺少必要授权，请重新选择。';
      case 'SERVICE_UNAVAILABLE': return '服务暂时不可用，请稍后重试。';
      case 'NOT_IMPLEMENTED': return '当前环境尚未接入此能力。';
      default: return error.message || '操作未完成，请稍后重试。';
    }
  }
  if (error instanceof Error && error.message.includes('LOCAL_ONLY')) {
    return '当前为 LOCAL_ONLY，未连接云环境，不会伪造成功结果。';
  }
  return '操作未完成，请检查网络后重试。';
}
