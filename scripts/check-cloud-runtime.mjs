import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cloudRuntimeSourceHash } from './cloud-runtime-hash.mjs';

const root = process.cwd();
const sourceHash = cloudRuntimeSourceHash(root);
const outputs = [
  'cloudfunctions/_shared/auth/index.js',
  'cloudfunctions/_shared/rbac/index.js',
  'cloudfunctions/_shared/errors/index.js',
  'cloudfunctions/_shared/errors/envelope.js',
  'cloudfunctions/_shared/validation/index.js',
  'cloudfunctions/_shared/idempotency/index.js',
  'cloudfunctions/_shared/audit/index.js',
  'cloudfunctions/_shared/projections/index.js',
  'cloudfunctions/identityApi/index.js',
  'cloudfunctions/socialApi/index.js',
  'cloudfunctions/eventApi/index.js',
  'cloudfunctions/contentApi/index.js',
  'cloudfunctions/adminApi/index.js',
];

for (const relativePath of outputs) {
  const source = readFileSync(join(root, relativePath), 'utf8');
  if (!source.includes(`CLOUD_RUNTIME_SOURCE_SHA256:${sourceHash}`)) {
    throw new Error(`${relativePath} is stale; run npm run build:cloud-runtime`);
  }
}

for (const functionName of ['identityApi', 'socialApi', 'eventApi', 'contentApi', 'adminApi']) {
  const source = readFileSync(join(root, 'cloudfunctions', functionName, 'index.js'), 'utf8');
  if (source.includes("require('../_shared") || source.includes('require("../_shared')) {
    throw new Error(`${functionName} runtime is not self-contained`);
  }
  if (!source.includes('NOT_IMPLEMENTED')) {
    throw new Error(`${functionName} runtime is missing the frozen fallback`);
  }
}

console.log(`Cloud runtime bundles match TypeScript source SHA-256 ${sourceHash}.`);

