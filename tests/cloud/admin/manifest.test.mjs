import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const readJson = (relativePath) => JSON.parse(readFileSync(
  new URL(`../../../${relativePath}`, import.meta.url),
  'utf8',
));

const manifest = readJson('integration/manifests/admin.json');
const schema = readJson('integration/manifests/schema.json');

test('admin evidence manifest follows the frozen overall plus gates schema and stays blocked honestly', () => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  assert.equal(validate(manifest), true, JSON.stringify(validate.errors));
  assert.equal(manifest.module, 'admin');
  assert.equal(manifest.phase, 'FEATURE_MODULE');
  assert.equal(manifest.overall, 'BLOCKED');
  assert.equal(manifest.gates.local.status, 'PASS');
  for (const gate of ['devtoolsPreview', 'iosDevice', 'androidDevice', 'devVersionUpload', 'release']) {
    assert.equal(manifest.gates[gate].status, 'UNVERIFIED');
  }
});

test('manifest contains the seven required decision evidence groups and security artifacts', () => {
  const checks = new Map(manifest.checks.map((check) => [check.id, check]));
  for (const id of [
    'unauthorized-evidence',
    'authorized-evidence',
    'version-conflict-evidence',
    'approve-evidence',
    'reject-evidence',
    'request-changes-evidence',
    'revoke-evidence',
    'rbac-matrix',
    'redacted-append-only-audit',
    'projection-invalidation-example',
  ]) {
    assert.equal(checks.get(id)?.status, 'PASS', `${id} must contain passing local evidence`);
  }
  assert.match(checks.get('redacted-append-only-audit').evidence, /audit_REDACTED/);
  assert.doesNotMatch(checks.get('redacted-append-only-audit').evidence, /private\.invalid|raw-material/i);
  assert.match(checks.get('projection-invalidation-example').evidence, /VERIFICATION_CHANGED/);
  assert.match(checks.get('rbac-matrix').evidence, /REVIEWER=.*EVENT_MANAGER=.*CONTENT_MANAGER=.*SUPER_ADMIN=/);
});

test('manifest never promotes the fixture into production or a real operations team', () => {
  const serialized = JSON.stringify(manifest);
  assert.match(serialized, /SYNTHETIC_TEST_FIXTURE/);
  assert.match(serialized, /productionData=false/);
  assert.match(serialized, /humanOperationsTeamEstablished=false/);
  assert.match(serialized, /default exported adminApi main is intentionally the frozen NOT_IMPLEMENTED boundary/i);
  assert.match(serialized, /Frozen review\.get is read-only/);
  assert.doesNotMatch(serialized, /real operations team (?:is|was) established/i);
});
