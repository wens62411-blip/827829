import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LABELS,
  NOW,
  PRINCIPALS,
  socialRuntime,
  versioned,
} from './helpers.mjs';

const VALID_FROM = '2026-01-01T00:00:00Z';
const VALID_UNTIL = '2027-01-01T00:00:00Z';

function approvedClaim(label = LABELS.identity, extra = {}) {
  return versioned({
    _id: 'claim_school_approved_123456',
    claimId: 'claim_school_approved_123456',
    verificationRequestId: 'verification_alice_school_approved',
    subjectUserId: PRINCIPALS.alice.userId,
    labelId: label._id,
    reviewStatus: 'APPROVED',
    verificationState: 'HUMAN_REVIEWED',
    publicVisible: true,
    userSelectedPublic: true,
    reviewedBy: PRINCIPALS.reviewer.userId,
    reviewedAt: '2026-08-20T08:00:00Z',
    reviewScope: label.category,
    reviewLogId: 'review_log_school_123456',
    validFrom: VALID_FROM,
    validUntil: VALID_UNTIL,
    ...extra,
  }, 4, '2026-08-19T08:00:00Z', '2026-08-20T08:00:00Z');
}

function validReviewLog(claim, extra = {}) {
  return versioned({
    _id: claim.reviewLogId ?? 'review_log_school_123456',
    reviewLogId: claim.reviewLogId ?? 'review_log_school_123456',
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
    ...extra,
  }, 1, claim.reviewedAt, claim.reviewedAt);
}

function audit(claim, label = LABELS.identity, reviewLogs = [validReviewLog(claim)], evaluatedAt = NOW) {
  return socialRuntime.auditPublicVerificationClaim({ claim, label, reviewLogs, evaluatedAt });
}

function expectIneligible(result, reason) {
  assert.equal(result.eligible, false, JSON.stringify(result));
  assert.ok(Array.isArray(result.reasons));
  assert.ok(result.reasons.includes(reason), JSON.stringify(result));
  assert.equal(result.projection, undefined);
}

test('an approved claim becomes public only with a matching successful human ReviewLog and exact redacted projection', () => {
  const claim = approvedClaim();
  const result = audit(claim);
  assert.equal(result.eligible, true, JSON.stringify(result));
  assert.deepEqual(result.reasons, []);
  assert.deepEqual(result.projection, {
    version: 4,
    createdAt: '2026-08-19T08:00:00Z',
    updatedAt: '2026-08-20T08:00:00Z',
    claimId: claim.claimId,
    subjectUserId: claim.subjectUserId,
    labelId: LABELS.identity._id,
    labelText: LABELS.identity.name,
    reviewStatus: 'APPROVED',
    verificationState: 'HUMAN_REVIEWED',
    publicVisible: true,
    validFrom: VALID_FROM,
    validUntil: VALID_UNTIL,
  });
  assert.equal(Object.isFrozen(result.projection), true);
  const serialized = JSON.stringify(result.projection);
  for (const forbidden of [
    'reviewedBy', 'reviewedAt', 'reviewScope', 'reviewLogId', 'verificationRequestId',
    'evidenceAssetIds', 'reviewerNote', 'storageFileId', 'cloudPath', 'aiCheck',
  ]) {
    assert.equal(serialized.includes(forbidden), false, `public projection leaked ${forbidden}`);
  }
});

test('APPROVED without ReviewLog is rejected by both audit result and projection creation', () => {
  const claim = approvedClaim();
  expectIneligible(audit(claim, LABELS.identity, []), 'MISSING_REVIEW_LOG');
});

test('reviewedBy, reviewedAt and reviewScope are independently mandatory', () => {
  for (const [field, reason] of [
    ['reviewedBy', 'REVIEWED_BY_REQUIRED'],
    ['reviewedAt', 'REVIEWED_AT_REQUIRED'],
    ['reviewScope', 'REVIEW_SCOPE_REQUIRED'],
  ]) {
    const claim = approvedClaim();
    delete claim[field];
    const log = validReviewLog(approvedClaim());
    expectIneligible(audit(claim, LABELS.identity, [log]), reason);
  }
});

test('AI/OCR output cannot substitute for human approval regardless of confidence', () => {
  const claim = approvedClaim(LABELS.identity, {
    reviewStatus: 'SUBMITTED',
    verificationState: 'AI_CONSISTENCY_CHECKED',
    publicVisible: false,
    reviewedBy: undefined,
    reviewedAt: undefined,
    reviewScope: undefined,
    reviewLogId: undefined,
    aiCheck: {
      provider: 'DEMO_ONLY',
      ocrResult: 'CONSISTENT',
      confidence: 1,
      checkedAt: NOW,
    },
  });
  const result = audit(claim, LABELS.identity, [{
    _id: 'ai_log_123456',
    source: 'AI',
    confidence: 1,
    decision: 'APPROVED',
  }]);
  expectIneligible(result, 'REVIEW_STATUS_NOT_APPROVED');
  assert.ok(result.reasons.includes('HUMAN_REVIEW_REQUIRED'));
});

test('mismatched, failed, AI-authored or wrong-scope review logs cannot validate a claim', () => {
  const claim = approvedClaim();
  const cases = [
    [validReviewLog(claim, { claimId: 'claim_other_123456' }), 'REVIEW_LOG_MISMATCH'],
    [validReviewLog(claim, { reviewedBy: PRINCIPALS.alice.userId }), 'REVIEW_LOG_MISMATCH'],
    [validReviewLog(claim, { reviewedAt: '2026-08-21T08:00:00Z' }), 'REVIEW_LOG_MISMATCH'],
    [validReviewLog(claim, { reviewScope: 'PUBLIC_INTEREST_TAG' }), 'REVIEW_LOG_MISMATCH'],
    [validReviewLog(claim, { result: 'FAILED' }), 'VALID_REVIEW_LOG_REQUIRED'],
    [validReviewLog(claim, { source: 'AI' }), 'HUMAN_REVIEW_REQUIRED'],
    [validReviewLog(claim, { actorRole: 'MEMBER' }), 'HUMAN_REVIEW_REQUIRED'],
  ];
  for (const [reviewLog, reason] of cases) {
    expectIneligible(audit(claim, LABELS.identity, [reviewLog]), reason);
  }
});

test('claim label, review scope and review time must match the catalog and evaluation instant', () => {
  {
    const claim = approvedClaim(LABELS.identity, { labelId: LABELS.interest._id });
    expectIneligible(audit(claim, LABELS.identity, [validReviewLog(claim)]), 'LABEL_MISMATCH');
  }
  {
    const claim = approvedClaim(LABELS.identity, { reviewScope: 'PUBLIC_INTEREST_TAG' });
    expectIneligible(audit(claim, LABELS.identity, [validReviewLog(claim)]), 'REVIEW_SCOPE_MISMATCH');
  }
  {
    const claim = approvedClaim(LABELS.identity, { reviewedAt: '2026-08-28T08:00:00Z' });
    expectIneligible(audit(claim, LABELS.identity, [validReviewLog(claim)]), 'REVIEWED_AT_IN_FUTURE');
  }
  {
    const claim = approvedClaim(LABELS.identity, { reviewedAt: 'not-a-time' });
    expectIneligible(audit(claim, LABELS.identity, [validReviewLog(claim)]), 'REVIEWED_AT_INVALID');
  }
  {
    const claim = approvedClaim(LABELS.identity, { validFrom: 'not-a-time' });
    expectIneligible(audit(claim, LABELS.identity, [validReviewLog(claim)]), 'CLAIM_VALID_FROM_INVALID');
  }
  {
    const claim = approvedClaim(LABELS.identity, { validUntil: 'not-a-time' });
    expectIneligible(audit(claim, LABELS.identity, [validReviewLog(claim)]), 'CLAIM_VALID_UNTIL_INVALID');
  }
  {
    const claim = approvedClaim(LABELS.identity, {
      validFrom: '2026-08-26T08:00:00Z',
      validUntil: '2026-08-26T08:00:00Z',
    });
    expectIneligible(audit(claim, LABELS.identity, [validReviewLog(claim)]), 'CLAIM_VALIDITY_RANGE_INVALID');
  }
});

test('user public opt-in, catalog enablement, category and P0 publicEligible are all fail-closed gates', () => {
  {
    const claim = approvedClaim(LABELS.identity, { userSelectedPublic: false });
    expectIneligible(audit(claim), 'USER_PUBLIC_OPT_IN_REQUIRED');
  }
  {
    const label = { ...LABELS.identity, enabled: false };
    const claim = approvedClaim(label, { labelId: label._id });
    expectIneligible(audit(claim, label, [validReviewLog(claim)]), 'LABEL_DISABLED');
  }
  {
    const claim = approvedClaim(LABELS.privatePreference, {
      labelId: LABELS.privatePreference._id,
      reviewScope: 'PRIVATE_PREFERENCE',
    });
    expectIneligible(
      audit(claim, LABELS.privatePreference, [validReviewLog(claim)]),
      'LABEL_CATEGORY_NOT_PUBLIC',
    );
  }
  {
    const claim = approvedClaim(LABELS.systemRole, {
      labelId: LABELS.systemRole._id,
      reviewScope: 'SYSTEM_ROLE',
    });
    expectIneligible(
      audit(claim, LABELS.systemRole, [validReviewLog(claim)]),
      'LABEL_CATEGORY_NOT_PUBLIC',
    );
  }
});

test('wealth/asset/family labels remain non-public in P0 even after two apparently valid human reviews', () => {
  const claim = approvedClaim(LABELS.wealth, {
    _id: 'claim_wealth_approved_123456',
    claimId: 'claim_wealth_approved_123456',
    labelId: LABELS.wealth._id,
    reviewScope: 'PUBLIC_IDENTITY_TAG',
    reviewLogId: 'review_log_wealth_1_123456',
  });
  const first = validReviewLog(claim);
  const second = validReviewLog({
    ...claim,
    reviewLogId: 'review_log_wealth_2_123456',
    reviewedBy: 'user_reviewer_two_123456',
  });
  const result = audit(claim, LABELS.wealth, [first, second]);
  expectIneligible(result, 'LABEL_NOT_PUBLIC_ELIGIBLE');
  assert.ok(result.reasons.includes('COMPLIANCE_GATE_DISABLED'));
});

test('a future high-risk switch still cannot publish after one ordinary review', () => {
  const futureLikeLabel = {
    ...LABELS.wealth,
    publicEligible: true,
    complianceGate: 'ENABLED',
    requiredHumanReviewCount: 2,
  };
  const claim = approvedClaim(futureLikeLabel, {
    _id: 'claim_wealth_future_gate_123456',
    claimId: 'claim_wealth_future_gate_123456',
    labelId: futureLikeLabel._id,
    reviewScope: 'PUBLIC_IDENTITY_TAG',
    reviewLogId: 'review_log_wealth_future_1_123456',
  });
  expectIneligible(
    audit(claim, futureLikeLabel, [validReviewLog(claim)]),
    'DUAL_HUMAN_REVIEW_REQUIRED',
  );
});

test('future high-risk eligibility requires its independent switch and two distinct human reviewers', () => {
  const futureLikeLabel = {
    ...LABELS.wealth,
    publicEligible: true,
    complianceGate: 'ENABLED',
    requiredHumanReviewCount: 2,
  };
  const claim = approvedClaim(futureLikeLabel, {
    _id: 'claim_wealth_future_dual_123456',
    claimId: 'claim_wealth_future_dual_123456',
    labelId: futureLikeLabel._id,
    reviewScope: 'PUBLIC_IDENTITY_TAG',
    reviewLogId: 'review_log_wealth_future_dual_1_123456',
  });
  const secondReview = validReviewLog({
    ...claim,
    reviewLogId: 'review_log_wealth_future_dual_2_123456',
    reviewedBy: 'user_reviewer_two_123456',
  });
  const result = audit(claim, futureLikeLabel, [validReviewLog(claim), secondReview]);
  assert.equal(result.eligible, true, JSON.stringify(result));
});

test('expired, revoked, future-dated and publicVisible=false claims never project', () => {
  {
    const claim = approvedClaim(LABELS.identity, { validUntil: '2026-08-27T07:59:59Z' });
    expectIneligible(audit(claim), 'CLAIM_EXPIRED');
  }
  {
    const claim = approvedClaim(LABELS.identity, { validFrom: '2026-08-28T00:00:00Z' });
    expectIneligible(audit(claim), 'CLAIM_NOT_YET_VALID');
  }
  {
    const claim = approvedClaim(LABELS.identity, {
      reviewStatus: 'REVOKED',
      publicVisible: false,
      revokedAt: '2026-08-26T08:00:00Z',
    });
    expectIneligible(audit(claim), 'CLAIM_REVOKED');
  }
  {
    const claim = approvedClaim(LABELS.identity, { publicVisible: false });
    expectIneligible(audit(claim), 'PUBLIC_VISIBILITY_DISABLED');
  }
});

test('a human-reviewed public interest tag still requires the same full audit chain', () => {
  const claim = approvedClaim(LABELS.interest, {
    _id: 'claim_interest_approved_123456',
    claimId: 'claim_interest_approved_123456',
    labelId: LABELS.interest._id,
    reviewScope: 'PUBLIC_INTEREST_TAG',
    reviewLogId: 'review_log_interest_123456',
  });
  const result = audit(claim, LABELS.interest, [validReviewLog(claim)]);
  assert.equal(result.eligible, true, JSON.stringify(result));
  assert.equal(result.projection.labelId, LABELS.interest._id);
  assert.deepEqual(result.projection.labelText, LABELS.interest.name);
});
