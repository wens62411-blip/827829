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

type ShareReference = { readonly token: string } | { readonly scene: string };
type ShareState = 'SUCCESS' | 'EXPIRED' | 'REVOKED' | 'ERROR' | 'LOADING';

let activeReference: ShareReference | undefined;
let resolvingShare = false;
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
  },

  onLoad(options: Record<string, string | undefined>) {
    frozenShareEntry.onLoad.call(this, options);
    this.setData({ runtimeMode: getRuntimeEvidence().runtimeMode });
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
    const normalized = normalizeShareReference(options);
    if (!normalized.ok) {
      activeReference = undefined;
      this.setData({
        state: 'ERROR',
        stateTitle: '入口不可用',
        stateDescription: normalized.message,
        allowRetry: false,
      });
      return;
    }
    activeReference = normalized.reference;
  },

  onShow() {
    if (activeReference) void this.resolveShare();
  },

  onUnload() {
    activeReference = undefined;
    resolvingShare = false;
  },

  onPullDownRefresh() {
    void this.resolveShare(true);
  },

  async resolveShare(fromPullDown: boolean = false) {
    if (!activeReference || resolvingShare) {
      if (fromPullDown) wx.stopPullDownRefresh();
      return;
    }
    resolvingShare = true;
    this.setData({
      state: 'LOADING',
      stateTitle: '正在重新核验',
      stateDescription: '每次返回页面都会重新检查权限，不沿用旧页面结果。',
      card: null,
      allowForward: false,
    });
    const result = await resolveCardShare(activeReference);
    if (!result.ok) {
      const failureState = stateForFailure(result);
      this.setData({
        ...failureState,
        allowRetry: result.retryable || result.code === 'TOKEN_INVALID',
        allowForward: false,
      });
      resolvingShare = false;
      if (fromPullDown) wx.stopPullDownRefresh();
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
      resolvingShare = false;
      if (fromPullDown) wx.stopPullDownRefresh();
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
    resolvingShare = false;
    wx.showShareMenu({ menus: ['shareAppMessage'] });
    if (fromPullDown) wx.stopPullDownRefresh();
  },

  handleRetry() {
    void this.resolveShare();
  },

  onShareAppMessage() {
    const card = this.data.card;
    if (!activeReference || !card || this.data.state !== 'SUCCESS') {
      wx.showToast({ title: '当前入口不可转发', icon: 'none' });
      return { title: 'AB Club', path: '/pages/discover/index' };
    }
    const query = 'token' in activeReference
      ? `token=${encodeURIComponent(activeReference.token)}`
      : `scene=${encodeURIComponent(activeReference.scene)}`;
    return {
      title: safeShareTitle(card.displayName),
      path: `/pages/card-share/index?${query}`,
    };
  },
});
