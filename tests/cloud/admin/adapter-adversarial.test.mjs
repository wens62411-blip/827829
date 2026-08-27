import assert from 'node:assert/strict';
import test from 'node:test';

import { loadAdminRuntime } from './runtime-loader.mjs';
import {
  RAW_MATERIAL_URL_SENTINEL,
  adminEvent,
  createAdminTestFixture,
  writeGuards,
} from './test-fixture.mjs';

const runtime = await loadAdminRuntime();

function assertFailure(result, code) {
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.equal(result.error.code, code, JSON.stringify(result));
  assert.equal('data' in result, false);
}

function assertNoRawLocator(result) {
  assert.equal(JSON.stringify(result).includes(RAW_MATERIAL_URL_SENTINEL), false);
}

function committedCounts(fixture) {
  return {
    reviewLogs: fixture.inspect.reviewLogs.length,
    invalidations: fixture.inspect.invalidations.length,
    idempotency: fixture.inspect.idempotency.size,
    mutationCalls: fixture.inspect.mutationCalls.length,
    snapshotReads: fixture.inspect.snapshotReads.length,
  };
}

test('review.get rejects a raw locator in every ReviewCase identifier and evidence asset identifier', async () => {
  const fields = [
    'reviewCaseId',
    'aggregateId',
    'evidenceAssetId',
    'submitterUserId',
    'assignedReviewerUserId',
    'title',
    'summary',
  ];
  for (const field of fields) {
    const fixture = createAdminTestFixture(runtime, { reviewCaseLocatorField: field });
    const result = await fixture.endpointFor('reviewerA').main(adminEvent(
      'review.get',
      `req_review_get_locator_${field}_0001`,
      { reviewCaseId: 'case_social_approve' },
    ));
    assertFailure(result, 'INTERNAL_ERROR');
    assertNoRawLocator(result);
    assert.deepEqual(committedCounts(fixture), {
      reviewLogs: 0, invalidations: 0, idempotency: 0, mutationCalls: 0, snapshotReads: 0,
    });
  }
});

test('review DTOs reject non-HTTP, opaque and protocol-relative material locators', async () => {
  const locators = [
    'ftp://private.invalid/material',
    's3://private-bucket/material',
    'gs://private-bucket/material',
    'ipfs://private-cid/material',
    'blob:private-material',
    'data:application/octet-stream;base64,AAAA',
    '//private.invalid/material',
  ];
  for (const [index, locator] of locators.entries()) {
    const fixture = createAdminTestFixture(runtime, {
      reviewCaseLocatorField: 'summary',
      repositoryLocatorValue: locator,
    });
    const result = await fixture.endpointFor('reviewerA').main(adminEvent(
      'review.get',
      `req_alt_locator_dto_${String(index).padStart(2, '0')}_0001`,
      { reviewCaseId: 'case_social_approve' },
    ));
    assertFailure(result, 'INTERNAL_ERROR');
    assert.equal(JSON.stringify(result).includes(locator), false);
    assert.deepEqual(committedCounts(fixture), {
      reviewLogs: 0, invalidations: 0, idempotency: 0, mutationCalls: 0, snapshotReads: 0,
    });
  }
});

test('list cursor DTO rejects raw cursors, inconsistent hasMore, empty continuation, over-limit and extra fields', async () => {
  const faults = [
    'rawCursor',
    'missingCursor',
    'cursorWhenDone',
    'emptyHasMore',
    'overLimit',
    'extraField',
  ];
  for (const fault of faults) {
    const fixture = createAdminTestFixture(runtime, { cursorFault: fault });
    const result = await fixture.endpointFor('reviewerA').main(adminEvent(
      'review.list',
      `req_cursor_fault_${fault}_0001`,
      { limit: 1 },
    ));
    assertFailure(result, 'INTERNAL_ERROR');
    assertNoRawLocator(result);
    assert.deepEqual(committedCounts(fixture), {
      reviewLogs: 0, invalidations: 0, idempotency: 0, mutationCalls: 0, snapshotReads: 0,
    });
  }
});

test('audit.list rejects locator-shaped action, reason, target and identifier fields without disclosing them', async () => {
  const fields = [
    'action',
    'reasonCode',
    'targetType',
    'targetId',
    'auditEntryId',
    'actorUserId',
    'requestId',
  ];
  for (const field of fields) {
    const fixture = createAdminTestFixture(runtime, { auditLocatorField: field });
    const setup = await fixture.endpointFor('reviewerA').main(adminEvent(
      'review.approve',
      `req_audit_locator_setup_${field}_0001`,
      {
        reviewCaseId: 'case_social_approve',
        decisionNote: '人工动作仅用于生成合约内测试审计记录',
        ...writeGuards(3, `audit_locator_setup_${field}`),
      },
    ));
    assert.equal(setup.ok, true, JSON.stringify(setup));
    const before = committedCounts(fixture);

    const result = await fixture.endpointFor('superAdmin').main(adminEvent(
      'audit.list',
      `req_audit_locator_list_${field}_0001`,
      { limit: 10 },
    ));
    assertFailure(result, 'INTERNAL_ERROR');
    assertNoRawLocator(result);
    assert.deepEqual(committedCounts(fixture), before);
  }
});

function eventPayload(decision, expectedVersion, suffix) {
  return {
    reviewCaseId: 'case_event_approve',
    eventId: 'event_fixture_001',
    decision,
    note: `人工活动审核 ${decision} 的恶意结果对抗测试`,
    ...writeGuards(expectedVersion, suffix),
  };
}

function contentPayload(decision, expectedVersion, suffix) {
  return {
    reviewCaseId: 'case_content_approve',
    contentId: 'content_fixture_approved_rights',
    decision,
    note: `人工内容审核 ${decision} 的恶意结果对抗测试`,
    ...writeGuards(expectedVersion, suffix),
  };
}

test('event.review rolls back an adapter projection with the wrong state for every decision', async () => {
  for (const decision of ['APPROVE', 'REJECT', 'REQUEST_CHANGES', 'PAUSE', 'CANCEL']) {
    const fixture = createAdminTestFixture(runtime, { decisionResultFault: `event:${decision}` });
    const endpoint = fixture.endpointFor('eventManager');
    const requiresPublishedSetup = decision === 'PAUSE' || decision === 'CANCEL';
    if (requiresPublishedSetup) {
      const setup = await endpoint.main(adminEvent(
        'event.review',
        `req_event_wrong_state_setup_${decision}_0001`,
        eventPayload('APPROVE', 3, `event_wrong_state_setup_${decision}`),
      ));
      assert.equal(setup.ok, true, JSON.stringify(setup));
    }
    const before = committedCounts(fixture);
    const beforeCase = structuredClone(fixture.inspect.reviewCases.get('case_event_approve'));

    const result = await endpoint.main(adminEvent(
      'event.review',
      `req_event_wrong_state_${decision}_0001`,
      eventPayload(
        decision,
        requiresPublishedSetup ? 4 : 3,
        `event_wrong_state_${decision}`,
      ),
    ));
    assertFailure(result, 'INTERNAL_ERROR');
    assertNoRawLocator(result);
    assert.deepEqual(fixture.inspect.reviewCases.get('case_event_approve'), beforeCase);
    assert.deepEqual(committedCounts(fixture), before);
  }
});

test('content.review rolls back an adapter projection with the wrong publication state for every decision', async () => {
  for (const decision of ['APPROVE', 'REJECT', 'REQUEST_CHANGES', 'UNPUBLISH']) {
    const fixture = createAdminTestFixture(runtime, { decisionResultFault: `content:${decision}` });
    const endpoint = fixture.endpointFor('contentManager');
    const requiresPublishedSetup = decision === 'UNPUBLISH';
    if (requiresPublishedSetup) {
      const setup = await endpoint.main(adminEvent(
        'content.review',
        `req_content_wrong_state_setup_${decision}_0001`,
        contentPayload('APPROVE', 3, `content_wrong_state_setup_${decision}`),
      ));
      assert.equal(setup.ok, true, JSON.stringify(setup));
    }
    const before = committedCounts(fixture);
    const beforeCase = structuredClone(fixture.inspect.reviewCases.get('case_content_approve'));

    const result = await endpoint.main(adminEvent(
      'content.review',
      `req_content_wrong_state_${decision}_0001`,
      contentPayload(
        decision,
        requiresPublishedSetup ? 4 : 3,
        `content_wrong_state_${decision}`,
      ),
    ));
    assertFailure(result, 'INTERNAL_ERROR');
    assertNoRawLocator(result);
    assert.deepEqual(fixture.inspect.reviewCases.get('case_content_approve'), beforeCase);
    assert.deepEqual(committedCounts(fixture), before);
  }
});

test('review.revoke rolls back every malformed structured claim proof and keeps the approved claim public', async () => {
  const faults = [
    'wrongCase',
    'wrongCollection',
    'wrongClaimId',
    'wrongSourceBinding',
    'publicVisible',
    'version',
    'extraField',
  ];
  for (const fault of faults) {
    const fixture = createAdminTestFixture(runtime, { revokeProofFault: fault });
    const endpoint = fixture.endpointFor('reviewerA');
    const approved = await endpoint.main(adminEvent(
      'review.approve',
      `req_revoke_proof_setup_${fault}_0001`,
      {
        reviewCaseId: 'case_social_revoke',
        decisionNote: '人工明确通过以建立合约内撤销前置状态',
        ...writeGuards(3, `revoke_proof_setup_${fault}`),
      },
    ));
    assert.equal(approved.ok, true, JSON.stringify(approved));
    fixture.refreshVerificationViews('case_social_revoke');
    const before = committedCounts(fixture);

    const result = await endpoint.main(adminEvent(
      'review.revoke',
      `req_revoke_proof_fault_${fault}_0001`,
      {
        reviewCaseId: 'case_social_revoke',
        reasonCode: 'RIGHTS_WITHDRAWN',
        ...writeGuards(4, `revoke_proof_fault_${fault}`),
      },
    ));
    assertFailure(result, 'INTERNAL_ERROR');
    assertNoRawLocator(result);
    assert.deepEqual(committedCounts(fixture), before);
    assert.equal(fixture.inspect.reviewCases.get('case_social_revoke').status, 'APPROVED');
    assert.equal(fixture.inspect.reviewCases.get('case_social_revoke').version, 4);
    const claimId = fixture.inspect.claimIdsByCase.get('case_social_revoke');
    const claim = fixture.inspect.publicClaims.get(claimId);
    assert.equal(claim.reviewStatus, 'APPROVED');
    assert.equal(claim.publicVisible, true);
    assert.equal(claim.version, 1);
    for (const view of ['publicTag', 'oldShare', 'friendView']) {
      assert.equal(fixture.readVerificationView(view).allowed, true);
      assert.equal(fixture.readVerificationView(view).dirty, false);
    }
    assert.deepEqual(fixture.inspect.cardsPublicWrites, []);
  }
});

test('review mutation cannot replace evidence, submitter, assignment or descriptive case fields', async () => {
  for (const reviewCaseMutationFault of [
    'title',
    'summary',
    'submitterUserId',
    'assignedReviewerUserId',
    'evidenceAssetIds',
  ]) {
    const fixture = createAdminTestFixture(runtime, { reviewCaseMutationFault });
    const beforeCase = structuredClone(fixture.inspect.reviewCases.get('case_social_approve'));
    const result = await fixture.endpointFor('reviewerA').main(adminEvent(
      'review.approve',
      `req_case_substitution_${reviewCaseMutationFault}_0001`,
      {
        reviewCaseId: 'case_social_approve',
        decisionNote: '人工审核动作不得允许适配器替换案件身份或证据',
        ...writeGuards(3, `case_substitution_${reviewCaseMutationFault}`),
      },
    ));
    assertFailure(result, 'INTERNAL_ERROR');
    assert.deepEqual(fixture.inspect.reviewCases.get('case_social_approve'), beforeCase);
    assert.deepEqual(committedCounts(fixture), {
      reviewLogs: 0, invalidations: 0, idempotency: 0, mutationCalls: 0, snapshotReads: 0,
    });
    assert.equal(fixture.inspect.publicClaims.size, 0);
  }
});

test('review approval binds the public claim subject to the case submitter', async () => {
  const fixture = createAdminTestFixture(runtime, { approvedClaimSubjectFault: true });
  const result = await fixture.endpointFor('reviewerA').main(adminEvent(
    'review.approve',
    'req_wrong_claim_subject_0001',
    {
      reviewCaseId: 'case_social_approve',
      decisionNote: '人工审批不得给另一个主体生成公开标签',
      ...writeGuards(3, 'wrong_claim_subject'),
    },
  ));
  assertFailure(result, 'INTERNAL_ERROR');
  assert.equal(fixture.inspect.reviewCases.get('case_social_approve').status, 'UNDER_REVIEW');
  assert.equal(fixture.inspect.publicClaims.size, 0);
  assert.deepEqual(committedCounts(fixture), {
    reviewLogs: 0, invalidations: 0, idempotency: 0, mutationCalls: 0, snapshotReads: 0,
  });
});

test('review approval fails before mutation when the case has no submitter binding', async () => {
  const fixture = createAdminTestFixture(runtime, { omitSocialApprovalSubmitter: true });
  const result = await fixture.endpointFor('reviewerA').main(adminEvent(
    'review.approve',
    'req_missing_submitter_binding_0001',
    {
      reviewCaseId: 'case_social_approve',
      decisionNote: '缺少主体绑定时不得生成任何公开标签',
      ...writeGuards(3, 'missing_submitter_binding'),
    },
  ));
  assertFailure(result, 'REVIEW_EVIDENCE_REQUIRED');
  assert.deepEqual(result.error.details.missingEvidenceKinds, ['SUBMITTER_BINDING']);
  assert.equal(fixture.inspect.reviewCases.get('case_social_approve').status, 'UNDER_REVIEW');
  assert.equal(fixture.inspect.publicClaims.size, 0);
  assert.deepEqual(committedCounts(fixture), {
    reviewLogs: 0, invalidations: 0, idempotency: 0, mutationCalls: 0, snapshotReads: 0,
  });
});

test('every authoritative invalidation binds to its source version rather than the ReviewCase version', async () => {
  const attempts = [
    ['reviewerA', 'review.reject', {
      reviewCaseId: 'case_social_reject', reasonCode: 'EVIDENCE_MISMATCH',
      decisionNote: '拒绝必须绑定申请快照后的连续版本',
      ...writeGuards(3, 'reject_source_binding'),
    }, 'case_social_reject'],
    ['reviewerA', 'review.requestChanges', {
      reviewCaseId: 'case_social_changes', requiredChanges: ['请补充签发机构信息'],
      ...writeGuards(3, 'changes_source_binding'),
    }, 'case_social_changes'],
    ['eventManager', 'organizer.review', {
      reviewCaseId: 'case_organizer_approve', organizerId: 'organizer_fixture_001',
      decision: 'APPROVE', note: '主理人投影版本绑定对抗测试',
      ...writeGuards(3, 'organizer_source_binding'),
    }, 'case_organizer_approve'],
    ['eventManager', 'event.review', {
      reviewCaseId: 'case_event_approve', eventId: 'event_fixture_001',
      decision: 'APPROVE', note: '活动投影版本绑定对抗测试',
      ...writeGuards(3, 'event_source_binding'),
    }, 'case_event_approve'],
    ['contentManager', 'content.review', {
      reviewCaseId: 'case_content_approve', contentId: 'content_fixture_approved_rights',
      decision: 'APPROVE', note: '内容投影版本绑定对抗测试',
      ...writeGuards(3, 'content_source_binding'),
    }, 'case_content_approve'],
  ];

  for (const [actor, action, payload, reviewCaseId] of attempts) {
    const fixture = createAdminTestFixture(runtime, { sourceBindingFault: action });
    const beforeCase = structuredClone(fixture.inspect.reviewCases.get(reviewCaseId));
    const result = await fixture.endpointFor(actor).main(adminEvent(
      action,
      `req_${action.replace('.', '_')}_source_binding_0001`,
      payload,
    ));
    assertFailure(result, 'INTERNAL_ERROR');
    assert.deepEqual(fixture.inspect.reviewCases.get(reviewCaseId), beforeCase);
    assert.deepEqual(committedCounts(fixture), {
      reviewLogs: 0, invalidations: 0, idempotency: 0, mutationCalls: 0, snapshotReads: 0,
    });
  }
});

test('opaque application snapshots require an exact envelope and a past RFC3339 capture time', async () => {
  for (const snapshotFault of [
    'numericCapturedAt', 'futureCapturedAt', 'invalidCalendarCapturedAt', 'extraField',
  ]) {
    const fixture = createAdminTestFixture(runtime, { snapshotFault });
    const result = await fixture.endpointFor('reviewerA').main(adminEvent(
      'review.approve',
      `req_snapshot_fault_${snapshotFault}_0001`,
      {
        reviewCaseId: 'case_social_approve',
        decisionNote: '人工审核只接受决定前捕获的精确快照信封',
        ...writeGuards(3, `snapshot_fault_${snapshotFault}`),
      },
    ));
    assertFailure(result, 'REVIEW_EVIDENCE_REQUIRED');
    assertNoRawLocator(result);
    assert.equal(fixture.inspect.reviewCases.get('case_social_approve').status, 'UNDER_REVIEW');
    assert.deepEqual(committedCounts(fixture), {
      reviewLogs: 0, invalidations: 0, idempotency: 0, mutationCalls: 0, snapshotReads: 0,
    });
  }
});

test('corrupt idempotency records cannot replay across namespaces or disclose stored identifiers', async () => {
  for (const idempotencyRecordFault of ['wrongNamespace', 'rawRequestId', 'extraField']) {
    const fixture = createAdminTestFixture(runtime, { idempotencyRecordFault });
    const endpoint = fixture.endpointFor('reviewerA');
    const payload = {
      reviewCaseId: 'case_social_approve',
      decisionNote: '人工审核幂等记录边界对抗测试',
      ...writeGuards(3, `idempotency_record_${idempotencyRecordFault}`),
    };
    const first = await endpoint.main(adminEvent(
      'review.approve',
      `req_idem_record_setup_${idempotencyRecordFault}_0001`,
      payload,
    ));
    assert.equal(first.ok, true, JSON.stringify(first));
    const before = committedCounts(fixture);
    const replay = await endpoint.main(adminEvent(
      'review.approve',
      `req_idem_record_replay_${idempotencyRecordFault}_0001`,
      payload,
    ));
    assertFailure(replay, 'INTERNAL_ERROR');
    assertNoRawLocator(replay);
    assert.deepEqual(committedCounts(fixture), before);
  }
});

test('invalid generated audit or invalidation IDs roll back every review write', async () => {
  for (const generatedIdFault of ['audit-entry', 'projection-invalidation']) {
    const fixture = createAdminTestFixture(runtime, { generatedIdFault });
    const result = await fixture.endpointFor('reviewerA').main(adminEvent(
      'review.approve',
      `req_generated_id_fault_${generatedIdFault.replace('-', '_')}_0001`,
      {
        reviewCaseId: 'case_social_approve',
        decisionNote: '畸形生成标识不得进入审核或投影失效日志',
        ...writeGuards(3, `generated_id_${generatedIdFault}`),
      },
    ));
    assertFailure(result, 'INTERNAL_ERROR');
    assertNoRawLocator(result);
    assert.equal(fixture.inspect.reviewCases.get('case_social_approve').status, 'UNDER_REVIEW');
    assert.equal(fixture.inspect.publicClaims.size, 0);
    assert.deepEqual(committedCounts(fixture), {
      reviewLogs: 0, invalidations: 0, idempotency: 0, mutationCalls: 0, snapshotReads: 0,
    });
  }

  const reportFixture = createAdminTestFixture(runtime, { generatedIdFault: 'audit-entry' });
  const reportResult = await reportFixture.endpointFor('reviewerA').main(adminEvent(
    'report.resolve',
    'req_report_generated_audit_id_fault_0001',
    {
      reportId: 'report_fixture_001', resolution: 'ACTION_TAKEN',
      note: '畸形生成标识不得进入举报审计',
      ...writeGuards(2, 'report_generated_audit_id'),
    },
  ));
  assertFailure(reportResult, 'INTERNAL_ERROR');
  assertNoRawLocator(reportResult);
  assert.equal(reportFixture.inspect.reports.get('report_fixture_001').status, 'OPEN');
  assert.equal(reportFixture.inspect.audits.length, 0);
  assert.equal(reportFixture.inspect.idempotency.size, 0);
  assert.equal(reportFixture.inspect.mutationCalls.length, 0);
});

test('organizer, content and report adapters cannot return reversed version timestamps', async () => {
  const attempts = [
    ['organizerInvalidCalendar', 'eventManager', 'organizer.review', {
      reviewCaseId: 'case_organizer_approve', organizerId: 'organizer_fixture_001',
      decision: 'APPROVE', note: '不存在的日历日期必须被拒绝',
      ...writeGuards(3, 'organizer_invalid_calendar'),
    }, 'case_organizer_approve'],
    ['organizer', 'eventManager', 'organizer.review', {
      reviewCaseId: 'case_organizer_approve', organizerId: 'organizer_fixture_001',
      decision: 'APPROVE', note: '主理人时间线必须单调',
      ...writeGuards(3, 'organizer_chronology'),
    }, 'case_organizer_approve'],
    ['content', 'contentManager', 'content.review', {
      reviewCaseId: 'case_content_approve', contentId: 'content_fixture_approved_rights',
      decision: 'APPROVE', note: '内容时间线必须单调',
      ...writeGuards(3, 'content_chronology'),
    }, 'case_content_approve'],
    ['report', 'reviewerA', 'report.resolve', {
      reportId: 'report_fixture_001', resolution: 'ACTION_TAKEN',
      note: '举报时间线必须单调',
      ...writeGuards(2, 'report_chronology'),
    }, undefined],
  ];
  for (const [chronologyFault, actor, action, payload, reviewCaseId] of attempts) {
    const fixture = createAdminTestFixture(runtime, { chronologyFault });
    const result = await fixture.endpointFor(actor).main(adminEvent(
      action,
      `req_${chronologyFault}_chronology_fault_0001`,
      payload,
    ));
    assertFailure(result, 'INTERNAL_ERROR');
    if (reviewCaseId === undefined) {
      assert.equal(fixture.inspect.reports.get('report_fixture_001').status, 'OPEN');
      assert.equal(fixture.inspect.audits.length, 0);
    } else {
      assert.equal(fixture.inspect.reviewCases.get(reviewCaseId).status, 'UNDER_REVIEW');
      assert.equal(fixture.inspect.reviewLogs.length, 0);
      assert.equal(fixture.inspect.invalidations.length, 0);
    }
    assert.equal(fixture.inspect.idempotency.size, 0);
    assert.equal(fixture.inspect.mutationCalls.length, 0);
  }
});

test('review and report mutations cannot move an aggregate updatedAt backwards', async () => {
  const reviewFixture = createAdminTestFixture(runtime, { timeRegressionTarget: 'reviewCase' });
  const review = await reviewFixture.endpointFor('reviewerA').main(adminEvent(
    'review.approve',
    'req_review_time_regression_0001',
    {
      reviewCaseId: 'case_social_approve',
      decisionNote: '审核事务不得把案件时间倒退',
      ...writeGuards(3, 'review_time_regression'),
    },
  ));
  assertFailure(review, 'INTERNAL_ERROR');
  assert.equal(
    reviewFixture.inspect.reviewCases.get('case_social_approve').updatedAt,
    '2098-01-01T00:00:00.000Z',
  );
  assert.deepEqual(committedCounts(reviewFixture), {
    reviewLogs: 0, invalidations: 0, idempotency: 0, mutationCalls: 0, snapshotReads: 0,
  });

  const reportFixture = createAdminTestFixture(runtime, { timeRegressionTarget: 'report' });
  const report = await reportFixture.endpointFor('reviewerA').main(adminEvent(
    'report.resolve',
    'req_report_time_regression_0001',
    {
      reportId: 'report_fixture_001', resolution: 'ACTION_TAKEN',
      note: '举报事务不得把时间倒退',
      ...writeGuards(2, 'report_time_regression'),
    },
  ));
  assertFailure(report, 'INTERNAL_ERROR');
  assert.equal(reportFixture.inspect.reports.get('report_fixture_001').status, 'OPEN');
  assert.equal(reportFixture.inspect.reports.get('report_fixture_001').updatedAt, '2098-01-01T00:00:00.000Z');
  assert.equal(reportFixture.inspect.audits.length, 0);
  assert.equal(reportFixture.inspect.idempotency.size, 0);
  assert.equal(reportFixture.inspect.mutationCalls.length, 0);
});

test('review approval rejects public claims that are future-dated or already expired', async () => {
  for (const claimEffectiveFault of ['future', 'expired']) {
    const fixture = createAdminTestFixture(runtime, { claimEffectiveFault });
    const result = await fixture.endpointFor('reviewerA').main(adminEvent(
      'review.approve',
      `req_claim_effective_${claimEffectiveFault}_0001`,
      {
        reviewCaseId: 'case_social_approve',
        decisionNote: '人工通过必须产生当前已经生效的公开标签',
        ...writeGuards(3, `claim_effective_${claimEffectiveFault}`),
      },
    ));
    assertFailure(result, 'INTERNAL_ERROR');
    assert.equal(fixture.inspect.reviewCases.get('case_social_approve').status, 'UNDER_REVIEW');
    assert.equal(fixture.inspect.publicClaims.size, 0);
    assert.deepEqual(committedCounts(fixture), {
      reviewLogs: 0, invalidations: 0, idempotency: 0, mutationCalls: 0, snapshotReads: 0,
    });
  }
});
