import { RuntimeMode } from '../../shared/types/enums';
import { DISCOVER_DEMO_EVENTS } from '../../components/ab-event-card/demo-data';

interface FeaturedCity {
  readonly id: string;
  readonly name: string;
  readonly region: string;
  readonly imageSrc: string;
  readonly alt: string;
  readonly imageFailed: boolean;
}

const featuredCities: readonly FeaturedCity[] = [
  { id: 'cn-hangzhou', name: '杭州', region: '中国', imageSrc: '/assets/cities/cn-hangzhou.jpg', alt: '航拍杭州西湖、湖中岛屿与远山全景', imageFailed: false },
  { id: 'ch-zurich', name: '苏黎世', region: '瑞士', imageSrc: '/assets/cities/ch-zurich.jpg', alt: '苏黎世利马特河两岸老城全景', imageFailed: false },
  { id: 'it-milan', name: '米兰', region: '意大利', imageSrc: '/assets/cities/it-milan.jpg', alt: '米兰大教堂与大教堂广场', imageFailed: false },
  { id: 'au-sydney', name: '悉尼', region: '澳大利亚', imageSrc: '/assets/cities/au-sydney.jpg', alt: '悉尼歌剧院与海港大桥', imageFailed: false },
];

const cityGroups = [
  { region: '中国', cities: '北京 · 上海 · 广州 · 深圳 · 杭州' },
  { region: '欧洲', cities: '苏黎世 · 米兰 · 巴黎' },
  { region: '亚太', cities: '新加坡 · 墨尔本 · 悉尼' },
  { region: '加拿大', cities: '多伦多 · 温哥华' },
] as const;

const artVerticals = [
  { name: '艺术', en: 'ART', description: '展览、艺术家与收藏叙事' },
  { name: '古董', en: 'ANTIQUES', description: '器物、年代与来源信息' },
  { name: '珠宝', en: 'JEWELLERY', description: '设计、材质与鉴赏活动' },
] as const;

Page({
  data: {
    runtimeMode: RuntimeMode.OFFLINE_DEMO,
    featuredCities,
    cityGroups,
    demoEvents: DISCOVER_DEMO_EVENTS,
    artVerticals,
    brandLogoFailed: false,
    heroImageFailed: false,
    artImageFailed: false,
  },

  handleImageError(event: WechatMiniprogram.CustomEvent) {
    const imageKey = String(event.currentTarget.dataset.imageKey ?? '');
    if (imageKey === 'brand') {
      this.setData({ brandLogoFailed: true });
      return;
    }
    if (imageKey === 'hero') {
      this.setData({ heroImageFailed: true });
      return;
    }
    if (imageKey === 'art') {
      this.setData({ artImageFailed: true });
      return;
    }
    if (!imageKey.startsWith('city:')) return;
    const cityId = imageKey.slice('city:'.length);
    if (!this.data.featuredCities.some((city) => city.id === cityId)) return;
    this.setData({
      featuredCities: this.data.featuredCities.map((city) => (
        city.id === cityId ? { ...city, imageFailed: true } : city
      )),
    });
  },

  onShareAppMessage() {
    return {
      title: 'AB Club · OFFLINE DEMO · 全球城市与文化体验',
      path: '/pages/discover/index',
    };
  },
});
