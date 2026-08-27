import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../..', import.meta.url));
const seed = JSON.parse(readFileSync(join(root, 'database', 'seeds', 'art-demo.json'), 'utf8'));

async function loadTypeScriptModule(entry) {
  const result = await build({
    absWorkingDir: root,
    entryPoints: [entry],
    bundle: true,
    write: false,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    logLevel: 'silent',
  });
  const output = result.outputFiles?.[0];
  assert.ok(output, 'esbuild should produce one in-memory bundle');
  const module = { exports: {} };
  const filename = join(root, entry);
  const evaluate = new Function('require', 'module', 'exports', '__filename', '__dirname', output.text);
  evaluate(require, module, module.exports, filename, dirname(filename));
  return module.exports;
}

const contentRuntime = await loadTypeScriptModule('cloudfunctions/contentApi/index.ts');
const { createContentApiEndpoint } = contentRuntime;

const now = '2026-08-27T10:00:00Z';

function publicEvent(overrides = {}) {
  return {
    version: 1,
    createdAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-24T00:00:00Z',
    eventId: 'event_demo_shenzhen',
    clubNodeId: 'club_node_demo_sz',
    organizerId: 'organizer_demo_sz',
    cityId: 'cn-shenzhen',
    title: '艺术线下交流（测试活动）',
    summary: '脱敏活动投影。',
    startsAt: '2026-09-01T10:00:00Z',
    endsAt: '2026-09-01T12:00:00Z',
    timezone: 'Asia/Shanghai',
    state: 'PUBLISHED',
    publicationState: 'PUBLISHED',
    reservationAvailable: true,
    origin: 'SYNTHETIC',
    verificationState: 'NOT_APPLICABLE',
    ...overrides,
  };
}

function readableEvent(projection, overrides = {}) {
  return {
    projection,
    readState: {
      projectionType: 'PublicEventProjection',
      dirty: false,
      projectedSourceVersion: 1,
      requiredSourceVersion: 1,
      sourceAllowsRead: true,
      ...overrides,
    },
  };
}

function makeHarness(options = {}) {
  const contents = structuredClone(options.contents ?? seed.artItems);
  const collections = structuredClone(options.collections ?? seed.artCollections);
  const creators = structuredClone(seed.creators);
  const events = structuredClone(options.events ?? [
    readableEvent(publicEvent()),
    readableEvent(publicEvent({
      eventId: 'event_demo_cancelled',
      state: 'CANCELLED',
      publicationState: 'UNPUBLISHED',
      reservationAvailable: false,
    })),
  ]);
  const intents = new Map();
  const idempotency = new Map();
  const audits = [];
  let activeUser = options.activeUser ?? 'user_trusted_alice';
  let idCounter = 0;
  let transactionRuns = 0;

  const clone = (value) => value === null ? null : structuredClone(value);
  const dependencies = {
    getWxContext: () => ({ OPENID: activeUser === null ? undefined : `trusted_openid_${activeUser}_123456` }),
    loadPrincipal: async (openId) => {
      if (activeUser === null || !openId.includes(activeUser)) return null;
      return { openId, userId: activeUser, roles: ['MEMBER'], accountState: 'ACTIVE' };
    },
    reads: {
      listContentRecords: async () => clone(contents),
      getContentRecord: async (contentId) => clone(contents.find((item) => item._id === contentId) ?? null),
      listCollectionRecords: async () => clone(collections),
      getCreatorRecord: async (creatorId) => clone(creators.find((creator) => creator._id === creatorId) ?? null),
      getRelatedEventCandidates: async (eventIds) => clone(events.filter((candidate) => eventIds.includes(candidate.projection.eventId))),
    },
    intents: {
      runTransaction: async (operation) => {
        transactionRuns += 1;
        const stagedIntents = new Map([...intents].map(([key, value]) => [key, clone(value)]));
        const stagedIdempotency = new Map([...idempotency].map(([key, value]) => [key, clone(value)]));
        const stagedAudits = clone(audits);
        const transaction = {
          getContentRecord: async (contentId) => clone(contents.find((item) => item._id === contentId) ?? null),
          getIntentById: async (intentId) => clone(stagedIntents.get(intentId) ?? null),
          getIntentByUserContent: async (userId, contentId) => clone(
            [...stagedIntents.values()].find((intent) => intent.userId === userId && intent.contentId === contentId) ?? null,
          ),
          putIntent: async (intent) => { stagedIntents.set(intent._id, clone(intent)); },
          getIdempotency: async (namespace) => clone(stagedIdempotency.get(namespace) ?? null),
          putIdempotency: async (record) => { stagedIdempotency.set(record.namespace, clone(record)); },
          appendAudit: async (entry) => {
            if (options.failAudit === true) throw new Error('audit write failed');
            stagedAudits.push(clone(entry));
          },
        };
        const result = await operation(transaction);
        intents.clear();
        stagedIntents.forEach((value, key) => intents.set(key, value));
        idempotency.clear();
        stagedIdempotency.forEach((value, key) => idempotency.set(key, value));
        audits.splice(0, audits.length, ...stagedAudits);
        return result;
      },
    },
    now: () => now,
    newId: (kind) => `${kind.replaceAll('-', '_')}_${++idCounter}_123456`,
  };
  return {
    endpoint: createContentApiEndpoint(dependencies),
    contents,
    intents,
    idempotency,
    audits,
    setActiveUser: (userId) => { activeUser = userId; },
    transactionRuns: () => transactionRuns,
  };
}

function call(endpoint, action, payload, suffix = 'default') {
  return endpoint.main({ action, requestId: `req_content_${suffix}_123456`, payload });
}

const cityIds = new Set([
  'cn-beijing', 'cn-shanghai', 'cn-guangzhou', 'cn-shenzhen', 'cn-hangzhou',
  'ch-zurich', 'it-milan', 'fr-paris', 'au-melbourne', 'au-sydney',
  'sg-singapore', 'ca-toronto', 'ca-vancouver',
]);
const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const isUtc = (value) => isText(value) && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
const isHttps = (value) => {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
};

function isClientCompatibleContent(item) {
  if (!item || item.publicationState !== 'PUBLISHED' || item.recordOrigin !== item.origin) return false;
  if (!['REAL', 'SYNTHETIC'].includes(item.recordOrigin)) return false;
  if (!['PUBLIC', 'DEMO_ONLY'].includes(item.evidenceScope)) return false;
  if (item.evidenceScope === 'DEMO_ONLY' && item.recordOrigin !== 'SYNTHETIC') return false;
  if (item.rightsStatus !== item.mediaRightsState) return false;
  if (![item.sourceTitle, item.rightsSummary, item.alt, item.creatorDisplayName].every(isText)) return false;
  if (!isHttps(item.sourceUrl) || !isUtc(item.reviewedAt) || !cityIds.has(item.cityId)) return false;
  if (item.category === 'ART') {
    if (!item.artwork || item.antique || item.jewelry) return false;
    if (!['author', 'workTitle', 'year', 'medium', 'dimensions', 'edition', 'exhibitionHistory', 'provenanceInformation']
      .every((key) => isText(item.artwork[key]))) return false;
  } else if (item.category === 'ANTIQUE') {
    if (!item.antique || item.artwork || item.jewelry) return false;
    if (!['periodRange', 'objectType', 'knownProvenance', 'conditionStatement', 'thirdPartyReportReference']
      .every((key) => isText(item.antique[key]))) return false;
  } else if (item.category === 'JEWELRY') {
    if (!item.jewelry || item.artwork || item.antique) return false;
    if (!['PEARL', 'GEMSTONE', 'METALWORK', 'OTHER'].includes(item.jewelry.jewelryKind)) return false;
    if (!['materialStatement', 'gemstoneOrPearlInformation', 'dimensions', 'reportReference', 'displayAuthorization']
      .every((key) => isText(item.jewelry[key]))) return false;
  } else return false;
  if (item.image !== undefined) {
    if (!['mediaAssetId', 'url', 'sourceUrl', 'license', 'rightsHolder', 'sha256', 'alt']
      .every((key) => isText(item.image[key]))) return false;
    if (!isHttps(item.image.url) || !isHttps(item.image.sourceUrl)) return false;
    if (!/^[a-f0-9]{64}$/.test(item.image.sha256) || !Array.isArray(item.image.permittedUses)) return false;
    if (!isUtc(item.image.rightsReviewedAt) || item.rightsReviewedAt !== item.image.rightsReviewedAt) return false;
  }
  return true;
}

function isClientCompatibleCollection(collection) {
  return collection?.publicationState === 'PUBLISHED'
    && Array.isArray(collection.categories) && collection.categories.length > 0
    && new Set(collection.categories).size === collection.categories.length
    && collection.recordOrigin === 'SYNTHETIC' && collection.evidenceScope === 'DEMO_ONLY'
    && isText(collection.sourceTitle) && isHttps(collection.sourceUrl) && isUtc(collection.reviewedAt);
}

function isClientCompatibleCreator(creator) {
  return ['ARTIST', 'INSTITUTION', 'MAKER'].includes(creator?.creatorKind)
    && creator.recordOrigin === 'SYNTHETIC' && creator.evidenceScope === 'DEMO_ONLY'
    && isText(creator.sourceTitle) && isHttps(creator.sourceUrl) && isUtc(creator.reviewedAt)
    && cityIds.has(creator.cityId);
}

test('default cloud entrypoint remains the frozen NOT_IMPLEMENTED boundary without injected runtime dependencies', async () => {
  const result = await contentRuntime.main({
    action: 'content.list', requestId: 'req_content_default_boundary_123456', payload: {},
  });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'NOT_IMPLEMENTED');
  assert.deepEqual(contentRuntime.ACTIONS, [
    'content.list', 'content.get', 'content.listCollections', 'content.getCreator',
    'content.listRelatedEvents', 'content.intent.create', 'content.intent.cancel',
  ]);
});

test('public reads return only public PUBLISHED content and never expose raw owner/reviewer fields', async () => {
  const fixture = structuredClone(seed.artItems);
  fixture[0].ownerUserId = 'user_private_owner';
  fixture[0].reviewerNotes = 'private review note';
  fixture.push({ ...structuredClone(fixture[0]), _id: 'content_hidden_private', publicVisible: false });
  const harness = makeHarness({ contents: fixture });

  const result = await call(harness.endpoint, 'content.list', { limit: 20 }, 'public_list');
  assert.equal(result.ok, true);
  assert.deepEqual(result.data.page.items.map((item) => item.contentId), [
    'content_demo_art', 'content_demo_antique', 'content_demo_pearl',
  ]);
  assert.equal(result.data.page.items.every((item) => item.publicationState === 'PUBLISHED'), true);
  assert.equal(JSON.stringify(result).includes('content_hidden_draft'), false);
  assert.equal(JSON.stringify(result).includes('content_hidden_review'), false);
  assert.equal(JSON.stringify(result).includes('content_hidden_archived'), false);
  assert.equal(JSON.stringify(result).includes('user_private_owner'), false);
  assert.equal(JSON.stringify(result).includes('private review note'), false);

  for (const item of result.data.page.items) {
    assert.equal(item.recordOrigin, 'SYNTHETIC');
    assert.equal(item.origin, 'SYNTHETIC');
    assert.equal(item.evidenceLabel, 'DEMO_ONLY');
    assert.equal(item.rightsStatus, item.mediaRightsState);
    assert.equal(item.imageDisabled, true);
    for (const field of ['sourceUrl', 'reviewedAt', 'cityId', 'alt']) assert.equal(typeof item[field], 'string');
  }

  for (const id of ['content_hidden_draft', 'content_hidden_review', 'content_hidden_archived', 'content_hidden_private']) {
    const hidden = await call(harness.endpoint, 'content.get', { contentId: id }, `hidden_${id}`);
    assert.equal(hidden.ok, false);
    assert.equal(hidden.error.code, 'NOT_FOUND');
  }
});

test('strict payloads reject forged publication, owner, reviewer and unknown city inputs', async () => {
  const harness = makeHarness();
  const cases = [
    ['content.list', { limit: 20, publicationState: 'DRAFT' }, 'publicationState'],
    ['content.list', { limit: 20, ownerUserId: 'user_attacker' }, 'ownerUserId'],
    ['content.get', { contentId: 'content_demo_art', reviewer: 'user_attacker' }, 'reviewer'],
    ['content.listRelatedEvents', { contentId: 'content_demo_art', cityId: 'forged-city' }, 'cityId'],
    ['content.intent.create', {
      contentId: 'content_demo_art',
      message: '[PURPOSE:VIEWING]',
      idempotencyKey: 'idem_forged_owner_123456',
      userId: 'user_attacker',
    }, 'userId'],
  ];
  for (const [action, payload, field] of cases) {
    const result = await call(harness.endpoint, action, payload, `forged_${field}`);
    assert.equal(result.ok, false, action);
    assert.equal(result.error.code, 'INVALID_REQUEST', action);
    assert.equal(result.error.details.field, field, action);
  }
  assert.equal(harness.intents.size, 0);
  assert.equal(harness.audits.length, 0);
});

test('category-specific fields remain discriminated and PEARL is a JEWELRY subtype', async () => {
  const harness = makeHarness();
  const all = await call(harness.endpoint, 'content.list', { limit: 20 }, 'categories');
  assert.equal(all.ok, true);
  const byCategory = Object.fromEntries(all.data.page.items.map((item) => [item.category, item]));
  assert.equal(byCategory.ART.details.category, 'ART');
  assert.equal(typeof byCategory.ART.details.art.medium, 'string');
  assert.equal(byCategory.ANTIQUE.details.category, 'ANTIQUE');
  assert.equal(Array.isArray(byCategory.ANTIQUE.details.antique.thirdPartyReportReferences), true);
  assert.equal(byCategory.JEWELRY.details.category, 'JEWELRY');
  assert.equal(byCategory.JEWELRY.details.jewelry.subtype, 'PEARL');

  const jewelry = await call(harness.endpoint, 'content.list', { limit: 20, category: 'JEWELRY' }, 'jewelry');
  assert.equal(jewelry.ok, true);
  assert.deepEqual(jewelry.data.page.items.map((item) => item.contentId), ['content_demo_pearl']);
  const pearlCategory = await call(harness.endpoint, 'content.list', { limit: 20, category: 'PEARL' }, 'pearl_category');
  assert.equal(pearlCategory.ok, false);
  assert.equal(pearlCategory.error.code, 'INVALID_REQUEST');
});

test('REAL, SYNTHETIC and DEMO_ONLY remain separate evidence dimensions', async () => {
  const contents = structuredClone(seed.artItems);
  const real = structuredClone(contents[0]);
  real._id = 'content_real_projection';
  real.recordOrigin = 'REAL';
  real.origin = 'REAL';
  delete real.evidenceLabel;
  real.updatedAt = '2026-08-25T02:00:00Z';
  contents.push(real);
  const harness = makeHarness({ contents });
  const result = await call(harness.endpoint, 'content.list', { limit: 20 }, 'origin_dimensions');
  assert.equal(result.ok, true);
  const realProjection = result.data.page.items.find((item) => item.contentId === 'content_real_projection');
  const syntheticProjection = result.data.page.items.find((item) => item.contentId === 'content_demo_art');
  assert.equal(realProjection.origin, 'REAL');
  assert.equal('evidenceLabel' in realProjection, false);
  assert.equal(syntheticProjection.origin, 'SYNTHETIC');
  assert.equal(syntheticProjection.evidenceLabel, 'DEMO_ONLY');
  assert.equal(result.data.page.items.some((item) => item.verificationState === 'HUMAN_REVIEWED'), false);
});

test('related events use only stored relationships, frozen city IDs and readable public projections', async () => {
  const contents = structuredClone(seed.artItems);
  contents[0].relatedEventIds = ['event_demo_shenzhen', 'event_demo_cancelled'];
  const harness = makeHarness({ contents });
  const result = await call(harness.endpoint, 'content.listRelatedEvents', {
    contentId: 'content_demo_art', cityId: 'cn-shenzhen',
  }, 'related');
  assert.equal(result.ok, true);
  assert.deepEqual(result.data.events.map((event) => event.eventId), ['event_demo_shenzhen']);
  assert.equal(result.data.filteredUnavailableCount, 1);

  const staleHarness = makeHarness({
    contents,
    events: [readableEvent(publicEvent(), { dirty: true, requiredSourceVersion: 2 })],
  });
  const stale = await call(staleHarness.endpoint, 'content.listRelatedEvents', {
    contentId: 'content_demo_art', cityId: 'cn-shenzhen',
  }, 'related_stale');
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'PROJECTION_STALE');
});

test('list cursors are filter-bound and cannot inject another publication/category view', async () => {
  const harness = makeHarness();
  const first = await call(harness.endpoint, 'content.list', { limit: 1 }, 'cursor_first');
  assert.equal(first.ok, true);
  assert.equal(first.data.page.hasMore, true);
  const second = await call(harness.endpoint, 'content.list', {
    limit: 1, cursor: first.data.page.nextCursor,
  }, 'cursor_second');
  assert.equal(second.ok, true);
  assert.notEqual(second.data.page.items[0].contentId, first.data.page.items[0].contentId);
  const changedFilter = await call(harness.endpoint, 'content.list', {
    limit: 1, cursor: first.data.page.nextCursor, category: 'ART',
  }, 'cursor_filter');
  assert.equal(changedFilter.ok, false);
  assert.equal(changedFilter.error.code, 'INVALID_CURSOR');
  assert.equal(changedFilter.error.details.reason, 'FILTER_MISMATCH');
});

test('intent create derives purpose and user, then replays atomically without duplicate writes', async () => {
  const harness = makeHarness();
  const createPayload = {
    contentId: 'content_demo_art',
    message: '[PURPOSE:VIEWING]\n希望了解可预约时段。',
    idempotencyKey: 'idem_create_viewing_123456',
  };
  const created = await call(harness.endpoint, 'content.intent.create', createPayload, 'intent_create');
  assert.equal(created.ok, true);
  assert.equal(created.data.intent.userId, 'user_trusted_alice');
  assert.equal(created.data.intent.purpose, 'VIEWING');
  assert.equal(created.data.intent.message, '希望了解可预约时段。');
  assert.equal(created.data.intent.state, 'ACTIVE');
  assert.equal(harness.intents.size, 1);
  assert.equal(harness.audits.length, 1);
  const stored = [...harness.intents.values()][0];
  assert.equal(stored.userId, 'user_trusted_alice');
  assert.equal(stored.purpose, 'VIEWING');
  assert.equal(stored.message, '希望了解可预约时段。');

  const replay = await call(harness.endpoint, 'content.intent.create', createPayload, 'intent_replay');
  assert.equal(replay.ok, true);
  assert.deepEqual(replay.data, created.data);
  assert.equal(harness.intents.size, 1);
  assert.equal(harness.audits.length, 1);

  const reusedForAnotherPurpose = await call(harness.endpoint, 'content.intent.create', {
    ...createPayload,
    message: '[PURPOSE:COLLABORATION]\n希望提交合作意向。',
  }, 'intent_conflict');
  assert.equal(reusedForAnotherPurpose.ok, false);
  assert.equal(reusedForAnotherPurpose.error.code, 'IDEMPOTENCY_CONFLICT');
  assert.equal(harness.intents.size, 1);
  assert.equal(harness.audits.length, 1);
});

test('a new idempotency key recovers an existing ACTIVE intent without mutating authoritative state', async () => {
  const harness = makeHarness();
  const created = await call(harness.endpoint, 'content.intent.create', {
    contentId: 'content_demo_art',
    message: '[PURPOSE:VIEWING]\n原始正文。',
    idempotencyKey: 'idem_active_original_123456',
  }, 'active_original');
  assert.equal(created.ok, true);
  const intentId = created.data.intent.intentId;
  const originalStored = structuredClone(harness.intents.get(intentId));

  const recoveryPayload = {
    contentId: 'content_demo_art',
    message: '[PURPOSE:COLLABORATION]\n这段新输入不得覆盖权威状态。',
    idempotencyKey: 'idem_active_recovery_123456',
  };
  const recovered = await call(harness.endpoint, 'content.intent.create', recoveryPayload, 'active_recovery');
  assert.equal(recovered.ok, true);
  assert.equal(recovered.data.intent.intentId, intentId);
  assert.equal(recovered.data.intent.version, originalStored.version);
  assert.equal(recovered.data.intent.purpose, 'VIEWING');
  assert.equal(recovered.data.intent.message, '原始正文。');
  assert.deepEqual(harness.intents.get(intentId), originalStored);
  assert.equal(harness.intents.size, 1);
  assert.equal(harness.intents.get(intentId).history.length, 1);
  assert.equal(harness.audits.length, 1);
  assert.equal(harness.idempotency.size, 2);
  assert.equal([...harness.idempotency.values()].every((record) => record.status === 'COMPLETED'), true);

  const replay = await call(harness.endpoint, 'content.intent.create', recoveryPayload, 'active_recovery_replay');
  assert.equal(replay.ok, true);
  assert.deepEqual(replay.data, recovered.data);
  assert.deepEqual(harness.intents.get(intentId), originalStored);
  assert.equal(harness.audits.length, 1);
  assert.equal(harness.idempotency.size, 2);

  const changedPayload = await call(harness.endpoint, 'content.intent.create', {
    ...recoveryPayload,
    message: '[PURPOSE:VIEWING]\n同一键的不同载荷。',
  }, 'active_recovery_conflict');
  assert.equal(changedPayload.ok, false);
  assert.equal(changedPayload.error.code, 'IDEMPOTENCY_CONFLICT');
  assert.deepEqual(harness.intents.get(intentId), originalStored);
  assert.equal(harness.audits.length, 1);
  assert.equal(harness.idempotency.size, 2);

  const stale = await call(harness.endpoint, 'content.intent.create', {
    contentId: 'content_demo_art',
    message: '[PURPOSE:VIEWING]',
    expectedVersion: 99,
    idempotencyKey: 'idem_active_stale_123456',
  }, 'active_stale');
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'VERSION_CONFLICT');
  assert.equal(harness.idempotency.size, 2);

  const versionedRecovery = await call(harness.endpoint, 'content.intent.create', {
    contentId: 'content_demo_art',
    message: '[PURPOSE:COLLABORATION]\n仍不得覆盖。',
    expectedVersion: 1,
    idempotencyKey: 'idem_active_versioned_123456',
  }, 'active_versioned');
  assert.equal(versionedRecovery.ok, true);
  assert.deepEqual(versionedRecovery.data.intent, created.data.intent);
  assert.deepEqual(harness.intents.get(intentId), originalStored);
  assert.equal(harness.audits.length, 1);
  assert.equal(harness.idempotency.size, 3);
});

test('purpose prefix is closed, draft intents are denied, and failures commit no writes', async () => {
  const harness = makeHarness();
  for (const [message, suffix] of [
    ['普通文本', 'plain'],
    ['[PURPOSE:OTHER]', 'other'],
    ['[PURPOSE:VIEWING] 同行正文', 'same_line'],
    [undefined, 'missing'],
  ]) {
    const result = await call(harness.endpoint, 'content.intent.create', {
      contentId: 'content_demo_art', message, idempotencyKey: `idem_bad_${suffix}_12345678`,
    }, `bad_purpose_${suffix}`);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'VALIDATION_FAILED');
  }
  const draft = await call(harness.endpoint, 'content.intent.create', {
    contentId: 'content_hidden_draft',
    message: '[PURPOSE:VIEWING]',
    idempotencyKey: 'idem_draft_content_123456',
  }, 'draft_intent');
  assert.equal(draft.ok, false);
  assert.equal(draft.error.code, 'NOT_FOUND');
  assert.equal(harness.intents.size, 0);
  assert.equal(harness.idempotency.size, 0);
  assert.equal(harness.audits.length, 0);

  const auditFailure = makeHarness({ failAudit: true });
  const rolledBack = await call(auditFailure.endpoint, 'content.intent.create', {
    contentId: 'content_demo_art',
    message: '[PURPOSE:COLLABORATION]\n测试事务回滚。',
    idempotencyKey: 'idem_audit_failure_123456',
  }, 'audit_rollback');
  assert.equal(rolledBack.ok, false);
  assert.equal(rolledBack.error.code, 'INTERNAL_ERROR');
  assert.equal(auditFailure.intents.size, 0);
  assert.equal(auditFailure.idempotency.size, 0);
  assert.equal(auditFailure.audits.length, 0);
});

test('intent cancel enforces trusted owner, ACTIVE state, optimistic version and replay', async () => {
  const harness = makeHarness();
  const created = await call(harness.endpoint, 'content.intent.create', {
    contentId: 'content_demo_pearl',
    message: '[PURPOSE:COLLABORATION]\n希望进一步交流。',
    idempotencyKey: 'idem_cancel_setup_123456',
  }, 'cancel_setup');
  assert.equal(created.ok, true);
  const intentId = created.data.intent.intentId;

  harness.setActiveUser('user_trusted_bob');
  const forgedOwner = await call(harness.endpoint, 'content.intent.cancel', {
    intentId, expectedVersion: 1, idempotencyKey: 'idem_cancel_other_123456',
  }, 'cancel_other');
  assert.equal(forgedOwner.ok, false);
  assert.equal(forgedOwner.error.code, 'FORBIDDEN');
  assert.equal([...harness.intents.values()][0].state, 'ACTIVE');

  harness.setActiveUser('user_trusted_alice');
  const wrongVersion = await call(harness.endpoint, 'content.intent.cancel', {
    intentId, expectedVersion: 2, idempotencyKey: 'idem_cancel_version_123456',
  }, 'cancel_version');
  assert.equal(wrongVersion.ok, false);
  assert.equal(wrongVersion.error.code, 'VERSION_CONFLICT');

  const cancelPayload = { intentId, expectedVersion: 1, idempotencyKey: 'idem_cancel_valid_123456' };
  const cancelled = await call(harness.endpoint, 'content.intent.cancel', cancelPayload, 'cancel_valid');
  assert.equal(cancelled.ok, true);
  assert.equal(cancelled.data.intent.state, 'CANCELLED');
  assert.equal(cancelled.data.intent.version, 2);
  assert.equal(harness.audits.length, 2);
  const replay = await call(harness.endpoint, 'content.intent.cancel', cancelPayload, 'cancel_replay');
  assert.equal(replay.ok, true);
  assert.deepEqual(replay.data, cancelled.data);
  assert.equal(harness.audits.length, 2);

  const secondCancel = await call(harness.endpoint, 'content.intent.cancel', {
    intentId, expectedVersion: 2, idempotencyKey: 'idem_cancel_second_123456',
  }, 'cancel_second');
  assert.equal(secondCancel.ok, false);
  assert.equal(secondCancel.error.code, 'CONFLICT');
  assert.equal(harness.audits.length, 2);
});

test('content, collection and creator responses match the client LIVE semantic validators', async () => {
  const harness = makeHarness();
  const listed = await call(harness.endpoint, 'content.list', { limit: 20 }, 'shape_list');
  assert.equal(listed.ok, true);
  assert.equal(listed.data.page.items.every(isClientCompatibleContent), true);

  for (const item of listed.data.page.items) {
    const detail = await call(harness.endpoint, 'content.get', { contentId: item.contentId }, `shape_${item.contentId}`);
    assert.equal(detail.ok, true);
    assert.equal(isClientCompatibleContent(detail.data.content), true);
    assert.equal(isClientCompatibleCreator(detail.data.creator), true);
    assert.equal(detail.data.creator.displayName, detail.data.content.creatorDisplayName);
  }

  const collections = await call(harness.endpoint, 'content.listCollections', { limit: 20 }, 'shape_collections');
  assert.equal(collections.ok, true);
  assert.equal(collections.data.page.items.every(isClientCompatibleCollection), true);
  const creator = await call(harness.endpoint, 'content.getCreator', {
    creatorId: 'creator_demo_artist',
  }, 'shape_creator');
  assert.equal(creator.ok, true);
  assert.equal(isClientCompatibleCreator(creator.data.creator), true);
});

test('DEMO_ONLY cannot be attached to REAL content and malformed public records cannot unlock creators', async () => {
  const invalidDemo = structuredClone(seed.artItems[0]);
  invalidDemo.recordOrigin = 'REAL';
  invalidDemo.origin = 'REAL';
  const harness = makeHarness({ contents: [invalidDemo] });
  const list = await call(harness.endpoint, 'content.list', { limit: 20 }, 'invalid_demo');
  assert.equal(list.ok, true);
  assert.deepEqual(list.data.page.items, []);

  const creator = await call(harness.endpoint, 'content.getCreator', {
    creatorId: invalidDemo.creatorId,
  }, 'invalid_creator_unlock');
  assert.equal(creator.ok, false);
  assert.equal(creator.error.code, 'NOT_FOUND');
});

test('list and listCollections skip one malformed PUBLISHED record without failing the whole batch', async () => {
  const contents = structuredClone(seed.artItems);
  const malformedContent = structuredClone(contents[0]);
  malformedContent._id = 'content_malformed_public';
  malformedContent.sourceUrl = 'javascript:invalid';
  malformedContent.updatedAt = '2026-08-26T00:00:00Z';
  contents.push(malformedContent);

  const collections = structuredClone(seed.artCollections);
  const malformedCollection = structuredClone(collections[0]);
  malformedCollection._id = 'collection_malformed_public';
  malformedCollection.categories = ['ART', 'ART'];
  malformedCollection.updatedAt = '2026-08-26T00:00:00Z';
  collections.push(malformedCollection);

  const harness = makeHarness({ contents, collections });
  const listed = await call(harness.endpoint, 'content.list', { limit: 20 }, 'malformed_batch_content');
  assert.equal(listed.ok, true);
  assert.deepEqual(listed.data.page.items.map((item) => item.contentId), [
    'content_demo_art', 'content_demo_antique', 'content_demo_pearl',
  ]);

  const listedCollections = await call(harness.endpoint, 'content.listCollections', {
    limit: 20,
  }, 'malformed_batch_collection');
  assert.equal(listedCollections.ok, true);
  assert.deepEqual(listedCollections.data.page.items.map((item) => item.collectionId), [
    'collection_demo_editorial',
  ]);
});

test('image exposure requires complete rights/source/license/hash/alt metadata', async () => {
  const complete = structuredClone(seed.artItems[0]);
  complete.rightsStatus = 'APPROVED';
  complete.mediaRightsState = 'APPROVED';
  complete.media = {
    assetId: 'media_demo_art_123',
    publicUrl: 'https://example.invalid/assets/demo-art.webp',
    sourceUrl: 'https://example.invalid/rights/demo-art',
    license: 'First-party demo asset permission',
    sha256: 'a'.repeat(64),
    publicState: 'PUBLIC',
    rights: {
      state: 'APPROVED',
      rightsHolderName: 'AB Club demo fixture',
      permittedUses: ['THUMBNAIL', 'DETAIL'],
      reviewedAt: '2026-08-20T00:00:00Z',
    },
  };
  const completeHarness = makeHarness({ contents: [complete] });
  const completeResult = await call(completeHarness.endpoint, 'content.get', {
    contentId: complete._id,
  }, 'image_complete');
  assert.equal(completeResult.ok, true);
  assert.deepEqual(Object.keys(completeResult.data.content.image).sort(), [
    'alt', 'license', 'mediaAssetId', 'permittedUses', 'rightsHolder', 'rightsReviewedAt', 'sha256', 'sourceUrl', 'url',
  ]);
  assert.equal(completeResult.data.content.rightsReviewedAt, '2026-08-20T00:00:00Z');
  assert.equal(isClientCompatibleContent(completeResult.data.content), true);

  for (const missing of ['sourceUrl', 'license', 'sha256']) {
    const candidate = structuredClone(complete);
    delete candidate.media[missing];
    const harness = makeHarness({ contents: [candidate] });
    const result = await call(harness.endpoint, 'content.get', { contentId: candidate._id }, `image_missing_${missing}`);
    assert.equal(result.ok, true, missing);
    assert.equal(result.data.content.imageDisabled, true, missing);
    assert.equal('image' in result.data.content, false, missing);
  }
  const missingHolder = structuredClone(complete);
  delete missingHolder.media.rights.rightsHolderName;
  const holderHarness = makeHarness({ contents: [missingHolder] });
  const holder = await call(holderHarness.endpoint, 'content.get', { contentId: missingHolder._id }, 'image_holder');
  assert.equal(holder.ok, true);
  assert.equal('image' in holder.data.content, false);

  const missingPermission = structuredClone(complete);
  delete missingPermission.media.rights.permittedUses;
  const permissionHarness = makeHarness({ contents: [missingPermission] });
  const permission = await call(permissionHarness.endpoint, 'content.get', {
    contentId: missingPermission._id,
  }, 'image_permission');
  assert.equal(permission.ok, true);
  assert.equal('image' in permission.data.content, false);

  const missingAlt = structuredClone(complete);
  delete missingAlt.alt;
  const altHarness = makeHarness({ contents: [missingAlt] });
  const alt = await call(altHarness.endpoint, 'content.get', { contentId: missingAlt._id }, 'image_alt');
  assert.equal(alt.ok, false);
  assert.equal(alt.error.code, 'INTERNAL_ERROR');
});

test('a cancelled intent can be reactivated with a new key and current version while preserving history', async () => {
  const harness = makeHarness();
  const created = await call(harness.endpoint, 'content.intent.create', {
    contentId: 'content_demo_antique',
    message: '[PURPOSE:VIEWING]\n首次提交。',
    idempotencyKey: 'idem_reactivate_create_123456',
  }, 'reactivate_create');
  assert.equal(created.ok, true);
  const intentId = created.data.intent.intentId;
  const cancelled = await call(harness.endpoint, 'content.intent.cancel', {
    intentId,
    expectedVersion: 1,
    idempotencyKey: 'idem_reactivate_cancel_123456',
  }, 'reactivate_cancel');
  assert.equal(cancelled.ok, true);

  const missingVersion = await call(harness.endpoint, 'content.intent.create', {
    contentId: 'content_demo_antique',
    message: '[PURPOSE:COLLABORATION]\n再次提交。',
    idempotencyKey: 'idem_reactivate_missing_123456',
  }, 'reactivate_missing');
  assert.equal(missingVersion.ok, false);
  assert.equal(missingVersion.error.code, 'VALIDATION_FAILED');

  const staleVersion = await call(harness.endpoint, 'content.intent.create', {
    contentId: 'content_demo_antique',
    message: '[PURPOSE:COLLABORATION]\n再次提交。',
    expectedVersion: 1,
    idempotencyKey: 'idem_reactivate_stale_123456',
  }, 'reactivate_stale');
  assert.equal(staleVersion.ok, false);
  assert.equal(staleVersion.error.code, 'VERSION_CONFLICT');

  const reactivatedPayload = {
    contentId: 'content_demo_antique',
    message: '[PURPOSE:COLLABORATION]\n再次提交。',
    expectedVersion: 2,
    idempotencyKey: 'idem_reactivate_valid_123456',
  };
  const reactivated = await call(harness.endpoint, 'content.intent.create', reactivatedPayload, 'reactivate_valid');
  assert.equal(reactivated.ok, true);
  assert.equal(reactivated.data.intent.intentId, intentId);
  assert.equal(reactivated.data.intent.state, 'ACTIVE');
  assert.equal(reactivated.data.intent.purpose, 'COLLABORATION');
  assert.equal(reactivated.data.intent.version, 3);
  const stored = harness.intents.get(intentId);
  assert.deepEqual(stored.history.map((entry) => [entry.state, entry.version]), [
    ['ACTIVE', 1], ['CANCELLED', 2], ['ACTIVE', 3],
  ]);
  assert.equal(harness.audits.length, 3);

  const replay = await call(harness.endpoint, 'content.intent.create', reactivatedPayload, 'reactivate_replay');
  assert.equal(replay.ok, true);
  assert.deepEqual(replay.data, reactivated.data);
  assert.equal(harness.audits.length, 3);
  assert.equal(harness.intents.get(intentId).history.length, 3);
});

test('seed is conspicuously synthetic/demo-only and includes all denial scenarios', () => {
  assert.equal(seed.fixtureMode, 'TEST_ONLY_NOT_DATABASE_IMPORT');
  assert.equal(seed.runtimeMode, 'OFFLINE_DEMO');
  assert.equal(seed.artItems.every((item) => item.recordOrigin === 'SYNTHETIC'), true);
  assert.equal(seed.artItems.every((item) => item.evidenceLabel === 'DEMO_ONLY'), true);
  assert.deepEqual(new Set(seed.artItems.map((item) => item.publicationState)),
    new Set(['PUBLISHED', 'DRAFT', 'UNDER_REVIEW', 'ARCHIVED']));
  const pearl = seed.artItems.find((item) => item.details?.subtype === 'PEARL');
  assert.equal(pearl.category, 'JEWELRY');
  assert.equal(JSON.stringify(seed).includes('HUMAN_REVIEWED'), false);
  assert.equal(JSON.stringify(seed).includes('"recordOrigin":"REAL"'), false);
  assert.equal(JSON.stringify(seed).includes('"runtimeMode":"LIVE"'), false);
});
