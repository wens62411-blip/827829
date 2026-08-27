import assert from 'node:assert/strict';
import test from 'node:test';

import { loadAdminRuntime } from './runtime-loader.mjs';
import {
  FIXTURE_NOW,
  RAW_MATERIAL_URL_SENTINEL,
  adminEvent,
  createAdminTestFixture,
  writeGuards,
} from './test-fixture.mjs';

const runtime = await loadAdminRuntime();

function assertFailure(result, code) {
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.equal(result.error.code, code, JSON.stringify(result));
}

function approvePayload(reviewCaseId, expectedVersion, suffix) {
  return {
    reviewCaseId,
    decisionNote: '人工审核已核对原始申请快照并明确通过',
    ...writeGuards(expectedVersion, suffix),
  };
}

test('approve evidence: explicit human action creates a complete ReviewLog, frozen public claim and claim invalidation', async () => {
  const fixture = createAdminTestFixture(runtime);
  const endpoint = fixture.endpointFor('reviewerA');
  const requestId = 'req_approve_evidence_0001';
  const result = await endpoint.main(adminEvent(
    'review.approve',
    requestId,
    approvePayload('case_social_approve', 3, 'approve_evidence'),
  ));

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.data.reviewCase.status, 'APPROVED');
  assert.equal(result.data.reviewCase.version, 4);
  assert.equal(result.data.projectionInvalidated, true);
  assert.deepEqual(fixture.inspect.snapshotReads, ['case_social_approve']);

  assert.equal(fixture.inspect.reviewLogs.length, 1);
  const log = fixture.inspect.reviewLogs[0];
  assert.deepEqual({
    reviewedBy: log.reviewedBy,
    reviewedAt: log.reviewedAt,
    reviewScope: log.reviewScope,
    reason: log.reason,
    beforeStatus: log.beforeStatus,
    afterStatus: log.afterStatus,
    requestId: log.requestId,
    expectedVersion: log.expectedVersion,
    sourceSnapshotVersion: log.sourceSnapshotVersion,
    version: log.version,
  }, {
    reviewedBy: 'user_reviewerA',
    reviewedAt: FIXTURE_NOW,
    reviewScope: 'TAG_VERIFICATION',
    reason: '人工审核已核对原始申请快照并明确通过',
    beforeStatus: 'UNDER_REVIEW',
    afterStatus: 'APPROVED',
    requestId,
    expectedVersion: 3,
    sourceSnapshotVersion: 43,
    version: 4,
  });

  const claimId = fixture.inspect.claimIdsByCase.get('case_social_approve');
  const claim = fixture.inspect.publicClaims.get(claimId);
  assert.ok(claimId);
  assert.deepEqual({
    claimId: claim.claimId,
    reviewStatus: claim.reviewStatus,
    verificationState: claim.verificationState,
    publicVisible: claim.publicVisible,
    version: claim.version,
  }, {
    claimId,
    reviewStatus: 'APPROVED',
    verificationState: 'HUMAN_REVIEWED',
    publicVisible: true,
    version: 1,
  });

  assert.equal(fixture.inspect.invalidations.length, 1);
  const invalidation = fixture.inspect.invalidations[0];
  assert.deepEqual(Object.keys(invalidation).sort(), [
    'eventId', 'kind', 'occurredAt', 'reason', 'requestId', 'sourceAggregateId', 'sourceVersion',
  ].sort());
  assert.equal(invalidation.kind, 'VERIFICATION_CHANGED');
  assert.equal(invalidation.sourceAggregateId, claim.claimId);
  assert.equal(invalidation.sourceVersion, claim.version);
  assert.equal(invalidation.requestId, requestId);

  const command = fixture.inspect.mutationCalls[0];
  assert.deepEqual(command.writableCollections, [
    'verification_requests', 'verification_claims', 'idempotency_keys',
    'audit_logs', 'projection_invalidations',
  ]);
  assert.equal(command.originalSnapshotPresent, true);
  assert.equal(command.originalSnapshotVersion, 43);
  assert.equal(JSON.stringify(command).includes(RAW_MATERIAL_URL_SENTINEL), false);

  const externallyVisible = JSON.stringify({
    response: result,
    reviewLogs: fixture.inspect.reviewLogs,
    invalidations: fixture.inspect.invalidations,
    idempotency: [...fixture.inspect.idempotency.values()],
  });
  assert.equal(externallyVisible.includes(RAW_MATERIAL_URL_SENTINEL), false);
  assert.equal(runtime.AI_AUTOMATION_DISABLED, true);

  const completeAudit = runtime.auditApprovedData({
    reviewCases: [result.data.reviewCase],
    reviewLogs: fixture.inspect.reviewLogs,
  });
  assert.deepEqual(completeAudit, { ok: true, missingReviewLogCaseIds: [] });
  assert.doesNotThrow(() => runtime.assertApprovedDataMayProject(
    result.data.reviewCase,
    fixture.inspect.reviewLogs,
  ));
});

test('reject evidence: explicit rejection records before/after state, reason and invalidation', async () => {
  const fixture = createAdminTestFixture(runtime);
  const requestId = 'req_reject_evidence_0001';
  const result = await fixture.endpointFor('reviewerA').main(adminEvent(
    'review.reject',
    requestId,
    {
      reviewCaseId: 'case_social_reject',
      reasonCode: 'EVIDENCE_MISMATCH',
      decisionNote: '人工核验后材料与申请不一致',
      ...writeGuards(3, 'reject_evidence'),
    },
  ));

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.data.reviewCase.status, 'REJECTED');
  assert.equal(result.data.projectionInvalidated, true);
  assert.equal(fixture.inspect.reviewLogs[0].reasonCode, 'EVIDENCE_MISMATCH');
  assert.equal(fixture.inspect.reviewLogs[0].beforeStatus, 'UNDER_REVIEW');
  assert.equal(fixture.inspect.reviewLogs[0].afterStatus, 'REJECTED');
  assert.equal(fixture.inspect.invalidations[0].kind, 'VERIFICATION_CHANGED');
  assert.equal(fixture.inspect.invalidations[0].sourceAggregateId, 'verification_request_reject');
  assert.notEqual(fixture.inspect.invalidations[0].sourceVersion, result.data.reviewCase.version);
  assert.equal(fixture.inspect.invalidations[0].requestId, requestId);
  assert.deepEqual(fixture.inspect.snapshotReads, ['case_social_reject']);
  assert.equal(fixture.inspect.publicClaims.size, 0);
});

test('requestChanges evidence: explicit material request records required changes and invalidation', async () => {
  const fixture = createAdminTestFixture(runtime);
  const requestId = 'req_changes_evidence_0001';
  const result = await fixture.endpointFor('reviewerA').main(adminEvent(
    'review.requestChanges',
    requestId,
    {
      reviewCaseId: 'case_social_changes',
      requiredChanges: ['请补充签发机构信息', '请补充有效期页'],
      ...writeGuards(3, 'changes_evidence'),
    },
  ));

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.data.reviewCase.status, 'NEEDS_CHANGES');
  assert.equal('projectionInvalidated' in result.data, false);
  assert.equal(fixture.inspect.reviewLogs[0].reason, '请补充签发机构信息；请补充有效期页');
  assert.equal(fixture.inspect.reviewLogs[0].afterStatus, 'NEEDS_CHANGES');
  assert.equal(fixture.inspect.invalidations[0].kind, 'VERIFICATION_CHANGED');
  assert.equal(fixture.inspect.invalidations[0].sourceAggregateId, 'verification_request_changes');
  assert.notEqual(fixture.inspect.invalidations[0].sourceVersion, result.data.reviewCase.version);
  assert.deepEqual(fixture.inspect.snapshotReads, ['case_social_changes']);
});

test('version conflict evidence: two reviewers race on one expectedVersion and exactly one transaction commits', async () => {
  const fixture = createAdminTestFixture(runtime);
  const reviewerA = fixture.endpointFor('reviewerA');
  const reviewerB = fixture.endpointFor('reviewerB');
  const [first, second] = await Promise.all([
    reviewerA.main(adminEvent(
      'review.approve',
      'req_concurrent_reviewer_a_0001',
      approvePayload('case_social_concurrent', 3, 'concurrent_a'),
    )),
    reviewerB.main(adminEvent(
      'review.approve',
      'req_concurrent_reviewer_b_0001',
      approvePayload('case_social_concurrent', 3, 'concurrent_b'),
    )),
  ]);

  const successes = [first, second].filter((item) => item.ok === true);
  const failures = [first, second].filter((item) => item.ok === false);
  assert.equal(successes.length, 1, JSON.stringify([first, second]));
  assert.equal(failures.length, 1, JSON.stringify([first, second]));
  assertFailure(failures[0], 'VERSION_CONFLICT');
  assert.equal(failures[0].error.details.expectedVersion, 3);
  assert.equal(failures[0].error.details.currentVersion, 4);

  assert.equal(fixture.inspect.reviewCases.get('case_social_concurrent').status, 'APPROVED');
  assert.equal(fixture.inspect.reviewCases.get('case_social_concurrent').version, 4);
  assert.equal(fixture.inspect.reviewLogs.length, 1);
  assert.equal(fixture.inspect.invalidations.length, 1);
  assert.equal(fixture.inspect.idempotency.size, 1);
  assert.equal(fixture.inspect.snapshotReads.length, 1);
  assert.equal(fixture.inspect.publicClaims.size, 1);
});

test('revoke evidence: revocation immediately denies public tag, old share and friend view without cards_public writes', async () => {
  const fixture = createAdminTestFixture(runtime);
  const endpoint = fixture.endpointFor('reviewerA');
  const approved = await endpoint.main(adminEvent(
    'review.approve',
    'req_revoke_setup_approve_0001',
    approvePayload('case_social_revoke', 3, 'revoke_setup'),
  ));
  assert.equal(approved.ok, true, JSON.stringify(approved));

  fixture.refreshVerificationViews('case_social_revoke');
  for (const view of ['publicTag', 'oldShare', 'friendView']) {
    assert.equal(fixture.readVerificationView(view).allowed, true);
  }

  const revoked = await endpoint.main(adminEvent(
    'review.revoke',
    'req_revoke_evidence_0001',
    {
      reviewCaseId: 'case_social_revoke',
      reasonCode: 'RIGHTS_WITHDRAWN',
      ...writeGuards(4, 'revoke_evidence'),
    },
  ));
  assert.equal(revoked.ok, true, JSON.stringify(revoked));
  assert.equal(revoked.data.reviewCase.status, 'REVOKED');
  assert.equal(revoked.data.reviewCase.version, 5);

  const claimId = fixture.inspect.claimIdsByCase.get('case_social_revoke');
  const claim = fixture.inspect.publicClaims.get(claimId);
  assert.equal(claim.reviewStatus, 'REVOKED');
  assert.equal(claim.publicVisible, false);
  assert.equal(claim.version, 2);
  const invalidation = fixture.inspect.invalidations.at(-1);
  assert.equal(invalidation.kind, 'VERIFICATION_CHANGED');
  assert.equal(invalidation.sourceAggregateId, claimId);
  assert.equal(invalidation.sourceVersion, claim.version);
  assert.deepEqual(runtime.invalidationUpdatesEveryViewer(invalidation), {
    publicTagDirty: true,
    oldShareDirty: true,
    friendViewDirty: true,
  });

  for (const view of ['publicTag', 'oldShare', 'friendView']) {
    const result = fixture.readVerificationView(view);
    assert.equal(result.allowed, false);
    assert.equal(result.dirty, true);
    assert.equal(result.sourceAllowsRead, false);
    assert.equal(result.reason, 'PROJECTION_STALE');
  }
  assert.deepEqual(fixture.inspect.cardsPublicWrites, []);

  const repeatedRevoke = await endpoint.main(adminEvent(
    'review.revoke',
    'req_revoke_repeat_0001',
    {
      reviewCaseId: 'case_social_revoke', reasonCode: 'REPEAT_ATTEMPT',
      ...writeGuards(5, 'revoke_repeat'),
    },
  ));
  assertFailure(repeatedRevoke, 'REVIEW_INVALID_TRANSITION');

  const approveRevoked = await endpoint.main(adminEvent(
    'review.approve',
    'req_approve_revoked_0001',
    approvePayload('case_social_revoke', 5, 'approve_revoked'),
  ));
  assertFailure(approveRevoked, 'REVIEW_INVALID_TRANSITION');
  assert.equal(fixture.inspect.reviewLogs.length, 2);
  assert.equal(fixture.inspect.invalidations.length, 2);
});

test('processed terminal cases cannot be approved a second time', async () => {
  const fixture = createAdminTestFixture(runtime);
  const endpoint = fixture.endpointFor('reviewerA');
  const first = await endpoint.main(adminEvent(
    'review.approve',
    'req_terminal_first_0001',
    approvePayload('case_social_approve', 3, 'terminal_first'),
  ));
  assert.equal(first.ok, true, JSON.stringify(first));

  const second = await endpoint.main(adminEvent(
    'review.approve',
    'req_terminal_second_0001',
    approvePayload('case_social_approve', 4, 'terminal_second'),
  ));
  assertFailure(second, 'REVIEW_INVALID_TRANSITION');
  assert.equal(second.error.details.from, 'APPROVED');
  assert.equal(second.error.details.to, 'APPROVED');
  assert.equal(fixture.inspect.reviewLogs.length, 1);
  assert.equal(fixture.inspect.invalidations.length, 1);
});

test('AI true and false advisories never write or approve; only an explicit action mutates', async () => {
  const fixture = createAdminTestFixture(runtime);
  const endpoint = fixture.endpointFor('reviewerA');

  for (const id of ['case_ai_true', 'case_ai_false']) {
    const result = await endpoint.main(adminEvent(
      'review.get', `req_ai_read_${id}_0001`, { reviewCaseId: id },
    ));
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.data.reviewCase.status, 'UNDER_REVIEW');
    assert.equal(JSON.stringify(result).includes(RAW_MATERIAL_URL_SENTINEL), false);
  }
  assert.equal(fixture.inspect.snapshotReads.length, 0);
  assert.equal(fixture.inspect.mutationCalls.length, 0);
  assert.equal(fixture.inspect.reviewLogs.length, 0);
  assert.equal(fixture.inspect.invalidations.length, 0);
  assert.equal(fixture.inspect.publicClaims.size, 0);

  const explicit = await endpoint.main(adminEvent(
    'review.approve',
    'req_ai_explicit_human_0001',
    approvePayload('case_ai_true', 3, 'ai_explicit'),
  ));
  assert.equal(explicit.ok, true, JSON.stringify(explicit));
  assert.equal(explicit.data.reviewCase.status, 'APPROVED');
  assert.equal(fixture.inspect.reviewCases.get('case_ai_false').status, 'UNDER_REVIEW');
  assert.equal(fixture.inspect.reviewLogs.length, 1);
});

test('APPROVED data without a complete ReviewLog fails both data audit and projection guard', async () => {
  const fixture = createAdminTestFixture(runtime);
  const result = await fixture.endpointFor('reviewerA').main(adminEvent(
    'review.approve',
    'req_missing_log_setup_0001',
    approvePayload('case_social_approve', 3, 'missing_log_setup'),
  ));
  assert.equal(result.ok, true, JSON.stringify(result));

  const audit = runtime.auditApprovedData({ reviewCases: [result.data.reviewCase], reviewLogs: [] });
  assert.equal(audit.ok, false);
  assert.deepEqual(audit.missingReviewLogCaseIds, ['case_social_approve']);
  assert.throws(
    () => runtime.assertApprovedDataMayProject(result.data.reviewCase, []),
    /without a complete ReviewLog/,
  );
  for (const malformedId of [123456, RAW_MATERIAL_URL_SENTINEL]) {
    const malformedCase = Object.freeze({ ...result.data.reviewCase, reviewCaseId: malformedId });
    assert.deepEqual(
      runtime.auditApprovedData({ reviewCases: [malformedCase], reviewLogs: [] }),
      { ok: false, missingReviewLogCaseIds: ['review_case_REDACTED'] },
    );
  }
});

test('APPROVED audit rejects forged or cross-bound ReviewLogs even when required-looking fields are present', async () => {
  const fixture = createAdminTestFixture(runtime);
  const result = await fixture.endpointFor('reviewerA').main(adminEvent(
    'review.approve',
    'req_audit_adversarial_setup_0001',
    approvePayload('case_social_approve', 3, 'audit_adversarial_setup'),
  ));
  assert.equal(result.ok, true, JSON.stringify(result));
  const reviewCase = result.data.reviewCase;
  const validLog = fixture.inspect.reviewLogs[0];
  assert.deepEqual(runtime.auditApprovedData({
    reviewCases: [reviewCase], reviewLogs: [validLog],
  }), { ok: true, missingReviewLogCaseIds: [] });

  const adversarialOverrides = [
    ['action', 'review.reject'],
    ['targetType', 'CONTENT'],
    ['targetId', 'verification_request_different'],
    ['result', 'FAILED'],
    ['actorRole', 'SYSTEM'],
    ['actorUserId', 'user_different_actor'],
    ['reviewedBy', 'user_different_reviewer'],
    ['occurredAt', '2026-08-27T07:00:00.000Z'],
    ['reviewedAt', 'not-an-instant'],
    ['reviewedAt', '2026-09-31T00:00:00.000Z'],
    ['reviewScope', 'CONTENT_PUBLICATION'],
    ['reasonCode', ''],
    ['reasonCode', 'WRONG_APPROVAL_CODE'],
    ['reasonCode', RAW_MATERIAL_URL_SENTINEL],
    ['reason', ''],
    ['reason', 'x'],
    ['reason', `泄漏 ${RAW_MATERIAL_URL_SENTINEL}`],
    ['reason', '泄漏 ftp://private.invalid/material'],
    ['reason', '泄漏 s3://private-bucket/material'],
    ['reason', '泄漏 blob:private-material'],
    ['reason', '泄漏 data:text/plain,private'],
    ['reason', '泄漏 //private.invalid/material'],
    ['beforeStatus', 'APPROVED'],
    ['expectedVersion', 1],
    ['sourceSnapshotVersion', 0],
    ['auditEntryId', ''],
    ['requestId', ''],
    ['requestId', 'req_12'],
  ];

  for (const [field, value] of adversarialOverrides) {
    const forgedLog = Object.freeze({ ...validLog, [field]: value });
    const audit = runtime.auditApprovedData({ reviewCases: [reviewCase], reviewLogs: [forgedLog] });
    assert.deepEqual(
      audit,
      { ok: false, missingReviewLogCaseIds: ['case_social_approve'] },
      `forged ReviewLog field ${field} must not authorize APPROVED projection`,
    );
    assert.throws(
      () => runtime.assertApprovedDataMayProject(reviewCase, [forgedLog]),
      /without a complete ReviewLog/,
      `projection guard accepted forged ReviewLog field ${field}`,
    );
  }

  const structurallyForgedLogs = [
    Object.freeze({ ...validLog, actorUserId: 123456, reviewedBy: 123456 }),
    Object.freeze({ ...validLog, auditEntryId: 123456 }),
    Object.freeze({ ...validLog, requestId: 12345678 }),
    Object.freeze({ ...validLog, rawMaterialUrl: RAW_MATERIAL_URL_SENTINEL }),
  ];
  for (const forgedLog of structurallyForgedLogs) {
    assert.deepEqual(
      runtime.auditApprovedData({ reviewCases: [reviewCase], reviewLogs: [forgedLog] }),
      { ok: false, missingReviewLogCaseIds: ['case_social_approve'] },
    );
    assert.throws(
      () => runtime.assertApprovedDataMayProject(reviewCase, [forgedLog]),
      /without a complete ReviewLog/,
    );
  }
});

test('REVIEWER approval audit is bound to the case assignment while ADMIN override remains role-scoped', async () => {
  const fixture = createAdminTestFixture(runtime);
  fixture.simulateExternalAssignment('case_social_approve', 'user_reviewerA');
  const result = await fixture.endpointFor('reviewerA').main(adminEvent(
    'review.approve',
    'req_assigned_reviewer_audit_0001',
    approvePayload('case_social_approve', 3, 'assigned_reviewer_audit'),
  ));
  assert.equal(result.ok, true, JSON.stringify(result));
  const validLog = fixture.inspect.reviewLogs[0];
  assert.deepEqual(runtime.auditApprovedData({
    reviewCases: [result.data.reviewCase], reviewLogs: [validLog],
  }), { ok: true, missingReviewLogCaseIds: [] });

  const crossAssignedLog = Object.freeze({
    ...validLog,
    actorUserId: 'user_reviewerB',
    reviewedBy: 'user_reviewerB',
  });
  assert.deepEqual(runtime.auditApprovedData({
    reviewCases: [result.data.reviewCase], reviewLogs: [crossAssignedLog],
  }), { ok: false, missingReviewLogCaseIds: ['case_social_approve'] });
});

test('transaction rollback discards source mutation, ReviewLog, invalidation, claim and idempotency on append failure', async () => {
  const fixture = createAdminTestFixture(runtime, { failInvalidationOnce: true });
  const result = await fixture.endpointFor('reviewerA').main(adminEvent(
    'review.approve',
    'req_forced_rollback_0001',
    approvePayload('case_social_approve', 3, 'forced_rollback'),
  ));
  assertFailure(result, 'INTERNAL_ERROR');
  assert.equal(fixture.inspect.reviewCases.get('case_social_approve').status, 'UNDER_REVIEW');
  assert.equal(fixture.inspect.reviewCases.get('case_social_approve').version, 3);
  assert.equal(fixture.inspect.reviewLogs.length, 0);
  assert.equal(fixture.inspect.invalidations.length, 0);
  assert.equal(fixture.inspect.publicClaims.size, 0);
  assert.equal(fixture.inspect.idempotency.size, 0);
  assert.equal(fixture.inspect.mutationCalls.length, 0);
  assert.equal(fixture.inspect.snapshotReads.length, 0);
});

test('idempotency replay does not duplicate audit or invalidation and changed payload conflicts', async () => {
  const fixture = createAdminTestFixture(runtime);
  const endpoint = fixture.endpointFor('reviewerA');
  const payload = approvePayload('case_social_approve', 3, 'idempotency_replay');
  const first = await endpoint.main(adminEvent('review.approve', 'req_idem_first_0001', payload));
  const replay = await endpoint.main(adminEvent('review.approve', 'req_idem_replay_0001', payload));
  assert.equal(first.ok, true, JSON.stringify(first));
  assert.equal(replay.ok, true, JSON.stringify(replay));
  assert.deepEqual(replay.data, first.data);
  assert.equal(fixture.inspect.reviewLogs.length, 1);
  assert.equal(fixture.inspect.invalidations.length, 1);

  const conflict = await endpoint.main(adminEvent(
    'review.approve',
    'req_idem_conflict_0001',
    { ...payload, decisionNote: '同一个幂等键不能用于不同决定' },
  ));
  assertFailure(conflict, 'IDEMPOTENCY_CONFLICT');
  assert.equal(conflict.error.details.firstRequestId, 'req_idem_first_0001');
});

test('idempotency replay rechecks the current case assignment before returning prior data', async () => {
  const fixture = createAdminTestFixture(runtime);
  const endpoint = fixture.endpointFor('reviewerA');
  const payload = approvePayload('case_social_approve', 3, 'idempotency_assignment');
  const first = await endpoint.main(adminEvent(
    'review.approve', 'req_idem_assignment_first_0001', payload,
  ));
  assert.equal(first.ok, true, JSON.stringify(first));

  fixture.simulateExternalAssignment('case_social_approve', 'user_reviewerB');
  const replay = await endpoint.main(adminEvent(
    'review.approve', 'req_idem_assignment_replay_0001', payload,
  ));
  assertFailure(replay, 'FORBIDDEN');
  assert.equal(replay.error.details.policy, 'CASE_ASSIGNED_TO_ANOTHER_REVIEWER');
  assert.equal(fixture.inspect.reviewLogs.length, 1);
  assert.equal(fixture.inspect.invalidations.length, 1);
  assert.equal(fixture.inspect.mutationCalls.length, 1);
});
