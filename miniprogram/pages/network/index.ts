import type { FriendRequestProjection, PublicCardProjection } from '../../shared/types/projections';
import { callSocialAction, socialErrorMessage } from './services/social-client';

interface AcceptedCardView {
  readonly ownerUserId: string;
  readonly displayName: string;
  readonly headline: string;
  readonly avatarUrl: string;
}

interface DemoRecommendation {
  readonly id: string;
  readonly initials: string;
  readonly displayName: string;
  readonly role: string;
  readonly cityLine: string;
  readonly reason: string;
  readonly interests: readonly string[];
}

const DEMO_RECOMMENDATIONS: readonly DemoRecommendation[] = [
  {
    id: 'demo-connector-singapore', initials: 'AC', displayName: 'Alex Chen（虚构演示）',
    role: '跨境品牌策略 · 自述信息', cityLine: '深圳 ↔ 新加坡',
    reason: '匹配理由：共同关注全球品牌、同城私享活动与艺术机构合作。',
    interests: ['全球商业', '艺术合作', '同城活动'],
  },
  {
    id: 'demo-collector-zurich', initials: 'LM', displayName: 'Léa Martin（虚构演示）',
    role: '收藏研究 · 自述信息', cityLine: '巴黎 ↔ 苏黎世',
    reason: '匹配理由：共同关注古董资料研究、珠宝品鉴与欧洲城市节点。',
    interests: ['古董资料', '珠宝品鉴', '欧洲节点'],
  },
  {
    id: 'demo-curator-sydney', initials: 'JW', displayName: 'Jordan Wu（虚构演示）',
    role: '文化项目策划 · 自述信息', cityLine: '悉尼 ↔ 墨尔本',
    reason: '匹配理由：共同关注艺术活动策划、跨城会员连接与线下交流。',
    interests: ['艺术策划', '澳洲节点', '会员连接'],
  },
];

interface SocialApp {
  readonly globalData?: { readonly runtimeMode?: string; readonly cloudEnvironmentConfigured?: boolean };
}

function toAcceptedCardView(card: PublicCardProjection): AcceptedCardView {
  return {
    ownerUserId: card.ownerUserId,
    displayName: card.displayName,
    headline: card.headline ?? '',
    avatarUrl: card.avatarUrl ?? '',
  };
}

Page({
  data: {
    runtimeMode: 'OFFLINE_DEMO',
    loading: false,
    loaded: false,
    errorMessage: '',
    incomingPreview: [] as FriendRequestProjection[],
    acceptedPreview: [] as AcceptedCardView[],
    incomingLoadedCount: 0,
    acceptedLoadedCount: 0,
    recommendations: DEMO_RECOMMENDATIONS,
    demoOnly: true,
  },

  onShow() {
    void this.loadOverview();
  },

  async loadOverview() {
    if (this.data.loading) return;
    this.setData({ loading: true, errorMessage: '' });
    const runtime = getApp<SocialApp>().globalData;
    const runtimeMode = runtime?.runtimeMode ?? 'OFFLINE_DEMO';
    if (runtimeMode === 'OFFLINE_DEMO') {
      this.setData({
        runtimeMode,
        loading: false,
        loaded: true,
        demoOnly: true,
        recommendations: DEMO_RECOMMENDATIONS,
        incomingPreview: [],
        acceptedPreview: [],
        incomingLoadedCount: 0,
        acceptedLoadedCount: 0,
      });
      wx.stopPullDownRefresh();
      return;
    }
    if (runtimeMode !== 'LIVE' || runtime?.cloudEnvironmentConfigured !== true) {
      this.setData({
        runtimeMode,
        loading: false,
        loaded: false,
        demoOnly: false,
        recommendations: [],
        incomingPreview: [],
        acceptedPreview: [],
        incomingLoadedCount: 0,
        acceptedLoadedCount: 0,
        errorMessage: '当前模式未连接正式人脉服务；不会回退到演示关系或伪造申请结果。',
      });
      wx.stopPullDownRefresh();
      return;
    }
    this.setData({ runtimeMode, demoOnly: false, recommendations: [] });
    try {
      const [incoming, accepted] = await Promise.all([
        callSocialAction('friend.listIncoming', { includeExpired: false, limit: 20 }),
        callSocialAction('friend.listAccepted', { limit: 20 }),
      ]);
      this.setData({
        loaded: true,
        incomingPreview: incoming.page.items.slice(0, 2),
        acceptedPreview: accepted.page.items.slice(0, 4).map(toAcceptedCardView),
        incomingLoadedCount: incoming.page.items.length,
        acceptedLoadedCount: accepted.page.items.length,
      });
    } catch (error) {
      this.setData({ loaded: false, errorMessage: socialErrorMessage(error) });
    } finally {
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },

  onPullDownRefresh() {
    void this.loadOverview();
  },

  onDemoRequest() {
    wx.showToast({ title: 'DEMO_ONLY：未提交申请', icon: 'none', duration: 2400 });
  },
});
