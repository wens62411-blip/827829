export const TEST_FIXTURE_CLASSIFICATION = Object.freeze({
  evidenceKind: 'SYNTHETIC_TEST_FIXTURE',
  productionData: false,
  humanOperationsTeamEstablished: false,
});

export const RAW_MATERIAL_URL_SENTINEL =
  'https://private.invalid/SYNTHETIC_TEST_FIXTURE/raw-material-do-not-disclose';

export const FIXTURE_NOW = '2026-08-27T08:00:00.000Z';

export const ACTOR_OPEN_IDS = Object.freeze({
  ordinary: 'ordinary_openid_000001',
  reviewerA: 'reviewer_a_openid_0001',
  reviewerB: 'reviewer_b_openid_0001',
  eventManager: 'event_manager_openid_01',
  contentManager: 'content_manager_openid_01',
  superAdmin: 'super_admin_openid_0001',
  disabledReviewer: 'disabled_reviewer_openid_1',
  notAllowlisted: 'unlisted_reviewer_openid_1',
});

const CREATED_AT = '2026-08-26T08:00:00.000Z';
const UPDATED_AT = '2026-08-27T07:59:00.000Z';
const EXPIRES_AT = '2099-01-01T00:00:00.000Z';

const clone = (value) => structuredClone(value);

function cloneMap(map) {
  return new Map([...map].map(([key, value]) => [key, clone(value)]));
}

function makeReviewCase(id, domain, aggregateId, options = {}) {
  return Object.freeze({
    reviewCaseId: id,
    domain,
    aggregateId,
    status: options.status ?? 'UNDER_REVIEW',
    title: `${domain} ${TEST_FIXTURE_CLASSIFICATION.evidenceKind}`,
    summary: 'Synthetic contract fixture; never production review evidence.',
    submitterUserId: `submitter_${id}`,
    evidenceAssetIds: Object.freeze(options.evidenceAssetIds ?? [`media_${id}`]),
    version: options.version ?? 3,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  });
}

function makeSnapshot(reviewCase, aiConsistent) {
  return Object.freeze({
    reviewCaseId: reviewCase.reviewCaseId,
    aggregateId: reviewCase.aggregateId,
    // Keep the owning aggregate version deliberately independent from the
    // ReviewCaseProjection version so tests catch accidental cross-aggregate
    // version coupling.
    sourceVersion: reviewCase.version + 40,
    capturedAt: UPDATED_AT,
    raw: Object.freeze({
      fixtureKind: TEST_FIXTURE_CLASSIFICATION.evidenceKind,
      aiAdvisory: Object.freeze({ consistent: aiConsistent, advisoryOnly: true }),
      privateMaterialUrl: RAW_MATERIAL_URL_SENTINEL,
    }),
  });
}

function makeInitialState() {
  const cases = [
    makeReviewCase('case_social_approve', 'SOCIAL', 'verification_request_approve'),
    makeReviewCase('case_social_reject', 'SOCIAL', 'verification_request_reject'),
    makeReviewCase('case_social_changes', 'SOCIAL', 'verification_request_changes'),
    makeReviewCase('case_social_concurrent', 'SOCIAL', 'verification_request_concurrent'),
    makeReviewCase('case_social_revoke', 'SOCIAL', 'verification_request_revoke'),
    makeReviewCase('case_ai_true', 'SOCIAL', 'verification_request_ai_true'),
    makeReviewCase('case_ai_false', 'SOCIAL', 'verification_request_ai_false'),
    makeReviewCase('case_organizer_approve', 'ORGANIZER', 'organizer_fixture_001'),
    makeReviewCase('case_event_approve', 'EVENT', 'event_fixture_001'),
    makeReviewCase('case_content_approve', 'CONTENT', 'content_fixture_approved_rights'),
    makeReviewCase('case_content_bad_rights', 'CONTENT', 'content_fixture_unverified_rights'),
  ];
  const reviewCases = new Map(cases.map((reviewCase) => [reviewCase.reviewCaseId, reviewCase]));
  const snapshots = new Map(cases.map((reviewCase) => [
    reviewCase.reviewCaseId,
    makeSnapshot(
      reviewCase,
      reviewCase.reviewCaseId === 'case_ai_true'
        ? true
        : reviewCase.reviewCaseId === 'case_ai_false'
          ? false
          : null,
    ),
  ]));

  return {
    reviewCases,
    snapshots,
    reports: new Map([[
      'report_fixture_001',
      Object.freeze({
        reportId: 'report_fixture_001',
        targetType: 'USER',
        targetId: 'reported_user_fixture_001',
        status: 'OPEN',
        reasonCode: 'SYNTHETIC_TEST_REASON',
        version: 2,
        createdAt: CREATED_AT,
        updatedAt: UPDATED_AT,
      }),
    ]]),
    idempotency: new Map(),
    reviewLogs: [],
    audits: [],
    invalidations: [],
    snapshotReads: [],
    mutationCalls: [],
    publicClaims: new Map(),
    claimIdsByCase: new Map(),
    contentRights: new Map([
      ['content_fixture_approved_rights', 'APPROVED'],
      ['content_fixture_unverified_rights', 'UNVERIFIED'],
    ]),
    verificationViews: {
      publicTag: { dirty: false, sourceAllowsRead: false },
      oldShare: { dirty: false, sourceAllowsRead: false },
      friendView: { dirty: false, sourceAllowsRead: false },
    },
    cardsPublicWrites: [],
  };
}

function cloneState(source) {
  return {
    reviewCases: cloneMap(source.reviewCases),
    snapshots: cloneMap(source.snapshots),
    reports: cloneMap(source.reports),
    idempotency: cloneMap(source.idempotency),
    reviewLogs: clone(source.reviewLogs),
    audits: clone(source.audits),
    invalidations: clone(source.invalidations),
    snapshotReads: clone(source.snapshotReads),
    mutationCalls: clone(source.mutationCalls),
    publicClaims: cloneMap(source.publicClaims),
    claimIdsByCase: cloneMap(source.claimIdsByCase),
    contentRights: cloneMap(source.contentRights),
    verificationViews: clone(source.verificationViews),
    cardsPublicWrites: clone(source.cardsPublicWrites),
  };
}

function corruptCursorPage(page, query, fault) {
  if (fault === undefined) return page;
  switch (fault) {
    case 'rawCursor':
      return Object.freeze({ ...page, hasMore: true, nextCursor: RAW_MATERIAL_URL_SENTINEL });
    case 'missingCursor':
      return Object.freeze({ items: page.items, hasMore: true });
    case 'cursorWhenDone':
      return Object.freeze({ ...page, hasMore: false, nextCursor: 'cursor_fixture_0001' });
    case 'emptyHasMore':
      return Object.freeze({ items: Object.freeze([]), hasMore: true, nextCursor: 'cursor_fixture_0001' });
    case 'overLimit': {
      const first = page.items[0];
      if (first === undefined) throw new Error('TEST_FIXTURE needs an item for over-limit cursor fault');
      return Object.freeze({
        items: Object.freeze([...page.items, clone(first)]),
        hasMore: false,
      });
    }
    case 'extraField':
      return Object.freeze({ ...page, unexpectedRepositoryField: 'SYNTHETIC_TEST_FIXTURE' });
    default:
      throw new Error(`Unknown TEST_FIXTURE cursor fault ${fault} for limit ${query.limit}`);
  }
}

function casePage(state, query, options) {
  const items = [...state.reviewCases.values()]
    .filter((item) => query.domains.includes(item.domain))
    .filter((item) => query.status === undefined || item.status === query.status)
    .slice(0, query.limit)
    .map(clone);
  return corruptCursorPage(
    Object.freeze({ items: Object.freeze(items), hasMore: false }),
    query,
    options.cursorFault,
  );
}

function reportPage(state, query) {
  const items = [...state.reports.values()]
    .filter((item) => query.status === undefined || item.status === query.status)
    .slice(0, query.limit)
    .map(clone);
  return Object.freeze({ items: Object.freeze(items), hasMore: false });
}

function auditPage(state, query, options) {
  const combined = [...state.reviewLogs, ...state.audits]
    .filter((item) => query.action === undefined || item.action === query.action)
    .filter((item) => query.targetId === undefined || item.targetId === query.targetId)
    .filter((item) => query.occurredAfter === undefined || item.occurredAt > query.occurredAfter)
    .filter((item) => query.occurredBefore === undefined || item.occurredAt < query.occurredBefore)
    .slice(0, query.limit)
    // AdminReviewLog is deliberately richer at rest, while audit.list may
    // consume only the frozen AuditEntryProjection view.
    .map((item) => Object.freeze({
      auditEntryId: item.auditEntryId,
      actorUserId: item.actorUserId,
      actorRole: item.actorRole,
      action: item.action,
      targetType: item.targetType,
      targetId: item.targetId,
      requestId: item.requestId,
      occurredAt: item.occurredAt,
      result: item.result,
      ...(item.reasonCode === undefined ? {} : { reasonCode: item.reasonCode }),
    }));
  if (options.auditLocatorField !== undefined && combined.length > 0) {
    const [first, ...rest] = combined;
    combined.splice(0, combined.length, Object.freeze({
      ...first,
      [options.auditLocatorField]: RAW_MATERIAL_URL_SENTINEL,
    }), ...rest);
  }
  return Object.freeze({ items: Object.freeze(combined), hasMore: false });
}

function publicOrganizer(before, after, command, options) {
  return Object.freeze({
    organizerId: before.aggregateId,
    name: Object.freeze({ zh: '测试主理人', en: 'Fixture Organizer' }),
    summary: TEST_FIXTURE_CLASSIFICATION.evidenceKind,
    cityIds: Object.freeze(['cn-shenzhen']),
    reviewStatus: 'APPROVED',
    verificationState: 'HUMAN_REVIEWED',
    version: after.version + 40,
    createdAt: options.chronologyFault === 'organizer'
      ? '2026-08-28T08:00:00.000Z'
      : options.chronologyFault === 'organizerInvalidCalendar'
        ? '2026-06-31T08:00:00.000Z'
        : before.createdAt,
    updatedAt: command.occurredAt,
    ...(options.adapterLeakTarget === 'organizer'
      ? { privateMaterialUrl: RAW_MATERIAL_URL_SENTINEL }
      : {}),
  });
}

function publicEvent(before, after, command, options) {
  const decision = command.payload.decision;
  const projectedDecision = options.decisionResultFault === `event:${decision}`
    ? decision === 'APPROVE' ? 'REJECT' : 'APPROVE'
    : decision;
  const state = projectedDecision === 'APPROVE'
    ? 'PUBLISHED'
    : projectedDecision === 'REJECT'
      ? 'REJECTED'
      : projectedDecision === 'PAUSE'
        ? 'PAUSED'
        : projectedDecision === 'CANCEL'
          ? 'CANCELLED'
          : 'UNDER_REVIEW';
  const publicationState = projectedDecision === 'APPROVE'
    ? 'PUBLISHED'
    : projectedDecision === 'REJECT'
      ? 'REJECTED'
      : projectedDecision === 'PAUSE' || projectedDecision === 'CANCEL'
        ? 'UNPUBLISHED'
        : 'UNDER_REVIEW';
  return Object.freeze({
    eventId: before.aggregateId,
    clubNodeId: 'club_node_fixture_001',
    organizerId: 'organizer_fixture_001',
    cityId: 'cn-shenzhen',
    title: '测试活动',
    summary: TEST_FIXTURE_CLASSIFICATION.evidenceKind,
    startsAt: '2026-09-01T10:00:00.000Z',
    endsAt: '2026-09-01T12:00:00.000Z',
    timezone: 'Asia/Shanghai',
    state,
    publicationState,
    reservationAvailable: projectedDecision === 'APPROVE',
    origin: 'SYNTHETIC',
    verificationState: projectedDecision === 'APPROVE' ? 'HUMAN_REVIEWED' : 'USER_DECLARED',
    version: after.version + 40,
    createdAt: before.createdAt,
    updatedAt: command.occurredAt,
    ...(options.adapterLeakTarget === 'event'
      ? { privateMaterialUrl: RAW_MATERIAL_URL_SENTINEL }
      : {}),
  });
}

function publicContent(working, before, after, command, options) {
  const decision = command.payload.decision;
  const projectedDecision = options.decisionResultFault === `content:${decision}`
    ? decision === 'APPROVE' ? 'REJECT' : 'APPROVE'
    : decision;
  const publicationState = projectedDecision === 'APPROVE'
    ? 'PUBLISHED'
    : projectedDecision === 'REJECT'
      ? 'REJECTED'
      : projectedDecision === 'UNPUBLISH'
        ? 'UNPUBLISHED'
        : 'UNDER_REVIEW';
  return Object.freeze({
    contentId: before.aggregateId,
    creatorId: 'creator_fixture_001',
    title: '测试艺术内容',
    summary: TEST_FIXTURE_CLASSIFICATION.evidenceKind,
    category: 'ART',
    publicationState,
    mediaRightsState: working.contentRights.get(before.aggregateId),
    origin: 'SYNTHETIC',
    verificationState: projectedDecision === 'APPROVE' ? 'HUMAN_REVIEWED' : 'USER_DECLARED',
    version: after.version + 40,
    createdAt: options.chronologyFault === 'content'
      ? '2026-08-28T08:00:00.000Z'
      : before.createdAt,
    updatedAt: command.occurredAt,
    ...(options.adapterLeakTarget === 'content'
      ? { privateMaterialUrl: RAW_MATERIAL_URL_SENTINEL }
      : {}),
  });
}

function makeTransaction(working, options) {
  return Object.freeze({
    async getReviewCase(reviewCaseId) {
      const value = working.reviewCases.get(reviewCaseId);
      if (value === undefined) return null;
      const returned = clone(value);
      if (options.reviewCaseLocatorField === undefined) return returned;
      const locator = options.repositoryLocatorValue ?? RAW_MATERIAL_URL_SENTINEL;
      if (options.reviewCaseLocatorField === 'evidenceAssetId') {
        return Object.freeze({ ...returned, evidenceAssetIds: Object.freeze([locator]) });
      }
      return Object.freeze({
        ...returned,
        [options.reviewCaseLocatorField]: locator,
      });
    },
    async getOriginalApplicationSnapshot(reviewCaseId) {
      working.snapshotReads.push(reviewCaseId);
      const value = working.snapshots.get(reviewCaseId);
      if (value === undefined) return null;
      const returned = clone(value);
      if (options.snapshotFault === 'numericCapturedAt') {
        return Object.freeze({ ...returned, capturedAt: 123456789 });
      }
      if (options.snapshotFault === 'futureCapturedAt') {
        return Object.freeze({ ...returned, capturedAt: '2099-01-01T00:00:00.000Z' });
      }
      if (options.snapshotFault === 'invalidCalendarCapturedAt') {
        return Object.freeze({ ...returned, capturedAt: '2026-09-31T00:00:00.000Z' });
      }
      if (options.snapshotFault === 'extraField') {
        return Object.freeze({ ...returned, privateSnapshotLocator: RAW_MATERIAL_URL_SENTINEL });
      }
      return returned;
    },
    async getReport(reportId) {
      const value = working.reports.get(reportId);
      return value === undefined ? null : clone(value);
    },
    async getIdempotency(namespace) {
      const value = working.idempotency.get(namespace);
      if (value === undefined) return null;
      const returned = clone(value);
      if (options.idempotencyRecordFault === 'wrongNamespace') {
        return Object.freeze({ ...returned, namespace: 'adminApi:review.approve:other_actor:other_key' });
      }
      if (options.idempotencyRecordFault === 'rawRequestId') {
        return Object.freeze({ ...returned, requestId: RAW_MATERIAL_URL_SENTINEL });
      }
      if (options.idempotencyRecordFault === 'extraField') {
        return Object.freeze({ ...returned, privateMaterialUrl: RAW_MATERIAL_URL_SENTINEL });
      }
      return returned;
    },
    async applyMutation(command) {
      // This observation is deliberately allowlisted. The production command
      // carries the opaque source snapshot, but test diagnostics must never
      // retain its raw material URL or become a second material cache.
      working.mutationCalls.push(Object.freeze({
        action: command.action,
        writableCollections: Object.freeze([...command.writableCollections]),
        requestId: command.requestId,
        actorUserId: command.principal.userId,
        targetId: command.beforeReviewCase?.aggregateId ?? command.payload.reportId,
        reviewCaseId: command.beforeReviewCase?.reviewCaseId,
        expectedVersion: command.payload.expectedVersion,
        nextReviewStatus: command.nextReviewStatus,
        originalSnapshotPresent: command.originalSnapshot !== undefined,
        originalSnapshotVersion: command.originalSnapshot?.sourceVersion,
      }));
      if (command.action === 'report.resolve') {
        const before = working.reports.get(command.payload.reportId);
        if (before === undefined) throw new Error('TEST_FIXTURE report disappeared in transaction');
        const report = Object.freeze({
          ...before,
          status: command.payload.resolution === 'DISMISSED' ? 'DISMISSED' : 'RESOLVED',
          version: before.version + 1,
          updatedAt: command.occurredAt,
          ...(options.chronologyFault === 'report'
            ? { createdAt: '2026-08-28T08:00:00.000Z' }
            : options.chronologyFault === 'reportInvalidCalendar'
              ? { createdAt: '2026-09-31T08:00:00.000Z', updatedAt: '2026-10-01T08:00:00.000Z' }
            : {}),
          ...(options.adapterLeakTarget === 'report'
            ? { privateMaterialUrl: RAW_MATERIAL_URL_SENTINEL }
            : {}),
        });
        working.reports.set(report.reportId, report);
        return Object.freeze({
          report,
          sourceAggregateId: report.reportId,
          sourceVersion: report.version,
          ...(options.adapterLeakTarget === 'reportMutationEnvelope'
            ? { privateMaterialUrl: RAW_MATERIAL_URL_SENTINEL }
            : {}),
        });
      }

      const before = working.reviewCases.get(command.beforeReviewCase?.reviewCaseId);
      if (before === undefined) throw new Error('TEST_FIXTURE review case disappeared in transaction');
      const after = Object.freeze({
        ...before,
        status: command.nextReviewStatus,
        version: before.version + 1,
        updatedAt: command.occurredAt,
        ...(options.reviewCaseMutationFault === 'title'
          ? { title: 'Substituted synthetic review title' }
          : {}),
        ...(options.reviewCaseMutationFault === 'summary'
          ? { summary: 'Substituted synthetic review summary' }
          : {}),
        ...(options.reviewCaseMutationFault === 'submitterUserId'
          ? { submitterUserId: 'submitter_substituted_fixture_001' }
          : {}),
        ...(options.reviewCaseMutationFault === 'assignedReviewerUserId'
          ? { assignedReviewerUserId: 'user_substituted_reviewer_001' }
          : {}),
        ...(options.reviewCaseMutationFault === 'evidenceAssetIds'
          ? { evidenceAssetIds: Object.freeze(['media_substituted_fixture_001']) }
          : {}),
        ...(options.adapterLeakTarget === 'reviewCase'
          ? { privateMaterialUrl: RAW_MATERIAL_URL_SENTINEL }
          : {}),
      });
      working.reviewCases.set(after.reviewCaseId, after);

      let approvedClaim;
      let revokedClaimProof;
      let sourceAggregateId = before.aggregateId;
      let sourceVersion = command.originalSnapshot.sourceVersion + 1;
      if ((command.action === 'review.reject' || command.action === 'review.requestChanges')
          && options.sourceBindingFault === command.action) {
        sourceVersion += 1;
      }
      if (command.action === 'review.approve') {
        const claimId = `claim_${before.reviewCaseId}`;
        approvedClaim = Object.freeze({
          claimId,
          subjectUserId: options.approvedClaimSubjectFault === true
            ? 'submitter_wrong_subject_fixture_001'
            : before.submitterUserId,
          labelId: 'label_fixture_verified_member',
          labelText: Object.freeze({ zh: '测试认证标签', en: 'Fixture verified label' }),
          reviewStatus: 'APPROVED',
          verificationState: 'HUMAN_REVIEWED',
          publicVisible: true,
          validFrom: options.claimEffectiveFault === 'future'
            ? '2026-08-28T08:00:00.000Z'
            : options.claimEffectiveFault === 'expired'
              ? '2026-08-26T08:00:00.000Z'
              : command.occurredAt,
          ...(options.claimEffectiveFault === 'expired'
            ? { validUntil: command.occurredAt }
            : {}),
          version: 1,
          createdAt: command.occurredAt,
          updatedAt: command.occurredAt,
          ...(options.adapterLeakTarget === 'approvedClaim'
            ? { privateMaterialUrl: RAW_MATERIAL_URL_SENTINEL }
            : {}),
        });
        working.publicClaims.set(claimId, approvedClaim);
        working.claimIdsByCase.set(before.reviewCaseId, claimId);
        sourceAggregateId = claimId;
        sourceVersion = approvedClaim.version;
      } else if (command.action === 'review.reject' || command.action === 'review.requestChanges') {
        const claimId = working.claimIdsByCase.get(before.reviewCaseId);
        if (claimId !== undefined) working.publicClaims.delete(claimId);
      } else if (command.action === 'review.revoke') {
        const claimId = working.claimIdsByCase.get(before.reviewCaseId);
        if (claimId === undefined) throw new Error('TEST_FIXTURE cannot revoke a claim that was never approved');
        const previous = working.publicClaims.get(claimId);
        if (previous === undefined) throw new Error('TEST_FIXTURE approved claim disappeared before revoke');
        const revokedClaim = Object.freeze({
          ...previous,
          reviewStatus: 'REVOKED',
          publicVisible: false,
          version: previous.version + 1,
          updatedAt: command.occurredAt,
        });
        working.publicClaims.set(claimId, revokedClaim);
        revokedClaimProof = Object.freeze({
          reviewCaseId: before.reviewCaseId,
          source: Object.freeze({
            collection: 'verification_claims',
            aggregateId: claimId,
            expectedVersion: previous.version,
            patch: Object.freeze({
              version: revokedClaim.version,
              reviewStatus: 'REVOKED',
              publicVisible: false,
            }),
          }),
        });
        sourceAggregateId = claimId;
        sourceVersion = revokedClaim.version;
        switch (options.revokeProofFault) {
          case undefined:
            break;
          case 'wrongCase':
            revokedClaimProof = Object.freeze({
              ...revokedClaimProof,
              reviewCaseId: 'case_social_wrong_binding',
            });
            break;
          case 'wrongCollection':
            revokedClaimProof = Object.freeze({
              ...revokedClaimProof,
              source: Object.freeze({ ...revokedClaimProof.source, collection: 'verification_requests' }),
            });
            break;
          case 'wrongClaimId':
            revokedClaimProof = Object.freeze({
              ...revokedClaimProof,
              source: Object.freeze({
                ...revokedClaimProof.source,
                aggregateId: 'claim_wrong_fixture_binding',
              }),
            });
            break;
          case 'wrongSourceBinding':
            sourceAggregateId = 'claim_wrong_source_binding';
            break;
          case 'publicVisible':
            revokedClaimProof = Object.freeze({
              ...revokedClaimProof,
              source: Object.freeze({
                ...revokedClaimProof.source,
                patch: Object.freeze({ ...revokedClaimProof.source.patch, publicVisible: true }),
              }),
            });
            break;
          case 'version':
            revokedClaimProof = Object.freeze({
              ...revokedClaimProof,
              source: Object.freeze({
                ...revokedClaimProof.source,
                patch: Object.freeze({
                  ...revokedClaimProof.source.patch,
                  version: revokedClaimProof.source.expectedVersion + 2,
                }),
              }),
            });
            sourceVersion = revokedClaimProof.source.patch.version;
            break;
          case 'extraField':
            revokedClaimProof = Object.freeze({
              ...revokedClaimProof,
              privateMaterialUrl: RAW_MATERIAL_URL_SENTINEL,
            });
            break;
          default:
            throw new Error(`Unknown TEST_FIXTURE revoke proof fault ${options.revokeProofFault}`);
        }
      }

      const organizer = command.action === 'organizer.review'
        ? publicOrganizer(before, after, command, options)
        : undefined;
      const event = command.action === 'event.review'
        ? publicEvent(before, after, command, options)
        : undefined;
      const content = command.action === 'content.review'
        ? publicContent(working, before, after, command, options)
        : undefined;
      const authoritativeProjection = organizer ?? event ?? content;
      if (authoritativeProjection !== undefined) {
        sourceAggregateId = organizer?.organizerId ?? event?.eventId ?? content?.contentId;
        sourceVersion = authoritativeProjection.version;
        if (options.sourceBindingFault === command.action) sourceVersion += 1;
      }

      return Object.freeze({
        reviewCase: after,
        ...(organizer === undefined ? {} : { organizer }),
        ...(event === undefined ? {} : { event }),
        ...(content === undefined ? {} : { content }),
        ...(approvedClaim === undefined ? {} : { approvedClaim }),
        ...(revokedClaimProof === undefined ? {} : { revokedClaim: revokedClaimProof }),
        sourceAggregateId,
        sourceVersion,
        ...(options.adapterLeakTarget === 'caseMutationEnvelope'
          ? { privateMaterialUrl: RAW_MATERIAL_URL_SENTINEL }
          : {}),
      });
    },
    async appendReviewLog(record) {
      working.reviewLogs.push(clone(record));
    },
    async appendAudit(record) {
      working.audits.push(clone(record));
    },
    async appendProjectionInvalidation(record) {
      if (options.failInvalidationOnce === true) {
        options.failInvalidationOnce = false;
        throw new Error('TEST_FIXTURE forced invalidation append failure');
      }
      working.invalidations.push(clone(record));
      if (record.kind === 'VERIFICATION_CHANGED') {
        const sourceCase = [...working.reviewCases.values()]
          .find((reviewCase) => reviewCase.aggregateId === record.sourceAggregateId);
        const claimId = sourceCase === undefined
          ? record.sourceAggregateId
          : working.claimIdsByCase.get(sourceCase.reviewCaseId);
        const claim = claimId === undefined ? undefined : working.publicClaims.get(claimId);
        for (const view of Object.values(working.verificationViews)) {
          view.dirty = true;
          view.sourceAllowsRead = claim?.publicVisible === true;
        }
      }
    },
    async completeIdempotency(record) {
      working.idempotency.set(record.namespace, clone(record));
    },
  });
}

function principalMap(runtime) {
  const principal = (actor, roles, extra = {}) => Object.freeze({
    openId: ACTOR_OPEN_IDS[actor],
    userId: `user_${actor}`,
    roles: Object.freeze(roles),
    accountState: extra.accountState ?? 'ACTIVE',
    allowlisted: extra.allowlisted ?? true,
    expiresAt: EXPIRES_AT,
  });
  return new Map([
    [ACTOR_OPEN_IDS.reviewerA, principal('reviewerA', [runtime.AdminRole.REVIEWER])],
    [ACTOR_OPEN_IDS.reviewerB, principal('reviewerB', [runtime.AdminRole.REVIEWER])],
    [ACTOR_OPEN_IDS.eventManager, principal('eventManager', [runtime.AdminRole.EVENT_MANAGER])],
    [ACTOR_OPEN_IDS.contentManager, principal('contentManager', [runtime.AdminRole.CONTENT_MANAGER])],
    [ACTOR_OPEN_IDS.superAdmin, principal('superAdmin', [runtime.AdminRole.SUPER_ADMIN])],
    [ACTOR_OPEN_IDS.disabledReviewer, principal(
      'disabledReviewer',
      [runtime.AdminRole.REVIEWER],
      { accountState: 'DISABLED' },
    )],
    [ACTOR_OPEN_IDS.notAllowlisted, principal(
      'notAllowlisted',
      [runtime.AdminRole.REVIEWER],
      { allowlisted: false },
    )],
  ]);
}

export function createAdminTestFixture(runtime, initialOptions = {}) {
  let state = makeInitialState();
  const options = {
    failInvalidationOnce: initialOptions.failInvalidationOnce === true,
    adapterLeakTarget: initialOptions.adapterLeakTarget,
    reviewCaseLocatorField: initialOptions.reviewCaseLocatorField,
    cursorFault: initialOptions.cursorFault,
    auditLocatorField: initialOptions.auditLocatorField,
    decisionResultFault: initialOptions.decisionResultFault,
    revokeProofFault: initialOptions.revokeProofFault,
    reviewCaseMutationFault: initialOptions.reviewCaseMutationFault,
    approvedClaimSubjectFault: initialOptions.approvedClaimSubjectFault === true,
    sourceBindingFault: initialOptions.sourceBindingFault,
    snapshotFault: initialOptions.snapshotFault,
    idempotencyRecordFault: initialOptions.idempotencyRecordFault,
    chronologyFault: initialOptions.chronologyFault,
    generatedIdFault: initialOptions.generatedIdFault,
    repositoryLocatorValue: initialOptions.repositoryLocatorValue,
    claimEffectiveFault: initialOptions.claimEffectiveFault,
    timeRegressionTarget: initialOptions.timeRegressionTarget,
    omitSocialApprovalSubmitter: initialOptions.omitSocialApprovalSubmitter === true,
  };
  if (options.omitSocialApprovalSubmitter) {
    const current = state.reviewCases.get('case_social_approve');
    const { submitterUserId: _omitted, ...withoutSubmitter } = current;
    state.reviewCases.set('case_social_approve', Object.freeze(withoutSubmitter));
  }
  if (options.timeRegressionTarget === 'reviewCase') {
    const current = state.reviewCases.get('case_social_approve');
    state.reviewCases.set('case_social_approve', Object.freeze({
      ...current,
      updatedAt: '2098-01-01T00:00:00.000Z',
    }));
  }
  if (options.timeRegressionTarget === 'report') {
    const current = state.reports.get('report_fixture_001');
    state.reports.set('report_fixture_001', Object.freeze({
      ...current,
      updatedAt: '2098-01-01T00:00:00.000Z',
    }));
  }
  const principals = principalMap(runtime);
  let transactionTail = Promise.resolve();
  let auditId = 0;
  let invalidationId = 0;

  const repository = Object.freeze({
    async runTransaction(operation) {
      let release;
      const previous = transactionTail;
      transactionTail = new Promise((resolve) => { release = resolve; });
      await previous;
      const working = cloneState(state);
      try {
        const result = await operation(makeTransaction(working, options));
        state = working;
        return result;
      } finally {
        release();
      }
    },
    async listReviewCases(query) {
      return casePage(state, query, options);
    },
    async listReports(query) {
      return reportPage(state, query);
    },
    async listAuditEntries(query) {
      return auditPage(state, query, options);
    },
  });

  function endpointFor(actor, endpointOptions = {}) {
    const openId = endpointOptions.openId ?? ACTOR_OPEN_IDS[actor];
    const getWxContext = endpointOptions.missingTrustedContext === true
      ? () => ({})
      : () => ({ OPENID: openId });
    return runtime.createAdminEndpoint(Object.freeze({
      getWxContext,
      loadAdminPrincipal: async (trustedOpenId) => {
        if (endpointOptions.principalOverride !== undefined) {
          return clone(endpointOptions.principalOverride);
        }
        const value = principals.get(trustedOpenId);
        return value === undefined ? null : clone(value);
      },
      repository,
      now: () => FIXTURE_NOW,
      createId: (kind) => {
        if (kind === 'audit-entry') {
          auditId += 1;
          if (options.generatedIdFault === 'audit-entry') return RAW_MATERIAL_URL_SENTINEL;
          return `audit_fixture_${String(auditId).padStart(4, '0')}`;
        }
        invalidationId += 1;
        if (options.generatedIdFault === 'projection-invalidation') return RAW_MATERIAL_URL_SENTINEL;
        return `projection_invalidation_fixture_${String(invalidationId).padStart(4, '0')}`;
      },
      runtimeMode: 'DEGRADED',
    }));
  }

  const inspect = Object.freeze({
    get reviewCases() { return state.reviewCases; },
    get reports() { return state.reports; },
    get reviewLogs() { return state.reviewLogs; },
    get audits() { return state.audits; },
    get invalidations() { return state.invalidations; },
    get idempotency() { return state.idempotency; },
    get snapshotReads() { return state.snapshotReads; },
    get mutationCalls() { return state.mutationCalls; },
    get publicClaims() { return state.publicClaims; },
    get claimIdsByCase() { return state.claimIdsByCase; },
    get verificationViews() { return state.verificationViews; },
    get cardsPublicWrites() { return state.cardsPublicWrites; },
  });

  return Object.freeze({
    classification: TEST_FIXTURE_CLASSIFICATION,
    endpointFor,
    repository,
    inspect,
    simulateExternalAssignment(reviewCaseId, assignedReviewerUserId) {
      const current = state.reviewCases.get(reviewCaseId);
      if (current === undefined) throw new Error(`Unknown TEST_FIXTURE review case ${reviewCaseId}`);
      state.reviewCases.set(reviewCaseId, Object.freeze({
        ...current,
        assignedReviewerUserId,
      }));
    },
    refreshVerificationViews(aggregateId) {
      const claimId = state.claimIdsByCase.get(aggregateId) ?? aggregateId;
      const claim = state.publicClaims.get(claimId);
      for (const view of Object.values(state.verificationViews)) {
        view.dirty = false;
        view.sourceAllowsRead = claim?.publicVisible === true;
      }
    },
    readVerificationView(viewName) {
      const view = state.verificationViews[viewName];
      if (view === undefined) throw new Error(`Unknown TEST_FIXTURE view ${viewName}`);
      return Object.freeze({
        allowed: view.dirty === false && view.sourceAllowsRead === true,
        dirty: view.dirty,
        sourceAllowsRead: view.sourceAllowsRead,
        reason: view.dirty
          ? 'PROJECTION_STALE'
          : view.sourceAllowsRead
            ? 'ALLOWED'
            : 'AUTHORITATIVE_SOURCE_DENY',
      });
    },
  });
}

export function adminEvent(action, requestId, payload, extraEnvelope = {}) {
  return Object.freeze({ action, requestId, payload: Object.freeze({ ...payload }), ...extraEnvelope });
}

export function writeGuards(expectedVersion, suffix) {
  return Object.freeze({
    expectedVersion,
    idempotencyKey: `idem_admin_fixture_${suffix.padEnd(16, '0')}`,
  });
}
