import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');

const componentRoots = [
  'miniprogram/components/ab-city-switcher',
  'miniprogram/components/ab-city-hero',
  'miniprogram/components/ab-event-card',
  'miniprogram/components/ab-event-state',
];

test('event components are native accessible components with dark mode and no gradients', () => {
  for (const root of componentRoots) {
    const config = JSON.parse(read(`${root}/index.json`));
    const template = read(`${root}/index.wxml`);
    const styles = read(`${root}/index.wxss`);
    assert.equal(config.component, true, root);
    assert.match(template, /aria-(?:label|role)/, root);
    assert.match(styles, /prefers-color-scheme:\s*dark/, root);
    assert.doesNotMatch(styles, /linear-gradient|radial-gradient|#(?:7c3aed|8b5cf6|a855f7)/i, root);
  }
});

test('event surfaces use the restrained editorial travel system with finite reduced-motion-safe transitions', () => {
  const stylePaths = [
    'miniprogram/pages/events/index.wxss',
    'miniprogram/packageEvents/pages/city/index.wxss',
    'miniprogram/packageEvents/pages/event/index.wxss',
    'miniprogram/packageEvents/pages/enrollment/index.wxss',
    'miniprogram/packageEvents/pages/organizer/index.wxss',
    ...componentRoots.map((root) => `${root}/index.wxss`),
  ];
  const styles = stylePaths.map((path) => read(path)).join('\n');
  assert.match(styles, /#f4efe5/i, 'warm ivory canvas');
  assert.match(styles, /#173c32/i, 'deep forest green');
  assert.match(styles, /#7b3038/i, 'restrained wine accent');
  assert.match(styles, /font-family:\s*Georgia[^;]*(?:Songti SC|STSong|SimSun)/i, 'editorial serif stack');
  assert.match(styles, /@keyframes\s+(?:events-editorial-rise|detail-photo-settle|card-photo-settle)/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(styles, /animation-iteration-count:\s*infinite|box-shadow|linear-gradient|radial-gradient/i);
});

test('city switcher emits stable city selection and Hero has alt plus local failure fallback', () => {
  const switcherSource = read('miniprogram/components/ab-city-switcher/index.ts');
  const switcherTemplate = read('miniprogram/components/ab-city-switcher/index.wxml');
  const heroSource = read('miniprogram/components/ab-city-hero/index.ts');
  const heroTemplate = read('miniprogram/components/ab-city-hero/index.wxml');

  assert.match(switcherSource, /triggerEvent\('change',\s*\{\s*cityId\s*\}\)/);
  assert.match(switcherSource, /expanded:\s*!this\.data\.expanded/);
  assert.match(switcherTemplate, /aria-expanded/);
  assert.match(switcherTemplate, /目录状态.*运营状态/s);
  assert.match(heroTemplate, /src="\{\{imageSrc\}\}"/);
  assert.match(heroTemplate, /alt="\{\{imageAlt\}\}"/);
  assert.match(heroTemplate, /binderror="onImageError"/);
  assert.match(heroTemplate, /bindload="onImageLoad"/);
  assert.match(heroTemplate, /PHOTO CREDIT · \{\{photoCredit\}\}/);
  assert.match(heroTemplate, /图片加载失败.*无外链替代/s);
  assert.match(heroSource, /imageFailed:\s*true/);
  assert.match(heroSource, /photoCredit:\s*\{\s*type:\s*String,\s*value:\s*''\s*\}/);
  assert.match(heroSource, /CLAIMED · DRAFT/);
  assert.doesNotMatch(heroTemplate, /已授权|已清权|HUMAN_REVIEWED/);
});

test('event discovery consumes frozen geography and keeps unsupported filters out of formal payload', () => {
  const source = read('miniprogram/pages/events/index.ts');
  const template = read('miniprogram/pages/events/index.wxml');
  assert.match(source, /CITY_DIRECTORY/);
  assert.match(source, /COUNTRY_DIRECTORY/);
  assert.match(source, /REGION_DIRECTORY/);
  assert.match(source, /callCloudAction\('geo\.listCities'/);
  assert.match(source, /callCloudAction\('event\.list'/);
  assert.match(source, /eventRequestGeneration/);
  assert.match(source, /if \(!isCurrent\(\)\) return/);
  assert.match(source, /imageSrc:\s*`\/assets\/cities\/\$\{city\.id\}\.jpg`/);

  const payloadBlock = source.slice(source.indexOf('const payload ='), source.indexOf("callCloudAction('event.list'"));
  assert.match(payloadBlock, /cityId:\s*selected\.id/);
  assert.match(payloadBlock, /limit:\s*20/);
  assert.doesNotMatch(payloadBlock, /type|price|access|admission|organizer|capacity|participants/i);

  for (const label of ['类型', '时间', '价格', '准入']) assert.match(template, new RegExp(`>${label}<`));
  assert.match(template, /disabled="\{\{!extendedFiltersAvailable\}\}"/);
  assert.match(template, /\{\{browseGlobal \? '只看当前城市' : '跨城浏览'\}\}/);
  assert.match(template, /DEMO_ONLY 活动详情字段结构/);
  assert.match(template, /真实微信支付 DISABLED|paymentGateLabel/);
});

test('event cards expose evidence and never fabricate registrations, transactions, or partners', () => {
  const source = read('miniprogram/components/ab-event-card/index.ts');
  const template = read('miniprogram/components/ab-event-card/index.wxml');
  assert.match(source, /RecordOrigin\.SYNTHETIC/);
  assert.match(source, /DEMO_ONLY/);
  assert.match(source, /CONTENT_LIVE_UNVERIFIED/);
  assert.match(source, /VerificationState\.HUMAN_REVIEWED/);
  assert.match(template, /当地时间/);
  assert.match(template, /报名方式/);
  assert.match(template, /alt="\{\{coverAlt\}\}"/);
  assert.match(template, /binderror="onImageError"/);
  assert.doesNotMatch(`${source}\n${template}`, /报名人数|已售|成交|合作方|模拟支付成功/);
});

test('detail view exposes required facts while marking missing contract fields honestly', () => {
  const source = read('miniprogram/packageEvents/pages/event/index.ts');
  const template = read('miniprogram/packageEvents/pages/event/index.wxml');
  for (const marker of ['DEMO_ONLY', 'CONTENT_LIVE_UNVERIFIED', '来源字段未在冻结', '容量字段待合同扩展', '不得默认“两人成团”']) {
    assert.match(source, new RegExp(marker));
  }
  for (const label of ['主理人', '活动来源', '当地时间', 'IANA 时区', '地址范围', '准入', '报名方式', '容量', '最少成团人数', '图片权利', '图片来源 / 许可', '支付能力']) {
    assert.match(template, new RegExp(label));
  }
  assert.match(source, /describeTimezoneDifference/);
  assert.match(template, /alt="\{\{detail\.imageAlt\}\}"/);
  assert.match(template, /binderror="onImageError"/);
  assert.doesNotMatch(`${source}\n${template}`, /wx\.requestPayment|requestPayment/);
  assert.doesNotMatch(template, /<button[^>]*>[^<]*(?:立即支付|确认支付)/s);
});

test('interest writes cannot inject trusted fields and preserve idempotency keys across unknown results', () => {
  const source = read('miniprogram/packageEvents/pages/enrollment/index.ts');
  const template = read('miniprogram/packageEvents/pages/enrollment/index.wxml');
  const registerStart = source.indexOf("callCloudAction('event.registerInterest'");
  const registerEnd = source.indexOf('if (!result.apiResult.ok)', registerStart);
  const registerCall = source.slice(registerStart, registerEnd);
  assert.match(registerCall, /eventId/);
  assert.match(registerCall, /acknowledgedTermsVersion/);
  assert.match(registerCall, /idempotencyKey/);
  assert.doesNotMatch(registerCall, /cityId|participants|capacity|labelIds|organizer|role/i);
  assert.match(source, /再次提交会复用同一幂等键/);
  assert.match(source, /expectedVersion/);
  assert.match(source, /event\.checkEligibility/);
  assert.match(source, /payment\.getCapability/);
  assert.match(source, /callCloudAction\('event\.get'/);
  assert.match(registerCall, /expectedVersion/);
  assert.match(template, /\{\{busy \? '正在提交…' : '登记兴趣（INTEREST）'\}\}/);
  assert.match(template, /\{\{busy \? '正在提交…' : '取消兴趣登记'\}\}/);
  assert.doesNotMatch(source, /idem_event_.*eventId/);
  assert.doesNotMatch(`${source}\n${template}`, /wx\.cloud\.database|wx\.requestPayment|requestPayment/);
  assert.doesNotMatch(template, /<button[^>]*>[^<]*(?:立即支付|确认支付)/s);
  assert.match(template, /支付按钮隐藏|没有支付按钮/);
});

test('honest empty-state actions keep their WXML binding delimiters after package minification', () => {
  const template = read('miniprogram/components/ab-event-state/index.wxml');
  assert.match(template, />\{\{actionLabel\}\}<\/button>/);
  assert.doesNotMatch(template, />actionLabel<\/button>/);
});

test('organizer page only consumes the server-approved public projection', () => {
  const source = read('miniprogram/packageEvents/pages/organizer/index.ts');
  const template = read('miniprogram/packageEvents/pages/organizer/index.wxml');
  assert.match(source, /callCloudAction\('organizer\.getPublic'/);
  assert.match(source, /reviewLabel:\s*organizer\.reviewStatus/);
  assert.match(source, /verificationLabel:\s*organizer\.verificationState/);
  assert.match(template, /前端不提供申请、编辑角色或自行声明 organizer/);
  assert.doesNotMatch(`${source}\n${template}`, /setData\(\{[^}]*role:\s*['"]ORGANIZER/s);
});

test('event share route keeps the frozen cold-start factory contract', () => {
  const source = read('miniprogram/pages/event-share/index.ts');
  assert.match(source, /createShareEntryPage\('活动分享入口',\s*'EVENT'\)/);
});
