import { ApiErrorCode } from '../../../miniprogram/shared/types/api';
import type { CloudAction } from '../../../miniprogram/shared/contracts';
import type { OptimisticVersion } from '../../../miniprogram/shared/types/primitives';
import { SafeApiError } from '../errors';

export interface RawCallEnvelope {
  readonly action?: unknown;
  readonly requestId?: unknown;
  readonly payload?: unknown;
}

export interface ValidCallEnvelope<Action extends CloudAction> {
  readonly action: Action;
  readonly requestId: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const ALLOWED_ENVELOPE_KEYS = new Set(['action', 'requestId', 'payload']);

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

export function isValidRequestId(value: unknown): value is string {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value);
}

export function validateCallEnvelope<Action extends CloudAction>(
  event: unknown,
  allowedActions: readonly Action[],
): ValidCallEnvelope<Action> {
  if (!isPlainRecord(event)) {
    throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, 'The cloud function request must be an object.', {
      details: { code: ApiErrorCode.INVALID_REQUEST, reason: 'ENVELOPE_NOT_OBJECT' },
    });
  }
  const extraKey = Object.keys(event).find((key) => !ALLOWED_ENVELOPE_KEYS.has(key));
  if (extraKey !== undefined) {
    throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, 'The request contains an unsupported field.', {
      details: { code: ApiErrorCode.INVALID_REQUEST, field: extraKey, reason: 'UNEXPECTED_FIELD' },
    });
  }
  if (!isValidRequestId(event.requestId)) {
    throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, 'requestId is missing or malformed.', {
      details: { code: ApiErrorCode.INVALID_REQUEST, field: 'requestId', reason: 'MALFORMED_REQUEST_ID' },
    });
  }
  if (typeof event.action !== 'string' || !allowedActions.includes(event.action as Action)) {
    throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, 'The action is not registered for this function.', {
      details: { code: ApiErrorCode.INVALID_REQUEST, field: 'action', reason: 'ACTION_NOT_REGISTERED' },
    });
  }
  if (!isPlainRecord(event.payload)) {
    throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, 'payload must be an object.', {
      details: { code: ApiErrorCode.INVALID_REQUEST, field: 'payload', reason: 'PAYLOAD_NOT_OBJECT' },
    });
  }
  return {
    action: event.action as Action,
    requestId: event.requestId,
    payload: Object.freeze({ ...event.payload }),
  };
}

export function requireExpectedVersion(
  expectedVersion: number,
  currentVersion: number,
): asserts expectedVersion is OptimisticVersion {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    throw new SafeApiError(ApiErrorCode.VALIDATION_FAILED, 'expectedVersion must be a positive integer.', {
      details: { code: ApiErrorCode.VALIDATION_FAILED, issues: [{ field: 'expectedVersion', rule: 'POSITIVE_INTEGER' }] },
    });
  }
  if (expectedVersion !== currentVersion) {
    throw new SafeApiError(ApiErrorCode.VERSION_CONFLICT, 'The resource was changed by another request.', {
      details: {
        code: ApiErrorCode.VERSION_CONFLICT,
        expectedVersion: expectedVersion as OptimisticVersion,
        currentVersion: currentVersion as OptimisticVersion,
      },
    });
  }
}

export function requireAllowedState<State extends string>(
  currentState: State,
  allowedStates: readonly State[],
  field = 'state',
): void {
  if (!allowedStates.includes(currentState)) {
    throw new SafeApiError(ApiErrorCode.CONFLICT, 'The resource state does not allow this action.', {
      details: { code: ApiErrorCode.CONFLICT, conflictType: `${field.toUpperCase()}_TRANSITION` },
    });
  }
}

export const WRITE_GUARD_SEQUENCE = Object.freeze([
  'TRUSTED_OPENID',
  'RBAC',
  'OBJECT_OWNERSHIP',
  'CURRENT_STATE',
  'OPTIMISTIC_VERSION',
  'IDEMPOTENCY',
  'AUDIT_APPEND',
] as const);

export interface WriteGuardPlan {
  readonly action: CloudAction;
  readonly checks: typeof WRITE_GUARD_SEQUENCE;
  readonly transactionRequired: boolean;
}

export function defineWriteGuardPlan(action: CloudAction): WriteGuardPlan {
  return Object.freeze({ action, checks: WRITE_GUARD_SEQUENCE, transactionRequired: true });
}
