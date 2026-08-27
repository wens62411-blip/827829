import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../../', import.meta.url));
let runtimePromise;

/**
 * Bundle the authoritative TypeScript entrypoint without writing generated JS.
 * This keeps the admin tests inside their ownership boundary while still
 * exercising exactly the source that the integration build will bundle.
 */
export function loadAdminRuntime() {
  runtimePromise ??= (async () => {
    const entrypoint = join(root, 'cloudfunctions', 'adminApi', 'index.ts');
    const result = await build({
      absWorkingDir: root,
      entryPoints: [entrypoint],
      bundle: true,
      format: 'cjs',
      platform: 'node',
      target: 'node18',
      write: false,
      sourcemap: false,
      legalComments: 'none',
      logLevel: 'silent',
    });
    const output = result.outputFiles?.[0];
    if (output === undefined) throw new Error('esbuild returned no in-memory adminApi bundle');

    const moduleRecord = { exports: {} };
    const evaluate = new Function(
      'exports', 'require', 'module', '__filename', '__dirname',
      `${output.text}\n//# sourceURL=${entrypoint.replaceAll('\\', '/')}`,
    );
    evaluate(moduleRecord.exports, require, moduleRecord, entrypoint, dirname(entrypoint));
    return Object.freeze(moduleRecord.exports);
  })();
  return runtimePromise;
}

