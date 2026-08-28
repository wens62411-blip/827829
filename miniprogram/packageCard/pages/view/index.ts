import type { UserId } from '../../../shared/types/primitives';
import type { PublicCardProjection } from '../../../shared/types/projections';
import {
  cityDisplayName,
  sanitizePublicCard,
  viewerModeFromRelationship,
  type CardViewerMode,
} from '../../../pages/card/services/card-presenter';
import { OFFLINE_DEMO_CARD, OFFLINE_DEMO_FIELDS, isOfflineDemo } from '../../../pages/card/services/offline-demo';
import { readCardThemePreference, type CardTheme } from '../../../pages/card/services/card-theme-preference';

type IdentityClientModule = typeof import('../../../pages/card/services/identity-client');
declare const require: (path: string) => IdentityClientModule;

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
  return require('../../../pages/card/services/identity-client');
}

function parseOwnerUserId(value: string | undefined): UserId | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(normalized)) return undefined;
  return normalized as UserId;
}

Page({
  viewedOwnerUserId: undefined as UserId | undefined,
  viewLoadGeneration: 0,
  viewUnloaded: true,
  data: {
    runtimeMode: 'OFFLINE_DEMO',
    demoMode: false,
    demoFields: OFFLINE_DEMO_FIELDS,
    card: null as PublicCardProjection | null,
    viewerMode: 'SELF' as CardViewerMode,
    status: 'IDLE' as 'IDLE' | 'LOADING' | 'READY' | 'ERROR',
    message: '',
    invalidOwner: false,
    demoVisitorPreview: false,
    viewedOwnerUserId: '',
    cityLabel: '',
    cardTheme: 'ivory' as CardTheme,
  },

  onLoad(options: Record<string, string | undefined>) {
    this.viewUnloaded = false;
    this.viewLoadGeneration += 1;
    const runtime = getCardRuntime();
    const demoMode = isOfflineDemo(runtime);
    const demoVisitorPreview = demoMode && options.preview === 'STRANGER';
    this.setData({
      runtimeMode: runtime.runtimeMode,
      demoMode,
      demoVisitorPreview,
      invalidOwner: false,
      cardTheme: readCardThemePreference(),
    });
    if (options.ownerUserId !== undefined) {
      this.viewedOwnerUserId = parseOwnerUserId(options.ownerUserId);
      if (!this.viewedOwnerUserId) {
        this.setData({
          invalidOwner: true,
          status: 'ERROR',
          message: '名片查看参数无效，请从可信入口重新打开。',
        });
      } else {
        this.setData({ viewedOwnerUserId: this.viewedOwnerUserId });
      }
    } else {
      this.viewedOwnerUserId = undefined;
      this.setData({ viewedOwnerUserId: '' });
    }
  },

  onShow() {
    if (!this.data.invalidOwner) void this.loadCard();
  },

  onUnload() {
    this.viewUnloaded = true;
    this.viewLoadGeneration += 1;
    this.viewedOwnerUserId = undefined;
  },

  onPullDownRefresh() {
    void this.loadCard(true);
  },

  handleDemoExchange() {
    wx.showModal({
      title: '交换功能演示',
      content: '这是一张合成演示名片，当前不会创建好友申请或人脉记录。真实名片会在你确认后进入申请流程。',
      showCancel: false,
      confirmText: '我知道了',
    });
  },

  async loadCard(fromPullDown: boolean = false) {
    if (this.data.invalidOwner || this.data.status === 'LOADING') {
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }
    const viewedOwnerUserId = this.viewedOwnerUserId;
    const loadGeneration = ++this.viewLoadGeneration;
    const isCurrentLoad = () => (
      !this.viewUnloaded
      && this.viewLoadGeneration === loadGeneration
      && this.viewedOwnerUserId === viewedOwnerUserId
    );
    if (this.data.demoMode && !viewedOwnerUserId) {
      this.setData({
        status: 'READY',
        card: OFFLINE_DEMO_CARD,
        cityLabel: cityDisplayName(OFFLINE_DEMO_CARD.cityId),
        viewerMode: this.data.demoVisitorPreview ? 'STRANGER' : 'SELF',
        message: this.data.demoVisitorPreview
          ? 'SYNTHETIC · DEMO_ONLY · 访客视角预览'
          : 'SYNTHETIC · DEMO_ONLY',
      });
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }
    this.setData({ status: 'LOADING', message: '', card: null });
    if (!viewedOwnerUserId) {
      const { getMyCard } = loadIdentityClient();
      const result = await getMyCard();
      if (!isCurrentLoad()) return;
      if (!result.ok) {
        this.setData({ status: 'ERROR', message: result.message });
      } else {
        this.setData({
          status: 'READY',
          card: sanitizePublicCard(result.data.card),
          cityLabel: cityDisplayName(result.data.card.cityId),
          viewerMode: 'SELF',
        });
      }
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }

    const { getCardForViewer } = loadIdentityClient();
    const result = await getCardForViewer(viewedOwnerUserId);
    if (!isCurrentLoad()) return;
    if (!result.ok) {
      this.setData({
        status: 'ERROR',
        message: result.code === 'BLOCKED_RELATIONSHIP'
          ? '根据当前双方关系设置，这张名片不可查看。'
          : result.message,
      });
    } else if (
      result.data.card.ownerUserId !== viewedOwnerUserId ||
      result.data.relationship.subjectUserId !== viewedOwnerUserId
    ) {
      this.setData({ status: 'ERROR', message: '服务返回的名片身份不匹配，请重新打开可信入口。' });
    } else {
      this.setData({
        status: 'READY',
        card: sanitizePublicCard(result.data.card, result.data.claims),
        cityLabel: cityDisplayName(result.data.card.cityId),
        viewerMode: viewerModeFromRelationship(result.data.relationship),
      });
    }
    if (fromPullDown) wx.stopPullDownRefresh();
  },
});
