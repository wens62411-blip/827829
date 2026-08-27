Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    sourceTitle: { type: String, value: '' },
    sourceUrl: { type: String, value: '' },
    recordOrigin: { type: String, value: '' },
    evidenceScope: { type: String, value: '' },
  },
  methods: {
    handleCopy() {
      const sourceUrl = this.properties.sourceUrl.trim();
      if (!sourceUrl) return;
      this.triggerEvent('sourcecopy', { sourceUrl }, { bubbles: true, composed: true });
    },
  },
});
