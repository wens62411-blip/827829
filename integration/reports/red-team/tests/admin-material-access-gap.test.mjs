import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RAW_MATERIAL_URL_SENTINEL,
  adminEvent,
  createAdminTestFixture,
  writeGuards,
} from '../../../../tests/cloud/admin/test-fixture.mjs';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../../../', import.meta.url));
const runtime = require(join(root, 'cloudfunctions', 'adminApi', 'index.js'));

test('[P0][OPEN] review.get exposes no auditable material access, while review.approve still succeeds', async () => {
  const fixture = createAdminTestFixture(runtime);
  const endpoint = fixture.endpointFor('reviewerA');

  const detail = await endpoint.main(adminEvent(
    'review.get',
    'req_red_team_material_read_0001',
    { reviewCaseId: 'case_social_approve' },
  ));
  assert.equal(detail.ok, true, JSON.stringify(detail));
  assert.deepEqual(detail.data.reviewCase.evidenceAssetIds, ['media_case_social_approve']);
  assert.equal(JSON.stringify(detail).includes(RAW_MATERIAL_URL_SENTINEL), false);
  assert.equal('materialAccessGrant' in detail.data, false);
  assert.equal('materialAccessAuditId' in detail.data, false);
  assert.equal(fixture.inspect.snapshotReads.length, 0);

  const approved = await endpoint.main(adminEvent(
    'review.approve',
    'req_red_team_blind_approve_0001',
    {
      reviewCaseId: 'case_social_approve',
      decisionNote: '红队复现：接口未要求材料访问凭证仍执行人工通过',
      ...writeGuards(3, 'red_team_blind_approve'),
    },
  ));
  assert.equal(approved.ok, true, JSON.stringify(approved));
  assert.equal(approved.data.reviewCase.status, 'APPROVED');
  assert.equal(fixture.inspect.reviewLogs.length, 1);
  assert.deepEqual(fixture.inspect.snapshotReads, ['case_social_approve']);
  assert.equal('materialAccessAuditId' in fixture.inspect.reviewLogs[0], false);
});
