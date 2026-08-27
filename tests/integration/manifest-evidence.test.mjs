import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const readJson = (relativePath) =>
  JSON.parse(readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8'));

const schema = readJson('integration/manifests/schema.json');
const sharedSchema = readJson('docs/contracts/execution-evidence.schema.json');
const foundation = readJson('integration/manifests/foundation.json');
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const clone = (value) => JSON.parse(JSON.stringify(value));

test('foundation manifest has valid evidence and an honest local ceiling', () => {
  assert.equal(validate(foundation), true, JSON.stringify(validate.errors));
  assert.equal(foundation.overall, 'LOCAL_TEST_PASS');
  assert.equal(foundation.gates.local.status, 'PASS');
  for (const gate of ['devtoolsPreview', 'iosDevice', 'androidDevice', 'devVersionUpload', 'release']) {
    assert.equal(foundation.gates[gate].status, 'UNVERIFIED');
  }
});

test('integration and shared gate schemas accept the same optional note field', () => {
  assert.deepEqual(
    Object.keys(schema.$defs.gate.properties).sort(),
    Object.keys(sharedSchema.$defs.gate.properties).sort(),
  );
  const withNote = clone(foundation);
  withNote.gates.local.note = 'Local command evidence only.';
  assert.equal(validate(withNote), true, JSON.stringify(validate.errors));
});

test('feature modules cannot self-promote above LOCAL_TEST_PASS', () => {
  const invalid = clone(foundation);
  invalid.module = 'card';
  invalid.phase = 'FEATURE_MODULE';
  invalid.overall = 'INTEGRATION_READY';
  invalid.gates.devtoolsPreview.status = 'PASS';
  invalid.gates.devtoolsPreview.evidence = ['synthetic test evidence'];
  assert.equal(validate(invalid), false);
});

test('LOCAL_TEST_PASS requires a passed local gate with non-empty evidence', () => {
  const invalidStatus = clone(foundation);
  invalidStatus.gates.local.status = 'UNVERIFIED';
  assert.equal(validate(invalidStatus), false);

  const invalidEvidence = clone(foundation);
  invalidEvidence.gates.local.evidence = [];
  assert.equal(validate(invalidEvidence), false);
});
