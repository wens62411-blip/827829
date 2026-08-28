import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = process.cwd();
const failures = [];
const pass = [];

function readJson(relativePath) {
  const fullPath = join(root, relativePath);
  try {
    return JSON.parse(readFileSync(fullPath, 'utf8'));
  } catch (error) {
    failures.push(`${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

function check(condition, message) {
  if (condition) pass.push(message);
  else failures.push(message);
}

const frozen = readJson('docs/contracts/FROZEN.json');
check(frozen?.contractVersion === '1.0.0', 'contractVersion is exactly 1.0.0');
check(frozen?.frozen === true, 'contract is frozen');
check(
  JSON.stringify(frozen?.owners) === JSON.stringify(['foundation', 'integration']),
  'frozen contract has both required owners',
);

const actionFunctions = {
  identityApi: 10,
  socialApi: 17,
  eventApi: 12,
  contentApi: 7,
  adminApi: 13,
};
const actionDocs = Object.entries(actionFunctions).flatMap(([functionName, expectedCount]) => {
  const document = readJson(`docs/contracts/actions/${functionName}.json`);
  check(document?.contractVersion === '1.0.0', `${functionName} action contract is v1.0.0`);
  check(document?.functionName === functionName, `${functionName} document owns its actions`);
  check(document?.actions?.length === expectedCount, `${functionName} has ${expectedCount} actions`);
  return document?.actions ?? [];
});

const actionNames = actionDocs.map((entry) => entry.action);
check(actionNames.length === 59, 'action registry total is exactly 59');
check(new Set(actionNames).size === 59, 'all action names are unique');
check(new Set(actionDocs.map((entry) => entry.requestDto)).size === 59, 'all request DTO names are unique');
check(new Set(actionDocs.map((entry) => entry.responseDto)).size === 59, 'all response DTO names are unique');

for (const entry of actionDocs) {
  check(typeof entry.auth === 'string', `${entry.action} freezes auth`);
  check(Array.isArray(entry.writableCollections), `${entry.action} freezes writable collections`);
  check(
    entry.idempotency === 'REQUIRED' || entry.idempotency === 'NOT_APPLICABLE',
    `${entry.action} freezes idempotency`,
  );
  check(entry.errorCodes?.includes('NOT_IMPLEMENTED'), `${entry.action} permits NOT_IMPLEMENTED`);
}

const actionMap = readFileSync(join(root, 'miniprogram/shared/contracts/action-map.ts'), 'utf8');
check(/CloudActionMap\[Action\]\['payload'\]/.test(actionMap), 'CloudActionMap statically infers payload');
check(/CloudActionMap\[Action\]\['data'\]/.test(actionMap), 'CloudActionMap statically infers data');
for (const action of actionNames) {
  check(actionMap.includes(`'${action}'`), `CloudActionMap contains ${action}`);
}

const app = readJson('miniprogram/app.json');
check(app?.entryPagePath === 'pages/discover/index', 'Discover is the explicit phase-one entry page');
check(app?.tabBar?.list?.length === 3, 'phase-one tabBar contains exactly three items');
check(
  JSON.stringify(app?.tabBar?.list?.map((item) => item.text)) === JSON.stringify(['发现', '活动', '我的']),
  'phase-one tabBar is Discover, Events, and Me only',
);
check(!app?.pages?.includes('pages/bootstrap/index'), 'bootstrap interstitial is not a registered route');
check(!app?.subpackages?.some((item) => item.independent === true), 'all subpackages can consume main shared contracts');

const project = readJson('project.config.json');
check(project?.appid === '', 'project AppID is intentionally empty');
check(project?.setting?.packNpmManually === true, 'root npm manual mapping is enabled');
check(
  project?.setting?.packNpmRelationList?.[0]?.packageJsonPath === './package.json' &&
    project?.setting?.packNpmRelationList?.[0]?.miniprogramNpmDistDir === './miniprogram/',
  'root package maps into miniprogram for Developer Tools npm build',
);

const pkg = readJson('package.json');
check(pkg?.dependencies?.['tdesign-miniprogram'] === '1.16.0', 'TDesign is pinned to 1.16.0');
for (const forbidden of ['@tarojs/taro', 'uni-app', 'vant-weapp', 'weui-miniprogram']) {
  check(pkg?.dependencies?.[forbidden] === undefined, `${forbidden} is absent`);
}

const rootFiles = readdirSync(root);
const lockfiles = rootFiles.filter((name) => ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb'].includes(name));
check(JSON.stringify(lockfiles) === JSON.stringify(['package-lock.json']), 'repository has exactly one lockfile');

const manifestSchema = readJson('integration/manifests/schema.json');
const foundationManifest = readJson('integration/manifests/foundation.json');
if (manifestSchema && foundationManifest) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(manifestSchema);
  check(validate(foundationManifest), `foundation manifest matches schema${validate.errors ? `: ${JSON.stringify(validate.errors)}` : ''}`);
}

for (const required of [
  'docs/contracts/file-ownership.md',
  'docs/contracts/projection-protocol.md',
  'cloudfunctions/_shared/projections',
  'database/security-rules',
  'integration/manifests/foundation.json',
]) {
  check(existsSync(join(root, required)), `${required} exists`);
}

console.log(JSON.stringify({ passCount: pass.length, failureCount: failures.length, failures }, null, 2));
if (failures.length > 0) process.exit(1);
