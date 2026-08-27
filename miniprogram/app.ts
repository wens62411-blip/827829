import { RuntimeMode } from './shared/types/enums';

App({
  globalData: {
    contractVersion: '1.0.0',
    runtimeMode: RuntimeMode.OFFLINE_DEMO,
    cloudEnvironmentConfigured: false,
  },
  onLaunch() {
    // LOCAL_ONLY deliberately does not call wx.cloud.init without an authorized env.
    wx.setStorageSync('ab_club_runtime_evidence', {
      contractVersion: '1.0.0',
      runtimeMode: RuntimeMode.OFFLINE_DEMO,
      source: 'LOCAL_ONLY',
    });
  },
});
