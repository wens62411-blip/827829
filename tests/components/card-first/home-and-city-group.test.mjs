import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (path) => readFileSync(resolve(repoRoot, path), 'utf8');

function interactiveMarkup(source) {
  return [...source.matchAll(/<(button|navigator|picker)\b[\s\S]*?<\/\1>/g)]
    .map((match) => match[0]);
}

function attribute(markup, name) {
  return markup.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'))?.[1] ?? '';
}

function constantObjectSize(source, name) {
  const body = source.match(new RegExp(`export const ${name}\\s*=\\s*\\{([\\s\\S]*?)\\}\\s*as const`))?.[1] ?? '';
  return [...body.matchAll(/^\s*[A-Z0-9_]+\s*:/gm)].length;
}

function hasGeographySummary(source) {
  const countriesThenCities = /7\s*(?:个\s*)?(?:国|COUNTR(?:Y|IES))[\s\S]{0,32}?13\s*(?:座|个\s*)?(?:城|CIT(?:Y|IES))/i;
  const citiesThenCountries = /13\s*(?:座|个\s*)?(?:城|CIT(?:Y|IES))[\s\S]{0,32}?7\s*(?:个\s*)?(?:国|COUNTR(?:Y|IES))/i;
  return countriesThenCities.test(source) || citiesThenCountries.test(source);
}

function cityGroupWindow(source) {
  const anchor = source.search(/所在城市群|当前城市群|我的城市群|支持的城市清单/);
  if (anchor < 0) return '';
  return source.slice(Math.max(0, anchor - 600), Math.min(source.length, anchor + 3600));
}

function referencedBoundaryCopy(templateWindow, pageSource) {
  const bindings = [...templateWindow.matchAll(/\{\{\s*([A-Za-z_$][\w$]*)/g)].map((match) => match[1]);
  const boundary = /待运营确认|运营确认后|OFFLINE[_ ]DEMO|离线示例|仅(?:记录|保留)(?:加入)?意向|仅作意向|不会(?:真实)?提交|不代表(?:已经|已)|尚未接入|未接入|逐步开放/;
  return bindings.some((binding) => {
    const assignmentPattern = binding + "\\s*:\\s*(['\"`])([\\s\\S]*?)\\1";
    const assignment = pageSource.match(new RegExp(assignmentPattern));
    return assignment ? boundary.test(assignment[2]) : false;
  });
}

function unnegatedPositiveClaims(source) {
  const positive = /申请已提交|已提交申请|提交成功|申请成功|加入成功|已加入(?:[^。；\n<]{0,16})?(?:城市群|城市节点|群组)|(?:城市群|城市节点|群组)[^。；\n<]{0,12}(?:LIVE|已上线|运营中)/gi;
  const negation = /未|不代表|不会|并非|没有|不可|不能|非真实|请勿理解为/;
  const findings = [];
  for (const match of source.matchAll(positive)) {
    const context = source.slice(Math.max(0, match.index - 18), Math.min(source.length, match.index + match[0].length + 8));
    if (!negation.test(context)) findings.push(match[0]);
  }
  return [...new Set(findings)];
}

test('home keeps card management inside Me while events and city scope remain visible', () => {
  const template = read('miniprogram/pages/discover/index.wxml');
  const pageSource = read('miniprogram/pages/discover/index.ts');
  const geography = read('miniprogram/shared/constants/geography.ts');
  const actions = interactiveMarkup(template);
  const errors = [];

  const cardActions = actions.filter((markup) => /^\/(?:pages\/card\/index|packageCard\/pages\/(?:edit|view|share)\/index)/.test(attribute(markup, 'url')));
  if (cardActions.length) errors.push(`首页不应绕过“我的”直达名片管理，当前为 ${cardActions.length} 个`);

  const eventActions = actions.filter((markup) => /^\/(?:pages\/events|packageEvents\/pages\/event)\//.test(attribute(markup, 'url')));
  if (!eventActions.length) errors.push('首页缺少轻量活动入口');

  if (!hasGeographySummary(template)) errors.push('首页未明确展示 7 国 13 城摘要');
  if (/台北/.test(`${template}\n${pageSource}`)) errors.push('首页城市摘要不应超出冻结的 13 城目录');
  if (constantObjectSize(geography, 'CountryId') !== 7) errors.push('冻结地理常量不是 7 个国家');
  if (constantObjectSize(geography, 'CityId') !== 13) errors.push('冻结地理常量不是 13 座城市');
  if (!/杭州/.test(geography)) errors.push('城市目录缺少杭州');

  assert.deepEqual(errors, []);
});

test('home has no slogan, public group QR, feed metrics, or direct-chat affordance', () => {
  const template = read('miniprogram/pages/discover/index.wxml');
  const pageSource = read('miniprogram/pages/discover/index.ts');
  const actions = interactiveMarkup(template).join('\n');
  const errors = [];

  if (/连接可以克制，也可以长久/.test(`${template}\n${pageSource}`)) {
    errors.push('首页仍出现已否决口号“连接可以克制，也可以长久”');
  }
  if (/动态(?:流)?|点赞|粉丝|直接聊天|私聊|发消息|群聊|扫码(?:加入|进入)?群|群二维码/.test(actions)) {
    errors.push('首页存在动态/点赞/粉丝/直接聊天或入群二维码导向');
  }
  if (/<image\b[^>]*(?:group[^>]*qr|qr[^>]*group|city-group-qr|群二维码)[^>]*>/i.test(template)
      || /\b(?:groupQr|groupQrCode|cityGroupQr|publicGroupQr)\b/i.test(`${template}\n${pageSource}`)) {
    errors.push('首页仍嵌入公开群二维码');
  }
  if (/\b(?:likeCount|likes|followerCount|followers|fanCount|socialFeed|timeline|moments|chatThreads|onlineStatus)\b/i.test(`${template}\n${pageSource}`)) {
    errors.push('首页仍绑定动态、点赞、粉丝或聊天状态数据');
  }
  if (/\burl="[^"]*\/(?:chat|feed|timeline|moments|group-chat)(?:\/|\?|"|$)/i.test(template)) {
    errors.push('首页仍提供动态流或聊天路由');
  }

  assert.deepEqual(errors, []);
});

test('Me page exposes the supported city list and keeps only the profile edit entry', () => {
  const template = read('miniprogram/pages/me/index.wxml');
  const actions = interactiveMarkup(template);
  const errors = [];

  if (!/支持的城市清单/.test(template)) errors.push('“我的”页缺少支持的城市清单');
  if (!actions.some((markup) => /编辑/.test(markup) && /url="\/packageCard\/pages\/edit\/index"/.test(markup))) {
    errors.push('“我的”页缺少个人资料编辑入口');
  }
  if (actions.some((markup) => /url="\/pages\/card\/index"/.test(markup))) {
    errors.push('“我的”页仍保留重复的我的名片入口');
  }
  if (actions.some((markup) => /申请加入|申请进入|加入城市群|提交加入意向|切换城市/.test(markup))) {
    errors.push('“我的”页不应暴露城市群申请或切换城市动作');
  }

  assert.deepEqual(errors, []);
});

test('city-group UI stays OFFLINE_DEMO or operations-pending while frozen contracts have no join action', () => {
  const actionDirectory = resolve(repoRoot, 'docs/contracts/actions');
  const frozenActions = readdirSync(actionDirectory)
    .filter((name) => name.endsWith('.json'))
    .flatMap((name) => JSON.parse(read(`docs/contracts/actions/${name}`)).actions ?? [])
    .map((entry) => String(entry.action));
  const joinActions = frozenActions.filter((action) => (
    /(?:city|node|group).*(?:join|apply)|(?:join|apply).*(?:city|node|group)/i.test(action)
  ));
  assert.deepEqual(joinActions, [], `冻结合同意外出现城市群加入动作：${joinActions.join(', ')}`);

  const template = read('miniprogram/pages/me/index.wxml');
  const pageSource = read('miniprogram/pages/me/index.ts');
  const groupSurface = cityGroupWindow(template);
  const boundary = /待运营确认|运营确认后|OFFLINE[_ ]DEMO|离线示例|仅(?:记录|保留)(?:加入)?意向|仅作意向|不会(?:真实)?提交|不代表(?:已经|已)|尚未接入|未接入|逐步开放/;
  const errors = [];

  if (!groupSurface) {
    errors.push('无法定位“我的”页城市群区块，因而无法验证能力边界');
  } else if (!boundary.test(groupSurface) && !referencedBoundaryCopy(groupSurface, pageSource)) {
    errors.push('城市群区块没有“逐步开放”或 OFFLINE_DEMO/未接入边界说明');
  }

  const positiveClaims = unnegatedPositiveClaims(`${groupSurface}\n${pageSource}`);
  if (positiveClaims.length) errors.push(`城市群页面声称未经支持的真实结果：${positiveClaims.join(', ')}`);
  if (/\bLIVE\b/.test(groupSurface) || /(?:cityGroup|cityNode|clubNode)[^\n]{0,100}\bLIVE\b/i.test(pageSource)) {
    errors.push('城市群区块声称 LIVE，但冻结合同没有加入能力');
  }

  assert.deepEqual(errors, []);
});
