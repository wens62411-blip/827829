import {
  CITY_DIRECTORY,
  CityId,
} from '../../shared/constants/geography';
import { LOCAL_RUNTIME } from '../../shared/services/runtime';
import {
  EventState,
  PublicationState,
  RecordOrigin,
  RuntimeMode,
  VerificationState,
} from '../../shared/types/enums';
import type { PublicEventProjection } from '../../shared/types/projections';
import { createRequestId } from '../../shared/utils/request-id';
import {
  safeGetStorageSync,
  safeSetStorageSync,
} from '../../shared/utils/safe-storage';
import { getEventCloudClient } from '../../components/ab-event-card/cloud-client-loader';
import {
  DemoEventCategoryId,
  DemoEventSectionId,
  listActivityDemoEvents,
} from '../../components/ab-event-card/demo-data';
import type {
  ActivityDemoEventPresentation,
  DemoEventCategoryId as DemoCategoryId,
} from '../../components/ab-event-card/demo-data';

const ALL_CATEGORIES = 'all' as const;
type ActivityCategoryFilterId = typeof ALL_CATEGORIES | DemoCategoryId;

interface CityFilterView {
  readonly id: string;
  readonly label: string;
  readonly nameEn: string;
  readonly selected: boolean;
}

interface ActivityCategoryView {
  readonly id: ActivityCategoryFilterId;
  readonly label: string;
  readonly nameEn: string;
  readonly description: string;
  readonly selected: boolean;
}

interface EventCardView {
  readonly eventId: string;
  readonly title: string;
  readonly summary: string;
  readonly cityName: string;
  readonly timeLabel: string;
  readonly timezone: string;
  readonly stateLabel: string;
  readonly registrationLabel: string;
  readonly origin: string;
  readonly verificationState: string;
  readonly coverSrc: string;
  readonly coverAlt: string;
  readonly detailAvailable: boolean;
  readonly categoryLabel: string;
}

const EVENT_STATE_LABELS: Readonly<Record<string, string>> = {
  [EventState.PUBLISHED]: '公开信息',
  [EventState.PAUSED]: '已暂停',
  [EventState.COMPLETED]: '已结束',
};

const CATEGORY_DEFINITIONS: readonly Omit<ActivityCategoryView, 'selected'>[] = [
  { id: ALL_CATEGORIES, label: '全部', nameEn: 'ALL', description: '本城策展总览' },
  { id: DemoEventCategoryId.ART, label: '艺术', nameEn: 'ART', description: '展览与创作者对话' },
  { id: DemoEventCategoryId.ANTIQUES, label: '古董', nameEn: 'ANTIQUES', description: '器物与收藏叙事' },
  { id: DemoEventCategoryId.JEWELRY, label: '珠宝', nameEn: 'JEWELRY', description: '设计与佩戴美学' },
  { id: DemoEventCategoryId.BUSINESS, label: '商业交流', nameEn: 'DIALOGUE', description: '品牌与文化合作' },
];

const FRONT_ROW_CITY_IDS: readonly CityId[] = [
  CityId.CN_SHANGHAI,
  CityId.CN_BEIJING,
  CityId.CN_HANGZHOU,
];

function buildCityFilters(selectedId: string): CityFilterView[] {
  const frontRow = CITY_DIRECTORY.filter((city) =>
    FRONT_ROW_CITY_IDS.includes(city.id as CityId),
  );
  const rest = CITY_DIRECTORY.filter(
    (city) => !FRONT_ROW_CITY_IDS.includes(city.id as CityId),
  );
  return [...frontRow, ...rest].map((city) => ({
    id: city.id,
    label: city.name.zh,
    nameEn: city.name.en,
    selected: city.id === selectedId,
  }));
}

function buildCategoryFilters(selectedId: ActivityCategoryFilterId): ActivityCategoryView[] {
  return CATEGORY_DEFINITIONS.map((category) => ({
    ...category,
    selected: category.id === selectedId,
  }));
}

function formatLocalTime(startsAt: string, timezone: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return '时间待确认';
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return '时间待确认';
  }
}

function toEventCard(event: PublicEventProjection): EventCardView {
  const city = CITY_DIRECTORY.find((item) => item.id === event.cityId);
  const detailAvailable =
    event.origin === RecordOrigin.REAL &&
    event.verificationState === VerificationState.HUMAN_REVIEWED &&
    event.publicationState === PublicationState.PUBLISHED &&
    (event.state === EventState.PUBLISHED ||
      event.state === EventState.PAUSED ||
      event.state === EventState.COMPLETED);
  return {
    eventId: event.eventId,
    title: event.title,
    summary: event.summary,
    cityName: city?.name.zh ?? '城市待确认',
    timeLabel: formatLocalTime(event.startsAt, event.timezone),
    timezone: event.timezone,
    stateLabel: EVENT_STATE_LABELS[event.state] ?? '信息待确认',
    registrationLabel: '一期仅作信息展示',
    origin: event.origin,
    verificationState: event.verificationState,
    coverSrc: '',
    coverAlt: event.coverAssetId
      ? '活动封面需要完成独立媒体权利解析后展示'
      : '该活动尚未提供独立封面',
    detailAvailable,
    categoryLabel: '公开活动',
  };
}

function toDemoCard(event: ActivityDemoEventPresentation): EventCardView {
  return {
    eventId: event.eventId,
    title: event.title,
    summary: event.summary,
    cityName: `${event.cityName} / ${event.cityNameEn}`,
    timeLabel: event.localTimeLabel,
    timezone: event.timezone,
    stateLabel: `${event.categoryLabel} · ${event.sectionLabel}`,
    registrationLabel: '一期不开放报名',
    origin: RecordOrigin.SYNTHETIC,
    verificationState: VerificationState.USER_DECLARED,
    coverSrc: event.imageSrc,
    coverAlt: event.imageAlt,
    detailAvailable: true,
    categoryLabel: event.categoryLabel,
  };
}

function buildDemoSections(cityId: string, categoryId: ActivityCategoryFilterId) {
  const source = listActivityDemoEvents(cityId)
    .filter((event) => categoryId === ALL_CATEGORIES || event.categoryId === categoryId);
  const sectionIds = new Map(source.map((event) => [event.eventId, event.sectionId]));
  const events = source.map(toDemoCard);
  return {
    featuredEvents: events.filter((event) => sectionIds.get(event.eventId) === DemoEventSectionId.FEATURED),
    upcomingEvents: events.filter((event) => sectionIds.get(event.eventId) === DemoEventSectionId.UPCOMING),
    cityThemeEvents: events.filter((event) => sectionIds.get(event.eventId) === DemoEventSectionId.CITY_THEME),
    visibleEventCount: events.length,
  };
}

const DEFAULT_CITY = CITY_DIRECTORY.find((city) => city.id === CityId.CN_SHANGHAI) ?? CITY_DIRECTORY[0];
if (!DEFAULT_CITY) throw new Error('Frozen city directory must include at least one city.');
const INITIAL_SECTIONS = buildDemoSections(DEFAULT_CITY.id, ALL_CATEGORIES);

let requestGeneration = 0;

Page({
  data: {
    brandLogoFailed: false,
    runtimeMode: LOCAL_RUNTIME.mode as string,
    selectedCityId: DEFAULT_CITY.id as string,
    selectedCityLabel: DEFAULT_CITY.name.zh as string,
    selectedCityNameEn: DEFAULT_CITY.name.en as string,
    selectedCityTimezone: DEFAULT_CITY.timezone as string,
    cityFilters: buildCityFilters(DEFAULT_CITY.id),
    selectedCategoryId: ALL_CATEGORIES as ActivityCategoryFilterId,
    categoryFilters: buildCategoryFilters(ALL_CATEGORIES),
    ...INITIAL_SECTIONS,
    loading: false,
    offlineDemo: !LOCAL_RUNTIME.cloudEnvironmentConfigured,
    stateKind: 'EMPTY',
    stateTitle: '当前没有可公开活动',
    stateDescription: '第一阶段以数字名片交换为核心，活动只保留少量信息预览。',
    stateDetail: '不会模拟真实排期、报名、支付、商户合作或城市节点运营。',
  },

  onLoad() {
    // 演示阶段：每次进入活动页都从默认城市上海开始，不沿用上一次的城市缓存。
    safeSetStorageSync('ab-events-city-id', DEFAULT_CITY.id);
    this.applyDemoFilters(DEFAULT_CITY.id, ALL_CATEGORIES);
    void this.refreshEvents();
  },

  onShow() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar) tabBar.setData({ selected: 1, hidden: false });
    if (!this.data.offlineDemo) return;
    const storedCityId = safeGetStorageSync('ab-events-city-id', DEFAULT_CITY.id);
    if (storedCityId && storedCityId !== this.data.selectedCityId) {
      const selected = CITY_DIRECTORY.find((city) => city.id === storedCityId);
      if (selected) this.applyDemoFilters(selected.id, this.data.selectedCategoryId);
    }
  },

  async onPullDownRefresh() {
    await this.refreshEvents();
    wx.stopPullDownRefresh();
  },

  applyDemoFilters(cityId: string, categoryId: ActivityCategoryFilterId) {
    const city = CITY_DIRECTORY.find((candidate) => candidate.id === cityId);
    if (!city) return;
    safeSetStorageSync('ab-events-city-id', city.id);
    this.setData({
      selectedCityId: city.id,
      selectedCityLabel: city.name.zh,
      selectedCityNameEn: city.name.en,
      selectedCityTimezone: city.timezone,
      cityFilters: buildCityFilters(city.id),
      selectedCategoryId: categoryId,
      categoryFilters: buildCategoryFilters(categoryId),
      ...buildDemoSections(city.id, categoryId),
    });
  },

  selectCity(event: WechatMiniprogram.CustomEvent) {
    const cityId = String(event.currentTarget.dataset.cityId ?? '');
    if (!CITY_DIRECTORY.some((city) => city.id === cityId)) return;
    this.applyDemoFilters(cityId, this.data.selectedCategoryId);
  },

  selectCategory(event: WechatMiniprogram.CustomEvent) {
    const categoryId = String(event.currentTarget.dataset.categoryId ?? '') as ActivityCategoryFilterId;
    if (!CATEGORY_DEFINITIONS.some((category) => category.id === categoryId)) return;
    this.applyDemoFilters(this.data.selectedCityId, categoryId);
  },

  async refreshEvents() {
    const generation = ++requestGeneration;
    if (!LOCAL_RUNTIME.cloudEnvironmentConfigured) {
      this.applyDemoFilters(this.data.selectedCityId, this.data.selectedCategoryId);
      this.setData({
        runtimeMode: RuntimeMode.OFFLINE_DEMO,
        loading: false,
        offlineDemo: true,
      });
      return;
    }

    const { callCloudAction } = getEventCloudClient();
    this.setData({ loading: true });
    try {
      const result = await callCloudAction('event.list', createRequestId(), {
        contractVersion: '1.0.0',
        limit: 3,
      });
      if (generation !== requestGeneration) return;
      if (!result.apiResult.ok) {
        this.showListFailure(result.apiResult.error.message);
        return;
      }
      const verifiedEvents = result.apiResult.data.page.items.map(toEventCard)
        .filter((event) => event.detailAvailable);
      this.setData({
        runtimeMode: RuntimeMode.LIVE,
        offlineDemo: false,
        featuredEvents: verifiedEvents,
        upcomingEvents: [],
        cityThemeEvents: [],
        visibleEventCount: verifiedEvents.length,
        loading: false,
      });
    } catch {
      if (generation === requestGeneration) this.showListFailure('正式活动信息暂时无法读取。');
    }
  },

  showListFailure(message: string) {
    this.setData({
      runtimeMode: RuntimeMode.DEGRADED,
      featuredEvents: [],
      upcomingEvents: [],
      cityThemeEvents: [],
      visibleEventCount: 0,
      loading: false,
      offlineDemo: false,
      stateKind: 'ERROR',
      stateTitle: '活动预览暂不可用',
      stateDescription: message,
      stateDetail: '正式请求失败后不会回退为合成活动，也不会生成报名或运营成功证据。',
    });
  },

  openCityDirectory() {
    void wx.navigateTo({
      url: `/packageEvents/pages/city/index?cityId=${encodeURIComponent(this.data.selectedCityId)}`,
    });
  },

  onBrandLogoError() {
    this.setData({ brandLogoFailed: true });
  },

  openEvent(event: WechatMiniprogram.CustomEvent<{ eventId: string }>) {
    const eventId = event.detail.eventId;
    if (!eventId) return;
    const query = eventId.startsWith('demo:')
      ? `demoEventId=${encodeURIComponent(eventId)}`
      : `eventId=${encodeURIComponent(eventId)}`;
    void wx.navigateTo({ url: `/packageEvents/pages/event/index?${query}` });
  },
});
