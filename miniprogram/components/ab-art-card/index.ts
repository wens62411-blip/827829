Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    contentId: { type: String, value: '' },
    title: { type: String, value: '' },
    summary: { type: String, value: '' },
    categoryLabel: { type: String, value: '' },
    creatorName: { type: String, value: '' },
    cityName: { type: String, value: '' },
    recordOrigin: { type: String, value: '' },
    evidenceScope: { type: String, value: '' },
    imageUrl: { type: String, value: '' },
    alt: { type: String, value: '' },
    imageAllowed: { type: Boolean, value: false },
  },
  data: {
    imageFailed: false,
    showImage: false,
    recordOriginLabel: '来源待确认',
    evidenceScopeLabel: '',
  },
  observers: {
    'imageUrl,imageAllowed'(imageUrl: string, imageAllowed: boolean) {
      this.setData({
        imageFailed: false,
        showImage: imageAllowed && imageUrl.trim().length > 0,
      });
    },
    'recordOrigin,evidenceScope'(recordOrigin: string, evidenceScope: string) {
      this.setData({
        recordOriginLabel: recordOrigin === 'SYNTHETIC'
          ? '合成示例'
          : recordOrigin === 'REAL'
            ? '公开记录'
            : '来源待确认',
        evidenceScopeLabel: evidenceScope === 'DEMO_ONLY'
          ? '非真实作品'
          : evidenceScope === 'PUBLIC'
            ? '公开内容'
            : '',
      });
    },
  },
  methods: {
    handleActivate() {
      if (!this.properties.contentId) return;
      this.triggerEvent('select', { contentId: this.properties.contentId });
    },
    handleImageError() {
      this.setData({ imageFailed: true, showImage: false });
      this.triggerEvent('imageerror', {
        contentId: this.properties.contentId,
        alt: this.properties.alt,
      });
    },
  },
});
