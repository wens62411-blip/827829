import type { PublicCardProjection } from '../../shared/types/projections';
import type { UtcInstant } from '../../shared/types/primitives';
import { createCardShare, getMyCard, getRuntimeEvidence, revokeCardShare } from './services/identity-client';
import { cityDisplayName, isSafeShareBearer, safeShareTitle, sanitizePublicCard, shareExpiry } from './services/card-presenter';
import { forgetShareRevocationPointer, isSafeShareTokenId, rememberShareForRevocation } from './services/share-revocation-pointer';

let transientShare: { readonly token: string; readonly shareTokenId: Parameters<typeof revokeCardShare>[0] } | undefined;

Page({
  data: {
    card: null as PublicCardProjection | null,
    runtimeMode: 'OFFLINE_DEMO',
    status: 'IDLE' as 'IDLE' | 'LOADING' | 'READY' | 'ERROR',
    message: '',
    sharePreparing: false,
    shareRevoking: false,
    shareReady: false,
    shareRevokePending: false,
    shareHint: '',
    cityLabel: '',
  },

  onLoad() {
    this.setData({ runtimeMode: getRuntimeEvidence().runtimeMode });
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
  },

  onShow() {
    void this.loadCard();
  },

  onUnload() {
    transientShare = undefined;
  },

  onPullDownRefresh() {
    void this.loadCard(true);
  },

  async loadCard(fromPullDown: boolean = false) {
    if (this.data.status === 'LOADING') {
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }
    this.setData({ status: 'LOADING', message: '' });
    const result = await getMyCard();
    if (!result.ok) {
      this.setData({
        status: 'ERROR',
        message: result.code === 'NOT_FOUND'
          ? '还没有可公开的名片，请先完成最小资料。'
          : result.message,
      });
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }
    this.setData({
      card: sanitizePublicCard(result.data.card),
      cityLabel: cityDisplayName(result.data.card.cityId),
      status: 'READY',
      message: '',
    });
    if (fromPullDown) wx.stopPullDownRefresh();
  },

  async prepareWechatShare() {
    if (this.data.sharePreparing || this.data.shareRevoking || !this.data.card || transientShare) return;
    this.setData({ sharePreparing: true, shareReady: false, shareHint: '正在创建一次安全分享入口…' });
    const result = await createCardShare(
      this.data.card.cardId,
      this.data.card.version,
      shareExpiry(7) as UtcInstant,
    );
    if (
      !result.ok ||
      result.data.targetType !== 'CARD' ||
      result.data.targetId !== this.data.card.cardId ||
      !isSafeShareBearer(result.data.token) ||
      !isSafeShareTokenId(result.data.shareTokenId)
    ) {
      transientShare = undefined;
      this.setData({
        sharePreparing: false,
        shareReady: false,
        shareHint: result.ok ? '服务返回的分享入口格式不安全或目标不匹配，请重试。' : result.message,
      });
      return;
    }
    transientShare = {
      token: result.data.token,
      shareTokenId: result.data.shareTokenId,
    };
    const revocationRemembered = rememberShareForRevocation(result.data.shareTokenId);
    this.setData({
      sharePreparing: false,
      shareReady: true,
      shareRevokePending: false,
      shareHint: revocationRemembered
        ? '安全入口已准备。点击下方按钮打开微信转发面板；是否送达以微信界面为准。'
        : '安全入口已准备，但本机未能保存撤销指针。请在离开本页前撤销，或等待入口自动过期。',
    });
    wx.showShareMenu({ menus: ['shareAppMessage'] });
  },

  async revokePreparedShare() {
    if (this.data.shareRevoking || !this.data.card || !transientShare) return;
    this.setData({ shareRevoking: true, shareReady: false, shareHint: '正在请求撤销当前入口…' });
    const result = await revokeCardShare(transientShare.shareTokenId, this.data.card.version);
    if (!result.ok || result.data.shareTokenId !== transientShare.shareTokenId) {
      this.setData({
        shareRevoking: false,
        shareRevokePending: true,
        shareHint: result.ok
          ? '服务返回的撤销目标不匹配。为避免误转发，入口已暂停使用；请重试。'
          : '撤销结果尚未确认。为避免误转发，入口已在本页暂停使用；请重试撤销。',
      });
      return;
    }
    transientShare = undefined;
    forgetShareRevocationPointer();
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    this.setData({
      shareRevoking: false,
      shareReady: false,
      shareRevokePending: false,
      shareHint: '服务端已确认撤销当前入口。历史页面下次刷新时将无法继续访问。',
    });
  },

  onShareAppMessage() {
    const card = this.data.card;
    if (!transientShare || !card || !this.data.shareReady) {
      wx.showToast({ title: '请先准备安全分享入口', icon: 'none' });
      return { title: 'AB Club', path: '/pages/card/index' };
    }
    this.setData({ shareHint: '微信转发面板已请求打开；本页不会伪造“分享成功”。' });
    return {
      title: safeShareTitle(card.displayName),
      path: `/pages/card-share/index?token=${encodeURIComponent(transientShare.token)}`,
    };
  },
});
