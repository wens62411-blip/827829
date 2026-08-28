import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FakeIdentityStore,
  call,
  makeRuntime,
} from '../../../../tests/cloud/identity/fake-runtime.mjs';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const api = require(join(root, 'cloudfunctions', 'identityApi', 'index.js'));
const fixture = JSON.parse(readFileSync(
  new URL('./fixtures/approved-without-review-log.json', import.meta.url),
  'utf8',
));
const NOW = '2026-08-27T08:00:00.000Z';

function idempotency(suffix) {
  return `idem_red_team_${suffix}_12345678`;
}

async function bootstrapAs(context, openId, suffix) {
  context.identity.openId = openId;
  const result = await call(context.endpoint, 'identity.bootstrap', {
    idempotencyKey: idempotency(`bootstrap_${suffix}`),
    expectedVersion: 0,
    requestedRuntime: 'CLOUD',
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.data.session.userId;
}

test('[P0][OPEN] an adapter claim with no ReviewLog is projected to a stranger as HUMAN_REVIEWED', async () => {
  assert.equal(fixture.productionData, false);
  assert.deepEqual(fixture.reviewLogs, []);

  const context = makeRuntime(api, { store: new FakeIdentityStore(), now: NOW });
  const ownerOpenId = 'red_team_owner_openid_synthetic_001';
  const viewerOpenId = 'red_team_viewer_openid_synthetic_001';
  const ownerUserId = await bootstrapAs(context, ownerOpenId, 'owner');
  await bootstrapAs(context, viewerOpenId, 'viewer');

  context.identity.openId = ownerOpenId;
  const profile = await call(context.endpoint, 'profile.updateMine', {
    idempotencyKey: idempotency('profile_create'),
    expectedVersion: 0,
    profile: { displayName: 'Synthetic red-team owner' },
  });
  assert.equal(profile.ok, true, JSON.stringify(profile));

  context.store.seedClaims(ownerUserId, [{
    ...fixture.claim,
    subjectUserId: ownerUserId,
  }]);
  const refreshed = await call(context.endpoint, 'card.refreshProjection', {
    idempotencyKey: idempotency('card_refresh'),
    expectedVersion: 1,
    reason: 'VERIFICATION_CHANGED',
  });
  assert.equal(refreshed.ok, true, JSON.stringify(refreshed));

  context.identity.openId = viewerOpenId;
  const publicCard = await call(context.endpoint, 'card.getForViewer', { ownerUserId });
  assert.equal(publicCard.ok, true, JSON.stringify(publicCard));
  assert.equal(publicCard.data.card.claims.length, 1);
  assert.deepEqual(
    {
      claimId: publicCard.data.card.claims[0].claimId,
      reviewStatus: publicCard.data.card.claims[0].reviewStatus,
      verificationState: publicCard.data.card.claims[0].verificationState,
      publicVisible: publicCard.data.card.claims[0].publicVisible,
    },
    {
      claimId: fixture.claim.claimId,
      reviewStatus: 'APPROVED',
      verificationState: 'HUMAN_REVIEWED',
      publicVisible: true,
    },
  );
  assert.equal('reviewLogId' in publicCard.data.card.claims[0], false);
  assert.equal('userPublicOptInVersion' in publicCard.data.card.claims[0], false);
});
