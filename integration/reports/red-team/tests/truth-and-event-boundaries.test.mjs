import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `missing start marker: ${start}`);
  assert.notEqual(endIndex, -1, `missing end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

test('[P0][OPEN] public content predicate has no human-review or ReviewLog requirement', () => {
  const service = read('cloudfunctions/contentApi/service.ts');
  const publicCandidate = sliceBetween(
    service,
    'function isPublicCandidate',
    'function parsePublishedContent',
  );
  assert.match(publicCandidate, /publicationState\s*===\s*PublicationState\.PUBLISHED/);
  assert.match(publicCandidate, /publicVisible\s*===\s*true/);
  assert.doesNotMatch(publicCandidate, /HUMAN_REVIEWED|ReviewLog|reviewLog/);
});

test('[P0][OPEN] related-event read gate accepts published readable projections without origin/review checks', () => {
  const service = read('cloudfunctions/contentApi/service.ts');
  const related = sliceBetween(
    service,
    'async function listRelatedEvents',
    'async function createIntent',
  );
  assert.match(related, /publicationState\s*!==\s*PublicationState\.PUBLISHED/);
  assert.doesNotMatch(related, /HUMAN_REVIEWED|origin\s*!==\s*'REAL'|ReviewLog|reviewLog/);

  const clientModel = read('miniprogram/packageArt/model.ts');
  const client = read('miniprogram/packageArt/services/content-client.ts');
  const page = read('miniprogram/packageArt/pages/detail/index.ts');
  const template = read('miniprogram/packageArt/pages/detail/index.wxml');
  const mappedEvent = clientModel.match(/export function toRelatedEventView[\s\S]*?\n}\n/)?.[0];
  assert.ok(mappedEvent, 'missing toRelatedEventView implementation');
  assert.match(mappedEvent, /recordOrigin:\s*event\.origin/);
  assert.doesNotMatch(mappedEvent, /verificationState|HUMAN_REVIEWED/);
  assert.doesNotMatch(client, /HUMAN_REVIEWED/);
  assert.match(page, /runtimeMode === RuntimeMode\.OFFLINE_DEMO && recordOrigin === 'SYNTHETIC'/);
  assert.doesNotMatch(page, /runtimeMode === RuntimeMode\.LIVE[\s\S]*recordOrigin/);
  const relatedTemplate = sliceBetween(template, 'aria-label="相关线下活动"', 'aria-label="品鉴或合作意向"');
  assert.doesNotMatch(relatedTemplate, /SYNTHETIC|DEMO_ONLY|item\.recordOrigin\s*===/);
});

test('[P1][OPEN] legal long event IDs collide after enrollment ID truncation', () => {
  const eventId = `event_${'a'.repeat(104)}`;
  assert.equal(eventId.length, 110);
  const first = `enrollment_${eventId}_user_a`.slice(0, 120);
  const second = `enrollment_${eventId}_user_b`.slice(0, 120);
  assert.equal(first, second);
});

test('[P1][OPEN] shared idempotency namespace contains the raw trusted OPENID', () => {
  const source = read('cloudfunctions/_shared/idempotency/index.ts');
  assert.match(source, /input\.openId/);
  assert.match(source, /functionName.*action.*input\.openId.*input\.key/s);
});

test('payment remains honestly disabled and no executable requestPayment call exists', () => {
  const runtime = read('miniprogram/shared/services/runtime.ts');
  assert.match(runtime, /paymentCapability:\s*'DISABLED'/);
  const executable = [
    read('miniprogram/pages/events/index.ts'),
    read('miniprogram/packageEvents/pages/event/index.ts'),
    read('miniprogram/packageEvents/pages/enrollment/index.ts'),
  ].join('\n');
  assert.doesNotMatch(executable, /wx\.requestPayment\s*\(/);
});
