type ActivityPortalId = 'calendar' | 'pearls' | 'public-good';

interface ActivityPortalView {
  readonly id: ActivityPortalId;
  readonly index: string;
  readonly titleEn: string;
  readonly titleZh: string;
  readonly summary: string;
  readonly actionLabel: string;
}

const ACTIVITY_PORTALS: readonly ActivityPortalView[] = [
  {
    id: 'calendar',
    index: '01',
    titleEn: 'GLOBAL ART CALENDAR',
    titleZh: '全球艺术日历',
    summary: '一整年的艺术世界，在城市之间展开。',
    actionLabel: 'VIEW CALENDAR',
  },
  {
    id: 'public-good',
    index: '02',
    titleEn: 'PUBLIC GOOD',
    titleZh: '公益',
    summary: '100 件公益小事，从今天的一份善意开始。',
    actionLabel: 'DRAW A LITTLE GOOD',
  },
  {
    id: 'pearls',
    index: '03',
    titleEn: 'SPIRIT PEARLS',
    titleZh: '珍珠展示',
    summary: '灵气珍珠 · 从一颗裸珠，到属于你的设计。',
    actionLabel: 'EXPLORE PEARLS',
  },
] as const;

Page({
  data: {
    portals: ACTIVITY_PORTALS,
    brandLogoFailed: false,
  },

  onShow() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar) tabBar.setData({ selected: 1, hidden: false });
  },

  openPortal(event: WechatMiniprogram.CustomEvent) {
    const portalId = String(event.currentTarget.dataset.portalId ?? '') as ActivityPortalId;
    if (portalId === 'calendar') {
      void wx.navigateTo({ url: '/packageEvents/pages/calendar/index' });
      return;
    }

    if (portalId === 'public-good') {
      void wx.navigateTo({ url: '/packageEvents/pages/public-good/index' });
      return;
    }
    if (portalId === 'pearls') {
      void wx.navigateTo({ url: '/packageEvents/pages/pearls/index' });
    }
  },

  onBrandLogoError() {
    this.setData({ brandLogoFailed: true });
  },

  onShareAppMessage() {
    return {
      title: 'AB Club · 全球文化与生活方式入口',
      path: '/pages/events/index',
      imageUrl: '/assets/brand/ab-club-brand-share.jpg',
    };
  },
});
