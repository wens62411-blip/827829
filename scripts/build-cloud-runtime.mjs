import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { cloudRuntimeSourceHash } from './cloud-runtime-hash.mjs';

const root = process.cwd();
const sourceHash = cloudRuntimeSourceHash(root);
const entryPoints = {
  'cloudfunctions/_shared/auth/index': 'cloudfunctions/_shared/auth/index.ts',
  'cloudfunctions/_shared/rbac/index': 'cloudfunctions/_shared/rbac/index.ts',
  'cloudfunctions/_shared/errors/index': 'cloudfunctions/_shared/errors/index.ts',
  'cloudfunctions/_shared/errors/envelope': 'cloudfunctions/_shared/errors/envelope.ts',
  'cloudfunctions/_shared/validation/index': 'cloudfunctions/_shared/validation/index.ts',
  'cloudfunctions/_shared/idempotency/index': 'cloudfunctions/_shared/idempotency/index.ts',
  'cloudfunctions/_shared/audit/index': 'cloudfunctions/_shared/audit/index.ts',
  'cloudfunctions/_shared/projections/index': 'cloudfunctions/_shared/projections/index.ts',
  'cloudfunctions/identityApi/index': 'cloudfunctions/identityApi/index.ts',
  'cloudfunctions/socialApi/index': 'cloudfunctions/socialApi/index.ts',
  'cloudfunctions/eventApi/index': 'cloudfunctions/eventApi/index.ts',
  'cloudfunctions/contentApi/index': 'cloudfunctions/contentApi/index.ts',
  'cloudfunctions/adminApi/index': 'cloudfunctions/adminApi/index.ts',
};

await build({
  absWorkingDir: root,
  entryPoints,
  outdir: root,
  bundle: true,
  allowOverwrite: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'silent',
  banner: {
    js: `// GENERATED FROM TYPESCRIPT BY scripts/build-cloud-runtime.mjs — DO NOT EDIT\n// CLOUD_RUNTIME_SOURCE_SHA256:${sourceHash}`,
  },
});

for (const functionName of ['identityApi', 'socialApi', 'eventApi', 'contentApi', 'adminApi']) {
  const output = resolve(root, 'cloudfunctions', functionName, 'index.js');
  const source = readFileSync(output, 'utf8');
  if (source.includes("require('../_shared") || source.includes('require("../_shared')) {
    throw new Error(`${functionName} runtime bundle still depends on a sibling directory`);
  }
  if (!source.includes('NOT_IMPLEMENTED')) {
    throw new Error(`${functionName} runtime bundle does not contain the frozen fallback`);
  }
}

console.log(`Generated ${Object.keys(entryPoints).length} deterministic cloud runtime bundles from TypeScript.`);

