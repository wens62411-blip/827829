import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('verified tag is visible only for human reviewed APPROVED claims', () => {
  const source = read('miniprogram/components/ab-verified-tag/index.ts');
  const template = read('miniprogram/components/ab-verified-tag/index.wxml');
  const config = JSON.parse(read('miniprogram/components/ab-verified-tag/index.json'));
  assert.match(source, /reviewStatus === ReviewStatus\.APPROVED\s*&&\s*verificationState === VerificationState\.HUMAN_REVIEWED/);
  assert.doesNotMatch(source, /AI_CONSISTENCY_CHECKED.*visible:\s*true/s);
  assert.match(template, /人工审核/);
  assert.doesNotMatch(template, /<t-tag/);
  assert.equal(config.usingComponents, undefined);
});

test('evidence label exposes all honest runtime modes', () => {
  const source = read('miniprogram/components/ab-evidence-label/index.ts');
  for (const mode of ['LIVE', 'DEGRADED', 'OFFLINE_DEMO']) assert.match(source, new RegExp(mode));
  for (const label of ['正式服务', '服务受限', '本机预览']) assert.match(source, new RegExp(label));
  assert.doesNotMatch(read('miniprogram/components/ab-evidence-label/index.wxml'), /OFFLINE_DEMO|DEMO_ONLY|SYNTHETIC/);
});

test('visual baseline avoids prohibited patterns and supports accessibility preferences', () => {
  const appStyles = read('miniprogram/app.wxss');
  const tokens = read('miniprogram/shared/design-tokens/tokens.wxss');
  assert.match(tokens, /--ab-color-ivory:\s*#F4EFE6/i);
  assert.match(tokens, /--ab-color-ink:\s*#211E1A/i);
  assert.match(tokens, /--ab-color-champagne-deep:\s*#8A6A36/i);
  assert.match(tokens, /--ab-color-paper-white:\s*#FFFDF8/i);
  assert.match(tokens, /--ab-color-dark-canvas:\s*#161412/i);
  assert.doesNotMatch(tokens, /--ab-color-(?:green|wine|burgundy)\b|#(?:173C32|102821|1D463B|7B3038|6B2637|70464A)/i);
  assert.match(tokens, /--ab-touch-target:\s*88rpx/);
  assert.match(appStyles, /prefers-reduced-motion/);
  assert.match(appStyles, /safe-area-inset-bottom|safe-area-inset-bottom/s);
  assert.doesNotMatch(`${appStyles}\n${tokens}`, /linear-gradient|radial-gradient|#(?:7c3aed|8b5cf6|a855f7)/i);
});
