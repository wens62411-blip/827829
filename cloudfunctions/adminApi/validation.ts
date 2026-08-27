import { ReviewStatus } from '../../miniprogram/shared/types/enums';
import { ApiErrorCode } from '../../miniprogram/shared/types/api';
import { SafeApiError } from '../_shared/errors';
import { requireIdempotencyKey } from '../_shared/idempotency';
import { isPlainRecord } from '../_shared/validation';
import { isStrictUtcInstant } from './time';

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{5,127}$/;
const CURSOR_PATTERN = /^[A-Za-z0-9._~:-]{1,512}$/;
const MATERIAL_LOCATOR_PATTERN = /(?:[a-z][a-z0-9+.-]*:\/\/|(?:blob|data):|\/\/[A-Za-z0-9])/i;
const REASON_CODE_PATTERN = /^[A-Z][A-Z0-9_:-]{1,63}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;

const ALLOWED_FIELDS = Object.freeze({
  'admin.bootstrap': ['contractVersion', 'requestedScope'],
  'review.list': ['contractVersion', 'cursor', 'limit', 'domain', 'status'],
  'review.get': ['contractVersion', 'reviewCaseId'],
  'review.approve': ['contractVersion', 'reviewCaseId', 'decisionNote', 'idempotencyKey', 'expectedVersion'],
  'review.reject': ['contractVersion', 'reviewCaseId', 'reasonCode', 'decisionNote', 'idempotencyKey', 'expectedVersion'],
  'review.requestChanges': ['contractVersion', 'reviewCaseId', 'requiredChanges', 'idempotencyKey', 'expectedVersion'],
  'review.revoke': ['contractVersion', 'reviewCaseId', 'reasonCode', 'idempotencyKey', 'expectedVersion'],
  'organizer.review': ['contractVersion', 'reviewCaseId', 'organizerId', 'decision', 'note', 'idempotencyKey', 'expectedVersion'],
  'event.review': ['contractVersion', 'reviewCaseId', 'eventId', 'decision', 'note', 'idempotencyKey', 'expectedVersion'],
  'content.review': ['contractVersion', 'reviewCaseId', 'contentId', 'decision', 'note', 'idempotencyKey', 'expectedVersion'],
  'report.list': ['contractVersion', 'cursor', 'limit', 'status'],
  'report.resolve': ['contractVersion', 'reportId', 'resolution', 'note', 'idempotencyKey', 'expectedVersion'],
  'audit.list': ['contractVersion', 'cursor', 'limit', 'action', 'targetId', 'occurredAfter', 'occurredBefore'],
});

type AdminActionName = keyof typeof ALLOWED_FIELDS;

const WRITE_ACTIONS = new Set<AdminActionName>([
  'review.approve',
  'review.reject',
  'review.requestChanges',
  'review.revoke',
  'organizer.review',
  'event.review',
  'content.review',
  'report.resolve',
]);

function invalid(field: string, reason: string): never {
  throw new SafeApiError(ApiErrorCode.INVALID_REQUEST, 'The admin action payload is invalid.', {
    details: { code: ApiErrorCode.INVALID_REQUEST, field, reason },
  });
}

function requireExactFields(action: AdminActionName, payload: Readonly<Record<string, unknown>>): void {
  const allowed = ALLOWED_FIELDS[action];
  const unexpected = Object.keys(payload).find((field) => !allowed.includes(field));
  if (unexpected !== undefined) invalid(unexpected, 'UNEXPECTED_FIELD');
}

function requireContractVersion(payload: Readonly<Record<string, unknown>>): void {
  if (payload.contractVersion !== undefined && payload.contractVersion !== '1.0.0') {
    invalid('contractVersion', 'UNSUPPORTED_CONTRACT_VERSION');
  }
}

function requireString(
  payload: Readonly<Record<string, unknown>>,
  field: string,
  options: { readonly min?: number; readonly max?: number; readonly noMaterialLocator?: boolean } = {},
): string {
  const value = payload[field];
  const min = options.min ?? 1;
  const max = options.max ?? 500;
  if (typeof value !== 'string'
      || value.length < min
      || value.length > max
      || value !== value.trim()
      || CONTROL_CHARACTER_PATTERN.test(value)) {
    invalid(field, `STRING_LENGTH_${min}_TO_${max}`);
  }
  const normalized = value;
  if (options.noMaterialLocator === true && MATERIAL_LOCATOR_PATTERN.test(normalized)) {
    invalid(field, 'RAW_MATERIAL_LOCATOR_FORBIDDEN');
  }
  return normalized;
}

function requireId(payload: Readonly<Record<string, unknown>>, field: string): string {
  const value = requireString(payload, field, { max: 128 });
  if (!ID_PATTERN.test(value)) invalid(field, 'MALFORMED_STABLE_ID');
  return value;
}

function requireReasonCode(payload: Readonly<Record<string, unknown>>, field: string): string {
  const value = requireString(payload, field, { min: 2, max: 64, noMaterialLocator: true });
  if (!REASON_CODE_PATTERN.test(value)) invalid(field, 'UPPERCASE_REASON_CODE_REQUIRED');
  return value;
}

function requireEnum(
  payload: Readonly<Record<string, unknown>>,
  field: string,
  allowed: readonly string[],
): string {
  const value = requireString(payload, field, { max: 64 });
  if (!allowed.includes(value)) invalid(field, 'UNSUPPORTED_VALUE');
  return value;
}

function requireLimit(payload: Readonly<Record<string, unknown>>): void {
  if (!Number.isSafeInteger(payload.limit) || (payload.limit as number) < 1 || (payload.limit as number) > 50) {
    invalid('limit', 'INTEGER_1_TO_50');
  }
}

function requireOptionalCursor(payload: Readonly<Record<string, unknown>>): void {
  if (payload.cursor !== undefined && (typeof payload.cursor !== 'string' || !CURSOR_PATTERN.test(payload.cursor))) {
    invalid('cursor', 'MALFORMED_CURSOR');
  }
}

function requireUtc(payload: Readonly<Record<string, unknown>>, field: string): void {
  const value = payload[field];
  if (value !== undefined && !isStrictUtcInstant(value)) invalid(field, 'RFC3339_UTC_REQUIRED');
}

function requireWriteGuards(payload: Readonly<Record<string, unknown>>): void {
  requireIdempotencyKey(payload.idempotencyKey);
  if (!Number.isSafeInteger(payload.expectedVersion) || (payload.expectedVersion as number) < 1) {
    invalid('expectedVersion', 'POSITIVE_INTEGER_REQUIRED');
  }
}

function requireOptionalEnum(
  payload: Readonly<Record<string, unknown>>,
  field: string,
  allowed: readonly string[],
): void {
  if (payload[field] !== undefined) requireEnum(payload, field, allowed);
}

export function validateAdminPayload(
  action: AdminActionName,
  candidate: unknown,
): Readonly<Record<string, unknown>> {
  if (!isPlainRecord(candidate)) invalid('payload', 'OBJECT_REQUIRED');
  const payload = Object.freeze({ ...candidate });
  requireExactFields(action, payload);
  requireContractVersion(payload);
  if (WRITE_ACTIONS.has(action)) requireWriteGuards(payload);

  switch (action) {
    case 'admin.bootstrap':
      requireEnum(payload, 'requestedScope', ['REVIEW', 'OPERATIONS', 'AUDIT']);
      break;
    case 'review.list':
      requireLimit(payload);
      requireOptionalCursor(payload);
      requireOptionalEnum(payload, 'domain', ['SOCIAL', 'EVENT', 'CONTENT', 'ORGANIZER', 'REPORT']);
      requireOptionalEnum(payload, 'status', Object.values(ReviewStatus));
      break;
    case 'review.get':
      requireId(payload, 'reviewCaseId');
      break;
    case 'review.approve':
      requireId(payload, 'reviewCaseId');
      requireString(payload, 'decisionNote', { min: 2, max: 500, noMaterialLocator: true });
      break;
    case 'review.reject':
      requireId(payload, 'reviewCaseId');
      requireReasonCode(payload, 'reasonCode');
      requireString(payload, 'decisionNote', { min: 2, max: 500, noMaterialLocator: true });
      break;
    case 'review.requestChanges': {
      requireId(payload, 'reviewCaseId');
      if (!Array.isArray(payload.requiredChanges)
          || payload.requiredChanges.length < 1
          || payload.requiredChanges.length > 10
          || !payload.requiredChanges.every((item) => (
            typeof item === 'string'
            && item.length >= 2
            && item.length <= 200
            && item === item.trim()
            && !CONTROL_CHARACTER_PATTERN.test(item)
            && !MATERIAL_LOCATOR_PATTERN.test(item)
          ))) invalid('requiredChanges', 'ONE_TO_TEN_SAFE_TEXT_ITEMS_REQUIRED');
      break;
    }
    case 'review.revoke':
      requireId(payload, 'reviewCaseId');
      requireReasonCode(payload, 'reasonCode');
      break;
    case 'organizer.review':
      requireId(payload, 'reviewCaseId');
      requireId(payload, 'organizerId');
      requireEnum(payload, 'decision', ['APPROVE', 'REJECT', 'REQUEST_CHANGES']);
      requireString(payload, 'note', { min: 2, max: 500, noMaterialLocator: true });
      break;
    case 'event.review':
      requireId(payload, 'reviewCaseId');
      requireId(payload, 'eventId');
      requireEnum(payload, 'decision', ['APPROVE', 'REJECT', 'REQUEST_CHANGES', 'PAUSE', 'CANCEL']);
      requireString(payload, 'note', { min: 2, max: 500, noMaterialLocator: true });
      break;
    case 'content.review':
      requireId(payload, 'reviewCaseId');
      requireId(payload, 'contentId');
      requireEnum(payload, 'decision', ['APPROVE', 'REJECT', 'REQUEST_CHANGES', 'UNPUBLISH']);
      requireString(payload, 'note', { min: 2, max: 500, noMaterialLocator: true });
      break;
    case 'report.list':
      requireLimit(payload);
      requireOptionalCursor(payload);
      requireOptionalEnum(payload, 'status', ['OPEN', 'RESOLVED', 'DISMISSED']);
      break;
    case 'report.resolve':
      requireId(payload, 'reportId');
      requireEnum(payload, 'resolution', ['ACTION_TAKEN', 'DISMISSED']);
      requireString(payload, 'note', { min: 2, max: 500, noMaterialLocator: true });
      break;
    case 'audit.list':
      requireLimit(payload);
      requireOptionalCursor(payload);
      if (payload.action !== undefined) requireString(payload, 'action', { max: 100 });
      if (payload.targetId !== undefined) requireId(payload, 'targetId');
      requireUtc(payload, 'occurredAfter');
      requireUtc(payload, 'occurredBefore');
      if (typeof payload.occurredAfter === 'string'
          && typeof payload.occurredBefore === 'string'
          && Date.parse(payload.occurredAfter) >= Date.parse(payload.occurredBefore)) {
        invalid('occurredAfter', 'MUST_PRECEDE_OCCURRED_BEFORE');
      }
      break;
  }

  const detached = Object.fromEntries(Object.entries(payload).map(([field, value]) => [
    field,
    Array.isArray(value) ? Object.freeze([...value]) : value,
  ]));
  return Object.freeze(detached);
}

export function isWriteAction(action: AdminActionName): boolean {
  return WRITE_ACTIONS.has(action);
}
