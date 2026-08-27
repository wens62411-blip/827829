import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../..', import.meta.url));
const auth = require(join(root, 'cloudfunctions', '_shared', 'auth', 'index.js'));
const rbac = require(join(root, 'cloudfunctions', '_shared', 'rbac', 'index.js'));

test('OPENID is accepted only from a trusted runtime provider', async () => {
  const controlledPayload = { OPENID: 'attacker_openid_123456789' };
  assert.throws(() => auth.requireTrustedOpenId(controlledPayload), (error) => {
    assert.equal(error.code, 'AUTH_REQUIRED');
    assert.deepEqual(error.details, { code: 'AUTH_REQUIRED', required: true });
    return true;
  });

  const trustedOpenId = 'trusted_openid_1234567890';
  assert.equal(auth.requireTrustedOpenId(() => ({ OPENID: trustedOpenId })), trustedOpenId);
  const principal = await auth.requireTrustedPrincipal(
    () => ({ OPENID: trustedOpenId }),
    async (openId) => ({ openId, userId: 'user_alice', roles: ['MEMBER'], accountState: 'ACTIVE' }),
  );
  assert.equal(principal.openId, trustedOpenId);
  assert.equal(Object.isFrozen(principal), true);
  assert.equal(Object.isFrozen(principal.roles), true);
});

test('RBAC and ownership guards fail closed', () => {
  const member = { openId: 'trusted_openid_1234567890', userId: 'user_alice', roles: ['MEMBER'], accountState: 'ACTIVE' };
  assert.doesNotThrow(() => rbac.requireObjectOwner(member, 'user_alice'));
  assert.throws(() => rbac.requireObjectOwner(member, 'user_bob'), (error) => {
    assert.equal(error.code, 'FORBIDDEN');
    assert.deepEqual(error.details, { code: 'FORBIDDEN', policy: 'OBJECT_OWNER_REQUIRED' });
    return true;
  });
  assert.throws(() => rbac.requireAnyRole(member, ['REVIEWER']), (error) => {
    assert.equal(error.code, 'ROLE_REQUIRED');
    assert.deepEqual(error.details, { code: 'ROLE_REQUIRED', requiredRoles: ['REVIEWER'] });
    return true;
  });
  assert.doesNotThrow(() => rbac.requireAnyRole({ ...member, roles: ['REVIEWER'] }, ['REVIEWER']));
});
