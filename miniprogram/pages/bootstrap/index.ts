import type { IdentityClientFailure } from '../card/services/identity-client';

declare const require: (path: string) => typeof import('../card/services/identity-client');

function getBootstrapRuntime(): { readonly runtimeMode: string; readonly cloudConfigured: boolean } {
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

function bootstrapFailureMessage(failure: IdentityClientFailure): string {
  if (failure.code === 'AUTH_REQUIRED' || failure.code === 'SESSION_EXPIRED') {
    return '微信身份暂未建立，请重试初始化。';
  }
  if (failure.code === 'RATE_LIMITED') return '操作较频繁，请稍后再试。';
  return failure.message;
}

Page({
  data: {
    runtimeMode: 'OFFLINE_DEMO',
    cloudConfigured: false,
    demoMode: true,
    status: 'IDLE' as 'IDLE' | 'LOADING' | 'ERROR',
    message: 'DEMO_ONLY：可直接进入公开体验；身份、资料和认证均不会被伪造。',
  },

  onLoad() {
    const runtime = getBootstrapRuntime();
    const demoMode = runtime.runtimeMode === 'OFFLINE_DEMO' && !runtime.cloudConfigured;
    this.setData({
      runtimeMode: runtime.runtimeMode,
      cloudConfigured: runtime.cloudConfigured,
      demoMode,
      ...(!runtime.cloudConfigured
        ? { message: 'DEMO_ONLY：可浏览合成示例；不会创建身份、保存资料或产生认证。' }
        : {}),
    });
    if (runtime.cloudConfigured) void this.initializeIdentity();
  },

  async initializeIdentity() {
    if (this.data.status === 'LOADING') return;
    if (this.data.demoMode) {
      this.setData({ message: '当前没有授权云环境，未创建微信身份。你仍可进入 DEMO_ONLY 公开体验。' });
      return;
    }
    this.setData({ status: 'LOADING', message: '正在安全初始化微信身份…' });
    const { bootstrapIdentity } = require('../card/services/identity-client');
    const result = await bootstrapIdentity();
    if (!result.ok) {
      this.setData({ status: 'ERROR', message: bootstrapFailureMessage(result) });
      return;
    }
    this.setData({ status: 'IDLE', message: '身份初始化完成，正在进入 AB Club。' });
    if (result.data.session.profileComplete) {
      wx.switchTab({ url: '/pages/card/index' });
      return;
    }
    wx.redirectTo({ url: '/packageCard/pages/edit/index?source=bootstrap' });
  },

  continueOffline() {
    wx.switchTab({ url: '/pages/card/index' });
  },
});
