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
  data: {
    recordOriginLabel: '来源待确认',
    evidenceScopeLabel: '',
  },
  observers: {
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
    handleCopy() {
      const sourceUrl = this.properties.sourceUrl.trim();
      if (!sourceUrl) return;
      this.triggerEvent('sourcecopy', { sourceUrl }, { bubbles: true, composed: true });
    },
  },
});
