import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const miniRoot = resolve(root, 'miniprogram');
const manifestPath = resolve(miniRoot, 'assets', 'manifests', 'art.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const clone = (value) => JSON.parse(JSON.stringify(value));
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

function assetPath(asset) {
  if (typeof asset?.path !== 'string' || !asset.path.startsWith('/assets/art/')) return null;
  const candidate = resolve(miniRoot, `.${asset.path}`);
  const artRoot = resolve(miniRoot, 'assets', 'art');
  if (candidate !== artRoot && !candidate.startsWith(`${artRoot}${sep}`)) return null;
  return candidate;
}

function validateAsset(candidateManifest, asset) {
  const issues = [];
  const required = candidateManifest?.policy?.requiredFields;
  if (!Array.isArray(required)) return ['policy.requiredFields:required'];

  for (const field of required) {
    const value = asset?.[field];
    if (value === undefined || value === null || value === '') issues.push(`${field}:required`);
  }

  if (typeof asset?.sourceUrl !== 'string' || !asset.sourceUrl.startsWith('project://')) {
    issues.push('sourceUrl:project-source-required');
  }
  if (typeof asset?.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(asset.sha256)) {
    issues.push('sha256:format');
  }
  if (typeof asset?.alt !== 'string' || asset.alt.trim().length < 12) issues.push('alt:descriptive');
  if (!['REAL', 'SYNTHETIC'].includes(asset?.recordOrigin)) issues.push('recordOrigin:invalid');
  if (!['REAL_CONTENT_IMAGE', 'NOT_REAL_ARTWORK'].includes(asset?.representation)) {
    issues.push('representation:invalid');
  }
  if (!['UNVERIFIED', 'CLAIMED', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED'].includes(asset?.rightsStatus)) {
    issues.push('rightsStatus:invalid');
  }
  if (!Number.isInteger(asset?.width) || asset.width < 1) issues.push('width:positive-integer');
  if (!Number.isInteger(asset?.height) || asset.height < 1) issues.push('height:positive-integer');
  if (asset?.externalHotlink !== false) issues.push('externalHotlink:forbidden');

  if (asset?.assetId === candidateManifest?.policy?.defaultFallbackAssetId) {
    if (asset.recordOrigin !== 'SYNTHETIC') issues.push('fallback:synthetic-origin-required');
    if (asset.representation !== 'NOT_REAL_ARTWORK') issues.push('fallback:not-real-representation-required');
    if (asset.rightsStatus !== 'CLAIMED') issues.push('fallback:unreviewed-rights-must-not-be-approved');
    if (asset.reviewStatus !== 'DRAFT' || asset.rightsReviewedAt !== null) {
      issues.push('fallback:human-review-not-established');
    }
    if (asset.depictsRealArtwork !== false || asset.aiGenerated !== false) {
      issues.push('fallback:non-real-project-vector-required');
    }
  }

  const file = assetPath(asset);
  if (file === null || asset.path.includes('..') || asset.path.includes('\\')) {
    issues.push('path:unsafe');
  } else if (!existsSync(file)) {
    issues.push('path:not-found');
  } else if (typeof asset.sha256 === 'string' && sha256(file) !== asset.sha256) {
    issues.push('sha256:mismatch');
  }
  return issues;
}

test('art rights manifest has a verified project-owned NOT_REAL_ARTWORK fallback', () => {
  assert.equal(manifest.schemaVersion, '1.0.0');
  assert.equal(Number.isNaN(Date.parse(manifest.generatedAt)), false);
  assert.equal(manifest.policy.runtimeExternalHotlinksAllowed, false);
  assert.equal(manifest.policy.aiGeneratedAssetMayRepresentRealWork, false);
  assert.equal(manifest.assets.length, 1);

  const fallback = manifest.assets[0];
  assert.deepEqual(validateAsset(manifest, fallback), []);
  assert.equal(manifest.policy.defaultFallbackAssetId, fallback.assetId);
  assert.equal(fallback.recordOrigin, 'SYNTHETIC');
  assert.equal(fallback.representation, 'NOT_REAL_ARTWORK');
  assert.equal(fallback.rightsStatus, 'CLAIMED');
  assert.equal(fallback.reviewStatus, 'DRAFT');
  assert.equal(fallback.rightsReviewedAt, null);
  assert.equal(fallback.depictsRealArtwork, false);
  assert.equal(fallback.aiGenerated, false);
  assert.match(fallback.alt, /非真实艺术品/);

  const svg = readFileSync(assetPath(fallback), 'utf8');
  assert.match(svg, /NOT REAL ARTWORK/);
  assert.match(svg, /非真实作品/);
  assert.doesNotMatch(svg, /<image\b|data:image|linearGradient|radialGradient/i);
});

test('quality gate fails every missing provenance, licence, integrity and accessibility field', () => {
  const fallback = manifest.assets[0];
  for (const field of manifest.policy.requiredFields) {
    const invalid = clone(fallback);
    delete invalid[field];
    assert.ok(
      validateAsset(manifest, invalid).includes(`${field}:required`),
      `${field} must be required`,
    );
  }
});

test('quality gate rejects a forged hash even when the manifest shape is otherwise valid', () => {
  const invalid = clone(manifest.assets[0]);
  invalid.sha256 = '0'.repeat(64);
  assert.ok(validateAsset(manifest, invalid).includes('sha256:mismatch'));
});

test('fallback cannot be relabelled as real content or human-approved rights evidence', () => {
  const invalid = clone(manifest.assets[0]);
  invalid.recordOrigin = 'REAL';
  invalid.representation = 'REAL_CONTENT_IMAGE';
  invalid.rightsStatus = 'APPROVED';
  const issues = validateAsset(manifest, invalid);
  assert.ok(issues.includes('fallback:synthetic-origin-required'));
  assert.ok(issues.includes('fallback:not-real-representation-required'));
  assert.ok(issues.includes('fallback:unreviewed-rights-must-not-be-approved'));
});

test('the fallback source path remains inside the owned art asset directory', () => {
  const file = assetPath(manifest.assets[0]);
  assert.ok(file);
  assert.equal(dirname(file), resolve(miniRoot, 'assets', 'art'));
});
