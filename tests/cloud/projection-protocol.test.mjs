import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../..', import.meta.url));
const projections = require(join(root, 'cloudfunctions', '_shared', 'projections', 'index.js'));
const now = '2026-08-27T06:00:00Z';

function versioned(extra) {
  return { version: 1, createdAt: now, updatedAt: now, ...extra };
}

function publicEvent(extra = {}) {
  return versioned({
    eventId: 'event_123456', clubNodeId: 'node_123456', organizerId: 'organizer_123456',
    cityId: 'cn-shenzhen', title: 'AB Club 城市活动', summary: '公开活动摘要',
    startsAt: '2026-08-28T06:00:00Z', endsAt: '2026-08-28T08:00:00Z',
    timezone: 'Asia/Shanghai', state: 'PUBLISHED', publicationState: 'PUBLISHED',
    reservationAvailable: true, origin: 'REAL', verificationState: 'NOT_APPLICABLE',
    ...extra,
  });
}

test('projection parser returns immutable clones and rejects access-leaking projections', () => {
  const source = versioned({
    viewerUserId: 'user_viewer', subjectUserId: 'user_subject', sourceVersion: 1,
    friendshipId: 'friendship_123456', friendshipState: 'ACCEPTED',
    viewerBlockedSubject: false, subjectBlockedViewer: false, mayViewFriendsOnlyFields: true,
  });
  const parsed = projections.parseReadOnlyProjection('ViewerRelationshipProjection', source);
  source.mayViewFriendsOnlyFields = false;
  assert.equal(parsed.mayViewFriendsOnlyFields, true);
  assert.equal(Object.isFrozen(parsed), true);

  assert.throws(() => projections.parseReadOnlyProjection('ViewerRelationshipProjection', {
    ...source,
    evidenceAssetIds: ['private_asset_123'],
    reviewerNote: 'must never cross the projection boundary',
  }), /forbidden fields/);

  assert.throws(() => projections.parseReadOnlyProjection('ViewerRelationshipProjection', versioned({
    viewerUserId: 'user_viewer', subjectUserId: 'user_subject', sourceVersion: 1,
    friendshipId: 'friendship_123456', friendshipState: 'ACCEPTED',
    viewerBlockedSubject: true, subjectBlockedViewer: false, mayViewFriendsOnlyFields: true,
  })), /cannot grant friend visibility/);

  assert.throws(() => projections.parseReadOnlyProjection('PublicVerificationClaimProjection', versioned({
    claimId: 'claim_123456', subjectUserId: 'user_subject', labelId: 'label_123456',
    labelText: { zh: '标签', en: 'Label' }, reviewStatus: 'SUBMITTED',
    verificationState: 'USER_DECLARED', publicVisible: true, validFrom: now,
  })), /human-approved/);

  const approvedClaim = projections.parseReadOnlyProjection('PublicVerificationClaimProjection', versioned({
    claimId: 'claim_approved_123', subjectUserId: 'user_subject', labelId: 'label_123456',
    labelText: { zh: '标签', en: 'Label' }, reviewStatus: 'APPROVED',
    verificationState: 'HUMAN_REVIEWED', publicVisible: true,
    validFrom: '2026-01-01T00:00:00Z', validUntil: '2026-06-01T00:00:00Z',
  }));
  assert.throws(() => projections.assertVerificationClaimEffective(approvedClaim, now),
    (error) => error.code === 'ELIGIBILITY_NOT_MET');

  assert.throws(() => projections.parseReadOnlyProjection('PublicEventProjection', publicEvent({
    state: 'CANCELLED', publicationState: 'UNPUBLISHED', reservationAvailable: true,
  })), /cannot be reservable/);
  assert.throws(() => projections.parseReadOnlyProjection('PublicEventProjection', publicEvent({
    timezone: 'Not/AZone',
  })), /Invalid timezone/);
  assert.throws(() => projections.parseReadOnlyProjection('PublicEventProjection', publicEvent({
    timezone: 'Europe/Paris',
  })), /must match the frozen city directory/);

  assert.throws(() => projections.parseReadOnlyProjection('PublicEventProjection', versioned({
    eventId: 'event_incomplete', cityId: 'cn-shenzhen', startsAt: now, endsAt: '2026-08-27T07:00:00Z',
  })), /Invalid clubNodeId/);

  assert.throws(() => projections.parseReadOnlyProjection('ReviewCaseProjection', versioned({
    reviewCaseId: 'review_123456', domain: 'SOCIAL', aggregateId: 'aggregate_123456',
    status: 'GARBAGE', title: '非法状态', summary: '应拒绝', evidenceAssetIds: [],
  })), /Invalid status/);
});

test('TypeScript and executable projection helpers expose the same public functions', () => {
  const source = readFileSync(join(root, 'cloudfunctions', '_shared', 'projections', 'index.ts'), 'utf8');
  const exportedFunctions = [...source.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(Object.keys(projections).filter((name) => typeof projections[name] === 'function').sort(), exportedFunctions);
});

test('invalidation has exactly seven fields, marks dirty, and stale/source-denied reads fail', async () => {
  const invalidation = projections.createProjectionInvalidation({
    eventId: 'pinv_123456',
    kind: 'RELATIONSHIP_CHANGED',
    sourceAggregateId: 'friendship_123456',
    sourceVersion: 3,
    occurredAt: now,
    reason: 'FRIEND_REMOVED',
    requestId: 'request_123456',
  });
  assert.deepEqual(Object.keys(invalidation), [
    'eventId', 'kind', 'sourceAggregateId', 'sourceVersion', 'occurredAt', 'reason', 'requestId',
  ]);
  assert.deepEqual(projections.markProjectionDirty(invalidation), {
    dirty: true,
    invalidationEventId: 'pinv_123456',
    requiredSourceVersion: 3,
    dirtySince: now,
  });

  assert.throws(() => projections.assertProjectionReadable({
    projectionType: 'ViewerRelationshipProjection', dirty: true,
    projectedSourceVersion: 2, requiredSourceVersion: 3, sourceAllowsRead: true,
  }), (error) => error.code === 'PROJECTION_STALE');
  assert.throws(() => projections.assertProjectionReadable({
    projectionType: 'ViewerRelationshipProjection', dirty: false,
    projectedSourceVersion: 3, requiredSourceVersion: 3, sourceAllowsRead: false,
  }), (error) => error.code === 'FORBIDDEN');

  for (const invalidVersion of [Number.NaN, Number.POSITIVE_INFINITY, 0, 1.5]) {
    assert.throws(() => projections.assertProjectionReadable({
      projectionType: 'ViewerRelationshipProjection', dirty: false,
      projectedSourceVersion: invalidVersion, requiredSourceVersion: 3, sourceAllowsRead: true,
    }), (error) => error.code === 'VALIDATION_FAILED');
    assert.throws(() => projections.assertProjectionReadable({
      projectionType: 'ViewerRelationshipProjection', dirty: false,
      projectedSourceVersion: 3, requiredSourceVersion: invalidVersion, sourceAllowsRead: true,
    }), (error) => error.code === 'VALIDATION_FAILED');
  }

  await assert.rejects(() => projections.revokeAccessAndInvalidateAtomically({}, {
    kind: 'RELATIONSHIP_CHANGED',
    source: {}, invalidation,
  }), /real transaction runner/);

  let transactionRuns = 0;
  const guardedRunner = {
    runTransaction: async () => { transactionRuns += 1; return 'must-not-run'; },
  };
  await assert.rejects(() => projections.revokeAccessAndInvalidateAtomically(guardedRunner, {
    kind: 'RELATIONSHIP_CHANGED',
    source: {
      collection: 'friendships', aggregateId: 'friendship_other',
      expectedVersion: 2, patch: { state: 'REMOVED', version: 3 },
    },
    invalidation,
  }), /same aggregate/);
  await assert.rejects(() => projections.revokeAccessAndInvalidateAtomically(guardedRunner, {
    kind: 'RELATIONSHIP_CHANGED',
    source: {
      collection: 'friendships', aggregateId: 'friendship_123456',
      expectedVersion: 2, patch: { state: 'REMOVED', version: 4 },
    },
    invalidation,
  }), /expectedVersion \+ 1/);
  await assert.rejects(() => projections.revokeAccessAndInvalidateAtomically(guardedRunner, {
    kind: 'RELATIONSHIP_CHANGED',
    source: {
      collection: 'friendships', aggregateId: 'friendship_123456',
      expectedVersion: 2, patch: { publicationState: 'UNPUBLISHED', version: 3 },
    },
    invalidation,
  }), /exact shape for invalidation kind/);
  await assert.rejects(() => projections.revokeAccessAndInvalidateAtomically(guardedRunner, {
    kind: 'RELATIONSHIP_CHANGED',
    source: {
      collection: 'friendships', aggregateId: 'friendship_123456',
      expectedVersion: 2, patch: { state: 'REMOVED', version: 3 },
    },
    invalidation: { ...invalidation, sourceVersion: 99 },
  }), /expectedVersion \+ 1/);

  await assert.rejects(() => projections.revokeAccessAndInvalidateAtomically(guardedRunner, {
    kind: 'RELATIONSHIP_CHANGED',
    source: {
      collection: 'events', aggregateId: 'friendship_123456',
      expectedVersion: 2, patch: { state: 'REMOVED', version: 3 },
    },
    invalidation,
  }), /collection is not allowed/);
  await assert.rejects(() => projections.revokeAccessAndInvalidateAtomically(guardedRunner, {
    kind: 'RELATIONSHIP_CHANGED',
    source: {
      collection: 'friendships', aggregateId: 'friendship_123456',
      expectedVersion: 2,
      patch: { state: 'REMOVED', publicVisible: false, version: 3 },
    },
    invalidation,
  }), /exact shape for invalidation kind/);
  await assert.rejects(() => projections.revokeAccessAndInvalidateAtomically(guardedRunner, {
    kind: 'EVENT_CHANGED',
    source: {
      collection: 'events', aggregateId: 'friendship_123456',
      expectedVersion: 2,
      patch: { state: 'CANCELLED', reservationAvailable: false, version: 3 },
    },
    invalidation,
  }), /kind must equal invalidation kind/);
  assert.equal(transactionRuns, 0);

  const transactionCalls = [];
  const atomicId = await projections.revokeAccessAndInvalidateAtomically({
    runTransaction: async (operation) => operation({
      updateSource: async (source) => { transactionCalls.push(['source', source]); },
      appendInvalidation: async (event) => {
        transactionCalls.push(['invalidation', event]);
        return { id: 'atomic_event_1' };
      },
    }),
  }, {
    kind: 'RELATIONSHIP_CHANGED',
    source: {
      collection: 'friendships', aggregateId: 'friendship_123456',
      expectedVersion: 2, patch: { state: 'REMOVED', version: 3 },
    },
    invalidation,
  });
  assert.equal(atomicId, 'atomic_event_1');
  assert.deepEqual(transactionCalls.map(([kind]) => kind), ['source', 'invalidation']);

  const calls = [];
  const id = await projections.appendProjectionInvalidation({
    add: async (input) => { calls.push(input); return { id: 'db_event_1' }; },
  }, invalidation);
  assert.equal(id, 'db_event_1');
  assert.deepEqual(calls, [{ data: invalidation }]);
});

test('atomic revocation binds every allowed collection to its exact safe patch before the transaction', async () => {
  function invalidationFor(kind, aggregateId, suffix) {
    return projections.createProjectionInvalidation({
      eventId: `pinv_${suffix}_123456`,
      kind,
      sourceAggregateId: aggregateId,
      sourceVersion: 3,
      occurredAt: now,
      reason: `REVOKE_${suffix.toUpperCase()}`,
      requestId: `request_${suffix}_123456`,
    });
  }

  const wrongPatchCases = [
    {
      name: 'friendships rejects the retired blocked shortcut',
      kind: 'RELATIONSHIP_CHANGED', collection: 'friendships',
      patch: { version: 3, blocked: true },
    },
    {
      name: 'blocks_reports rejects a friendship-state patch',
      kind: 'RELATIONSHIP_CHANGED', collection: 'blocks_reports',
      patch: { version: 3, state: 'REMOVED' },
    },
    {
      name: 'verification_requests rejects a claim patch',
      kind: 'VERIFICATION_CHANGED', collection: 'verification_requests',
      patch: { version: 3, reviewStatus: 'REVOKED', publicVisible: false },
    },
    {
      name: 'verification_claims rejects a request patch',
      kind: 'VERIFICATION_CHANGED', collection: 'verification_claims',
      patch: { version: 3, status: 'REVOKED' },
    },
    {
      name: 'events rejects an organizer patch',
      kind: 'EVENT_CHANGED', collection: 'events',
      patch: { version: 3, reviewStatus: 'REVOKED' },
    },
    {
      name: 'organizers rejects an event patch',
      kind: 'EVENT_CHANGED', collection: 'organizers',
      patch: { version: 3, state: 'CANCELLED', reservationAvailable: false },
    },
    {
      name: 'club_nodes rejects an event patch',
      kind: 'EVENT_CHANGED', collection: 'club_nodes',
      patch: { version: 3, state: 'CANCELLED', reservationAvailable: false },
    },
    {
      name: 'art_items rejects a mixed content and media patch',
      kind: 'CONTENT_CHANGED', collection: 'art_items',
      patch: { version: 3, publicationState: 'UNPUBLISHED', mediaRightsState: 'REVOKED' },
    },
    {
      name: 'art_collections rejects a mixed content and claim patch',
      kind: 'CONTENT_CHANGED', collection: 'art_collections',
      patch: { version: 3, publicationState: 'UNPUBLISHED', publicVisible: false },
    },
    {
      name: 'media_assets rejects the nonexistent mediaRightsState shortcut',
      kind: 'MEDIA_RIGHTS_CHANGED', collection: 'media_assets',
      patch: { version: 3, mediaRightsState: 'REVOKED' },
    },
  ];

  let rejectedTransactionRuns = 0;
  const mustNotRun = {
    runTransaction: async () => { rejectedTransactionRuns += 1; return 'must-not-run'; },
  };
  for (const [index, invalidCase] of wrongPatchCases.entries()) {
    const aggregateId = `aggregate_wrong_${index}`;
    await assert.rejects(() => projections.revokeAccessAndInvalidateAtomically(mustNotRun, {
      kind: invalidCase.kind,
      source: {
        collection: invalidCase.collection,
        aggregateId,
        expectedVersion: 2,
        patch: invalidCase.patch,
      },
      invalidation: invalidationFor(invalidCase.kind, aggregateId, `wrong_${index}`),
    }), /exact shape for invalidation kind/, invalidCase.name);
  }
  assert.equal(rejectedTransactionRuns, 0, 'invalid collection/patch pairs must fail before transaction entry');

  const validCases = [
    {
      kind: 'RELATIONSHIP_CHANGED', collection: 'friendships',
      patch: { version: 3, state: 'REMOVED' },
    },
    {
      kind: 'RELATIONSHIP_CHANGED', collection: 'blocks_reports',
      patch: { version: 3, recordType: 'BLOCK', state: 'ACTIVE' },
    },
    {
      kind: 'VERIFICATION_CHANGED', collection: 'verification_requests',
      patch: { version: 3, status: 'REVOKED' },
    },
    {
      kind: 'VERIFICATION_CHANGED', collection: 'verification_claims',
      patch: { version: 3, reviewStatus: 'REVOKED', publicVisible: false },
    },
    {
      kind: 'EVENT_CHANGED', collection: 'events',
      patch: { version: 3, state: 'CANCELLED', reservationAvailable: false },
    },
    {
      kind: 'EVENT_CHANGED', collection: 'organizers',
      patch: { version: 3, reviewStatus: 'REVOKED' },
    },
    {
      kind: 'EVENT_CHANGED', collection: 'club_nodes',
      patch: { version: 3, operationalState: 'DISABLED' },
    },
    {
      kind: 'CONTENT_CHANGED', collection: 'art_items',
      patch: { version: 3, publicationState: 'UNPUBLISHED' },
    },
    {
      kind: 'CONTENT_CHANGED', collection: 'art_collections',
      patch: { version: 3, publicationState: 'UNPUBLISHED' },
    },
    {
      kind: 'MEDIA_RIGHTS_CHANGED', collection: 'media_assets',
      patch: {
        version: 3,
        rights: {
          state: 'REVOKED',
          rightsHolderName: 'AB Club rights review',
          sourceDescription: 'Public use permission revoked by an authorized reviewer.',
          permittedUses: [],
          reviewedAt: now,
        },
      },
    },
  ];

  const updatedCollections = [];
  let validTransactionRuns = 0;
  const transactionRunner = {
    runTransaction: async (operation) => {
      validTransactionRuns += 1;
      return operation({
        updateSource: async (source) => { updatedCollections.push(source.collection); },
        appendInvalidation: async () => ({ id: `atomic_${validTransactionRuns}` }),
      });
    },
  };
  for (const [index, validCase] of validCases.entries()) {
    const aggregateId = `aggregate_valid_${index}`;
    const result = await projections.revokeAccessAndInvalidateAtomically(transactionRunner, {
      kind: validCase.kind,
      source: {
        collection: validCase.collection,
        aggregateId,
        expectedVersion: 2,
        patch: validCase.patch,
      },
      invalidation: invalidationFor(validCase.kind, aggregateId, `valid_${index}`),
    });
    assert.equal(result, `atomic_${index + 1}`);
  }
  assert.equal(validTransactionRuns, validCases.length);
  assert.deepEqual(updatedCollections, validCases.map(({ collection }) => collection));
});
