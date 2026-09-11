import type { PublicCardProjection } from '../../shared/types/projections';
import type { UtcInstant } from '../../shared/types/primitives';
import { cityDisplayName, isSafeShareBearer, safeShareTitle, sanitizePublicCard, shareExpiry } from './services/card-presenter';
import {
  OFFLINE_DEMO_FIELDS,
  OFFLINE_DEMO_SELECTED_LABELS,
  isOfflineDemo,
} from './services/offline-demo';
import {
  forgetShareRevocationPointer,
  isSafeShareTokenId,
  markShareRevokedForSession,
  rememberShareForRevocation,
  wasShareRevokedForSession,
} from './services/share-revocation-pointer';
import { readCardThemePreference, type CardTheme } from './services/card-theme-preference';
import {
  materializeOfflineDemoCard,
  materializeOfflineDemoFields,
  publicLabelsForDraft,
  readOfflineDemoDraft,
  type OfflineDemoPublicField,
} from './services/offline-demo-draft';
import {
  buildLocalIdentitySharePath,
  buildOfflineDemoSharePath,
  createLocalIdentityShareSnapshot,
  createOfflineDemoShareSnapshot,
} from './services/offline-demo-share-snapshot';
import { prepareNativeShareCardCover } from './services/native-share-card';
import {
  hasLocalIdentity,
  materializeLocalIdentityCard,
  materializeLocalIdentityFields,
  publicLabelsForLocalIdentity,
  readLocalIdentity,
} from './services/local-identity';

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

interface ActiveCardShare {
  readonly token: string;
  readonly shareTokenId: RevokeShareTokenId;
}

const SAFE_CARD_SHARE_COVER = '/assets/brand/ab-club-brand-share.jpg';

Page({
  cardPageUnloaded: false,
  cardPageGeneration: 0,
  cardLoadGeneration: 0,
  shareCoverGeneration: 0,
  shareOperationGeneration: 0,
  activeShare: undefined as ActiveCardShare | undefined,
  shareCoverPath: '',
  data: {
    card: null as PublicCardProjection | null,
    runtimeMode: 'OFFLINE_DEMO',
    demoMode: false,
    localIdentityReady: false,
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
    this.cardPageUnloaded = false;
    this.cardPageGeneration += 1;
    this.cardLoadGeneration += 1;
    this.shareCoverGeneration += 1;
    this.shareOperationGeneration += 1;
    this.activeShare = undefined;
    this.shareCoverPath = '';
    const runtime = getCardRuntime();
    this.setData({
      runtimeMode: runtime.runtimeMode,
      demoMode: isOfflineDemo(runtime),
      cardTheme: readCardThemePreference(),
    });
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
  },

  onShow() {
    this.invalidateShareRevokedElsewhere();
    const cardTheme = readCardThemePreference();
    if (cardTheme !== this.data.cardTheme) this.setData({ cardTheme });
    void this.loadCard();
  },

  onUnload() {
    this.cardPageUnloaded = true;
    this.cardPageGeneration += 1;
    this.cardLoadGeneration += 1;
    this.shareCoverGeneration += 1;
    this.shareOperationGeneration += 1;
    this.activeShare = undefined;
  },

  isCardPageActive(generation: number) {
    return !this.cardPageUnloaded && this.cardPageGeneration === generation;
  },

  onPullDownRefresh() {
    void this.loadCard(true);
  },

  async loadCard(fromPullDown: boolean = false) {
    const pageGeneration = this.cardPageGeneration;
    if (this.data.status === 'LOADING') {
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }
    const loadGeneration = ++this.cardLoadGeneration;
    this.shareCoverGeneration += 1;
    this.shareOperationGeneration += 1;
    this.shareCoverPath = '';
    this.setData({ shareReady: false, sharePreparing: false });
    if (this.data.demoMode) {
      const local = hasLocalIdentity() ? readLocalIdentity() : null;
      if (local) {
        const localCard = materializeLocalIdentityCard(local);
        this.setData({
          card: localCard,
          demoFields: materializeLocalIdentityFields(local),
          demoSelectedLabels: publicLabelsForLocalIdentity(local),
          cityLabel: cityDisplayName(local.cityId),
          status: 'READY',
          localIdentityReady: true,
          message: '',
        });
        await this.prepareWechatShare();
        if (fromPullDown) wx.stopPullDownRefresh();
        return;
      }
      const draft = readOfflineDemoDraft();
      const demoCard = materializeOfflineDemoCard(draft);
      this.setData({
        card: demoCard,
        demoFields: materializeOfflineDemoFields(draft),
        demoSelectedLabels: publicLabelsForDraft(draft),
        cityLabel: cityDisplayName(demoCard.cityId),
        status: 'READY',
        message: '本机预览 · 当前为合成示例，不会写入云端。',
      });
      await this.prepareWechatShare();
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }
    this.setData({ status: 'LOADING', message: '' });
    const { getMyCard } = loadIdentityClient();
    const result = await getMyCard();
    if (!this.isCardPageActive(pageGeneration) || this.cardLoadGeneration !== loadGeneration) return;
    if (!result.ok) {
      this.activeShare = undefined;
      this.setData({
        status: 'ERROR',
        card: null,
        message: result.code === 'NOT_FOUND'
          ? '还没有可公开的名片，请先完成最小资料。'
          : result.message,
      });
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }
    if (this.data.card?.cardId !== result.data.card.cardId || this.data.card?.version !== result.data.card.version) {
      this.activeShare = undefined;
      this.shareOperationGeneration += 1;
    }
    this.setData({
      card: sanitizePublicCard(result.data.card),
      cityLabel: cityDisplayName(result.data.card.cityId),
      status: 'READY',
      message: '',
    });
    await this.prepareWechatShare();
    if (!this.isCardPageActive(pageGeneration) || this.cardLoadGeneration !== loadGeneration) return;
    if (fromPullDown) wx.stopPullDownRefresh();
  },

  openEditor() {
    void wx.navigateTo({ url: '/packageCard/pages/edit/index' });
  },

  openShareManager() {
    void wx.navigateTo({ url: '/packageCard/pages/share/index' });
  },

  async preparePersonalShareCover() {
    if (typeof wx.createSelectorQuery !== 'function') return;
    const pageGeneration = this.cardPageGeneration;
    const loadGeneration = this.cardLoadGeneration;
    const coverGeneration = ++this.shareCoverGeneration;
    const ownerCard = this.data.card;
    const theme = this.data.cardTheme;
    const isCurrentCover = () => this.isCardPageActive(pageGeneration)
      && this.cardLoadGeneration === loadGeneration
      && this.shareCoverGeneration === coverGeneration
      && this.data.card === ownerCard
      && this.data.cardTheme === theme;
    let card = this.data.card;
    let fields: readonly OfflineDemoPublicField[] = [];
    let labels: readonly string[] = [];
    if (this.data.demoMode) {
      const local = hasLocalIdentity() ? readLocalIdentity() : null;
      const snapshot = local
        ? createLocalIdentityShareSnapshot(local, this.data.cardTheme)
        : createOfflineDemoShareSnapshot(readOfflineDemoDraft(), this.data.cardTheme);
      card = snapshot.card;
      fields = snapshot.fields;
      labels = snapshot.publicLabels;
    } else {
      const { getMyPublicCard } = loadIdentityClient();
      const result = await getMyPublicCard().catch(() => undefined);
      if (!isCurrentCover() || !result?.ok) return;
      card = sanitizePublicCard(result.data.card);
      labels = card.claims.map((claim) => claim.labelText.zh);
    }
    if (!card) return;
    const cover = await prepareNativeShareCardCover(this, {
      displayName: card.displayName,
      headline: card.headline,
      biography: card.biography,
      labels,
      phone: fields.find((field) => field.key === 'phone')?.value,
      email: fields.find((field) => field.key === 'email')?.value,
      demoMode: this.data.demoMode && !this.data.localIdentityReady,
    });
    if (isCurrentCover()) this.shareCoverPath = cover || '';
  },

  invalidateShareRevokedElsewhere(): boolean {
    const share = this.activeShare;
    if (
      !share
      || !wasShareRevokedForSession(share.shareTokenId)
    ) return false;
    this.activeShare = undefined;
    this.shareOperationGeneration += 1;
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    this.setData({
      sharePreparing: false,
      shareRevoking: false,
      shareReady: false,
      shareRevokePending: false,
      shareHint: '该分享入口已在入口管理中撤销，请重新准备后再分享。',
    });
    return true;
  },

  async prepareWechatShare() {
    if (this.data.sharePreparing || this.data.shareRevoking || !this.data.card) return;
    const pageGeneration = this.cardPageGeneration;
    const loadGeneration = this.cardLoadGeneration;
    const shareGeneration = ++this.shareOperationGeneration;
    const card = this.data.card;
    const theme = this.data.cardTheme;
    const isCurrentShare = () => this.isCardPageActive(pageGeneration)
      && this.cardLoadGeneration === loadGeneration
      && this.shareOperationGeneration === shareGeneration
      && this.data.card === card
      && this.data.cardTheme === theme;
    if (this.activeShare) {
      const share = this.activeShare;
      this.setData({ sharePreparing: true, shareReady: false });
      await this.preparePersonalShareCover();
      if (isCurrentShare() && this.activeShare === share && !this.invalidateShareRevokedElsewhere()) this.setData({ shareReady: true, sharePreparing: false });
      return;
    }
    if (this.data.demoMode) {
      this.setData({ sharePreparing: true, shareReady: false });
      const local = hasLocalIdentity() ? readLocalIdentity() : null;
      const sharePath = local
        ? buildLocalIdentitySharePath(local, this.data.cardTheme)
        : buildOfflineDemoSharePath(readOfflineDemoDraft(), this.data.cardTheme);
      await this.preparePersonalShareCover();
      if (!isCurrentShare()) return;
      this.setData({
        sharePreparing: false,
        shareReady: sharePath.ok,
        shareHint: sharePath.ok
          ? '名片已准备好，点击“分享名片”将直接打开微信转发面板。'
          : '当前名片内容超过微信分享路径限制，请返回编辑页精简后重试。',
      });
      if (sharePath.ok && typeof wx.showShareMenu === 'function') {
        wx.showShareMenu({ menus: ['shareAppMessage'] });
      }
      return;
    }
    this.setData({ sharePreparing: true, shareReady: false, shareHint: '正在创建一次安全分享入口…' });
    const { createCardShare } = loadIdentityClient();
    const result = await createCardShare(
      card.cardId,
      card.version,
      shareExpiry(7) as UtcInstant,
    );
    if (
      !isCurrentShare()
      || this.data.card?.cardId !== card.cardId
      || this.data.card?.version !== card.version
    ) return;
    if (
      !result.ok ||
      result.data.targetType !== 'CARD' ||
      result.data.targetId !== card.cardId ||
      !isSafeShareBearer(result.data.token) ||
      !isSafeShareTokenId(result.data.shareTokenId)
    ) {
      this.activeShare = undefined;
      this.setData({
        sharePreparing: false,
        shareReady: false,
        shareHint: result.ok ? '服务返回的分享入口格式不安全或目标不匹配，请重试。' : result.message,
      });
      return;
    }
    const revocationRemembered = rememberShareForRevocation(result.data.shareTokenId);
    this.activeShare = {
      token: result.data.token,
      shareTokenId: result.data.shareTokenId,
    };
    await this.preparePersonalShareCover();
    if (!isCurrentShare()) return;
    this.setData({
      sharePreparing: false,
      shareReady: true,
      shareRevokePending: false,
      shareHint: revocationRemembered
        ? '安全入口已准备。点击下方按钮打开微信转发面板；是否送达以微信界面为准。'
        : '安全入口已准备，但本机未能保存撤销指针。请在离开本页前撤销，或等待入口自动过期。',
    });
    if (typeof wx.showShareMenu === 'function') {
      wx.showShareMenu({ menus: ['shareAppMessage'] });
    }
  },

  async revokePreparedShare() {
    if (this.data.shareRevoking || !this.data.card || !this.activeShare) return;
    if (this.data.demoMode) {
      this.setData({ shareHint: '本机预览：没有可撤销的真实分享入口。' });
      return;
    }
    const pageGeneration = this.cardPageGeneration;
    const shareGeneration = ++this.shareOperationGeneration;
    const card = this.data.card;
    const share = this.activeShare;
    this.setData({ shareRevoking: true, shareReady: false, shareHint: '正在请求撤销当前入口…' });
    const { revokeCardShare } = loadIdentityClient();
    const result = await revokeCardShare(share.shareTokenId, card.version);
    const revokeConfirmed = result.ok && result.data.shareTokenId === share.shareTokenId;
    if (revokeConfirmed) {
      markShareRevokedForSession(share.shareTokenId);
      forgetShareRevocationPointer(share.shareTokenId);
    }
    if (
      !this.isCardPageActive(pageGeneration)
      || this.shareOperationGeneration !== shareGeneration
      || this.data.card?.cardId !== card.cardId
      || this.data.card?.version !== card.version
      || this.activeShare !== share
    ) return;
    if (!revokeConfirmed) {
      this.setData({
        shareRevoking: false,
        shareRevokePending: true,
        shareHint: result.ok
          ? '服务返回的撤销目标不匹配。为避免误转发，入口已暂停使用；请重试。'
          : '撤销结果尚未确认。为避免误转发，入口已在本页暂停使用；请重试撤销。',
      });
      return;
    }
    this.activeShare = undefined;
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    this.setData({
      shareRevoking: false,
      shareReady: false,
      shareRevokePending: false,
      shareHint: '服务端已确认撤销当前入口。历史页面下次刷新时将无法继续访问。',
    });
  },

  onShareAppMessage() {
    if (!this.data.demoMode) this.invalidateShareRevokedElsewhere();
    const card = this.data.card;
    if (this.cardPageUnloaded) {
      return {
        title: 'AB Club 数字名片',
        path: '/pages/card-share/index?invalid=1',
        imageUrl: SAFE_CARD_SHARE_COVER,
      };
    }
    if (this.data.demoMode && card && this.data.shareReady) {
      const local = hasLocalIdentity() ? readLocalIdentity() : null;
      const sharePath = local
        ? buildLocalIdentitySharePath(local, this.data.cardTheme)
        : buildOfflineDemoSharePath(readOfflineDemoDraft(), this.data.cardTheme);
      if (!sharePath.ok) {
        wx.showToast({ title: '请先精简名片内容', icon: 'none' });
        return {
          title: 'AB Club 数字名片',
          path: '/pages/card-share/index?invalid=1',
          imageUrl: SAFE_CARD_SHARE_COVER,
        };
      }
      this.setData({ shareHint: '微信转发面板已请求打开；是否真正发送以微信系统界面为准。' });
      return {
        title: safeShareTitle(card.displayName),
        path: sharePath.path,
        imageUrl: this.shareCoverPath || SAFE_CARD_SHARE_COVER,
      };
    }
    const share = this.activeShare;
    if (!share || !card || !this.data.shareReady) {
      wx.showToast({ title: '请先准备安全分享入口', icon: 'none' });
      return {
        title: 'AB Club 数字名片',
        path: '/pages/card-share/index?invalid=1',
        imageUrl: SAFE_CARD_SHARE_COVER,
      };
    }
    this.setData({ shareHint: '微信转发面板已请求打开；本页不会伪造“分享成功”。' });
    return {
      title: safeShareTitle(card.displayName),
      path: `/pages/card-share/index?token=${encodeURIComponent(share.token)}${this.data.cardTheme === 'ivory' ? '' : `&theme=${encodeURIComponent(this.data.cardTheme)}`}`,
      imageUrl: this.shareCoverPath || SAFE_CARD_SHARE_COVER,
    };
  },
});
