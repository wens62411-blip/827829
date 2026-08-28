import {
  CITY_DIRECTORY,
  COUNTRY_DIRECTORY,
  REGION_DIRECTORY,
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
import { getEventCloudClient } from '../../components/ab-event-card/cloud-client-loader';
import { DISCOVER_DEMO_EVENTS } from '../../components/ab-event-card/demo-data';

const ALL_COUNTRIES = 'all' as const;

interface CountryFilterView {
  readonly id: string;
  readonly label: string;
  readonly nameEn: string;
  readonly count: number;
  readonly selected: boolean;
}

interface CityPreviewView {
  readonly id: string;
  readonly name: string;
  readonly nameEn: string;
  readonly countryName: string;
  readonly regionName: string;
  readonly timezone: string;
  readonly imageSrc: string;
  readonly imageAlt: string;
  readonly imageFailed: boolean;
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
}

const EVENT_STATE_LABELS: Readonly<Record<string, string>> = {
  [EventState.PUBLISHED]: '公开信息',
  [EventState.PAUSED]: '已暂停',
  [EventState.COMPLETED]: '已结束',
};

const DEMO_COVERS: Readonly<Record<string, { src: string; alt: string }>> = {
  'demo:discover:zurich-private-collection': {
    src: '/assets/editorial-events/jewelry-study.jpg',
    alt: '珠宝博物馆展厅与陈列柜，用于收藏交流方向视觉参考',
  },
  'demo:discover:hangzhou-brand-art-dinner': {
    src: '/assets/editorial-events/private-table.jpg',
    alt: '布置完成的餐桌与餐具，用于小型餐叙方向视觉参考',
  },
  'demo:discover:singapore-founders-night': {
    src: '/assets/editorial-events/gallery-salon.jpg',
    alt: '光线柔和的美术馆展厅，用于城市交流方向视觉参考',
  },
};

function buildCountryFilters(selectedId: string): CountryFilterView[] {
  const countryFilters: CountryFilterView[] = [
    {
      id: ALL_COUNTRIES,
      label: '全部',
      nameEn: 'All cities',
      count: CITY_DIRECTORY.length,
      selected: selectedId === ALL_COUNTRIES,
    },
  ];

  for (const country of COUNTRY_DIRECTORY) {
    countryFilters.push({
      id: country.id,
      label: country.name.zh,
      nameEn: country.name.en,
      count: CITY_DIRECTORY.filter((city) => city.parentId === country.id).length,
      selected: selectedId === country.id,
    });
  }
  return countryFilters;
}

function buildCityPreviews(countryId: string): CityPreviewView[] {
  return CITY_DIRECTORY.filter((city) => countryId === ALL_COUNTRIES || city.parentId === countryId)
    .map((city) => {
      const country = COUNTRY_DIRECTORY.find((candidate) => candidate.id === city.parentId);
      const region = REGION_DIRECTORY.find((candidate) => candidate.id === city.regionId);
      return {
        id: city.id,
        name: city.name.zh,
        nameEn: city.name.en,
        countryName: country?.name.zh ?? '国家待确认',
        regionName: region?.name.zh ?? '区域待确认',
        timezone: city.timezone,
        imageSrc: `/assets/cities/${city.id}.jpg`,
        imageAlt: `${city.name.zh}城市实景，用于全球城市目录视觉预览`,
        imageFailed: false,
      };
    });
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
  };
}

function buildDemoCards(): EventCardView[] {
  return DISCOVER_DEMO_EVENTS.map((event) => {
    const cover = DEMO_COVERS[event.eventId];
    return {
      eventId: event.eventId,
      title: event.title,
      summary: event.summary,
      cityName: `${event.cityName} / ${event.cityNameEn}`,
      timeLabel: '日期与场地待确认',
      timezone: event.timezone,
      stateLabel: '方向预览',
      registrationLabel: '一期不开放报名',
      origin: RecordOrigin.SYNTHETIC,
      verificationState: VerificationState.USER_DECLARED,
      coverSrc: cover?.src ?? '',
      coverAlt: cover?.alt ?? '活动方向视觉参考',
      detailAvailable: true,
    };
  });
}

let requestGeneration = 0;

Page({
  data: {
    brandLogoFailed: false,
    runtimeMode: LOCAL_RUNTIME.mode as string,
    events: buildDemoCards() as EventCardView[],
    selectedCountryId: ALL_COUNTRIES as string,
    countryFilters: buildCountryFilters(ALL_COUNTRIES),
    cityPreviews: buildCityPreviews(ALL_COUNTRIES),
    loading: false,
    offlineDemo: !LOCAL_RUNTIME.cloudEnvironmentConfigured,
    stateKind: 'EMPTY',
    stateTitle: '当前没有可公开活动',
    stateDescription: '第一阶段以数字名片交换为核心，活动只保留少量信息预览。',
    stateDetail: '不会模拟真实排期、报名、支付、商户合作或城市节点运营。',
  },

  onLoad() {
    void this.refreshEvents();
  },

  async onPullDownRefresh() {
    await this.refreshEvents();
    wx.stopPullDownRefresh();
  },

  async refreshEvents() {
    const generation = ++requestGeneration;
    if (!LOCAL_RUNTIME.cloudEnvironmentConfigured) {
      this.setData({
        runtimeMode: RuntimeMode.OFFLINE_DEMO,
        events: buildDemoCards(),
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
      this.setData({
        runtimeMode: RuntimeMode.LIVE,
        offlineDemo: false,
        events: result.apiResult.data.page.items.map(toEventCard),
        loading: false,
      });
    } catch {
      if (generation === requestGeneration) this.showListFailure('正式活动信息暂时无法读取。');
    }
  },

  showListFailure(message: string) {
    this.setData({
      runtimeMode: RuntimeMode.DEGRADED,
      events: [],
      loading: false,
      offlineDemo: false,
      stateKind: 'ERROR',
      stateTitle: '活动预览暂不可用',
      stateDescription: message,
      stateDetail: '正式请求失败后不会回退为合成活动，也不会生成报名或运营成功证据。',
    });
  },

  openCityDirectory() {
    void wx.navigateTo({ url: '/packageEvents/pages/city/index' });
  },

  onBrandLogoError() {
    this.setData({ brandLogoFailed: true });
  },

  selectCountry(event: WechatMiniprogram.CustomEvent) {
    const countryId = String(event.currentTarget.dataset.countryId ?? '');
    if (countryId !== ALL_COUNTRIES && !COUNTRY_DIRECTORY.some((country) => country.id === countryId)) {
      return;
    }
    this.setData({
      selectedCountryId: countryId,
      countryFilters: buildCountryFilters(countryId),
      cityPreviews: buildCityPreviews(countryId),
    });
  },

  onCityImageError(event: WechatMiniprogram.CustomEvent) {
    const failedIndex = Number(event.currentTarget.dataset.index);
    if (!Number.isInteger(failedIndex) || !this.data.cityPreviews[failedIndex]) return;
    this.setData({
      cityPreviews: this.data.cityPreviews.map((city, index) =>
        index === failedIndex ? { ...city, imageFailed: true } : city),
    });
  },

  openCity(event: WechatMiniprogram.CustomEvent) {
    const cityId = String(event.currentTarget.dataset.cityId ?? '');
    if (!CITY_DIRECTORY.some((city) => city.id === cityId)) return;
    void wx.navigateTo({
      url: `/packageEvents/pages/city/index?cityId=${encodeURIComponent(cityId)}`,
    });
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
