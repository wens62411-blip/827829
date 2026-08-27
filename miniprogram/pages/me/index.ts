import type { ProfilePrivateDto } from '../../shared/types/projections';
import { getMyProfile, getRuntimeEvidence } from '../card/services/identity-client';

Page({
  data: {
    profile: null as ProfilePrivateDto | null,
    completionPercent: 0,
    runtimeMode: 'OFFLINE_DEMO',
    status: 'IDLE' as 'IDLE' | 'LOADING' | 'READY' | 'ERROR',
    message: '',
  },

  onLoad() {
    this.setData({ runtimeMode: getRuntimeEvidence().runtimeMode });
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
    this.setData({ status: 'LOADING', message: '' });
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
