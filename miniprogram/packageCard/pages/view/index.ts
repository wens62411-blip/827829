import type { UserId } from '../../../shared/types/primitives';
import type { PublicCardProjection } from '../../../shared/types/projections';
import {
  getCardForViewer,
  getMyCard,
  getRuntimeEvidence,
} from '../../../pages/card/services/identity-client';
import {
  cityDisplayName,
  sanitizePublicCard,
  viewerModeFromRelationship,
  type CardViewerMode,
} from '../../../pages/card/services/card-presenter';
import { OFFLINE_DEMO_CARD, OFFLINE_DEMO_FIELDS, isOfflineDemo } from '../../../pages/card/services/offline-demo';

let viewedOwnerUserId: UserId | undefined;

function parseOwnerUserId(value: string | undefined): UserId | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(normalized)) return undefined;
  return normalized as UserId;
}

Page({
  data: {
    runtimeMode: 'OFFLINE_DEMO',
    demoMode: false,
    demoFields: OFFLINE_DEMO_FIELDS,
    card: null as PublicCardProjection | null,
    viewerMode: 'SELF' as CardViewerMode,
    status: 'IDLE' as 'IDLE' | 'LOADING' | 'READY' | 'ERROR',
    message: '',
    invalidOwner: false,
    cityLabel: '',
  },

  onLoad(options: Record<string, string | undefined>) {
    const runtime = getRuntimeEvidence();
    const demoMode = isOfflineDemo(runtime);
    this.setData({ runtimeMode: runtime.runtimeMode, demoMode });
    if (options.ownerUserId !== undefined) {
      viewedOwnerUserId = parseOwnerUserId(options.ownerUserId);
      if (!viewedOwnerUserId) {
        this.setData({
          invalidOwner: true,
          status: 'ERROR',
          message: '名片查看参数无效，请从可信入口重新打开。',
        });
      }
    } else {
      viewedOwnerUserId = undefined;
    }
  },

  onShow() {
    if (!this.data.invalidOwner) void this.loadCard();
  },

  onUnload() {
    viewedOwnerUserId = undefined;
  },

  onPullDownRefresh() {
    void this.loadCard(true);
  },

  async loadCard(fromPullDown: boolean = false) {
    if (this.data.invalidOwner || this.data.status === 'LOADING') {
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }
    if (this.data.demoMode && !viewedOwnerUserId) {
      this.setData({
        status: 'READY',
        card: OFFLINE_DEMO_CARD,
        cityLabel: cityDisplayName(OFFLINE_DEMO_CARD.cityId),
        viewerMode: 'SELF',
        message: 'SYNTHETIC · DEMO_ONLY',
      });
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }
    this.setData({ status: 'LOADING', message: '', card: null });
    if (!viewedOwnerUserId) {
      const result = await getMyCard();
      if (!result.ok) {
        this.setData({ status: 'ERROR', message: result.message });
      } else {
        this.setData({
          status: 'READY',
          card: sanitizePublicCard(result.data.card),
          cityLabel: cityDisplayName(result.data.card.cityId),
          viewerMode: 'SELF',
        });
      }
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }

    const result = await getCardForViewer(viewedOwnerUserId);
    if (!result.ok) {
      this.setData({
        status: 'ERROR',
        message: result.code === 'BLOCKED_RELATIONSHIP'
          ? '根据当前双方关系设置，这张名片不可查看。'
          : result.message,
      });
    } else if (
      result.data.card.ownerUserId !== viewedOwnerUserId ||
      result.data.relationship.subjectUserId !== viewedOwnerUserId
    ) {
      this.setData({ status: 'ERROR', message: '服务返回的名片身份不匹配，请重新打开可信入口。' });
    } else {
      this.setData({
        status: 'READY',
        card: sanitizePublicCard(result.data.card, result.data.claims),
        cityLabel: cityDisplayName(result.data.card.cityId),
        viewerMode: viewerModeFromRelationship(result.data.relationship),
      });
    }
    if (fromPullDown) wx.stopPullDownRefresh();
  },
});
