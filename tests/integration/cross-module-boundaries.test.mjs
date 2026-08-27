import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('the four cross-module dependency directions are frozen as public projections', () => {
  const protocol = read('docs/contracts/projection-protocol.md');
  const actions = read('miniprogram/shared/contracts/action-types.ts');
  const projections = read('miniprogram/shared/types/projections.ts');

  for (const clause of [
    'identityApi.card.getForViewer',
    'ViewerRelationshipProjection',
    'PublicVerificationClaimProjection',
    'eventApi.event.checkEligibility',
    'contentApi.content.listRelatedEvents',
    'PublicEventProjection',
    'adminApi',
    'ReviewCaseProjection',
  ]) {
    assert.match(protocol, new RegExp(clause.replaceAll('.', '\\.')));
  }

  assert.match(actions, /CardGetForViewerResponse[\s\S]*?ViewerRelationshipProjection[\s\S]*?PublicVerificationClaimProjection/);
  assert.match(actions, /ContentListRelatedEventsResponse[\s\S]*?PublicEventProjection/);
  assert.match(actions, /ReviewListResponse[\s\S]*?ReviewCaseProjection/);
  assert.match(actions, /EventCheckEligibilityResponse[\s\S]*?EventEligibilityProjection/);
  assert.match(projections, /EventEligibilityProjection[\s\S]*?satisfiedClaimIds/);
});

test('feature cloud entrypoints import only frozen shared infrastructure', () => {
  const functionNames = ['identityApi', 'socialApi', 'eventApi', 'contentApi', 'adminApi'];
  for (const functionName of functionNames) {
    const source = read(`cloudfunctions/${functionName}/index.ts`);
    const importSources = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
    assert.ok(importSources.length >= 1, `${functionName} should consume shared infrastructure`);
    for (const importSource of importSources) {
      assert.ok(
        importSource.startsWith('../../miniprogram/shared/') || importSource.startsWith('../_shared/'),
        `${functionName} imports disallowed path ${importSource}`,
      );
    }
    for (const otherFunction of functionNames.filter((name) => name !== functionName)) {
      assert.doesNotMatch(source, new RegExp(`(?:^|/)${otherFunction}(?:/|$)`));
    }
  }
});

