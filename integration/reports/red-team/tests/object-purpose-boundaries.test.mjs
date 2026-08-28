import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FakeIdentityStore,
  call as callIdentity,
  makeRuntime as makeIdentityRuntime,
} from '../../../../tests/cloud/identity/fake-runtime.mjs';
import {
  LABELS,
  NOW,
  PRINCIPALS,
  collection,
  expectSuccess,
  idempotencyKey,
  makeHarness,
} from '../../../../tests/cloud/social/helpers.mjs';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const identityApi = require(join(root, 'cloudfunctions', 'identityApi', 'index.js'));
const source = (path) => readFileSync(join(root, path), 'utf8');

function identityIdempotency(suffix) {
  return `idem_red_team_object_${suffix}_12345678`;
}

async function bootstrapIdentity(context, openId, suffix) {
  context.identity.openId = openId;
  const result = await callIdentity(context.endpoint, 'identity.bootstrap', {
    idempotencyKey: identityIdempotency(`bootstrap_${suffix}`),
    expectedVersion: 0,
    requestedRuntime: 'CLOUD',
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.data.session.userId;
}

async function createVerificationMedia(harness, suffix) {
  const draft = expectSuccess(await harness.as('alice').call('verification.createDraft', {
    labelId: LABELS.identity._id,
    idempotencyKey: idempotencyKey(`red_team_draft_${suffix}`),
  })).request;
  const policy = expectSuccess(await harness.as('alice').call('verification.uploadPolicy', {
    verificationRequestId: draft.verificationRequestId,
    mediaType: 'IMAGE',
    fileSizeBytes: 64_000,
    sha256: 'a'.repeat(64),
    idempotencyKey: idempotencyKey(`red_team_upload_${suffix}`),
  }));
  await harness.repository.markMediaUploaded(policy.mediaAssetId, NOW);
  return { draft, policy };
}

test('[P1][OPEN] a profile accepts and publishes an approved avatar asset without owner or purpose binding', async () => {
  const context = makeIdentityRuntime(identityApi, {
    store: new FakeIdentityStore(),
    now: '2026-08-27T08:00:00.000Z',
  });
  const aliceOpenId = 'red_team_avatar_alice_openid_001';
  const bobOpenId = 'red_team_avatar_bob_openid_00001';
  const aliceUserId = await bootstrapIdentity(context, aliceOpenId, 'alice');
  await bootstrapIdentity(context, bobOpenId, 'bob');

  const bobOwnedAssetId = 'media_bob_avatar_private_123456';
  const bobOwnedUrl = 'https://cdn.example.test/avatar/bob-red-team.jpg';
  context.store.seedMediaUrl(bobOwnedAssetId, bobOwnedUrl);

  context.identity.openId = aliceOpenId;
  const updated = await callIdentity(context.endpoint, 'profile.updateMine', {
    idempotencyKey: identityIdempotency('alice_foreign_avatar'),
    expectedVersion: 0,
    profile: {
      displayName: 'Synthetic Alice',
      avatarAssetId: bobOwnedAssetId,
    },
  });
  assert.equal(updated.ok, true, JSON.stringify(updated));
  assert.equal(updated.data.profile.avatarAssetId, bobOwnedAssetId);

  const refreshed = await callIdentity(context.endpoint, 'card.refreshProjection', {
    idempotencyKey: identityIdempotency('alice_foreign_avatar_projection'),
    expectedVersion: 1,
    reason: 'PROFILE_CHANGED',
  });
  assert.equal(refreshed.ok, true, JSON.stringify(refreshed));
  assert.equal(refreshed.data.card.ownerUserId, aliceUserId);
  assert.equal(refreshed.data.card.avatarUrl, bobOwnedUrl);
});

test('[P1][OPEN] a VERIFICATION media asset can be reused as REPORT evidence', async () => {
  const harness = makeHarness();
  const { policy } = await createVerificationMedia(harness, 'purpose_reuse');
  const mediaBefore = collection(harness.snapshot(), 'mediaAssets')
    .find((asset) => asset._id === policy.mediaAssetId);
  assert.equal(mediaBefore.domain, 'VERIFICATION');
  assert.equal(mediaBefore.ownerUserId, PRINCIPALS.alice.userId);

  const report = expectSuccess(await harness.as('alice').call('report.create', {
    targetType: 'USER',
    targetId: PRINCIPALS.bob.userId,
    reasonCode: 'RIGHTS',
    evidenceAssetIds: [policy.mediaAssetId],
    idempotencyKey: idempotencyKey('red_team_verification_as_report'),
  })).report;
  assert.equal(report.status, 'OPEN');

  const storedReport = collection(harness.snapshot(), 'blocksReports')
    .find((record) => record.recordType === 'REPORT');
  assert.deepEqual(storedReport.evidenceAssetIds, [policy.mediaAssetId]);
});

test('[P1][OPEN] PHYSICAL verification withdrawal retains its media record and report reference', async () => {
  const harness = makeHarness();
  const { draft, policy } = await createVerificationMedia(harness, 'withdraw_retention');
  expectSuccess(await harness.as('alice').call('report.create', {
    targetType: 'USER',
    targetId: PRINCIPALS.bob.userId,
    reasonCode: 'RIGHTS',
    evidenceAssetIds: [policy.mediaAssetId],
    idempotencyKey: idempotencyKey('red_team_report_before_withdraw'),
  }));

  const currentRequest = collection(harness.snapshot(), 'verificationRequests')
    .find((request) => request._id === draft.verificationRequestId);
  const withdrawal = expectSuccess(await harness.as('alice').call('verification.withdraw', {
    verificationRequestId: draft.verificationRequestId,
    expectedVersion: currentRequest.version,
    idempotencyKey: idempotencyKey('red_team_physical_withdraw'),
  })).withdrawal;
  assert.equal(withdrawal.deletionMode, 'PHYSICAL');

  const snapshot = harness.snapshot();
  assert.equal(collection(snapshot, 'verificationRequests')
    .some((request) => request._id === draft.verificationRequestId), false);
  assert.equal(collection(snapshot, 'mediaAssets')
    .some((asset) => asset._id === policy.mediaAssetId), true);
  assert.equal(collection(snapshot, 'blocksReports')
    .some((record) => record.recordType === 'REPORT'
      && record.evidenceAssetIds.includes(policy.mediaAssetId)), true);
});

test('[P1][OPEN] failed relationship refreshes retain cached FRIENDS_ONLY projections', () => {
  const network = source('miniprogram/pages/network/index.ts');
  const networkCatch = network.match(/catch \(error\) \{\s*this\.setData\(\{ loaded: false, errorMessage:[^}]+\}\);\s*\}/)?.[0];
  assert.equal(typeof networkCatch, 'string');
  assert.doesNotMatch(networkCatch, /acceptedPreview:\s*\[\]|incomingPreview:\s*\[\]/);

  const friend = source('miniprogram/packageSocial/pages/friend/index.ts');
  assert.match(friend, /onLoad\([\s\S]*?void this\.loadRelationship\(\)/);
  assert.doesNotMatch(friend, /onShow\s*\(/);
  const friendCatch = friend.match(/async loadRelationship\([\s\S]*?catch \(error\) \{([\s\S]*?)\}\s*finally/)?.[1];
  assert.equal(typeof friendCatch, 'string');
  assert.doesNotMatch(friendCatch, /card:\s*null|claims:\s*\[\]|relationship:\s*null/);

  const template = source('miniprogram/packageSocial/pages/friend/index.wxml');
  assert.match(template, /wx:if="\{\{card\}\}"[\s\S]*card\.headline[\s\S]*card\.biography/);
});
