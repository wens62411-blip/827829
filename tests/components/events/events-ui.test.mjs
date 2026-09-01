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

test('event components are native accessible components with dark mode and only a neutral photo shade', () => {
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
  assert.match(styles, /#211e1a/i, 'ink primary');
  assert.match(styles, /#8a6a36|#8a6538/i, 'champagne-gold accent');
  assert.doesNotMatch(styles, /--ab-color-(?:green|wine|burgundy)\b|#(?:173c32|102821|1d463b|7b3038|6b2637|70464a)/i);
  assert.match(styles, /font-family:\s*Georgia[^;]*(?:Songti SC|STSong|SimSun)/i, 'editorial serif stack');
  assert.match(styles, /@keyframes\s+(?:events-editorial-rise|detail-photo-settle|card-photo-settle)/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(styles, /animation-iteration-count:\s*infinite|radial-gradient|#(?:7c3aed|8b5cf6|a855f7)/i);
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
  assert.match(heroTemplate, /本地图片加载失败/);
  assert.match(heroTemplate, /wx:else[^>]*hero__fallback/);
  assert.doesNotMatch(`${heroSource}\n${heroTemplate}`, /https?:\/\//);
  assert.match(heroSource, /imageFailed:\s*true/);
  assert.match(heroSource, /photoCredit:\s*\{\s*type:\s*String,\s*value:\s*''\s*\}/);
  assert.match(heroSource, /CLAIMED · DRAFT/);
  assert.doesNotMatch(heroTemplate, /已授权|已清权|HUMAN_REVIEWED/);
});

test('phase-one event preview consumes frozen geography without sending unsupported filters or signup fields', () => {
  const source = read('miniprogram/pages/events/index.ts');
  const template = read('miniprogram/pages/events/index.wxml');
  const geography = read('miniprogram/shared/constants/geography.ts');
  assert.match(source, /CITY_DIRECTORY/);
  assert.match(source, /callCloudAction\('event\.list'/);
  assert.match(source, /let requestGeneration = 0/);
  assert.match(source, /const generation = \+\+requestGeneration/);
  assert.match(source, /if \(generation !== requestGeneration\) return/);
  assert.equal((geography.match(/^\s+\{ id: CityId\./gm) ?? []).length, 13);
  assert.equal((geography.match(/^\s+\{ id: CountryId\./gm) ?? []).length, 7);

  const callStart = source.indexOf("callCloudAction('event.list'");
  const callEnd = source.indexOf('if (generation !== requestGeneration)', callStart);
  const payloadBlock = source.slice(callStart, callEnd);
  assert.match(payloadBlock, /contractVersion:\s*'1\.0\.0'/);
  assert.match(payloadBlock, /limit:\s*3/);
  assert.doesNotMatch(payloadBlock, /cityId|type|price|access|admission|organizer|capacity|participants|registration/i);

  assert.match(template, /查看 7 国 13 城完整目录/);
  assert.match(source, /url:\s*`\/packageEvents\/pages\/city\/index\?cityId=\$\{encodeURIComponent\(this\.data\.selectedCityId\)\}`/);
  assert.match(template, /先选城市，再从艺术、古董、珠宝/);
  assert.match(template, /活动逐步开放，先以名片连接彼此/);
  assert.doesNotMatch(template, /<button[^>]*>[^<]*(?:立即报名|提交报名|登记兴趣|立即支付|确认支付)/s);
  assert.match(source, /showListFailure[\s\S]*runtimeMode:\s*RuntimeMode\.DEGRADED[\s\S]*featuredEvents:\s*\[\]/);
  assert.match(source, /正式请求失败后不会回退为合成活动/);
});

test('OFFLINE_DEMO keeps the 13-city directory and provides stable city-category-section detail routes', () => {
  const demoSource = read('miniprogram/components/ab-event-card/demo-data.ts');
  const listSource = read('miniprogram/pages/events/index.ts');
  const listTemplate = read('miniprogram/pages/events/index.wxml');
  const detailSource = read('miniprogram/packageEvents/pages/event/index.ts');
  const detailTemplate = read('miniprogram/packageEvents/pages/event/index.wxml');

  assert.match(demoSource, /CITY_DIRECTORY\.findIndex/);
  assert.match(demoSource, /for \(const city of CITY_DIRECTORY\)/);
  assert.match(demoSource, /eventId:\s*`demo:\$\{city\.id\}`/);
  assert.match(demoSource, /活动方向.*不代表真实活动已排期/);
  assert.match(demoSource, /DISCOVER_DEMO_EVENTS/);
  assert.equal((demoSource.match(/eventId:\s*'demo:discover:/g) ?? []).length, 3);
  assert.match(demoSource, /getDemoEventById/);
  assert.match(demoSource, /DemoEventCategoryId\.ART/);
  assert.match(demoSource, /DemoEventCategoryId\.ANTIQUES/);
  assert.match(demoSource, /DemoEventCategoryId\.JEWELRY/);
  assert.match(demoSource, /DemoEventCategoryId\.BUSINESS/);
  assert.match(demoSource, /DemoEventSectionId\.FEATURED/);
  assert.match(demoSource, /DemoEventSectionId\.UPCOMING/);
  assert.match(demoSource, /DemoEventSectionId\.CITY_THEME/);
  assert.match(demoSource, /eventId:\s*`demo:activity:\$\{city\.id\}:\$\{category\[0\]\}:\$\{section\[0\]\}`/);
  assert.match(demoSource, /listActivityDemoEvents\(\)\.find\(\(event\) => event\.eventId === value\)/);
  assert.match(listSource, /buildDemoSections/);
  assert.match(listSource, /featuredEvents/);
  assert.match(listSource, /upcomingEvents/);
  assert.match(listSource, /cityThemeEvents/);
  assert.match(listSource, /eventId\.startsWith\('demo:'\)/);
  assert.match(listSource, /demoEventId=\$\{encodeURIComponent\(eventId\)\}/);
  assert.match(listTemplate, /本机预览/);
  assert.match(listTemplate, /当前不开放报名/);
  assert.match(listTemplate, /查看 7 国 13 城完整目录/);
  assert.match(detailSource, /const demoCityId = decodeRouteParam\(query\.demoCityId\)/);
  assert.match(detailSource, /const demoEventId = decodeRouteParam\(query\.demoEventId\)/);
  assert.match(detailSource, /demoCityId\s*\?\s*getDemoEventByCityId\(demoCityId\)\s*:\s*undefined/);
  assert.match(detailSource, /demoEventId\s*\?\s*getDemoEventById\(demoEventId\)\s*:\s*undefined/);
  assert.match(detailSource, /decodeURIComponent\(value\)/);
  assert.match(detailSource, /detail:\s*toDemoDetail\(demo\)/);
  assert.match(detailSource, /displayId:\s*event\.eventId/);
  assert.match(detailSource, /displayIdLabel:\s*'活动方向'/);
  assert.match(detailSource, /title:\s*event\.title/);
  assert.match(detailSource, /evidenceLabel:\s*'活动方向'/);
  assert.match(detailSource, /第一阶段只作信息预览，不开放活动报名、支付、签到、商户入驻或交易/);
  assert.match(detailSource, /没有根据任意地址参数创建或替换活动身份/);
  assert.doesNotMatch(`${listSource}\n${listTemplate}\n${detailSource}\n${detailTemplate}`, /event\.registerInterest|packageEvents\/pages\/enrollment|立即报名|提交报名|登记兴趣/);
  assert.doesNotMatch(demoSource, /HUMAN_REVIEWED|APPROVED|LIVE/);
});

test('Art synthetic related event preserves its stable identity into event detail', () => {
  const demoSource = read('miniprogram/components/ab-event-card/demo-data.ts');
  const artDemoSource = read('miniprogram/packageArt/data/demo.ts');
  const artDetailSource = read('miniprogram/packageArt/pages/detail/index.ts');
  const eventDetailSource = read('miniprogram/packageEvents/pages/event/index.ts');

  assert.match(demoSource, /ART_RELATED_DEMO_EVENT/);
  assert.match(demoSource, /eventId:\s*'event_demo_art_reading_001'/);
  assert.match(demoSource, /cityId:\s*city\.id/);
  assert.match(demoSource, /title:\s*'作品资料阅读会（活动方向）'/);
  assert.match(demoSource, /summary:\s*'活动方向，仅用于浏览，不代表真实排期或官方合作。'/);
  assert.match(demoSource, /REGISTERED_DEMO_EVENTS[\s\S]*ART_RELATED_DEMO_EVENT/);
  assert.match(artDemoSource, /eventId:ART_RELATED_DEMO_EVENT\.eventId/);
  assert.match(artDemoSource, /cityId:ART_RELATED_DEMO_EVENT\.cityId/);
  assert.match(artDemoSource, /title:ART_RELATED_DEMO_EVENT\.title/);
  assert.match(artDemoSource, /summary:ART_RELATED_DEMO_EVENT\.summary/);
  assert.match(artDetailSource, /demoEventId=\$\{encodeURIComponent\(eventId\)\}/);
  assert.doesNotMatch(artDetailSource, /demoCityId=\$\{encodeURIComponent\(cityId\)\}/);
  assert.match(eventDetailSource, /const demoEventId = decodeRouteParam\(query\.demoEventId\)/);
  assert.match(eventDetailSource, /demoEventId\s*\?\s*getDemoEventById\(demoEventId\)\s*:\s*undefined/);
  assert.match(eventDetailSource, /detail:\s*toDemoDetail\(demo\)/);
  assert.match(eventDetailSource, /if \(query\.demoEventId \|\| query\.demoCityId\)/);
});

test('OFFLINE_DEMO event routes defer cloud-client until after the formal-runtime guard', () => {
  const pagePaths = [
    'miniprogram/pages/events/index.ts',
    'miniprogram/packageEvents/pages/city/index.ts',
    'miniprogram/packageEvents/pages/event/index.ts',
    'miniprogram/packageEvents/pages/enrollment/index.ts',
    'miniprogram/packageEvents/pages/organizer/index.ts',
  ];
  for (const path of pagePaths) {
    const source = read(path);
    assert.doesNotMatch(source, /^import\s+\{?\s*callCloudAction[^\n]*cloud-client/m, path);
    assert.match(source, /getEventCloudClient/, path);
    assert.match(source, /LOCAL_RUNTIME\.cloudEnvironmentConfigured/, path);
  }

  const loader = read('miniprogram/components/ab-event-card/cloud-client-loader.ts');
  assert.match(loader, /type EventCloudClient = typeof import\('\.\.\/\.\.\/shared\/services\/cloud-client'\)/);
  assert.match(loader, /getEventCloudClient\(\)[\s\S]*return require\('\.\.\/\.\.\/shared\/services\/cloud-client'\)/);
  assert.doesNotMatch(loader, /^import\s/m);

  const listSource = read('miniprogram/pages/events/index.ts');
  const offlineBranch = listSource.slice(
    listSource.indexOf('if (!LOCAL_RUNTIME.cloudEnvironmentConfigured) {', listSource.indexOf('async refreshEvents()')),
    listSource.indexOf('this.setData({ loading: true })'),
  );
  assert.match(offlineBranch, /return;[\s\S]*getEventCloudClient\(\)/);

  const detailSource = read('miniprogram/packageEvents/pages/event/index.ts');
  const loadBlock = detailSource.slice(detailSource.indexOf('async loadEvent'), detailSource.indexOf('async loadPaymentCapability'));
  assert.match(loadBlock, /if \(!LOCAL_RUNTIME\.cloudEnvironmentConfigured\)[\s\S]*return;[\s\S]*getEventCloudClient\(\)/);
});

test('event cards expose evidence and never fabricate registrations, transactions, or partners', () => {
  const source = read('miniprogram/components/ab-event-card/index.ts');
  const template = read('miniprogram/components/ab-event-card/index.wxml');
  const listSource = read('miniprogram/pages/events/index.ts');
  assert.match(source, /RecordOrigin\.SYNTHETIC/);
  assert.match(source, /合成示例/);
  assert.match(source, /公开内容 · 待核验/);
  assert.match(source, /VerificationState\.HUMAN_REVIEWED/);
  assert.match(template, /当地时间/);
  assert.match(template, /当前阶段/);
  assert.match(template, /\{\{registrationLabel\}\}/);
  assert.match(listSource, /registrationLabel:\s*'一期不开放报名'/);
  assert.match(template, /alt="\{\{coverAlt\}\}"/);
  assert.match(template, /binderror="onImageError"/);
  assert.match(template, /查看方向详情/);
  assert.doesNotMatch(template, /立即报名|提交报名|登记兴趣|立即支付|确认支付/);
  assert.doesNotMatch(`${source}\n${template}`, /报名人数|已售|成交|合作方|模拟支付成功/);
});

test('phase-one detail exposes only preview facts, rights provenance, and an explicit no-signup boundary', () => {
  const source = read('miniprogram/packageEvents/pages/event/index.ts');
  const template = read('miniprogram/packageEvents/pages/event/index.wxml');
  for (const marker of ['活动方向', 'CONTENT_LIVE_UNVERIFIED', '本地合成策展文案', 'editorial-events manifest', '第一阶段只作信息预览']) {
    assert.match(source, new RegExp(marker));
  }
  for (const label of ['状态', '当地时间', 'IANA 时区', '内容来源', '第一阶段边界']) {
    assert.match(template, new RegExp(label));
  }
  assert.match(source, /realRecord && humanReviewed \? 'HUMAN_REVIEWED' : 'CONTENT_LIVE_UNVERIFIED'/);
  assert.match(source, /第一阶段仍只作公开信息展示；报名、支付与签到入口不会在本客户端开放/);
  assert.match(template, /\{\{detail\.displayIdLabel\}\}/);
  assert.match(template, /alt="\{\{detail\.imageAlt\}\}"/);
  assert.match(template, /binderror="onImageError"/);
  assert.match(template, /不会使用城市照片冒充具体活动/);
  assert.doesNotMatch(`${source}\n${template}`, /wx\.requestPayment|requestPayment/);
  assert.doesNotMatch(`${source}\n${template}`, /event\.registerInterest|packageEvents\/pages\/enrollment/);
  assert.doesNotMatch(template, /<button[^>]*>[^<]*(?:立即报名|提交报名|登记兴趣|立即支付|确认支付)/s);
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
