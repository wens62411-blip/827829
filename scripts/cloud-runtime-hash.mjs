import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

function collectTypeScript(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTypeScript(path);
    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  });
}

export function cloudRuntimeSourceHash(root) {
  const sourceRoots = [
    join(root, 'cloudfunctions'),
    join(root, 'miniprogram', 'shared', 'contracts'),
    join(root, 'miniprogram', 'shared', 'types'),
    join(root, 'miniprogram', 'shared', 'constants'),
  ];
  const files = sourceRoots.flatMap(collectTypeScript).sort();
  const digest = createHash('sha256');
  for (const file of files) {
    digest.update(relative(root, file).replaceAll('\\', '/'));
    digest.update('\0');
    digest.update(readFileSync(file));
    digest.update('\0');
  }
  return digest.digest('hex');
}

