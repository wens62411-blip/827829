import { RuntimeMode } from '../../../shared/types/enums';
import type { ContentId } from '../../../shared/types/primitives';
import {
  DEMO_ART_CONTENT,
  getDemoContent,
  getDemoCreator,
  listDemoRelatedEvents,
} from '../../data/demo';
import {
  canDisplayImage,
  categoryLabel,
  cityName,
  creatorKindLabel,
  detailRows,
  toRelatedEventView,
  type ArtContentDetail,
  type ArtCreator,
  type DetailRow,
  type RelatedEventView,
} from '../../model';
import {
  getPublicContent,
  getRuntimeEvidence,
  listRelatedEvents,
} from '../../services/content-client';

const WEAK_NETWORK_DELAY_MS = 2500;
let weakNetworkTimer: ReturnType<typeof setTimeout> | undefined;
let requestSerial = 0;
let currentDetailContentId = '';

function clearWeakNetworkTimer(): void {
  if (weakNetworkTimer !== undefined) {
    clearTimeout(weakNetworkTimer);
    weakNetworkTimer = undefined;
  }
}

function platformStatement(content: ArtContentDetail): string {
  if (content.category === 'ANTIQUE') {
    return '平台不提供古董鉴定结论；年代区间、状况说明与第三方报告均仅作资料引用。';
  }
  if (content.category === 'JEWELRY') {
    return '平台不提供珠宝真伪或价值判断；材质声明与报告引用不构成保值、投资或收益承诺。';
  }
  return '平台不提供艺术品真伪鉴定；作者、展览与来源信息均按所列资料呈现。';
}

Page({
  data: {
    runtimeMode: RuntimeMode.OFFLINE_DEMO as string,
    state: 'LOADING' as 'LOADING' | 'READY' | 'ERROR',
    stateTitle: '正在读取内容详情',
    stateDescription: '正在核对公开状态、来源和图片权利。',
    retryable: false,
    weakNetwork: false,
    content: null as ArtContentDetail | null,
    creator: null as ArtCreator | null,
    categoryLabel: '',
    creatorKindLabel: '',
    cityName: '',
    rows: [] as readonly DetailRow[],
    relatedEvents: [] as readonly RelatedEventView[],
    relatedEventsNotice: '',
    heroImageUrl: '',
    heroImageAllowed: false,
    heroImageFailed: false,
    platformStatement: '',
  },

  onLoad(query: { readonly contentId?: string }) {
    const runtime = getRuntimeEvidence();
    currentDetailContentId = query.contentId || (
      runtime.runtimeMode === RuntimeMode.OFFLINE_DEMO ? DEMO_ART_CONTENT[0]?.contentId ?? '' : ''
    );
    this.setData({ runtimeMode: runtime.runtimeMode });
    void this.loadDetail(currentDetailContentId);
  },

  onUnload() {
    requestSerial += 1;
    clearWeakNetworkTimer();
  },

  startWeakNetworkWatch(serial: number) {
    clearWeakNetworkTimer();
    weakNetworkTimer = setTimeout(() => {
      if (serial === requestSerial && this.data.state === 'LOADING') {
        this.setData({ weakNetwork: true });
      }
    }, WEAK_NETWORK_DELAY_MS);
  },

  applyDetail(
    content: ArtContentDetail,
    creator: ArtCreator,
    relatedEvents: readonly RelatedEventView[],
    relatedEventsNotice: string,
  ) {
    const imageAllowed = canDisplayImage(content, 'DETAIL');
    wx.setNavigationBarTitle({ title: categoryLabel(content.category) + '内容详情' });
    this.setData({
      state: 'READY',
      stateTitle: '',
      stateDescription: '',
      retryable: false,
      weakNetwork: false,
      content,
      creator,
      categoryLabel: content.category === 'JEWELRY' && content.jewelry.jewelryKind === 'PEARL'
        ? '珠宝 · 珍珠'
        : categoryLabel(content.category),
      creatorKindLabel: creatorKindLabel(creator.creatorKind),
      cityName: cityName(content.cityId),
      rows: detailRows(content),
      relatedEvents,
      relatedEventsNotice,
      heroImageUrl: imageAllowed ? content.image!.url : '',
      heroImageAllowed: imageAllowed,
      heroImageFailed: false,
      platformStatement: platformStatement(content),
    });
  },

  async loadDetail(contentId: string) {
    const serial = ++requestSerial;
    const runtime = getRuntimeEvidence();
    this.setData({
      runtimeMode: runtime.runtimeMode,
      state: 'LOADING',
      stateTitle: '正在读取内容详情',
      stateDescription: '正在核对公开状态、来源和图片权利。',
      retryable: false,
      weakNetwork: false,
      content: null,
      creator: null,
      relatedEvents: [],
      relatedEventsNotice: '',
    });
    this.startWeakNetworkWatch(serial);

    if (!contentId) {
      clearWeakNetworkTimer();
      this.setData({
        state: 'ERROR',
        stateTitle: '缺少内容标识',
        stateDescription: '请从艺术频道选择一条公开内容。',
        retryable: false,
      });
      return;
    }

    if (runtime.runtimeMode === RuntimeMode.OFFLINE_DEMO) {
      const content = getDemoContent(contentId);
      const creator = content ? getDemoCreator(content.creatorId) : undefined;
      if (serial !== requestSerial) return;
      clearWeakNetworkTimer();
      if (!content || !creator) {
        this.setData({
          state: 'ERROR',
          stateTitle: '演示内容不存在',
          stateDescription: '该标识不在脱敏 DEMO_ONLY fixture 中。',
          retryable: false,
          weakNetwork: false,
        });
        return;
      }
      this.applyDetail(
        content,
        creator,
        listDemoRelatedEvents(contentId).map(toRelatedEventView),
        '相关活动同为 SYNTHETIC / DEMO_ONLY，不代表真实排期。',
      );
      return;
    }

    if (runtime.runtimeMode !== RuntimeMode.LIVE || !runtime.cloudConfigured) {
      if (serial !== requestSerial) return;
      clearWeakNetworkTimer();
      this.setData({
        state: 'ERROR',
        stateTitle: '内容服务尚未连接',
        stateDescription: '当前运行模式无法读取正式详情；不会使用演示记录替代。',
        retryable: false,
        weakNetwork: false,
      });
      return;
    }

    const id = contentId as ContentId;
    const [detailResult, eventsResult] = await Promise.all([
      getPublicContent(id),
      listRelatedEvents(id),
    ]);
    if (serial !== requestSerial) return;
    clearWeakNetworkTimer();

    if (!detailResult.ok) {
      this.setData({
        state: 'ERROR',
        stateTitle: '暂时无法读取内容详情',
        stateDescription: detailResult.message,
        retryable: detailResult.retryable,
        weakNetwork: false,
      });
      return;
    }

    this.applyDetail(
      detailResult.data.content,
      detailResult.data.creator,
      eventsResult.ok ? eventsResult.data.events.map(toRelatedEventView) : [],
      eventsResult.ok ? '' : '相关活动暂不可用；内容详情仍可阅读。',
    );
  },

  handleHeroImageError() {
    this.setData({ heroImageAllowed: false, heroImageFailed: true });
  },

  handleSourceCopy(event: WechatMiniprogram.CustomEvent<{ sourceUrl: string }>) {
    if (!event.detail.sourceUrl) return;
    wx.setClipboardData({ data: event.detail.sourceUrl });
  },

  handleIntentCreate() {
    const contentId = this.data.content?.contentId;
    if (!contentId) return;
    wx.navigateTo({ url: `/packageArt/pages/intent/index?contentId=${encodeURIComponent(contentId)}` });
  },

  handleRelatedEventTap(event: WechatMiniprogram.TouchEvent) {
    const eventId = String(event.currentTarget.dataset.eventId ?? '');
    if (!eventId) return;
    wx.navigateTo({ url: `/packageEvents/pages/event/index?eventId=${encodeURIComponent(eventId)}` });
  },

  handleRetry() {
    void this.loadDetail(currentDetailContentId);
  },
});
