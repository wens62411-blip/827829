import { CALENDAR_MONTHS, CALENDAR_MONTH_NAV, CALENDAR_YEAR } from '../../data/calendar';

Page({
  data: {
    year: CALENDAR_YEAR,
    monthNav: CALENDAR_MONTH_NAV,
    months: CALENDAR_MONTHS,
    activeMonthAnchor: CALENDAR_MONTHS[0]?.anchor ?? 'month-jan',
  },

  onShow() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar) tabBar.setData({ selected: 1, hidden: false });
  },

  jumpToMonth(event: WechatMiniprogram.CustomEvent) {
    const anchor = String(event.currentTarget.dataset.anchor ?? '');
    if (!CALENDAR_MONTH_NAV.some((item) => item.anchor === anchor)) return;
    // Reset the native target so a second tap also returns to a manually scrolled month.
    this.setData({ activeMonthAnchor: '' }, () => {
      this.setData({ activeMonthAnchor: anchor });
    });
  },

  openCalendarEvent(event: WechatMiniprogram.CustomEvent) {
    const id = String(event.currentTarget.dataset.eventId ?? '');
    const entry = CALENDAR_MONTHS.flatMap((month) => month.events).find((item) => item.id === id);
    if (!entry) return;
    wx.showModal({
      title: entry.titleZh,
      content: `${entry.titleEn}\n${entry.date}\n${entry.venue}\n\n${entry.summary}`,
      showCancel: false,
      confirmText: '返回年历',
    });
  },

  onShareAppMessage() {
    return {
      title: `AB Club · ${CALENDAR_YEAR} 全球艺术日历`,
      path: '/packageEvents/pages/calendar/index',
      imageUrl: '/assets/brand/ab-club-brand-share.jpg',
    };
  },
});
