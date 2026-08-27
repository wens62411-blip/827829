import type {
  FriendshipId,
  IdempotencyKey,
  OptimisticVersion,
  PaginationCursor,
} from '../../../shared/types/primitives';
import type { FriendRequestProjection } from '../../../shared/types/projections';
import {
  callSocialAction,
  createSocialIdempotencyKey,
  socialErrorMessage,
} from '../../../pages/network/services/social-client';

interface RequestView {
  readonly friendshipId: string;
  readonly displayName: string;
  readonly headline: string;
  readonly avatarUrl: string;
  readonly message: string;
  readonly state: string;
  readonly version: number;
}

function toRequestView(request: FriendRequestProjection): RequestView {
  return {
    friendshipId: request.friendshipId,
    displayName: request.requester.displayName,
    headline: request.requester.headline ?? '',
    avatarUrl: request.requester.avatarUrl ?? '',
    message: request.message ?? '',
    state: request.state,
    version: request.version,
  };
}

const pendingKeys = new Map<string, IdempotencyKey>();

function intentKey(action: 'accept' | 'reject', friendshipId: string): IdempotencyKey {
  const mapKey = `${action}:${friendshipId}`;
  const existing = pendingKeys.get(mapKey);
  if (existing) return existing;
  const created = createSocialIdempotencyKey(`friend-${action}`);
  pendingKeys.set(mapKey, created);
  return created;
}

Page({
  data: {
    requests: [] as RequestView[],
    loading: false,
    loaded: false,
    loadingMore: false,
    busyFriendshipId: '',
    nextCursor: '',
    hasMore: false,
    errorMessage: '',
  },

  onLoad() {
    void this.loadRequests(false);
  },

  onPullDownRefresh() {
    void this.loadRequests(false);
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) void this.loadRequests(true);
  },

  onRetry() {
    void this.loadRequests(false);
  },

  async loadRequests(append: boolean) {
    if (this.data.loading || this.data.loadingMore) return;
    this.setData(append ? { loadingMore: true } : { loading: true, errorMessage: '' });
    try {
      const payload = append && this.data.nextCursor
        ? { includeExpired: false as const, limit: 20, cursor: this.data.nextCursor as PaginationCursor }
        : { includeExpired: false as const, limit: 20 };
      const response = await callSocialAction('friend.listIncoming', payload);
      const nextItems = response.page.items.map(toRequestView);
      this.setData({
        requests: append ? [...this.data.requests, ...nextItems] : nextItems,
        nextCursor: response.page.nextCursor ?? '',
        hasMore: response.page.hasMore,
        loaded: true,
      });
    } catch (error) {
      this.setData({ errorMessage: socialErrorMessage(error) });
    } finally {
      this.setData({ loading: false, loadingMore: false });
      wx.stopPullDownRefresh();
    }
  },

  async onAccept(event: WechatMiniprogram.CustomEvent<{ friendshipId: string }>) {
    const { friendshipId } = event.detail;
    if (!friendshipId || this.data.busyFriendshipId) return;
    const current = this.data.requests.find((item) => item.friendshipId === friendshipId);
    if (!current) return;
    this.setData({ busyFriendshipId: friendshipId });
    try {
      await callSocialAction('friend.accept', {
        friendshipId: friendshipId as FriendshipId,
        expectedVersion: current.version as OptimisticVersion,
        idempotencyKey: intentKey('accept', friendshipId),
      });
      pendingKeys.delete(`accept:${friendshipId}`);
      this.setData({ requests: this.data.requests.filter((item) => item.friendshipId !== friendshipId) });
      wx.showToast({ title: '已接受申请', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: socialErrorMessage(error), icon: 'none', duration: 2600 });
    } finally {
      this.setData({ busyFriendshipId: '' });
    }
  },

  async onReject(event: WechatMiniprogram.CustomEvent<{ friendshipId: string }>) {
    const { friendshipId } = event.detail;
    if (!friendshipId || this.data.busyFriendshipId) return;
    const current = this.data.requests.find((item) => item.friendshipId === friendshipId);
    if (!current) return;
    let reasonCode: 'NOT_KNOWN' | 'NOT_NOW' | 'OTHER';
    try {
      const choice = await wx.showActionSheet({ itemList: ['暂时不合适', '并不认识对方', '其他原因'] });
      reasonCode = choice.tapIndex === 0 ? 'NOT_NOW' : choice.tapIndex === 1 ? 'NOT_KNOWN' : 'OTHER';
    } catch {
      return;
    }
    this.setData({ busyFriendshipId: friendshipId });
    try {
      await callSocialAction('friend.reject', {
        friendshipId: friendshipId as FriendshipId,
        reasonCode,
        expectedVersion: current.version as OptimisticVersion,
        idempotencyKey: intentKey('reject', friendshipId),
      });
      pendingKeys.delete(`reject:${friendshipId}`);
      this.setData({ requests: this.data.requests.filter((item) => item.friendshipId !== friendshipId) });
      wx.showToast({ title: '已婉拒', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: socialErrorMessage(error), icon: 'none', duration: 2600 });
    } finally {
      this.setData({ busyFriendshipId: '' });
    }
  },
});
