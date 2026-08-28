import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const miniRoot = join(root, 'miniprogram');
const app = JSON.parse(readFileSync(join(miniRoot, 'app.json'), 'utf8'));
const extensions = ['.ts', '.json', '.wxml', '.wxss'];

const mainRoutes = app.pages;
const subRoutes = app.subpackages.flatMap((subpackage) =>
  subpackage.pages.map((page) => `${subpackage.root}/${page}`),
);
const allRoutes = [...mainRoutes, ...subRoutes];
const missing = allRoutes.flatMap((route) =>
  extensions
    .map((extension) => join(miniRoot, `${route}${extension}`))
    .filter((file) => !existsSync(file)),
);

function directoryBytes(directory) {
  return readdirSync(directory, { withFileTypes: true }).reduce((sum, entry) => {
    const path = join(directory, entry.name);
    if (entry.name === 'miniprogram_npm') return sum;
    return sum + (entry.isDirectory() ? directoryBytes(path) : statSync(path).size);
  }, 0);
}

function directoryContains(directory, pattern) {
  return readdirSync(directory, { withFileTypes: true }).some((entry) => {
    const path = join(directory, entry.name);
    if (entry.name === 'miniprogram_npm') return false;
    if (entry.isDirectory()) return directoryContains(path, pattern);
    return entry.name.endsWith('.json') && pattern.test(readFileSync(path, 'utf8'));
  });
}

const sourceBytes = directoryBytes(miniRoot);
const tdesignDist = join(root, 'node_modules', 'tdesign-miniprogram', 'miniprogram_dist');
const installedTdesignBytes = existsSync(tdesignDist) ? directoryBytes(tdesignDist) : 0;
const tdesignRuntimeReferenced = directoryContains(miniRoot, /tdesign-miniprogram\//);
const referencedDependencyBytes = tdesignRuntimeReferenced ? installedTdesignBytes : 0;
const conservativeProjectedBytes = sourceBytes + referencedDependencyBytes;
const report = {
  kind: 'STATIC_SOURCE_BUDGET_ONLY',
  routeCount: allRoutes.length,
  mainRouteCount: mainRoutes.length,
  subpackageRouteCount: subRoutes.length,
  missingPageFiles: missing,
  sourceBytesExcludingBuiltNpm: sourceBytes,
  installedTdesignMiniprogramDistBytes: installedTdesignBytes,
  tdesignRuntimeReferenced,
  referencedDependencyBytes,
  conservativeProjectedBytes,
  sourceBudgetBytes: 2 * 1024 * 1024,
  conservativeStaticBudgetPass: conservativeProjectedBytes < 2 * 1024 * 1024,
  builtNpmPresent: existsSync(join(miniRoot, 'miniprogram_npm')),
  devtoolsPackageGate: 'UNVERIFIED',
  caveat: 'Source plus registered runtime dependencies only; Developer Tools still provides the authoritative package result.',
};

console.log(JSON.stringify(report, null, 2));
if (missing.length > 0 || installedTdesignBytes === 0 || !report.conservativeStaticBudgetPass) process.exit(1);
