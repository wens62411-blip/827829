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
    hidden: true,
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
      if (pendingPath) {
        // 先切页（转场层仍盖住屏幕），切完再淡出，避免淡出时露出旧页面造成闪烁
        wx.switchTab({
          url: pendingPath,
          success: () => this.setData({ loadingVisible: false, pendingPath: '' }),
          fail: () => this.setData({ loadingVisible: false, pendingPath: '' }),
        });
      } else {
        this.setData({ loadingVisible: false });
      }
    },
  },
});
