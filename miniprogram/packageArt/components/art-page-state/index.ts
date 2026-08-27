Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    kind: { type: String, value: 'LOADING' },
    title: { type: String, value: '' },
    description: { type: String, value: '' },
    weakNetwork: { type: Boolean, value: false },
    retryable: { type: Boolean, value: false },
  },
  methods: {
    handleRetry() {
      if (!this.properties.retryable) return;
      this.triggerEvent('retry', { kind: this.properties.kind });
    },
  },
});
