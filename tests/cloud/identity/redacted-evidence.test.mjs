import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const forbiddenPublicKeys = [
  'phone',
  'governmentid',
  'evidenceassetids',
  'verificationevidenceurls',
  'openid',
  'unionid',
  'wechatidentifiers',
  'riskcontrol',
  'rawtoken',
];

function visitKeys(value, path = 'apiResponse') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visitKeys(item, `${path}[${index}]`));
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert.equal(forbiddenPublicKeys.includes(key.toLowerCase()), false, `${path}.${key}`);
    visitKeys(child, `${path}.${key}`);
  }
}

test('redacted share projection is explicitly synthetic and has no restricted keys', async () => {
  const fixturePath = resolve(here, 'fixtures', 'redacted-share-projection.json');
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  assert.equal(fixture.evidence.state, 'SYNTHETIC');
  assert.equal(fixture.evidence.scope, 'LOCAL_TEST_ONLY');
  assert.equal(fixture.apiResponse.data.resolution.card.origin, 'SYNTHETIC');
  assert.equal(fixture.apiResponse.data.resolution.card.verificationState, 'USER_DECLARED');
  assert.deepEqual(fixture.apiResponse.data.resolution.card.claims, []);
  visitKeys(fixture.apiResponse);
});
