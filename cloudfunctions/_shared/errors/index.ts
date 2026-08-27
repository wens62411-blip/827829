import {
  ApiErrorCode,
  type ApiErrorCode as ApiErrorCodeValue,
} from '../../../miniprogram/shared/types/api';
import type {
  ApiErrorDetails,
  ApiFailure,
} from '../../../miniprogram/shared/types/api';
import type { RequestId } from '../../../miniprogram/shared/types/primitives';

const RETRYABLE_CODES: ReadonlySet<ApiErrorCodeValue> = new Set([
  ApiErrorCode.RATE_LIMITED,
  ApiErrorCode.SERVICE_UNAVAILABLE,
  ApiErrorCode.INTERNAL_ERROR,
]);

export class SafeApiError<Code extends ApiErrorCodeValue> extends Error {
  readonly code: Code;
  readonly retryable: boolean;
  readonly details?: ApiErrorDetails<Code>;

  constructor(
    code: Code,
    message: string,
    options: { readonly retryable?: boolean; readonly details?: ApiErrorDetails<Code> } = {},
  ) {
    super(message);
    this.name = 'SafeApiError';
    this.code = code;
    this.retryable = options.retryable ?? RETRYABLE_CODES.has(code);
    if (options.details !== undefined) this.details = options.details;
  }
}

export function apiFailure<Code extends ApiErrorCodeValue>(
  requestId: RequestId,
  code: Code,
  message: string,
  options: { readonly retryable?: boolean; readonly details?: ApiErrorDetails<Code> } = {},
): ApiFailure {
  const error = options.details === undefined
    ? { code, message, retryable: options.retryable ?? RETRYABLE_CODES.has(code) }
    : { code, message, retryable: options.retryable ?? RETRYABLE_CODES.has(code), details: options.details };
  return { ok: false, error, requestId } as ApiFailure;
}

export function safeFailureFromError(requestId: RequestId, error: Error): ApiFailure {
  if (error instanceof SafeApiError) {
    return apiFailure(requestId, error.code, error.message, {
      retryable: error.retryable,
      ...(error.details === undefined ? {} : { details: error.details }),
    });
  }

  return apiFailure(requestId, ApiErrorCode.INTERNAL_ERROR, 'The request could not be completed.', {
    retryable: true,
    details: {
      code: ApiErrorCode.INTERNAL_ERROR,
      incidentId: requestId,
    },
  });
}

export { ApiErrorCode };
