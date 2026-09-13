import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const miniRoot = fileURLToPath(new URL('../../miniprogram/', import.meta.url));

// Check sibling relationships, not merely the presence of wx:if somewhere
// earlier in a file. Quoted expressions may themselves contain > characters.
function conditionChainErrors(source) {
  const markup = source.replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\r\n]/g, ' '));
  const tokens = /<\/?[\w:-]+(?:[^>"']|"[^"]*"|'[^']*')*>/g;
  const stack = [{ name: '#root', previous: null }];
  const errors = [];
  let offset = 0;
  for (const token of markup.matchAll(tokens)) {
    const frame = stack.at(-1);
    if (markup.slice(offset, token.index).trim()) frame.previous = null;
    offset = token.index + token[0].length;
    const tag = token[0];
    if (tag.startsWith('</')) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const directive = tag.match(/\bwx:(if|elif|else)(?=[\s=/>])/g)?.map((item) => item.slice(3)) ?? [];
    const current = directive[0] ?? null;
    const line = markup.slice(0, token.index).split('\n').length;
    if (directive.length > 1) errors.push(`line ${line}: multiple conditional directives`);
    if ((current === 'elif' || current === 'else') && frame.previous !== 'if' && frame.previous !== 'elif') {
      errors.push(`line ${line}: wx:${current} has no adjacent wx:if/wx:elif sibling`);
    }
    frame.previous = current;
    if (!/\/\s*>$/.test(tag)) stack.push({ name: tag.match(/^<([\w:-]+)/)[1], previous: null });
  }
  return errors;
}

function wxmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'miniprogram_npm' || entry.name === 'node_modules') return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? wxmlFiles(path) : entry.name.endsWith('.wxml') ? [path] : [];
  });
}

test('WXML condition checker respects sibling scope and rejects orphaned branches', () => {
  assert.deepEqual(conditionChainErrors('<view><text wx:if="{{count > 0}}">A</text><!-- spacing --><text wx:elif="{{other}}">B</text><text wx:else>C</text></view>'), []);
  for (const invalid of [
    '<view/><text wx:else>Missing source</text>',
    '<view><text wx:if="{{ready}}"/></view><text wx:else/>',
    '<view wx:if="{{ready}}"/><view/><text wx:elif="{{pending}}"/>',
    '<view wx:if="{{ready}}"/><view wx:else/><text wx:else/>',
  ]) assert.ok(conditionChainErrors(invalid).length > 0, invalid);
  assert.deepEqual(conditionChainErrors('<view><text wx:if="{{!sourceUrl}}">No source</text><button wx:if="{{sourceUrl}}">Copy source</button></view>'), []);
});

test('all first-party WXML conditional branches retain valid adjacent sibling chains', () => {
  const errors = wxmlFiles(miniRoot).flatMap((path) =>
    conditionChainErrors(readFileSync(path, 'utf8')).map((message) => `${relative(miniRoot, path)}: ${message}`),
  );
  assert.deepEqual(errors, []);
});
