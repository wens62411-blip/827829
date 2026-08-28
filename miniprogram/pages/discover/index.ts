import { RuntimeMode } from '../../shared/types/enums';
import { DISCOVER_DEMO_EVENTS } from '../../components/ab-event-card/demo-data';

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
  { region: '中国', cities: '北京 · 上海 · 广州 · 深圳 · 杭州' },
  { region: '欧洲', cities: '苏黎世 · 米兰 · 巴黎' },
  { region: '亚太', cities: '新加坡 · 墨尔本 · 悉尼' },
  { region: '加拿大', cities: '多伦多 · 温哥华' },
] as const;

const memberEditorials = [
  {
    initials: '陈',
    displayName: '陈言（示意）',
    headline: '跨境品牌策略',
    cityLine: '深圳 · 新加坡',
    commonGround: '共同关注：品牌国际化与文化合作',
  },
  {
    initials: '林',
    displayName: '林澜（示意）',
    headline: '艺术机构合作',
    cityLine: '巴黎 · 苏黎世',
    commonGround: '共同关注：艺术项目与长期收藏叙事',
  },
] as const;

const artVerticals = [
  { name: '艺术', en: 'ART', description: '展览、收藏与品牌合作' },
  { name: '古董', en: 'ANTIQUES', description: '器物鉴赏与主题对话' },
  { name: '珠宝', en: 'JEWELLERY', description: '设计、珍珠与线下品鉴' },
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

Page({
  data: {
    runtimeMode: RuntimeMode.OFFLINE_DEMO,
    cityGroups,
    memberEditorials,
    primaryEvent,
    artVerticals,
    cityFeature,
    brandLogoFailed: false,
    eventImageFailed: false,
    cityImageFailed: false,
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
    if (imageKey === 'city') {
      this.setData({ cityImageFailed: true });
    }
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
