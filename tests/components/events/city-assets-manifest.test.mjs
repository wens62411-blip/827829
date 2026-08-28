import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const manifestPath = join(repoRoot, 'miniprogram', 'assets', 'manifests', 'cities.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const expectedCityIds = [
  'cn-beijing',
  'cn-shanghai',
  'cn-guangzhou',
  'cn-shenzhen',
  'cn-hangzhou',
  'ch-zurich',
  'it-milan',
  'fr-paris',
  'au-melbourne',
  'au-sydney',
  'sg-singapore',
  'ca-toronto',
  'ca-vancouver',
];
const requiredAssetFields = [
  'cityId',
  'landmark',
  'sourcePage',
  'author',
  'license',
  'downloadedAt',
  'sourceSha256',
  'sourceDimensions',
  'originalDimensions',
  'runtimeDimensions',
  'downloadUrl',
  'sha256',
  'alt',
];

function hasValue(value) {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null;
}

function jpegDimensions(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'city asset must be a JPEG');
  for (let offset = 2; offset + 8 < bytes.length;) {
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const length = bytes.readUInt16BE(offset);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  throw new Error('JPEG dimensions not found');
}

function assetPath(candidate, cityId) {
  return candidate.pathTemplate.replace('{cityId}', cityId);
}

function validateManifest(candidate, checkFiles = false) {
  const errors = [];
  if (candidate?.schemaVersion !== '1.2.0') errors.push('schemaVersion');
  if (candidate?.evidenceStatus !== 'LICENSE_SOURCE_VERIFIED_HUMAN_REVIEW_PENDING') errors.push('evidenceStatus');
  if (candidate?.runtimePolicy !== 'LOCAL_FILES_ONLY_NO_HOTLINK') errors.push('runtimePolicy');
  if (candidate?.pathTemplate !== '/assets/cities/{cityId}.jpg') errors.push('pathTemplate');
  if (candidate?.sourceProfile?.provider !== 'Wikimedia Commons') errors.push('sourceProfile.provider');
  if (candidate?.sourceProfile?.type !== 'PHOTOGRAPH') errors.push('sourceProfile.type');
  if (candidate?.sourceProfile?.downloadMethod !== 'WIKIMEDIA_API_THUMBNAIL_1920px_AND_3840px') {
    errors.push('sourceProfile.downloadMethod');
  }
  if (candidate?.processingProfile?.runtimeFormat !== 'JPEG' ||
      candidate?.processingProfile?.runtimeWidth !== 1152 ||
      candidate?.processingProfile?.runtimeHeight !== 648) {
    errors.push('processingProfile.runtime');
  }
  if (candidate?.rightsProfile?.rightsState !== 'CLAIMED') errors.push('rightsProfile.rightsState');
  if (candidate?.rightsProfile?.reviewStatus !== 'DRAFT') errors.push('rightsProfile.reviewStatus');
  if (candidate?.rightsProfile?.licenseEvidenceState !== 'SOURCE_PAGE_VERIFIED') {
    errors.push('rightsProfile.licenseEvidenceState');
  }
  if (candidate?.rightsProfile?.publicationPolicy !== 'HUMAN_RIGHTS_REVIEW_REQUIRED') {
    errors.push('rightsProfile.publicationPolicy');
  }
  if (candidate?.rightsProfile?.attributionRequired !== true) errors.push('rightsProfile.attributionRequired');
  if (candidate?.rightsProfile?.externalHotlink !== false) errors.push('rightsProfile.externalHotlink');
  if (!Array.isArray(candidate?.assets) || candidate.assets.length !== 13) {
    errors.push('assets.count');
    return errors;
  }

  const ids = candidate.assets.map((asset) => asset.cityId);
  if (JSON.stringify(ids) !== JSON.stringify(expectedCityIds)) errors.push('assets.cityId.order');
  if (new Set(ids).size !== ids.length) errors.push('assets.cityId.unique');

  for (const asset of candidate.assets) {
    for (const field of requiredAssetFields) {
      if (!hasValue(asset[field])) errors.push(`${asset.cityId || 'unknown'}.${field}`);
    }
    const localPath = assetPath(candidate, asset.cityId);
    if (/^https?:\/\//i.test(localPath)) errors.push(`${asset.cityId}.externalUrl`);
    if (!/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/i.test(asset.sourcePage || '')) {
      errors.push(`${asset.cityId}.sourcePage`);
    }
    if (/(?:images\.google|bing|baidu|\/search)/i.test(asset.sourcePage || '')) {
      errors.push(`${asset.cityId}.searchResult`);
    }
    if (!/^CC BY(?:-SA)? \d\.\d$/.test(asset.license || '')) errors.push(`${asset.cityId}.license`);
    const licenseUrl = candidate.licenseRegistry?.[asset.license];
    if (!/^https:\/\/creativecommons\.org\/licenses\/by(?:-sa)?\/\d\.\d\/$/.test(licenseUrl || '')) {
      errors.push(`${asset.cityId}.licenseRegistry`);
    }
    if (!/^\d{4}-\d{2}-\d{2}T/.test(asset.downloadedAt || '')) errors.push(`${asset.cityId}.downloadedAt`);
    if (!/^[a-f0-9]{64}$/.test(asset.sha256 || '')) errors.push(`${asset.cityId}.sha256`);
    if (!/^[a-f0-9]{64}$/.test(asset.sourceSha256 || '')) errors.push(`${asset.cityId}.sourceSha256`);
    if (!Array.isArray(asset.sourceDimensions) ||
        asset.sourceDimensions.length !== 2 ||
        asset.sourceDimensions.some((value) => !Number.isInteger(value) || value <= 0)) {
      errors.push(`${asset.cityId}.sourceDimensions`);
    }
    if (!Array.isArray(asset.originalDimensions) ||
        asset.originalDimensions.length !== 2 ||
        asset.originalDimensions.some((value) => !Number.isInteger(value) || value <= 0)) {
      errors.push(`${asset.cityId}.originalDimensions`);
    }
    if (!Array.isArray(asset.runtimeDimensions) ||
        asset.runtimeDimensions.length !== 2 ||
        asset.runtimeDimensions[0] !== candidate.processingProfile.runtimeWidth ||
        asset.runtimeDimensions[1] !== candidate.processingProfile.runtimeHeight) {
      errors.push(`${asset.cityId}.runtimeDimensions`);
    }
    const requestedWidth = Number(new URL(asset.downloadUrl || 'https://invalid.local/').searchParams.get('width'));
    if (!/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:Redirect\/file\//i.test(asset.downloadUrl || '') ||
        ![1920, 3840].includes(requestedWidth) ||
        asset.sourceDimensions?.[0] !== requestedWidth) {
      errors.push(`${asset.cityId}.downloadUrl`);
    }
    if (asset.originalDimensions?.[0] < asset.sourceDimensions?.[0] ||
        asset.originalDimensions?.[1] < asset.sourceDimensions?.[1]) {
      errors.push(`${asset.cityId}.originalDimensionsBelowSource`);
    }

    if (checkFiles) {
      const filePath = join(repoRoot, 'miniprogram', ...localPath.slice(1).split('/'));
      if (!existsSync(filePath)) {
        errors.push(`${asset.cityId}.fileMissing`);
      } else {
        const bytes = readFileSync(filePath);
        const digest = createHash('sha256').update(bytes).digest('hex');
        if (digest !== asset.sha256) errors.push(`${asset.cityId}.hashMismatch`);
        const dimensions = jpegDimensions(bytes);
        if (dimensions.width !== candidate.processingProfile.runtimeWidth ||
            dimensions.height !== candidate.processingProfile.runtimeHeight) {
          errors.push(`${asset.cityId}.dimensionMismatch`);
        }
      }
    }
  }
  return errors;
}

test('city asset manifest covers the frozen 13-city order and matches every local JPG hash', () => {
  assert.deepEqual(validateManifest(manifest, true), []);
  assert.deepEqual(manifest.assets.slice(0, 5).map((asset) => asset.cityId), [
    'cn-beijing',
    'cn-shanghai',
    'cn-guangzhou',
    'cn-shenzhen',
    'cn-hangzhou',
  ]);
});

test('every city photograph keeps explicit real-photo provenance, author, license, hash, dimensions and alt', () => {
  assert.equal(new Set(manifest.assets.map((asset) => asset.sourcePage)).size, 13);
  for (const asset of manifest.assets) {
    assert.ok(manifest.licenseRegistry[asset.license]);
    assert.ok([1920, 3840].includes(asset.sourceDimensions[0]));
    assert.deepEqual(asset.runtimeDimensions, [1152, 648]);
    assert.equal(
      Number(new URL(asset.downloadUrl).searchParams.get('width')),
      asset.sourceDimensions[0],
      `${asset.cityId} source width must match its Commons download URL`,
    );
    assert.match(asset.sourcePage, /wikimedia/i);
    assert.ok(asset.landmark.length > 1);
    assert.ok(asset.author.length > 1);
    assert.ok(asset.alt.length > 5);
  }
});

test('asset quality gate fails for every required per-city field omission', () => {
  for (const field of requiredAssetFields) {
    const candidate = structuredClone(manifest);
    delete candidate.assets[0][field];
    assert.ok(
      validateManifest(candidate).some((error) => error.endsWith(`.${field}`)),
      `missing ${field} must fail`,
    );
  }
});

test('asset quality gate rejects hotlinks, search results, bad hashes, blank alt, and false approval', () => {
  const mutations = [
    ['external path', (candidate) => { candidate.pathTemplate = 'https://example.com/{cityId}.jpg'; }, 'pathTemplate', false],
    ['search result', (candidate) => { candidate.assets[0].sourcePage = 'https://images.google.com/search?q=city'; }, 'sourcePage', false],
    ['blank alt', (candidate) => { candidate.assets[0].alt = ' '; }, '.alt', false],
    ['invalid hash', (candidate) => { candidate.assets[0].sha256 = 'bad'; }, '.sha256', false],
    ['valid-looking wrong local hash', (candidate) => { candidate.assets[0].sha256 = '0'.repeat(64); }, 'hashMismatch', true],
    ['invalid source hash', (candidate) => { candidate.assets[0].sourceSha256 = 'bad'; }, '.sourceSha256', false],
    ['wrong runtime profile dimensions', (candidate) => { candidate.processingProfile.runtimeWidth += 1; }, 'dimensionMismatch', true],
    ['wrong per-asset runtime dimensions', (candidate) => { candidate.assets[0].runtimeDimensions[0] += 1; }, 'runtimeDimensions', false],
    ['source/download width drift', (candidate) => { candidate.assets[0].downloadUrl = candidate.assets[0].downloadUrl.replace('width=1920', 'width=3840'); }, 'downloadUrl', false],
    ['hotlink flag', (candidate) => { candidate.rightsProfile.externalHotlink = true; }, 'externalHotlink', false],
    ['false rights approval', (candidate) => { candidate.rightsProfile.rightsState = 'APPROVED'; }, 'rightsState', false],
    ['false human approval', (candidate) => { candidate.rightsProfile.reviewStatus = 'APPROVED'; }, 'reviewStatus', false],
  ];
  for (const [label, mutate, expectedError, checkFiles] of mutations) {
    const candidate = structuredClone(manifest);
    mutate(candidate);
    assert.ok(
      validateManifest(candidate, checkFiles).some((error) => error.includes(expectedError)),
      `${label} must fail`,
    );
  }
});
