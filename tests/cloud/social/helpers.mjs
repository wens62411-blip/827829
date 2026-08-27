import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
export const root = fileURLToPath(new URL('../../..', import.meta.url));
export const socialRuntime = require(join(root, 'cloudfunctions', 'socialApi', 'index.js'));

assert.equal(typeof socialRuntime.createInMemorySocialRepository, 'function',
  'socialApi must export createInMemorySocialRepository(seed)');
assert.equal(typeof socialRuntime.createSocialApiEndpoint, 'function',
  'socialApi must export createSocialApiEndpoint(deps)');
assert.equal(typeof socialRuntime.auditPublicVerificationClaim, 'function',
  'socialApi must export auditPublicVerificationClaim(input)');

export const NOW = '2026-08-27T08:00:00Z';
export const LATER = '2026-08-27T09:00:00Z';

export const PRINCIPALS = Object.freeze({
  alice: Object.freeze({
    openId: 'openid_alice_1234567890',
    userId: 'user_alice_123456',
    roles: Object.freeze(['MEMBER']),
    accountState: 'ACTIVE',
  }),
  bob: Object.freeze({
    openId: 'openid_bob_123456789012',
    userId: 'user_bob_12345678',
    roles: Object.freeze(['MEMBER']),
    accountState: 'ACTIVE',
  }),
  carol: Object.freeze({
    openId: 'openid_carol_1234567890',
    userId: 'user_carol_123456',
    roles: Object.freeze(['MEMBER']),
    accountState: 'ACTIVE',
  }),
  disabled: Object.freeze({
    openId: 'openid_disabled_1234567',
    userId: 'user_disabled_1234',
    roles: Object.freeze(['MEMBER']),
    accountState: 'DISABLED',
  }),
  reviewer: Object.freeze({
    openId: 'openid_reviewer_1234567',
    userId: 'user_reviewer_1234',
    roles: Object.freeze(['REVIEWER']),
    accountState: 'ACTIVE',
  }),
});

export function versioned(extra, version = 1, createdAt = NOW, updatedAt = createdAt) {
  return { version, createdAt, updatedAt, ...extra };
}

export function publicCard(ownerKey, extra = {}) {
  const owner = PRINCIPALS[ownerKey];
  return versioned({
    _id: `card_${ownerKey}_123456`,
    cardId: `card_${ownerKey}_123456`,
    ownerUserId: owner.userId,
    displayName: `${ownerKey} synthetic profile`,
    headline: 'SYNTHETIC / DEMO_ONLY',
    cityId: ownerKey === 'bob' ? 'cn-shanghai' : 'cn-shenzhen',
    visibility: 'PUBLIC',
    claims: [],
    origin: 'SYNTHETIC',
    verificationState: 'NOT_APPLICABLE',
    ...extra,
  });
}

export const LABELS = Object.freeze({
  identity: versioned({
    _id: 'label_school_123456',
    labelId: 'label_school_123456',
    name: { zh: '学校成员（演示）', en: 'School member (demo)' },
    description: { zh: '仅使用合成材料', en: 'Synthetic evidence only' },
    category: 'PUBLIC_IDENTITY_TAG',
    enabled: true,
    publicEligible: true,
    maxEvidenceCount: 3,
    maxFileBytes: 2_000_000,
    allowedMediaTypes: ['IMAGE', 'DOCUMENT'],
  }),
  interest: versioned({
    _id: 'label_interest_123456',
    labelId: 'label_interest_123456',
    name: { zh: '艺术兴趣（演示）', en: 'Art interest (demo)' },
    description: { zh: '公开展示也需人工审核', en: 'Human review required for public display' },
    category: 'PUBLIC_INTEREST_TAG',
    enabled: true,
    publicEligible: true,
    maxEvidenceCount: 2,
    maxFileBytes: 1_000_000,
    allowedMediaTypes: ['IMAGE'],
  }),
  wealth: versioned({
    _id: 'label_wealth_123456',
    labelId: 'label_wealth_123456',
    name: { zh: '高风险财富标签（演示）', en: 'High-risk wealth label (demo)' },
    description: { zh: 'P0 禁止公开', en: 'Public display disabled in P0' },
    category: 'PUBLIC_IDENTITY_TAG',
    riskClass: 'WEALTH_ASSET_FAMILY',
    enabled: true,
    publicEligible: false,
    complianceGate: 'DISABLED',
    requiredHumanReviewCount: 2,
    maxEvidenceCount: 3,
    maxFileBytes: 2_000_000,
    allowedMediaTypes: ['DOCUMENT'],
  }),
  privatePreference: versioned({
    _id: 'label_private_123456',
    labelId: 'label_private_123456',
    name: { zh: '私密偏好', en: 'Private preference' },
    description: { zh: '不作为公开认证', en: 'Never a public verification' },
    category: 'PRIVATE_PREFERENCE',
    enabled: true,
    publicEligible: false,
    maxEvidenceCount: 0,
    maxFileBytes: 0,
    allowedMediaTypes: [],
  }),
  systemRole: versioned({
    _id: 'label_role_123456',
    labelId: 'label_role_123456',
    name: { zh: '内部角色', en: 'Internal role' },
    description: { zh: '平台权限，非个人荣誉', en: 'Platform authorization only' },
    category: 'SYSTEM_ROLE',
    enabled: true,
    publicEligible: false,
    maxEvidenceCount: 0,
    maxFileBytes: 0,
    allowedMediaTypes: [],
  }),
  disabled: versioned({
    _id: 'label_disabled_123456',
    labelId: 'label_disabled_123456',
    name: { zh: '已停用标签', en: 'Disabled label' },
    description: { zh: '不可申请', en: 'Not available' },
    category: 'PUBLIC_IDENTITY_TAG',
    enabled: false,
    publicEligible: false,
    maxEvidenceCount: 1,
    maxFileBytes: 100_000,
    allowedMediaTypes: ['IMAGE'],
  }),
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function baseSeed(extra = {}) {
  return {
    principals: Object.values(PRINCIPALS).map(clone),
    cards: ['alice', 'bob', 'carol'].map((key) => publicCard(key)),
    labels: Object.values(LABELS).map(clone),
    friendships: [],
    blocksReports: [],
    verificationRequests: [],
    mediaAssets: [],
    reviewLogs: [],
    verificationClaims: [],
    ...clone(extra),
  };
}

export function makeHarness(extraSeed = {}) {
  let currentTime = NOW;
  let callCounter = 0;
  const counters = new Map();
  const repository = socialRuntime.createInMemorySocialRepository(baseSeed(extraSeed));

  const createId = (prefix) => {
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);
    return `${prefix}_${String(next).padStart(8, '0')}`;
  };

  const endpointFor = (principalKey) => socialRuntime.createSocialApiEndpoint({
    repository,
    getWxContext: () => {
      if (principalKey === 'anonymous') return {};
      if (principalKey === 'spoofed') return { OPENID: 'not-a-known-openid-12345' };
      return { OPENID: PRINCIPALS[principalKey].openId };
    },
    now: () => currentTime,
    createId,
  });

  const endpoints = new Map();
  const endpoint = (principalKey) => {
    if (!endpoints.has(principalKey)) endpoints.set(principalKey, endpointFor(principalKey));
    return endpoints.get(principalKey);
  };

  return {
    repository,
    snapshot: () => repository.snapshot(),
    setNow: (instant) => { currentTime = instant; },
    as: (principalKey) => ({
      call: async (action, payload, requestId) => {
        callCounter += 1;
        const effectiveRequestId = requestId ??
          `request_${principalKey}_${action.replaceAll('.', '_')}_${String(callCounter).padStart(6, '0')}`;
        const result = await endpoint(principalKey).main({ action, requestId: effectiveRequestId, payload });
        assert.equal(result.requestId, effectiveRequestId, `${action} must echo the application requestId`);
        return result;
      },
    }),
  };
}

export function expectSuccess(result) {
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(typeof result.data, 'object');
  assert.notEqual(result.data, null);
  return result.data;
}

export function expectFailure(result, code) {
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.equal(result.error.code, code, JSON.stringify(result));
  assert.equal('data' in result, false);
  return result.error;
}

export function collection(snapshot, name) {
  const value = snapshot[name];
  assert.ok(Array.isArray(value), `snapshot().${name} must be an array`);
  return value;
}

export function byId(items, id) {
  return items.find((item) => item._id === id || item.friendshipId === id ||
    item.verificationRequestId === id || item.mediaAssetId === id || item.claimId === id);
}

export function idempotencyKey(label) {
  return `idem_${label.replaceAll(/[^A-Za-z0-9._:-]/g, '_')}_1234567890`;
}

export function assertNoSensitiveMaterial(value) {
  const serialized = JSON.stringify(value);
  for (const forbidden of [
    'storageFileId', 'originalUrl', 'downloadUrl', 'evidenceUrl', 'rawOcrText',
    'identityNumber', 'idCardNumber', 'reviewerOpenId',
  ]) {
    assert.equal(serialized.includes(forbidden), false, `response leaked ${forbidden}`);
  }
  assert.doesNotMatch(serialized, /cloud:\/\//i);
  assert.doesNotMatch(serialized, /https?:\/\/[^\"]*(?:evidence|identity|document)/i);
}
