import type { FriendRequestProjection, PublicCardProjection } from '../../shared/types/projections';
import { callSocialAction, socialErrorMessage } from './services/social-client';

interface AcceptedCardView {
  readonly ownerUserId: string;
  readonly displayName: string;
  readonly headline: string;
  readonly avatarUrl: string;
}

function toAcceptedCardView(card: PublicCardProjection): AcceptedCardView {
  return {
    ownerUserId: card.ownerUserId,
    displayName: card.displayName,
    headline: card.headline ?? '',
    avatarUrl: card.avatarUrl ?? '',
  };
}

Page({
  data: {
    runtimeMode: 'OFFLINE_DEMO',
    loading: false,
    loaded: false,
    errorMessage: '',
    incomingPreview: [] as FriendRequestProjection[],
    acceptedPreview: [] as AcceptedCardView[],
    incomingLoadedCount: 0,
    acceptedLoadedCount: 0,
  },

  onShow() {
    void this.loadOverview();
  },

  async loadOverview() {
    if (this.data.loading) return;
    this.setData({ loading: true, errorMessage: '' });
    try {
      const [incoming, accepted] = await Promise.all([
        callSocialAction('friend.listIncoming', { includeExpired: false, limit: 20 }),
        callSocialAction('friend.listAccepted', { limit: 20 }),
      ]);
      this.setData({
        loaded: true,
        incomingPreview: incoming.page.items.slice(0, 2),
        acceptedPreview: accepted.page.items.slice(0, 4).map(toAcceptedCardView),
        incomingLoadedCount: incoming.page.items.length,
        acceptedLoadedCount: accepted.page.items.length,
      });
    } catch (error) {
      this.setData({ loaded: false, errorMessage: socialErrorMessage(error) });
    } finally {
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },

  onPullDownRefresh() {
    void this.loadOverview();
  },
});
