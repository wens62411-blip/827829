import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';

const root = new URL('../../..', import.meta.url);
const rootPath = decodeURIComponent(root.pathname.replace(/^\/(?:([A-Za-z]:))/, '$1')).replaceAll('/', '\\');
const read = (...parts) => readFileSync(join(rootPath, ...parts), 'utf8');
const readJson = (...parts) => JSON.parse(read(...parts));

function collectExecutable(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectExecutable(path);
    return entry.isFile() && /\.(?:ts|wxml|json)$/.test(entry.name) ? [path] : [];
  });
}

const executableRoots = [
  join(rootPath, 'miniprogram', 'packageArt'),
  join(rootPath, 'miniprogram', 'components', 'ab-art-card'),
  join(rootPath, 'miniprogram', 'components', 'ab-provenance-summary'),
  join(rootPath, 'miniprogram', 'components', 'ab-content-source'),
  join(rootPath, 'miniprogram', 'components', 'ab-intent-action'),
];
const executableFiles = executableRoots.flatMap(collectExecutable).sort();
const executableSource = executableFiles
  .map((path) => `\n/* ${relative(rootPath, path).replaceAll('\\', '/')} */\n${readFileSync(path, 'utf8')}`)
  .join('\n');

const fixture = readJson('database', 'seeds', 'art-demo.json');
const geography = readJson('docs', 'contracts', 'geography.json');
const cityIds = new Set(geography.cities.map((city) => city.id));
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

test('scope scan covers executable art sources only and excludes prose scope files', () => {
  assert.ok(executableFiles.length >= 20, 'expected pages, model, service, demo and four components');
  assert.equal(executableFiles.some((path) => path.endsWith('SCOPE.md')), false);
  assert.equal(executableFiles.every((path) => /\.(?:ts|wxml|json)$/.test(path)), true);
});

test('executable art UI exposes no cart, ordering, payment, auction, logistics, commission or return-forecast entry', () => {
  const forbiddenActionLabels = [
    /加入购物车|购物车结算|立即购买|确认下单|提交订单|立即支付|去支付/,
    /参与竞拍|立即竞拍|我要出价|提交出价/,
    /查看物流|物流跟踪|确认收货/,
    /申请分佣|佣金结算|分佣明细/,
    /预计收益|预期收益|收益率|年化回报|回报预测/,
    /现货保证|库存充足|保证库存|预留库存/,
  ];
  const forbiddenExecutableSymbols = [
    /\b(?:addToCart|openCart|checkout|createOrder|submitOrder|payOrder|placeBid|trackShipment|commissionPayout|predictReturns?)\b/i,
    /\/(?:cart|orders?|checkout|payment|auction|logistics|commission)(?:\/|[?'"`])/i,
    /['"](?:order|payment|auction|logistics|commission)\.[A-Za-z]/i,
  ];
  for (const pattern of [...forbiddenActionLabels, ...forbiddenExecutableSymbols]) {
    assert.doesNotMatch(executableSource, pattern);
  }
});

test('negative boundary wording is preserved and is not mistaken for a prohibited capability', () => {
  assert.match(executableSource, /不提供[^。'"`\n]{0,80}(?:真伪)?鉴定/);
  assert.match(executableSource, /不构成[^。'"`\n]{0,80}(?:保值|收益)/);
  assert.match(executableSource, /不代表[^。'"`\n]{0,80}官方合作|非官方合作/);
  assert.match(executableSource, /意向不是订单，不锁定库存，不构成成交或付款/);
  assert.match(executableSource, /不提供交易、竞拍、库存承诺、收益预测或 AI 真伪鉴定/);
  assert.doesNotMatch(executableSource, /保证真品|平台鉴定为真|官方认证真品|承诺保值|保证收益|官方合作方/);
});

test('every art item fixture carries the seven mandatory provenance fields and a shared city ID', () => {
  const required = [
    'recordOrigin', 'publicationState', 'sourceUrl', 'rightsStatus', 'reviewedAt', 'cityId', 'alt',
  ];
  assert.ok(Array.isArray(fixture.artItems) && fixture.artItems.length >= 6);
  for (const item of fixture.artItems) {
    for (const field of required) assert.equal(nonEmpty(item[field]), true, `${item._id}.${field}`);
    assert.match(item.sourceUrl, /^https:\/\//, `${item._id}.sourceUrl`);
    assert.equal(Number.isNaN(Date.parse(item.reviewedAt)), false, `${item._id}.reviewedAt`);
    assert.equal(cityIds.has(item.cityId), true, `${item._id}.cityId must use frozen geography`);
    assert.ok(['ART', 'ANTIQUE', 'JEWELRY'].includes(item.category), `${item._id}.category`);
  }
});

test('ART, ANTIQUE and JEWELRY fixtures enforce different detail fields', () => {
  const categoryRequirements = {
    ART: ['author', 'workTitle', 'year', 'medium', 'dimensions', 'edition', 'imageRightsStatement'],
    ANTIQUE: ['dateRange', 'objectType', 'knownProvenance', 'conditionStatement', 'thirdPartyReportReferences', 'platformAuthenticityStatement'],
    JEWELRY: ['subtype', 'materialStatement', 'gemOrPearlInformation', 'dimensions', 'reportReferences', 'displayAuthorization', 'investmentDisclaimer'],
  };
  for (const item of fixture.artItems) {
    const required = categoryRequirements[item.category];
    assert.ok(required, item._id);
    for (const field of required) {
      assert.equal(Object.hasOwn(item.details, field), true, `${item._id}.details.${field}`);
      const value = item.details[field];
      assert.equal(Array.isArray(value) || nonEmpty(value), true, `${item._id}.details.${field} type`);
    }
    if (item.category === 'ART') {
      const hasCombinedHistory = nonEmpty(item.details.exhibitionAndProvenance);
      const hasSplitHistory = nonEmpty(item.details.exhibitionHistory)
        && nonEmpty(item.details.provenanceInformation);
      assert.equal(
        hasCombinedHistory || hasSplitHistory,
        true,
        `${item._id}.details exhibition/provenance information`,
      );
    }
  }

  const published = fixture.artItems.filter((item) => item.publicationState === 'PUBLISHED');
  assert.deepEqual(new Set(published.map((item) => item.category)), new Set(['ART', 'ANTIQUE', 'JEWELRY']));
  assert.ok(published.find((item) => item.category === 'ANTIQUE').details.thirdPartyReportReferences.length > 0);
  assert.ok(published.find((item) => item.category === 'JEWELRY').details.reportReferences.length > 0);
});

test('PEARL is only a JEWELRY subtype and never becomes a fourth category', () => {
  for (const item of fixture.artItems) {
    assert.notEqual(item.category, 'PEARL', item._id);
    if (item.details?.subtype === 'PEARL') assert.equal(item.category, 'JEWELRY', item._id);
  }
  for (const collection of fixture.artCollections) {
    assert.equal(collection.categories.includes('PEARL'), false, collection._id);
  }
  assert.match(executableSource, /category:\s*'JEWELRY'[\s\S]{0,900}jewelryKind:\s*'PEARL'/);
  assert.doesNotMatch(executableSource, /category:\s*'PEARL'/);
});

test('demo fixtures cannot be confused with REAL or human-reviewed evidence', () => {
  assert.equal(fixture.fixtureMode, 'TEST_ONLY_NOT_DATABASE_IMPORT');
  assert.equal(fixture.runtimeMode, 'OFFLINE_DEMO');
  assert.equal(fixture.recordOrigin, 'SYNTHETIC');
  assert.equal(fixture.evidenceLabel, 'DEMO_ONLY');
  for (const group of [fixture.creators, fixture.artCollections, fixture.artItems]) {
    for (const record of group) {
      assert.equal(record.recordOrigin, 'SYNTHETIC', record._id);
      assert.equal(record.evidenceLabel, 'DEMO_ONLY', record._id);
      assert.notEqual(record.verificationState, 'HUMAN_REVIEWED', record._id);
    }
  }
});
