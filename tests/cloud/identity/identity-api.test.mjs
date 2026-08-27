import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FakeIdentityStore,
  call,
  makeRuntime,
  relationship,
  versioned,
} from './fake-runtime.mjs';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../..', import.meta.url));
const api = require(process.env.IDENTITY_API_TEST_BUNDLE
  ?? join(root, 'cloudfunctions', 'identityApi', 'index.js'));
const NOW = '2026-08-27T08:00:00.000Z';

function idempotency(suffix) {
  return `idem_identity_${suffix}_12345678`;
}

function serializedMapValues(map) {
  return JSON.stringify([...map.values()]);
}

async function bootstrapAs(context, openId, suffix) {
  context.identity.openId = openId;
  const result = await call(context.endpoint, 'identity.bootstrap', {
    idempotencyKey: idempotency(`bootstrap_${suffix}`),
    expectedVersion: 0,
    requestedRuntime: 'CLOUD',
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.data.session.userId;
}

function approvedClaim(subjectUserId, extra = {}) {
  return versioned(NOW, {
    claimId: 'claim_human_approved_123',
    subjectUserId,
    labelId: 'label_founder_123456',
    labelText: { zh: '创始会员', en: 'Founding member' },
    reviewStatus: 'APPROVED',
    verificationState: 'HUMAN_REVIEWED',
    publicVisible: true,
    validFrom: '2026-01-01T00:00:00.000Z',
    validUntil: '2027-01-01T00:00:00.000Z',
    ...extra,
  });
}

async function provision() {
  const context = makeRuntime(api, { store: new FakeIdentityStore(), now: NOW });
  const aliceOpenId = 'trusted_alice_openid_123456';
  const bobOpenId = 'trusted_bob_openid_12345678';
  const carolOpenId = 'trusted_carol_openid_123456';
  const aliceId = await bootstrapAs(context, aliceOpenId, 'alice');
  const bobId = await bootstrapAs(context, bobOpenId, 'bob');
  const carolId = await bootstrapAs(context, carolOpenId, 'carol');

  context.identity.openId = aliceOpenId;
  const updated = await call(context.endpoint, 'profile.updateMine', {
    idempotencyKey: idempotency('profile_create'),
    expectedVersion: 0,
    profile: {
      displayName: 'Alice 安然',
      cityId: 'cn-shenzhen',
      biography: '连接真诚而有趣的人。',
      avatarAssetId: 'media_avatar_alice_123',
    },
  });
  assert.equal(updated.ok, true, JSON.stringify(updated));

  const baseProfile = context.store.state.profilesByUser.get(aliceId);
  context.store.seedProfile({
    ...baseProfile,
    headline: 'Founder · Builder',
    industry: 'Technology',
    company: 'AB Labs',
    position: 'Founder',
    experience: ['Built trusted communities'],
    interests: ['Art', 'Hiking'],
    phone: '+86 13800138000',
    email: 'alice.private@example.test',
    governmentId: '440300199001011234',
    verificationEvidenceUrls: ['cloud://private/evidence/alice-id.jpg'],
    wechatIdentifiers: { openid: aliceOpenId, unionid: 'private_unionid_alice_123' },
    riskControl: { flags: ['INTERNAL_ONLY'], lastEvaluatedAt: NOW },
    visibility: {
      ...api.DEFAULT_PROFILE_VISIBILITY,
      displayName: 'PUBLIC',
      avatarAssetId: 'FRIENDS_ONLY',
      cityId: 'PRIVATE',
      biography: 'FRIENDS_ONLY',
      headline: 'PRIVATE',
      industry: 'PUBLIC',
      company: 'FRIENDS_ONLY',
      position: 'PRIVATE',
      experience: 'FRIENDS_ONLY',
      interests: 'PUBLIC',
    },
  });
  context.store.seedMediaUrl('media_avatar_alice_123', 'https://cdn.example.test/avatar/alice.jpg');
  context.store.seedClaims(aliceId, [
    approvedClaim(aliceId),
    approvedClaim(aliceId, {
      claimId: 'claim_ai_only_123456',
      verificationState: 'AI_CONSISTENCY_CHECKED',
    }),
    approvedClaim(aliceId, {
      claimId: 'claim_expired_123456',
      validUntil: '2026-02-01T00:00:00.000Z',
    }),
    approvedClaim(aliceId, {
      claimId: 'claim_revoked_123456',
      reviewStatus: 'REVOKED',
      publicVisible: false,
    }),
  ]);

  const refreshed = await call(context.endpoint, 'card.refreshProjection', {
    idempotencyKey: idempotency('card_refresh_1'),
    expectedVersion: 1,
    reason: 'PROFILE_CHANGED',
  });
  assert.equal(refreshed.ok, true, JSON.stringify(refreshed));

  return {
    ...context,
    aliceOpenId,
    bobOpenId,
    carolOpenId,
    aliceId,
    bobId,
    carolId,
    card: refreshed.data.card,
  };
}

test('trusted bootstrap ignores client identity, hashes OPENID, and replays idempotently', async () => {
  const context = makeRuntime(api, { now: NOW });
  const rawOpenId = 'trusted_bootstrap_openid_12345';
  context.identity.openId = rawOpenId;
  const payload = {
    idempotencyKey: idempotency('bootstrap_trusted'),
    expectedVersion: 0,
    requestedRuntime: 'CLOUD',
  };
  const first = await call(context.endpoint, 'identity.bootstrap', payload);
  const replay = await call(context.endpoint, 'identity.bootstrap', payload);
  assert.equal(first.ok, true);
  assert.equal(replay.ok, true);
  assert.equal(replay.data.session.userId, first.data.session.userId);
  assert.equal(context.store.state.usersById.size, 1);
  assert.equal(serializedMapValues(context.store.state.usersById).includes(rawOpenId), false);
  assert.equal(serializedMapValues(context.store.state.idempotency).includes(rawOpenId), false);
  assert.equal(context.store.state.audits.some((entry) => 'openId' in entry), false);

  const conflict = await call(context.endpoint, 'identity.bootstrap', {
    idempotencyKey: payload.idempotencyKey,
    expectedVersion: 0,
  });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.error.code, 'IDEMPOTENCY_CONFLICT');

  const untrusted = await call(context.endpoint, 'identity.bootstrap', {
    ...payload,
    idempotencyKey: idempotency('bootstrap_untrusted'),
    openid: 'attacker_openid_123456789',
  });
  assert.equal(untrusted.ok, false);
  assert.equal(untrusted.error.code, 'INVALID_REQUEST');
  assert.equal(context.store.state.usersById.size, 1);
});

test('every profile field obeys PUBLIC, FRIENDS_ONLY, PRIVATE across all viewer tiers', () => {
  const samples = {
    displayName: 'Alice',
    avatarAssetId: 'media_avatar_123456',
    cityId: 'cn-shenzhen',
    biography: 'Biography',
    headline: 'Headline',
    industry: 'Technology',
    company: 'AB Labs',
    position: 'Founder',
    experience: ['Experience'],
    interests: ['Art'],
  };
  const base = {
    _id: 'profile_matrix_123456',
    userId: 'user_matrix_123456',
    ...samples,
    requiredProjectionVersion: 1,
    version: 1,
    createdAt: NOW,
    updatedAt: NOW,
  };
  const tiers = ['STRANGER', 'FRIEND', 'OWNER'];
  const visibilityValues = ['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE'];
  for (const field of api.PROFILE_FIELD_KEYS) {
    for (const visibility of visibilityValues) {
      const profile = {
        ...base,
        visibility: { ...api.DEFAULT_PROFILE_VISIBILITY, [field]: visibility },
      };
      for (const tier of tiers) {
        const selected = api.selectVisibleProfileFields(profile, tier);
        const expected = tier === 'OWNER'
          || visibility === 'PUBLIC'
          || (tier === 'FRIEND' && visibility === 'FRIENDS_ONLY');
        assert.equal(field in selected, expected, `${field}/${visibility}/${tier}`);
      }
    }
  }

  const maliciousVisibility = {
    ...api.DEFAULT_PROFILE_VISIBILITY,
    phone: 'PUBLIC',
    governmentId: 'PUBLIC',
    verificationEvidenceUrls: 'PUBLIC',
    wechatIdentifiers: 'PUBLIC',
    riskControl: 'PUBLIC',
  };
  const selected = api.selectVisibleProfileFields({
    ...base,
    phone: '+86 13800138000',
    governmentId: 'secret-id',
    verificationEvidenceUrls: ['cloud://secret'],
    wechatIdentifiers: { openid: 'secret-openid' },
    riskControl: { flags: ['secret-risk'] },
    visibility: maliciousVisibility,
  }, 'OWNER');
  const serialized = JSON.stringify(selected);
  for (const secret of ['13800138000', 'secret-id', 'cloud://secret', 'secret-openid', 'secret-risk']) {
    assert.equal(serialized.includes(secret), false);
  }
  assert.equal(api.validateProfileVisibility(maliciousVisibility), false);
});

test('owner, stranger, and accepted friend receive distinct safe card projections', async () => {
  const context = await provision();
  context.identity.openId = context.aliceOpenId;
  const privateDto = await call(context.endpoint, 'profile.getMine', { includeCompletion: true });
  assert.equal(privateDto.ok, true);
  assert.equal(privateDto.data.profile.phoneMasked, '***8000');
  assert.equal(privateDto.data.profile.emailMasked, 'a***@example.test');
  assert.equal(JSON.stringify(privateDto.data).includes('+86 13800138000'), false);
  assert.equal(JSON.stringify(privateDto.data).includes('cloud://private/evidence'), false);
  const mine = await call(context.endpoint, 'card.getMine', { includePrivatePreview: true });
  assert.equal(mine.ok, true);
  assert.equal(mine.data.card.cityId, 'cn-shenzhen');
  assert.equal(mine.data.card.biography, '连接真诚而有趣的人。');
  assert.equal(mine.data.card.headline, 'Founder · Builder');
  assert.equal(mine.data.card.avatarUrl, 'https://cdn.example.test/avatar/alice.jpg');

  const minePublic = await call(context.endpoint, 'card.getMine', { includePrivatePreview: false });
  assert.equal(minePublic.ok, true);
  assert.equal(minePublic.data.card.displayName, 'Alice 安然');
  assert.equal(minePublic.data.card.cityId, undefined);
  assert.equal(minePublic.data.card.biography, undefined);
  assert.equal(minePublic.data.card.headline, undefined);
  assert.equal(minePublic.data.card.avatarUrl, undefined);

  context.identity.openId = context.bobOpenId;
  const stranger = await call(context.endpoint, 'card.getForViewer', { ownerUserId: context.aliceId });
  assert.equal(stranger.ok, true);
  assert.equal(stranger.data.card.displayName, 'Alice 安然');
  assert.equal(stranger.data.card.cityId, undefined);
  assert.equal(stranger.data.card.biography, undefined);
  assert.equal(stranger.data.card.avatarUrl, undefined);
  assert.equal(stranger.data.card.headline, undefined);
  assert.equal(stranger.data.card.claims.length, 1);
  assert.equal(stranger.data.card.claims[0].reviewStatus, 'APPROVED');
  assert.equal(stranger.data.card.claims[0].verificationState, 'HUMAN_REVIEWED');
  assert.deepEqual(stranger.data.claims, stranger.data.card.claims);

  context.store.seedRelationship(relationship(NOW, context.carolId, context.aliceId));
  context.identity.openId = context.carolOpenId;
  const friend = await call(context.endpoint, 'card.getForViewer', { ownerUserId: context.aliceId });
  assert.equal(friend.ok, true);
  assert.equal(friend.data.card.biography, '连接真诚而有趣的人。');
  assert.equal(friend.data.card.avatarUrl, 'https://cdn.example.test/avatar/alice.jpg');
  assert.equal(friend.data.card.cityId, undefined);
  assert.equal(friend.data.card.headline, undefined);
  assert.equal(friend.data.relationship.friendshipState, 'ACCEPTED');

  const publicKeys = new Set([
    'cardId', 'ownerUserId', 'displayName', 'headline', 'cityId', 'avatarUrl',
    'biography', 'visibility', 'claims', 'origin', 'verificationState',
    'version', 'createdAt', 'updatedAt',
  ]);
  for (const key of Object.keys(friend.data.card)) assert.equal(publicKeys.has(key), true, key);
  const allPublicResponses = JSON.stringify([mine.data.card, stranger.data, friend.data]);
  for (const secret of [
    '13800138000', '440300199001011234', 'cloud://private/evidence',
    context.aliceOpenId, 'private_unionid_alice_123', 'INTERNAL_ONLY',
  ]) assert.equal(allPublicResponses.includes(secret), false, secret);
});

test('a relationship projection bound to a different viewer fails closed', async () => {
  const context = await provision();
  const requestedKey = context.store.relationshipKey(context.carolId, context.aliceId);
  context.store.state.relationships.set(
    requestedKey,
    relationship(NOW, context.bobId, context.aliceId),
  );
  context.identity.openId = context.carolOpenId;

  const result = await call(context.endpoint, 'card.getForViewer', {
    ownerUserId: context.aliceId,
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'SERVICE_UNAVAILABLE');
  assert.equal(result.error.details.service, 'ViewerRelationshipProjection.identity_binding');
  assert.equal('data' in result, false);
});

test('profile write is atomic, full-replacement clears optionals, and stale cards deny until refresh', async () => {
  const context = await provision();
  context.identity.openId = context.aliceOpenId;
  const before = structuredClone(context.store.state.profilesByUser.get(context.aliceId));
  const auditCount = context.store.state.audits.length;
  context.store.controls.failNextSaveIdempotency = true;
  const failed = await call(context.endpoint, 'profile.updateMine', {
    idempotencyKey: idempotency('profile_atomic_retry'),
    expectedVersion: 1,
    profile: { displayName: 'Alice Updated' },
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.error.code, 'INTERNAL_ERROR');
  assert.deepEqual(context.store.state.profilesByUser.get(context.aliceId), before);
  assert.equal(context.store.state.audits.length, auditCount);

  const retried = await call(context.endpoint, 'profile.updateMine', {
    idempotencyKey: idempotency('profile_atomic_retry'),
    expectedVersion: 1,
    profile: { displayName: 'Alice Updated' },
  });
  assert.equal(retried.ok, true);
  assert.equal(retried.data.profile.version, 2);
  assert.equal(retried.data.profile.biography, undefined);
  assert.equal(retried.data.profile.cityId, undefined);
  assert.equal(retried.data.profile.avatarAssetId, undefined);

  const stale = await call(context.endpoint, 'card.getMine', { includePrivatePreview: true });
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'SERVICE_UNAVAILABLE');
  assert.equal(stale.error.details.service, 'cards_public.projection');

  const wrongVersion = await call(context.endpoint, 'card.refreshProjection', {
    idempotencyKey: idempotency('card_wrong_version'),
    expectedVersion: 1,
    reason: 'PROFILE_CHANGED',
  });
  assert.equal(wrongVersion.ok, false);
  assert.equal(wrongVersion.error.code, 'VERSION_CONFLICT');

  const refreshed = await call(context.endpoint, 'card.refreshProjection', {
    idempotencyKey: idempotency('card_refresh_2'),
    expectedVersion: 2,
    reason: 'PROFILE_CHANGED',
  });
  assert.equal(refreshed.ok, true);
  assert.equal(refreshed.data.refreshedFromVersion, 2);
  assert.equal(context.store.state.cardsByOwner.get(context.aliceId).sourceProfileVersion, 2);
  const recovered = await call(context.endpoint, 'card.getMine', { includePrivatePreview: true });
  assert.equal(recovered.ok, true);
  assert.equal(recovered.data.card.displayName, 'Alice Updated');
});

test('share token is hashed-only, short scene is opaque, retries are stable, and QR failure is explicit', async () => {
  const context = await provision();
  context.identity.openId = context.aliceOpenId;
  const createPayload = {
    idempotencyKey: idempotency('share_create'),
    expectedVersion: context.card.version,
    targetType: 'CARD',
    targetId: context.card.cardId,
    expiresAt: '2026-08-29T08:00:00.000Z',
  };
  const created = await call(context.endpoint, 'share.create', createPayload);
  const replayed = await call(context.endpoint, 'share.create', createPayload);
  assert.equal(created.ok, true, JSON.stringify(created));
  assert.equal(replayed.ok, true);
  assert.equal(created.data.token, replayed.data.token);
  assert.equal(created.data.shareTokenId, replayed.data.shareTokenId);
  assert.match(created.data.token, /^sc_[A-Za-z0-9_-]{27}$/);
  assert.equal(context.store.state.sharesById.size, 1);
  const stored = context.store.state.sharesById.get(created.data.shareTokenId);
  assert.match(stored.tokenDigest, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(stored).includes(created.data.token), false);
  assert.equal(serializedMapValues(context.store.state.idempotency).includes(created.data.token), false);
  assert.equal('rawToken' in stored, false);
  assert.equal('scene' in stored, false);

  context.qrControl.fail = true;
  const failedQr = await call(context.endpoint, 'share.createQrScene', {
    idempotencyKey: idempotency('qr_retry'),
    expectedVersion: context.card.version,
    shareTokenId: created.data.shareTokenId,
    targetType: 'CARD',
    page: 'pages/card-share/index',
  });
  assert.equal(failedQr.ok, false);
  assert.equal(failedQr.error.code, 'SERVICE_UNAVAILABLE');
  assert.equal(failedQr.error.retryable, true);
  assert.equal(context.store.state.qrMedia.size, 0);

  context.qrControl.fail = false;
  const qr = await call(context.endpoint, 'share.createQrScene', {
    idempotencyKey: idempotency('qr_retry'),
    expectedVersion: context.card.version,
    shareTokenId: created.data.shareTokenId,
    targetType: 'CARD',
    page: 'pages/card-share/index',
  });
  assert.equal(qr.ok, true, JSON.stringify(qr));
  const qrCallCount = context.qrCalls.length;
  const qrReplay = await call(context.endpoint, 'share.createQrScene', {
    idempotencyKey: idempotency('qr_retry'),
    expectedVersion: context.card.version,
    shareTokenId: created.data.shareTokenId,
    targetType: 'CARD',
    page: 'pages/card-share/index',
  });
  assert.equal(qrReplay.ok, true);
  assert.deepEqual(qrReplay.data, qr.data);
  assert.equal(context.qrCalls.length, qrCallCount, 'idempotent replay must not regenerate the QR');
  assert.equal(qr.data.scene, created.data.token);
  assert.equal(qr.data.scene.length <= 32, true);
  assert.equal(qr.data.scene.includes(context.aliceId), false);
  assert.equal(qr.data.scene.includes(context.aliceOpenId), false);
  assert.equal(qr.data.scene.includes('permission'), false);
  assert.deepEqual(Object.keys(context.qrCalls.at(-1)).sort(), ['operationKey', 'page', 'scene']);
  assert.equal(serializedMapValues(context.store.state.idempotency).includes(qr.data.scene), false);
  assert.equal(serializedMapValues(context.store.state.qrMedia).includes(qr.data.scene), false);
  assert.equal(serializedMapValues(context.store.state.sharesById).includes(qr.data.scene), false);
  assert.equal(serializedMapValues(context.store.state.sharesByDigest).includes(qr.data.scene), false);
});

test('historical token and QR recheck friendship, blocks, claim revocation, expiry, forgery, and revoke', async () => {
  const context = await provision();
  context.identity.openId = context.aliceOpenId;
  const created = await call(context.endpoint, 'share.create', {
    idempotencyKey: idempotency('share_matrix'),
    expectedVersion: context.card.version,
    targetType: 'CARD',
    targetId: context.card.cardId,
    expiresAt: '2026-08-28T08:00:00.000Z',
  });
  assert.equal(created.ok, true);
  const qr = await call(context.endpoint, 'share.createQrScene', {
    idempotencyKey: idempotency('share_matrix_qr'),
    expectedVersion: context.card.version,
    shareTokenId: created.data.shareTokenId,
    targetType: 'CARD',
    page: 'pages/card-share/index',
  });
  assert.equal(qr.ok, true);

  context.store.seedRelationship(relationship(NOW, context.carolId, context.aliceId));
  context.identity.openId = context.carolOpenId;
  const friend = await call(context.endpoint, 'share.resolve', { scene: qr.data.scene });
  assert.equal(friend.ok, true);
  assert.equal(friend.data.resolution.card.biography, '连接真诚而有趣的人。');
  assert.equal(friend.data.resolution.card.claims.length, 1);

  const carolUser = context.store.state.usersById.get(context.carolId);
  const disabledCarol = { ...carolUser, accountState: 'DISABLED', version: carolUser.version + 1 };
  context.store.state.usersById.set(context.carolId, disabledCarol);
  context.store.state.usersByHash.set(api.hashPrivateIdentifier(context.carolOpenId), disabledCarol);
  const disabledViewer = await call(context.endpoint, 'share.resolve', { scene: qr.data.scene });
  assert.equal(disabledViewer.ok, true);
  assert.equal(disabledViewer.data.resolution.card.biography, undefined);
  assert.equal(disabledViewer.data.resolution.card.avatarUrl, undefined);
  const activeCarol = { ...disabledCarol, accountState: 'ACTIVE', version: disabledCarol.version + 1 };
  context.store.state.usersById.set(context.carolId, activeCarol);
  context.store.state.usersByHash.set(api.hashPrivateIdentifier(context.carolOpenId), activeCarol);

  context.store.seedRelationship(relationship(NOW, context.carolId, context.aliceId, {
    friendshipState: 'REMOVED',
    mayViewFriendsOnlyFields: false,
    version: 2,
    sourceVersion: 2,
    updatedAt: '2026-08-27T08:10:00.000Z',
  }));
  const removed = await call(context.endpoint, 'share.resolve', { token: created.data.token });
  assert.equal(removed.ok, true);
  assert.equal(removed.data.resolution.card.biography, undefined);
  assert.equal(removed.data.resolution.card.avatarUrl, undefined);
  const refreshedOldCardPage = await call(context.endpoint, 'card.getForViewer', {
    ownerUserId: context.aliceId,
  });
  assert.equal(refreshedOldCardPage.ok, true);
  assert.equal(refreshedOldCardPage.data.card.biography, undefined);
  assert.equal(refreshedOldCardPage.data.card.avatarUrl, undefined);

  context.store.seedClaims(context.aliceId, [approvedClaim(context.aliceId, {
    reviewStatus: 'REVOKED',
    publicVisible: false,
    updatedAt: '2026-08-27T08:11:00.000Z',
    version: 2,
  })]);
  const revokedClaim = await call(context.endpoint, 'share.resolve', { scene: qr.data.scene });
  assert.equal(revokedClaim.ok, true);
  assert.equal(revokedClaim.data.resolution.card.claims.length, 0);

  context.store.seedRelationship(relationship(NOW, context.carolId, context.aliceId, {
    viewerBlockedSubject: true,
    mayViewFriendsOnlyFields: false,
    version: 3,
    sourceVersion: 3,
  }));
  const blocked = await call(context.endpoint, 'share.resolve', { token: created.data.token });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.error.code, 'TOKEN_INVALID');

  for (const payload of [
    { token: 'bad' },
    { token: `sc_${'A'.repeat(27)}` },
    { scene: `sc_${'B'.repeat(27)}` },
    { token: created.data.token, scene: qr.data.scene },
    {},
  ]) {
    const result = await call(context.endpoint, 'share.resolve', payload);
    assert.equal(result.ok, false);
    assert.equal(['TOKEN_INVALID', 'INVALID_REQUEST'].includes(result.error.code), true);
  }

  context.store.seedRelationship(relationship(NOW, context.carolId, context.aliceId, {
    friendshipState: 'REMOVED', mayViewFriendsOnlyFields: false,
  }));
  context.clock.value = new Date('2026-08-28T08:00:00.000Z');
  const expired = await call(context.endpoint, 'share.resolve', { token: created.data.token });
  assert.equal(expired.ok, false);
  assert.equal(expired.error.code, 'TOKEN_EXPIRED');

  context.clock.value = new Date('2026-08-27T09:00:00.000Z');
  context.identity.openId = context.aliceOpenId;
  const revokePayload = {
    idempotencyKey: idempotency('share_revoke'),
    expectedVersion: context.card.version,
    shareTokenId: created.data.shareTokenId,
  };
  const firstRevoke = await call(context.endpoint, 'share.revoke', revokePayload);
  const replayRevoke = await call(context.endpoint, 'share.revoke', revokePayload);
  assert.equal(firstRevoke.ok, true);
  assert.equal(replayRevoke.ok, true);
  assert.equal(replayRevoke.data.revokedAt, firstRevoke.data.revokedAt);
  const repeatedDifferentKey = await call(context.endpoint, 'share.revoke', {
    ...revokePayload,
    idempotencyKey: idempotency('share_revoke_second_key'),
  });
  assert.equal(repeatedDifferentKey.ok, true);
  assert.equal(repeatedDifferentKey.data.revokedAt, firstRevoke.data.revokedAt);

  context.identity.openId = context.bobOpenId;
  const afterRevoke = await call(context.endpoint, 'share.resolve', { scene: qr.data.scene });
  assert.equal(afterRevoke.ok, false);
  assert.equal(afterRevoke.error.code, 'TOKEN_REVOKED');
});

test('frozen action DTOs reject rich-profile, visibility, allowedFields, and identity smuggling', async () => {
  const context = await provision();
  context.identity.openId = context.aliceOpenId;
  const forbiddenProfiles = [
    { industry: 'Technology' },
    { phone: '13800138000' },
    { fieldVisibility: { displayName: 'PUBLIC' } },
    { verificationStatus: 'APPROVED' },
    { openid: 'attacker_openid_123456789' },
  ];
  for (const [index, extra] of forbiddenProfiles.entries()) {
    const result = await call(context.endpoint, 'profile.updateMine', {
      idempotencyKey: idempotency(`strict_profile_${index}`),
      expectedVersion: 1,
      profile: { displayName: 'Alice', ...extra },
    });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'INVALID_REQUEST');
  }

  const share = await call(context.endpoint, 'share.create', {
    idempotencyKey: idempotency('strict_share'),
    expectedVersion: context.card.version,
    targetType: 'CARD',
    targetId: context.card.cardId,
    allowedFields: ['phone'],
  });
  assert.equal(share.ok, false);
  assert.equal(share.error.code, 'INVALID_REQUEST');
  assert.equal(JSON.stringify(share).includes('13800138000'), false);

  for (const [index, contractVersion] of [undefined, '9.9.9'].entries()) {
    const rawPayload = contractVersion === undefined
      ? { includeCompletion: true }
      : { contractVersion, includeCompletion: true };
    const result = await context.endpoint.main({
      action: 'profile.getMine',
      requestId: `req_contract_${index}_12345678`,
      payload: rawPayload,
    });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'INVALID_REQUEST');
    assert.equal(result.error.details.field, 'contractVersion');
  }
});

test('malformed persisted share records fail closed instead of bypassing expiry or field scope', async () => {
  const context = await provision();
  context.identity.openId = context.aliceOpenId;
  const created = await call(context.endpoint, 'share.create', {
    idempotencyKey: idempotency('malformed_share'),
    expectedVersion: context.card.version,
    targetType: 'CARD',
    targetId: context.card.cardId,
  });
  assert.equal(created.ok, true);
  const original = structuredClone(context.store.state.sharesById.get(created.data.shareTokenId));
  const cases = [
    { expiresAt: 'not-a-date' },
    { targetType: 'PROFILE' },
    { tokenDigest: 'not-a-sha256' },
    { allowedFields: ['phone'] },
    { allowedFields: [] },
    { revoked: true, revokedAt: undefined },
    { version: 0 },
    { ownerUserId: context.bobId },
  ];
  for (const patch of cases) {
    const malformed = { ...original, ...patch };
    context.store.state.sharesById.set(original._id, malformed);
    context.store.state.sharesByDigest.clear();
    context.store.state.sharesByDigest.set(original.tokenDigest, malformed);
    const result = await call(context.endpoint, 'share.resolve', { token: created.data.token });
    assert.equal(result.ok, false, JSON.stringify(patch));
    assert.equal(result.error.code, 'TOKEN_INVALID', JSON.stringify(patch));
  }
});
