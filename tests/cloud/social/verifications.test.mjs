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
  versioned,
} from './helpers.mjs';

const VALID_SHA = 'a'.repeat(64);

function verificationRecord(ownerKey, label, status, extra = {}, version = 1) {
  const suffix = `${ownerKey}_${label._id.replace('label_', '')}_${status.toLowerCase()}`;
  return versioned({
    _id: `verification_${suffix}`,
    verificationRequestId: `verification_${suffix}`,
    subjectUserId: PRINCIPALS[ownerKey].userId,
    labelId: label._id,
    status,
    evidenceAssetIds: [],
    userStatement: 'SYNTHETIC / DEMO_ONLY user statement',
    ...extra,
  }, version);
}

async function createDraft(harness, ownerKey = 'alice', labelId = LABELS.identity._id, suffix = labelId) {
  const result = await harness.as(ownerKey).call('verification.createDraft', {
    labelId,
    idempotencyKey: idempotencyKey(`draft_${ownerKey}_${suffix}`),
  });
  return expectSuccess(result).request;
}

async function issueAndUpload(harness, request, ownerKey = 'alice', options = {}) {
  const mediaType = options.mediaType ?? 'IMAGE';
  const result = await harness.as(ownerKey).call('verification.uploadPolicy', {
    verificationRequestId: request.verificationRequestId,
    mediaType,
    fileSizeBytes: options.fileSizeBytes ?? 100_000,
    sha256: options.sha256 ?? VALID_SHA,
    idempotencyKey: idempotencyKey(`upload_${ownerKey}_${options.suffix ?? mediaType}`),
  });
  const policy = expectSuccess(result);
  await harness.repository.markMediaUploaded(policy.mediaAssetId, options.uploadedAt ?? NOW);
  return policy;
}

async function submit(harness, request, evidenceAssetIds, ownerKey = 'alice', suffix = 'submit') {
  const stored = collection(harness.snapshot(), 'verificationRequests').find((candidate) =>
    (candidate._id ?? candidate.verificationRequestId) === request.verificationRequestId);
  const expectedVersion = request.version ?? stored?.version;
  assert.equal(Number.isSafeInteger(expectedVersion), true,
    `submit helper could not resolve expectedVersion for ${request.verificationRequestId}`);
  return harness.as(ownerKey).call('verification.submit', {
    verificationRequestId: request.verificationRequestId,
    evidenceAssetIds,
    userStatement: '我确认这是 SYNTHETIC、DEMO_ONLY 材料，并申请人工审核。',
    expectedVersion,
    idempotencyKey: idempotencyKey(`${ownerKey}_${suffix}`),
  });
}

test('tag catalog is whitelist-only and never turns private/system tags into public honors', async () => {
  const harness = makeHarness();
  const labels = expectSuccess(await harness.as('alice').call('tag.catalog', {
    includeDisabled: false,
  })).labels;

  const ids = labels.map((label) => label.labelId);
  assert.ok(ids.includes(LABELS.identity._id));
  assert.ok(ids.includes(LABELS.interest._id));
  assert.ok(ids.includes(LABELS.wealth._id),
    'P0 may retain a high-risk application path even though it cannot become public');
  assert.equal(ids.includes(LABELS.disabled._id), false);
  assert.equal(ids.includes(LABELS.privatePreference._id), false);
  assert.equal(ids.includes(LABELS.systemRole._id), false);
  assert.ok(labels.every((label) => label.enabled === true));
  assertNoSensitiveMaterial(labels);

  expectFailure(await harness.as('alice').call('verification.createDraft', {
    labelId: 'label_not_whitelisted_123456',
    idempotencyKey: idempotencyKey('unknown_label'),
  }), 'NOT_FOUND');
  expectFailure(await harness.as('alice').call('verification.createDraft', {
    labelId: LABELS.disabled._id,
    idempotencyKey: idempotencyKey('disabled_label'),
  }), 'NOT_FOUND');
  expectFailure(await harness.as('alice').call('verification.createDraft', {
    labelId: LABELS.privatePreference._id,
    idempotencyKey: idempotencyKey('private_label'),
  }), 'FORBIDDEN');
  expectFailure(await harness.as('alice').call('verification.createDraft', {
    labelId: LABELS.systemRole._id,
    idempotencyKey: idempotencyKey('system_role_label'),
  }), 'FORBIDDEN');

  const highRiskDraft = await createDraft(harness, 'alice', LABELS.wealth._id, 'wealth_retained');
  assert.equal(highRiskDraft.status, 'DRAFT');
});

test('draft creation is idempotent and only one active review case exists per user and label', async () => {
  const harness = makeHarness();
  const key = idempotencyKey('same_draft_key');
  const payload = { labelId: LABELS.identity._id, idempotencyKey: key };
  const requestId = 'request_same_draft_key_123456';
  const first = expectSuccess(await harness.as('alice').call(
    'verification.createDraft', payload, requestId,
  ));
  const replay = expectSuccess(await harness.as('alice').call(
    'verification.createDraft', payload, requestId,
  ));
  assert.deepEqual(replay, first);

  const duplicateDraft = expectSuccess(await harness.as('alice').call('verification.createDraft', {
    labelId: LABELS.identity._id,
    idempotencyKey: idempotencyKey('second_key_same_draft'),
  }));
  assert.equal(duplicateDraft.request.verificationRequestId, first.request.verificationRequestId);
  assert.equal(collection(harness.snapshot(), 'verificationRequests').length, 1);

  const media = await issueAndUpload(harness, first.request, 'alice', { suffix: 'active_case' });
  expectSuccess(await submit(harness, first.request, [media.mediaAssetId], 'alice', 'active_case'));
  expectFailure(await harness.as('alice').call('verification.createDraft', {
    labelId: LABELS.identity._id,
    idempotencyKey: idempotencyKey('duplicate_under_review'),
  }), 'CONFLICT');
  assert.equal(collection(harness.snapshot(), 'verificationRequests').length, 1);
});

test('upload policy enforces owner, media whitelist, byte limit and SHA-256 before issuing an opaque path', async () => {
  const harness = makeHarness();
  const draft = await createDraft(harness, 'alice', LABELS.interest._id, 'upload_policy');

  expectFailure(await harness.as('bob').call('verification.uploadPolicy', {
    verificationRequestId: draft.verificationRequestId,
    mediaType: 'IMAGE',
    fileSizeBytes: 100_000,
    sha256: VALID_SHA,
    idempotencyKey: idempotencyKey('other_owner_upload'),
  }), 'NOT_FOUND');
  expectFailure(await harness.as('alice').call('verification.uploadPolicy', {
    verificationRequestId: draft.verificationRequestId,
    mediaType: 'DOCUMENT',
    fileSizeBytes: 100_000,
    sha256: VALID_SHA,
    idempotencyKey: idempotencyKey('wrong_media_type'),
  }), 'VALIDATION_FAILED');
  expectFailure(await harness.as('alice').call('verification.uploadPolicy', {
    verificationRequestId: draft.verificationRequestId,
    mediaType: 'IMAGE',
    fileSizeBytes: LABELS.interest.maxFileBytes + 1,
    sha256: VALID_SHA,
    idempotencyKey: idempotencyKey('file_too_large'),
  }), 'VALIDATION_FAILED');
  expectFailure(await harness.as('alice').call('verification.uploadPolicy', {
    verificationRequestId: draft.verificationRequestId,
    mediaType: 'IMAGE',
    fileSizeBytes: 100_000,
    sha256: 'not-a-sha256',
    idempotencyKey: idempotencyKey('bad_sha'),
  }), 'VALIDATION_FAILED');

  const policy = expectSuccess(await harness.as('alice').call('verification.uploadPolicy', {
    verificationRequestId: draft.verificationRequestId,
    mediaType: 'IMAGE',
    fileSizeBytes: 100_000,
    sha256: VALID_SHA,
    idempotencyKey: idempotencyKey('valid_policy'),
  }));
  assert.equal(policy.maxBytes, LABELS.interest.maxFileBytes);
  assert.ok(Date.parse(policy.uploadExpiresAt) > Date.parse(NOW));
  assert.equal(typeof policy.cloudPath, 'string');
  assert.doesNotMatch(policy.cloudPath, /https?:\/\//i);
  assert.doesNotMatch(policy.cloudPath, /cloud:\/\//i);
  assert.equal(policy.cloudPath.includes(PRINCIPALS.alice.userId), false);
  assert.equal(policy.cloudPath.includes(draft.verificationRequestId), false);
  assert.match(policy.cloudPath,
    /(?:[a-f0-9]{32,}|[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})/i,
    'private storage path must contain an opaque non-enumerable component');

  const media = collection(harness.snapshot(), 'mediaAssets').find(
    (asset) => asset._id === policy.mediaAssetId || asset.mediaAssetId === policy.mediaAssetId,
  );
  assert.ok(media);
  assert.equal(media.ownerUserId, PRINCIPALS.alice.userId);
  assert.equal(media.domain, 'VERIFICATION');
  assert.equal(media.verificationRequestId, draft.verificationRequestId);
  assert.equal(media.publicState, 'PRIVATE');
  assert.equal(media.origin, 'SYNTHETIC');
  assert.equal(media.evidenceMode, 'DEMO_ONLY');
});

test('expired upload authorization and cross-request evidence are rejected at submit time', async () => {
  {
    const harness = makeHarness();
    const draft = await createDraft(harness, 'alice', LABELS.identity._id, 'expired_grant');
    const policyResult = await harness.as('alice').call('verification.uploadPolicy', {
      verificationRequestId: draft.verificationRequestId,
      mediaType: 'IMAGE',
      fileSizeBytes: 100_000,
      sha256: VALID_SHA,
      idempotencyKey: idempotencyKey('expired_grant_policy'),
    });
    const policy = expectSuccess(policyResult);
    const uploadedAfterExpiry = new Date(Date.parse(policy.uploadExpiresAt) + 1).toISOString();
    await harness.repository.markMediaUploaded(policy.mediaAssetId, uploadedAfterExpiry);
    harness.setNow(uploadedAfterExpiry);
    expectFailure(await submit(harness, draft, [policy.mediaAssetId], 'alice', 'expired_grant'),
      'MEDIA_RIGHTS_REQUIRED');
    assert.equal(collection(harness.snapshot(), 'verificationRequests')[0].status, 'DRAFT');
  }

  {
    const harness = makeHarness();
    const first = await createDraft(harness, 'alice', LABELS.identity._id, 'cross_first');
    const second = await createDraft(harness, 'alice', LABELS.interest._id, 'cross_second');
    const firstMedia = await issueAndUpload(harness, first, 'alice', { suffix: 'cross_first' });
    expectFailure(await submit(harness, second, [firstMedia.mediaAssetId], 'alice', 'cross_request'),
      'MEDIA_RIGHTS_REQUIRED');
  }
});

test('evidence count is capped and missing/unuploaded evidence cannot enter review', async () => {
  const harness = makeHarness();
  const draft = await createDraft(harness, 'alice', LABELS.identity._id, 'evidence_limit');

  expectFailure(await submit(harness, draft, [], 'alice', 'missing_evidence'),
    'REVIEW_EVIDENCE_REQUIRED');

  const policies = [];
  for (let index = 0; index < LABELS.identity.maxEvidenceCount + 1; index += 1) {
    const policy = expectSuccess(await harness.as('alice').call('verification.uploadPolicy', {
      verificationRequestId: draft.verificationRequestId,
      mediaType: 'IMAGE',
      fileSizeBytes: 100_000,
      sha256: `${index.toString(16)}${'a'.repeat(63)}`,
      idempotencyKey: idempotencyKey(`evidence_limit_${index}`),
    }));
    await harness.repository.markMediaUploaded(policy.mediaAssetId, NOW);
    policies.push(policy);
  }
  expectFailure(await submit(
    harness,
    draft,
    policies.map((policy) => policy.mediaAssetId),
    'alice',
    'too_many_evidence',
  ), 'VALIDATION_FAILED');
  assert.equal(collection(harness.snapshot(), 'verificationRequests')[0].status, 'DRAFT');
});

test('AI confidence can only remain an auxiliary check and never creates APPROVED/HUMAN_REVIEWED state', async () => {
  const aiDraft = verificationRecord('alice', LABELS.identity, 'DRAFT', {
    aiCheck: {
      provider: 'DEMO_ONLY',
      result: 'CONSISTENT',
      confidence: 1,
      verificationState: 'AI_CONSISTENCY_CHECKED',
      checkedAt: NOW,
    },
  });
  const harness = makeHarness({ verificationRequests: [aiDraft] });
  const media = await issueAndUpload(harness, {
    verificationRequestId: aiDraft._id,
  }, 'alice', { suffix: 'ai_never_approves' });

  const submitted = expectSuccess(await submit(
    harness,
    { verificationRequestId: aiDraft._id },
    [media.mediaAssetId],
    'alice',
    'ai_never_approves',
  )).request;
  assert.equal(submitted.status, 'SUBMITTED');
  assert.notEqual(submitted.status, 'APPROVED');

  const snapshot = harness.snapshot();
  const stored = collection(snapshot, 'verificationRequests')[0];
  assert.equal(stored.status, 'SUBMITTED');
  assert.notEqual(stored.verificationState, 'HUMAN_REVIEWED');
  assert.equal(collection(snapshot, 'verificationClaims').length, 0);
  assert.equal(collection(snapshot, 'reviewLogs').length, 0);
});

test('submit permits only DRAFT or NEEDS_CHANGES and appends a verification invalidation', async () => {
  const needsChanges = verificationRecord('alice', LABELS.interest, 'NEEDS_CHANGES', {
    reviewerNote: '请补充说明（合成测试）',
  }, 3);
  const underReview = verificationRecord('alice', LABELS.wealth, 'UNDER_REVIEW', {}, 2);
  const harness = makeHarness({ verificationRequests: [needsChanges, underReview] });

  const policy = await issueAndUpload(harness, {
    verificationRequestId: needsChanges._id,
  }, 'alice', { suffix: 'resubmit' });
  const resubmitted = expectSuccess(await submit(
    harness,
    { verificationRequestId: needsChanges._id },
    [policy.mediaAssetId],
    'alice',
    'resubmit_needs_changes',
  )).request;
  assert.equal(resubmitted.status, 'SUBMITTED');
  assert.equal(resubmitted.version, 4);

  expectFailure(await submit(
    harness,
    { verificationRequestId: underReview._id },
    [],
    'alice',
    'under_review_submit',
  ), 'CONFLICT');

  const invalidations = collection(harness.snapshot(), 'projectionInvalidations');
  assert.equal(invalidations.length, 1);
  assert.equal(invalidations[0].kind, 'VERIFICATION_CHANGED');
  assert.equal(invalidations[0].sourceAggregateId, needsChanges._id);
  assert.equal(invalidations[0].sourceVersion, 4);
});

test('listMine/getMine never disclose another user application or material URL', async () => {
  const rejectedAlice = verificationRecord('alice', LABELS.identity, 'REJECTED', {
    evidenceAssetIds: ['media_synthetic_demo_01'],
    reviewerNote: '材料不足；仅本人可见。',
  }, 4);
  const submittedBob = verificationRecord('bob', LABELS.interest, 'SUBMITTED', {}, 2);
  const harness = makeHarness({ verificationRequests: [rejectedAlice, submittedBob] });

  const aliceMine = expectSuccess(await harness.as('alice').call('verification.listMine', {
    limit: 20,
  })).page.items;
  assert.equal(aliceMine.length, 1);
  assert.equal(aliceMine[0].verificationRequestId, rejectedAlice._id);
  assert.equal(aliceMine[0].status, 'REJECTED');
  assert.equal(aliceMine[0].reviewerNote, rejectedAlice.reviewerNote);
  assertNoSensitiveMaterial(aliceMine);

  const bobMine = expectSuccess(await harness.as('bob').call('verification.listMine', {
    limit: 20,
  })).page.items;
  assert.equal(bobMine.length, 1);
  assert.equal(bobMine[0].verificationRequestId, submittedBob._id);
  assert.equal(JSON.stringify(bobMine).includes(rejectedAlice._id), false);

  expectFailure(await harness.as('bob').call('verification.getMine', {
    verificationRequestId: rejectedAlice._id,
  }), 'NOT_FOUND');
  expectFailure(await harness.as('carol').call('verification.getMine', {
    verificationRequestId: rejectedAlice._id,
  }), 'NOT_FOUND');
  const mine = expectSuccess(await harness.as('alice').call('verification.getMine', {
    verificationRequestId: rejectedAlice._id,
  })).request;
  assert.equal(mine.status, 'REJECTED');
  assertNoSensitiveMaterial(mine);
});

test('withdraw is owner-only, versioned, physically deletes DRAFT/SUBMITTED and appends the frozen tombstone invalidation', async () => {
  {
    const draft = verificationRecord('alice', LABELS.identity, 'DRAFT', {}, 2);
    const harness = makeHarness({ verificationRequests: [draft] });
    expectFailure(await harness.as('bob').call('verification.withdraw', {
      verificationRequestId: draft._id,
      expectedVersion: 2,
      idempotencyKey: idempotencyKey('other_owner_withdraw'),
    }), 'NOT_FOUND');
    expectFailure(await harness.as('alice').call('verification.withdraw', {
      verificationRequestId: draft._id,
      expectedVersion: 1,
      idempotencyKey: idempotencyKey('wrong_version_withdraw'),
    }), 'VERSION_CONFLICT');

    const payload = {
      verificationRequestId: draft._id,
      expectedVersion: 2,
      idempotencyKey: idempotencyKey('valid_draft_withdraw'),
    };
    const requestId = 'request_valid_draft_withdraw_123456';
    const first = expectSuccess(await harness.as('alice').call(
      'verification.withdraw', payload, requestId,
    ));
    const replay = expectSuccess(await harness.as('alice').call(
      'verification.withdraw', payload, requestId,
    ));
    assert.deepEqual(replay, first);
    assert.deepEqual(first.withdrawal, {
      verificationRequestId: draft._id,
      previousStatus: 'DRAFT',
      deletedVersion: 2,
      withdrawnAt: NOW,
      deletionMode: 'PHYSICAL',
      projectionInvalidationAppended: true,
    });
    assert.equal(collection(harness.snapshot(), 'verificationRequests').length, 0);
    const invalidations = collection(harness.snapshot(), 'projectionInvalidations');
    assert.equal(invalidations.length, 1);
    assert.equal(invalidations[0].kind, 'VERIFICATION_CHANGED');
    assert.equal(invalidations[0].sourceAggregateId, draft._id);
    assert.equal(invalidations[0].sourceVersion, 2);
    assert.equal(invalidations[0].reason, 'VERIFICATION_REQUEST_WITHDRAWN');
    const withdrawalAudits = collection(harness.snapshot(), 'auditLogs').filter((entry) =>
      entry.action === 'verification.withdraw' && entry.result === 'SUCCEEDED');
    assert.equal(withdrawalAudits.length, 1);
    assert.equal(withdrawalAudits[0].actorUserId, PRINCIPALS.alice.userId);
    assert.equal(withdrawalAudits[0].targetId, draft._id);
  }

  {
    const submitted = verificationRecord('alice', LABELS.identity, 'SUBMITTED', {}, 5);
    const harness = makeHarness({ verificationRequests: [submitted] });
    const result = expectSuccess(await harness.as('alice').call('verification.withdraw', {
      verificationRequestId: submitted._id,
      expectedVersion: 5,
      idempotencyKey: idempotencyKey('submitted_withdraw'),
    }));
    assert.equal(result.withdrawal.previousStatus, 'SUBMITTED');
    assert.equal(collection(harness.snapshot(), 'verificationRequests').length, 0);
  }
});

test('withdraw rejects every review-owned or terminal status without deletion', async () => {
  const statuses = ['UNDER_REVIEW', 'NEEDS_CHANGES', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED'];
  for (const status of statuses) {
    const request = verificationRecord('alice', LABELS.identity, status, {}, 3);
    const harness = makeHarness({ verificationRequests: [request] });
    expectFailure(await harness.as('alice').call('verification.withdraw', {
      verificationRequestId: request._id,
      expectedVersion: 3,
      idempotencyKey: idempotencyKey(`withdraw_${status}`),
    }), 'REVIEW_INVALID_TRANSITION');
    assert.equal(collection(harness.snapshot(), 'verificationRequests').length, 1, status);
    assert.equal(collection(harness.snapshot(), 'projectionInvalidations').length, 0, status);
  }
});
