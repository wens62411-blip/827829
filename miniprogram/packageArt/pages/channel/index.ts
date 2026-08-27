import type { PaginationCursor } from '../../../shared/types/primitives';
import { RuntimeMode } from '../../../shared/types/enums';
import { listDemoCollections, listDemoContent } from '../../data/demo';
import {
  CATEGORY_TABS,
  categoryLabel,
  normalizeCategory,
  toCardView,
  type ArtCategory,
  type ArtCategoryFilter,
  type ArtCardView,
} from '../../model';
import {
  getRuntimeEvidence,
  listPublicCollections,
  listPublicContent,
} from '../../services/content-client';

interface CollectionView {
  readonly collectionId: string;
  readonly titleZh: string;
  readonly titleEn: string;
  readonly summary: string;
  readonly categoryLabel: string;
  readonly evidenceScope: string;
}

const WEAK_NETWORK_DELAY_MS = 2500;
let weakNetworkTimer: ReturnType<typeof setTimeout> | undefined;
let requestSerial = 0;

function clearWeakNetworkTimer(): void {
  if (weakNetworkTimer !== undefined) {
    clearTimeout(weakNetworkTimer);
    weakNetworkTimer = undefined;
  }
}

function asCategory(category: ArtCategoryFilter): ArtCategory | undefined {
  return category === 'ALL' ? undefined : category;
}

function collectionView(collection: {
  readonly collectionId: string;
  readonly title: { readonly zh: string; readonly en: string };
  readonly summary: string;
  readonly categories?: readonly ArtCategory[];
  readonly evidenceScope?: string;
}, fallbackCategory: ArtCategoryFilter): CollectionView {
  const category = collection.categories?.[0] ?? asCategory(fallbackCategory);
  return {
    collectionId: collection.collectionId,
    titleZh: collection.title.zh,
    titleEn: collection.title.en,
    summary: collection.summary,
    categoryLabel: category === undefined ? '策展选集' : categoryLabel(category),
    evidenceScope: collection.evidenceScope ?? 'PUBLIC',
  };
}

Page({
  data: {
    runtimeMode: RuntimeMode.OFFLINE_DEMO as string,
    selectedCategory: 'ALL' as ArtCategoryFilter,
    categoryTabs: CATEGORY_TABS,
    state: 'LOADING' as 'LOADING' | 'READY' | 'EMPTY' | 'ERROR',
    stateTitle: '正在读取艺术频道',
    stateDescription: '正在获取允许公开展示的内容与策展选集。',
    retryable: false,
    weakNetwork: false,
    cards: [] as readonly ArtCardView[],
    collections: [] as readonly CollectionView[],
    collectionNotice: '',
    hasMore: false,
    nextCursor: '',
    loadingMore: false,
    paginationError: '',
  },

  onLoad(query: { readonly category?: string }) {
    const selectedCategory = normalizeCategory(query.category);
    this.setData({ selectedCategory });
    void this.loadChannel(selectedCategory);
  },

  onUnload() {
    requestSerial += 1;
    clearWeakNetworkTimer();
  },

  async onPullDownRefresh() {
    await this.loadChannel(this.data.selectedCategory);
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    void this.loadMore();
  },

  startWeakNetworkWatch(serial: number) {
    clearWeakNetworkTimer();
    weakNetworkTimer = setTimeout(() => {
      if (serial === requestSerial && this.data.state === 'LOADING') {
        this.setData({ weakNetwork: true });
      }
    }, WEAK_NETWORK_DELAY_MS);
  },

  async loadChannel(selectedCategory: ArtCategoryFilter) {
    const serial = ++requestSerial;
    const runtime = getRuntimeEvidence();
    this.setData({
      runtimeMode: runtime.runtimeMode,
      state: 'LOADING',
      stateTitle: '正在读取艺术频道',
      stateDescription: '正在获取允许公开展示的内容与策展选集。',
      retryable: false,
      weakNetwork: false,
      cards: [],
      collections: [],
      collectionNotice: '',
      hasMore: false,
      nextCursor: '',
      paginationError: '',
    });
    this.startWeakNetworkWatch(serial);

    if (runtime.runtimeMode === RuntimeMode.OFFLINE_DEMO) {
      const items = listDemoContent(selectedCategory);
      const collections = listDemoCollections(selectedCategory);
      if (serial !== requestSerial) return;
      clearWeakNetworkTimer();
      this.setData({
        state: items.length === 0 ? 'EMPTY' : 'READY',
        stateTitle: items.length === 0 ? '此分类暂无演示内容' : '',
        stateDescription: items.length === 0
          ? '当前是明确标识的 OFFLINE_DEMO，不会用其他分类内容填充空列表。'
          : '',
        retryable: false,
        weakNetwork: false,
        cards: items.map(toCardView),
        collections: collections.map((item) => collectionView(item, selectedCategory)),
      });
      return;
    }

    if (runtime.runtimeMode !== RuntimeMode.LIVE || !runtime.cloudConfigured) {
      if (serial !== requestSerial) return;
      clearWeakNetworkTimer();
      this.setData({
        state: 'ERROR',
        stateTitle: '内容服务尚未连接',
        stateDescription: '当前运行模式不允许读取正式内容；不会回退到合成数据。',
        retryable: false,
        weakNetwork: false,
      });
      return;
    }

    const category = asCategory(selectedCategory);
    const [contentResult, collectionsResult] = await Promise.all([
      listPublicContent({ ...(category === undefined ? {} : { category }) }),
      listPublicCollections(category),
    ]);
    if (serial !== requestSerial) return;
    clearWeakNetworkTimer();

    if (!contentResult.ok) {
      this.setData({
        state: 'ERROR',
        stateTitle: '暂时无法读取公开内容',
        stateDescription: contentResult.message,
        retryable: contentResult.retryable,
        weakNetwork: false,
      });
      return;
    }

    const cards = contentResult.data.items.map(toCardView);
    this.setData({
      state: cards.length === 0 ? 'EMPTY' : 'READY',
      stateTitle: cards.length === 0 ? '此分类暂时没有公开内容' : '',
      stateDescription: cards.length === 0 ? '仅展示服务端判定为 PUBLISHED 且允许公开的记录。' : '',
      retryable: cards.length === 0,
      weakNetwork: false,
      cards,
      collections: collectionsResult.ok
        ? collectionsResult.data.map((item) => collectionView(item, selectedCategory))
        : [],
      collectionNotice: collectionsResult.ok ? '' : '策展选集暂不可用，内容列表仍可阅读。',
      hasMore: contentResult.data.hasMore,
      nextCursor: contentResult.data.nextCursor ?? '',
    });
  },

  async loadMore() {
    if (
      this.data.runtimeMode !== RuntimeMode.LIVE ||
      this.data.state !== 'READY' ||
      !this.data.hasMore ||
      this.data.loadingMore ||
      !this.data.nextCursor
    ) return;

    this.setData({ loadingMore: true, paginationError: '' });
    const category = asCategory(this.data.selectedCategory);
    const result = await listPublicContent({
      ...(category === undefined ? {} : { category }),
      cursor: this.data.nextCursor as PaginationCursor,
    });
    if (!result.ok) {
      this.setData({ loadingMore: false, paginationError: result.message });
      return;
    }
    this.setData({
      cards: [...this.data.cards, ...result.data.items.map(toCardView)],
      hasMore: result.data.hasMore,
      nextCursor: result.data.nextCursor ?? '',
      loadingMore: false,
    });
  },

  handleCategoryTap(event: WechatMiniprogram.TouchEvent) {
    const selectedCategory = normalizeCategory(String(event.currentTarget.dataset.category ?? 'ALL'));
    if (selectedCategory === this.data.selectedCategory && this.data.state !== 'ERROR') return;
    this.setData({ selectedCategory });
    void this.loadChannel(selectedCategory);
  },

  handleCardSelect(event: WechatMiniprogram.CustomEvent<{ contentId: string }>) {
    const contentId = event.detail.contentId;
    if (!contentId) return;
    wx.navigateTo({ url: `/packageArt/pages/detail/index?contentId=${encodeURIComponent(contentId)}` });
  },

  handleRetry() {
    void this.loadChannel(this.data.selectedCategory);
  },
});
