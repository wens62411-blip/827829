import assert from 'node:assert/strict';
import { build } from 'esbuild';
import test from 'node:test';

const root = new URL('../../..', import.meta.url);
const bundle = await build({
  absWorkingDir: decodeURIComponent(root.pathname.replace(/^\/(?:([A-Za-z]:))/, '$1')),
  entryPoints: ['miniprogram/packageArt/services/content-client.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  logLevel: 'silent',
});
const source = bundle.outputFiles[0]?.text;
assert.ok(source);
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const { isArtIntentProjection, validateArtIntentResponse } = await import(moduleUrl);

const active = Object.freeze({
  intentId: 'content-intent_art_123456',
  contentId: 'content_art_123456',
  userId: 'user_art_123456',
  state: 'ACTIVE',
  purpose: 'VIEWING',
  message: '希望了解线下资料阅读安排。',
  version: 1,
  createdAt: '2026-08-27T10:00:00Z',
  updatedAt: '2026-08-27T10:00:00Z',
});

test('intent projection validator rejects malformed identity, purpose, version and time fields', () => {
  assert.equal(isArtIntentProjection(active), true);
  for (const invalid of [
    { ...active, userId: '' },
    { ...active, purpose: 'ORDER' },
    { ...active, version: 0 },
    { ...active, updatedAt: 'not-a-time' },
    { ...active, createdAt: '2026-08-28T10:00:00Z' },
  ]) {
    assert.equal(isArtIntentProjection(invalid), false);
  }
});

test('create response must be ACTIVE and bound to the requested content', () => {
  const success = { ok: true, requestId: 'req_art_create_123456', data: { intent: active } };
  assert.equal(validateArtIntentResponse(success, {
    contentId: active.contentId,
    state: 'ACTIVE',
  }).ok, true);
  assert.equal(validateArtIntentResponse(success, {
    contentId: 'content_other_123456',
    state: 'ACTIVE',
  }).ok, false);
  assert.equal(validateArtIntentResponse(success, {
    contentId: active.contentId,
    state: 'CANCELLED',
  }).ok, false);
});

test('cancel response must match the intent and advance its optimistic version', () => {
  const cancelled = { ...active, state: 'CANCELLED', version: 2, updatedAt: '2026-08-27T10:01:00Z' };
  const success = { ok: true, requestId: 'req_art_cancel_123456', data: { intent: cancelled } };
  assert.equal(validateArtIntentResponse(success, {
    intentId: active.intentId,
    state: 'CANCELLED',
    versionGreaterThan: 1,
  }).ok, true);
  assert.equal(validateArtIntentResponse(success, {
    intentId: 'content-intent_other_123456',
    state: 'CANCELLED',
    versionGreaterThan: 1,
  }).ok, false);
  assert.equal(validateArtIntentResponse(success, {
    intentId: active.intentId,
    state: 'CANCELLED',
    versionGreaterThan: 2,
  }).ok, false);
});
