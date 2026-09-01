import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const miniRoot = join(root, 'miniprogram');
const app = JSON.parse(readFileSync(join(miniRoot, 'app.json'), 'utf8'));
const extensions = ['.ts', '.json', '.wxml', '.wxss'];
const subpackages = app.subpackages ?? app.subPackages ?? [];
const subpackageRoots = new Set(subpackages.map((subpackage) => subpackage.root));

const mainRoutes = app.pages;
const subRoutes = subpackages.flatMap((subpackage) =>
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

function mainDirectoryBytes() {
  return readdirSync(miniRoot, { withFileTypes: true }).reduce((sum, entry) => {
    if (entry.name === 'miniprogram_npm' || subpackageRoots.has(entry.name)) return sum;
    const path = join(miniRoot, entry.name);
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

function mainDirectoryContains(pattern) {
  return readdirSync(miniRoot, { withFileTypes: true }).some((entry) => {
    if (entry.name === 'miniprogram_npm' || subpackageRoots.has(entry.name)) return false;
    const path = join(miniRoot, entry.name);
    if (entry.isDirectory()) return directoryContains(path, pattern);
    return entry.name.endsWith('.json') && pattern.test(readFileSync(path, 'utf8'));
  });
}

const packageBudgetBytes = 2 * 1024 * 1024;
const mainSourceBytes = mainDirectoryBytes();
const tdesignDist = join(root, 'node_modules', 'tdesign-miniprogram', 'miniprogram_dist');
const installedTdesignBytes = existsSync(tdesignDist) ? directoryBytes(tdesignDist) : 0;
const tdesignPattern = /tdesign-miniprogram\//;
const mainTdesignReferenced = mainDirectoryContains(tdesignPattern);
const mainReferencedDependencyBytes = mainTdesignReferenced ? installedTdesignBytes : 0;
const mainProjectedBytes = mainSourceBytes + mainReferencedDependencyBytes;

const subpackageReports = subpackages.map((subpackage) => {
  const packageRoot = join(miniRoot, subpackage.root);
  const sourceBytes = directoryBytes(packageRoot);
  const tdesignRuntimeReferenced = directoryContains(packageRoot, tdesignPattern);
  const referencedDependencyBytes = tdesignRuntimeReferenced ? installedTdesignBytes : 0;
  const projectedBytes = sourceBytes + referencedDependencyBytes;
  return {
    name: subpackage.name ?? subpackage.root,
    root: subpackage.root,
    routeCount: subpackage.pages.length,
    sourceBytes,
    tdesignRuntimeReferenced,
    referencedDependencyBytes,
    projectedBytes,
    budgetBytes: packageBudgetBytes,
    budgetPass: projectedBytes < packageBudgetBytes,
  };
});

const sourceBytes = mainSourceBytes + subpackageReports.reduce((sum, item) => sum + item.sourceBytes, 0);
const tdesignRuntimeReferenced = mainTdesignReferenced || subpackageReports.some((item) => item.tdesignRuntimeReferenced);
const packageBudgetPass = mainProjectedBytes < packageBudgetBytes && subpackageReports.every((item) => item.budgetPass);
const report = {
  kind: 'STATIC_PACKAGE_TOPOLOGY_ESTIMATE',
  routeCount: allRoutes.length,
  mainRouteCount: mainRoutes.length,
  subpackageRouteCount: subRoutes.length,
  missingPageFiles: missing,
  sourceBytesExcludingBuiltNpm: sourceBytes,
  installedTdesignMiniprogramDistBytes: installedTdesignBytes,
  tdesignRuntimeReferenced,
  mainPackage: {
    routeCount: mainRoutes.length,
    sourceBytes: mainSourceBytes,
    tdesignRuntimeReferenced: mainTdesignReferenced,
    referencedDependencyBytes: mainReferencedDependencyBytes,
    projectedBytes: mainProjectedBytes,
    budgetBytes: packageBudgetBytes,
    budgetPass: mainProjectedBytes < packageBudgetBytes,
  },
  subpackages: subpackageReports,
  packageBudgetBytes,
  packageBudgetPass,
  conservativeStaticBudgetPass: packageBudgetPass,
  builtNpmPresent: existsSync(join(miniRoot, 'miniprogram_npm')),
  devtoolsPackageGate: 'UNVERIFIED',
  caveat: 'Static main/subpackage estimate only. Developer Tools preview or upload info-output remains the authoritative package result.',
};

console.log(JSON.stringify(report, null, 2));
if (missing.length > 0 || installedTdesignBytes === 0 || !packageBudgetPass) process.exit(1);
