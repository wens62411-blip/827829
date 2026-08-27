import { randomUUID } from 'node:crypto';
import {
  CLOUD_ACTION_REGISTRY,
  type CloudAction,
  type CloudFunctionName,
} from '../../../miniprogram/shared/contracts';
import type { ApiResult } from '../../../miniprogram/shared/types/api';
import type { RequestId } from '../../../miniprogram/shared/types/primitives';
import { defineWriteGuardPlan, isPlainRecord, isValidRequestId, validateCallEnvelope } from '../validation';
import type { WriteGuardPlan } from '../validation';
import { ApiErrorCode, apiFailure, safeFailureFromError } from './index';

export type CloudFunctionMain = (
  event: unknown,
  context?: Readonly<Record<string, unknown>>,
) => Promise<ApiResult<never>>;

export interface NotImplementedEndpoint<Action extends CloudAction> {
  readonly actions: readonly Action[];
  readonly writeGuardPlans: Readonly<Partial<Record<Action, WriteGuardPlan>>>;
  readonly main: CloudFunctionMain;
}

function responseRequestId(event: unknown): RequestId {
  if (isPlainRecord(event) && isValidRequestId(event.requestId)) return event.requestId as RequestId;
  return `srv_${randomUUID()}` as RequestId;
}

export function createNotImplementedEndpoint<Action extends CloudAction>(
  functionName: CloudFunctionName,
  actions: readonly Action[],
): NotImplementedEndpoint<Action> {
  const writeGuardPlans: Partial<Record<Action, WriteGuardPlan>> = {};
  const unique = new Set(actions);
  if (unique.size !== actions.length) throw new Error(`${functionName} contains duplicate actions`);

  actions.forEach((action) => {
    const contract = CLOUD_ACTION_REGISTRY[action];
    if (contract.functionName !== functionName) {
      throw new Error(`${action} is not registered to ${functionName}`);
    }
    if (contract.writableCollections.length > 0) writeGuardPlans[action] = defineWriteGuardPlan(action);
  });

  const main: CloudFunctionMain = async (event) => {
    const requestId = responseRequestId(event);
    try {
      const request = validateCallEnvelope(event, actions);
      return apiFailure(request.requestId as RequestId, ApiErrorCode.NOT_IMPLEMENTED, 'This action is registered but not implemented.', {
        retryable: false,
        details: {
          code: ApiErrorCode.NOT_IMPLEMENTED,
          action: request.action,
          contractVersion: '1.0.0',
        },
      });
    } catch (error) {
      return safeFailureFromError(
        requestId,
        error instanceof Error ? error : new Error('Non-error thrown at cloud boundary'),
      );
    }
  };

  return Object.freeze({
    actions: Object.freeze([...actions]),
    writeGuardPlans: Object.freeze({ ...writeGuardPlans }),
    main,
  });
}
