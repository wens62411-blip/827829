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

test('event components remain native accessible components with dark mode and only a neutral photo shade', () => {
  for (const root of componentRoots) {
    const config = JSON.parse(read(`${root}/index.json`));
    const template = read(`${root}/index.wxml`);
    const styles = read(`${root}/index.wxss`);
    assert.equal(config.component, true, root);
    assert.match(template, /aria-(?:label|role)/, root);
    assert.match(styles, /prefers-color-scheme:\s*dark/, root);
    assert.doesNotMatch(styles, /radial-gradient|#(?:7c3aed|8b5cf6|a855f7)/i, root);
    if (root === 'miniprogram/components/ab-city-hero') {
      assert.match(styles, /\.hero__shade\s*\{[\s\S]*?background:\s*linear-gradient\(180deg,\s*rgba\(22,\s*20,\s*18,/i, root);
    } else {
      assert.doesNotMatch(styles, /linear-gradient/i, root);
    }
  }
});

test('event surfaces use the AB Club editorial palette, serif hierarchy, and finite motion', () => {
  const stylePaths = [
    'miniprogram/pages/events/index.wxss',
    'miniprogram/packageEvents/pages/calendar/index.wxss',
    'miniprogram/packageEvents/pages/city/index.wxss',
    'miniprogram/packageEvents/pages/event/index.wxss',
    'miniprogram/packageEvents/pages/enrollment/index.wxss',
    'miniprogram/packageEvents/pages/organizer/index.wxss',
    ...componentRoots.map((root) => `${root}/index.wxss`),
  ];
  const styles = stylePaths.map((path) => read(path)).join('\n');
  assert.match(styles, /#f4efe5|#24211e/i, 'warm ivory or ink canvas');
  assert.match(styles, /#211e1a|#f7f2e9/i, 'ink or ivory primary');
  assert.match(styles, /#8a6a36|#8a6538|#d8bd84/i, 'champagne-gold accent');
  assert.doesNotMatch(styles, /--ab-color-(?:green|wine|burgundy)\b|#(?:173c32|102821|1d463b|7b3038|6b2637|70464a)/i);
  assert.match(styles, /font(?:-family|):[^;]*Georgia[^;]*(?:Songti SC|STSong|SimSun)/i, 'editorial serif stack');
  assert.match(styles, /@keyframes\s+(?:detail-photo-settle|card-photo-settle)/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(styles, /animation-iteration-count:\s*infinite|radial-gradient|#(?:7c3aed|8b5cf6|a855f7)/i);
});

test('city switcher and Hero keep stable city selection plus local image fallback', () => {
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
  assert.match(heroTemplate, /图片暂不可用/);
  assert.match(heroTemplate, /wx:else[^>]*hero__fallback/);
  assert.doesNotMatch(`${heroSource}\n${heroTemplate}`, /https?:\/\//);
  assert.match(heroSource, /imageFailed:\s*true/);
  assert.match(heroSource, /photoCredit:\s*\{\s*type:\s*String,\s*value:\s*''\s*\}/);
  assert.match(heroSource, /CLAIMED · DRAFT/);
  assert.doesNotMatch(heroTemplate, /已授权|已清权|HUMAN_REVIEWED/);
});

test('phase-one event detail remains a read-only preview without signup or payment', () => {
  const source = read('miniprogram/packageEvents/pages/event/index.ts');
  const template = read('miniprogram/packageEvents/pages/event/index.wxml');
  for (const marker of ['活动方向', 'AB Club 策展构想', '报名尚未开放']) assert.match(source, new RegExp(marker));
  for (const label of ['状态', '当地时间', '时区', '内容来源']) assert.match(template, new RegExp(label));
  assert.match(source, /realRecord && humanReviewed \? '已人工核验' : '待核验'/);
  assert.match(source, /第一阶段仍只作公开信息展示；报名、支付与签到入口不会在本客户端开放/);
  assert.match(template, /alt="\{\{detail\.imageAlt\}\}"/);
  assert.match(template, /binderror="onImageError"/);
  assert.doesNotMatch(`${source}\n${template}`, /wx\.requestPayment|requestPayment/);
  assert.doesNotMatch(`${source}\n${template}`, /event\.registerInterest|packageEvents\/pages\/enrollment/);
  assert.doesNotMatch(template, /<button[^>]*>[^<]*(?:立即报名|提交报名|登记兴趣|立即支付|确认支付)/s);
});

test('interest writes remain narrowly scoped and idempotent', () => {
  const source = read('miniprogram/packageEvents/pages/enrollment/index.ts');
  const template = read('miniprogram/packageEvents/pages/enrollment/index.wxml');
  const registerStart = source.indexOf("callCloudAction('event.registerInterest'");
  const registerEnd = source.indexOf('if (!result.apiResult.ok)', registerStart);
  const registerCall = source.slice(registerStart, registerEnd);
  assert.match(registerCall, /eventId/);
  assert.match(registerCall, /acknowledgedTermsVersion/);
  assert.match(registerCall, /idempotencyKey/);
  assert.doesNotMatch(registerCall, /cityId|participants|capacity|labelIds|organizer|role/i);
  assert.match(source, /this\.data\.registerIdempotencyKey\s*\|\|[\s\S]*createWriteKey\('interest'\)/);
  assert.match(source, /this\.data\.cancelIdempotencyKey\s*\|\|[\s\S]*createWriteKey\('cancel'\)/);
  assert.match(source, /expectedVersion/);
  assert.match(source, /event\.checkEligibility/);
  assert.match(source, /payment\.getCapability/);
  assert.match(source, /callCloudAction\('event\.get'/);
  assert.match(template, /\{\{busy \? '正在提交…' : '登记兴趣'\}\}/);
  assert.match(template, /\{\{busy \? '正在提交…' : '取消兴趣登记'\}\}/);
  assert.doesNotMatch(`${source}\n${template}`, /wx\.cloud\.database|wx\.requestPayment|requestPayment/);
});

test('shared empty-state and organizer surfaces keep their explicit contracts', () => {
  const emptyTemplate = read('miniprogram/components/ab-event-state/index.wxml');
  const organizerSource = read('miniprogram/packageEvents/pages/organizer/index.ts');
  const organizerTemplate = read('miniprogram/packageEvents/pages/organizer/index.wxml');
  assert.match(emptyTemplate, />\{\{actionLabel\}\}<\/button>/);
  assert.doesNotMatch(emptyTemplate, />actionLabel<\/button>/);
  assert.match(organizerSource, /callCloudAction\('organizer\.getPublic'/);
  assert.match(organizerSource, /reviewLabel:\s*organizer\.reviewStatus/);
  assert.match(organizerSource, /verificationLabel:\s*organizer\.verificationState/);
  assert.doesNotMatch(`${organizerSource}\n${organizerTemplate}`, /setData\(\{[^}]*role:\s*['"]ORGANIZER/s);
});

test('event share route keeps the frozen cold-start factory contract', () => {
  const source = read('miniprogram/pages/event-share/index.ts');
  assert.match(source, /createShareEntryPage\('活动分享入口',\s*'EVENT'\)/);
});
