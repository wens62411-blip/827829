interface TabItem {
  readonly pagePath: string;
  readonly text: string;
  readonly iconPath: string;
  readonly selectedIconPath: string;
}

const TAB_LIST: readonly TabItem[] = [
  {
    pagePath: '/pages/discover/index',
    text: '发现',
    iconPath: '/assets/icons/tab-home.png',
    selectedIconPath: '/assets/icons/tab-home-active.png',
  },
  {
    pagePath: '/pages/events/index',
    text: '活动',
    iconPath: '/assets/icons/tab-events.png',
    selectedIconPath: '/assets/icons/tab-events-active.png',
  },
  {
    pagePath: '/pages/me/index',
    text: '我的',
    iconPath: '/assets/icons/tab-me.png',
    selectedIconPath: '/assets/icons/tab-me-active.png',
  },
] as const;

Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  data: {
    selected: 0,
    loadingVisible: false,
    list: TAB_LIST,
    pendingPath: '',
  },

  methods: {
    switchTab(event: WechatMiniprogram.TouchEvent) {
      const index = Number(event.currentTarget.dataset.index);
      const path = String(event.currentTarget.dataset.path || '');

      if (index === this.data.selected || this.data.loadingVisible || !path) {
        return;
      }

      this.setData({ selected: index, loadingVisible: true, pendingPath: path });
    },

    onLoadingComplete() {
      const { pendingPath } = this.data;
      this.setData({ loadingVisible: false });
      if (pendingPath) {
        wx.switchTab({ url: pendingPath });
      }
    },
  },
});
