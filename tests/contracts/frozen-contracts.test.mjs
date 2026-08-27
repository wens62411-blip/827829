import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');
const readJson = (...parts) => JSON.parse(read(...parts));

const expectedActions = {
  identityApi: [
    'identity.bootstrap', 'profile.getMine', 'profile.updateMine', 'card.getMine',
    'card.getForViewer', 'card.refreshProjection', 'share.create', 'share.resolve',
    'share.revoke', 'share.createQrScene',
  ],
  socialApi: [
    'friend.request', 'friend.listIncoming', 'friend.listAccepted', 'friend.accept',
    'friend.reject', 'friend.cancel', 'friend.remove', 'block.create', 'block.remove',
    'report.create', 'tag.catalog', 'verification.createDraft', 'verification.uploadPolicy',
    'verification.submit', 'verification.listMine', 'verification.getMine', 'verification.withdraw',
  ],
  eventApi: [
    'geo.listRegions', 'geo.listCountries', 'geo.listCities', 'geo.getNode', 'event.list',
    'event.get', 'event.checkEligibility', 'event.registerInterest', 'event.cancelInterest',
    'event.getEnrollment', 'organizer.getPublic', 'payment.getCapability',
  ],
  contentApi: [
    'content.list', 'content.get', 'content.listCollections', 'content.getCreator',
    'content.listRelatedEvents', 'content.intent.create', 'content.intent.cancel',
  ],
  adminApi: [
    'admin.bootstrap', 'review.list', 'review.get', 'review.approve', 'review.reject',
    'review.requestChanges', 'review.revoke', 'organizer.review', 'event.review',
    'content.review', 'report.list', 'report.resolve', 'audit.list',
  ],
};

const actionDocs = Object.keys(expectedActions).map((functionName) =>
  readJson('docs', 'contracts', 'actions', `${functionName}.json`));

test('freeze marker is exact, immutable contract v1.0.0 metadata', () => {
  const frozen = readJson('docs', 'contracts', 'FROZEN.json');
  assert.deepEqual(Object.keys(frozen).sort(), ['contractVersion', 'frozen', 'frozenAt', 'owners'].sort());
  assert.equal(frozen.contractVersion, '1.0.0');
  assert.equal(frozen.frozen, true);
  assert.deepEqual(frozen.owners, ['foundation', 'integration']);
  assert.match(frozen.frozenAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/);
  assert.equal(Number.isNaN(Date.parse(frozen.frozenAt)), false);
});

test('registry is exactly 59 actions in the frozen 10+17+12+7+13 grouping', () => {
  const counts = [10, 17, 12, 7, 13];
  assert.deepEqual(actionDocs.map((document) => document.actions.length), counts);
  assert.equal(actionDocs.flatMap((document) => document.actions).length, 59);

  for (const document of actionDocs) {
    assert.equal(document.contractVersion, '1.0.0');
    assert.deepEqual(document.actions.map(({ action }) => action), expectedActions[document.functionName]);
  }
});

test('every action owns unique named DTOs and complete security metadata', () => {
  const entries = actionDocs.flatMap((document) => document.actions);
  assert.equal(new Set(entries.map(({ action }) => action)).size, 59);
  assert.equal(new Set(entries.map(({ requestDto }) => requestDto)).size, 59);
  assert.equal(new Set(entries.map(({ responseDto }) => responseDto)).size, 59);

  const apiSource = read('miniprogram', 'shared', 'types', 'api.ts');
  const validErrorCodes = new Set(
    [...apiSource.matchAll(/^  ([A-Z][A-Z_]+): '[A-Z_]+'[,]?$/gm)].map((match) => match[1]),
  );

  for (const entry of entries) {
    assert.match(entry.requestDto, /Request$/);
    assert.match(entry.responseDto, /Response$/);
    assert.ok(['PUBLIC', 'USER', 'REVIEWER', 'ADMIN'].includes(entry.auth));
    assert.ok(['REQUIRED', 'NOT_APPLICABLE'].includes(entry.idempotency));
    assert.ok(Array.isArray(entry.writableCollections));
    assert.ok(Array.isArray(entry.errorCodes) && entry.errorCodes.includes('NOT_IMPLEMENTED'));
    entry.errorCodes.forEach((code) => assert.ok(validErrorCodes.has(code), `${entry.action}: ${code}`));
    if (entry.writableCollections.length > 0) {
      assert.equal(entry.idempotency, 'REQUIRED', entry.action);
      assert.ok(entry.writableCollections.includes('idempotency_keys'), entry.action);
      assert.ok(entry.writableCollections.includes('audit_logs'), entry.action);
    }
  }
});

test('machine-readable action docs and CloudActionMap have identical action and DTO mappings', () => {
  const mapSource = read('miniprogram', 'shared', 'contracts', 'action-map.ts');
  const mapEntries = [...mapSource.matchAll(
    /^  readonly '([^']+)': \{ readonly request: ([A-Za-z0-9]+); readonly response: ([A-Za-z0-9]+) \};$/gm,
  )].map(([, action, requestDto, responseDto]) => ({ action, requestDto, responseDto }));
  const docsEntries = actionDocs.flatMap((document) => document.actions)
    .map(({ action, requestDto, responseDto }) => ({ action, requestDto, responseDto }));

  assert.equal(mapEntries.length, 59);
  assert.deepEqual(mapEntries, docsEntries);
  assert.match(mapSource, /readonly payload: CloudActionDtoMap\[Action\]\['request'\]/);
  assert.match(mapSource, /readonly data: CloudActionDtoMap\[Action\]\['response'\]/);
  assert.match(mapSource, /CloudActionMap\[Action\]\['payload'\]/);
  assert.match(mapSource, /CloudActionMap\[Action\]\['data'\]/);

  const registrySource = read('miniprogram', 'shared', 'contracts', 'action-registry.ts');
  const registryActions = [...registrySource.matchAll(/^  '([^']+)': \{$/gm)].map((match) => match[1]);
  assert.deepEqual(registryActions, docsEntries.map(({ action }) => action));
});

test('machine-readable action metadata exactly mirrors the TypeScript registry source', () => {
  const registrySource = read('miniprogram', 'shared', 'contracts', 'action-registry.ts');
  const errorProfiles = new Map(
    [...registrySource.matchAll(/^const ([A-Z_]+_ERRORS) = \[([\s\S]*?)^\] as const;$/gm)]
      .map(([, name, body]) => [
        name,
        [...body.matchAll(/ApiErrorCode\.([A-Z_]+)/g)].map((match) => match[1]),
      ]),
  );
  const registryEntries = new Map(
    [...registrySource.matchAll(/^  '([^']+)': \{\n([\s\S]*?)^  \},$/gm)].map(([, action, body]) => {
      const errorExpression = body.match(/errorCodes:\s*(\[[^\]]+\]|[^,\n]+)/s)?.[1]?.trim() ?? '';
      const baseProfile = errorExpression.match(/(?:\.\.\.)?([A-Z_]+_ERRORS)/)?.[1];
      const appendedCodes = [...errorExpression.matchAll(/ApiErrorCode\.([A-Z_]+)/g)]
        .map((match) => match[1]);
      const writableBody = body.match(/writableCollections:\s*\[([^\]]*)\]/s)?.[1] ?? '';
      return [action, {
        action,
        requestDto: body.match(/requestDto:\s*'([^']+)'/)?.[1],
        responseDto: body.match(/responseDto:\s*'([^']+)'/)?.[1],
        auth: body.match(/auth:\s*AuthRequirement\.([A-Z_]+)/)?.[1],
        writableCollections: [...writableBody.matchAll(/'([^']+)'/g)].map((match) => match[1]),
        idempotency: body.match(/idempotency:\s*IdempotencyRequirement\.([A-Z_]+)/)?.[1],
        errorCodes: [...(errorProfiles.get(baseProfile) ?? []), ...appendedCodes],
        functionName: body.match(/functionName:\s*'([^']+)'/)?.[1],
      }];
    }),
  );
  const docsEntries = actionDocs.flatMap((document) =>
    document.actions.map((entry) => ({ ...entry, functionName: document.functionName })));

  assert.equal(registryEntries.size, 59);
  for (const expected of docsEntries) {
    const actual = registryEntries.get(expected.action);
    assert.ok(actual, expected.action);
    assert.deepEqual(actual, expected);
  }
});

test('geography is exactly 7 countries and 13 cities with frozen names and IANA zones', () => {
  const geography = readJson('docs', 'contracts', 'geography.json');
  const expectedCountries = [
    ['cn', '中国', 'China'], ['ch', '瑞士', 'Switzerland'], ['it', '意大利', 'Italy'],
    ['fr', '法国', 'France'], ['au', '澳大利亚', 'Australia'],
    ['sg', '新加坡', 'Singapore'], ['ca', '加拿大', 'Canada'],
  ];
  const expectedCities = [
    ['cn-beijing', '北京', 'Beijing', 'Asia/Shanghai'],
    ['cn-shanghai', '上海', 'Shanghai', 'Asia/Shanghai'],
    ['cn-guangzhou', '广州', 'Guangzhou', 'Asia/Shanghai'],
    ['cn-shenzhen', '深圳', 'Shenzhen', 'Asia/Shanghai'],
    ['cn-hangzhou', '杭州', 'Hangzhou', 'Asia/Shanghai'],
    ['ch-zurich', '苏黎世', 'Zurich', 'Europe/Zurich'],
    ['it-milan', '米兰', 'Milan', 'Europe/Rome'],
    ['fr-paris', '巴黎', 'Paris', 'Europe/Paris'],
    ['au-melbourne', '墨尔本', 'Melbourne', 'Australia/Melbourne'],
    ['au-sydney', '悉尼', 'Sydney', 'Australia/Sydney'],
    ['sg-singapore', '新加坡', 'Singapore', 'Asia/Singapore'],
    ['ca-toronto', '多伦多', 'Toronto', 'America/Toronto'],
    ['ca-vancouver', '温哥华', 'Vancouver', 'America/Vancouver'],
  ];
  assert.deepEqual(
    geography.countries.map(({ id, name }) => [id, name.zh, name.en]),
    expectedCountries,
  );
  assert.deepEqual(
    geography.cities.map(({ id, name, timezone }) => [id, name.zh, name.en, timezone]),
    expectedCities,
  );
  assert.equal(geography.operationalStateStorage, 'separate-runtime-records');
  geography.cities.forEach((city) => assert.equal('operationalState' in city, false));
  assert.deepEqual(
    geography.hierarchyRules.map(({ level, parentLevel }) => [level, parentLevel]),
    [['GLOBAL', null], ['REGION', 'GLOBAL'], ['COUNTRY', 'REGION'], ['CITY', 'COUNTRY'], ['CLUB_NODE', 'CITY'], ['EVENT', 'CLUB_NODE']],
  );

  const countryIds = new Set(geography.countries.map(({ id }) => id));
  geography.cities.forEach((city) => assert.ok(countryIds.has(city.parentId), city.id));
});

test('ReviewStatus contains only the eight legal migrations', () => {
  const source = read('miniprogram', 'shared', 'constants', 'review-transitions.ts');
  const transitions = [...source.matchAll(
    /\[ReviewStatus\.([A-Z_]+), ReviewStatus\.([A-Z_]+)\]/g,
  )].map(([, from, to]) => `${from}->${to}`);
  const expectedTransitions = [
    'DRAFT->SUBMITTED',
    'SUBMITTED->UNDER_REVIEW',
    'UNDER_REVIEW->APPROVED',
    'UNDER_REVIEW->REJECTED',
    'UNDER_REVIEW->NEEDS_CHANGES',
    'NEEDS_CHANGES->SUBMITTED',
    'APPROVED->EXPIRED',
    'APPROVED->REVOKED',
  ];
  assert.deepEqual(transitions, expectedTransitions);
  const machineContract = readJson('docs', 'contracts', 'state-machines.json');
  assert.equal(machineContract.contractVersion, '1.0.0');
  assert.deepEqual(
    machineContract.reviewTransitions.map(([from, to]) => `${from}->${to}`),
    expectedTransitions,
  );
});

test('verification withdrawal is an atomic tombstone deletion, not a hidden review status', () => {
  const stateContract = readJson('docs', 'contracts', 'state-machines.json');
  const withdrawal = stateContract.verificationWithdrawal;
  assert.deepEqual(withdrawal.allowedPreviousStatuses, ['DRAFT', 'SUBMITTED']);
  assert.equal(withdrawal.persistence, 'ATOMIC_PHYSICAL_DELETE');
  assert.equal(withdrawal.response, 'VerificationWithdrawalTombstone');
  assert.equal(withdrawal.requiresExpectedVersion, true);
  assert.equal(withdrawal.requiresIdempotencyKey, true);
  assert.equal(withdrawal.auditAppend, true);
  assert.deepEqual(withdrawal.projectionInvalidation, {
    kind: 'VERIFICATION_CHANGED',
    reason: 'VERIFICATION_REQUEST_WITHDRAWN',
    sourceVersion: 'deletedVersion',
  });
  assert.equal(withdrawal.invalidStateError, 'REVIEW_INVALID_TRANSITION');
  assert.equal(stateContract.enums.ReviewStatus.includes('WITHDRAWN'), false);
  assert.equal(
    stateContract.reviewTransitions.some(([from, to]) => from === 'WITHDRAWN' || to === 'WITHDRAWN'),
    false,
  );

  const actionTypes = read('miniprogram', 'shared', 'contracts', 'action-types.ts');
  const responseBlock = actionTypes.slice(
    actionTypes.indexOf('export interface VerificationWithdrawResponse'),
    actionTypes.indexOf('export interface GeoListRegionsRequest'),
  );
  assert.match(actionTypes, /interface VerificationWithdrawalTombstone/);
  assert.match(actionTypes, /previousStatus: typeof ReviewStatus\.DRAFT \| typeof ReviewStatus\.SUBMITTED/);
  assert.match(actionTypes, /readonly expectedVersion: OptimisticVersion/);
  assert.match(responseBlock, /readonly withdrawal: VerificationWithdrawalTombstone/);
  assert.doesNotMatch(responseBlock, /readonly request: VerificationRequestProjection/);

  const entry = actionDocs.flatMap((document) => document.actions)
    .find(({ action }) => action === 'verification.withdraw');
  assert.ok(entry.writableCollections.includes('verification_requests'));
  assert.ok(entry.writableCollections.includes('idempotency_keys'));
  assert.ok(entry.writableCollections.includes('audit_logs'));
  assert.ok(entry.writableCollections.includes('projection_invalidations'));
  assert.ok(entry.errorCodes.includes('REVIEW_INVALID_TRANSITION'));
});

function collectSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) ? [path] : [];
  });
}

test('state enum values have one TypeScript source and an exact v1.0.0 machine mirror', () => {
  const machineContract = readJson('docs', 'contracts', 'state-machines.json');
  const enumSource = read('miniprogram', 'shared', 'types', 'enums.ts');
  const canonicalPath = join(root, 'miniprogram', 'shared', 'types', 'enums.ts');
  const geographyPath = join(root, 'miniprogram', 'shared', 'constants', 'geography.ts');
  const sourceFiles = collectSourceFiles(join(root, 'miniprogram'));

  for (const [name, expectedValues] of Object.entries(machineContract.enums)) {
    const block = enumSource.match(new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\n\\} as const;`));
    assert.ok(block, name);
    const actualValues = [...block[1].matchAll(/:\s*'([A-Z_]+)'/g)].map((match) => match[1]);
    assert.deepEqual(actualValues, expectedValues, name);
    for (const path of sourceFiles) {
      if (path === canonicalPath) continue;
      assert.doesNotMatch(
        readFileSync(path, 'utf8'),
        new RegExp(`^(?:export\\s+)?(?:const|type|enum)\\s+${name}\\b`, 'm'),
        `${relative(root, path)} redeclares ${name}`,
      );
    }
  }

  for (const name of ['CountryId', 'CityId']) {
    for (const path of sourceFiles) {
      if (path === geographyPath) continue;
      assert.doesNotMatch(
        readFileSync(path, 'utf8'),
        new RegExp(`^(?:export\\s+)?(?:const|type|enum)\\s+${name}\\b`, 'm'),
        `${relative(root, path)} redeclares ${name}`,
      );
    }
  }
});

test('frozen client contracts contain no unsafe catch-all types or free-key DTOs', () => {
  const sharedRoot = join(root, 'miniprogram', 'shared');
  for (const path of collectSourceFiles(sharedRoot)) {
    const source = readFileSync(path, 'utf8');
    const label = relative(root, path);
    assert.doesNotMatch(source, /\b(?:any|unknown)\b/, label);
    assert.doesNotMatch(source, /Record\s*<\s*string\s*,/, label);
    assert.doesNotMatch(source, /\[\s*key\s*:\s*string\s*\]/, label);
  }
});

test('all error codes have a safe discriminated details mapping', () => {
  const source = read('miniprogram', 'shared', 'types', 'api.ts');
  const codes = [...source.matchAll(/^  ([A-Z][A-Z_]+): '[A-Z_]+'[,]?$/gm)].map((match) => match[1]);
  assert.ok(codes.length >= 20);
  for (const code of codes) assert.match(source, new RegExp(`readonly ${code}: [A-Za-z]+ErrorDetails;`));
  assert.match(source, /ApiErrorDetailsMap\[Code\]/);
  assert.match(source, /readonly \[Code in ApiErrorCode\]/);
});

test('all required read-only projection names and invalidation fields are frozen', () => {
  const source = read('miniprogram', 'shared', 'types', 'projections.ts');
  const projections = [
    'SessionProjection', 'ProfilePrivateDto', 'PublicCardProjection',
    'ShareResolutionProjection', 'ViewerRelationshipProjection',
    'PublicVerificationClaimProjection', 'PublicOrganizerProjection',
    'PublicEventProjection', 'PublicContentProjection', 'ReviewCaseProjection',
    'AuditEntryProjection', 'ProjectionInvalidation',
  ];
  projections.forEach((name) => assert.match(source, new RegExp(`(?:interface|type) ${name}\\b`)));

  const invalidation = source.slice(source.indexOf('interface ProjectionInvalidation'));
  ['eventId', 'kind', 'sourceAggregateId', 'sourceVersion', 'occurredAt', 'reason', 'requestId']
    .forEach((field) => assert.match(invalidation, new RegExp(`readonly ${field}:`)));
});

test('the generic share contract closes both card and event cold-start flows', () => {
  const actionTypes = read('miniprogram', 'shared', 'contracts', 'action-types.ts');
  const projections = read('miniprogram', 'shared', 'types', 'projections.ts');
  const pageFactory = read('miniprogram', 'shared', 'utils', 'placeholder-page.ts');
  const cardEntry = read('miniprogram', 'pages', 'card-share', 'index.ts');
  const eventEntry = read('miniprogram', 'pages', 'event-share', 'index.ts');
  const shareResolveContract = actionDocs
    .flatMap((document) => document.actions)
    .find(({ action }) => action === 'share.resolve');
  assert.match(actionTypes, /targetType: 'CARD'; readonly targetId: CardId/);
  assert.match(actionTypes, /targetType: 'EVENT'; readonly targetId: EventId/);
  assert.match(actionTypes, /readonly token: string; readonly scene\?: never/);
  assert.match(actionTypes, /readonly scene: string; readonly token\?: never/);
  assert.match(actionTypes, /targetType: 'CARD'; readonly page: 'pages\/card-share\/index'/);
  assert.match(actionTypes, /targetType: 'EVENT'; readonly page: 'pages\/event-share\/index'/);
  assert.match(projections, /readonly targetType: 'EVENT';[\s\S]*?readonly event: PublicEventProjection/);
  assert.match(projections, /readonly revoked: false/);
  assert.doesNotMatch(projections, /readonly revoked: boolean/);
  assert.ok(shareResolveContract.errorCodes.includes('TOKEN_EXPIRED'));
  assert.ok(shareResolveContract.errorCodes.includes('TOKEN_REVOKED'));
  assert.match(pageFactory, /action: 'share\.resolve' as const/);
  assert.match(pageFactory, /import[\s\S]*ShareEntryQuery[\s\S]*from '\.\.\/contracts'/);
  assert.doesNotMatch(pageFactory, /^(?:export\s+)?(?:interface|type)\s+ShareEntryQuery\b/m);
  assert.match(cardEntry, /createShareEntryPage\('名片分享入口', 'CARD'\)/);
  assert.match(eventEntry, /createShareEntryPage\('活动分享入口', 'EVENT'\)/);
});

test('execution evidence and visual tokens stay on the frozen values', () => {
  const schema = readJson('docs', 'contracts', 'execution-evidence.schema.json');
  assert.deepEqual(schema.properties.phase.enum, [
    'FOUNDATION', 'FEATURE_MODULE', 'FINAL_INTEGRATION',
  ]);
  assert.deepEqual(schema.properties.overall.enum, [
    'INCOMPLETE', 'BLOCKED', 'LOCAL_TEST_PASS', 'INTEGRATION_READY',
    'RELEASE_CANDIDATE', 'RELEASED',
  ]);
  assert.deepEqual(schema.$defs.gate.properties.status.enum, [
    'PASS', 'FAIL', 'UNVERIFIED', 'NOT_APPLICABLE',
  ]);
  const tokens = read('miniprogram', 'shared', 'design-tokens', 'tokens.wxss').toUpperCase();
  ['#173C32', '#F6F1E7', '#A67C3D', '#FCFBF7', '#1C2723'].forEach((color) =>
    assert.match(tokens, new RegExp(color)));
  assert.match(tokens, /MIN-HEIGHT: 88RPX/);
  assert.match(tokens, /PREFERS-REDUCED-MOTION/);
});

test('execution evidence schema rejects dishonest overall and gate combinations', () => {
  const schema = readJson('docs', 'contracts', 'execution-evidence.schema.json');
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const gateNames = [
    'local', 'devtoolsPreview', 'iosDevice', 'androidDevice', 'devVersionUpload', 'release',
  ];
  const makeManifest = (overall, phase, passedGateNames = []) => ({
    contractVersion: '1.0.0',
    module: 'contract-test',
    phase,
    generatedAt: '2026-08-27T00:00:00Z',
    overall,
    gates: Object.fromEntries(gateNames.map((name) => [
      name,
      passedGateNames.includes(name)
        ? { status: 'PASS', evidence: [`${name} evidence`] }
        : { status: 'UNVERIFIED', evidence: [] },
    ])),
  });
  const expectValid = (manifest, label) => {
    assert.equal(validate(manifest), true, `${label}: ${JSON.stringify(validate.errors)}`);
  };
  const expectInvalid = (manifest, label) => {
    assert.equal(validate(manifest), false, label);
  };

  expectValid(makeManifest('INCOMPLETE', 'FEATURE_MODULE'), 'feature incomplete');
  expectValid(makeManifest('LOCAL_TEST_PASS', 'FEATURE_MODULE', ['local']), 'feature local pass');
  expectValid(
    makeManifest('INTEGRATION_READY', 'FINAL_INTEGRATION', ['local', 'devtoolsPreview']),
    'integration ready minimum',
  );
  expectValid(
    makeManifest('RELEASE_CANDIDATE', 'FINAL_INTEGRATION', gateNames.slice(0, 5)),
    'release candidate minimum',
  );
  expectValid(makeManifest('RELEASED', 'FINAL_INTEGRATION', gateNames), 'released minimum');

  const emptyPassEvidence = makeManifest('INCOMPLETE', 'FOUNDATION', ['local']);
  emptyPassEvidence.gates.local.evidence = [];
  expectInvalid(emptyPassEvidence, 'PASS requires non-empty evidence');
  expectInvalid(
    makeManifest('LOCAL_TEST_PASS', 'FOUNDATION'),
    'LOCAL_TEST_PASS requires local PASS',
  );
  expectInvalid(
    makeManifest('INTEGRATION_READY', 'FINAL_INTEGRATION', ['local']),
    'INTEGRATION_READY requires preview PASS',
  );
  expectInvalid(
    makeManifest('RELEASE_CANDIDATE', 'FINAL_INTEGRATION', ['local', 'devtoolsPreview', 'iosDevice', 'devVersionUpload']),
    'RELEASE_CANDIDATE requires both device gates PASS',
  );
  expectInvalid(
    makeManifest('RELEASED', 'FINAL_INTEGRATION', gateNames.slice(0, 5)),
    'RELEASED requires release PASS',
  );
  expectInvalid(
    makeManifest('INTEGRATION_READY', 'FEATURE_MODULE', ['local', 'devtoolsPreview']),
    'feature modules cannot exceed LOCAL_TEST_PASS',
  );
  const missingPhase = makeManifest('INCOMPLETE', 'FOUNDATION');
  delete missingPhase.phase;
  expectInvalid(missingPhase, 'phase is required for scope enforcement');
});
