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

let introShown = false;
let safetyTimer: number | null = null;

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

  lifetimes: {
    attached() {
      // 冷启动入场动画：一次进程只放一次，避免开发者热重载反复弹
      if (introShown) return;
      introShown = true;
      this.setData({ loadingVisible: true });
      // 真机兜底：lazyCodeLoading 下自定义 tabBar 的嵌套组件初始化时序可能错乱，
      // loading-city 的 complete 事件收不到，遮罩会一直盖屏转圈。最多 2.5s 强制收起，
      // 保证任何机型都能进到页面（正常 1.2s 内 complete 已触发，此兜底不生效）。
      safetyTimer = setTimeout(() => {
        safetyTimer = null;
        if (this.data.loadingVisible) this.setData({ loadingVisible: false });
      }, 2500) as unknown as number;
    },
    detached() {
      if (safetyTimer !== null) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
    },
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
