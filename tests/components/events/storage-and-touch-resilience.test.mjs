import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');

test('safe storage keeps an in-memory mirror when device storage throws', () => {
  const source = read('miniprogram/shared/utils/safe-storage.ts');
  assert.match(source, /const volatileStorage = new Map/);
  assert.match(source, /wx\.getStorageSync/);
  assert.match(source, /wx\.setStorageSync/);
  assert.match(source, /return mirrored === undefined \? fallback : mirrored as T/);
  assert.match(source, /Fail open to the process-local mirror/);
  assert.match(source, /volatileStorage\.set\(key, value\)/);
});

test('safe storage mirrors persisted values before returning them', () => {
  const source = read('miniprogram/shared/utils/safe-storage.ts');
  assert.match(source, /if \(persisted !== undefined && persisted !== null && persisted !== ''\)/);
  assert.match(source, /volatileStorage\.set\(key, persisted\)/);
  assert.match(source, /return persisted/);
});

test('activity portal and calendar controls meet the shared touch target', () => {
  const portalStyles = read('miniprogram/pages/events/index.wxss');
  const calendarStyles = read('miniprogram/packageEvents/pages/calendar/index.wxss');
  assert.match(portalStyles, /\.portal-entry\s*\{[\s\S]*min-height:\s*180rpx/);
  assert.match(calendarStyles, /\.calendar-month-tab\s*\{[\s\S]*min-height:\s*var\(--ab-touch-target\)/);
  assert.match(calendarStyles, /\.calendar-event\s*\{[\s\S]*padding:/);
  assert.match(portalStyles, /overflow-wrap:\s*anywhere/);
  assert.match(calendarStyles, /overflow:\s*hidden/);
  assert.match(calendarStyles, /--canvas:\s*#24211e/);
  assert.match(calendarStyles, /--ink:\s*#f7f2e9/);
});
