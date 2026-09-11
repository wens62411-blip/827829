import type { PublicCardProjection } from '../../shared/types/projections';
import { createShareEntryPage } from '../../shared/utils/placeholder-page';
import {
  getMyCard,
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
import { hasLocalIdentity } from '../card/services/local-identity';
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
import { prepareNativeShareCardCover } from '../card/services/native-share-card';

type ShareReference = { readonly token: string } | { readonly scene: string };
type ShareState = 'SUCCESS' | 'EXPIRED' | 'REVOKED' | 'ERROR' | 'LOADING';
type SelfCardState = 'CHECKING' | 'HAS_CARD' | 'NO_CARD' | 'UNKNOWN';

const frozenShareEntry = createShareEntryPage('名片分享入口', 'CARD');
const DEFAULT_VISITOR_TITLE = 'AB Club 数字名片';
const SAFE_VISITOR_SHARE_COVER = '/assets/brand/ab-club-brand-share.jpg';

function compactDisplayName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return Array.from(value.trim()).slice(0, 24).join('');
}

function visitorTitleForCard(card: PublicCardProjection | null | undefined): string {
  const displayName = compactDisplayName(card?.displayName);
  return displayName ? `${displayName} 的数字名片` : DEFAULT_VISITOR_TITLE;
}

function setNavigationTitle(title: string): void {
  if (typeof wx.setNavigationBarTitle !== 'function') return;
  wx.setNavigationBarTitle({ title: Array.from(title).slice(0, 20).join('') });
}

function localAccountIsReady(): boolean {
  return hasLocalIdentity();
}

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
  selfCardCheckGeneration: 0,
  demoForwardPath: '',
  shareCoverPath: '',
  shareCoverGeneration: 0,
  data: {
    ...frozenShareEntry.data,
    runtimeMode: 'OFFLINE_DEMO',
    state: 'LOADING' as ShareState,
    stateTitle: '正在核验分享入口',
    stateDescription: '正在检查入口状态与当前可见范围。',
    allowRetry: true,
    allowForward: false,
    card: null as PublicCardProjection | null,
    cityLabel: '',
    demoMode: false,
    localIdentityMode: false,
    demoFields: [...OFFLINE_DEMO_FIELDS] as OfflineDemoPublicField[],
    demoPublicLabels: [] as string[],
    cardTheme: 'ivory' as CardTheme,
    visitorTitle: DEFAULT_VISITOR_TITLE,
    localAccountReady: false,
    selfCardState: 'CHECKING' as SelfCardState,
  },

  onLoad(options: Record<string, string | undefined>) {
    this.shareUnloaded = false;
    this.shareReference = undefined;
    this.shareResolveGeneration += 1;
    this.shareResolving = false;
    this.selfCardCheckGeneration += 1;
    this.demoForwardPath = '';
    this.shareCoverPath = '';
    this.shareCoverGeneration += 1;
    frozenShareEntry.onLoad.call(this, options);
    const runtime = getRuntimeEvidence();
    const cardTheme = normalizeCardTheme(options.theme);
    this.setData({
      runtimeMode: runtime.runtimeMode,
      cardTheme,
      demoMode: false,
      localIdentityMode: false,
      demoFields: [],
      demoPublicLabels: [],
      visitorTitle: DEFAULT_VISITOR_TITLE,
      localAccountReady: localAccountIsReady(),
      selfCardState: isOfflineDemo(runtime)
        ? (localAccountIsReady() ? 'HAS_CARD' : 'NO_CARD')
        : 'CHECKING',
    });
    setNavigationTitle(DEFAULT_VISITOR_TITLE);
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    if ([options.local === '1', options.demo === '1', Boolean(options.token), Boolean(options.scene)].filter(Boolean).length > 1) {
      this.setData({ state: 'ERROR', stateTitle: '入口不可用', stateDescription: '分享入口参数冲突，请让分享者重新发送。', allowRetry: false, allowForward: false, card: null, cityLabel: '' });
      return;
    }
    if (options.local === '1') {
      if (!isOfflineDemo(runtime)) {
        this.setData({
          state: 'ERROR',
          stateTitle: '离线名片入口不可用',
          stateDescription: '当前运行环境不接受该离线入口，请让分享者重新发送。',
          allowRetry: false,
          allowForward: false,
          card: null,
          cityLabel: '',
        });
        return;
      }
      const decoded = decodeOfflineDemoShareSnapshot(options.snapshot);
      if (!decoded.ok || decoded.snapshot.source !== 'LOCAL') {
        this.setData({
          state: 'ERROR',
          stateTitle: '名片内容无法读取',
          stateDescription: '这张名片的公开快照不完整、类型不符或被修改，请让分享者重新发送。',
          allowRetry: false,
          allowForward: false,
          localIdentityMode: true,
          card: null,
          demoFields: [],
          demoPublicLabels: [],
          cityLabel: '',
        });
        return;
      }
      const snapshot = decoded.snapshot;
      const visitorTitle = visitorTitleForCard(snapshot.card);
      this.demoForwardPath = `/pages/card-share/index?local=1&snapshot=${options.snapshot}`;
      this.setData({
        state: 'SUCCESS',
        stateTitle: visitorTitle,
        stateDescription: '以下资料由分享者填写并选择公开，尚未经过平台认证。',
        allowRetry: false,
        allowForward: true,
        localIdentityMode: true,
        card: snapshot.card,
        demoFields: [...snapshot.fields],
        demoPublicLabels: [...snapshot.publicLabels],
        cardTheme: snapshot.cardTheme,
        cityLabel: cityDisplayName(snapshot.card.cityId),
        visitorTitle,
      });
      setNavigationTitle(visitorTitle);
      void this.prepareVisitorShareCover();
      wx.showShareMenu({ menus: ['shareAppMessage'] });
      return;
    }
    if (options.demo === '1') {
      if (!isOfflineDemo(runtime)) {
        this.setData({
          state: 'ERROR',
          stateTitle: '示例入口不可用',
          stateDescription: '当前运行环境不接受示例名片入口，请由名片本人重新生成安全分享。',
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
      if (!decoded.ok || decoded.snapshot.source !== 'DEMO') {
        this.setData({
          state: 'ERROR',
          stateTitle: '示例名片已损坏',
          stateDescription: '这张示例名片的公开快照不完整或被修改，请让分享者重新发送。',
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
      const visitorTitle = visitorTitleForCard(snapshot.card);
      const forwardPath = options.snapshot === undefined
        ? buildOfflineDemoSharePath(createDefaultOfflineDemoDraft(), snapshot.cardTheme)
        : { ok: true as const, path: `/pages/card-share/index?demo=1&snapshot=${options.snapshot}` };
      this.demoForwardPath = forwardPath.ok ? forwardPath.path : '';
      this.setData({
        state: 'SUCCESS',
        stateTitle: visitorTitle,
        stateDescription: '这张名片来自本机预览，人物与资料均为合成示例，不代表真实会员或审核状态。',
        allowRetry: false,
        allowForward: true,
        demoMode: true,
        card: snapshot.card,
        demoFields: [...snapshot.fields],
        demoPublicLabels: [...snapshot.publicLabels],
        cardTheme: snapshot.cardTheme,
        cityLabel: cityDisplayName(snapshot.card.cityId),
        visitorTitle,
      });
      setNavigationTitle(visitorTitle);
      void this.prepareVisitorShareCover();
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
      stateDescription: '正在检查入口状态与当前可见范围。',
      allowRetry: true,
      allowForward: false,
      card: null,
      cityLabel: '',
    });
  },

  onShow() {
    void this.refreshSelfCardState();
    if (this.shareReference) void this.resolveShare();
  },

  onUnload() {
    this.shareUnloaded = true;
    this.shareReference = undefined;
    this.demoForwardPath = '';
    this.shareCoverPath = '';
    this.shareCoverGeneration += 1;
    this.shareResolveGeneration += 1;
    this.selfCardCheckGeneration += 1;
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
    this.shareCoverPath = '';
    this.shareCoverGeneration += 1;
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
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
      cityLabel: '',
      visitorTitle: DEFAULT_VISITOR_TITLE,
      allowForward: false,
    });
    setNavigationTitle(DEFAULT_VISITOR_TITLE);
    try {
      const result = await resolveCardShare(reference);
      if (!requestIsCurrent()) return;
      if (!result.ok) {
        const failureState = stateForFailure(result);
        this.setData({
          state: failureState.state,
          stateTitle: failureState.title,
          stateDescription: failureState.description,
          allowRetry: result.retryable || result.code === 'TOKEN_INVALID',
          allowForward: false,
          card: null,
          cityLabel: '',
          visitorTitle: DEFAULT_VISITOR_TITLE,
        });
        setNavigationTitle(DEFAULT_VISITOR_TITLE);
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
          card: null,
          cityLabel: '',
          visitorTitle: DEFAULT_VISITOR_TITLE,
        });
        setNavigationTitle(DEFAULT_VISITOR_TITLE);
        return;
      }
      const card = sanitizePublicCard(result.data.resolution.card);
      const visitorTitle = visitorTitleForCard(card);
      this.setData({
        state: 'SUCCESS',
        stateTitle: visitorTitle,
        stateDescription: '以下是分享者选择向你展示的名片资料。',
        allowRetry: true,
        allowForward: true,
        card,
        cityLabel: cityDisplayName(card.cityId),
        visitorTitle,
      });
      setNavigationTitle(visitorTitle);
      void this.prepareVisitorShareCover();
      wx.showShareMenu({ menus: ['shareAppMessage'] });
    } catch (_error) {
      if (!requestIsCurrent()) return;
      this.setData({
        state: 'ERROR',
        stateTitle: '暂时无法打开',
        stateDescription: '分享入口核验未完成，未展示任何未经核验的名片内容。请稍后重试。',
        allowRetry: true,
        allowForward: false,
        card: null,
        cityLabel: '',
        visitorTitle: DEFAULT_VISITOR_TITLE,
      });
      setNavigationTitle(DEFAULT_VISITOR_TITLE);
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

  async prepareVisitorShareCover() {
    const card = this.data.card;
    if (!card || this.data.state !== 'SUCCESS') return;
    const generation = ++this.shareCoverGeneration;
    const image = await prepareNativeShareCardCover(this, {
      displayName: card.displayName,
      headline: card.headline,
      biography: card.biography,
      labels: (this.data.demoMode || this.data.localIdentityMode) ? this.data.demoPublicLabels : card.claims.map((claim) => claim.labelText.zh),
      phone: (this.data.demoMode || this.data.localIdentityMode) ? this.data.demoFields.find((field) => field.key === 'phone')?.value : '',
      email: (this.data.demoMode || this.data.localIdentityMode) ? this.data.demoFields.find((field) => field.key === 'email')?.value : '',
      demoMode: this.data.demoMode,
    });
    if (!this.shareUnloaded && generation === this.shareCoverGeneration && this.data.card === card) this.shareCoverPath = image || '';
  },

  async refreshSelfCardState() {
    if (this.data.runtimeMode === 'OFFLINE_DEMO') {
      const localAccountReady = localAccountIsReady();
      this.setData({
        localAccountReady,
        selfCardState: localAccountReady ? 'HAS_CARD' : 'NO_CARD',
      });
      return;
    }
    const generation = ++this.selfCardCheckGeneration;
    this.setData({ selfCardState: 'CHECKING' });
    try {
      const result = await getMyCard();
      if (this.shareUnloaded || generation !== this.selfCardCheckGeneration) return;
      if (result.ok) {
        this.setData({ localAccountReady: true, selfCardState: 'HAS_CARD' });
        return;
      }
      if (result.code === 'NOT_FOUND') {
        this.setData({ localAccountReady: false, selfCardState: 'NO_CARD' });
        return;
      }
      this.setData({ localAccountReady: false, selfCardState: 'UNKNOWN' });
    } catch (_error) {
      if (!this.shareUnloaded && generation === this.selfCardCheckGeneration) {
        this.setData({ localAccountReady: false, selfCardState: 'UNKNOWN' });
      }
    }
  },

  openMyCardEntry() {
    const offline = this.data.runtimeMode === 'OFFLINE_DEMO';
    const localAccountReady = offline ? localAccountIsReady() : this.data.selfCardState === 'HAS_CARD';
    if (offline && localAccountReady !== this.data.localAccountReady) {
      this.setData({
        localAccountReady,
        selfCardState: localAccountReady ? 'HAS_CARD' : 'NO_CARD',
      });
    }
    const url = localAccountReady
      ? '/pages/card/index'
      : `/packageCard/pages/edit/index${offline ? '?register=1' : ''}`;
    wx.navigateTo({
      url,
      fail: () => wx.showToast({ title: '暂时无法打开，请稍后再试', icon: 'none' }),
    });
  },

  onShareAppMessage() {
    const card = this.data.card;
    const reference = this.shareReference;
    const themeQuery = this.data.cardTheme === 'ivory'
      ? ''
      : `&theme=${encodeURIComponent(this.data.cardTheme)}`;
    if (
      !this.shareUnloaded
      && (this.data.demoMode || this.data.localIdentityMode)
      && card
      && this.data.state === 'SUCCESS'
    ) {
      return {
        title: safeShareTitle(card.displayName),
        path: this.demoForwardPath || `/pages/card-share/index?demo=1${themeQuery}`,
        imageUrl: this.shareCoverPath || SAFE_VISITOR_SHARE_COVER,
      };
    }
    if (this.shareUnloaded || !reference || !card || this.data.state !== 'SUCCESS') {
      wx.showToast({ title: '当前入口不可转发', icon: 'none' });
      return {
        title: 'AB Club 数字名片',
        path: '/pages/card-share/index?invalid=1',
        imageUrl: SAFE_VISITOR_SHARE_COVER,
      };
    }
    const query = 'token' in reference
      ? `token=${encodeURIComponent(reference.token)}`
      : `scene=${encodeURIComponent(reference.scene)}`;
    return {
      title: safeShareTitle(card.displayName),
      path: `/pages/card-share/index?${query}${themeQuery}`,
      imageUrl: this.shareCoverPath || SAFE_VISITOR_SHARE_COVER,
    };
  },
});
