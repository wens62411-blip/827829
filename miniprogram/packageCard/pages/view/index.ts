import type { UserId } from '../../../shared/types/primitives';
import type { ShareTokenId, UtcInstant } from '../../../shared/types/primitives';
import type { PublicCardProjection } from '../../../shared/types/projections';
import {
  cityDisplayName,
  isSafeShareBearer,
  safeShareTitle,
  shareExpiry,
  sanitizePublicCard,
  viewerModeFromRelationship,
  type CardViewerMode,
} from '../../../pages/card/services/card-presenter';
import { OFFLINE_DEMO_FIELDS, isOfflineDemo } from '../../../pages/card/services/offline-demo';
import { readCardThemePreference, type CardTheme } from '../../../pages/card/services/card-theme-preference';
import {
  materializeOfflineDemoCard,
  materializeOfflineDemoFields,
  publicLabelsForDraft,
  readOfflineDemoDraft,
  type OfflineDemoPublicField,
} from '../../../pages/card/services/offline-demo-draft';
import {
  hasLocalIdentity,
  materializeLocalIdentityCard,
  materializeLocalIdentityFields,
  publicLabelsForLocalIdentity,
  readLocalIdentity,
} from '../../../pages/card/services/local-identity';
import { buildLocalIdentitySharePath, buildOfflineDemoSharePath, createLocalIdentityShareSnapshot, createOfflineDemoShareSnapshot } from '../../../pages/card/services/offline-demo-share-snapshot';
import { prepareNativeShareCardCover } from '../../../pages/card/services/native-share-card';
import { isSafeShareTokenId, rememberShareForRevocation, wasShareRevokedForSession } from '../../../pages/card/services/share-revocation-pointer';

type IdentityClientModule = typeof import('../../../pages/card/services/identity-client');
declare const require: (path: string) => IdentityClientModule;

function getCardRuntime(): { readonly runtimeMode: string; readonly cloudConfigured: boolean } {
  try {
    const app = getApp<{ globalData?: { runtimeMode?: string; cloudEnvironmentConfigured?: boolean } }>();
    return {
      runtimeMode: app.globalData?.runtimeMode ?? 'OFFLINE_DEMO',
      cloudConfigured: app.globalData?.cloudEnvironmentConfigured === true,
    };
  } catch (_error) {
    return { runtimeMode: 'OFFLINE_DEMO', cloudConfigured: false };
  }
}

function loadIdentityClient(): IdentityClientModule {
  return require('../../../pages/card/services/identity-client');
}

function parseOwnerUserId(value: string | undefined): UserId | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(normalized)) return undefined;
  return normalized as UserId;
}

const DEFAULT_VISITOR_TITLE = 'AB Club 数字名片';
type SelfCardState = 'CHECKING' | 'HAS_CARD' | 'NO_CARD' | 'UNKNOWN';

function compactDisplayName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return Array.from(value.trim()).slice(0, 24).join('');
}

function shareSafeOfflineFields(fields: readonly OfflineDemoPublicField[]): OfflineDemoPublicField[] {
  return fields.filter((field) => field.key !== 'phone' && field.key !== 'email');
}

function visitorTitleForCard(card: PublicCardProjection | null | undefined): string {
  const displayName = compactDisplayName(card?.displayName);
  return displayName ? `${displayName} 的数字名片` : DEFAULT_VISITOR_TITLE;
}

function setNavigationTitle(title: string): void {
  if (typeof wx.setNavigationBarTitle !== 'function') return;
  wx.setNavigationBarTitle({ title: Array.from(title).slice(0, 20).join('') });
}

Page({
  viewedOwnerUserId: undefined as UserId | undefined,
  viewLoadGeneration: 0,
  viewUnloaded: true,
  selfCardCheckGeneration: 0,
  ownerShareGeneration: 0,
  ownerSharePayload: undefined as { title: string; path: string; imageUrl: string } | undefined,
  ownerShareTokenId: undefined as ShareTokenId | undefined,
  data: {
    runtimeMode: 'OFFLINE_DEMO',
    demoMode: false,
    localIdentityReady: false,
    demoFields: [...OFFLINE_DEMO_FIELDS] as OfflineDemoPublicField[],
    demoPublicLabels: [] as string[],
    card: null as PublicCardProjection | null,
    viewerMode: 'SELF' as CardViewerMode,
    status: 'IDLE' as 'IDLE' | 'LOADING' | 'READY' | 'ERROR',
    message: '',
    invalidOwner: false,
    demoVisitorPreview: false,
    viewedOwnerUserId: '',
    cityLabel: '',
    cardTheme: 'ivory' as CardTheme,
    visitorTitle: DEFAULT_VISITOR_TITLE,
    localAccountReady: false,
    selfCardState: 'CHECKING' as SelfCardState,
    ownerShareReady: false,
    ownerSharePreparing: false,
    ownerShareMessage: '',
  },

  onLoad(options: Record<string, string | undefined>) {
    this.viewUnloaded = false;
    this.viewLoadGeneration += 1;
    this.selfCardCheckGeneration += 1;
    this.ownerShareGeneration += 1;
    this.ownerSharePayload = undefined;
    this.ownerShareTokenId = undefined;
    const runtime = getCardRuntime();
    const demoMode = isOfflineDemo(runtime);
    const demoVisitorPreview = demoMode && options.preview === 'STRANGER';
    this.setData({
      runtimeMode: runtime.runtimeMode,
      demoMode,
      demoVisitorPreview,
      invalidOwner: false,
      cardTheme: readCardThemePreference(),
      visitorTitle: DEFAULT_VISITOR_TITLE,
      localAccountReady: hasLocalIdentity(),
      selfCardState: demoMode
        ? (hasLocalIdentity() ? 'HAS_CARD' : 'NO_CARD')
        : 'CHECKING',
    });
    setNavigationTitle(options.ownerUserId !== undefined || demoVisitorPreview
      ? DEFAULT_VISITOR_TITLE
      : '我的数字名片');
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    if (options.ownerUserId !== undefined) {
      this.viewedOwnerUserId = parseOwnerUserId(options.ownerUserId);
      if (!this.viewedOwnerUserId) {
        this.setData({
          invalidOwner: true,
          status: 'ERROR',
          message: '名片查看参数无效，请从可信入口重新打开。',
          card: null,
          cityLabel: '',
          visitorTitle: DEFAULT_VISITOR_TITLE,
        });
      } else {
        this.setData({ viewedOwnerUserId: this.viewedOwnerUserId });
      }
    } else {
      this.viewedOwnerUserId = undefined;
      this.setData({ viewedOwnerUserId: '' });
    }
  },

  onShow() {
    if (this.viewedOwnerUserId || this.data.demoVisitorPreview) void this.refreshSelfCardState();
    if (!this.data.invalidOwner) void this.loadCard();
  },

  onUnload() {
    this.viewUnloaded = true;
    this.viewLoadGeneration += 1;
    this.selfCardCheckGeneration += 1;
    this.ownerShareGeneration += 1;
    this.ownerSharePayload = undefined;
    this.viewedOwnerUserId = undefined;
  },

  onPullDownRefresh() {
    void this.loadCard(true);
  },

  async loadCard(fromPullDown: boolean = false) {
    if (this.data.invalidOwner || this.data.status === 'LOADING') {
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }
    this.ownerShareGeneration += 1;
    this.ownerSharePayload = undefined;
    this.setData({ ownerShareReady: false });
    const viewedOwnerUserId = this.viewedOwnerUserId;
    const loadGeneration = ++this.viewLoadGeneration;
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    const isCurrentLoad = () => (
      !this.viewUnloaded
      && this.viewLoadGeneration === loadGeneration
      && this.viewedOwnerUserId === viewedOwnerUserId
    );
    if (this.data.demoMode && !viewedOwnerUserId) {
      const localIdentity = readLocalIdentity();
      if (localIdentity) {
        const localCard = materializeLocalIdentityCard(localIdentity);
        const localFields = materializeLocalIdentityFields(localIdentity);
        const visitorTitle = this.data.demoVisitorPreview
          ? visitorTitleForCard(localCard)
          : '我的数字名片';
        this.setData({
          status: 'READY',
          card: localCard,
          demoFields: this.data.demoVisitorPreview ? shareSafeOfflineFields(localFields) : localFields,
          demoPublicLabels: publicLabelsForLocalIdentity(localIdentity),
          cityLabel: cityDisplayName(localCard.cityId),
          viewerMode: this.data.demoVisitorPreview ? 'STRANGER' : 'SELF',
          localIdentityReady: true,
          message: this.data.demoVisitorPreview
            ? ''
            : '名片仅保存在这台设备',
          visitorTitle,
        });
        setNavigationTitle(visitorTitle);
        if (!this.data.demoVisitorPreview) await this.prepareOwnerShare();
        if (fromPullDown) wx.stopPullDownRefresh();
        return;
      }
      const draft = readOfflineDemoDraft();
      const demoCard = materializeOfflineDemoCard(draft);
      const demoFields = materializeOfflineDemoFields(draft);
      const visitorTitle = this.data.demoVisitorPreview
        ? visitorTitleForCard(demoCard)
        : '我的数字名片';
      this.setData({
        status: 'READY',
        card: demoCard,
        demoFields,
        demoPublicLabels: publicLabelsForDraft(draft),
        cityLabel: cityDisplayName(demoCard.cityId),
        viewerMode: this.data.demoVisitorPreview ? 'STRANGER' : 'SELF',
        localIdentityReady: false,
        message: this.data.demoVisitorPreview
          ? ''
          : '',
        visitorTitle,
      });
      setNavigationTitle(visitorTitle);
      if (!this.data.demoVisitorPreview) await this.prepareOwnerShare();
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }
    this.setData({ status: 'LOADING', message: '', card: null });
    if (!viewedOwnerUserId) {
      const { getMyCard } = loadIdentityClient();
      const result = await getMyCard();
      if (!isCurrentLoad()) return;
      if (!result.ok) {
        this.setData({
          status: 'ERROR',
          message: result.message,
          card: null,
          cityLabel: '',
          visitorTitle: '我的数字名片',
        });
        setNavigationTitle('我的数字名片');
      } else {
        const card = sanitizePublicCard(result.data.card);
        this.setData({
          status: 'READY',
          card,
          cityLabel: cityDisplayName(card.cityId),
          viewerMode: 'SELF',
          visitorTitle: '我的数字名片',
        });
        setNavigationTitle('我的数字名片');
        await this.prepareOwnerShare();
      }
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }

    const { getCardForViewer } = loadIdentityClient();
    const result = await getCardForViewer(viewedOwnerUserId);
    if (!isCurrentLoad()) return;
    if (!result.ok) {
      this.setData({
        status: 'ERROR',
        message: result.code === 'BLOCKED_RELATIONSHIP'
          ? '根据当前可见范围设置，这张名片不可查看。'
          : result.message,
        card: null,
        cityLabel: '',
        visitorTitle: DEFAULT_VISITOR_TITLE,
      });
      setNavigationTitle(DEFAULT_VISITOR_TITLE);
    } else if (
      result.data.card.ownerUserId !== viewedOwnerUserId ||
      result.data.relationship.subjectUserId !== viewedOwnerUserId
    ) {
      this.setData({
        status: 'ERROR',
        message: '服务返回的名片身份不匹配，请重新打开可信入口。',
        card: null,
        cityLabel: '',
        visitorTitle: DEFAULT_VISITOR_TITLE,
      });
      setNavigationTitle(DEFAULT_VISITOR_TITLE);
    } else {
      const card = sanitizePublicCard(result.data.card, result.data.claims);
      const visitorTitle = visitorTitleForCard(card);
      this.setData({
        status: 'READY',
        card,
        cityLabel: cityDisplayName(card.cityId),
        viewerMode: viewerModeFromRelationship(result.data.relationship),
        visitorTitle,
      });
      setNavigationTitle(visitorTitle);
      // Legacy owner-id routes remain readable for in-app navigation, but must
      // not become permanent share links that bypass token expiry/revocation.
    }
    if (fromPullDown) wx.stopPullDownRefresh();
  },

  async refreshSelfCardState() {
    if (this.data.demoMode) {
      const localAccountReady = hasLocalIdentity();
      this.setData({
        localAccountReady,
        selfCardState: localAccountReady ? 'HAS_CARD' : 'NO_CARD',
      });
      return;
    }
    const generation = ++this.selfCardCheckGeneration;
    this.setData({ selfCardState: 'CHECKING' });
    try {
      const { getMyCard } = loadIdentityClient();
      const result = await getMyCard();
      if (this.viewUnloaded || generation !== this.selfCardCheckGeneration) return;
      if (result.ok) {
        this.setData({ localAccountReady: true, selfCardState: 'HAS_CARD' });
      } else if (result.code === 'NOT_FOUND') {
        this.setData({ localAccountReady: false, selfCardState: 'NO_CARD' });
      } else {
        this.setData({ localAccountReady: false, selfCardState: 'UNKNOWN' });
      }
    } catch (_error) {
      if (!this.viewUnloaded && generation === this.selfCardCheckGeneration) {
        this.setData({ localAccountReady: false, selfCardState: 'UNKNOWN' });
      }
    }
  },

  openMyCardEntry() {
    const offline = this.data.demoMode;
    const localAccountReady = offline ? hasLocalIdentity() : this.data.selfCardState === 'HAS_CARD';
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

  async prepareOwnerShare() {
    if (this.data.viewerMode !== 'SELF' || this.viewedOwnerUserId || !this.data.card || this.viewUnloaded) return;
    const generation = ++this.ownerShareGeneration;
    const theme = this.data.cardTheme;
    this.ownerSharePayload = undefined;
    this.ownerShareTokenId = undefined;
    this.setData({ ownerShareReady: false, ownerSharePreparing: true, ownerShareMessage: '' });
    try {
      let card = this.data.card;
      let fields: readonly OfflineDemoPublicField[] = [];
      let labels: readonly string[] = [];
      let path: string;
      if (this.data.demoMode) {
        const local = readLocalIdentity();
        const draft = local || readOfflineDemoDraft();
        const result = local ? buildLocalIdentitySharePath(local, theme) : buildOfflineDemoSharePath(draft, theme);
        if (!result.ok) throw new Error('名片内容较长，请精简简介后重试。');
        path = result.path;
        const snapshot = local ? createLocalIdentityShareSnapshot(local, theme) : createOfflineDemoShareSnapshot(draft, theme);
        card = snapshot.card;
        fields = snapshot.fields;
        labels = snapshot.publicLabels;
      } else {
        const { getMyPublicCard, createCardShare } = loadIdentityClient();
        const publicResult = await getMyPublicCard();
        if (!publicResult.ok) throw new Error(publicResult.message);
        card = sanitizePublicCard(publicResult.data.card);
        const result = await createCardShare(card.cardId, card.version, shareExpiry(7) as UtcInstant);
        if (!result.ok) throw new Error(result.message);
        if (result.data.targetType !== 'CARD' || result.data.targetId !== card.cardId || !isSafeShareBearer(result.data.token) || !isSafeShareTokenId(result.data.shareTokenId)) throw new Error('分享入口与当前名片不一致，请重试。');
        rememberShareForRevocation(result.data.shareTokenId);
        if (this.viewUnloaded || generation !== this.ownerShareGeneration) return;
        this.ownerShareTokenId = result.data.shareTokenId;
        path = `/pages/card-share/index?token=${encodeURIComponent(result.data.token)}&theme=${theme}`;
        labels = card.claims.map((claim) => claim.labelText.zh);
      }
      const imageUrl = await prepareNativeShareCardCover(this, {
        theme,
        displayName: card.displayName, headline: card.headline, biography: card.biography, labels,
        phone: fields.find((field) => field.key === 'phone')?.value,
        email: fields.find((field) => field.key === 'email')?.value,
        demoMode: this.data.demoMode && !this.data.localIdentityReady,
      });
      if (this.viewUnloaded || generation !== this.ownerShareGeneration || this.data.cardTheme !== theme) return;
      this.ownerSharePayload = { title: safeShareTitle(card.displayName), path, imageUrl: imageUrl || '/assets/brand/ab-club-brand-share.jpg' };
      this.setData({ ownerShareReady: true, ownerSharePreparing: false, ownerShareMessage: '' });
      if (typeof wx.showShareMenu === 'function') wx.showShareMenu({ menus: ['shareAppMessage'] });
    } catch (error) {
      if (this.viewUnloaded || generation !== this.ownerShareGeneration) return;
      this.setData({ ownerShareReady: false, ownerSharePreparing: false, ownerShareMessage: error instanceof Error ? error.message : '分享暂时无法准备，请重试。' });
    }
  },

  onShareAppMessage() {
    const revoked = this.ownerShareTokenId && wasShareRevokedForSession(this.ownerShareTokenId);
    if (!this.viewUnloaded && this.data.viewerMode === 'SELF' && !this.viewedOwnerUserId && !revoked && this.data.ownerShareReady && this.ownerSharePayload) return this.ownerSharePayload;
    return { title: 'AB Club 数字名片', path: '/pages/card-share/index?invalid=1', imageUrl: '/assets/brand/ab-club-brand-share.jpg' };
  },

});
