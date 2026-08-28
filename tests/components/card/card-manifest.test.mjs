import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const readJson = (relativePath) => JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'));
const manifest = readJson('integration/manifests/card.json');
const schema = readJson('integration/manifests/schema.json');

test('card integration manifest follows the frozen overall plus gates schema', () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  assert.equal(validate(manifest), true, JSON.stringify(validate.errors));
  assert.equal(manifest.module, 'card');
  assert.equal(manifest.phase, 'FEATURE_MODULE');
  assert.equal(manifest.contractVersion, '1.0.0');
  assert.equal(manifest.overall, 'LOCAL_TEST_PASS');
  assert.equal(manifest.gates.local.status, 'PASS');
  for (const gate of ['devtoolsPreview', 'iosDevice', 'androidDevice', 'devVersionUpload', 'release']) {
    assert.equal(manifest.gates[gate].status, 'UNVERIFIED', gate);
  }
});

test('manifest requests every card route, component and frozen identity action', () => {
  const artifacts = new Set(manifest.artifacts);
  for (const route of [
    '/pages/me/index', '/pages/card/index', '/pages/card-share/index',
    '/packageCard/pages/edit/index', '/packageCard/pages/privacy/index',
    '/packageCard/pages/view/index', '/packageCard/pages/share/index',
  ]) assert.equal(artifacts.has(`ROUTE_REQUEST: ${route}`), true, route);

  for (const component of [
    '/components/ab-profile-card/index',
    '/components/ab-privacy-field/index',
    '/components/ab-share-state/index',
  ]) assert.equal(artifacts.has(`COMPONENT_EXPORT: ${component}`), true, component);

  for (const action of [
    'identity.bootstrap', 'profile.getMine', 'profile.updateMine', 'card.getMine',
    'card.getForViewer', 'card.refreshProjection', 'share.create', 'share.resolve',
    'share.revoke', 'share.createQrScene',
  ]) assert.equal(artifacts.has(`CLOUD_ACTION: ${action}`), true, action);
});

test('manifest exposes every requested visual and redacted projection as local-only evidence', () => {
  const expected = [
    'me.png', 'card-self.png', 'card-stranger.png', 'card-friend.png',
    'privacy.png', 'share-success.png', 'share-expired.png', 'share-revoked.png',
    'contact-sheet.png',
  ];
  for (const file of expected) {
    const relativePath = `tests/components/card/evidence/screenshots/${file}`;
    assert.equal(manifest.artifacts.includes(`LOCAL_STATIC_RENDER: ${relativePath}`), true, file);
    assert.equal(existsSync(resolve(root, relativePath)), true, file);
  }
  const fixture = 'tests/cloud/identity/fixtures/redacted-share-projection.json';
  assert.equal(manifest.artifacts.includes(`EVIDENCE_PROJECTION: ${fixture}`), true);
  assert.equal(existsSync(resolve(root, fixture)), true);
  assert.match(manifest.gates.devtoolsPreview.evidence.join(' '), /NOT WECHAT DEVTOOLS/);
});

test('manifest keeps frozen contract and production runtime gaps explicit', () => {
  const checks = new Map(manifest.checks.map((check) => [check.id, check.status]));
  assert.equal(checks.get('rich-profile-field-visibility-contract'), 'FAIL');
  assert.equal(checks.get('all-writes-expected-version'), 'FAIL');
  assert.equal(checks.get('production-cloudbase-runtime'), 'FAIL');
  assert.equal(checks.get('wechat-runtime-share-qr-canvas-album'), 'UNVERIFIED');
  assert.equal(manifest.knownGaps.some((gap) => gap.includes('NOT_IMPLEMENTED')), true);
  assert.equal(manifest.knownGaps.some((gap) => gap.includes('card_share_tokens schema')), true);
  assert.equal(manifest.knownGaps.some((gap) => gap.includes('synthetic local evidence')), true);
});
