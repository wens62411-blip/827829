import { PEARL_CATEGORIES, PEARL_CONTACT_WECHAT, PEARL_IMAGE_CREDITS, PEARL_STYLES, findPearlCategory, pearlPreviewImages } from '../../data/pearls';

Page({
  data: {
    categories: PEARL_CATEGORIES,
    styles: PEARL_STYLES,
    imageCredits: PEARL_IMAGE_CREDITS,
    activeCategory: 'freshwater',
    selectionLabel: '淡水珠',
    contactContext: 'AB Club 珍珠选珠 · 淡水珠',
    contactWechat: PEARL_CONTACT_WECHAT,
    imageFailures: {} as Record<string, boolean>,
    showImageCredits: false,
    copying: false,
  },

  onLoad(options: Record<string, string | undefined>) {
    const category = findPearlCategory(options.category);
    if (category) this.selectPearl(category.id);
  },

  selectPearl(id: string) {
    const category = findPearlCategory(id);
    if (!category) return;
    this.setData({ activeCategory: category.id, selectionLabel: category.title, contactContext: `AB Club 珍珠选珠 · ${category.title}` });
  },

  chooseCategory(event: WechatMiniprogram.CustomEvent) {
    this.selectPearl(String(event.currentTarget.dataset.id ?? ''));
  },

  previewPhoto(event: WechatMiniprogram.CustomEvent) {
    const current = String(event.currentTarget.dataset.src ?? '');
    const urls = pearlPreviewImages();
    if (!urls.includes(current)) return;
    wx.previewImage({ current, urls, fail: () => wx.showToast({ title: '图片暂时无法打开，请稍后再试', icon: 'none' }) });
  },

  handleImageError(event: WechatMiniprogram.CustomEvent) {
    const id = String(event.currentTarget.dataset.id ?? '');
    if (!PEARL_IMAGE_CREDITS.some((credit) => credit.id === id)) return;
    this.setData({ [`imageFailures.${id}`]: true });
  },

  handleContact(event: WechatMiniprogram.CustomEvent<{ errMsg?: string; path?: string; query?: Record<string, unknown> }>) {
    const message = event.detail.errMsg ?? '';
    if (message && !/:ok$/.test(message)) {
      if (!/cancel/i.test(message)) wx.showToast({ title: '客服暂未接通，可复制下方微信号联系', icon: 'none' });
      return;
    }
    const path = typeof event.detail.path === 'string' ? event.detail.path.replace(/^\//, '') : '';
    if (path !== 'packageEvents/pages/pearls/index') return;
    const category = findPearlCategory(event.detail.query?.category);
    if (category) this.selectPearl(category.id);
  },

  copyWechat() {
    if (this.data.copying) return;
    this.setData({ copying: true });
    try {
      wx.setClipboardData({
        data: PEARL_CONTACT_WECHAT,
        success: () => wx.showToast({ title: '微信号已复制', icon: 'success' }),
        fail: () => wx.showToast({ title: '请长按微信号复制', icon: 'none' }),
        complete: () => this.setData({ copying: false }),
      });
    } catch (_error) {
      this.setData({ copying: false });
      wx.showToast({ title: '请长按微信号复制', icon: 'none' });
    }
  },

  toggleImageCredits() {
    this.setData({ showImageCredits: !this.data.showImageCredits });
  },

  copyImageSource(event: WechatMiniprogram.CustomEvent) {
    const credit = PEARL_IMAGE_CREDITS.find((item) => item.id === event.currentTarget.dataset.id);
    if (!credit) return;
    try {
      wx.setClipboardData({ data: `${credit.title}\n${credit.author}\n${credit.sourceUrl}\n${credit.license} ${credit.licenseUrl}`, fail: () => wx.showToast({ title: '请长按来源链接复制', icon: 'none' }) });
    } catch (_error) {
      wx.showToast({ title: '请长按来源链接复制', icon: 'none' });
    }
  },

  onShareAppMessage() {
    return { title: 'AB Club · 灵气珍珠', path: '/packageEvents/pages/pearls/index', imageUrl: '/assets/brand/ab-club-brand-share.jpg' };
  },
});
