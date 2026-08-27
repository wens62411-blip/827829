import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const read = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8');

async function loadBundledTypeScript(relativePath) {
  const result = await build({
    entryPoints: [resolve(root, relativePath)],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'es2020',
    write: false,
    logLevel: 'silent',
  });
  const source = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}#${Date.now()}-${Math.random()}`);
}

function versionedClaim(overrides = {}) {
  return {
    claimId: 'claim_synthetic_123456',
    subjectUserId: 'user_synthetic_123456',
    labelId: 'label_synthetic_123456',
    labelText: { zh: '合成标签', en: 'Synthetic label' },
    reviewStatus: 'APPROVED',
    verificationState: 'HUMAN_REVIEWED',
    publicVisible: true,
    validFrom: '2026-01-01T00:00:00.000Z',
    validUntil: '2027-01-01T00:00:00.000Z',
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test('card presenter accepts only the frozen short bearer shape and exactly one query reference', async () => {
  const presenter = await loadBundledTypeScript('miniprogram/pages/card/services/card-presenter.ts');
  const bearer = `sc_${'A'.repeat(27)}`;
  assert.equal(presenter.isSafeShareBearer(bearer), true);
  for (const invalid of [
    'short',
    `sc_${'A'.repeat(26)}`,
    `sc_${'A'.repeat(28)}`,
    `sc_${'A'.repeat(26)}!`,
    `token_${'A'.repeat(27)}`,
  ]) assert.equal(presenter.isSafeShareBearer(invalid), false, invalid);

  assert.deepEqual(presenter.normalizeShareReference({ token: bearer }), {
    ok: true,
    reference: { token: bearer },
  });
  assert.deepEqual(presenter.normalizeShareReference({ scene: encodeURIComponent(bearer) }), {
    ok: true,
    reference: { scene: bearer },
  });
  assert.equal(presenter.normalizeShareReference({}).ok, false);
  assert.equal(presenter.normalizeShareReference({ token: bearer, scene: bearer }).ok, false);
});

test('share exports use the stranger-safe projection and never put a view-specific name in the title', async () => {
  const presenter = await loadBundledTypeScript('miniprogram/pages/card/services/card-presenter.ts');
  const privateSentinel = 'PRIVATE_NAME_MUST_NOT_ENTER_SHARE_TITLE';
  assert.equal(presenter.safeShareTitle(privateSentinel), 'AB Club 数字名片');
  assert.equal(presenter.safeShareTitle(privateSentinel).includes(privateSentinel), false);

  const clientSource = read('miniprogram/pages/card/services/identity-client.ts');
  assert.match(
    clientSource,
    /export function getMyPublicCard\([\s\S]*?includePrivatePreview:\s*false/,
  );

  const sharePageSource = read('miniprogram/packageCard/pages/share/index.ts');
  assert.match(sharePageSource, /getMyPublicCard\(\)/);
  assert.doesNotMatch(sharePageSource, /\bgetMyCard\(\)/);
  assert.match(
    sharePageSource,
    /async generatePoster\(\)[\s\S]*?await getMyPublicCard\(\)[\s\S]*?drawPublicPoster\(canvas, activeCard\)/,
  );
});

test('claim filtering rejects malformed, future, expired, revoked, and non-human claims', async () => {
  const presenter = await loadBundledTypeScript('miniprogram/pages/card/services/card-presenter.ts');
  const now = Date.parse('2026-08-27T08:00:00.000Z');
  assert.equal(presenter.isEffectivePublicClaim(versionedClaim(), now), true);
  assert.equal(presenter.isEffectivePublicClaim(versionedClaim({ validFrom: 'not-a-date' }), now), false);
  assert.equal(presenter.isEffectivePublicClaim(versionedClaim({ validFrom: '2026-09-01T00:00:00.000Z' }), now), false);
  assert.equal(presenter.isEffectivePublicClaim(versionedClaim({ validUntil: '2026-08-27T08:00:00.000Z' }), now), false);
  assert.equal(presenter.isEffectivePublicClaim(versionedClaim({ reviewStatus: 'REVOKED' }), now), false);
  assert.equal(presenter.isEffectivePublicClaim(versionedClaim({ verificationState: 'AI_CONSISTENCY_CHECKED' }), now), false);
});

test('public-card sanitizer rebuilds the DTO allowlist and cannot retain an injected private field', async () => {
  const presenter = await loadBundledTypeScript('miniprogram/pages/card/services/card-presenter.ts');
  const card = {
    cardId: 'card_synthetic_123456',
    ownerUserId: 'user_synthetic_123456',
    displayName: '合成名片',
    cityId: 'cn-shenzhen',
    biography: '合成介绍',
    visibility: 'PUBLIC',
    claims: [versionedClaim()],
    origin: 'SYNTHETIC',
    verificationState: 'USER_DECLARED',
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    injectedPrivateValue: 'must-not-survive',
  };
  const sanitized = presenter.sanitizePublicCard(card);
  assert.equal('injectedPrivateValue' in sanitized, false);
  assert.deepEqual(Object.keys(sanitized).sort(), [
    'biography', 'cardId', 'cityId', 'claims', 'createdAt', 'displayName', 'origin',
    'ownerUserId', 'updatedAt', 'verificationState', 'version', 'visibility',
  ]);
});

test('editable introduction uses AI only for valid output and deterministically falls back otherwise', async () => {
  const introduction = await loadBundledTypeScript('miniprogram/pages/card/services/introduction-draft.ts');
  const context = { displayName: '林安然', cityName: '深圳' };
  const noGenerator = await introduction.createEditableIntroduction(context);
  assert.equal(noGenerator.source, 'TEMPLATE');
  assert.equal(noGenerator.fallbackReason, 'NO_GENERATOR');

  const accepted = await introduction.createEditableIntroduction(
    context,
    async () => '我在深圳关注可信社区，希望认识真诚且有行动力的同行。',
  );
  assert.equal(accepted.source, 'AI');

  const invalid = await introduction.createEditableIntroduction(context, async () => 'https://example.test');
  assert.equal(invalid.source, 'TEMPLATE');
  assert.equal(invalid.fallbackReason, 'INVALID_OUTPUT');

  const timedOut = await introduction.createEditableIntroduction(
    context,
    async () => new Promise((resolve) => setTimeout(() => resolve('迟到的生成结果不会采用。'), 25)),
    1,
  );
  assert.equal(timedOut.source, 'TEMPLATE');
  assert.equal(timedOut.fallbackReason, 'TIMEOUT');
});

test('revocation persistence stores only the non-secret shareTokenId pointer', async () => {
  const storage = new Map();
  globalThis.wx = {
    setStorageSync(key, value) { storage.set(key, structuredClone(value)); },
    getStorageSync(key) { return structuredClone(storage.get(key)); },
    removeStorageSync(key) { storage.delete(key); },
  };
  const pointer = await loadBundledTypeScript('miniprogram/pages/card/services/share-revocation-pointer.ts');
  const shareTokenId = 'share_synthetic_pointer_123';
  assert.equal(pointer.rememberShareForRevocation(shareTokenId), true);
  const serialized = JSON.stringify([...storage.values()]);
  assert.equal(serialized.includes('sc_AAAAAAAAAAAAAAAAAAAAAAAAAAA'), false);
  assert.deepEqual(Object.keys([...storage.values()][0]).sort(), ['contractVersion', 'savedAt', 'shareTokenId']);
  assert.equal(pointer.readShareRevocationPointer(), shareTokenId);
  pointer.forgetShareRevocationPointer();
  assert.equal(storage.size, 0);
  delete globalThis.wx;
});
