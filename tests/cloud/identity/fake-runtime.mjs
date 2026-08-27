export function clone(value) {
  return structuredClone(value);
}

function initialState() {
  return {
    usersByHash: new Map(),
    usersById: new Map(),
    profilesByUser: new Map(),
    cardsByOwner: new Map(),
    cardsById: new Map(),
    sharesById: new Map(),
    sharesByDigest: new Map(),
    relationships: new Map(),
    claimsBySubject: new Map(),
    mediaUrls: new Map(),
    events: new Map(),
    eventOwners: new Map(),
    idempotency: new Map(),
    audits: [],
    qrMedia: new Map(),
  };
}

export class FakeIdentityStore {
  constructor(state = initialState(), controls = {}) {
    this.state = state;
    this.controls = controls;
  }

  relationshipKey(viewerUserId, subjectUserId) {
    return `${viewerUserId}:${subjectUserId}`;
  }

  async findUserByOpenIdHash(openIdHash) {
    return clone(this.state.usersByHash.get(openIdHash) ?? null);
  }

  async findUserById(userId) {
    return clone(this.state.usersById.get(userId) ?? null);
  }

  async findProfileByUserId(userId) {
    return clone(this.state.profilesByUser.get(userId) ?? null);
  }

  async findCardByOwnerUserId(userId) {
    return clone(this.state.cardsByOwner.get(userId) ?? null);
  }

  async findCardById(cardId) {
    return clone(this.state.cardsById.get(cardId) ?? null);
  }

  async findShareById(shareTokenId) {
    return clone(this.state.sharesById.get(shareTokenId) ?? null);
  }

  async findShareByTokenDigest(tokenDigest) {
    return clone(this.state.sharesByDigest.get(tokenDigest) ?? null);
  }

  async findRelationship(viewerUserId, subjectUserId) {
    return clone(this.state.relationships.get(this.relationshipKey(viewerUserId, subjectUserId)) ?? null);
  }

  async listVerificationClaims(subjectUserId) {
    return clone(this.state.claimsBySubject.get(subjectUserId) ?? []);
  }

  async findApprovedMediaUrl(mediaAssetId) {
    return this.state.mediaUrls.get(mediaAssetId) ?? null;
  }

  async findPublicEvent(eventId) {
    return clone(this.state.events.get(eventId) ?? null);
  }

  async findEventShareOwnerUserId(eventId) {
    return this.state.eventOwners.get(eventId) ?? null;
  }

  async findIdempotency(namespace) {
    return clone(this.state.idempotency.get(namespace) ?? null);
  }

  async saveUser(record) {
    const cloned = clone(record);
    this.state.usersByHash.set(cloned.openIdHash, cloned);
    this.state.usersById.set(cloned._id, cloned);
  }

  async saveProfile(record) {
    this.state.profilesByUser.set(record.userId, clone(record));
  }

  async saveCard(record) {
    const cloned = clone(record);
    this.state.cardsByOwner.set(cloned.ownerUserId, cloned);
    this.state.cardsById.set(cloned.cardId, cloned);
  }

  async saveShare(record) {
    const previous = this.state.sharesById.get(record._id);
    if (previous !== undefined) this.state.sharesByDigest.delete(previous.tokenDigest);
    const cloned = clone(record);
    this.state.sharesById.set(cloned._id, cloned);
    this.state.sharesByDigest.set(cloned.tokenDigest, cloned);
  }

  async saveQrMedia(record) {
    this.state.qrMedia.set(record._id, clone(record));
  }

  async saveIdempotency(record) {
    if (this.controls.failNextSaveIdempotency === true) {
      this.controls.failNextSaveIdempotency = false;
      throw new Error('simulated idempotency persistence failure');
    }
    this.state.idempotency.set(record.namespace, clone(record));
  }

  async appendAudit(record) {
    this.state.audits.push(clone(record));
  }

  async runTransaction(operation) {
    const transactionState = clone(this.state);
    const transaction = new FakeIdentityStore(transactionState, this.controls);
    const result = await operation(transaction);
    this.state = transaction.state;
    return result;
  }

  seedProfile(record) {
    this.state.profilesByUser.set(record.userId, clone(record));
  }

  seedRelationship(record) {
    this.state.relationships.set(
      this.relationshipKey(record.viewerUserId, record.subjectUserId),
      clone(record),
    );
  }

  seedClaims(subjectUserId, claims) {
    this.state.claimsBySubject.set(subjectUserId, clone(claims));
  }

  seedMediaUrl(mediaAssetId, url) {
    this.state.mediaUrls.set(mediaAssetId, url);
  }
}

export function makeRuntime(api, options = {}) {
  const store = options.store ?? new FakeIdentityStore();
  const clock = { value: new Date(options.now ?? '2026-08-27T08:00:00Z') };
  const identity = { openId: options.openId ?? 'trusted_alice_openid_123456' };
  const qrCalls = [];
  const qrControl = { fail: false };
  const runtime = {
    getWxContext: () => identity.openId === null ? {} : { OPENID: identity.openId },
    store,
    tokenSigningKey: 'test-only-signing-key-with-32-bytes-minimum',
    runtimeMode: 'LIVE',
    now: () => new Date(clock.value),
    qrCode: {
      generate: async (input) => {
        qrCalls.push(clone(input));
        if (qrControl.fail) throw new Error('simulated WeChat QR failure');
        return { storageFileId: `cloud://qr/generated-${qrCalls.length}.png` };
      },
    },
    ...options.runtime,
  };
  return {
    api,
    runtime,
    endpoint: api.createIdentityEndpoint(runtime),
    store,
    clock,
    identity,
    qrCalls,
    qrControl,
  };
}

let requestCounter = 0;
export async function call(endpoint, action, payload, requestId) {
  requestCounter += 1;
  return endpoint.main({
    action,
    requestId: requestId ?? `req_identity_${requestCounter}_12345678`,
    payload: { contractVersion: '1.0.0', ...payload },
  });
}

export function versioned(now, extra = {}) {
  return { version: 1, createdAt: now, updatedAt: now, ...extra };
}

export function relationship(now, viewerUserId, subjectUserId, extra = {}) {
  return versioned(now, {
    viewerUserId,
    subjectUserId,
    friendshipId: `friendship_${viewerUserId.slice(-6)}_${subjectUserId.slice(-6)}`,
    friendshipState: 'ACCEPTED',
    viewerBlockedSubject: false,
    subjectBlockedViewer: false,
    mayViewFriendsOnlyFields: true,
    sourceVersion: 1,
    ...extra,
  });
}
