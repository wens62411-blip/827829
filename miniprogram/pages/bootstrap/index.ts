import {
  bootstrapIdentity,
  getRuntimeEvidence,
  type IdentityClientFailure,
} from '../card/services/identity-client';

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
    status: 'IDLE' as 'IDLE' | 'LOADING' | 'ERROR',
    message: '',
  },

  onLoad() {
    const runtime = getRuntimeEvidence();
    this.setData({
      runtimeMode: runtime.runtimeMode,
      cloudConfigured: runtime.cloudConfigured,
      ...(!runtime.cloudConfigured
        ? { message: '当前为本地离线环境，身份初始化不会伪造成功。配置授权云环境后可重试。' }
        : {}),
    });
    if (runtime.cloudConfigured) void this.initializeIdentity();
  },

  async initializeIdentity() {
    if (this.data.status === 'LOADING') return;
    this.setData({ status: 'LOADING', message: '正在安全初始化微信身份…' });
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
    wx.switchTab({ url: '/pages/discover/index' });
  },
});
