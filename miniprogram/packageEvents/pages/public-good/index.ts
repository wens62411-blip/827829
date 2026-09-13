import { PUBLIC_GOOD_CATEGORIES, type PublicGoodAction } from '../../data/public-good';
import { publicGoodStore, type PublicGoodSnapshot } from '../../services/public-good';

interface ActionRow extends PublicGoodAction {
  completed: boolean;
  selected: boolean;
  number: string;
}

Page({
  data: {
    categories: PUBLIC_GOOD_CATEGORIES.map((item) => ({ id: item.id, name: item.displayName, number: item.number })),
    selectedCategoryId: PUBLIC_GOOD_CATEGORIES[0]!.id,
    selectedCategoryName: PUBLIC_GOOD_CATEGORIES[0]!.displayName,
    categoryActions: [] as ActionRow[],
    categoryCompleted: 0,
    current: null as PublicGoodAction | null,
    currentCompleted: false,
    completedCount: 0,
    totalCount: 100,
    drawing: false,
    celebrating: false,
    saveFailed: false,
    repaired: false,
  },
  _visible: false,
  _drawTimer: null as ReturnType<typeof setTimeout> | null,
  _celebrateTimer: null as ReturnType<typeof setTimeout> | null,

  onShow() {
    this._visible = true;
    this.applySnapshot(publicGoodStore.snapshot());
  },

  onHide() {
    this.stopAnimations();
  },

  onUnload() {
    this.stopAnimations();
  },

  stopAnimations() {
    this._visible = false;
    if (this._drawTimer !== null) clearTimeout(this._drawTimer);
    if (this._celebrateTimer !== null) clearTimeout(this._celebrateTimer);
    this._drawTimer = null;
    this._celebrateTimer = null;
    this.setData({ drawing: false, celebrating: false });
  },

  applySnapshot(snapshot: PublicGoodSnapshot) {
    const category = PUBLIC_GOOD_CATEGORIES.find((item) => item.id === this.data.selectedCategoryId) ?? PUBLIC_GOOD_CATEGORIES[0]!;
    const completed = new Set(snapshot.completedIds);
    this.setData({
      current: snapshot.current,
      currentCompleted: snapshot.currentCompleted,
      completedCount: snapshot.completedCount,
      saveFailed: snapshot.saveFailed,
      repaired: snapshot.repaired,
      selectedCategoryName: category.displayName,
      categoryCompleted: category.actions.filter((action) => completed.has(action.id)).length,
      categoryActions: category.actions.map((action, index) => ({
        ...action,
        completed: completed.has(action.id),
        selected: snapshot.current?.id === action.id,
        number: String(index + 1).padStart(2, '0'),
      })),
    });
  },

  drawAction() {
    if (!this._visible || this.data.drawing) return;
    if (this._celebrateTimer !== null) clearTimeout(this._celebrateTimer);
    this.setData({ drawing: true, celebrating: false });
    this._drawTimer = setTimeout(() => {
      this._drawTimer = null;
      if (!this._visible) return;
      this.applySnapshot(publicGoodStore.draw());
      this.setData({ drawing: false });
    }, 360);
  },

  completeAction() {
    if (!this._visible || this.data.drawing || this.data.currentCompleted) return;
    const result = publicGoodStore.complete();
    this.applySnapshot(result.snapshot);
    if (!result.added) return;
    if (this._celebrateTimer !== null) clearTimeout(this._celebrateTimer);
    this.setData({ celebrating: true });
    this._celebrateTimer = setTimeout(() => {
      this._celebrateTimer = null;
      if (this._visible) this.setData({ celebrating: false });
    }, 1000);
  },

  selectCategory(event: WechatMiniprogram.CustomEvent) {
    const id = String(event.currentTarget.dataset.id ?? '');
    if (!PUBLIC_GOOD_CATEGORIES.some((item) => item.id === id)) return;
    this.setData({ selectedCategoryId: id });
    this.applySnapshot(publicGoodStore.snapshot());
  },

  selectAction(event: WechatMiniprogram.CustomEvent) {
    if (!this._visible || this.data.drawing) return;
    const id = String(event.currentTarget.dataset.id ?? '');
    if (!PUBLIC_GOOD_CATEGORIES.some((item) => item.actions.some((action) => action.id === id))) return;
    if (this._celebrateTimer !== null) clearTimeout(this._celebrateTimer);
    this.setData({ celebrating: false });
    this.applySnapshot(publicGoodStore.select(id));
    wx.pageScrollTo({ scrollTop: 0, duration: 250 });
  },

  retrySave() {
    const snapshot = publicGoodStore.retrySave();
    this.applySnapshot(snapshot);
    if (!snapshot.saveFailed) wx.showToast({ title: '记录已保存', icon: 'success' });
  },

  onShareAppMessage() {
    return {
      title: 'AB Club · 100 件公益小事',
      path: '/packageEvents/pages/public-good/index',
      imageUrl: '/assets/brand/ab-club-brand-share.jpg',
    };
  },
});
