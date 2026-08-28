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
}

export interface DiscoverDemoEventPresentation extends DemoEventPresentation {
  readonly cardIndex: string;
  readonly cardMeta: string;
}

const DISCOVER_DEMO_EVENT_DEFINITIONS = [
  {
    eventId: 'demo:discover:zurich-private-collection',
    cityId: 'ch-zurich',
    title: '私人收藏与家族传承对话',
    summary: '以公开知识框架讨论收藏叙事与家族传承，不提供鉴定、交易或真实资源承诺。',
    cardIndex: '01',
    cardMeta: '小型圆桌 · 邀请制',
  },
  {
    eventId: 'demo:discover:hangzhou-brand-art-dinner',
    cityId: 'cn-hangzhou',
    title: '西湖边的品牌与艺术晚宴',
    summary: '以杭州城市文化为线索，呈现品牌、艺术与长期关系的策展式交流构想。',
    cardIndex: '02',
    cardMeta: '跨界交流 · 预约制',
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
    summary: `DEMO_ONLY · ${definition.summary} 本条仅为本地策展预览。`,
    localTimeLabel: 'DEMO · 日期与场地待确认',
    cardIndex: definition.cardIndex,
    cardMeta: definition.cardMeta,
  };
}

export const DISCOVER_DEMO_EVENTS: readonly DiscoverDemoEventPresentation[] =
  DISCOVER_DEMO_EVENT_DEFINITIONS.map(makeDiscoverDemoEvent);

export const ART_RELATED_DEMO_EVENT: DemoEventPresentation = (() => {
  const city = CITY_DIRECTORY.find((candidate) => candidate.id === CityId.CN_SHENZHEN);
  if (!city) throw new Error('Frozen city directory must include Shenzhen for the Art demo event.');
  return {
    eventId: 'event_demo_art_reading_001',
    cityId: city.id,
    cityName: city.name.zh,
    cityNameEn: city.name.en,
    timezone: city.timezone,
    title: '作品资料阅读会（DEMO_ONLY）',
    summary: '合成线下活动，不代表真实排期或官方合作。',
    localTimeLabel: 'DEMO · 日期与场地待确认',
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
    summary: `DEMO_ONLY · ${concept[1]} 本条仅为本地策展预览，不代表真实活动已排期。`,
    localTimeLabel: 'DEMO · 日期与场地待确认',
  };
}

export function getDemoEventById(value: string): DemoEventPresentation | undefined {
  const featured = REGISTERED_DEMO_EVENTS.find((event) => event.eventId === value);
  if (featured) return featured;
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
