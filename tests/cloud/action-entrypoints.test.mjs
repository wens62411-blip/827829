import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../..', import.meta.url));
const expectedCounts = Object.freeze({
  identityApi: 10,
  socialApi: 17,
  eventApi: 12,
  contentApi: 7,
  adminApi: 13,
});

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('all 59 frozen actions have one executable entrypoint and never fake success', async () => {
  let total = 0;
  for (const [functionName, expectedCount] of Object.entries(expectedCounts)) {
    const contract = readJson(join(root, 'docs', 'contracts', 'actions', `${functionName}.json`));
    const runtime = require(join(root, 'cloudfunctions', functionName, 'index.js'));
    const contractActions = contract.actions.map((entry) => entry.action);

    assert.equal(runtime.ACTIONS.length, expectedCount, `${functionName} action count`);
    assert.deepEqual(runtime.ACTIONS, contractActions, `${functionName} runtime must mirror frozen registry`);
    assert.equal(new Set(runtime.ACTIONS).size, expectedCount, `${functionName} actions are unique`);

    const expectedWriteActions = contract.actions
      .filter((entry) => entry.writableCollections.length > 0)
      .map((entry) => entry.action);
    assert.deepEqual(Object.keys(runtime.endpoint.writeGuardPlans), expectedWriteActions);
    Object.values(runtime.endpoint.writeGuardPlans).forEach((plan) => {
      assert.deepEqual(plan.checks, [
        'TRUSTED_OPENID', 'RBAC', 'OBJECT_OWNERSHIP', 'CURRENT_STATE',
        'OPTIMISTIC_VERSION', 'IDEMPOTENCY', 'AUDIT_APPEND',
      ]);
      assert.equal(plan.transactionRequired, true);
    });

    for (const [index, action] of runtime.ACTIONS.entries()) {
      const requestId = `req_${functionName}_${index}_12345678`;
      const result = await runtime.main({ action, requestId, payload: {} });
      assert.equal(result.ok, false);
      assert.equal(result.requestId, requestId);
      assert.equal(result.error.code, 'NOT_IMPLEMENTED');
      assert.equal(result.error.retryable, false);
      assert.equal(result.error.details.action, action);
      assert.equal(result.error.details.contractVersion, '1.0.0');
      assert.equal('data' in result, false);
      total += 1;
    }
  }
  assert.equal(total, 59);
});

test('illegal action and malformed envelopes fail closed with a consistent result', async () => {
  const { main } = require(join(root, 'cloudfunctions', 'identityApi', 'index.js'));
  const cases = [
    null,
    {},
    { action: 'card.getMine', requestId: 'short', payload: {} },
    { action: 'identity.notReal', requestId: 'req_invalid_12345678', payload: {} },
    { action: 'card.getMine', requestId: 'req_payload_12345678', payload: [] },
    { action: 'card.getMine', requestId: 'req_extra_12345678', payload: {}, openid: 'client-controlled' },
  ];

  for (const event of cases) {
    const result = await main(event);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'INVALID_REQUEST');
    assert.equal(result.error.retryable, false);
    assert.match(result.requestId, /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/);
    assert.equal(JSON.stringify(result).includes('client-controlled'), false);
  }
});
