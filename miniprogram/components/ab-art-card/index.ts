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
  },
  observers: {
    'imageUrl,imageAllowed'(imageUrl: string, imageAllowed: boolean) {
      this.setData({
        imageFailed: false,
        showImage: imageAllowed && imageUrl.trim().length > 0,
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
