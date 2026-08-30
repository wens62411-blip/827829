import { RuntimeMode } from '../../shared/types/enums';
import { DISCOVER_DEMO_EVENTS } from '../../components/ab-event-card/demo-data';
import { isOfflineDemo } from '../card/services/offline-demo';
import { hasOfflineDemoDraft } from '../card/services/offline-demo-draft';

type IdentityClientModule = typeof import('../card/services/identity-client');
declare const require: (path: string) => IdentityClientModule;

function getDiscoverRuntime(): { readonly runtimeMode: string; readonly cloudConfigured: boolean } {
  try {
    const app = getApp<{ globalData?: { runtimeMode?: string; cloudEnvironmentConfigured?: boolean } }>();
    return {
      runtimeMode: app.globalData?.runtimeMode ?? RuntimeMode.OFFLINE_DEMO,
      cloudConfigured: app.globalData?.cloudEnvironmentConfigured === true,
    };
  } catch (_error) {
    return { runtimeMode: RuntimeMode.OFFLINE_DEMO, cloudConfigured: false };
  }
}

interface EditorialEvent {
  readonly eventId: string;
  readonly cityId: string;
  readonly cityName: string;
  readonly cityNameEn: string;
  readonly timezone: string;
  readonly title: string;
  readonly summary: string;
  readonly localTimeLabel: string;
  readonly cardIndex: string;
  readonly cardMeta: string;
  readonly coverSrc: string;
  readonly coverAlt: string;
  readonly coverCredit: string;
}

const cityGroups = [
  { region: '中国', cities: '北京 · 上海 · 杭州 · 广州 · 深圳 · 台北（中国台湾）' },
  { region: '欧洲', cities: '苏黎世 · 米兰 · 巴黎' },
  { region: '亚太', cities: '新加坡 · 墨尔本 · 悉尼' },
  { region: '加拿大', cities: '多伦多 · 温哥华' },
] as const;

const editorialAsset = {
  coverSrc: '/assets/editorial-events/jewelry-study.jpg',
  coverAlt: '珠宝博物馆展厅与陈列柜，用于收藏交流方向视觉参考',
  coverCredit: '图片：Hannolans · CC BY 4.0',
} as const;

const primaryEvent: EditorialEvent = {
  ...DISCOVER_DEMO_EVENTS[0]!,
  ...editorialAsset,
};

const cityFeature = {
  imageSrc: '/assets/cities/ch-zurich.jpg',
  alt: '苏黎世利马特河两岸老城全景，用于全球城市目录视觉参考',
} as const;

function updateTabBarSelected(page: unknown, index: number) {
  const tabBar = typeof (page as { getTabBar?: () => { setData: (data: Record<string, unknown>) => void } | undefined }).getTabBar === 'function'
    ? (page as { getTabBar: () => { setData: (data: Record<string, unknown>) => void } | undefined }).getTabBar()
    : null;
  if (tabBar) tabBar.setData({ selected: index });
}

Page({
  data: {
    runtimeMode: RuntimeMode.OFFLINE_DEMO,
    cityGroups,
    primaryEvent,
    cityFeature,
    openingCard: false,
    brandLogoFailed: false,
    eventImageFailed: false,
    cityImageFailed: false,
  },

  onShow() {
    updateTabBarSelected(this, 0);
  },

  async openMyCard() {
    if (this.data.openingCard) return;
    this.setData({ openingCard: true });
    try {
      const runtime = getDiscoverRuntime();
      let target = '/packageCard/pages/edit/index';
      if (isOfflineDemo(runtime)) {
        target = hasOfflineDemoDraft() ? '/pages/card/index' : target;
      } else {
        const { getMyProfile } = require('../card/services/identity-client');
        const result = await getMyProfile();
        target = result.ok ? '/pages/card/index' : target;
      }
      await wx.navigateTo({ url: target });
    } finally {
      this.setData({ openingCard: false });
    }
  },

  handleImageError(event: WechatMiniprogram.CustomEvent) {
    const imageKey = String(event.currentTarget.dataset.imageKey ?? '');
    if (imageKey === 'brand') {
      this.setData({ brandLogoFailed: true });
      return;
    }
    if (imageKey === 'event') {
      this.setData({ eventImageFailed: true });
      return;
    }
    if (imageKey === 'city') this.setData({ cityImageFailed: true });
  },

  scrollToCities() {
    wx.pageScrollTo({
      selector: '#global-city-directory',
      duration: 360,
    });
  },

  onShareAppMessage() {
    return {
      title: 'AB Club · OFFLINE DEMO · 全球华人文化与连接',
      path: '/pages/discover/index',
    };
  },
});
