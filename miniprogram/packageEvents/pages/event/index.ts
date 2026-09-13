import { CITY_DIRECTORY } from '../../../shared/constants/geography';
import { LOCAL_RUNTIME } from '../../../shared/services/runtime';
import { RecordOrigin, RuntimeMode, VerificationState } from '../../../shared/types/enums';
import type { EventId } from '../../../shared/types/primitives';
import type { PublicEventProjection } from '../../../shared/types/projections';
import { createRequestId } from '../../../shared/utils/request-id';
import { getEventCloudClient } from '../../../components/ab-event-card/cloud-client-loader';
import {
  getDemoEventByCityId,
  getDemoEventById,
} from '../../../components/ab-event-card/demo-data';
import type { DemoEventPresentation } from '../../../components/ab-event-card/demo-data';

interface EventDetailView {
  readonly displayId: string;
  readonly displayIdLabel: string;
  readonly title: string;
  readonly summary: string;
  readonly cityName: string;
  readonly cityNameEn: string;
  readonly imageSrc: string;
  readonly imageAlt: string;
  readonly imageCredit: string;
  readonly evidenceLabel: string;
  readonly stateLabel: string;
  readonly sourceLabel: string;
  readonly localTimeLabel: string;
  readonly timezone: string;
  readonly phaseBoundaryLabel: string;
  readonly categoryLabel: string;
  readonly sectionLabel: string;
}

function decodeRouteParam(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

const DEMO_COVERS: Readonly<Record<string, { src: string; alt: string; credit: string }>> = {
  'demo:discover:zurich-private-collection': {
    src: '/assets/editorial-events/jewelry-study.jpg',
    alt: '珠宝博物馆展厅与陈列柜，用于收藏交流方向视觉参考',
    credit: 'Hannolans · CC BY 4.0',
  },
  'demo:discover:shanghai-brand-art-dinner': {
    src: '/assets/editorial-events/private-table.jpg',
    alt: '布置完成的餐桌与餐具，用于小型餐叙方向视觉参考',
    credit: 'Shixart1985 · CC BY 2.0',
  },
  'demo:discover:singapore-founders-night': {
    src: '/assets/editorial-events/gallery-salon.jpg',
    alt: '光线柔和的美术馆展厅，用于城市交流方向视觉参考',
    credit: 'Tourbillon · CC BY-SA 3.0',
  },
};

function toDemoDetail(event: DemoEventPresentation): EventDetailView {
  const cover = DEMO_COVERS[event.eventId];
  return {
    displayId: event.eventId,
    displayIdLabel: '活动方向',
    title: event.title,
    summary: event.summary,
    cityName: event.cityName,
    cityNameEn: event.cityNameEn,
    imageSrc: event.imageSrc ?? cover?.src ?? '',
    imageAlt: event.imageAlt ?? cover?.alt ?? '活动方向视觉参考待补充',
    imageCredit: event.imageCredit ?? cover?.credit ?? '图片归属待补充',
    evidenceLabel: '活动方向',
    stateLabel: '筹备中 · 报名尚未开放',
    sourceLabel: 'AB Club 策展构想',
    localTimeLabel: '日期与场地待确认',
    timezone: event.timezone,
    phaseBoundaryLabel: '第一阶段只作信息预览，不开放活动报名、支付、签到、商户入驻或交易。',
    categoryLabel: event.categoryLabel ?? '城市策展',
    sectionLabel: event.sectionLabel ?? '策展方向',
  };
}

function formatEventRange(event: PublicEventProjection): string {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '时间格式待确认';
  try {
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: event.timezone,
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${formatter.format(start)} — ${formatter.format(end)}`;
  } catch {
    return '时间格式待确认';
  }
}

function toLiveDetail(event: PublicEventProjection): EventDetailView {
  const city = CITY_DIRECTORY.find((item) => item.id === event.cityId);
  const humanReviewed = event.verificationState === VerificationState.HUMAN_REVIEWED;
  const realRecord = event.origin === RecordOrigin.REAL;
  return {
    displayId: event.eventId,
    displayIdLabel: event.eventId,
    title: event.title,
    summary: event.summary,
    cityName: city?.name.zh ?? '城市待确认',
    cityNameEn: city?.name.en ?? '',
    imageSrc: '',
    imageAlt: event.coverAssetId
      ? '活动独立封面尚未完成媒体权利解析，因此暂不展示'
      : '该公开活动尚未提供独立封面',
    imageCredit: '',
    evidenceLabel: realRecord && humanReviewed ? '已人工核验' : '待核验',
    stateLabel: event.state === 'COMPLETED' ? '已结束' : event.state === 'PAUSED' ? '已暂停' : '公开信息',
    sourceLabel: realRecord ? '公开活动资料' : '示例活动',
    localTimeLabel: formatEventRange(event),
    timezone: event.timezone,
    phaseBoundaryLabel: '第一阶段仍只作公开信息展示；报名、支付与签到入口不会在本客户端开放。',
    categoryLabel: '公开活动',
    sectionLabel: '正式信息',
  };
}

const FIRST_DEMO = getDemoEventByCityId(CITY_DIRECTORY[0].id);
if (!FIRST_DEMO) throw new Error('Frozen city directory must provide a demo detail seed.');
const EMPTY_DETAIL: EventDetailView = {
  ...toDemoDetail(FIRST_DEMO),
  displayId: '',
  displayIdLabel: '',
  title: '',
  summary: '',
  evidenceLabel: '',
};

Page({
  data: {
    runtimeMode: LOCAL_RUNTIME.mode as string,
    loading: false,
    hasDetail: false,
    detail: EMPTY_DETAIL,
    stateKind: 'EMPTY',
    stateTitle: '请选择可公开活动',
    stateDescription: '当前没有活动方向详情可展示。',
    stateDetail: '',
    imageFailed: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    const demoEventId = decodeRouteParam(query.demoEventId);
    const demoCityId = decodeRouteParam(query.demoCityId);
    const eventId = decodeRouteParam(query.eventId);
    const demoEvent = demoEventId ? getDemoEventById(demoEventId) : undefined;
    const demoCityEvent = demoCityId ? getDemoEventByCityId(demoCityId) : undefined;
    const demo = demoEvent ?? demoCityEvent ?? (query.demo === '1' ? FIRST_DEMO : undefined);
    if (demo) {
      this.setData({ hasDetail: true, detail: toDemoDetail(demo), imageFailed: false });
      return;
    }
    if (query.demoEventId || query.demoCityId) {
      this.setData({
        stateKind: 'EMPTY',
        stateTitle: '活动暂不可用',
        stateDescription: '请返回活动页重新选择。',
        stateDetail: '',
      });
      return;
    }
    if (eventId) void this.loadEvent(eventId as EventId);
  },

  async loadEvent(eventId: EventId) {
    if (!LOCAL_RUNTIME.cloudEnvironmentConfigured) {
      this.setData({
        stateKind: 'OFFLINE',
        stateTitle: '活动详情暂不可用',
        stateDescription: '请返回活动页浏览其他内容。',
        stateDetail: '',
      });
      return;
    }
    const { callCloudAction } = getEventCloudClient();
    this.setData({ loading: true, hasDetail: false });
    try {
      const result = await callCloudAction('event.get', createRequestId(), {
        contractVersion: '1.0.0',
        eventId,
      });
      if (!result.apiResult.ok) {
        this.showFailure(result.apiResult.error.message);
        return;
      }
      this.setData({
        runtimeMode: RuntimeMode.LIVE,
        loading: false,
        hasDetail: true,
        detail: toLiveDetail(result.apiResult.data.event),
        imageFailed: false,
      });
    } catch {
      this.showFailure('无法连接活动服务，请稍后重试。');
    }
  },

  showFailure(message: string) {
    this.setData({
      runtimeMode: RuntimeMode.DEGRADED,
      loading: false,
      hasDetail: false,
      stateKind: 'ERROR',
      stateTitle: '活动详情不可用',
      stateDescription: message,
      stateDetail: '',
    });
  },

  onImageError() {
    this.setData({ imageFailed: true });
  },

  backToEvents() {
    if (getCurrentPages().length > 1) {
      void wx.navigateBack();
      return;
    }
    void wx.switchTab({ url: '/pages/events/index' });
  },
});
