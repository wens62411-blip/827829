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
  const anchor = source.search(/所在城市群|当前城市群|我的城市群/);
  if (anchor < 0) return '';
  return source.slice(Math.max(0, anchor - 600), Math.min(source.length, anchor + 3600));
}

function referencedBoundaryCopy(templateWindow, pageSource) {
  const bindings = [...templateWindow.matchAll(/\{\{\s*([A-Za-z_$][\w$]*)/g)].map((match) => match[1]);
  const boundary = /待运营确认|运营确认后|OFFLINE[_ ]DEMO|离线示例|仅(?:记录|保留)(?:加入)?意向|仅作意向|不会(?:真实)?提交|不代表(?:已经|已)|尚未接入|未接入/;
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

test('home keeps card primary while events, art, restrained network, and 7-country/13-city scope remain visible', () => {
  const template = read('miniprogram/pages/discover/index.wxml');
  const geography = read('miniprogram/shared/constants/geography.ts');
  const actions = interactiveMarkup(template);
  const errors = [];

  const cardActions = actions.filter((markup) => /^\/(?:pages\/card\/index|packageCard\/pages\/(?:edit|view|share)\/index)/.test(attribute(markup, 'url')));
  const primaryCard = cardActions.find((markup) => /primary/i.test(attribute(markup, 'class')));
  if (!primaryCard) errors.push('首页缺少指向名片创建/展示/分享路径的主动作');

  const eventActions = actions.filter((markup) => /^\/(?:pages\/events|packageEvents\/pages\/event)\//.test(attribute(markup, 'url')));
  if (!eventActions.length) errors.push('首页缺少轻量活动入口');

  const artActions = actions.filter((markup) => /^\/packageArt\//.test(attribute(markup, 'url')));
  if (!artActions.length) errors.push('首页缺少艺术频道轻入口');

  const networkActions = actions.filter((markup) => /^\/pages\/network\//.test(attribute(markup, 'url')));
  if (networkActions.length !== 1) errors.push(`首页人脉入口应克制为一个，当前为 ${networkActions.length} 个`);
  if (networkActions.some((markup) => /primary/i.test(attribute(markup, 'class')))) {
    errors.push('首页人脉入口不应使用主动作视觉层级');
  }

  const primaryOffset = primaryCard ? template.indexOf(primaryCard) : -1;
  for (const [label, candidates] of [['活动', eventActions], ['艺术', artActions], ['人脉', networkActions]]) {
    const firstOffset = candidates.length ? template.indexOf(candidates[0]) : -1;
    if (primaryOffset >= 0 && firstOffset >= 0 && firstOffset < primaryOffset) {
      errors.push(`${label}入口出现在名片主动作之前`);
    }
  }

  if (!hasGeographySummary(template)) errors.push('首页未明确展示 7 国 13 城摘要');
  if (constantObjectSize(geography, 'CountryId') !== 7) errors.push('冻结地理常量不是 7 个国家');
  if (constantObjectSize(geography, 'CityId') !== 13) errors.push('冻结地理常量不是 13 座城市');

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

test('Me page exposes current city group plus apply and switch-city controls', () => {
  const template = read('miniprogram/pages/me/index.wxml');
  const actions = interactiveMarkup(template);
  const errors = [];

  if (!/所在城市群|当前城市群|我的城市群/.test(template)) errors.push('“我的”页缺少所在城市群区块');
  if (!actions.some((markup) => /申请加入|申请进入|加入城市群|提交加入意向/.test(markup))) {
    errors.push('“我的”页缺少可操作的申请加入入口');
  }
  if (!actions.some((markup) => /切换城市|更换城市|选择城市/.test(markup))) {
    errors.push('“我的”页缺少可操作的切换城市入口');
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
  const boundary = /待运营确认|运营确认后|OFFLINE[_ ]DEMO|离线示例|仅(?:记录|保留)(?:加入)?意向|仅作意向|不会(?:真实)?提交|不代表(?:已经|已)|尚未接入|未接入/;
  const errors = [];

  if (!groupSurface) {
    errors.push('无法定位“我的”页城市群区块，因而无法验证能力边界');
  } else if (!boundary.test(groupSurface) && !referencedBoundaryCopy(groupSurface, pageSource)) {
    errors.push('城市群区块没有“待运营确认”或 OFFLINE_DEMO/未接入边界说明');
  }

  const positiveClaims = unnegatedPositiveClaims(`${groupSurface}\n${pageSource}`);
  if (positiveClaims.length) errors.push(`城市群页面声称未经支持的真实结果：${positiveClaims.join(', ')}`);
  if (/\bLIVE\b/.test(groupSurface) || /(?:cityGroup|cityNode|clubNode)[^\n]{0,100}\bLIVE\b/i.test(pageSource)) {
    errors.push('城市群区块声称 LIVE，但冻结合同没有加入能力');
  }

  assert.deepEqual(errors, []);
});
