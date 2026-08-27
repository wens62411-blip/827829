import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../..', import.meta.url));

function loadAuthoritativeRuntime() {
  const output = buildSync({
    absWorkingDir: root,
    entryPoints: ['cloudfunctions/eventApi/index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    write: false,
    logLevel: 'silent',
  }).outputFiles[0];
  assert.ok(output);
  const loaded = { exports: {} };
  const execute = new Function('require', 'module', 'exports', '__filename', '__dirname', output.text);
  const filename = join(root, 'cloudfunctions', 'eventApi', 'index.test-bundle.js');
  execute(require, loaded, loaded.exports, filename, join(root, 'cloudfunctions', 'eventApi'));
  return loaded.exports;
}

const runtime = loadAuthoritativeRuntime();
const citySeed = JSON.parse(readFileSync(join(root, 'database', 'seeds', 'cities.json'), 'utf8'));
const demoSeed = JSON.parse(readFileSync(join(root, 'database', 'seeds', 'events-demo.json'), 'utf8'));
const geography = JSON.parse(readFileSync(join(root, 'docs', 'contracts', 'geography.json'), 'utf8'));
const NOW = '2026-08-27T12:00:00Z';
const ALICE_OPENID = 'trusted_openid_alice_12345';
const BOB_OPENID = 'trusted_openid_bob_1234567';

function operatingCitySeed() {
  return citySeed.map((record) => record._id === 'cn-beijing'
    ? { ...record, operationalState: 'PILOT' }
    : { ...record });
}

function principal(openId, userId) {
  return { openId, userId, roles: ['MEMBER'], accountState: 'ACTIVE' };
}

function organizer(overrides = {}) {
  return {
    _id: 'organizer-approved-beijing', ownerUserId: 'user-organizer-human',
    name: { zh: '已人工批准测试主理人', en: 'Human-approved test organizer' },
    summary: 'Only a test fixture; never seeded as production evidence.', cityIds: ['cn-beijing'],
    reviewStatus: 'APPROVED', verificationState: 'HUMAN_REVIEWED', version: 1,
    createdAt: NOW, updatedAt: NOW, ...overrides,
  };
}

function node(overrides = {}) {
  return {
    _id: 'node-approved-cn-beijing', cityId: 'cn-beijing',
    name: { zh: 'AB Club 北京测试节点', en: 'AB Club Beijing test node' },
    operationalState: 'PILOT', reviewStatus: 'APPROVED', organizerId: 'organizer-approved-beijing',
    version: 1, createdAt: NOW, updatedAt: NOW, ...overrides,
  };
}

function publishedEvent(overrides = {}) {
  return {
    _id: 'event-approved-beijing-interest', organizerId: 'organizer-approved-beijing',
    clubNodeId: 'node-approved-cn-beijing', cityId: 'cn-beijing',
    title: '人工批准测试活动', summary: 'Only an in-memory authorization and transaction fixture.',
    source: {
      kind: 'OFFICIAL_ORGANIZER', label: 'Authorized test fixture source',
      sourcePageUrl: 'https://example.invalid/authorized-test-fixture', retrievedAt: NOW,
      contentStatus: 'VERIFIED',
    },
    startsAt: '2026-09-20T06:00:00Z', endsAt: '2026-09-20T08:00:00Z',
    timezone: 'Asia/Shanghai', addressScope: '北京·测试地址范围', registrationMethod: 'INTEREST',
    capacity: 2, requiredLabelIds: [], minParticipantsEnabled: false,
    termsVersion: 'event-interest-terms-v1', requiresPayment: false,
    state: 'PUBLISHED', publicationState: 'PUBLISHED', reservationAvailable: true,
    imageRights: { state: 'UNVERIFIED', alt: 'No cover image is exposed by this test fixture' },
    origin: 'REAL', verificationState: 'HUMAN_REVIEWED', version: 1,
    createdAt: NOW, updatedAt: NOW, ...overrides,
  };
}

function makeService(overrides = {}) {
  const store = runtime.createInMemoryEventApiStore({
    cityOverlays: operatingCitySeed(), clubNodes: [node()], organizers: [organizer()],
    events: [publishedEvent()],
    principals: [principal(ALICE_OPENID, 'user-alice'), principal(BOB_OPENID, 'user-bob')],
    ...overrides,
  });
  return { store, api: runtime.createEventApi({ store, now: () => NOW }) };
}

let requestSequence = 0;
function call(api, action, payload, openId = undefined, contextExtras = {}) {
  requestSequence += 1;
  const context = openId === undefined ? contextExtras : { OPENID: openId, ...contextExtras };
  return api.main({
    action,
    requestId: `req_events_${requestSequence}_12345678`,
    payload: { contractVersion: '1.0.0', ...payload },
  }, context);
}

test('frozen 7-country 13-city tree, order, China list, timezone and overlay contract stay exact', async () => {
  const foundationProbe = await runtime.main({
    action: 'geo.listCountries', requestId: 'req_foundation_probe_12345678', payload: {},
  });
  assert.equal(foundationProbe.ok, false);
  assert.equal(foundationProbe.error.code, 'NOT_IMPLEMENTED');
  assert.deepEqual(Object.keys(runtime.endpoint.writeGuardPlans),
    ['event.registerInterest', 'event.cancelInterest']);
  assert.equal(geography.countries.length, 7);
  assert.equal(geography.cities.length, 13);
  assert.deepEqual(geography.cities.map(({ id }) => id), [
    'cn-beijing', 'cn-shanghai', 'cn-guangzhou', 'cn-shenzhen', 'cn-hangzhou',
    'ch-zurich', 'it-milan', 'fr-paris', 'au-melbourne', 'au-sydney',
    'sg-singapore', 'ca-toronto', 'ca-vancouver',
  ]);
  assert.deepEqual(geography.cities.filter(({ parentId }) => parentId === 'cn').map(({ name }) => name.zh),
    ['北京', '上海', '广州', '深圳', '杭州']);
  for (const region of geography.regions) assert.equal(region.parentId, 'global');
  for (const country of geography.countries) assert.ok(geography.regions.some(({ id }) => id === country.parentId));
  for (const city of geography.cities) {
    assert.ok(geography.countries.some(({ id }) => id === city.parentId));
    assert.ok(Intl.supportedValuesOf('timeZone').includes(city.timezone));
  }
  assert.deepEqual(geography.hierarchyRules.map(({ level }) => level),
    ['GLOBAL', 'REGION', 'COUNTRY', 'CITY', 'CLUB_NODE', 'EVENT']);

  assert.doesNotThrow(() => runtime.assertFrozenCityOverlays(citySeed));
  assert.equal(citySeed.length, 13);
  citySeed.forEach((record) => {
    assert.deepEqual(Object.keys(record).sort(), ['_id', 'createdAt', 'operationalState', 'updatedAt', 'version'].sort());
    assert.equal(record.operationalState, 'PLANNED');
  });
  assert.throws(() => runtime.assertFrozenCityOverlays(citySeed.slice(0, -1)), /exactly/);
  assert.throws(() => runtime.assertFrozenCityOverlays([...citySeed.slice(0, -1), { ...citySeed[0] }]), /without drift/);
  assert.throws(() => runtime.assertFrozenCityOverlays(citySeed.map((record, index) => index === 0
    ? { ...record, _id: 'cn-chengdu' }
    : record)), /without drift/);
  assert.throws(() => runtime.assertFrozenCityOverlays(citySeed.map((record, index) => index === 0
    ? { ...record, timezone: 'Asia/Shanghai' }
    : record)), /overlay fields only/);
  assert.throws(() => makeService({
    events: [publishedEvent({ registrationMethod: 'UNKNOWN' })],
  }), /missing required fields/);
  assert.throws(() => makeService({
    events: [publishedEvent({ minParticipantsEnabled: 'yes' })],
  }), /missing required fields/);
  assert.throws(() => makeService({
    events: [publishedEvent({ termsVersion: 'stale-terms-v0' })],
  }), /unsupported interest terms version/);
  assert.throws(() => makeService({
    organizers: [organizer({ cityIds: ['cn-shanghai'] })],
  }), /organizer scope/);
  assert.throws(() => makeService({
    clubNodes: [node({ operationalState: 'LIVE' })],
  }), /inconsistent city operations/);
});

test('all geo actions compose frozen directory with separate PLANNED overlays and no public demo event', async () => {
  assert.equal(demoSeed.evidenceState, 'DEMO_ONLY');
  assert.equal(demoSeed.realContentEvidenceStatus, 'CONTENT_LIVE_UNVERIFIED');
  assert.equal(demoSeed.publicImportAllowed, false);
  assert.equal(demoSeed.events[0].state, 'DRAFT');
  assert.equal(demoSeed.events[0].publicationState, 'DRAFT');
  assert.equal(demoSeed.events[0].origin, 'SYNTHETIC');
  assert.equal(demoSeed.events[0].source.contentStatus, 'DEMO_ONLY');
  assert.equal('minParticipants' in demoSeed.events[0], false);
  assert.equal(demoSeed.organizers[0].reviewStatus, 'DRAFT');

  const store = runtime.createInMemoryEventApiStore({
    cityOverlays: citySeed, clubNodes: demoSeed.clubNodes,
    organizers: demoSeed.organizers, events: demoSeed.events,
  });
  const api = runtime.createEventApi({ store, now: () => NOW });
  const regionResult = await call(api, 'geo.listRegions', { includeOperationalSummary: true });
  assert.equal(regionResult.ok, true);
  assert.deepEqual(regionResult.data.regions.map(({ id }) => id), ['asia-pacific', 'europe', 'north-america']);
  const countriesResult = await call(api, 'geo.listCountries', {});
  assert.equal(countriesResult.ok, true);
  assert.equal(countriesResult.data.countries.length, 7);
  const citiesResult = await call(api, 'geo.listCities', { countryId: 'cn' });
  assert.equal(citiesResult.ok, true);
  assert.deepEqual(citiesResult.data.cities.map(({ id }) => id),
    ['cn-beijing', 'cn-shanghai', 'cn-guangzhou', 'cn-shenzhen', 'cn-hangzhou']);
  assert.ok(citiesResult.data.cities.every(({ operationalState }) => operationalState === 'PLANNED'));
  const nodeResult = await call(api, 'geo.getNode', { cityId: 'cn-beijing' });
  assert.equal(nodeResult.ok, true);
  assert.equal('node' in nodeResult.data, false, 'DRAFT organizer/node cannot become a public projection');
  const listResult = await call(api, 'event.list', { limit: 20 });
  assert.equal(listResult.ok, true);
  assert.deepEqual(listResult.data.page, { items: [], hasMore: false });
  const getResult = await call(api, 'event.get', { eventId: demoSeed.events[0]._id });
  assert.equal(getResult.ok, false);
  assert.equal(getResult.error.code, 'EVENT_NOT_AVAILABLE');
  assert.equal(getResult.error.details.eventState, 'UNAVAILABLE');
  assert.doesNotMatch(JSON.stringify(getResult.error), /DRAFT|DEMO_ONLY|source/i);
  const missingEvent = await call(api, 'event.get', { eventId: 'event-does-not-exist' });
  assert.equal(missingEvent.ok, false);
  assert.equal(missingEvent.error.code, 'EVENT_NOT_AVAILABLE');
  assert.deepEqual(missingEvent.error.details, getResult.error.details);
  const organizerResult = await call(api, 'organizer.getPublic', { organizerId: demoSeed.organizers[0]._id });
  assert.equal(organizerResult.ok, false);
  assert.equal(organizerResult.error.code, 'NOT_FOUND');
});

test('implemented service covers frozen public DTOs, trusted identity, eligibility, idempotency and legal cancellation', async () => {
  const { api, store } = makeService();
  const list = await call(api, 'event.list', { cityId: 'cn-beijing', limit: 10 });
  assert.equal(list.ok, true);
  assert.equal(list.data.page.items.length, 1);
  assert.deepEqual(Object.keys(list.data.page.items[0]).sort(), [
    'cityId', 'clubNodeId', 'createdAt', 'endsAt', 'eventId', 'organizerId', 'origin',
    'publicationState', 'reservationAvailable', 'startsAt', 'state', 'summary', 'timezone',
    'title', 'updatedAt', 'verificationState', 'version',
  ].sort(), 'source/capacity/address/rights must not drift into frozen public DTO');
  const detail = await call(api, 'event.get', { eventId: 'event-approved-beijing-interest' });
  assert.equal(detail.ok, true);
  assert.equal(detail.data.organizer.reviewStatus, 'APPROVED');
  const eligibility = await call(api, 'event.checkEligibility', {
    eventId: 'event-approved-beijing-interest',
  }, ALICE_OPENID);
  assert.equal(eligibility.ok, true);
  assert.equal(eligibility.data.eligibility.eligible, true);

  const registrationPayload = {
    eventId: 'event-approved-beijing-interest', acknowledgedTermsVersion: 'event-interest-terms-v1',
    idempotencyKey: 'register-alice-00000001',
  };
  const staleVersion = await call(api, 'event.registerInterest', {
    ...registrationPayload, expectedVersion: 99, idempotencyKey: 'register-stale-00000001',
  }, ALICE_OPENID);
  assert.equal(staleVersion.ok, false);
  assert.equal(staleVersion.error.code, 'VERSION_CONFLICT');
  const first = await call(api, 'event.registerInterest', registrationPayload, ALICE_OPENID, { roles: ['ADMIN'] });
  const replay = await call(api, 'event.registerInterest', registrationPayload, ALICE_OPENID, { roles: ['ADMIN'] });
  assert.equal(first.ok, true);
  assert.equal(replay.ok, true);
  assert.deepEqual(replay.data.enrollment, first.data.enrollment);
  assert.equal(store.snapshot().enrollments.length, 1);
  assert.equal(store.snapshot().audits.length, 1);
  assert.equal(store.snapshot().audits[0].actorRole, 'MEMBER', 'context role claims are not authoritative');

  const own = await call(api, 'event.getEnrollment', { eventId: 'event-approved-beijing-interest' }, ALICE_OPENID);
  const other = await call(api, 'event.getEnrollment', { eventId: 'event-approved-beijing-interest' }, BOB_OPENID);
  assert.equal(own.ok, true);
  assert.equal(own.data.enrollment.userId, 'user-alice');
  assert.deepEqual(other.data, {});

  const cancelPayload = {
    eventId: 'event-approved-beijing-interest', expectedVersion: 1,
    idempotencyKey: 'cancel-alice-000000001', reasonCode: 'SCHEDULE',
  };
  const cancelled = await call(api, 'event.cancelInterest', cancelPayload, ALICE_OPENID);
  const cancelReplay = await call(api, 'event.cancelInterest', cancelPayload, ALICE_OPENID);
  assert.equal(cancelled.ok, true);
  assert.equal(cancelled.data.enrollment.state, 'CANCELLED');
  assert.deepEqual(cancelReplay.data.enrollment, cancelled.data.enrollment);
  assert.equal(store.snapshot().audits.length, 2);
  const reregistered = await call(api, 'event.registerInterest', {
    ...registrationPayload, idempotencyKey: 'reregister-alice-00001',
  }, ALICE_OPENID);
  assert.equal(reregistered.ok, false);
  assert.equal(reregistered.error.code, 'CONFLICT');
  assert.equal(store.snapshot().enrollments[0].state, 'CANCELLED');
  const bobKnownCancel = await call(api, 'event.cancelInterest', {
    eventId: 'event-approved-beijing-interest', idempotencyKey: 'cancel-bob-known-00001',
  }, BOB_OPENID);
  const bobMissingCancel = await call(api, 'event.cancelInterest', {
    eventId: 'event-does-not-exist', idempotencyKey: 'cancel-bob-missing-001',
  }, BOB_OPENID);
  assert.equal(bobKnownCancel.error.code, 'ENROLLMENT_NOT_FOUND');
  assert.equal(bobMissingCancel.error.code, 'ENROLLMENT_NOT_FOUND');
  assert.doesNotMatch(JSON.stringify([bobKnownCancel.error, bobMissingCancel.error]), /PUBLISHED|PAUSED|CANCELLED/);
});

test('client-forged city, capacity, labels, user and organizer role never influence registration', async () => {
  const { api, store } = makeService();
  for (const forged of [
    { cityId: 'cn-shanghai' }, { capacity: 999 }, { requiredLabelIds: [] },
    { userId: 'user-attacker' }, { roles: ['ORGANIZER'] }, { organizerRole: true },
  ]) {
    const result = await call(api, 'event.registerInterest', {
      eventId: 'event-approved-beijing-interest', acknowledgedTermsVersion: 'event-interest-terms-v1',
      expectedVersion: 1, idempotencyKey: `forgery-key-${Object.keys(forged)[0]}-0001`, ...forged,
    }, ALICE_OPENID);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'INVALID_REQUEST');
  }
  const spoofedEnvelope = await api.main({
    action: 'event.registerInterest', requestId: 'req_spoofed_12345678', payload: {
      contractVersion: '1.0.0', eventId: 'event-approved-beijing-interest',
      acknowledgedTermsVersion: 'event-interest-terms-v1', expectedVersion: 1,
      idempotencyKey: 'spoofed-openid-0000001',
    }, OPENID: ALICE_OPENID,
  });
  assert.equal(spoofedEnvelope.ok, false);
  assert.equal(spoofedEnvelope.error.code, 'INVALID_REQUEST');
  assert.equal(store.snapshot().enrollments.length, 0);

  assert.throws(() => makeService({
    claims: [{
      claimId: 'claim-user-declared-only', subjectUserId: 'user-alice', labelId: 'label-membership',
      labelText: { zh: '会员', en: 'Membership' },
      reviewStatus: 'SUBMITTED', verificationState: 'USER_DECLARED', publicVisible: false,
      validFrom: '2026-01-01T00:00:00Z', version: 1, createdAt: NOW, updatedAt: NOW,
    }],
  }), /human-approved|PublicVerificationClaimProjection/);
  const gated = makeService({
    events: [publishedEvent({ requiredLabelIds: ['label-membership'] })],
  });
  const eligibility = await call(gated.api, 'event.checkEligibility', {
    eventId: 'event-approved-beijing-interest',
  }, ALICE_OPENID);
  assert.equal(eligibility.data.eligibility.eligible, false);
  assert.equal(eligibility.data.eligibility.failureReason, 'MISSING_APPROVED_CLAIM');
  const rejected = await call(gated.api, 'event.registerInterest', {
    eventId: 'event-approved-beijing-interest', acknowledgedTermsVersion: 'event-interest-terms-v1',
    expectedVersion: 1, idempotencyKey: 'unapproved-claim-000001',
  }, ALICE_OPENID);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error.code, 'ELIGIBILITY_NOT_MET');

  const privateService = makeService({
    events: [publishedEvent({
      state: 'DRAFT', publicationState: 'DRAFT', reservationAvailable: false,
      requiredLabelIds: ['label-secret-draft'],
    })],
  });
  const privateEligibility = await call(privateService.api, 'event.checkEligibility', {
    eventId: 'event-approved-beijing-interest',
  }, ALICE_OPENID);
  const missingEligibility = await call(privateService.api, 'event.checkEligibility', {
    eventId: 'event-does-not-exist',
  }, ALICE_OPENID);
  assert.equal(privateEligibility.ok, true);
  assert.equal(missingEligibility.ok, true);
  assert.equal(privateEligibility.data.eligibility.failureReason, 'EVENT_UNAVAILABLE');
  assert.equal(missingEligibility.data.eligibility.failureReason, 'EVENT_UNAVAILABLE');
  assert.deepEqual(privateEligibility.data.eligibility.requiredLabelIds, []);
  assert.deepEqual(missingEligibility.data.eligibility.requiredLabelIds, []);
  assert.doesNotMatch(JSON.stringify(privateEligibility), /label-secret-draft|DRAFT/);

  const dirty = makeService({
    events: [publishedEvent({ requiredLabelIds: ['label-membership'] })],
    claims: [{
      claimId: 'claim-approved-membership', subjectUserId: 'user-alice', labelId: 'label-membership',
      labelText: { zh: '会员', en: 'Membership' },
      reviewStatus: 'APPROVED', verificationState: 'HUMAN_REVIEWED', publicVisible: true,
      validFrom: '2026-01-01T00:00:00Z', version: 1, createdAt: NOW, updatedAt: NOW,
    }],
    dirtyVerificationUserIds: ['user-alice'],
  });
  const staleDenied = await call(dirty.api, 'event.checkEligibility', {
    eventId: 'event-approved-beijing-interest',
  }, ALICE_OPENID);
  assert.equal(staleDenied.ok, true);
  assert.equal(staleDenied.data.eligibility.eligible, false, 'dirty projections deny while stale');
  assert.deepEqual(rejected.error.details.missingLabelIds, ['label-membership']);
});

test('transaction serializes concurrent capacity and payment remains disabled if any capability gate is missing', async () => {
  const { api, store } = makeService({
    events: [publishedEvent({ capacity: 1 })],
    payment: {
      featureFlag: 'ENABLED', subjectQualified: true, categoryApproved: true, filingComplete: true,
      merchantIdConfigured: true, certificateConfigured: true, callbackVerified: true,
      reconciliationReady: true, refundSlaApproved: false,
    },
  });
  const [alice, bob] = await Promise.all([
    call(api, 'event.registerInterest', {
      eventId: 'event-approved-beijing-interest', acknowledgedTermsVersion: 'event-interest-terms-v1',
      expectedVersion: 1, idempotencyKey: 'concurrent-alice-00001',
    }, ALICE_OPENID),
    call(api, 'event.registerInterest', {
      eventId: 'event-approved-beijing-interest', acknowledgedTermsVersion: 'event-interest-terms-v1',
      expectedVersion: 1, idempotencyKey: 'concurrent-bob-0000001',
    }, BOB_OPENID),
  ]);
  assert.equal([alice, bob].filter(({ ok }) => ok).length, 1);
  const rejected = [alice, bob].find(({ ok }) => !ok);
  assert.equal(rejected.error.code, 'CONFLICT');
  assert.equal(rejected.error.details.conflictType, 'CAPACITY_REACHED');
  assert.equal(store.snapshot().enrollments.length, 1);
  assert.ok(store.snapshot().enrollments.every(({ paymentState }) => paymentState !== 'PAID'));

  const globalCapability = await call(api, 'payment.getCapability', {}, ALICE_OPENID);
  assert.deepEqual(globalCapability.data.capability, { state: 'DISABLED', enabled: false, reason: 'P0_DISABLED' });
  const freeCapability = await call(api, 'payment.getCapability', {
    eventId: 'event-approved-beijing-interest',
  }, ALICE_OPENID);
  assert.deepEqual(freeCapability.data.capability, { state: 'NOT_REQUIRED', enabled: false, reason: 'EVENT_FREE' });
});
