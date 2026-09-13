import type { ShareTokenId, UtcInstant } from '../../../shared/types/primitives';
import type { PublicCardProjection } from '../../../shared/types/projections';
import {
  createCardQrScene,
  createCardShare,
  getMyPublicCard,
  getRuntimeEvidence,
  revokeCardShare,
} from '../../../pages/card/services/identity-client';
import {
  cityDisplayName,
  isSafeShareBearer,
  safeShareTitle,
  sanitizePublicCard,
  shareExpiry,
} from '../../../pages/card/services/card-presenter';
import {
  forgetShareRevocationPointer,
  isSafeShareTokenId,
  markShareRevokedForSession,
  readShareRevocationPointer,
  rememberShareForRevocation,
} from '../../../pages/card/services/share-revocation-pointer';
import {
  OFFLINE_DEMO_FIELDS,
  isOfflineDemo,
} from '../../../pages/card/services/offline-demo';
import {
  readCardThemePreference,
  type CardTheme,
} from '../../../pages/card/services/card-theme-preference';
import {
  readOfflineDemoDraft,
  type OfflineDemoDraft,
  type OfflineDemoPublicField,
} from '../../../pages/card/services/offline-demo-draft';
import {
  buildLocalIdentitySharePath,
  buildOfflineDemoSharePath,
  createLocalIdentityShareSnapshot,
  createOfflineDemoShareSnapshot,
} from '../../../pages/card/services/offline-demo-share-snapshot';
import {
  drawClassicalShareFrame,
  drawNativeShareCard,
  NATIVE_SHARE_CARD_HEIGHT,
  NATIVE_SHARE_CARD_WIDTH,
  resolveNativeShareCardPixelRatio,
  resolveNativeShareCardPalette,
} from '../../../pages/card/services/native-share-card';
import {
  readLocalIdentity,
  type LocalIdentity,
} from '../../../pages/card/services/local-identity';

type OwnerShareState = '' | 'SUCCESS' | 'REVOKED' | 'ERROR' | 'LOADING';
type QrState = 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';

interface TransientShareSecret {
  readonly token: string;
  readonly shareTokenId: ShareTokenId;
}

const POSTER_WIDTH = 640;
const POSTER_HEIGHT = 880;

function requestAlbumPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    wx.authorize({
      scope: 'scope.writePhotosAlbum',
      success: () => resolve(true),
      fail: () => resolve(false),
    });
  });
}

function getAlbumPermission(): Promise<boolean | undefined> {
  return new Promise((resolve) => {
    wx.getSetting({
      success: (result) => resolve(result.authSetting['scope.writePhotosAlbum']),
      fail: () => resolve(undefined),
    });
  });
}

function saveImage(tempFilePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    wx.saveImageToPhotosAlbum({
      filePath: tempFilePath,
      success: () => resolve(true),
      fail: () => resolve(false),
    });
  });
}

function wrapText(
  context: WechatMiniprogram.CanvasRenderingContext.CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): readonly string[] {
  const normalized = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (!normalized) return [];
  const lines: string[] = [];
  let current = '';
  for (const character of Array.from(normalized)) {
    const candidate = `${current}${character}`;
    if (context.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = character;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines && normalized.length > lines.join('').length) {
    const last = lines[maxLines - 1] ?? '';
    lines[maxLines - 1] = `${last.slice(0, Math.max(0, last.length - 1))}…`;
  }
  return lines;
}

function drawPublicPoster(
  canvas: WechatMiniprogram.Canvas,
  card: PublicCardProjection,
  _demoMode: boolean,
  theme: CardTheme = 'ivory',
  publicLabels: readonly string[] = [],
): void {
  const palette = resolveNativeShareCardPalette(theme);
  const pixelRatio = resolveNativeShareCardPixelRatio();
  canvas.width = POSTER_WIDTH * pixelRatio;
  canvas.height = POSTER_HEIGHT * pixelRatio;
  const context = canvas.getContext('2d');
  context.scale(pixelRatio, pixelRatio);

  context.fillStyle = palette.paper[0];
  context.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);
  drawClassicalShareFrame(context, POSTER_WIDTH, POSTER_HEIGHT, palette);

  context.fillStyle = palette.accent;
  context.font = '400 19px Georgia, serif';
  context.fillText('AB CLUB', 52, 100);

  context.beginPath();
  context.arc(102, 220, 50, 0, Math.PI * 2);
  context.fillStyle = palette.paper[2];
  context.fill();
  context.fillStyle = palette.ink;
  context.font = '400 30px Georgia, serif';
  context.textAlign = 'center';
  context.fillText(card.displayName.trim().slice(0, 1) || 'A', 102, 231);
  context.textAlign = 'left';

  context.fillStyle = palette.ink;
  context.font = '400 42px Georgia, serif';
  const nameLines = wrapText(context, card.displayName, 410, 2);
  nameLines.forEach((line, index) => context.fillText(line, 180, 205 + index * 50));

  if (card.headline) {
    context.fillStyle = palette.muted;
    context.font = '400 23px sans-serif';
    const headlineLines = wrapText(context, card.headline, 410, 2);
    headlineLines.forEach((line, index) => context.fillText(line, 180, 292 + index * 34));
  }

  context.strokeStyle = palette.line;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(52, 360);
  context.lineTo(588, 360);
  context.stroke();

  context.fillStyle = palette.ink;
  context.font = '400 25px sans-serif';
  const biographyLines = wrapText(context, card.biography ?? '', 536, 5);
  biographyLines.forEach((line, index) => context.fillText(line, 52, 420 + index * 40));

  const labels = publicLabels.length ? publicLabels.slice(0, 5) : card.claims.slice(0, 3).map((claim) => claim.labelText.zh);
  if (labels.length > 0) {
    context.font = '400 20px sans-serif';
    context.fillStyle = palette.accent;
    wrapText(context, labels.join(' · '), 536, 2).forEach((line, index) => context.fillText(line, 52, 650 + index * 32));
  }
}

Page({
  activeCard: undefined as PublicCardProjection | undefined,
  activeDemoDraft: undefined as OfflineDemoDraft | LocalIdentity | undefined,
  activeShareSecret: undefined as TransientShareSecret | undefined,
  revocableTokenId: undefined as ShareTokenId | undefined,
  posterCanvas: undefined as WechatMiniprogram.Canvas | undefined,
  nativeShareCanvas: undefined as WechatMiniprogram.Canvas | undefined,
  nativeShareCoverGeneration: 0,
  sharePageGeneration: 0,
  loadCardRequestGeneration: 0,
  actionRequestGeneration: 0,
  sharePageUnloaded: true,
  data: {
    runtimeMode: 'OFFLINE_DEMO',
    demoMode: false,
    localIdentityReady: false,
    demoFields: [...OFFLINE_DEMO_FIELDS] as OfflineDemoPublicField[],
    demoPublicLabels: [] as string[],
    card: null as PublicCardProjection | null,
    cardTheme: 'ivory' as CardTheme,
    cityLabel: '',
    loadingCard: true,
    pageError: '',
    localNotice: '',
    shareState: '' as OwnerShareState,
    shareTitle: '',
    shareDescription: '',
    hasActiveShare: false,
    hasRevocableShare: false,
    qrState: 'IDLE' as QrState,
    qrMessage: '',
    shareCoverState: 'IDLE' as 'IDLE' | 'LOADING' | 'READY' | 'ERROR',
    shareCoverPath: '',
    shareCoverMessage: '',
    posterReady: false,
    posterPath: '',
    posterMessage: '',
    albumDenied: false,
    busyAction: '' as '' | 'CREATE' | 'QR' | 'REVOKE' | 'POSTER' | 'SAVE',
  },

  onLoad() {
    this.sharePageUnloaded = false;
    this.sharePageGeneration += 1;
    this.loadCardRequestGeneration += 1;
    this.actionRequestGeneration += 1;
    this.activeCard = undefined;
    this.activeDemoDraft = undefined;
    this.activeShareSecret = undefined;
    this.revocableTokenId = undefined;
    this.posterCanvas = undefined;
    this.nativeShareCanvas = undefined;
    this.nativeShareCoverGeneration += 1;
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    const cardTheme = readCardThemePreference();
    const runtime = getRuntimeEvidence();
    if (isOfflineDemo(runtime)) {
      const localIdentity = readLocalIdentity();
      if (!localIdentity) {
        this.setData({
          runtimeMode: runtime.runtimeMode,
          demoMode: true,
          localIdentityReady: false,
          card: null,
          loadingCard: false,
          pageError: '请先创建自己的名片。',
          localNotice: '',
          shareCoverState: 'IDLE',
          shareCoverMessage: '',
          shareCoverPath: '',
        });
        return;
      }
      const offlineSnapshot = createLocalIdentityShareSnapshot(localIdentity, cardTheme);
      this.activeDemoDraft = localIdentity;
      this.activeCard = offlineSnapshot.card;
      this.setData({
        runtimeMode: runtime.runtimeMode,
        demoMode: true,
        localIdentityReady: true,
        card: offlineSnapshot.card,
        demoFields: [...offlineSnapshot.fields],
        demoPublicLabels: [...offlineSnapshot.publicLabels],
        cardTheme: offlineSnapshot.cardTheme,
        cityLabel: cityDisplayName(offlineSnapshot.card.cityId),
        loadingCard: false,
        localNotice: '',
        shareCoverState: 'LOADING',
        shareCoverMessage: '正在生成微信分享卡片…',
        shareCoverPath: '',
      }, () => {
        wx.nextTick(() => void this.prepareNativeShareCover());
      });
      return;
    }
    this.revocableTokenId = readShareRevocationPointer();
    this.setData({
      runtimeMode: runtime.runtimeMode,
      cardTheme,
      hasRevocableShare: this.revocableTokenId !== undefined,
    });
    void this.loadCard();
  },

  onUnload() {
    this.sharePageUnloaded = true;
    this.sharePageGeneration += 1;
    this.loadCardRequestGeneration += 1;
    this.actionRequestGeneration += 1;
    this.activeCard = undefined;
    this.activeDemoDraft = undefined;
    this.activeShareSecret = undefined;
    this.revocableTokenId = undefined;
    this.posterCanvas = undefined;
    this.nativeShareCanvas = undefined;
    this.nativeShareCoverGeneration += 1;
  },

  isCurrentLifecycle(generation: number) {
    return !this.sharePageUnloaded && this.sharePageGeneration === generation;
  },

  isCurrentAction(lifecycleGeneration: number, actionGeneration: number) {
    return this.isCurrentLifecycle(lifecycleGeneration)
      && this.actionRequestGeneration === actionGeneration;
  },

  async loadCard() {
    if (this.data.busyAction || this.sharePageUnloaded) return;
    if (this.data.demoMode) return;
    const lifecycleGeneration = this.sharePageGeneration;
    const requestGeneration = ++this.loadCardRequestGeneration;
    this.setData({ loadingCard: true, pageError: '' });
    try {
      const result = await getMyPublicCard();
      if (
        !this.isCurrentLifecycle(lifecycleGeneration)
        || this.loadCardRequestGeneration !== requestGeneration
      ) return;
      if (!result.ok) {
        this.activeCard = undefined;
        this.setData({
          loadingCard: false,
          pageError: result.message,
          card: null,
          cityLabel: '',
          shareCoverState: 'IDLE',
          shareCoverPath: '',
          shareCoverMessage: '',
        });
        return;
      }
      const card = sanitizePublicCard(result.data.card);
      this.activeCard = card;
      this.setData({
        loadingCard: false,
        pageError: '',
        card,
        cityLabel: cityDisplayName(card.cityId),
        shareCoverState: 'LOADING',
        shareCoverPath: '',
        shareCoverMessage: '正在生成微信分享卡片…',
      }, () => {
        wx.nextTick(() => void this.prepareNativeShareCover());
      });
    } catch (_error) {
      if (
        !this.isCurrentLifecycle(lifecycleGeneration)
        || this.loadCardRequestGeneration !== requestGeneration
      ) return;
      this.activeCard = undefined;
      this.setData({
        loadingCard: false,
        pageError: '暂时无法加载名片，请重试。',
        card: null,
        cityLabel: '',
        shareCoverState: 'IDLE',
        shareCoverPath: '',
        shareCoverMessage: '',
      });
    }
  },

  async prepareNativeShareCover() {
    const card = this.activeCard;
    if (!card || this.sharePageUnloaded) return;
    const theme = this.data.cardTheme;
    const lifecycleGeneration = this.sharePageGeneration;
    const coverGeneration = ++this.nativeShareCoverGeneration;
    this.nativeShareCanvas = undefined;
    this.setData({
      shareCoverState: 'LOADING',
      shareCoverPath: '',
      shareCoverMessage: '正在生成微信分享卡片…',
    });
    try {
      const canvas = await new Promise<WechatMiniprogram.Canvas | undefined>((resolve) => {
        wx.createSelectorQuery()
          .in(this)
          .select('#nativeShareCardCanvas')
          .node((result) => resolve(result?.node as WechatMiniprogram.Canvas | undefined))
          .exec();
      });
      if (
        !this.isCurrentLifecycle(lifecycleGeneration)
        || this.nativeShareCoverGeneration !== coverGeneration
      ) return;
      if (!canvas) {
        this.setData({
          shareCoverState: 'ERROR',
          shareCoverMessage: '分享封面暂时不可用，请重试。',
        });
        return;
      }
      this.nativeShareCanvas = canvas;
      const draft = this.data.demoMode && !this.data.localIdentityReady
        ? this.activeDemoDraft
        : undefined;
      drawNativeShareCard(canvas, {
        theme,
        displayName: card.displayName,
        headline: card.headline,
        biography: card.biography,
        labels: this.data.demoPublicLabels,
        phone: draft?.showPhone ? draft.phone : '',
        email: draft?.showEmail ? draft.email : '',
        demoMode: this.data.demoMode,
      });
      const tempFilePath = await new Promise<string | undefined>((resolve) => {
        wx.canvasToTempFilePath({
          canvas,
          width: NATIVE_SHARE_CARD_WIDTH,
          height: NATIVE_SHARE_CARD_HEIGHT,
          destWidth: NATIVE_SHARE_CARD_WIDTH * 2,
          destHeight: NATIVE_SHARE_CARD_HEIGHT * 2,
          fileType: 'jpg',
          quality: 0.92,
          success: (result) => resolve(result.tempFilePath),
          fail: () => resolve(undefined),
        }, this);
      });
      if (
        !this.isCurrentLifecycle(lifecycleGeneration)
        || this.nativeShareCoverGeneration !== coverGeneration
      ) return;
      if (!tempFilePath) {
        this.nativeShareCanvas = undefined;
        this.setData({
          shareCoverState: 'ERROR',
          shareCoverMessage: '微信分享卡片导出失败，请点击重试。',
        });
        return;
      }
      this.setData({
        shareCoverState: 'READY',
        shareCoverPath: tempFilePath,
        shareCoverMessage: '',
      });
      if (this.data.demoMode || this.data.shareState === 'SUCCESS') {
        wx.showShareMenu({ menus: ['shareAppMessage'] });
      }
    } catch (_error) {
      if (
        !this.isCurrentLifecycle(lifecycleGeneration)
        || this.nativeShareCoverGeneration !== coverGeneration
      ) return;
      this.nativeShareCanvas = undefined;
      this.setData({
        shareCoverState: 'ERROR',
        shareCoverPath: '',
        shareCoverMessage: '微信分享卡片生成失败，请点击重试。',
      });
    }
  },

  retryNativeShareCover() {
    if (this.data.shareCoverState === 'LOADING' || !this.activeCard) return;
    void this.prepareNativeShareCover();
  },

  async createShare() {
    const card = this.activeCard;
    if (
      this.data.busyAction
      || this.data.loadingCard
      || !card
      || this.activeShareSecret
      || this.revocableTokenId
      || this.sharePageUnloaded
    ) return;
    if (this.data.demoMode) {
      this.setData({ localNotice: '请从名片页面分享。' });
      return;
    }
    const lifecycleGeneration = this.sharePageGeneration;
    const actionGeneration = ++this.actionRequestGeneration;
    this.loadCardRequestGeneration += 1;
    this.setData({
      busyAction: 'CREATE',
      localNotice: '',
      shareState: 'LOADING',
      shareTitle: '正在创建安全入口',
      shareDescription: '正在准备限时入口；完成前不会进入可发送状态，私密资料也不会带入名片。',
    });
    try {
      const result = await createCardShare(
        card.cardId,
        card.version,
        shareExpiry(7) as UtcInstant,
      );
      if (!this.isCurrentAction(lifecycleGeneration, actionGeneration)) return;
      if (this.activeCard !== card) {
        this.setData({
          busyAction: '',
          shareState: 'ERROR',
          shareTitle: '名片已更新',
          shareDescription: '名片已更新，请刷新后重试。',
        });
        return;
      }
      if (
        !result.ok
        || result.data.targetType !== 'CARD'
        || result.data.targetId !== card.cardId
        || !isSafeShareBearer(result.data.token)
        || !isSafeShareTokenId(result.data.shareTokenId)
      ) {
        this.setData({
          busyAction: '',
          shareState: 'ERROR',
          shareTitle: '创建失败',
          shareDescription: result.ok ? '分享入口与当前名片不一致，请重试。' : result.message,
        });
        return;
      }
      const secret = {
        token: result.data.token,
        shareTokenId: result.data.shareTokenId,
      } satisfies TransientShareSecret;
      this.activeShareSecret = secret;
      this.revocableTokenId = secret.shareTokenId;
      const revocationRemembered = rememberShareForRevocation(secret.shareTokenId);
      this.setData({
        busyAction: '',
        shareState: 'SUCCESS',
        shareTitle: '安全入口已准备',
        shareDescription: revocationRemembered
          ? '点击微信转发后会打开系统面板；是否真正送达以微信界面为准，本页不伪造成功。'
          : '分享管理暂时不可用，请先停止分享后重试。',
        hasActiveShare: true,
        hasRevocableShare: true,
      });
      if (this.data.shareCoverState === 'READY') {
        wx.showShareMenu({ menus: ['shareAppMessage'] });
      } else {
        wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
        void this.prepareNativeShareCover();
      }
    } catch (_error) {
      if (!this.isCurrentAction(lifecycleGeneration, actionGeneration)) return;
      this.setData({
        busyAction: '',
        shareState: 'ERROR',
        shareTitle: '创建失败',
        shareDescription: '分享准备失败，请稍后重试。',
      });
    }
  },

  async createQrScene() {
    const card = this.activeCard;
    const secret = this.activeShareSecret;
    if (
      this.data.busyAction
      || this.data.loadingCard
      || !card
      || !secret
      || this.sharePageUnloaded
    ) return;
    const lifecycleGeneration = this.sharePageGeneration;
    const actionGeneration = ++this.actionRequestGeneration;
    this.loadCardRequestGeneration += 1;
    this.setData({ busyAction: 'QR', qrState: 'LOADING', qrMessage: '正在准备小程序码…' });
    try {
      const result = await createCardQrScene(secret.shareTokenId, card.version);
      if (!this.isCurrentAction(lifecycleGeneration, actionGeneration)) return;
      if (this.activeCard !== card || this.activeShareSecret !== secret) {
        this.setData({
          busyAction: '',
          qrState: 'ERROR',
          qrMessage: '分享入口已变化，未采用这次小程序码结果。请重新操作。',
        });
        return;
      }
      if (
        !result.ok
        || result.data.targetType !== 'CARD'
        || result.data.shareTokenId !== secret.shareTokenId
        || !isSafeShareBearer(result.data.scene)
        || !isSafeShareTokenId(result.data.shareTokenId)
      ) {
        this.setData({
          busyAction: '',
          qrState: 'ERROR',
          qrMessage: result.ok
            ? '小程序码与当前名片不一致。可重试，或直接使用微信名片转发。'
            : `${result.message} 可重试，或直接使用微信名片转发。`,
        });
        return;
      }
      this.setData({
        busyAction: '',
        qrState: 'SUCCESS',
        qrMessage: '小程序码入口已经准备；当前没有可直接展示的二维码图片，因此不会显示假二维码。',
      });
    } catch (_error) {
      if (!this.isCurrentAction(lifecycleGeneration, actionGeneration)) return;
      this.setData({
        busyAction: '',
        qrState: 'ERROR',
        qrMessage: '小程序码生成失败，请重试。',
      });
    }
  },

  async revokeShare() {
    const card = this.activeCard;
    const tokenId = this.revocableTokenId;
    if (
      this.data.busyAction
      || this.data.loadingCard
      || !card
      || !tokenId
      || this.sharePageUnloaded
    ) return;
    const lifecycleGeneration = this.sharePageGeneration;
    const actionGeneration = ++this.actionRequestGeneration;
    this.loadCardRequestGeneration += 1;
    this.setData({ busyAction: 'REVOKE' });
    try {
      const result = await revokeCardShare(tokenId, card.version);
      const wasCurrentPointer = readShareRevocationPointer() === tokenId;
      const revokeConfirmed = result.ok && result.data.shareTokenId === tokenId;
      if (revokeConfirmed) {
        markShareRevokedForSession(tokenId);
        forgetShareRevocationPointer(tokenId);
      }
      if (!this.isCurrentAction(lifecycleGeneration, actionGeneration)) return;
      if (this.activeCard !== card || this.revocableTokenId !== tokenId) {
        this.setData({
          busyAction: '',
          shareState: 'ERROR',
          shareTitle: '撤销目标已变化',
          shareDescription: '当前页面的分享入口已变化，这次撤销结果没有应用。',
        });
        return;
      }
      if (!revokeConfirmed) {
        this.setData({
          busyAction: '',
          shareState: 'ERROR',
          shareTitle: '撤销尚未确认',
          shareDescription: result.ok ? '要撤销的入口与当前页面不一致，请重试。' : result.message,
        });
        return;
      }
      this.activeShareSecret = undefined;
      const nextTokenId = wasCurrentPointer ? readShareRevocationPointer() : undefined;
      this.revocableTokenId = nextTokenId;
      wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
      this.setData({
        busyAction: '',
        shareState: nextTokenId ? '' : 'REVOKED',
        shareTitle: nextTokenId ? '' : '分享已撤销',
        shareDescription: nextTokenId ? '' : '分享已停止。',
        hasActiveShare: false,
        hasRevocableShare: Boolean(nextTokenId),
        qrState: 'IDLE',
        qrMessage: '',
        localNotice: nextTokenId ? '当前入口已撤销；还有较早创建的入口可继续撤销。' : '',
      });
    } catch (_error) {
      if (!this.isCurrentAction(lifecycleGeneration, actionGeneration)) return;
      this.setData({
        busyAction: '',
        shareState: 'ERROR',
        shareTitle: '撤销尚未确认',
        shareDescription: '撤销尚未确认，旧入口可能仍然有效，本页不会显示撤销成功。',
      });
    }
  },

  handleShareRetry() {
    if (this.revocableTokenId) {
      void this.revokeShare();
      return;
    }
    void this.createShare();
  },

  clearLocalRevocationPointer() {
    const tokenId = this.revocableTokenId;
    if (!tokenId || this.activeShareSecret || this.data.busyAction || this.sharePageUnloaded) return;
    const lifecycleGeneration = this.sharePageGeneration;
    wx.showModal({
      title: '移除分享记录？',
      content: '这不会真正撤销已创建的入口。若撤销一直失败，旧入口可能继续有效直到过期。',
      confirmText: '移除记录',
      confirmColor: '#725735',
      success: (result) => {
        if (
          !result.confirm
          || !this.isCurrentLifecycle(lifecycleGeneration)
          || this.revocableTokenId !== tokenId
          || this.activeShareSecret
          || this.data.busyAction
        ) return;
        forgetShareRevocationPointer(tokenId);
        const nextTokenId = readShareRevocationPointer();
        this.revocableTokenId = nextTokenId;
        this.setData({
          shareState: '',
          shareTitle: '',
          shareDescription: '',
          hasRevocableShare: Boolean(nextTokenId),
          localNotice: nextTokenId
            ? '记录已移除；已发出的名片仍可访问。'
            : '记录已移除；已发出的名片仍可访问，直到分享期限结束。',
        });
      },
    });
  },

  async generatePoster() {
    if (
      this.data.busyAction
      || this.data.loadingCard
      || !this.activeCard
      || this.sharePageUnloaded
    ) return;
    const theme = this.data.cardTheme;
    const lifecycleGeneration = this.sharePageGeneration;
    const actionGeneration = ++this.actionRequestGeneration;
    this.loadCardRequestGeneration += 1;
    this.posterCanvas = undefined;
    this.setData({
      busyAction: 'POSTER',
      posterReady: false,
      posterPath: '',
      albumDenied: false,
      posterMessage: '正在生成名片海报…',
    });
    try {
      let posterCard = this.activeCard;
      if (!this.data.demoMode) {
        const latest = await getMyPublicCard();
        if (!this.isCurrentAction(lifecycleGeneration, actionGeneration)) return;
        if (!latest.ok) {
          this.setData({
            busyAction: '',
            posterReady: false,
            posterMessage: '无法加载名片，请检查网络后重试。',
          });
          return;
        }
        posterCard = sanitizePublicCard(latest.data.card);
      }
      if (!posterCard) {
        this.setData({ busyAction: '', posterReady: false, posterMessage: '请先完善名片。' });
        return;
      }
      this.activeCard = posterCard;
      this.setData({ card: posterCard });
      const canvas = await new Promise<WechatMiniprogram.Canvas | undefined>((resolve) => {
        wx.createSelectorQuery()
          .in(this)
          .select('#cardPoster')
          .node((result) => resolve(result.node as WechatMiniprogram.Canvas | undefined))
          .exec();
      });
      if (!this.isCurrentAction(lifecycleGeneration, actionGeneration)) return;
      if (!canvas) {
        this.setData({ busyAction: '', posterMessage: '海报画布准备失败，请重试。', posterReady: false });
        return;
      }
      this.posterCanvas = canvas;
      drawPublicPoster(canvas, posterCard, this.data.demoMode, theme, this.data.demoPublicLabels);
      const tempFilePath = await new Promise<string | undefined>((resolve) => {
        wx.canvasToTempFilePath({
          canvas,
          width: POSTER_WIDTH,
          height: POSTER_HEIGHT,
          destWidth: POSTER_WIDTH * 2,
          destHeight: POSTER_HEIGHT * 2,
          fileType: 'png',
          success: (result) => resolve(result.tempFilePath),
          fail: () => resolve(undefined),
        }, this);
      });
      if (!this.isCurrentAction(lifecycleGeneration, actionGeneration)) return;
      if (!tempFilePath) {
        this.posterCanvas = undefined;
        this.setData({ busyAction: '', posterMessage: '海报导出失败，请重试。', posterReady: false });
        return;
      }
      this.setData({
        busyAction: '',
        posterReady: true,
        posterPath: tempFilePath,
        posterMessage: '',
      });
    } catch (_error) {
      if (!this.isCurrentAction(lifecycleGeneration, actionGeneration)) return;
      this.posterCanvas = undefined;
      this.setData({
        busyAction: '',
        posterReady: false,
        posterMessage: '海报生成失败，请重试。',
      });
    }
  },

  async savePosterToAlbum() {
    const posterPath = this.data.posterPath;
    const canvas = this.posterCanvas;
    if (
      this.data.busyAction
      || this.data.loadingCard
      || !posterPath
      || !canvas
      || this.sharePageUnloaded
    ) return;
    const lifecycleGeneration = this.sharePageGeneration;
    const actionGeneration = ++this.actionRequestGeneration;
    this.loadCardRequestGeneration += 1;
    this.setData({ busyAction: 'SAVE', posterMessage: '正在保存…' });
    const existingPermission = await getAlbumPermission();
    if (!this.isCurrentAction(lifecycleGeneration, actionGeneration)) return;
    const granted = existingPermission === true
      ? true
      : existingPermission === false
        ? false
        : await requestAlbumPermission();
    if (!this.isCurrentAction(lifecycleGeneration, actionGeneration)) return;
    if (this.posterCanvas !== canvas || this.data.posterPath !== posterPath) {
      this.setData({
        busyAction: '',
        posterMessage: '海报已更新，请重新保存。',
      });
      return;
    }
    if (!granted) {
      this.setData({
        busyAction: '',
        albumDenied: true,
        posterMessage: '请开启相册权限后保存。',
      });
      return;
    }
    const saved = await saveImage(posterPath);
    if (!this.isCurrentAction(lifecycleGeneration, actionGeneration)) return;
    this.setData({
      busyAction: '',
      albumDenied: !saved,
      posterMessage: saved
        ? '已保存到相册'
        : '保存失败，请检查空间与相册权限后重试。',
    });
  },

  openAlbumSettings() {
    const lifecycleGeneration = this.sharePageGeneration;
    wx.openSetting({
      success: (result) => {
        if (!this.isCurrentLifecycle(lifecycleGeneration)) return;
        const granted = result.authSetting['scope.writePhotosAlbum'] === true;
        this.setData({
          albumDenied: !granted,
          posterMessage: granted
            ? '相册权限已开启，请再次点击“保存到相册”。'
            : '请开启相册权限后保存。',
        });
      },
      fail: () => {
        if (!this.isCurrentLifecycle(lifecycleGeneration)) return;
        this.setData({ posterMessage: '未能打开权限设置，请稍后重试。' });
      },
    });
  },

  onShareAppMessage() {
    const secret = this.activeShareSecret;
    const card = this.activeCard;
    const themeQuery = this.data.cardTheme === 'ivory'
      ? ''
      : `&theme=${encodeURIComponent(this.data.cardTheme)}`;
    if (!this.sharePageUnloaded && this.data.demoMode && card) {
      const demoDraft = this.activeDemoDraft;
      const sharePath = demoDraft
        ? this.data.localIdentityReady
          ? buildLocalIdentitySharePath(demoDraft as LocalIdentity, this.data.cardTheme)
          : buildOfflineDemoSharePath(demoDraft, this.data.cardTheme)
        : { ok: false as const, code: 'PATH_TOO_LONG' as const, pathLength: 0 };
      if (!sharePath.ok) {
        this.setData({ localNotice: '名片内容过长，请精简个人简介。' });
        wx.showToast({ title: '请先精简名片内容', icon: 'none' });
        return { title: 'AB Club 数字名片', path: '/pages/card-share/index?invalid=1', imageUrl: '/assets/brand/ab-club-brand-share.jpg' };
      }
      this.setData({ localNotice: '已请求打开微信转发面板；只有你在微信界面确认后才会真正发送。' });
      return {
        title: safeShareTitle(card.displayName),
        path: sharePath.path,
        ...(this.data.shareCoverState === 'READY' && this.data.shareCoverPath
          ? { imageUrl: this.data.shareCoverPath }
          : { imageUrl: '/assets/brand/ab-club-brand-share.jpg' }),
      };
    }
    if (
      this.sharePageUnloaded
      || !secret
      || !card
      || this.data.shareState !== 'SUCCESS'
    ) {
      wx.showToast({ title: '请返回名片页面分享', icon: 'none' });
      return { title: 'AB Club 数字名片', path: '/pages/card-share/index?invalid=1', imageUrl: '/assets/brand/ab-club-brand-share.jpg' };
    }
    this.setData({
      shareDescription: '已请求打开微信转发面板；是否真正转发以微信系统结果为准。',
    });
    return {
      title: safeShareTitle(card.displayName),
      path: `/pages/card-share/index?token=${encodeURIComponent(secret.token)}${themeQuery}`,
      ...(this.data.shareCoverState === 'READY' && this.data.shareCoverPath
        ? { imageUrl: this.data.shareCoverPath }
        : { imageUrl: '/assets/brand/ab-club-brand-share.jpg' }),
    };
  },

  returnToOwnerCard() {
    if (getCurrentPages().length > 1) {
      void wx.navigateBack();
      return;
    }
    void wx.redirectTo({ url: '/pages/card/index' });
  },
});
