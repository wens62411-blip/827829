Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    contentId: { type: String, value: '' },
    state: { type: String, value: 'NONE' },
    loading: { type: Boolean, value: false },
    disabled: { type: Boolean, value: false },
    createLabel: { type: String, value: '提交联系意向' },
    cancelLabel: { type: String, value: '取消当前意向' },
  },
  data: {
    isActive: false,
  },
  observers: {
    state(state: string) {
      this.setData({ isActive: state === 'ACTIVE' });
    },
  },
  methods: {
    handleCreate() {
      if (this.properties.loading || this.properties.disabled || !this.properties.contentId) return;
      this.triggerEvent('intentcreate', { contentId: this.properties.contentId });
    },
    handleCancel() {
      if (this.properties.loading || this.properties.disabled || !this.properties.contentId) return;
      this.triggerEvent('intentcancel', { contentId: this.properties.contentId });
    },
  },
});
