import { CITY_DIRECTORY } from '../../shared/constants/geography';
import type { ProfilePrivateDto } from '../../shared/types/projections';
import { OFFLINE_DEMO_PROFILE, isOfflineDemo } from '../card/services/offline-demo';
import { readOfflineDemoDraft } from '../card/services/offline-demo-draft';

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

interface CityGroupView {
  readonly cityName: string;
  readonly cityGroupTitle: string;
  readonly cityImageSrc: string;
  readonly hasProfileCity: boolean;
}

const EMPTY_CITY_GROUP: CityGroupView = {
  cityName: '',
  cityGroupTitle: '选择你的 AB Club 城市群',
  cityImageSrc: '',
  hasProfileCity: false,
};

function displayInitial(displayName: string): string {
  return Array.from(displayName.trim())[0] ?? 'AB';
}

function resolveCityGroup(profile: ProfilePrivateDto | null): CityGroupView {
  const city = profile?.cityId
    ? CITY_DIRECTORY.find((entry) => entry.id === profile.cityId)
    : undefined;
  if (!city) return EMPTY_CITY_GROUP;

  return {
    cityName: city.name.zh,
    cityGroupTitle: `AB Club ${city.name.zh}城市群`,
    cityImageSrc: `/assets/cities/${city.id}.jpg`,
    hasProfileCity: true,
  };
}

Page({
  data: {
    profile: null as ProfilePrivateDto | null,
    completionPercent: 0,
    runtimeMode: 'OFFLINE_DEMO',
    demoMode: false,
    profileInitial: 'AB',
    cityName: '',
    cityGroupTitle: EMPTY_CITY_GROUP.cityGroupTitle,
    cityImageSrc: '',
    cityImageFailed: false,
    hasProfileCity: false,
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
      const draft = readOfflineDemoDraft();
      const profile: ProfilePrivateDto = {
        ...OFFLINE_DEMO_PROFILE,
        displayName: draft.displayName,
        cityId: draft.cityId,
        biography: draft.biography,
      };
      this.setData({
        profile,
        completionPercent: 72,
        profileInitial: displayInitial(profile.displayName),
        cityImageFailed: false,
        ...resolveCityGroup(profile),
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
        profile: null,
        completionPercent: 0,
        profileInitial: 'AB',
        cityImageFailed: false,
        ...EMPTY_CITY_GROUP,
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
      profileInitial: displayInitial(result.data.profile.displayName),
      cityImageFailed: false,
      ...resolveCityGroup(result.data.profile),
      status: 'READY',
      message: '',
    });
    if (fromPullDown) wx.stopPullDownRefresh();
  },

  handleCityImageError() {
    this.setData({ cityImageFailed: true });
  },

  /**
   * UI-only boundary until a frozen city-group application action exists.
   * This handler intentionally performs no local persistence or cloud write.
   */
  handleCityGroupApplication() {
    if (!this.data.hasProfileCity) {
      wx.showModal({
        title: '尚未选择城市',
        content: '请先通过“切换城市”完善名片中的所在城市。本次没有提交申请，也不会生成城市群成员状态。',
        showCancel: false,
        confirmText: '我知道了',
      });
      return;
    }

    const cityLabel = this.data.cityName ? `${this.data.cityName}城市群` : '当前城市群';
    wx.showModal({
      title: '申请尚未提交',
      content: this.data.demoMode
        ? `${cityLabel}当前仅为本地示意。开放状态与加入资格待运营确认，群二维码不会公开展示。`
        : `${cityLabel}的申请接口尚未接入，本次操作没有提交。待运营确认开放状态与加入资格后，将由受信云端接口处理；群二维码不会公开展示。`,
      showCancel: false,
      confirmText: '我知道了',
    });
  },
});
