import { createHash } from 'node:crypto';
import { ApiErrorCode } from '../../../miniprogram/shared/types/api';
import type { IdempotencyKey, RequestId } from '../../../miniprogram/shared/types/primitives';
import type { CloudAction, CloudFunctionName } from '../../../miniprogram/shared/contracts';
import { SafeApiError } from '../errors';

export type JsonScalar = string | number | boolean | null;
export type JsonValue = JsonScalar | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export interface IdempotencyClaim {
  readonly namespace: string;
  readonly requestFingerprint: string;
  readonly requestId: RequestId;
  readonly expiresAt: string;
}

export interface ExistingIdempotencyRecord extends IdempotencyClaim {
  readonly status: 'IN_PROGRESS' | 'COMPLETED';
}

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;

export function requireIdempotencyKey(value: unknown): IdempotencyKey {
  if (typeof value !== 'string' || !IDEMPOTENCY_KEY_PATTERN.test(value)) {
    throw new SafeApiError(ApiErrorCode.VALIDATION_FAILED, 'A valid idempotencyKey is required for writes.', {
      details: {
        code: ApiErrorCode.VALIDATION_FAILED,
        issues: [{ field: 'idempotencyKey', rule: 'STABLE_16_TO_128_CHARS' }],
      },
    });
  }
  return value as IdempotencyKey;
}

function canonicalize(value: JsonValue): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const objectValue = value as { readonly [key: string]: JsonValue };
  return `{${Object.keys(objectValue).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(objectValue[key] as JsonValue)}`).join(',')}}`;
}

export function fingerprintPayload(payload: JsonValue): string {
  return createHash('sha256').update(canonicalize(payload), 'utf8').digest('hex');
}

export function createIdempotencyClaim(input: {
  readonly functionName: CloudFunctionName;
  readonly action: CloudAction;
  readonly openId: string;
  readonly key: IdempotencyKey;
  readonly payload: JsonValue;
  readonly requestId: RequestId;
  readonly expiresAt: string;
}): IdempotencyClaim {
  const namespace = `${input.functionName}:${input.action}:${input.openId}:${input.key}`;
  return Object.freeze({
    namespace,
    requestFingerprint: fingerprintPayload(input.payload),
    requestId: input.requestId,
    expiresAt: input.expiresAt,
  });
}

export function assertIdempotencyCompatible(
  claim: IdempotencyClaim,
  existing: ExistingIdempotencyRecord | null,
): 'NEW' | 'REPLAY' | 'IN_PROGRESS' {
  if (existing === null) return 'NEW';
  if (existing.namespace !== claim.namespace || existing.requestFingerprint !== claim.requestFingerprint) {
    throw new SafeApiError(ApiErrorCode.IDEMPOTENCY_CONFLICT, 'The idempotency key was used for another request.', {
      details: { code: ApiErrorCode.IDEMPOTENCY_CONFLICT, firstRequestId: existing.requestId },
    });
  }
  return existing.status === 'COMPLETED' ? 'REPLAY' : 'IN_PROGRESS';
}
