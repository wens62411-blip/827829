import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LABELS,
  NOW,
  PRINCIPALS,
  assertNoSensitiveMaterial,
  collection,
  expectFailure,
  expectSuccess,
  idempotencyKey,
  makeHarness,
  publicCard,
  versioned,
} from './helpers.mjs';

const requestPayload = (recipientUserId, key, extra = {}) => ({
  recipientUserId,
  message: '你好，我想在 AB Club 申请认识你。',
  idempotencyKey: key,
  ...extra,
});

async function requestFriend(harness, from, to, suffix = `${from}_${to}`) {
  const result = await harness.as(from).call('friend.request', requestPayload(
    PRINCIPALS[to].userId,
    idempotencyKey(`friend_request_${suffix}`),
  ));
  return expectSuccess(result).relationship;
}

async function acceptFriend(harness, friendshipId, expectedVersion, suffix = 'accept') {
  const result = await harness.as('bob').call('friend.accept', {
    friendshipId,
    expectedVersion,
    idempotencyKey: idempotencyKey(`friend_${suffix}`),
  });
  return expectSuccess(result).relationship;
}

test('authentication is server-derived and forged owner/openid fields fail closed', async () => {
  const harness = makeHarness();

  expectFailure(await harness.as('anonymous').call('friend.listAccepted', { limit: 20 }), 'AUTH_REQUIRED');
  expectFailure(await harness.as('spoofed').call('friend.listAccepted', { limit: 20 }), 'AUTH_REQUIRED');
  expectFailure(await harness.as('disabled').call('friend.listAccepted', { limit: 20 }), 'FORBIDDEN');

  const forged = await harness.as('alice').call('friend.request', requestPayload(
    PRINCIPALS.bob.userId,
    idempotencyKey('forged_identity'),
    {
      ownerId: PRINCIPALS.bob.userId,
      userId: PRINCIPALS.bob.userId,
      openid: PRINCIPALS.bob.openId,
      _openid: PRINCIPALS.bob.openId,
      roles: ['ADMIN'],
    },
  ));
  expectFailure(forged, 'INVALID_REQUEST');
  assert.equal(collection(harness.snapshot(), 'friendships').length, 0);

  expectFailure(await harness.as('alice').call('friend.request', requestPayload(
    PRINCIPALS.alice.userId,
    idempotencyKey('self_request'),
  )), 'VALIDATION_FAILED');
});

test('same-key replay and repeated same-direction requests reuse one normalized pair', async () => {
  const harness = makeHarness();
  const payload = requestPayload(PRINCIPALS.bob.userId, idempotencyKey('same_key_replay'));
  const requestId = 'request_same_key_replay_123456';

  const first = expectSuccess(await harness.as('alice').call('friend.request', payload, requestId));
  const replay = expectSuccess(await harness.as('alice').call('friend.request', payload, requestId));
  assert.deepEqual(replay, first);

  const duplicate = expectSuccess(await harness.as('alice').call('friend.request', {
    ...payload,
    idempotencyKey: idempotencyKey('different_key_same_pair'),
  }));
  assert.equal(duplicate.relationship.friendshipId, first.relationship.friendshipId);
  assert.equal(duplicate.relationship.friendshipState, 'PENDING');
  assert.equal(duplicate.relationship.mayViewFriendsOnlyFields, false);

  const friendships = collection(harness.snapshot(), 'friendships');
  assert.equal(friendships.length, 1);
  assert.equal(friendships[0].requesterUserId, PRINCIPALS.alice.userId);
  assert.equal(friendships[0].addresseeUserId, PRINCIPALS.bob.userId);
  assert.equal(typeof friendships[0].pairKey, 'string');

  const conflictingPayload = requestPayload(
    PRINCIPALS.carol.userId,
    payload.idempotencyKey,
  );
  expectFailure(await harness.as('alice').call(
    'friend.request', conflictingPayload, 'request_same_key_conflict_123456',
  ), 'IDEMPOTENCY_CONFLICT');
  assert.equal(collection(harness.snapshot(), 'friendships').length, 1);
});

test('simultaneous opposite-direction requests create one PENDING pair without implicit acceptance', async () => {
  const harness = makeHarness();
  const [aliceResult, bobResult] = await Promise.all([
    harness.as('alice').call('friend.request', requestPayload(
      PRINCIPALS.bob.userId,
      idempotencyKey('concurrent_alice_bob'),
    ), 'request_concurrent_alice_123456'),
    harness.as('bob').call('friend.request', requestPayload(
      PRINCIPALS.alice.userId,
      idempotencyKey('concurrent_bob_alice'),
    ), 'request_concurrent_bob_123456'),
  ]);

  const alice = expectSuccess(aliceResult).relationship;
  const bob = expectSuccess(bobResult).relationship;
  assert.equal(alice.friendshipId, bob.friendshipId);
  assert.equal(alice.friendshipState, 'PENDING');
  assert.equal(bob.friendshipState, 'PENDING');
  assert.equal(alice.mayViewFriendsOnlyFields, false);
  assert.equal(bob.mayViewFriendsOnlyFields, false);

  const friendships = collection(harness.snapshot(), 'friendships');
  assert.equal(friendships.length, 1, 'normalized pair must be unique under concurrent reverse requests');
  assert.equal(friendships[0].state, 'PENDING');

  const incomingAlice = expectSuccess(await harness.as('alice').call('friend.listIncoming', {
    includeExpired: false,
    limit: 20,
  })).page.items;
  const incomingBob = expectSuccess(await harness.as('bob').call('friend.listIncoming', {
    includeExpired: false,
    limit: 20,
  })).page.items;
  assert.equal(incomingAlice.length + incomingBob.length, 1,
    'only the actual addressee sees the pending request');
  assert.equal(expectSuccess(await harness.as('carol').call('friend.listIncoming', {
    includeExpired: false,
    limit: 20,
  })).page.items.length, 0);
});

test('PENDING hides FRIENDS_ONLY fields and rebuilds claims only from valid audited claim records', async () => {
  const validClaim = versioned({
    _id: 'claim_valid_friend_card_123456',
    claimId: 'claim_valid_friend_card_123456',
    verificationRequestId: 'verification_valid_friend_card_123456',
    subjectUserId: PRINCIPALS.alice.userId,
    labelId: LABELS.identity._id,
    reviewStatus: 'APPROVED',
    verificationState: 'HUMAN_REVIEWED',
    publicVisible: true,
    userSelectedPublic: true,
    reviewedBy: PRINCIPALS.reviewer.userId,
    reviewedAt: '2026-08-20T08:00:00Z',
    reviewScope: 'PUBLIC_IDENTITY_TAG',
    reviewLogId: 'review_log_valid_friend_card_123456',
    validFrom: '2026-01-01T00:00:00Z',
    validUntil: '2027-01-01T00:00:00Z',
  }, 3, '2026-08-19T08:00:00Z', '2026-08-20T08:00:00Z');
  const missingLogClaim = {
    ...validClaim,
    _id: 'claim_missing_log_card_123456',
    claimId: 'claim_missing_log_card_123456',
    verificationRequestId: 'verification_missing_log_card_123456',
    reviewLogId: 'review_log_missing_card_123456',
  };
  const expiredClaim = {
    ...validClaim,
    _id: 'claim_expired_card_123456',
    claimId: 'claim_expired_card_123456',
    verificationRequestId: 'verification_expired_card_123456',
    reviewLogId: 'review_log_expired_card_123456',
    validUntil: '2026-08-27T07:59:59Z',
  };
  const reviewLog = (claim) => versioned({
    _id: claim.reviewLogId,
    reviewLogId: claim.reviewLogId,
    claimId: claim.claimId,
    verificationRequestId: claim.verificationRequestId,
    decision: 'APPROVED',
    source: 'HUMAN',
    reviewedBy: claim.reviewedBy,
    reviewedAt: claim.reviewedAt,
    reviewScope: claim.reviewScope,
    action: 'review.approve',
    actorRole: 'REVIEWER',
    result: 'SUCCEEDED',
  }, 1, claim.reviewedAt, claim.reviewedAt);
  const injectedUnreviewedCardClaim = {
    version: 1,
    createdAt: NOW,
    updatedAt: NOW,
    claimId: 'claim_injected_card_payload_123456',
    subjectUserId: PRINCIPALS.alice.userId,
    labelId: LABELS.identity._id,
    labelText: LABELS.identity.name,
    reviewStatus: 'APPROVED',
    verificationState: 'HUMAN_REVIEWED',
    publicVisible: true,
    validFrom: '2026-01-01T00:00:00Z',
  };
  const aliceFriendsOnly = publicCard('alice', {
    visibility: 'FRIENDS_ONLY',
    headline: 'FRIENDS_ONLY_SECRET_HEADLINE',
    biography: 'FRIENDS_ONLY_SECRET_BIOGRAPHY',
    avatarUrl: 'https://example.invalid/friends-only-avatar.png',
    claims: [injectedUnreviewedCardClaim],
  });
  const harness = makeHarness({
    cards: [aliceFriendsOnly, publicCard('bob'), publicCard('carol')],
    verificationClaims: [validClaim, missingLogClaim, expiredClaim],
    reviewLogs: [reviewLog(validClaim), reviewLog(expiredClaim)],
  });

  const pending = await requestFriend(harness, 'alice', 'bob', 'friends_only_redaction');
  const incoming = expectSuccess(await harness.as('bob').call('friend.listIncoming', {
    includeExpired: false,
    limit: 20,
  })).page.items;
  assert.equal(incoming.length, 1);
  const pendingCard = incoming[0].requester;
  assert.equal('headline' in pendingCard, false);
  assert.equal('biography' in pendingCard, false);
  assert.equal('avatarUrl' in pendingCard, false);
  assert.equal(JSON.stringify(pendingCard).includes('FRIENDS_ONLY_SECRET'), false);
  assert.deepEqual(pendingCard.claims.map((claim) => claim.claimId), [validClaim.claimId]);
  assert.equal(JSON.stringify(pendingCard).includes(injectedUnreviewedCardClaim.claimId), false,
    'preloaded card.claims must never bypass the review audit');
  assert.equal(JSON.stringify(pendingCard).includes(missingLogClaim.claimId), false);
  assert.equal(JSON.stringify(pendingCard).includes(expiredClaim.claimId), false);

  await acceptFriend(harness, pending.friendshipId, pending.version, 'friends_only_redaction');
  const acceptedCards = expectSuccess(await harness.as('bob').call('friend.listAccepted', {
    limit: 20,
  })).page.items;
  assert.equal(acceptedCards.length, 1);
  assert.equal(acceptedCards[0].headline, 'FRIENDS_ONLY_SECRET_HEADLINE');
  assert.equal(acceptedCards[0].biography, 'FRIENDS_ONLY_SECRET_BIOGRAPHY');
  assert.deepEqual(acceptedCards[0].claims.map((claim) => claim.claimId), [validClaim.claimId]);
});

test('accept/reject/cancel/remove enforce participant role and legal source state', async () => {
  {
    const harness = makeHarness();
    const pending = await requestFriend(harness, 'alice', 'bob', 'accept_matrix');
    expectFailure(await harness.as('alice').call('friend.accept', {
      friendshipId: pending.friendshipId,
      expectedVersion: pending.version,
      idempotencyKey: idempotencyKey('requester_cannot_accept'),
    }), 'FORBIDDEN');
    expectFailure(await harness.as('carol').call('friend.accept', {
      friendshipId: pending.friendshipId,
      expectedVersion: pending.version,
      idempotencyKey: idempotencyKey('stranger_cannot_accept'),
    }), 'NOT_FOUND');

    const accepted = await acceptFriend(harness, pending.friendshipId, pending.version, 'accept_matrix');
    assert.equal(accepted.friendshipState, 'ACCEPTED');
    assert.equal(accepted.mayViewFriendsOnlyFields, true);

    expectFailure(await harness.as('bob').call('friend.reject', {
      friendshipId: pending.friendshipId,
      expectedVersion: accepted.version,
      idempotencyKey: idempotencyKey('reject_accepted'),
    }), 'CONFLICT');
    expectFailure(await harness.as('alice').call('friend.cancel', {
      friendshipId: pending.friendshipId,
      expectedVersion: accepted.version,
      idempotencyKey: idempotencyKey('cancel_accepted'),
    }), 'CONFLICT');
    expectFailure(await harness.as('carol').call('friend.remove', {
      friendshipId: pending.friendshipId,
      expectedVersion: accepted.version,
      idempotencyKey: idempotencyKey('stranger_remove'),
    }), 'NOT_FOUND');

    const removed = expectSuccess(await harness.as('alice').call('friend.remove', {
      friendshipId: pending.friendshipId,
      expectedVersion: accepted.version,
      idempotencyKey: idempotencyKey('accepted_remove'),
    }));
    assert.equal(removed.projectionDirty, true);
    expectFailure(await harness.as('bob').call('friend.remove', {
      friendshipId: pending.friendshipId,
      expectedVersion: accepted.version + 1,
      idempotencyKey: idempotencyKey('remove_twice'),
    }), 'CONFLICT');
  }

  {
    const harness = makeHarness();
    const pending = await requestFriend(harness, 'alice', 'bob', 'reject_matrix');
    expectFailure(await harness.as('alice').call('friend.reject', {
      friendshipId: pending.friendshipId,
      expectedVersion: pending.version,
      idempotencyKey: idempotencyKey('requester_reject'),
    }), 'FORBIDDEN');
    const rejected = expectSuccess(await harness.as('bob').call('friend.reject', {
      friendshipId: pending.friendshipId,
      expectedVersion: pending.version,
      reasonCode: 'NOT_NOW',
      idempotencyKey: idempotencyKey('recipient_reject'),
    })).relationship;
    assert.equal(rejected.friendshipState, 'REJECTED');
    assert.equal(rejected.mayViewFriendsOnlyFields, false);
    expectFailure(await harness.as('alice').call('friend.request', requestPayload(
      PRINCIPALS.bob.userId,
      idempotencyKey('rejected_cannot_reopen'),
    )), 'CONFLICT');
  }

  {
    const harness = makeHarness();
    const pending = await requestFriend(harness, 'alice', 'bob', 'cancel_matrix');
    expectFailure(await harness.as('bob').call('friend.cancel', {
      friendshipId: pending.friendshipId,
      expectedVersion: pending.version,
      idempotencyKey: idempotencyKey('recipient_cancel'),
    }), 'FORBIDDEN');
    const cancelled = expectSuccess(await harness.as('alice').call('friend.cancel', {
      friendshipId: pending.friendshipId,
      expectedVersion: pending.version,
      idempotencyKey: idempotencyKey('requester_cancel'),
    })).relationship;
    assert.equal(cancelled.friendshipState, 'CANCELLED');
    assert.equal(cancelled.mayViewFriendsOnlyFields, false);
    expectFailure(await harness.as('alice').call('friend.request', requestPayload(
      PRINCIPALS.bob.userId,
      idempotencyKey('cancelled_cannot_reopen'),
    )), 'CONFLICT');
  }
});

test('accepted is the only state granting friends-only access and every change appends invalidation', async () => {
  const harness = makeHarness();
  const pending = await requestFriend(harness, 'alice', 'bob', 'visibility');
  assert.equal(pending.mayViewFriendsOnlyFields, false);
  const accepted = await acceptFriend(harness, pending.friendshipId, pending.version, 'visibility');
  assert.equal(accepted.mayViewFriendsOnlyFields, true);

  const list = expectSuccess(await harness.as('alice').call('friend.listAccepted', { limit: 20 })).page.items;
  assert.equal(list.length, 1);
  assert.equal(list[0].ownerUserId, PRINCIPALS.bob.userId);
  assertNoSensitiveMaterial(list);

  expectSuccess(await harness.as('bob').call('friend.remove', {
    friendshipId: pending.friendshipId,
    expectedVersion: accepted.version,
    idempotencyKey: idempotencyKey('visibility_remove'),
  }));
  assert.equal(expectSuccess(await harness.as('alice').call('friend.listAccepted', { limit: 20 })).page.items.length, 0);

  const snapshot = harness.snapshot();
  const invalidations = collection(snapshot, 'projectionInvalidations');
  assert.equal(invalidations.length, 3, 'PENDING, ACCEPTED and REMOVED each invalidate relationship projection');
  assert.deepEqual(new Set(invalidations.map((event) => event.kind)), new Set(['RELATIONSHIP_CHANGED']));
  assert.ok(invalidations.every((event) => event.sourceAggregateId === pending.friendshipId));
  assert.deepEqual(invalidations.map((event) => event.sourceVersion), [1, 2, 3]);
  assert.ok(invalidations.every((event) => Object.keys(event).sort().join(',') ===
    'eventId,kind,occurredAt,reason,requestId,sourceAggregateId,sourceVersion'));
  const succeededActions = collection(snapshot, 'auditLogs')
    .filter((entry) => entry.result === 'SUCCEEDED')
    .map((entry) => entry.action);
  assert.deepEqual(succeededActions, ['friend.request', 'friend.accept', 'friend.remove']);
  assert.ok(collection(snapshot, 'auditLogs').every((entry) => entry.actorRole === 'MEMBER'));
});

test('blocking is independent, removes friendship immediately, blocks both directions, and unblocking never restores access', async () => {
  const harness = makeHarness();
  const pending = await requestFriend(harness, 'alice', 'bob', 'block');
  const accepted = await acceptFriend(harness, pending.friendshipId, pending.version, 'block');

  const blocked = expectSuccess(await harness.as('bob').call('block.create', {
    blockedUserId: PRINCIPALS.alice.userId,
    reasonCode: 'PRIVACY',
    idempotencyKey: idempotencyKey('block_bob_alice'),
  }));
  assert.equal(blocked.blockedUserId, PRINCIPALS.alice.userId);
  assert.equal(blocked.projectionDirty, true);

  const snapshot = harness.snapshot();
  assert.equal(collection(snapshot, 'friendships')[0].state, 'REMOVED');
  const blocks = collection(snapshot, 'blocksReports').filter((record) => record.recordType === 'BLOCK');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].state, 'ACTIVE');
  assert.equal(blocks[0].actorUserId, PRINCIPALS.bob.userId);
  assert.equal(blocks[0].targetId, PRINCIPALS.alice.userId);
  assert.notEqual(blocks[0].state, 'BLOCKED', 'BLOCKED is not a FriendshipState shortcut');
  const postBlockInvalidations = collection(snapshot, 'projectionInvalidations');
  assert.ok(postBlockInvalidations.some((event) =>
    event.sourceAggregateId === pending.friendshipId && event.sourceVersion === accepted.version + 1),
  'block must invalidate the friendship state it removed');
  assert.ok(postBlockInvalidations.some((event) =>
    event.sourceAggregateId === (blocks[0]._id ?? blocks[0].blockId) && event.sourceVersion === blocks[0].version),
  'block aggregate must append its own relationship invalidation');

  expectFailure(await harness.as('alice').call('friend.request', requestPayload(
    PRINCIPALS.bob.userId,
    idempotencyKey('blocked_alice_to_bob'),
  )), 'BLOCKED_RELATIONSHIP');
  expectFailure(await harness.as('bob').call('friend.request', requestPayload(
    PRINCIPALS.alice.userId,
    idempotencyKey('blocked_bob_to_alice'),
  )), 'BLOCKED_RELATIONSHIP');
  assert.equal(expectSuccess(await harness.as('alice').call('friend.listAccepted', { limit: 20 })).page.items.length, 0);
  assert.equal(expectSuccess(await harness.as('bob').call('friend.listAccepted', { limit: 20 })).page.items.length, 0);

  expectFailure(await harness.as('alice').call('block.remove', {
    blockedUserId: PRINCIPALS.bob.userId,
    idempotencyKey: idempotencyKey('wrong_actor_unblock'),
  }), 'NOT_FOUND');
  expectSuccess(await harness.as('bob').call('block.remove', {
    blockedUserId: PRINCIPALS.alice.userId,
    idempotencyKey: idempotencyKey('correct_actor_unblock'),
  }));
  assert.equal(collection(harness.snapshot(), 'friendships')[0].state, 'REMOVED');
  assert.equal(expectSuccess(await harness.as('alice').call('friend.listAccepted', { limit: 20 })).page.items.length, 0);

  const reapplied = expectSuccess(await harness.as('alice').call('friend.request', requestPayload(
    PRINCIPALS.bob.userId,
    idempotencyKey('after_unblock_reapply'),
  ))).relationship;
  assert.equal(reapplied.friendshipId, pending.friendshipId, 'normalized pair record is reused');
  assert.equal(reapplied.friendshipState, 'PENDING');
  assert.equal(reapplied.mayViewFriendsOnlyFields, false);
  assert.ok(reapplied.version > accepted.version);
});

test('blocking a pending request removes it from the recipient inbox', async () => {
  const harness = makeHarness();
  await requestFriend(harness, 'alice', 'bob', 'pending_block');
  assert.equal(expectSuccess(await harness.as('bob').call('friend.listIncoming', {
    includeExpired: false,
    limit: 20,
  })).page.items.length, 1);

  expectSuccess(await harness.as('bob').call('block.create', {
    blockedUserId: PRINCIPALS.alice.userId,
    idempotencyKey: idempotencyKey('pending_block_create'),
  }));
  assert.equal(expectSuccess(await harness.as('bob').call('friend.listIncoming', {
    includeExpired: false,
    limit: 20,
  })).page.items.length, 0);
  assert.equal(collection(harness.snapshot(), 'friendships')[0].state, 'REMOVED');
});

test('replaying an already-active block repairs a corrupt ACCEPTED friendship and unblocking cannot restore it', async () => {
  const friendship = versioned({
    _id: 'friendship_corrupt_block_123456',
    friendshipId: 'friendship_corrupt_block_123456',
    pairKey: [PRINCIPALS.alice.userId, PRINCIPALS.bob.userId].sort().join('::'),
    requesterUserId: PRINCIPALS.alice.userId,
    addresseeUserId: PRINCIPALS.bob.userId,
    state: 'ACCEPTED',
  }, 4, '2026-08-20T08:00:00Z', '2026-08-26T08:00:00Z');
  const block = versioned({
    _id: 'block_active_repair_123456',
    blockId: 'block_active_repair_123456',
    recordType: 'BLOCK',
    actorUserId: PRINCIPALS.bob.userId,
    targetId: PRINCIPALS.alice.userId,
    state: 'ACTIVE',
    reasonCode: 'PRIVACY',
  }, 2, '2026-08-25T08:00:00Z', '2026-08-26T08:00:00Z');
  const harness = makeHarness({ friendships: [friendship], blocksReports: [block] });

  expectSuccess(await harness.as('bob').call('block.create', {
    blockedUserId: PRINCIPALS.alice.userId,
    expectedVersion: 2,
    reasonCode: 'PRIVACY',
    idempotencyKey: idempotencyKey('active_block_repair'),
  }));
  let snapshot = harness.snapshot();
  assert.equal(collection(snapshot, 'friendships')[0].state, 'REMOVED');
  assert.equal(collection(snapshot, 'friendships')[0].version, 5);
  assert.equal(collection(snapshot, 'blocksReports')[0].version, 2,
    'idempotent active block itself is not spuriously version-bumped');
  assert.ok(collection(snapshot, 'projectionInvalidations').some((event) =>
    event.sourceAggregateId === friendship._id
      && event.sourceVersion === 5
      && event.reason === 'FRIENDSHIP_REMOVED_BY_BLOCK'));

  expectSuccess(await harness.as('bob').call('block.remove', {
    blockedUserId: PRINCIPALS.alice.userId,
    expectedVersion: 2,
    idempotencyKey: idempotencyKey('active_block_repair_remove'),
  }));
  snapshot = harness.snapshot();
  assert.equal(collection(snapshot, 'friendships')[0].state, 'REMOVED');
  assert.equal(expectSuccess(await harness.as('bob').call('friend.listAccepted', { limit: 20 })).page.items.length, 0);
});

test('unknown user targets fail without creating friendship, block or report records', async () => {
  const harness = makeHarness();
  const unknownUserId = 'user_unknown_123456';
  expectFailure(await harness.as('alice').call('friend.request', requestPayload(
    unknownUserId,
    idempotencyKey('unknown_friend_target'),
  )), 'NOT_FOUND');
  expectFailure(await harness.as('alice').call('block.create', {
    blockedUserId: unknownUserId,
    idempotencyKey: idempotencyKey('unknown_block_target'),
  }), 'NOT_FOUND');
  expectFailure(await harness.as('alice').call('report.create', {
    targetType: 'USER',
    targetId: unknownUserId,
    reasonCode: 'SPAM',
    evidenceAssetIds: [],
    idempotencyKey: idempotencyKey('unknown_report_target'),
  }), 'NOT_FOUND');
  assert.equal(collection(harness.snapshot(), 'friendships').length, 0);
  assert.equal(collection(harness.snapshot(), 'blocksReports').length, 0);
  assert.equal(collection(harness.snapshot(), 'auditLogs').length, 0);
});

test('report creation derives actor from principal, is idempotent, and returns only a redacted projection', async () => {
  const harness = makeHarness();
  const payload = {
    targetType: 'USER',
    targetId: PRINCIPALS.bob.userId,
    reasonCode: 'MISLEADING',
    description: 'SYNTHETIC / DEMO_ONLY report description',
    evidenceAssetIds: [],
    idempotencyKey: idempotencyKey('report_bob'),
  };
  const requestId = 'request_report_bob_123456';
  const first = expectSuccess(await harness.as('alice').call('report.create', payload, requestId));
  const replay = expectSuccess(await harness.as('alice').call('report.create', payload, requestId));
  assert.deepEqual(replay, first);
  assert.equal(first.report.targetId, PRINCIPALS.bob.userId);
  assert.equal(first.report.status, 'OPEN');
  assert.equal('actorUserId' in first.report, false);
  assert.equal('description' in first.report, false);
  assert.equal('evidenceAssetIds' in first.report, false);
  assertNoSensitiveMaterial(first);

  const reports = collection(harness.snapshot(), 'blocksReports')
    .filter((record) => record.recordType === 'REPORT');
  assert.equal(reports.length, 1);
  assert.equal(reports[0].actorUserId, PRINCIPALS.alice.userId);
  assert.equal(reports[0].targetId, PRINCIPALS.bob.userId);
});

test('report evidence validation uses a frozen allowed error code and never creates a partial report', async () => {
  const harness = makeHarness();
  const result = await harness.as('alice').call('report.create', {
    targetType: 'USER',
    targetId: PRINCIPALS.bob.userId,
    reasonCode: 'RIGHTS',
    evidenceAssetIds: ['media_missing_private_123456'],
    idempotencyKey: idempotencyKey('report_invalid_evidence'),
  });
  expectFailure(result, 'VALIDATION_FAILED');
  assert.equal(collection(harness.snapshot(), 'blocksReports').length, 0);
  assert.equal(collection(harness.snapshot(), 'auditLogs').length, 0);
  assert.equal(collection(harness.snapshot(), 'idempotencyKeys').length, 0);
});
