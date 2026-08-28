import type { PublicCardProjection } from '../../shared/types/projections';
import type { UtcInstant } from '../../shared/types/primitives';
import { cityDisplayName, isSafeShareBearer, safeShareTitle, sanitizePublicCard, shareExpiry } from './services/card-presenter';
import {
  OFFLINE_DEMO_FIELDS,
  OFFLINE_DEMO_SELECTED_LABELS,
  isOfflineDemo,
} from './services/offline-demo';
import { forgetShareRevocationPointer, isSafeShareTokenId, rememberShareForRevocation } from './services/share-revocation-pointer';
import { readCardThemePreference, type CardTheme } from './services/card-theme-preference';
import {
  materializeOfflineDemoCard,
  materializeOfflineDemoFields,
  publicLabelsForDraft,
  readOfflineDemoDraft,
  type OfflineDemoPublicField,
} from './services/offline-demo-draft';

type IdentityClientModule = typeof import('./services/identity-client');
declare const require: (path: string) => IdentityClientModule;

type RevokeShareTokenId = Parameters<IdentityClientModule['revokeCardShare']>[0];

function getCardRuntime(): { readonly runtimeMode: string; readonly cloudConfigured: boolean } {
  try {
    const app = getApp<{ globalData?: { runtimeMode?: string; cloudEnvironmentConfigured?: boolean } }>();
    return {
      runtimeMode: app.globalData?.runtimeMode ?? 'OFFLINE_DEMO',
      cloudConfigured: app.globalData?.cloudEnvironmentConfigured === true,
    };
  } catch (_error) {
    return { runtimeMode: 'OFFLINE_DEMO', cloudConfigured: false };
  }
}

function loadIdentityClient(): IdentityClientModule {
  return require('./services/identity-client');
}

let transientShare: { readonly token: string; readonly shareTokenId: RevokeShareTokenId } | undefined;

Page({
  data: {
    card: null as PublicCardProjection | null,
    runtimeMode: 'OFFLINE_DEMO',
    demoMode: false,
    demoFields: [...OFFLINE_DEMO_FIELDS] as OfflineDemoPublicField[],
    demoSelectedLabels: [...OFFLINE_DEMO_SELECTED_LABELS] as string[],
    demoGalleryUrls: [] as string[],
    cardTheme: 'ivory' as CardTheme,
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
    const runtime = getCardRuntime();
    this.setData({
      runtimeMode: runtime.runtimeMode,
      demoMode: isOfflineDemo(runtime),
      cardTheme: readCardThemePreference(),
    });
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
  },

  onShow() {
    const cardTheme = readCardThemePreference();
    if (cardTheme !== this.data.cardTheme) this.setData({ cardTheme });
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
    if (this.data.demoMode) {
      const draft = readOfflineDemoDraft();
      const demoCard = materializeOfflineDemoCard(draft);
      this.setData({
        card: demoCard,
        demoFields: materializeOfflineDemoFields(draft),
        demoSelectedLabels: publicLabelsForDraft(draft),
        cityLabel: cityDisplayName(demoCard.cityId),
        status: 'READY',
        message: 'SYNTHETIC · DEMO_ONLY：示例不会保存、分享或进入审核。',
      });
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }
    this.setData({ status: 'LOADING', message: '' });
    const { getMyCard } = loadIdentityClient();
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

  openEditor() {
    void wx.navigateTo({ url: '/packageCard/pages/edit/index' });
  },

  openShare() {
    void wx.navigateTo({ url: '/packageCard/pages/share/index' });
  },

  async prepareWechatShare() {
    if (this.data.sharePreparing || this.data.shareRevoking || !this.data.card || transientShare) return;
    if (this.data.demoMode) {
      this.setData({ shareHint: 'DEMO_ONLY：未创建分享入口。' });
      return;
    }
    this.setData({ sharePreparing: true, shareReady: false, shareHint: '正在创建一次安全分享入口…' });
    const { createCardShare } = loadIdentityClient();
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
    if (this.data.demoMode) {
      this.setData({ shareHint: 'DEMO_ONLY：没有可撤销的真实分享入口。' });
      return;
    }
    this.setData({ shareRevoking: true, shareReady: false, shareHint: '正在请求撤销当前入口…' });
    const { revokeCardShare } = loadIdentityClient();
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
