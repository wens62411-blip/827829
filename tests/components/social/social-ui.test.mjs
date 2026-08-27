import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const root = new URL('../../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const componentPaths = [
  'miniprogram/components/ab-friend-request',
  'miniprogram/components/ab-tag-application',
  'miniprogram/components/ab-review-timeline',
];

test('social pages use 申请认识 language and expose no chat or admin decision control', () => {
  const wxml = [
    'miniprogram/pages/network/index.wxml',
    'miniprogram/packageSocial/pages/requests/index.wxml',
    'miniprogram/packageSocial/pages/friend/index.wxml',
    'miniprogram/packageSocial/pages/tag-apply/index.wxml',
    'miniprogram/packageSocial/pages/tag-status/index.wxml',
  ].map(read).join('\n');
  assert.match(wxml, /申请认识/);
  assert.match(wxml, /AB Club 平台关系/);
  assert.match(wxml, /不会(?:发起)?微信好友|不会添加微信好友/);
  assert.doesNotMatch(wxml, /<(?:button|navigator)[^>]*>[^<]*(?:聊天|发消息)[^<]*<\/(?:button|navigator)>/);
  assert.doesNotMatch(wxml, /批准申请|管理员审批|审核通过按钮/);

  const source = [
    'miniprogram/pages/network/index.ts',
    'miniprogram/pages/network/services/social-client.ts',
    'miniprogram/packageSocial/pages/requests/index.ts',
    'miniprogram/packageSocial/pages/friend/index.ts',
    'miniprogram/packageSocial/pages/tag-apply/index.ts',
    'miniprogram/packageSocial/pages/tag-status/index.ts',
  ].map(read).join('\n');
  assert.doesNotMatch(source, /adminApi|review\.(?:approve|reject|requestChanges|revoke)/);
});

test('social client derives its action boundary from the frozen registry', () => {
  const source = read('miniprogram/pages/network/services/social-client.ts');
  assert.match(source, /Action in CloudAction/);
  assert.match(source, /CLOUD_ACTION_REGISTRY\[action\]\.functionName !== 'socialApi'/);
  assert.doesNotMatch(source, /type SocialAction\s*=\s*\n?\s*\|/);
  assert.doesNotMatch(source, /\bownerId\b|\bopenid\b/i);
  assert.doesNotMatch(read('miniprogram/pages/network/index.ts'), /packageSocial\/services/);
});

test('relationship action matrix revokes and restores only allowed controls', async () => {
  const source = read('miniprogram/packageSocial/models/relationship-view.ts');
  assert.match(source, /import type \{ FriendshipState \} from '..\/..\/shared\/types\/enums'/);
  const { deriveRelationshipActions } = await import(
    new URL('miniprogram/packageSocial/models/relationship-view.ts', root)
  );

  const derive = (friendshipState, overrides = {}) => deriveRelationshipActions({
    friendshipState,
    viewerBlockedSubject: false,
    subjectBlockedViewer: false,
    outgoingPendingKnown: false,
    ...overrides,
  });
  assert.equal(derive(undefined).canRequest, true);
  assert.equal(derive('PENDING').canCancel, false);
  assert.equal(derive('PENDING', { outgoingPendingKnown: true }).canCancel, true);
  assert.equal(derive('ACCEPTED').canRemove, true);
  assert.equal(derive('REJECTED').canRequest, false);
  assert.equal(derive('CANCELLED').canRequest, false);
  assert.equal(derive('REMOVED').canRequest, true);
  assert.equal(derive('ACCEPTED', { viewerBlockedSubject: true }).canUnblock, true);
  assert.equal(derive('ACCEPTED', { viewerBlockedSubject: true }).canRequest, false);
  assert.equal(derive('REMOVED', { viewerBlockedSubject: false }).canRequest, true);
  assert.equal(derive(undefined, { subjectBlockedViewer: true }).canRequest, false);
});

test('state-changing friend and verification writes carry projection expectedVersion', () => {
  const requests = read('miniprogram/packageSocial/pages/requests/index.ts');
  const friend = read('miniprogram/packageSocial/pages/friend/index.ts');
  const apply = read('miniprogram/packageSocial/pages/tag-apply/index.ts');
  assert.match(requests, /friend\.accept[\s\S]*expectedVersion: current\.version/);
  assert.match(requests, /friend\.reject[\s\S]*expectedVersion: current\.version/);
  assert.match(friend, /friend\.cancel[\s\S]*expectedVersion: this\.data\.relationship!\.version/);
  assert.match(friend, /friend\.remove[\s\S]*expectedVersion: this\.data\.relationship!\.version/);
  assert.match(apply, /verification\.submit[\s\S]*expectedVersion: this\.data\.requestVersion/);
});

test('review timeline is an honest state path and never fabricates ReviewLog timestamps', () => {
  const timelineTs = read('miniprogram/components/ab-review-timeline/index.ts');
  const timelineWxml = read('miniprogram/components/ab-review-timeline/index.wxml');
  const statusWxml = read('miniprogram/packageSocial/pages/tag-status/index.wxml');
  assert.doesNotMatch(timelineTs, /updatedAt|reviewedAt|reviewedBy|reviewScope/);
  assert.match(timelineWxml, /非 ReviewLog，不推断审核时间/);
  assert.match(statusWxml, /不会从 updatedAt 推断或伪造/);
  assert.doesNotMatch(statusWxml, /review\.approve|review\.reject/);
});

test('sensitive material UI never renders original paths, cloud paths, or asset ids', () => {
  const applyWxml = read('miniprogram/packageSocial/pages/tag-apply/index.wxml');
  const statusWxml = read('miniprogram/packageSocial/pages/tag-status/index.wxml');
  assert.match(applyWxml, /请勿上传真实身份证原件/);
  assert.match(applyWxml, /原件路径不在页面展示/);
  assert.match(statusWxml, /原件地址已隐藏/);
  assert.doesNotMatch(`${applyWxml}\n${statusWxml}`, /cloudPath|tempFilePath|mediaAssetId|evidenceAssetIds|originalUrl/i);
  assert.match(read('miniprogram/packageSocial/pages/tag-apply/index.ts'), /Date\.parse\(policy\.uploadExpiresAt\) <= Date\.now\(\)/);
});

test('social components meet touch, dark-mode and accessibility baselines', () => {
  for (const component of componentPaths) {
    const wxml = read(`${component}/index.wxml`);
    const wxss = read(`${component}/index.wxss`);
    assert.match(wxml, /aria-(?:label|role)/, component);
    assert.match(wxss, /min-height:\s*(?:88|94|176)rpx/, component);
    assert.match(wxss, /prefers-color-scheme:\s*dark/, component);
    assert.doesNotMatch(wxss, /linear-gradient|radial-gradient/i, component);
  }
});

test('redacted visual fixture and artifact are explicitly synthetic demo evidence', () => {
  const fixture = JSON.parse(read('tests/components/social/fixtures/review-timeline-demo-only.json'));
  const svg = read('tests/components/social/artifacts/review-timeline-demo-only.svg');
  assert.equal(fixture.evidenceKind, 'SYNTHETIC');
  assert.equal(fixture.use, 'DEMO_ONLY');
  assert.equal(fixture.request.status, 'NEEDS_CHANGES');
  assert.equal(fixture.privacy.originalMaterialUrlsReturned, false);
  assert.equal(fixture.reviewedBy, null);
  assert.equal(fixture.reviewedAt, null);
  assert.match(svg, /SYNTHETIC · DEMO_ONLY/);
  assert.match(svg, /不是开发者工具预览/);
  assert.match(svg, /非真实用户/);
  assert.doesNotMatch(svg, /HUMAN_REVIEWED|APPROVED/);
  assert.ok(
    statSync(new URL('tests/components/social/artifacts/review-timeline-demo-only.png', root)).size > 10_000,
    'rendered local PNG artifact should be non-empty',
  );
});
