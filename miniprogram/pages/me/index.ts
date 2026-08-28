import type { ProfilePrivateDto } from '../../shared/types/projections';
import { OFFLINE_DEMO_CARD, OFFLINE_DEMO_FIELDS, OFFLINE_DEMO_PROFILE, OFFLINE_DEMO_REVIEW_ITEMS, isOfflineDemo } from '../card/services/offline-demo';

type IdentityClientModule = typeof import('../card/services/identity-client');
declare const require: (path: string) => IdentityClientModule;

function getMeRuntime(): { readonly runtimeMode: string; readonly cloudConfigured: boolean } {
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
  return require('../card/services/identity-client');
}

Page({
  data: {
    profile: null as ProfilePrivateDto | null,
    completionPercent: 0,
    runtimeMode: 'OFFLINE_DEMO',
    demoMode: false,
    demoCard: OFFLINE_DEMO_CARD,
    demoFields: OFFLINE_DEMO_FIELDS,
    demoReviewItems: OFFLINE_DEMO_REVIEW_ITEMS,
    status: 'IDLE' as 'IDLE' | 'LOADING' | 'READY' | 'ERROR',
    message: '',
  },

  onLoad() {
    const runtime = getMeRuntime();
    this.setData({ runtimeMode: runtime.runtimeMode, demoMode: isOfflineDemo(runtime) });
  },

  onShow() {
    void this.loadProfile();
  },

  onPullDownRefresh() {
    void this.loadProfile(true);
  },

  async loadProfile(fromPullDown: boolean = false) {
    if (this.data.status === 'LOADING') {
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }
    if (this.data.demoMode) {
      this.setData({
        profile: OFFLINE_DEMO_PROFILE,
        completionPercent: 72,
        status: 'READY',
        message: 'SYNTHETIC · DEMO_ONLY',
      });
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }
    this.setData({ status: 'LOADING', message: '' });
    const { getMyProfile } = loadIdentityClient();
    const result = await getMyProfile();
    if (!result.ok) {
      this.setData({
        status: 'ERROR',
        message: result.code === 'NOT_FOUND'
          ? '尚未建立个人资料，请先完成最小资料。'
          : result.message,
      });
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }
    this.setData({
      profile: result.data.profile,
      completionPercent: Math.max(0, Math.min(100, result.data.completionPercent)),
      status: 'READY',
      message: '',
    });
    if (fromPullDown) wx.stopPullDownRefresh();
  },
});
