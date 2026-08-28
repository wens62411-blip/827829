import type { PublicCardProjection } from '../../shared/types/projections';
import { createShareEntryPage } from '../../shared/utils/placeholder-page';
import {
  getRuntimeEvidence,
  resolveCardShare,
  type IdentityClientFailure,
} from '../card/services/identity-client';
import {
  cityDisplayName,
  normalizeShareReference,
  safeShareTitle,
  sanitizePublicCard,
} from '../card/services/card-presenter';
import { OFFLINE_DEMO_FIELDS, isOfflineDemo } from '../card/services/offline-demo';
import { normalizeCardTheme, type CardTheme } from '../card/services/card-theme-preference';
import {
  createDefaultOfflineDemoDraft,
  type OfflineDemoPublicField,
} from '../card/services/offline-demo-draft';
import {
  buildOfflineDemoSharePath,
  createOfflineDemoShareSnapshot,
  decodeOfflineDemoShareSnapshot,
} from '../card/services/offline-demo-share-snapshot';

type ShareReference = { readonly token: string } | { readonly scene: string };
type ShareState = 'SUCCESS' | 'EXPIRED' | 'REVOKED' | 'ERROR' | 'LOADING';

const frozenShareEntry = createShareEntryPage('名片分享入口', 'CARD');

function stateForFailure(failure: IdentityClientFailure): {
  readonly state: ShareState;
  readonly title: string;
  readonly description: string;
} {
  if (failure.code === 'TOKEN_EXPIRED') {
    return { state: 'EXPIRED', title: '分享已过期', description: '为保护资料，这个入口已停止访问。请联系分享者重新生成。' };
  }
  if (failure.code === 'TOKEN_REVOKED') {
    return { state: 'REVOKED', title: '分享已撤销', description: '分享者已收回这个入口，历史页面不会继续展示名片。' };
  }
  if (failure.code === 'BLOCKED_RELATIONSHIP') {
    return { state: 'ERROR', title: '无法查看名片', description: '根据当前双方关系设置，此名片不再可见。' };
  }
  if (failure.code === 'TOKEN_INVALID' || failure.code === 'NOT_FOUND') {
    return { state: 'ERROR', title: '入口不可用', description: '入口无效或已失效，请让分享者重新生成。' };
  }
  return { state: 'ERROR', title: '暂时无法打开', description: failure.message };
}

Page({
  ...frozenShareEntry,
  shareReference: undefined as ShareReference | undefined,
  shareResolveGeneration: 0,
  shareResolving: false,
  shareUnloaded: false,
  demoForwardPath: '',
  data: {
    ...frozenShareEntry.data,
    runtimeMode: 'OFFLINE_DEMO',
    state: 'LOADING' as ShareState,
    stateTitle: '正在核验分享入口',
    stateDescription: '服务端会重新检查过期、撤销、拉黑、好友关系和认证有效性。',
    allowRetry: true,
    allowForward: false,
    card: null as PublicCardProjection | null,
    cityLabel: '',
    demoMode: false,
    demoFields: [...OFFLINE_DEMO_FIELDS] as OfflineDemoPublicField[],
    demoPublicLabels: [] as string[],
    cardTheme: 'ivory' as CardTheme,
  },

  onLoad(options: Record<string, string | undefined>) {
    this.shareUnloaded = false;
    this.shareReference = undefined;
    this.shareResolveGeneration += 1;
    this.shareResolving = false;
    this.demoForwardPath = '';
    frozenShareEntry.onLoad.call(this, options);
    const runtime = getRuntimeEvidence();
    const cardTheme = normalizeCardTheme(options.theme);
    this.setData({ runtimeMode: runtime.runtimeMode, cardTheme, demoMode: false });
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    if (options.demo === '1') {
      if (!isOfflineDemo(runtime)) {
        this.setData({
          state: 'ERROR',
          stateTitle: '演示入口不可用',
          stateDescription: '当前运行环境不接受演示名片入口，请由名片本人重新生成安全分享。',
          allowRetry: false,
          allowForward: false,
          card: null,
          cityLabel: '',
        });
        return;
      }
      const decoded = options.snapshot === undefined
        ? { ok: true as const, snapshot: createOfflineDemoShareSnapshot(createDefaultOfflineDemoDraft(), cardTheme) }
        : decodeOfflineDemoShareSnapshot(options.snapshot);
      if (!decoded.ok) {
        this.setData({
          state: 'ERROR',
          stateTitle: '体验名片已损坏',
          stateDescription: '这张体验名片的公开快照不完整或被修改，请让分享者重新发送。',
          allowRetry: false,
          allowForward: false,
          demoMode: true,
          card: null,
          demoFields: [],
          demoPublicLabels: [],
          cityLabel: '',
        });
        return;
      }
      const snapshot = decoded.snapshot;
      const forwardPath = options.snapshot === undefined
        ? buildOfflineDemoSharePath(createDefaultOfflineDemoDraft(), snapshot.cardTheme)
        : { ok: true as const, path: `/pages/card-share/index?demo=1&snapshot=${options.snapshot}` };
      this.demoForwardPath = forwardPath.ok ? forwardPath.path : '';
      this.setData({
        state: 'SUCCESS',
        stateTitle: 'AB Club 名片体验',
        stateDescription: '这张名片由体验版真实转发，人物与资料均为合成演示，不代表真实会员、审核或人脉关系。',
        allowRetry: false,
        allowForward: true,
        demoMode: true,
        card: snapshot.card,
        demoFields: [...snapshot.fields],
        demoPublicLabels: [...snapshot.publicLabels],
        cardTheme: snapshot.cardTheme,
        cityLabel: cityDisplayName(snapshot.card.cityId),
      });
      wx.showShareMenu({ menus: ['shareAppMessage'] });
      return;
    }
    const normalized = normalizeShareReference(options);
    if (!normalized.ok) {
      this.setData({
        state: 'ERROR',
        stateTitle: '入口不可用',
        stateDescription: normalized.message,
        allowRetry: false,
        allowForward: false,
        card: null,
        cityLabel: '',
      });
      return;
    }
    this.shareReference = normalized.reference;
    this.setData({
      state: 'LOADING',
      stateTitle: '正在核验分享入口',
      stateDescription: '服务端会重新检查过期、撤销、拉黑、好友关系和认证有效性。',
      allowRetry: true,
      allowForward: false,
      card: null,
      cityLabel: '',
    });
  },

  onShow() {
    if (this.shareReference) void this.resolveShare();
  },

  onUnload() {
    this.shareUnloaded = true;
    this.shareReference = undefined;
    this.demoForwardPath = '';
    this.shareResolveGeneration += 1;
    this.shareResolving = false;
  },

  onPullDownRefresh() {
    void this.resolveShare(true);
  },

  async resolveShare(fromPullDown: boolean = false) {
    const reference = this.shareReference;
    if (!reference || this.shareResolving || this.shareUnloaded) {
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }
    this.shareResolving = true;
    const generation = ++this.shareResolveGeneration;
    const requestIsCurrent = () => (
      !this.shareUnloaded
      && this.shareResolving
      && this.shareResolveGeneration === generation
      && this.shareReference === reference
    );
    this.setData({
      state: 'LOADING',
      stateTitle: '正在重新核验',
      stateDescription: '每次返回页面都会重新检查权限，不沿用旧页面结果。',
      card: null,
      allowForward: false,
    });
    try {
      const result = await resolveCardShare(reference);
      if (!requestIsCurrent()) return;
      if (!result.ok) {
        const failureState = stateForFailure(result);
        this.setData({
          ...failureState,
          allowRetry: result.retryable || result.code === 'TOKEN_INVALID',
          allowForward: false,
        });
        return;
      }
      if (
        result.data.resolution.targetType !== 'CARD' ||
        result.data.resolution.targetId !== result.data.resolution.card.cardId
      ) {
        this.setData({
          state: 'ERROR',
          stateTitle: '入口类型不匹配',
          stateDescription: '这个入口不是数字名片，请返回正确页面重新打开。',
          allowRetry: false,
          allowForward: false,
        });
        return;
      }
      this.setData({
        state: 'SUCCESS',
        stateTitle: '分享入口有效',
        stateDescription: '以下内容是服务端按当前查看关系实时生成的最小公开投影。',
        allowRetry: true,
        allowForward: true,
        card: sanitizePublicCard(result.data.resolution.card),
        cityLabel: cityDisplayName(result.data.resolution.card.cityId),
      });
      wx.showShareMenu({ menus: ['shareAppMessage'] });
    } catch (_error) {
      if (!requestIsCurrent()) return;
      this.setData({
        state: 'ERROR',
        stateTitle: '暂时无法打开',
        stateDescription: '分享入口核验未完成，未展示任何未经核验的名片内容。请稍后重试。',
        allowRetry: true,
        allowForward: false,
      });
    } finally {
      if (this.shareResolveGeneration === generation) {
        this.shareResolving = false;
        if (fromPullDown && !this.shareUnloaded) wx.stopPullDownRefresh();
      }
    }
  },

  handleRetry() {
    void this.resolveShare();
  },

  onShareAppMessage() {
    const card = this.data.card;
    const reference = this.shareReference;
    const themeQuery = this.data.cardTheme === 'ivory'
      ? ''
      : `&theme=${encodeURIComponent(this.data.cardTheme)}`;
    if (!this.shareUnloaded && this.data.demoMode && card && this.data.state === 'SUCCESS') {
      return {
        title: 'AB Club · 数字名片体验',
        path: this.demoForwardPath || `/pages/card-share/index?demo=1${themeQuery}`,
      };
    }
    if (this.shareUnloaded || !reference || !card || this.data.state !== 'SUCCESS') {
      wx.showToast({ title: '当前入口不可转发', icon: 'none' });
      return { title: 'AB Club', path: '/pages/discover/index' };
    }
    const query = 'token' in reference
      ? `token=${encodeURIComponent(reference.token)}`
      : `scene=${encodeURIComponent(reference.scene)}`;
    return {
      title: safeShareTitle(card.displayName),
      path: `/pages/card-share/index?${query}${themeQuery}`,
    };
  },
});
