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
  isSafeShareBearer,
  safeShareTitle,
  sanitizePublicCard,
  shareExpiry,
} from '../../../pages/card/services/card-presenter';
import {
  forgetShareRevocationPointer,
  isSafeShareTokenId,
  readShareRevocationPointer,
  rememberShareForRevocation,
} from '../../../pages/card/services/share-revocation-pointer';

type OwnerShareState = '' | 'SUCCESS' | 'REVOKED' | 'ERROR' | 'LOADING';
type QrState = 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';

interface TransientShareSecret {
  readonly token: string;
  readonly shareTokenId: ShareTokenId;
}

const POSTER_WIDTH = 640;
const POSTER_HEIGHT = 880;

let activeCard: PublicCardProjection | undefined;
let activeShareSecret: TransientShareSecret | undefined;
let revocableTokenId: ShareTokenId | undefined;
let posterCanvas: WechatMiniprogram.Canvas | undefined;

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

function drawPublicPoster(canvas: WechatMiniprogram.Canvas, card: PublicCardProjection): void {
  const pixelRatio = Math.max(1, Math.min(3, wx.getWindowInfo().pixelRatio));
  canvas.width = POSTER_WIDTH * pixelRatio;
  canvas.height = POSTER_HEIGHT * pixelRatio;
  const context = canvas.getContext('2d');
  context.scale(pixelRatio, pixelRatio);

  context.fillStyle = '#F6F1E7';
  context.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);
  context.fillStyle = '#173C32';
  context.fillRect(0, 0, POSTER_WIDTH, 18);
  context.fillStyle = '#A67C3D';
  context.fillRect(52, 70, 72, 6);

  context.fillStyle = '#173C32';
  context.font = '600 22px sans-serif';
  context.fillText('AB CLUB · DIGITAL CARD', 52, 120);

  context.beginPath();
  context.arc(102, 220, 50, 0, Math.PI * 2);
  context.fillStyle = '#E6DECE';
  context.fill();
  context.fillStyle = '#173C32';
  context.font = '600 30px sans-serif';
  context.textAlign = 'center';
  context.fillText(card.displayName.trim().slice(0, 1) || 'A', 102, 231);
  context.textAlign = 'left';

  context.fillStyle = '#1C2723';
  context.font = '600 42px sans-serif';
  const nameLines = wrapText(context, card.displayName, 410, 2);
  nameLines.forEach((line, index) => context.fillText(line, 180, 205 + index * 50));

  if (card.headline) {
    context.fillStyle = '#64716C';
    context.font = '400 23px sans-serif';
    const headlineLines = wrapText(context, card.headline, 410, 2);
    headlineLines.forEach((line, index) => context.fillText(line, 180, 292 + index * 34));
  }

  context.strokeStyle = '#D9D2C5';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(52, 360);
  context.lineTo(588, 360);
  context.stroke();

  context.fillStyle = '#1C2723';
  context.font = '400 25px sans-serif';
  const biographyLines = wrapText(context, card.biography ?? '愿在同城相识，分享真实、有价值的连接。', 536, 5);
  biographyLines.forEach((line, index) => context.fillText(line, 52, 420 + index * 40));

  const claims = card.claims.slice(0, 3);
  if (claims.length > 0) {
    context.fillStyle = '#173C32';
    context.font = '600 20px sans-serif';
    context.fillText('人工审核有效标签', 52, 650);
    context.font = '400 20px sans-serif';
    context.fillStyle = '#A67C3D';
    context.fillText(claims.map((claim) => claim.labelText.zh).join(' · ').slice(0, 46), 52, 686);
  }

  context.fillStyle = '#173C32';
  context.fillRect(52, 730, 536, 1);
  context.fillStyle = '#64716C';
  context.font = '400 19px sans-serif';
  const footerLines = wrapText(
    context,
    '此海报仅含当前最小公开投影，不包含任何私密资料。小程序码媒体地址尚未进入 1.0 合同，请使用微信名片转发入口。',
    536,
    3,
  );
  footerLines.forEach((line, index) => context.fillText(line, 52, 770 + index * 28));
  context.fillStyle = '#173C32';
  context.font = '600 20px sans-serif';
  context.fillText('AB Club', 52, 858);
}

Page({
  data: {
    runtimeMode: 'OFFLINE_DEMO',
    card: null as PublicCardProjection | null,
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
    posterReady: false,
    posterPath: '',
    posterMessage: '',
    albumDenied: false,
    busyAction: '' as '' | 'CREATE' | 'QR' | 'REVOKE' | 'POSTER' | 'SAVE',
  },

  onLoad() {
    revocableTokenId = readShareRevocationPointer();
    this.setData({
      runtimeMode: getRuntimeEvidence().runtimeMode,
      hasRevocableShare: revocableTokenId !== undefined,
    });
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    void this.loadCard();
  },

  onUnload() {
    activeCard = undefined;
    activeShareSecret = undefined;
    revocableTokenId = undefined;
    posterCanvas = undefined;
  },

  async loadCard() {
    if (this.data.busyAction) return;
    this.setData({ loadingCard: true, pageError: '' });
    const result = await getMyPublicCard();
    if (!result.ok) {
      activeCard = undefined;
      this.setData({ loadingCard: false, pageError: result.message, card: null });
      return;
    }
    activeCard = sanitizePublicCard(result.data.card);
    this.setData({ loadingCard: false, pageError: '', card: activeCard });
  },

  async createShare() {
    if (this.data.busyAction || !activeCard || activeShareSecret || revocableTokenId) return;
    this.setData({
      busyAction: 'CREATE',
      localNotice: '',
      shareState: 'LOADING',
      shareTitle: '正在创建安全入口',
      shareDescription: '令牌由服务端生成；页面不会把 OPENID、手机号或权限参数放入路径。',
    });
    const result = await createCardShare(
      activeCard.cardId,
      activeCard.version,
      shareExpiry(7) as UtcInstant,
    );
    if (
      !result.ok ||
      result.data.targetType !== 'CARD' ||
      result.data.targetId !== activeCard.cardId ||
      !isSafeShareBearer(result.data.token) ||
      !isSafeShareTokenId(result.data.shareTokenId)
    ) {
      this.setData({
        busyAction: '',
        shareState: 'ERROR',
        shareTitle: '创建失败',
        shareDescription: result.ok ? '服务返回的分享入口格式不安全或目标不匹配，请重试。' : result.message,
      });
      return;
    }
    activeShareSecret = {
      token: result.data.token,
      shareTokenId: result.data.shareTokenId,
    };
    revocableTokenId = result.data.shareTokenId;
    const revocationRemembered = rememberShareForRevocation(result.data.shareTokenId);
    this.setData({
      busyAction: '',
      shareState: 'SUCCESS',
      shareTitle: '安全入口已准备',
      shareDescription: revocationRemembered
        ? '点击微信转发后会打开系统面板；是否真正送达以微信界面为准，本页不伪造成功。'
        : '入口已创建，但本机未能保存撤销指针。请在离开本页前撤销，或等待入口自动过期。',
      hasActiveShare: true,
      hasRevocableShare: true,
    });
    wx.showShareMenu({ menus: ['shareAppMessage'] });
  },

  async createQrScene() {
    if (this.data.busyAction || !activeCard || !activeShareSecret) return;
    this.setData({ busyAction: 'QR', qrState: 'LOADING', qrMessage: '正在请求服务端小程序码 scene…' });
    const result = await createCardQrScene(activeShareSecret.shareTokenId, activeCard.version);
    if (
      !result.ok ||
      result.data.targetType !== 'CARD' ||
      result.data.shareTokenId !== activeShareSecret.shareTokenId ||
      !isSafeShareBearer(result.data.scene) ||
      !isSafeShareTokenId(result.data.shareTokenId)
    ) {
      this.setData({
        busyAction: '',
        qrState: 'ERROR',
        qrMessage: result.ok
          ? '服务返回的小程序码目标不匹配。可重试，或直接使用微信名片转发。'
          : `${result.message} 可重试，或直接使用微信名片转发。`,
      });
      return;
    }
    this.setData({
      busyAction: '',
      qrState: 'SUCCESS',
      qrMessage: '服务端已确认创建短 scene 与小程序码资产。冻结响应仅返回资产 ID，没有可绘制 URL；当前不会伪造二维码预览。',
    });
  },

  async revokeShare() {
    if (this.data.busyAction || !activeCard || !revocableTokenId) return;
    this.setData({ busyAction: 'REVOKE' });
    const result = await revokeCardShare(revocableTokenId, activeCard.version);
    if (!result.ok || result.data.shareTokenId !== revocableTokenId) {
      this.setData({
        busyAction: '',
        shareState: 'ERROR',
        shareTitle: '撤销尚未确认',
        shareDescription: result.ok ? '服务返回的撤销目标不匹配，请重试。' : result.message,
      });
      return;
    }
    activeShareSecret = undefined;
    revocableTokenId = undefined;
    forgetShareRevocationPointer();
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    this.setData({
      busyAction: '',
      shareState: 'REVOKED',
      shareTitle: '分享已撤销',
      shareDescription: '服务端已确认撤销；旧 token 与历史小程序码会在下一次解析时失败。',
      hasActiveShare: false,
      hasRevocableShare: false,
      qrState: 'IDLE',
      qrMessage: '',
      localNotice: '',
    });
  },

  handleShareRetry() {
    if (revocableTokenId) {
      void this.revokeShare();
      return;
    }
    void this.createShare();
  },

  clearLocalRevocationPointer() {
    if (!revocableTokenId || activeShareSecret || this.data.busyAction) return;
    wx.showModal({
      title: '仅清除本机记录？',
      content: '这不会撤销服务端入口。若撤销一直失败，旧入口可能继续有效直到过期。',
      confirmText: '清除记录',
      confirmColor: '#8A4338',
      success: (result) => {
        if (!result.confirm) return;
        forgetShareRevocationPointer();
        revocableTokenId = undefined;
        this.setData({
          shareState: '',
          shareTitle: '',
          shareDescription: '',
          hasRevocableShare: false,
          localNotice: '仅清除了本机撤销指针；没有产生服务端撤销成功证据。旧入口可能继续有效直到过期。',
        });
      },
    });
  },

  async generatePoster() {
    if (this.data.busyAction || !activeCard) return;
    this.setData({ busyAction: 'POSTER', posterMessage: '正在使用 Canvas 2D 生成公开投影海报…' });
    const latest = await getMyPublicCard();
    if (!latest.ok) {
      this.setData({
        busyAction: '',
        posterReady: false,
        posterMessage: '无法重新核验最新公开投影，未生成海报。请检查网络后重试。',
      });
      return;
    }
    activeCard = sanitizePublicCard(latest.data.card);
    this.setData({ card: activeCard });
    const canvas = await new Promise<WechatMiniprogram.Canvas | undefined>((resolve) => {
      wx.createSelectorQuery()
        .in(this)
        .select('#cardPoster')
        .node((result) => resolve(result.node as WechatMiniprogram.Canvas | undefined))
        .exec();
    });
    if (!canvas) {
      this.setData({ busyAction: '', posterMessage: 'Canvas 2D 初始化失败，请重试。', posterReady: false });
      return;
    }
    posterCanvas = canvas;
    drawPublicPoster(canvas, activeCard);
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
    if (!tempFilePath) {
      this.setData({ busyAction: '', posterMessage: '海报导出失败，请重试。', posterReady: false });
      return;
    }
    this.setData({
      busyAction: '',
      posterReady: true,
      posterPath: tempFilePath,
      posterMessage: '海报已在本地生成，尚未保存到相册。它只含公开投影，且因合同缺口明确标注“不含小程序码”。',
    });
  },

  async savePosterToAlbum() {
    if (this.data.busyAction || !this.data.posterPath || !posterCanvas) return;
    this.setData({ busyAction: 'SAVE', posterMessage: '正在检查相册权限…' });
    const existingPermission = await getAlbumPermission();
    const granted = existingPermission === true
      ? true
      : existingPermission === false
        ? false
        : await requestAlbumPermission();
    if (!granted) {
      this.setData({
        busyAction: '',
        albumDenied: true,
        posterMessage: '未获得相册权限，未保存图片。你可以打开设置授权后再次点击保存。',
      });
      return;
    }
    const saved = await saveImage(this.data.posterPath);
    this.setData({
      busyAction: '',
      albumDenied: !saved,
      posterMessage: saved
        ? '微信已确认图片保存到相册。'
        : '保存到相册失败，未伪造成功。请检查空间和权限后重试。',
    });
  },

  openAlbumSettings() {
    wx.openSetting({
      success: (result) => {
        const granted = result.authSetting['scope.writePhotosAlbum'] === true;
        this.setData({
          albumDenied: !granted,
          posterMessage: granted
            ? '相册权限已开启，请再次点击“保存到相册”。'
            : '相册权限仍未开启，没有保存任何图片。',
        });
      },
      fail: () => this.setData({ posterMessage: '未能打开权限设置，请稍后重试。' }),
    });
  },

  onShareAppMessage() {
    if (!activeShareSecret || !activeCard || this.data.shareState !== 'SUCCESS') {
      wx.showToast({ title: '请先创建安全分享入口', icon: 'none' });
      return { title: 'AB Club', path: '/pages/card/index' };
    }
    this.setData({
      shareDescription: '已请求打开微信转发面板；是否真正转发以微信系统结果为准。',
    });
    return {
      title: safeShareTitle(activeCard.displayName),
      path: `/pages/card-share/index?token=${encodeURIComponent(activeShareSecret.token)}`,
    };
  },
});
