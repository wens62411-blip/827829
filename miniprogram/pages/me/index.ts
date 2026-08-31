import { CITY_DIRECTORY } from '../../shared/constants/geography';
import type { ProfilePrivateDto } from '../../shared/types/projections';
import { OFFLINE_DEMO_PROFILE, isOfflineDemo } from '../card/services/offline-demo';
import { readOfflineDemoDraft } from '../card/services/offline-demo-draft';
import { hasOfflineDemoDraft } from '../card/services/offline-demo-draft';

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
  cityGroupTitle: 'AB Club 支持的城市清单',
  cityImageSrc: '',
  hasProfileCity: false,
};

const supportedCities = CITY_DIRECTORY.map((city) => city.name.zh).join('、');

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
    cityGroupTitle: 'AB Club 支持的城市清单',
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
    supportedCities,
    status: 'IDLE' as 'IDLE' | 'LOADING' | 'READY' | 'EMPTY' | 'ERROR',
    message: '',
  },

  onLoad() {
    const runtime = getMeRuntime();
    this.setData({ runtimeMode: runtime.runtimeMode, demoMode: isOfflineDemo(runtime) });
  },

  onShow() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar) tabBar.setData({ selected: 2 });
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
      // 默认路径必须是用户自己的数据：本地没有保存过草稿 = 尚未创建名片，
      // 展示真实空状态，绝不用示例人物（姓名/头像/城市）占用「我的」。
      if (!hasOfflineDemoDraft()) {
        this.setData({
          profile: null,
          completionPercent: 0,
          profileInitial: '',
          cityImageFailed: false,
          ...EMPTY_CITY_GROUP,
          status: 'EMPTY',
          message: '',
        });
        if (fromPullDown) wx.stopPullDownRefresh();
        return;
      }
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
        message: '',
      });
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }
    this.setData({ status: 'LOADING', message: '' });
    const { getMyProfile } = loadIdentityClient();
    const result = await getMyProfile();
    if (!result.ok) {
      // NOT_FOUND = 用户尚未创建名片，属于真实空状态，不应渲染成错误页，
      // 更不能用示例资料顶替，否则用户会以为自己的名片被别人占用。
      const isNotFound = result.code === 'NOT_FOUND';
      this.setData({
        profile: null,
        completionPercent: 0,
        profileInitial: isNotFound ? '' : 'AB',
        cityImageFailed: false,
        ...EMPTY_CITY_GROUP,
        status: isNotFound ? 'EMPTY' : 'ERROR',
        message: isNotFound ? '' : result.message,
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

  // 示例名片：仅在用户主动点击后展示，绝不出现在默认路径上
  viewSampleCard() {
    wx.navigateTo({ url: '/packageCard/pages/view/index?preview=STRANGER' });
  },

});
