import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  expectFailure,
  makeHarness,
  root,
} from './helpers.mjs';

const contract = JSON.parse(readFileSync(
  join(root, 'docs', 'contracts', 'actions', 'socialApi.json'),
  'utf8',
));
const actionContract = new Map(contract.actions.map((entry) => [entry.action, entry]));

test('malformed read filters use INVALID_REQUEST and always stay inside each frozen error-code whitelist', async () => {
  const cases = [
    ['friend.listIncoming', { includeExpired: 'false', limit: 20 }],
    ['friend.listIncoming', { includeExpired: false, limit: 0 }],
    ['friend.listAccepted', { limit: 0 }],
    ['friend.listAccepted', { limit: 20, cityId: '!' }],
    ['tag.catalog', { includeDisabled: true }],
    ['verification.listMine', { limit: 0 }],
    ['verification.listMine', { limit: 20, status: 'PENDING' }],
    ['verification.getMine', { verificationRequestId: 'bad' }],
  ];

  for (const [action, payload] of cases) {
    const harness = makeHarness();
    const result = await harness.as('alice').call(action, payload);
    expectFailure(result, 'INVALID_REQUEST');
    const allowed = actionContract.get(action).errorCodes;
    assert.ok(allowed.includes(result.error.code), `${action} emitted non-contract code ${result.error.code}`);
    assert.equal(allowed.includes('VALIDATION_FAILED'), false,
      `${action} is a frozen USER_READ action and must not rely on VALIDATION_FAILED`);
  }
});

test('malformed or filter-mismatched cursors use the frozen INVALID_CURSOR code', async () => {
  const cases = [
    ['friend.listIncoming', { includeExpired: false, limit: 20, cursor: 'not-a-cursor' }],
    ['friend.listAccepted', { limit: 20, cursor: 'social:0:wrong' }],
    ['verification.listMine', { limit: 20, cursor: 'social:1:wrong' }],
  ];

  for (const [action, payload] of cases) {
    const harness = makeHarness();
    const result = await harness.as('alice').call(action, payload);
    expectFailure(result, 'INVALID_CURSOR');
    assert.ok(actionContract.get(action).errorCodes.includes(result.error.code));
  }
});
