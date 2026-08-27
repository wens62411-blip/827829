import assert from 'node:assert/strict';
import test from 'node:test';

import { loadAdminRuntime } from './runtime-loader.mjs';
import {
  ACTOR_OPEN_IDS,
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

function validPayload(action) {
  switch (action) {
    case 'admin.bootstrap':
      return { requestedScope: 'REVIEW' };
    case 'review.list':
      return { limit: 10 };
    case 'review.get':
      return { reviewCaseId: 'case_social_approve' };
    case 'review.approve':
      return { reviewCaseId: 'case_social_approve', decisionNote: '人工明确通过', ...writeGuards(3, 'auth_approve') };
    case 'review.reject':
      return {
        reviewCaseId: 'case_social_reject', reasonCode: 'EVIDENCE_MISMATCH',
        decisionNote: '人工明确拒绝', ...writeGuards(3, 'auth_reject'),
      };
    case 'review.requestChanges':
      return {
        reviewCaseId: 'case_social_changes', requiredChanges: ['请补充有效证明'],
        ...writeGuards(3, 'auth_changes'),
      };
    case 'review.revoke':
      return { reviewCaseId: 'case_social_revoke', reasonCode: 'RIGHTS_REVOKED', ...writeGuards(3, 'auth_revoke') };
    case 'organizer.review':
      return {
        reviewCaseId: 'case_organizer_approve', organizerId: 'organizer_fixture_001',
        decision: 'APPROVE', note: '人工审核主理人通过', ...writeGuards(3, 'auth_organizer'),
      };
    case 'event.review':
      return {
        reviewCaseId: 'case_event_approve', eventId: 'event_fixture_001',
        decision: 'APPROVE', note: '人工审核活动通过', ...writeGuards(3, 'auth_event'),
      };
    case 'content.review':
      return {
        reviewCaseId: 'case_content_approve', contentId: 'content_fixture_approved_rights',
        decision: 'APPROVE', note: '人工确认内容与权利', ...writeGuards(3, 'auth_content'),
      };
    case 'report.list':
      return { limit: 10 };
    case 'report.resolve':
      return {
        reportId: 'report_fixture_001', resolution: 'ACTION_TAKEN', note: '人工处理举报',
        ...writeGuards(2, 'auth_report'),
      };
    case 'audit.list':
      return { limit: 10 };
    default:
      throw new Error(`No test payload for ${action}`);
  }
}

test('ordinary callers and missing trusted context are denied for every frozen admin action', async () => {
  const fixture = createAdminTestFixture(runtime);
  const ordinary = fixture.endpointFor('ordinary');
  const noContext = fixture.endpointFor('reviewerA', { missingTrustedContext: true });

  for (const [index, action] of runtime.ACTIONS.entries()) {
    const payload = validPayload(action);
    const ordinaryResult = await ordinary.main(adminEvent(
      action,
      `req_ordinary_${String(index).padStart(2, '0')}_0001`,
      payload,
    ));
    assertFailure(ordinaryResult, 'FORBIDDEN');
    assert.equal(ordinaryResult.error.details.policy, 'ADMIN_ALLOWLIST_REQUIRED');

    const noContextResult = await noContext.main(adminEvent(
      action,
      `req_no_context_${String(index).padStart(2, '0')}_0001`,
      payload,
    ));
    assertFailure(noContextResult, 'AUTH_REQUIRED');
  }

  assert.equal(fixture.inspect.mutationCalls.length, 0);
  assert.equal(fixture.inspect.reviewLogs.length, 0);
  assert.equal(fixture.inspect.invalidations.length, 0);
});

test('client-controlled isAdmin, role, reviewerId and openid never elevate authority', async () => {
  const fixture = createAdminTestFixture(runtime);
  const ordinary = fixture.endpointFor('ordinary');
  const reviewer = fixture.endpointFor('reviewerA');
  const base = validPayload('review.approve');

  for (const [field, value] of [
    ['isAdmin', true],
    ['role', 'SUPER_ADMIN'],
    ['reviewerId', 'user_superAdmin'],
    ['openid', ACTOR_OPEN_IDS.superAdmin],
  ]) {
    const ordinaryResult = await ordinary.main(adminEvent(
      'review.approve',
      `req_forge_ordinary_${field}_0001`,
      { ...base, [field]: value },
    ));
    assertFailure(ordinaryResult, 'INVALID_REQUEST');
    assert.equal(ordinaryResult.error.details.field, field);

    const reviewerResult = await reviewer.main(adminEvent(
      'review.approve',
      `req_forge_reviewer_${field}_0001`,
      { ...base, [field]: value },
    ));
    assertFailure(reviewerResult, 'INVALID_REQUEST');
    assert.equal(reviewerResult.error.details.field, field);
  }

  const envelopeForgery = await ordinary.main(adminEvent(
    'admin.bootstrap',
    'req_forge_envelope_openid_0001',
    { requestedScope: 'REVIEW' },
    { openid: ACTOR_OPEN_IDS.superAdmin },
  ));
  assertFailure(envelopeForgery, 'INVALID_REQUEST');
  assert.equal(envelopeForgery.error.details.field, 'openid');
  assert.equal(fixture.inspect.mutationCalls.length, 0);
});

test('server-side bootstrap scopes and RBAC matrix grant only the intended queues and actions', async () => {
  const fixture = createAdminTestFixture(runtime);
  const roles = runtime.AdminRole;

  assert.deepEqual(runtime.ADMIN_RBAC_MATRIX, {
    'admin.bootstrap': [roles.REVIEWER, roles.EVENT_MANAGER, roles.CONTENT_MANAGER, roles.SUPER_ADMIN],
    'review.list': [roles.REVIEWER, roles.EVENT_MANAGER, roles.CONTENT_MANAGER, roles.SUPER_ADMIN],
    'review.get': [roles.REVIEWER, roles.EVENT_MANAGER, roles.CONTENT_MANAGER, roles.SUPER_ADMIN],
    'review.approve': [roles.REVIEWER, roles.SUPER_ADMIN],
    'review.reject': [roles.REVIEWER, roles.SUPER_ADMIN],
    'review.requestChanges': [roles.REVIEWER, roles.SUPER_ADMIN],
    'review.revoke': [roles.REVIEWER, roles.SUPER_ADMIN],
    'organizer.review': [roles.EVENT_MANAGER, roles.SUPER_ADMIN],
    'event.review': [roles.EVENT_MANAGER, roles.SUPER_ADMIN],
    'content.review': [roles.CONTENT_MANAGER, roles.SUPER_ADMIN],
    'report.list': [roles.REVIEWER, roles.SUPER_ADMIN],
    'report.resolve': [roles.REVIEWER, roles.SUPER_ADMIN],
    'audit.list': [roles.SUPER_ADMIN],
  });

  const cases = [
    ['reviewerA', 'REVIEW', ['SOCIAL', 'REPORT'], ['REVIEWER']],
    ['eventManager', 'OPERATIONS', ['EVENT', 'ORGANIZER'], ['ADMIN']],
    ['contentManager', 'OPERATIONS', ['CONTENT'], ['ADMIN']],
    ['superAdmin', 'AUDIT', ['SOCIAL', 'EVENT', 'CONTENT', 'ORGANIZER', 'REPORT'], ['ADMIN']],
  ];
  for (const [actor, requestedScope, queues, sessionRoles] of cases) {
    const result = await fixture.endpointFor(actor).main(adminEvent(
      'admin.bootstrap',
      `req_bootstrap_${actor}_0001`,
      { requestedScope },
    ));
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.deepEqual(result.data.availableQueues, queues);
    assert.deepEqual(result.data.session.roles, sessionRoles);
    assert.equal(result.data.session.userId, `user_${actor}`);
  }

  const wrongScope = await fixture.endpointFor('reviewerA').main(adminEvent(
    'admin.bootstrap', 'req_wrong_scope_0001', { requestedScope: 'AUDIT' },
  ));
  assertFailure(wrongScope, 'FORBIDDEN');
  assert.equal(wrongScope.error.details.policy, 'ADMIN_SCOPE_DENIED');

  const deniedCalls = [
    ['reviewerA', 'content.review', validPayload('content.review')],
    ['eventManager', 'report.list', validPayload('report.list')],
    ['contentManager', 'event.review', validPayload('event.review')],
    ['reviewerA', 'audit.list', validPayload('audit.list')],
  ];
  for (const [actor, action, payload] of deniedCalls) {
    const result = await fixture.endpointFor(actor).main(adminEvent(
      action, `req_wrong_role_${actor}_${action.replace('.', '_')}`, payload,
    ));
    assertFailure(result, 'FORBIDDEN');
    assert.equal(result.error.details.policy, 'ADMIN_ACTION_DENIED');
  }

  const wrongDomain = await fixture.endpointFor('eventManager').main(adminEvent(
    'review.get', 'req_wrong_domain_event_manager_0001', { reviewCaseId: 'case_social_approve' },
  ));
  assertFailure(wrongDomain, 'FORBIDDEN');
  assert.equal(wrongDomain.error.details.policy, 'ADMIN_QUEUE_DENIED');
});

test('disabled and non-allowlisted server principals fail closed', async () => {
  const fixture = createAdminTestFixture(runtime);
  for (const [actor, policy] of [
    ['disabledReviewer', 'ACTIVE_ADMIN_ACCOUNT_REQUIRED'],
    ['notAllowlisted', 'ADMIN_ALLOWLIST_REQUIRED'],
  ]) {
    const result = await fixture.endpointFor(actor).main(adminEvent(
      'admin.bootstrap', `req_principal_state_${actor}_0001`, { requestedScope: 'REVIEW' },
    ));
    assertFailure(result, 'FORBIDDEN');
    assert.equal(result.error.details.policy, policy);
  }
});

test('malformed server grants fail closed and cannot coerce allowlist or roles', async () => {
  const fixture = createAdminTestFixture(runtime);
  const validPrincipal = {
    openId: ACTOR_OPEN_IDS.reviewerA,
    userId: 'user_reviewerA',
    roles: ['REVIEWER'],
    accountState: 'ACTIVE',
    allowlisted: true,
    expiresAt: '2099-01-01T00:00:00.000Z',
  };
  const attempts = [
    [{ ...validPrincipal, allowlisted: 'false' }, 'FORBIDDEN', 'ADMIN_ALLOWLIST_REQUIRED'],
    [{ ...validPrincipal, expiresAt: 'not-an-instant' }, 'FORBIDDEN', 'MALFORMED_ADMIN_GRANT'],
    [{ ...validPrincipal, expiresAt: '2098-09-31T00:00:00.000Z' }, 'FORBIDDEN', 'MALFORMED_ADMIN_GRANT'],
    [{ ...validPrincipal, roles: ['REVIEWER', 'FORGED_SUPER_ROLE'] }, 'FORBIDDEN', 'SERVER_ASSIGNED_ADMIN_ROLE_REQUIRED'],
    [{ ...validPrincipal, privateMaterialUrl: 'https://private.invalid/forged-principal' }, 'FORBIDDEN', 'MALFORMED_ADMIN_GRANT'],
    [{ ...validPrincipal, openId: ACTOR_OPEN_IDS.superAdmin }, 'AUTH_REQUIRED', undefined],
  ];

  for (const [index, [principalOverride, code, policy]] of attempts.entries()) {
    const result = await fixture.endpointFor('reviewerA', { principalOverride }).main(adminEvent(
      'admin.bootstrap', `req_malformed_grant_${String(index).padStart(2, '0')}_0001`,
      { requestedScope: 'REVIEW' },
    ));
    assertFailure(result, code);
    if (policy !== undefined) assert.equal(result.error.details.policy, policy);
  }
  assert.equal(fixture.inspect.mutationCalls.length, 0);
});

test('audit list rejects impossible UTC calendar filters before repository access', async () => {
  const fixture = createAdminTestFixture(runtime);
  const result = await fixture.endpointFor('superAdmin').main(adminEvent(
    'audit.list',
    'req_audit_invalid_calendar_0001',
    { limit: 10, occurredAfter: '2026-09-31T00:00:00.000Z' },
  ));
  assertFailure(result, 'INVALID_REQUEST');
  assert.equal(result.error.details.field, 'occurredAfter');
  assert.equal(result.error.details.reason, 'RFC3339_UTC_REQUIRED');
  assert.equal(fixture.inspect.mutationCalls.length, 0);
});
