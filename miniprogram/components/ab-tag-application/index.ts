Component({
  options: {
    styleIsolation: 'isolated',
  },
  properties: {
    labelId: { type: String, value: '' },
    nameZh: { type: String, value: '' },
    nameEn: { type: String, value: '' },
    descriptionZh: { type: String, value: '' },
    enabled: { type: Boolean, value: true },
    selected: { type: Boolean, value: false },
    busy: { type: Boolean, value: false },
  },
  methods: {
    onSelect() {
      if (!this.data.enabled || this.data.busy) return;
      this.triggerEvent('select', { labelId: this.data.labelId });
    },
  },
});
