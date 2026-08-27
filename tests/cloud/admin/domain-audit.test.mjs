import assert from 'node:assert/strict';
import test from 'node:test';

import { loadAdminRuntime } from './runtime-loader.mjs';
import {
  RAW_MATERIAL_URL_SENTINEL,
  TEST_FIXTURE_CLASSIFICATION,
  adminEvent,
  createAdminTestFixture,
  writeGuards,
} from './test-fixture.mjs';

const runtime = await loadAdminRuntime();

function assertSuccess(result) {
  assert.equal(result.ok, true, JSON.stringify(result));
}

function assertFailure(result, code) {
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.equal(result.error.code, code, JSON.stringify(result));
  assert.equal('data' in result, false);
}

test('fixture is explicitly synthetic and contains no pre-approved production seed', () => {
  const fixture = createAdminTestFixture(runtime);
  assert.deepEqual(fixture.classification, {
    evidenceKind: 'SYNTHETIC_TEST_FIXTURE',
    productionData: false,
    humanOperationsTeamEstablished: false,
  });
  assert.equal(
    [...fixture.inspect.reviewCases.values()].some((reviewCase) => reviewCase.status === 'APPROVED'),
    false,
  );
  assert.equal(fixture.inspect.publicClaims.size, 0);
  assert.equal(fixture.inspect.reviewLogs.length, 0);
  assert.equal(fixture.inspect.audits.length, 0);
});

test('review, report and audit lists are redacted by default and never disclose raw material URLs', async () => {
  const fixture = createAdminTestFixture(runtime);
  const reviewer = fixture.endpointFor('reviewerA');

  const reviewList = await reviewer.main(adminEvent(
    'review.list', 'req_redacted_review_list_0001', { limit: 50 },
  ));
  assertSuccess(reviewList);
  assert.ok(reviewList.data.page.items.length > 0);
  for (const item of reviewList.data.page.items) {
    assert.equal(item.domain, 'SOCIAL');
    assert.equal(item.aggregateId, 'REDACTED_TARGET');
    assert.deepEqual(item.evidenceAssetIds, []);
    assert.equal('submitterUserId' in item, false);
    assert.equal('assignedReviewerUserId' in item, false);
    assert.match(item.title, /受限审核案件/);
    assert.match(item.summary, /冻结协议未提供材料访问审计/);
    assert.match(item.summary, /原始材料保持不可见/);
    assert.doesNotMatch(item.summary, /记录访问审计后/);
  }

  const reportList = await reviewer.main(adminEvent(
    'report.list', 'req_redacted_report_list_0001', { limit: 10 },
  ));
  assertSuccess(reportList);
  assert.equal(reportList.data.page.items.length, 1);
  assert.equal(reportList.data.page.items[0].targetId, 'REDACTED_TARGET');
  assert.equal(reportList.data.page.items[0].status, 'OPEN');

  const approved = await reviewer.main(adminEvent(
    'review.approve',
    'req_redacted_audit_setup_0001',
    {
      reviewCaseId: 'case_social_approve',
      decisionNote: '人工明确通过并生成脱敏审计示例',
      ...writeGuards(3, 'redacted_audit_setup'),
    },
  ));
  assertSuccess(approved);

  const auditList = await fixture.endpointFor('superAdmin').main(adminEvent(
    'audit.list', 'req_redacted_audit_list_0001', { limit: 10 },
  ));
  assertSuccess(auditList);
  assert.equal(auditList.data.page.items.length, 1);
  const audit = auditList.data.page.items[0];
  assert.equal(audit.targetId, 'REDACTED_TARGET');
  assert.equal('actorUserId' in audit, false);
  assert.deepEqual(Object.keys(audit).sort(), [
    'action', 'actorRole', 'auditEntryId', 'occurredAt', 'reasonCode',
    'requestId', 'result', 'targetId', 'targetType',
  ].sort());

  const externallyVisible = JSON.stringify({ reviewList, reportList, auditList });
  assert.equal(externallyVisible.includes(RAW_MATERIAL_URL_SENTINEL), false);
  assert.equal(externallyVisible.includes('reported_user_fixture_001'), false);
});

test('organizer and event publication reviews use only their authorized domains and append invalidations', async () => {
  const fixture = createAdminTestFixture(runtime);
  const eventManager = fixture.endpointFor('eventManager');

  const organizer = await eventManager.main(adminEvent(
    'organizer.review',
    'req_organizer_approve_0001',
    {
      reviewCaseId: 'case_organizer_approve',
      organizerId: 'organizer_fixture_001',
      decision: 'APPROVE',
      note: '人工核验主理人申请后明确通过',
      ...writeGuards(3, 'organizer_approve'),
    },
  ));
  assertSuccess(organizer);
  assert.equal(organizer.data.reviewCase.status, 'APPROVED');
  assert.equal(organizer.data.organizer.reviewStatus, 'APPROVED');
  assert.equal(organizer.data.organizer.verificationState, 'HUMAN_REVIEWED');
  assert.equal(organizer.data.organizer.summary, TEST_FIXTURE_CLASSIFICATION.evidenceKind);
  assert.notEqual(organizer.data.organizer.version, organizer.data.reviewCase.version);
  assert.equal(fixture.inspect.invalidations[0].kind, 'EVENT_CHANGED');
  assert.equal(fixture.inspect.invalidations[0].sourceAggregateId, organizer.data.organizer.organizerId);
  assert.equal(fixture.inspect.invalidations[0].sourceVersion, organizer.data.organizer.version);
  assert.deepEqual(fixture.inspect.mutationCalls[0].writableCollections, [
    'organizers', 'idempotency_keys', 'audit_logs', 'projection_invalidations',
  ]);
  assert.deepEqual(runtime.auditApprovedData({
    reviewCases: [organizer.data.reviewCase], reviewLogs: [fixture.inspect.reviewLogs[0]],
  }), { ok: true, missingReviewLogCaseIds: [] });
  assert.deepEqual(runtime.auditApprovedData({
    reviewCases: [organizer.data.reviewCase],
    reviewLogs: [Object.freeze({ ...fixture.inspect.reviewLogs[0], actorRole: 'REVIEWER' })],
  }), { ok: false, missingReviewLogCaseIds: ['case_organizer_approve'] });

  const event = await eventManager.main(adminEvent(
    'event.review',
    'req_event_approve_0001',
    {
      reviewCaseId: 'case_event_approve',
      eventId: 'event_fixture_001',
      decision: 'APPROVE',
      note: '人工核验活动发布材料后明确通过',
      ...writeGuards(3, 'event_approve'),
    },
  ));
  assertSuccess(event);
  assert.equal(event.data.reviewCase.status, 'APPROVED');
  assert.equal(event.data.event.state, 'PUBLISHED');
  assert.equal(event.data.event.publicationState, 'PUBLISHED');
  assert.equal(event.data.event.reservationAvailable, true);
  assert.equal(event.data.event.verificationState, 'HUMAN_REVIEWED');
  assert.notEqual(event.data.event.version, event.data.reviewCase.version);
  assert.equal(fixture.inspect.invalidations[1].kind, 'EVENT_CHANGED');
  assert.equal(fixture.inspect.invalidations[1].sourceAggregateId, event.data.event.eventId);
  assert.equal(fixture.inspect.invalidations[1].sourceVersion, event.data.event.version);
  assert.deepEqual(fixture.inspect.mutationCalls[1].writableCollections, [
    'events', 'idempotency_keys', 'audit_logs', 'projection_invalidations',
  ]);
  assert.deepEqual(runtime.auditApprovedData({
    reviewCases: [event.data.reviewCase], reviewLogs: [fixture.inspect.reviewLogs[1]],
  }), { ok: true, missingReviewLogCaseIds: [] });
  assert.deepEqual(runtime.auditApprovedData({
    reviewCases: [event.data.reviewCase],
    reviewLogs: [Object.freeze({ ...fixture.inspect.reviewLogs[1], actorRole: 'REVIEWER' })],
  }), { ok: false, missingReviewLogCaseIds: ['case_event_approve'] });

  const aggregateMismatch = await eventManager.main(adminEvent(
    'event.review',
    'req_event_target_mismatch_0001',
    {
      reviewCaseId: 'case_event_approve',
      eventId: 'event_fixture_different',
      decision: 'APPROVE',
      note: '不得跨案件目标操作',
      ...writeGuards(4, 'event_target_mismatch'),
    },
  ));
  assertFailure(aggregateMismatch, 'FORBIDDEN');
  assert.equal(aggregateMismatch.error.details.policy, 'ACTION_AGGREGATE_MISMATCH');

  const domainMismatch = await eventManager.main(adminEvent(
    'event.review',
    'req_event_domain_mismatch_0001',
    {
      reviewCaseId: 'case_organizer_approve',
      eventId: 'organizer_fixture_001',
      decision: 'APPROVE',
      note: '不得跨审核域操作',
      ...writeGuards(4, 'event_domain_mismatch'),
    },
  ));
  assertFailure(domainMismatch, 'FORBIDDEN');
  assert.equal(domainMismatch.error.details.policy, 'ACTION_DOMAIN_MISMATCH');
  assert.equal(fixture.inspect.reviewLogs.length, 2);
  assert.equal(fixture.inspect.invalidations.length, 2);
});

test('content approval requires approved media rights and rolls back every write when rights fail', async () => {
  const fixture = createAdminTestFixture(runtime);
  const endpoint = fixture.endpointFor('contentManager');
  const approved = await endpoint.main(adminEvent(
    'content.review',
    'req_content_approve_0001',
    {
      reviewCaseId: 'case_content_approve',
      contentId: 'content_fixture_approved_rights',
      decision: 'APPROVE',
      note: '人工确认内容发布与权利状态',
      ...writeGuards(3, 'content_approve'),
    },
  ));
  assertSuccess(approved);
  assert.equal(approved.data.reviewCase.status, 'APPROVED');
  assert.equal(approved.data.content.publicationState, 'PUBLISHED');
  assert.equal(approved.data.content.mediaRightsState, 'APPROVED');
  assert.equal(approved.data.content.verificationState, 'HUMAN_REVIEWED');
  assert.notEqual(approved.data.content.version, approved.data.reviewCase.version);
  assert.equal(fixture.inspect.invalidations[0].kind, 'CONTENT_CHANGED');
  assert.equal(fixture.inspect.invalidations[0].sourceAggregateId, approved.data.content.contentId);
  assert.equal(fixture.inspect.invalidations[0].sourceVersion, approved.data.content.version);
  assert.deepEqual(fixture.inspect.mutationCalls[0].writableCollections, [
    'art_items', 'art_collections', 'media_assets', 'idempotency_keys',
    'audit_logs', 'projection_invalidations',
  ]);
  assert.deepEqual(runtime.auditApprovedData({
    reviewCases: [approved.data.reviewCase], reviewLogs: [fixture.inspect.reviewLogs[0]],
  }), { ok: true, missingReviewLogCaseIds: [] });
  assert.deepEqual(runtime.auditApprovedData({
    reviewCases: [approved.data.reviewCase],
    reviewLogs: [Object.freeze({ ...fixture.inspect.reviewLogs[0], actorRole: 'REVIEWER' })],
  }), { ok: false, missingReviewLogCaseIds: ['case_content_approve'] });

  const beforeCounts = {
    calls: fixture.inspect.mutationCalls.length,
    logs: fixture.inspect.reviewLogs.length,
    invalidations: fixture.inspect.invalidations.length,
    idempotency: fixture.inspect.idempotency.size,
  };
  const denied = await endpoint.main(adminEvent(
    'content.review',
    'req_content_rights_denied_0001',
    {
      reviewCaseId: 'case_content_bad_rights',
      contentId: 'content_fixture_unverified_rights',
      decision: 'APPROVE',
      note: '未通过权利检查时不得发布',
      ...writeGuards(3, 'content_rights_denied'),
    },
  ));
  assertFailure(denied, 'MEDIA_RIGHTS_REQUIRED');
  assert.equal(fixture.inspect.reviewCases.get('case_content_bad_rights').status, 'UNDER_REVIEW');
  assert.deepEqual({
    calls: fixture.inspect.mutationCalls.length,
    logs: fixture.inspect.reviewLogs.length,
    invalidations: fixture.inspect.invalidations.length,
    idempotency: fixture.inspect.idempotency.size,
  }, beforeCounts);
});

test('report resolution is minimal, versioned, audited, idempotent and creates no projection invalidation', async () => {
  const fixture = createAdminTestFixture(runtime);
  const endpoint = fixture.endpointFor('reviewerA');
  const payload = {
    reportId: 'report_fixture_001',
    resolution: 'ACTION_TAKEN',
    note: '人工核验举报后采取最小处置',
    ...writeGuards(2, 'report_resolve'),
  };
  const first = await endpoint.main(adminEvent(
    'report.resolve', 'req_report_resolve_first_0001', payload,
  ));
  const replay = await endpoint.main(adminEvent(
    'report.resolve', 'req_report_resolve_replay_0001', payload,
  ));
  assertSuccess(first);
  assertSuccess(replay);
  assert.deepEqual(replay.data, first.data);
  assert.equal(first.data.report.status, 'RESOLVED');
  assert.equal(first.data.report.version, 3);
  assert.equal(fixture.inspect.audits.length, 1);
  assert.deepEqual({
    action: fixture.inspect.audits[0].action,
    targetType: fixture.inspect.audits[0].targetType,
    requestId: fixture.inspect.audits[0].requestId,
    result: fixture.inspect.audits[0].result,
    reasonCode: fixture.inspect.audits[0].reasonCode,
  }, {
    action: 'report.resolve',
    targetType: 'REPORT',
    requestId: 'req_report_resolve_first_0001',
    result: 'SUCCEEDED',
    reasonCode: 'ACTION_TAKEN',
  });
  assert.equal(fixture.inspect.invalidations.length, 0);
  assert.deepEqual(fixture.inspect.mutationCalls[0].writableCollections, [
    'blocks_reports', 'idempotency_keys', 'audit_logs',
  ]);
});

test('audit storage exposes append-only methods and client edit/delete actions are rejected', async () => {
  const fixture = createAdminTestFixture(runtime);
  assert.deepEqual(Object.keys(fixture.repository).sort(), [
    'listAuditEntries', 'listReports', 'listReviewCases', 'runTransaction',
  ]);
  const transactionMethods = await fixture.repository.runTransaction(async (transaction) => (
    Object.keys(transaction).sort()
  ));
  assert.deepEqual(transactionMethods, [
    'appendAudit', 'appendProjectionInvalidation', 'appendReviewLog', 'applyMutation',
    'completeIdempotency', 'getIdempotency', 'getOriginalApplicationSnapshot',
    'getReport', 'getReviewCase',
  ]);
  assert.equal(transactionMethods.some((name) => /update|delete|remove/i.test(name)), false);

  for (const action of ['audit.update', 'audit.delete']) {
    const result = await fixture.endpointFor('superAdmin').main(adminEvent(
      action, `req_forbidden_${action.replace('.', '_')}_0001`, { auditEntryId: 'audit_fixture_0001' },
    ));
    assertFailure(result, 'INVALID_REQUEST');
  }
});

test('malicious adapter projection fields and raw URL fields fail closed with full rollback', async () => {
  const attempts = [
    ['caseMutationEnvelope', 'reviewerA', 'review.approve', {
      reviewCaseId: 'case_social_approve',
      decisionNote: '恶意顶层 mutation envelope 必须被拒绝',
      ...writeGuards(3, 'adapter_leak_case_mutation_envelope'),
    }, 'case_social_approve'],
    ['reviewCase', 'reviewerA', 'review.approve', {
      reviewCaseId: 'case_social_approve',
      decisionNote: '人工动作，但恶意适配器结果必须被拒绝',
      ...writeGuards(3, 'adapter_leak_review_case'),
    }, 'case_social_approve'],
    ['approvedClaim', 'reviewerA', 'review.approve', {
      reviewCaseId: 'case_social_approve',
      decisionNote: '人工动作，但恶意 claim 结果必须被拒绝',
      ...writeGuards(3, 'adapter_leak_claim'),
    }, 'case_social_approve'],
    ['organizer', 'eventManager', 'organizer.review', {
      reviewCaseId: 'case_organizer_approve',
      organizerId: 'organizer_fixture_001',
      decision: 'APPROVE',
      note: '恶意主理人投影必须被拒绝',
      ...writeGuards(3, 'adapter_leak_organizer'),
    }, 'case_organizer_approve'],
    ['event', 'eventManager', 'event.review', {
      reviewCaseId: 'case_event_approve',
      eventId: 'event_fixture_001',
      decision: 'APPROVE',
      note: '恶意活动投影必须被拒绝',
      ...writeGuards(3, 'adapter_leak_event'),
    }, 'case_event_approve'],
    ['content', 'contentManager', 'content.review', {
      reviewCaseId: 'case_content_approve',
      contentId: 'content_fixture_approved_rights',
      decision: 'APPROVE',
      note: '恶意内容投影必须被拒绝',
      ...writeGuards(3, 'adapter_leak_content'),
    }, 'case_content_approve'],
    ['report', 'reviewerA', 'report.resolve', {
      reportId: 'report_fixture_001',
      resolution: 'ACTION_TAKEN',
      note: '恶意举报投影必须被拒绝',
      ...writeGuards(2, 'adapter_leak_report'),
    }, undefined],
    ['reportMutationEnvelope', 'reviewerA', 'report.resolve', {
      reportId: 'report_fixture_001',
      resolution: 'ACTION_TAKEN',
      note: '恶意举报 mutation envelope 必须被拒绝',
      ...writeGuards(2, 'adapter_leak_report_mutation_envelope'),
    }, undefined],
  ];

  for (const [adapterLeakTarget, actor, action, payload, reviewCaseId] of attempts) {
    const fixture = createAdminTestFixture(runtime, { adapterLeakTarget });
    const result = await fixture.endpointFor(actor).main(adminEvent(
      action,
      `req_adapter_leak_${adapterLeakTarget}_0001`,
      payload,
    ));
    assertFailure(result, 'INTERNAL_ERROR');
    assert.equal(JSON.stringify(result).includes(RAW_MATERIAL_URL_SENTINEL), false);
    if (reviewCaseId === undefined) {
      assert.equal(fixture.inspect.reports.get('report_fixture_001').status, 'OPEN');
    } else {
      assert.equal(fixture.inspect.reviewCases.get(reviewCaseId).status, 'UNDER_REVIEW');
    }
    assert.equal(fixture.inspect.reviewLogs.length, 0);
    assert.equal(fixture.inspect.invalidations.length, 0);
    assert.equal(fixture.inspect.idempotency.size, 0);
    assert.equal(fixture.inspect.mutationCalls.length, 0);
    assert.equal(fixture.inspect.publicClaims.size, 0);
  }
});

test('client text containing a raw material locator is rejected before any audit or mutation', async () => {
  const locators = [
    RAW_MATERIAL_URL_SENTINEL,
    'ftp://private.invalid/material',
    's3://private-bucket/material',
    'gs://private-bucket/material',
    'ipfs://private-cid/material',
    'blob:private-material',
    'data:application/octet-stream;base64,AAAA',
    '//private.invalid/material',
  ];
  for (const [index, locator] of locators.entries()) {
    const fixture = createAdminTestFixture(runtime);
    const result = await fixture.endpointFor('reviewerA').main(adminEvent(
      'review.approve',
      `req_raw_locator_payload_${String(index).padStart(2, '0')}_0001`,
      {
        reviewCaseId: 'case_social_approve',
        decisionNote: `请查看 ${locator}`,
        ...writeGuards(3, `raw_locator_payload_${index}`),
      },
    ));
    assertFailure(result, 'INVALID_REQUEST');
    assert.equal(result.error.details.field, 'decisionNote');
    assert.equal(result.error.details.reason, 'RAW_MATERIAL_LOCATOR_FORBIDDEN');
    assert.equal(JSON.stringify(result).includes(locator), false);
    assert.equal(fixture.inspect.mutationCalls.length, 0);
    assert.equal(fixture.inspect.reviewLogs.length, 0);

    const changesFixture = createAdminTestFixture(runtime);
    const changes = await changesFixture.endpointFor('reviewerA').main(adminEvent(
      'review.requestChanges',
      `req_raw_locator_changes_${String(index).padStart(2, '0')}_0001`,
      {
        reviewCaseId: 'case_social_changes',
        requiredChanges: [`请补充 ${locator}`],
        ...writeGuards(3, `raw_locator_changes_${index}`),
      },
    ));
    assertFailure(changes, 'INVALID_REQUEST');
    assert.equal(changes.error.details.field, 'requiredChanges');
    assert.equal(JSON.stringify(changes).includes(locator), false);
    assert.equal(changesFixture.inspect.mutationCalls.length, 0);
    assert.equal(changesFixture.inspect.reviewLogs.length, 0);
  }
});
