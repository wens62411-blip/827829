import { CITY_DIRECTORY } from '../../shared/constants/geography';
import type { ProfilePrivateDto } from '../../shared/types/projections';
import { isOfflineDemo } from '../card/services/offline-demo';
import {
  hasLocalIdentity,
  materializeLocalIdentityProfile,
  readLocalIdentity,
  type LocalIdentity,
} from '../card/services/local-identity';

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
const supportedCityNames = CITY_DIRECTORY.map((city) => city.name.zh);

function displayInitial(displayName: string): string {
  return Array.from(displayName.trim())[0] ?? 'AB';
}

function localIdentityCompletion(identity: LocalIdentity): number {
  return Math.min(100, 60
    + (identity.biography ? 20 : 0)
    + (identity.profession ? 10 : 0)
    + (identity.selectedLabels.length ? 10 : 0));
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
    localIdentityReady: false,
    profileInitial: 'AB',
    cityName: '',
    cityGroupTitle: EMPTY_CITY_GROUP.cityGroupTitle,
    cityImageSrc: '',
    cityImageFailed: false,
    hasProfileCity: false,
    supportedCities,
    supportedCityNames,
    status: 'IDLE' as 'IDLE' | 'LOADING' | 'READY' | 'ERROR',
    message: '',
  },

  onLoad() {
    const runtime = getMeRuntime();
    this.setData({ runtimeMode: runtime.runtimeMode, demoMode: isOfflineDemo(runtime) });
  },

  onShow() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar) tabBar.setData({ selected: 2, hidden: false });
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
      const local = hasLocalIdentity() ? readLocalIdentity() : null;
      if (local) {
        const profile = materializeLocalIdentityProfile(local);
        this.setData({
          profile,
          completionPercent: localIdentityCompletion(local),
          profileInitial: displayInitial(profile.displayName),
          cityImageFailed: false,
          ...resolveCityGroup(profile),
          status: 'READY',
          localIdentityReady: true,
          message: '',
        });
        if (fromPullDown) wx.stopPullDownRefresh();
        return;
      }
      this.setData({
        profile: null,
        completionPercent: 0,
        profileInitial: 'AB',
        cityImageFailed: false,
        ...EMPTY_CITY_GROUP,
        status: 'READY',
        localIdentityReady: false,
        message: '',
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

});
