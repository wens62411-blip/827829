import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const mini = join(root, 'miniprogram');
const adminRoot = join(mini, 'packageAdmin');
const componentRoots = [
  join(mini, 'components', 'ab-admin-queue'),
  join(mini, 'components', 'ab-admin-case'),
  join(mini, 'components', 'ab-audit-entry'),
];
const pageNames = ['home', 'reviews', 'events', 'content', 'audit'];

const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');
const page = (name, extension) => read('miniprogram', 'packageAdmin', 'pages', name, `index.${extension}`);

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function exportedFunction(source, name) {
  const marker = `export function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} must be exported`);
  const next = source.indexOf('\nexport function ', start + marker.length);
  return source.slice(start, next === -1 ? source.length : next);
}

test('the five frozen direct routes bootstrap fixed scopes from onShow and default deny data rendering', () => {
  const app = JSON.parse(read('miniprogram', 'app.json'));
  const adminPackage = app.subpackages.find((item) => item.root === 'packageAdmin');
  assert.deepEqual(adminPackage.pages, [
    'pages/home/index',
    'pages/reviews/index',
    'pages/events/index',
    'pages/content/index',
    'pages/audit/index',
  ]);

  const fixedScopes = {
    reviews: /bootstrapAdmin\('REVIEW'\)/,
    events: /bootstrapAdmin\('OPERATIONS'\)/,
    content: /bootstrapAdmin\('OPERATIONS'\)/,
    audit: /bootstrapAdmin\('AUDIT'\)/,
  };
  for (const name of pageNames) {
    const source = page(name, 'ts');
    const template = page(name, 'wxml');
    assert.match(source, /gateState:\s*'CHECKING'/, `${name} starts closed`);
    assert.match(source, /onShow\(\)\s*{[\s\S]*?refreshAccess\(\)/, `${name} rechecks on direct access`);
    assert.match(template, /wx:if="{{gateState !== 'AUTHORIZED'}}"/, `${name} renders the gate first`);
    assert.match(template, /<block wx:else>/, `${name} mounts admin UI only after authorization`);
    assert.doesNotMatch(source, /onLoad\s*\([^)]*(?:query|options)/, `${name} does not authorize from route params`);
  }
  for (const [name, expected] of Object.entries(fixedScopes)) assert.match(page(name, 'ts'), expected);
  const home = page('home', 'ts');
  assert.match(home, /const SCOPES:[\s\S]*?\['REVIEW', 'OPERATIONS', 'AUDIT'\]/);
  assert.match(home, /SCOPES\.map\([\s\S]*?bootstrapAdmin\(scope\)/);
});

test('route parameters and client payloads cannot assert administrator identity or reviewer identity', () => {
  const client = read('miniprogram', 'packageAdmin', 'lib', 'admin-client.ts');
  const pageSources = pageNames.map((name) => page(name, 'ts')).join('\n');
  for (const forbidden of [/\bisAdmin\b/, /\breviewerId\b/, /\breviewedBy\b/, /payload\s*\.\s*role\b/]) {
    assert.doesNotMatch(`${client}\n${pageSources}`, forbidden);
  }
  assert.doesNotMatch(pageSources, /onLoad\s*\(/, 'admin pages ignore all cold-route privilege hints');
  assert.match(client, /bootstrapAdmin\(requestedScope: AdminScope\)/);
  assert.match(client, /requestedScope/);
});

test('every frozen admin write builder sends expectedVersion and idempotencyKey', () => {
  const client = read('miniprogram', 'packageAdmin', 'lib', 'admin-client.ts');
  const writeBuilders = [
    'approveReviewCase',
    'rejectReviewCase',
    'requestReviewChanges',
    'revokeReviewCase',
    'reviewOrganizer',
    'reviewEvent',
    'reviewContent',
    'resolveReport',
  ];
  for (const builder of writeBuilders) {
    const block = exportedFunction(client, builder);
    assert.match(block, /expectedVersion:\s*version/, `${builder} carries optimistic version`);
    assert.match(block, /idempotencyKey/, `${builder} carries an idempotency key`);
    assert.doesNotMatch(block, /isAdmin|reviewerId|reviewedBy/, `${builder} cannot assert trusted actor fields`);
  }
  assert.match(client, /createAdminIdempotencyKey/);
  for (const name of ['reviews', 'events', 'content']) {
    const source = page(name, 'ts');
    assert.match(source, /VERSION_CONFLICT/);
    assert.match(source, /未自动重试|不会自动生成新请求重试|不会生成新幂等键自动重试/);
  }
});

test('queue datasets contain only opaque local handles while full identifiers remain in memory maps', () => {
  const queueTemplate = read('miniprogram', 'components', 'ab-admin-queue', 'index.wxml');
  assert.match(queueTemplate, /data-handle="{{item\.handle}}"/);
  assert.doesNotMatch(queueTemplate, /data-[^=]*(?:review|case|aggregate|user|report|target)[^=]*id/i);

  for (const name of ['reviews', 'events', 'content']) {
    const source = page(name, 'ts');
    const template = page(name, 'wxml');
    assert.match(source, /new WeakMap<object/);
    assert.match(source, /new Map\(\)/);
    assert.match(source, /generation/);
    assert.match(source, /sequence/);
    assert.doesNotMatch(template, /reviewCaseId|aggregateId|submitterUserId|assignedReviewerUserId|reportId/);
    assert.doesNotMatch(template, /data-(?:id|review-case|aggregate|user|report|target)/i);
  }
  const views = read('miniprogram', 'packageAdmin', 'lib', 'admin-view-model.ts');
  assert.match(views, /maskStableId/);
  assert.match(views, /redactFreeText/);
  assert.match(views, /\[链接已隐藏\]/);
  assert.match(views, /\[手机号已隐藏\]/);
  assert.match(views, /\[邮箱已隐藏\]/);
  const queueMapper = exportedFunction(views, 'reviewQueueItemView');
  assert.doesNotMatch(queueMapper, /reviewCase\.(?:title|summary|aggregateId)/);
  assert.match(queueMapper, /受限审核案件/);
});

test('case details expire after 120 seconds and all sensitive page state clears on hide and unload', () => {
  for (const name of ['reviews', 'events', 'content']) {
    const source = page(name, 'ts');
    assert.match(source, /setTimeout\([\s\S]*?120000\)/, `${name} has a 120 second lease`);
    assert.match(source, /onHide\(\)\s*{[\s\S]*?resetController\(this\)/, `${name} clears on hide`);
    assert.match(source, /onUnload\(\)\s*{[\s\S]*?resetController\(this\)[\s\S]*?controllers\.delete\(this\)/, `${name} clears on unload`);
    assert.match(source, /selectedHandle:\s*''[\s\S]*?detail:\s*null[\s\S]*?actions:\s*\[\]/);
    assert.match(source, /generation[\s\S]*?return/, `${name} rejects stale asynchronous responses`);
  }
  const caseTemplate = read('miniprogram', 'components', 'ab-admin-case', 'index.wxml');
  assert.match(caseTemplate, /expiresInSeconds/);
  assert.match(caseTemplate, /离开页面会立即清除/);
});

test('switching cases destroys every unsubmitted decision draft before rebinding the selected secret', () => {
  for (const name of ['reviews', 'events', 'content']) {
    const source = page(name, 'ts');
    const start = source.indexOf('async onSelect(');
    const end = source.indexOf('\narmDetailExpiry()', start);
    assert.notEqual(start, -1, `${name} exposes an explicit selection handler`);
    const handler = source.slice(start, end);
    assert.match(handler, /!handle \|\| this\.data\.actionBusy/, `${name} cannot switch during a write`);
    assert.match(handler, /detail:\s*null[\s\S]*?actions:\s*\[\]/, `${name} unmounts the old case first`);
    const clearAt = handler.indexOf('detail: null');
    const fetchAt = handler.indexOf('getReviewCase(');
    if (fetchAt !== -1) assert.ok(clearAt !== -1 && clearAt < fetchAt, `${name} clears before detail fetch`);
    assert.equal(
      (handler.match(/detailNotice:\s*''/g) ?? []).length,
      name === 'reviews' ? 2 : 1,
      `${name} clears the loading notice after each successful detail path`,
    );
  }

  const component = read('miniprogram', 'components', 'ab-admin-case', 'index.ts');
  const observerStart = component.indexOf('observers:');
  const methodsStart = component.indexOf('methods:', observerStart);
  const observer = component.slice(observerStart, methodsStart);
  assert.match(observer, /'detail\.handle'/);
  for (const field of ['pendingAction', 'pendingLabel', 'note', 'reasonCode', 'changesText']) {
    assert.match(observer, new RegExp(`${field}:\\s*''`));
  }
  assert.doesNotMatch(observer, /triggerEvent|review\w+\(|approve\w+\(/);
});

test('detail expiry cannot unlock or clobber a different case while an action is in flight', () => {
  for (const name of ['reviews', 'events', 'content']) {
    const source = page(name, 'ts');
    const start = source.indexOf('async onDecision(');
    const end = source.indexOf('\nonRetryQueue()', start);
    const handler = source.slice(start, end);
    assert.match(handler, /clearTimeout\(controller\.detailTimer\)/, `${name} cancels the lease timer`);
    assert.match(handler, /controller\.detailTimer = undefined/, `${name} detaches the lease timer`);
    assert.match(handler, /actionBusy:\s*true[\s\S]*?detail:\s*null[\s\S]*?actions:\s*\[\]/,
      `${name} unmounts sensitive detail before awaiting the write`);
    assert.match(handler, /controllers\.get\(this\) !== activeController/,
      `${name} binds the response to the active controller`);
    assert.match(handler, /activeController\.selectedHandle !== activeHandle/,
      `${name} binds the response to the selected case`);
  }
  assert.match(page('reviews', 'ts'), /onQueueChange[\s\S]*?this\.data\.actionBusy/);
  assert.match(page('events', 'ts'), /onDomainChange[\s\S]*?this\.data\.actionBusy/);
});

test('admin production sources contain no persistent cache, material URL bypass, raw URL, private shape, or console leakage', () => {
  const sourceFiles = [adminRoot, ...componentRoots]
    .flatMap(filesUnder)
    .filter((path) => ['.ts', '.wxml', '.json'].includes(extname(path)));
  const combined = sourceFiles.map((path) => readFileSync(path, 'utf8')).join('\n');
  for (const forbidden of [
    /getTempFileURL/,
    /wx\.setStorage(?:Sync)?/,
    /console\.(?:log|debug|info|warn|error)/,
    /\bmaterialUrl\b/,
    /\brawSnapshot\b/,
    /\brawUrl\b/,
    /\bprivateDocument\b/,
    /https?:\/\/[A-Za-z0-9]/,
    /wxfile:\/\/[A-Za-z0-9]/,
    /cloud:\/\/[A-Za-z0-9]/,
  ]) assert.doesNotMatch(combined, forbidden);

  for (const path of sourceFiles.filter((item) => extname(item) === '.ts')) {
    const source = readFileSync(path, 'utf8');
    const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
    for (const specifier of imports) {
      assert.doesNotMatch(specifier, /package(?:Card|Social|Events|Art)|cloudfunctions/i);
    }
  }
});

test('AI is presentation-only and a decision event can be emitted only by explicit confirmation', () => {
  const componentTs = read('miniprogram', 'components', 'ab-admin-case', 'index.ts');
  const componentWxml = read('miniprogram', 'components', 'ab-admin-case', 'index.wxml');
  assert.match(componentWxml, /AI 检查只能辅助阅读/);
  assert.match(componentWxml, /不会自动触发批准/);
  assert.match(componentWxml, /bindtap="confirmAction"/);
  assert.equal((componentTs.match(/triggerEvent\('decision'/g) ?? []).length, 1);
  assert.match(componentTs, /confirmAction\(\)[\s\S]*?triggerEvent\('decision'/);
  assert.doesNotMatch(componentTs, /lifetimes|attached\s*\(|ready\s*\(/);
  assert.doesNotMatch(componentTs, /approveReviewCase|reviewOrganizer|reviewEvent|reviewContent/);
});

test('supplement requests are rejected as a whole instead of silently truncating human intent', () => {
  const policy = read('miniprogram', 'packageAdmin', 'lib', 'admin-policy.ts');
  const splitter = exportedFunction(policy, 'splitRequiredChanges');
  const validator = exportedFunction(policy, 'requiredChangesAreValid');
  assert.doesNotMatch(splitter, /slice\s*\(/);
  assert.match(validator, /items\.length >= 1/);
  assert.match(validator, /items\.length <= 10/);
  assert.match(validator, /item\.length <= 200/);
  assert.match(validator, /\[a-z\]\[a-z0-9\+\.\-\]\*/i);
  assert.match(validator, /blob\|data/);
  assert.match(validator, /A-Za-z0-9/);
  for (const name of ['reviews', 'events', 'content']) {
    assert.match(page(name, 'ts'), /requiredChangesAreValid/);
  }
});

test('the audit entry component is structurally read-only and receives only redacted view models', () => {
  const componentTs = read('miniprogram', 'components', 'ab-audit-entry', 'index.ts');
  const componentWxml = read('miniprogram', 'components', 'ab-audit-entry', 'index.wxml');
  const auditPage = page('audit', 'ts');
  assert.doesNotMatch(componentTs, /methods\s*:|triggerEvent/);
  assert.doesNotMatch(componentWxml, /<button|bind(?:tap|input|change)|catch(?:tap|change)/);
  assert.doesNotMatch(componentWxml, /编辑|删除|修改/);
  assert.match(auditPage, /listAuditEntries/);
  assert.match(auditPage, /controller\.sequence \+= 1/);
  assert.match(auditPage, /`audit_\$\{controller\.generation\}_\$\{controller\.sequence\}`/);
  assert.doesNotMatch(auditPage, /approveReviewCase|rejectReviewCase|resolveReport|reviewContent|reviewEvent|reviewOrganizer/);
  const views = read('miniprogram', 'packageAdmin', 'lib', 'admin-view-model.ts');
  const auditMapper = exportedFunction(views, 'auditEntryView');
  assert.match(auditMapper, /id:\s*localHandle/);
  assert.doesNotMatch(auditMapper, /entry\.auditEntryId/);
  assert.match(auditMapper, /maskStableId\(entry\.actorUserId\)/);
  assert.match(auditMapper, /maskStableId\(entry\.targetId\)/);
  assert.match(auditMapper, /maskStableId\(entry\.requestId\)/);
  const twoRedactedRows = ['audit_7_1', 'audit_7_2'];
  assert.equal(new Set(twoRedactedRows).size, 2);
  assert.equal(twoRedactedRows.some((key) => key.includes('audit_REDACTED')), false);
});

test('disabled or unknown payment capability never creates order/refund navigation or fake orders', () => {
  const policy = read('miniprogram', 'packageAdmin', 'lib', 'admin-policy.ts');
  const payment = exportedFunction(policy, 'paymentUiFromCapability');
  assert.match(payment, /if \(!capability\)[\s\S]*?enabled:\s*false/);
  assert.match(payment, /P0_DISABLED/);
  assert.match(payment, /EVENT_FREE/);
  assert.match(payment, /订单与退款入口保持隐藏|不显示订单或退款入口/);

  for (const name of pageNames) {
    const template = page(name, 'wxml');
    const navigators = template.match(/<navigator[\s\S]*?<\/navigator>/g) ?? [];
    for (const navigator of navigators) assert.doesNotMatch(navigator, /订单|退款|order|refund/i);
  }
  const production = [adminRoot, ...componentRoots]
    .flatMap(filesUnder)
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
  assert.doesNotMatch(production, /mockOrder|fakeOrder|orders\s*:\s*\[/i);
});

test('admin UI remains inside the five-route native WeChat stack', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies['tdesign-miniprogram'], '1.16.0');
  for (const forbidden of ['@tarojs/taro', 'uni-app', 'vant-weapp', 'weui-miniprogram']) {
    assert.equal(pkg.dependencies[forbidden], undefined);
  }

  const productionFiles = [adminRoot, ...componentRoots].flatMap(filesUnder);
  for (const path of productionFiles) {
    assert.ok(['.ts', '.wxml', '.wxss', '.json'].includes(extname(path)), `native file only: ${path}`);
  }
  for (const name of pageNames) {
    const config = JSON.parse(page(name, 'json'));
    for (const target of Object.values(config.usingComponents ?? {})) {
      assert.ok(
        target.startsWith('/components/') || target.startsWith('tdesign-miniprogram/'),
        `${name} uses only native/TDesign components`,
      );
    }
  }
});
