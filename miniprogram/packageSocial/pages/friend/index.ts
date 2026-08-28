import type { FriendshipState } from '../../../shared/types/enums';
import type {
  FriendshipId,
  IdempotencyKey,
  OptimisticVersion,
  StableId,
  UserId,
} from '../../../shared/types/primitives';
import type {
  PublicCardProjection,
  PublicVerificationClaimProjection,
  ViewerRelationshipProjection,
} from '../../../shared/types/projections';
import {
  callSocialAction,
  createSocialIdempotencyKey,
  loadRelationshipForViewer,
  socialErrorMessage,
} from '../../../pages/network/services/social-client';
import {
  deriveRelationshipActions,
  type RelationshipActionView,
} from '../../models/relationship-view';

interface CardView {
  readonly displayName: string;
  readonly headline: string;
  readonly biography: string;
  readonly avatarUrl: string;
}

interface ClaimView {
  readonly claimId: string;
  readonly label: string;
  readonly reviewStatus: string;
  readonly verificationState: string;
}

const EMPTY_ACTIONS: RelationshipActionView = deriveRelationshipActions({
  friendshipState: undefined,
  viewerBlockedSubject: false,
  subjectBlockedViewer: false,
  outgoingPendingKnown: false,
});

const actionKeys = new Map<string, IdempotencyKey>();

function intentKey(action: string, targetUserId: string): IdempotencyKey {
  const key = `${action}:${targetUserId}`;
  const existing = actionKeys.get(key);
  if (existing) return existing;
  const created = createSocialIdempotencyKey(action);
  actionKeys.set(key, created);
  return created;
}

function toCardView(card: PublicCardProjection): CardView {
  return {
    displayName: card.displayName,
    headline: card.headline ?? '',
    biography: card.biography ?? '',
    avatarUrl: card.avatarUrl ?? '',
  };
}

function toClaimView(claim: PublicVerificationClaimProjection): ClaimView {
  return {
    claimId: claim.claimId,
    label: claim.labelText.zh,
    reviewStatus: claim.reviewStatus,
    verificationState: claim.verificationState,
  };
}

function overRedactFriendsOnly(card: CardView): CardView {
  return { ...card, headline: '', biography: '' };
}

Page({
  data: {
    targetUserId: '',
    card: null as CardView | null,
    claims: [] as ClaimView[],
    relationship: null as ViewerRelationshipProjection | null,
    actions: EMPTY_ACTIONS,
    outgoingPendingKnown: false,
    requestMessage: '',
    busyAction: '',
    loading: false,
    errorMessage: '',
  },

  onLoad(options: Record<string, string | undefined>) {
    const targetUserId = options.ownerUserId?.trim() ?? '';
    if (!targetUserId || targetUserId.length > 160) {
      this.setData({ errorMessage: '缺少有效的成员标识，请从成员名片或发现页的连接入口进入。' });
      return;
    }
    this.setData({ targetUserId });
    void this.loadRelationship();
  },

  async loadRelationship() {
    if (!this.data.targetUserId || this.data.loading) return;
    this.setData({ loading: true, errorMessage: '' });
    try {
      const response = await loadRelationshipForViewer(this.data.targetUserId as UserId);
      const relationship = response.relationship;
      this.setData({
        card: toCardView(response.card),
        claims: response.claims.map(toClaimView),
        relationship,
        actions: deriveRelationshipActions({
          friendshipState: relationship.friendshipState,
          viewerBlockedSubject: relationship.viewerBlockedSubject,
          subjectBlockedViewer: relationship.subjectBlockedViewer,
          outgoingPendingKnown: this.data.outgoingPendingKnown,
        }),
      });
    } catch (error) {
      this.setData({ errorMessage: socialErrorMessage(error) });
    } finally {
      this.setData({ loading: false });
    }
  },

  onMessageInput(event: WechatMiniprogram.Input) {
    this.setData({ requestMessage: event.detail.value.slice(0, 120) });
  },

  updateRelationship(patch: Partial<ViewerRelationshipProjection>, outgoingPendingKnown = false) {
    const current = this.data.relationship;
    if (!current) return;
    const relationship = { ...current, ...patch };
    this.setData({
      relationship,
      outgoingPendingKnown,
      actions: deriveRelationshipActions({
        friendshipState: relationship.friendshipState,
        viewerBlockedSubject: relationship.viewerBlockedSubject,
        subjectBlockedViewer: relationship.subjectBlockedViewer,
        outgoingPendingKnown,
      }),
    });
  },

  async onRequest() {
    if (!this.data.actions.canRequest || this.data.busyAction) return;
    const targetUserId = this.data.targetUserId;
    this.setData({ busyAction: 'request' });
    try {
      const message = this.data.requestMessage.trim();
      const base = {
        recipientUserId: targetUserId as UserId,
        idempotencyKey: intentKey('friend-request', targetUserId),
      };
      const response = await callSocialAction('friend.request', message ? { ...base, message } : base);
      actionKeys.delete(`friend-request:${targetUserId}`);
      this.setData({ relationship: response.relationship, requestMessage: '', outgoingPendingKnown: true });
      this.updateRelationship({}, true);
      wx.showToast({ title: '申请已发出', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: socialErrorMessage(error), icon: 'none', duration: 2600 });
    } finally {
      this.setData({ busyAction: '' });
    }
  },

  async onCancel() {
    const friendshipId = this.data.relationship?.friendshipId;
    if (!friendshipId || !this.data.actions.canCancel || this.data.busyAction) return;
    const confirm = await wx.showModal({ title: '撤回申请？', content: '撤回后，对方将不再看到这条待处理申请。', confirmText: '撤回' });
    if (!confirm.confirm) return;
    await this.runRelationshipWrite('cancel', async () => {
      await callSocialAction('friend.cancel', {
        friendshipId,
        expectedVersion: this.data.relationship!.version as OptimisticVersion,
        idempotencyKey: intentKey('friend-cancel', this.data.targetUserId),
      });
      actionKeys.delete(`friend-cancel:${this.data.targetUserId}`);
      this.updateRelationship({ friendshipState: 'CANCELLED' as FriendshipState }, false);
    });
  },

  async onRemove() {
    const friendshipId = this.data.relationship?.friendshipId;
    if (!friendshipId || !this.data.actions.canRemove || this.data.busyAction) return;
    const confirm = await wx.showModal({
      title: '解除 AB Club 平台关系？',
      content: '解除后，双方的 FRIENDS_ONLY 字段访问权限会立即收回。',
      confirmText: '解除关系',
      confirmColor: '#9D3F36',
    });
    if (!confirm.confirm) return;
    await this.runRelationshipWrite('remove', async () => {
      await callSocialAction('friend.remove', {
        friendshipId: friendshipId as FriendshipId,
        expectedVersion: this.data.relationship!.version as OptimisticVersion,
        idempotencyKey: intentKey('friend-remove', this.data.targetUserId),
      });
      actionKeys.delete(`friend-remove:${this.data.targetUserId}`);
      this.setData({ card: this.data.card ? overRedactFriendsOnly(this.data.card) : null });
      this.updateRelationship({
        friendshipState: 'REMOVED' as FriendshipState,
        mayViewFriendsOnlyFields: false,
      });
    });
  },

  async onBlock() {
    if (!this.data.actions.canBlock || this.data.busyAction) return;
    const confirm = await wx.showModal({
      title: '拉黑该成员？',
      content: '拉黑会阻止后续申请，并立即收回已有关系带来的字段权限。',
      confirmText: '拉黑',
      confirmColor: '#9D3F36',
    });
    if (!confirm.confirm) return;
    await this.runRelationshipWrite('block', async () => {
      await callSocialAction('block.create', {
        blockedUserId: this.data.targetUserId as UserId,
        reasonCode: 'PRIVACY',
        idempotencyKey: intentKey('block-create', this.data.targetUserId),
      });
      actionKeys.delete(`block-create:${this.data.targetUserId}`);
      this.setData({ card: this.data.card ? overRedactFriendsOnly(this.data.card) : null, claims: [] });
      this.updateRelationship({
        friendshipState: 'REMOVED' as FriendshipState,
        viewerBlockedSubject: true,
        mayViewFriendsOnlyFields: false,
      });
    });
  },

  async onUnblock() {
    if (!this.data.actions.canUnblock || this.data.busyAction) return;
    await this.runRelationshipWrite('unblock', async () => {
      await callSocialAction('block.remove', {
        blockedUserId: this.data.targetUserId as UserId,
        idempotencyKey: intentKey('block-remove', this.data.targetUserId),
      });
      actionKeys.delete(`block-remove:${this.data.targetUserId}`);
      this.updateRelationship({ viewerBlockedSubject: false, mayViewFriendsOnlyFields: false });
    });
  },

  async onReport() {
    if (!this.data.actions.canReport || this.data.busyAction) return;
    let reasonCode: 'HARASSMENT' | 'SPAM' | 'MISLEADING' | 'RIGHTS' | 'OTHER';
    try {
      const choice = await wx.showActionSheet({ itemList: ['骚扰', '垃圾信息', '误导信息', '权利侵害', '其他'] });
      reasonCode = (['HARASSMENT', 'SPAM', 'MISLEADING', 'RIGHTS', 'OTHER'] as const)[choice.tapIndex] ?? 'OTHER';
    } catch {
      return;
    }
    await this.runRelationshipWrite('report', async () => {
      await callSocialAction('report.create', {
        targetType: 'USER',
        targetId: this.data.targetUserId as StableId,
        reasonCode,
        evidenceAssetIds: [],
        idempotencyKey: intentKey('report-create', this.data.targetUserId),
      });
      actionKeys.delete(`report-create:${this.data.targetUserId}`);
      wx.showToast({ title: '举报已提交', icon: 'success' });
    });
  },

  async runRelationshipWrite(action: string, operation: () => Promise<void>) {
    this.setData({ busyAction: action });
    try {
      await operation();
      if (action !== 'report') wx.showToast({ title: '状态已更新', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: socialErrorMessage(error), icon: 'none', duration: 2600 });
    } finally {
      this.setData({ busyAction: '' });
    }
  },
});
