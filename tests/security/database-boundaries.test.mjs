import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const readJson = (...parts) => JSON.parse(readFileSync(join(root, ...parts), 'utf8'));

const expectedCollections = [
  'users', 'profiles_private', 'cards_public', 'card_share_tokens', 'friendships',
  'blocks_reports', 'label_catalog', 'verification_requests', 'verification_claims',
  'regions', 'countries', 'cities', 'club_nodes', 'organizers', 'events',
  'event_enrollments', 'art_items', 'art_collections', 'content_intents',
  'media_assets', 'orders', 'feature_flags', 'idempotency_keys', 'audit_logs',
  'projection_invalidations',
];

test('the explicit 25-collection schema and security rules are complete and default deny', () => {
  const schema = readJson('database', 'schemas', 'collections.json');
  const security = readJson('database', 'security-rules', 'client-access.json');
  const names = schema.collections.map((entry) => entry.name);
  assert.equal(schema.declaredCollectionCount, 25);
  assert.deepEqual(names, expectedCollections);
  assert.equal(new Set(names).size, 25);
  assert.deepEqual(Object.keys(security.rules), expectedCollections);

  Object.entries(security.rules).forEach(([collection, rule]) => {
    assert.equal(rule.write, false, `${collection} write`);
    assert.equal(rule.create, false, `${collection} create`);
    assert.equal(rule.update, false, `${collection} update`);
    assert.equal(rule.delete, false, `${collection} delete`);
  });

  const profile = schema.collections.find((entry) => entry.name === 'profiles_private');
  const publicCard = schema.collections.find((entry) => entry.name === 'cards_public');
  assert.ok(profile.privateFields.includes('phone'));
  assert.ok(publicCard.forbiddenFields.includes('phone'));
  assert.ok(publicCard.forbiddenFields.includes('evidenceAssetIds'));
  const cities = schema.collections.find((entry) => entry.name === 'cities');
  assert.equal(cities.recordKind, 'OPERATIONAL_OVERLAY');
  assert.equal(cities.required.includes('operationalState'), true);
  assert.equal(cities.required.includes('timezone'), false);
  assert.ok(cities.forbiddenFields.includes('timezone'));

  const shareTokens = schema.collections.find((entry) => entry.name === 'card_share_tokens');
  assert.ok(shareTokens.required.includes('targetType'));
  assert.ok(shareTokens.required.includes('targetId'));
  assert.equal(shareTokens.required.includes('targetCardId'), false);
  assert.deepEqual(shareTokens.discriminator.enum, ['CARD', 'EVENT']);
  assert.ok(shareTokens.forbiddenFields.includes('targetCardId'));
  assert.ok(shareTokens.forbiddenFields.includes('targetEventId'));

  const canonicalStateCollections = [
    'friendships', 'verification_requests', 'verification_claims', 'club_nodes',
    'organizers', 'events', 'event_enrollments', 'art_items', 'art_collections',
    'cities', 'orders',
  ];
  canonicalStateCollections.forEach((name) => {
    const entry = schema.collections.find((collection) => collection.name === name);
    assert.equal(Object.hasOwn(entry, 'states'), false, `${name} must not redefine a frozen enum`);
    assert.equal('stateEnumRef' in entry || 'stateEnumRefs' in entry, true, `${name} must reference canonical enums`);
  });
});

test('share token uniqueness and index fields match collection schemas', () => {
  const schema = readJson('database', 'schemas', 'collections.json');
  const indexContract = readJson('database', 'indexes', 'indexes.json');
  const tokenDigest = indexContract.indexes.find((entry) => entry.collection === 'card_share_tokens'
    && entry.name === 'token_digest_unique');
  const activeLookup = indexContract.indexes.find((entry) => entry.collection === 'card_share_tokens'
    && entry.name === 'active_target_lookup');
  assert.deepEqual(tokenDigest.fields.map(({ field }) => field), ['tokenDigest']);
  assert.equal(tokenDigest.unique, true);
  assert.deepEqual(activeLookup.fields.map(({ field }) => field), ['targetType', 'revoked', 'expiresAt']);
  assert.equal(activeLookup.unique, false);

  indexContract.indexes.forEach((index) => {
    const collection = schema.collections.find((entry) => entry.name === index.collection);
    const forbidden = new Set(collection?.forbiddenFields ?? []);
    index.fields.forEach(({ field }) => {
      assert.equal(forbidden.has(field), false, `${index.collection}.${index.name} indexes forbidden field ${field}`);
    });
  });
});

test('the 15-row writer/consumer matrix covers every collection without an orphan', () => {
  const matrix = readJson('database', 'collection-access-matrix.json');
  assert.equal(matrix.rowCount, 15);
  assert.equal(matrix.rows.length, 15);
  assert.deepEqual(matrix.rows.map((row) => row.id), Array.from({ length: 15 }, (_, index) => index + 1));
  const covered = new Set(matrix.rows.flatMap((row) => row.collections));
  assert.deepEqual([...covered].sort(), [...expectedCollections].sort());

  const audit = matrix.rows.find((row) => row.collections.includes('audit_logs'));
  const invalidations = matrix.rows.find((row) => row.collections.includes('projection_invalidations'));
  assert.deepEqual(audit.forbiddenOperations, ['update', 'delete']);
  assert.deepEqual(invalidations.forbiddenOperations, ['update', 'delete']);
});

test('seeds are empty and payment is disabled by schema default', () => {
  const seed = readJson('database', 'seeds', 'empty.json');
  const defaults = readJson('database', 'schemas', 'defaults.json');
  assert.deepEqual(seed.records, []);
  assert.equal(defaults.featureFlags.payment, 'DISABLED');
  assert.equal(JSON.stringify(seed).includes('APPROVED'), false);
  assert.equal(JSON.stringify(seed).includes('LIVE'), false);
});
