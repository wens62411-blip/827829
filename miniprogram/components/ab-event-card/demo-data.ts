import { CITY_DIRECTORY, CityId } from '../../shared/constants/geography';

const CONCEPTS = [
  ['城市雅集', '商业创作者与收藏爱好者围绕一件城市主题作品展开小桌交流。'],
  ['艺藏夜谈', '从艺术、古董与珠宝的观看方式出发，设计一场克制而深入的跨界对话。'],
  ['世界餐桌', '以当地文化为线索连接跨城成员，呈现小规模餐叙与观点交换的体验结构。'],
  ['建筑漫游', '从一处城市地标出发，串联建筑、设计与商业灵感的策展式步行路线。'],
  ['收藏入门课', '以公开知识框架讨论来源、品相与审美，不提供鉴真结论或交易撮合。'],
] as const;

export interface DemoEventPresentation {
  readonly eventId: string;
  readonly cityId: CityId;
  readonly cityName: string;
  readonly cityNameEn: string;
  readonly timezone: string;
  readonly title: string;
  readonly summary: string;
  readonly localTimeLabel: string;
  readonly categoryId?: DemoEventCategoryId;
  readonly categoryLabel?: string;
  readonly sectionId?: DemoEventSectionId;
  readonly sectionLabel?: string;
  readonly imageSrc?: string;
  readonly imageAlt?: string;
  readonly imageCredit?: string;
}

export interface DiscoverDemoEventPresentation extends DemoEventPresentation {
  readonly cardIndex: string;
  readonly cardMeta: string;
}

export const DemoEventCategoryId = {
  ART: 'art',
  ANTIQUES: 'antiques',
  JEWELRY: 'jewelry',
  BUSINESS: 'business',
} as const;
export type DemoEventCategoryId =
  (typeof DemoEventCategoryId)[keyof typeof DemoEventCategoryId];

export const DemoEventSectionId = {
  FEATURED: 'featured',
  UPCOMING: 'upcoming',
  CITY_THEME: 'city-theme',
} as const;
export type DemoEventSectionId =
  (typeof DemoEventSectionId)[keyof typeof DemoEventSectionId];

export interface ActivityDemoEventPresentation extends DemoEventPresentation {
  readonly categoryId: DemoEventCategoryId;
  readonly categoryLabel: string;
  readonly sectionId: DemoEventSectionId;
  readonly sectionLabel: string;
  readonly imageSrc: string;
  readonly imageAlt: string;
  readonly imageCredit: string;
}

const ACTIVITY_CATEGORY_DEFINITIONS = [
  [DemoEventCategoryId.ART, '艺术', ['当代艺术与城市夜谈', '工作室开放日', '建筑与公共艺术漫游'], '从作品、空间与城市文化出发，连接创作者与关注者。', ['/assets/editorial-events/gallery-salon.jpg', '美术馆展厅视觉参考', 'Tourbillon · CC BY-SA 3.0']],
  [DemoEventCategoryId.ANTIQUES, '古董', ['器物、年代与收藏叙事', '东西方工艺阅读会', '城市博物馆观察路线'], '讨论器物历史、工艺与收藏伦理，不提供鉴定或交易。', ['/assets/editorial-events/private-table.jpg', '小型桌谈视觉参考', 'Shixart1985 · CC BY 2.0']],
  [DemoEventCategoryId.JEWELRY, '珠宝', ['珠宝设计与当代收藏', '宝石色彩与佩戴美学', '独立设计地图导览'], '以设计、材料与佩戴方式为线索，呈现克制的观看与交流。', ['/assets/editorial-events/jewelry-study.jpg', '珠宝展柜视觉参考', 'Hannolans · CC BY 4.0']],
  [DemoEventCategoryId.BUSINESS, '商业交流', ['跨境品牌与文化合作小桌', '新精英的长期主义对话', '城市创意产业走访'], '围绕跨城市经验、品牌与文化合作交换观点，不构成撮合。', ['/assets/editorial-events/private-table.jpg', '克制餐叙视觉参考', 'Shixart1985 · CC BY 2.0']],
] as const;
const ACTIVITY_SECTIONS = [
  [DemoEventSectionId.FEATURED, '本月精选', 0],
  [DemoEventSectionId.UPCOMING, '近期方向', 1],
  [DemoEventSectionId.CITY_THEME, '城市主题', 2],
] as const;

export function listActivityDemoEvents(
  cityId?: string,
): ActivityDemoEventPresentation[] {
  const cities = cityId
    ? CITY_DIRECTORY.filter((city) => city.id === cityId)
    : CITY_DIRECTORY;
  const events: ActivityDemoEventPresentation[] = [];
  for (const city of cities) {
    for (const category of ACTIVITY_CATEGORY_DEFINITIONS) {
      for (const section of ACTIVITY_SECTIONS) {
        events.push({
          eventId: `demo:activity:${city.id}:${category[0]}:${section[0]}`,
          cityId: city.id,
          cityName: city.name.zh,
          cityNameEn: city.name.en,
          timezone: city.timezone,
          title: `${city.name.zh} · ${category[2][section[2]]}`,
          summary: `活动方向 · ${category[3]} 不代表真实排期、场地或合作关系。`,
          localTimeLabel: '日期与场地待确认',
          categoryId: category[0],
          categoryLabel: category[1],
          sectionId: section[0],
          sectionLabel: section[1],
          imageSrc: category[4][0],
          imageAlt: category[4][1],
          imageCredit: category[4][2],
        });
      }
    }
  }
  return events;
}

const DISCOVER_DEMO_EVENT_DEFINITIONS = [
  {
    eventId: 'demo:discover:shanghai-brand-art-dinner',
    cityId: 'cn-shanghai',
    title: '上海 · 品牌与艺术晚宴',
    summary: '以上海城市文化为线索，呈现品牌、艺术与长期关系的策展式交流构想。',
    cardIndex: '01',
    cardMeta: '跨界交流 · 预约制',
  },
  {
    eventId: 'demo:discover:zurich-private-collection',
    cityId: 'ch-zurich',
    title: '私人收藏与家族传承对话',
    summary: '以公开知识框架讨论收藏叙事与家族传承，不提供鉴定、交易或真实资源承诺。',
    cardIndex: '02',
    cardMeta: '小型圆桌 · 邀请制',
  },
  {
    eventId: 'demo:discover:singapore-founders-night',
    cityId: 'sg-singapore',
    title: '全球创业者连接之夜',
    summary: '围绕跨境品牌、城市节点与会员连接的小规模交流构想，不代表真实活动已排期。',
    cardIndex: '03',
    cardMeta: '商业社交 · 城市节点',
  },
] as const;

function makeDiscoverDemoEvent(
  definition: (typeof DISCOVER_DEMO_EVENT_DEFINITIONS)[number],
): DiscoverDemoEventPresentation {
  const city = CITY_DIRECTORY.find((candidate) => candidate.id === definition.cityId);
  if (!city) throw new Error(`Unknown frozen city for Discover demo event: ${definition.cityId}`);
  return {
    eventId: definition.eventId,
    cityId: city.id,
    cityName: city.name.zh,
    cityNameEn: city.name.en,
    timezone: city.timezone,
    title: definition.title,
    summary: `活动方向 · ${definition.summary} 日期、场地与合作方尚待确认。`,
    localTimeLabel: '日期与场地待确认',
    cardIndex: definition.cardIndex,
    cardMeta: definition.cardMeta,
  };
}

export const DISCOVER_DEMO_EVENTS: readonly DiscoverDemoEventPresentation[] =
  DISCOVER_DEMO_EVENT_DEFINITIONS.map(makeDiscoverDemoEvent);

export const ART_RELATED_DEMO_EVENT: DemoEventPresentation = (() => {
  const city = CITY_DIRECTORY.find((candidate) => candidate.id === CityId.CN_HANGZHOU);
  if (!city) throw new Error('Frozen city directory must include Hangzhou for the Art demo event.');
  return {
    eventId: 'event_demo_art_reading_001',
    cityId: city.id,
    cityName: city.name.zh,
    cityNameEn: city.name.en,
    timezone: city.timezone,
    title: '作品资料阅读会（活动方向）',
    summary: '活动方向，仅用于浏览，不代表真实排期或官方合作。',
    localTimeLabel: '日期与场地待确认',
  };
})();

const REGISTERED_DEMO_EVENTS: readonly DemoEventPresentation[] = [
  ...DISCOVER_DEMO_EVENTS,
  ART_RELATED_DEMO_EVENT,
];

export function getDemoEventByCityId(value: string): DemoEventPresentation | undefined {
  const index = CITY_DIRECTORY.findIndex((city) => city.id === value);
  if (index < 0) return undefined;
  const city = CITY_DIRECTORY[index];
  const concept = CONCEPTS[index % CONCEPTS.length];
  if (!city || !concept) return undefined;
  return {
    eventId: `demo:${city.id}`,
    cityId: city.id,
    cityName: city.name.zh,
    cityNameEn: city.name.en,
    timezone: city.timezone,
    title: `${city.name.zh} · ${concept[0]}`,
    summary: `活动方向 · ${concept[1]} 日期、场地与合作方尚待确认，不代表真实活动已排期。`,
    localTimeLabel: '日期与场地待确认',
  };
}

export function getDemoEventById(value: string): DemoEventPresentation | undefined {
  const featured = REGISTERED_DEMO_EVENTS.find((event) => event.eventId === value);
  if (featured) return featured;
  const activity = listActivityDemoEvents().find((event) => event.eventId === value);
  if (activity) return activity;
  if (!value.startsWith('demo:')) return undefined;
  return getDemoEventByCityId(value.slice('demo:'.length));
}

export function listDemoEvents(): DemoEventPresentation[] {
  const events: DemoEventPresentation[] = [];
  for (const city of CITY_DIRECTORY) {
    const event = getDemoEventByCityId(city.id);
    if (event) events.push(event);
  }
  return events;
}
