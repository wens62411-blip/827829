import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseCloudApiResult } = require('../../.tmp/test-runtime/shared/services/cloud-client.js');
const { ApiErrorCode } = require('../../.tmp/test-runtime/shared/types/api.js');

const requestId = 'req_contract_123';

test('cloud client accepts only complete success and frozen safe failure envelopes', () => {
  const success = { ok: true, data: { card: null }, requestId };
  assert.equal(parseCloudApiResult('card.getMine', requestId, success), success);

  const failure = {
    ok: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Module pending',
      retryable: false,
      details: { code: 'NOT_IMPLEMENTED', action: 'card.getMine', contractVersion: '1.0.0' },
    },
    requestId,
  };
  assert.equal(parseCloudApiResult('card.getMine', requestId, failure), failure);
});

test('cloud client rejects requestId mismatch and malformed result shapes', () => {
  for (const invalid of [
    null,
    { ok: true, requestId },
    { ok: true, data: {}, error: {}, requestId },
    { ok: true, data: {}, requestId: 'req_different_123' },
    { ok: false, error: { code: 'NOT_IMPLEMENTED', message: 'x', retryable: false }, requestId: 'req_different_123' },
  ]) {
    assert.throws(() => parseCloudApiResult('card.getMine', requestId, invalid));
  }
});

test('cloud client rejects unsafe, mismatched, or action-disallowed error details', () => {
  const failure = (code, details) => ({
    ok: false,
    error: { code, message: 'safe message', retryable: false, details },
    requestId,
  });

  assert.throws(() => parseCloudApiResult(
    'card.getMine',
    requestId,
    failure('NOT_IMPLEMENTED', { code: 'INVALID_REQUEST', reason: 'mismatch' }),
  ));
  assert.throws(() => parseCloudApiResult(
    'card.getMine',
    requestId,
    failure('NOT_IMPLEMENTED', {
      code: 'NOT_IMPLEMENTED',
      action: 'identity.bootstrap',
      contractVersion: '1.0.0',
    }),
  ));
  assert.throws(() => parseCloudApiResult(
    'card.getMine',
    requestId,
    failure('NOT_IMPLEMENTED', {
      code: 'NOT_IMPLEMENTED',
      action: 'card.getMine',
      contractVersion: '1.0.0',
      reviewerNotes: 'must not cross the client boundary',
    }),
  ));
  assert.throws(() => parseCloudApiResult(
    'card.getMine',
    requestId,
    failure('PAYMENT_DISABLED', { code: 'PAYMENT_DISABLED', featureFlag: 'payment' }),
  ));
});
