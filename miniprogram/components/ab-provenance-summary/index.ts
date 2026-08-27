Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    sourceTitle: { type: String, value: '' },
    sourceUrl: { type: String, value: '' },
    recordOrigin: { type: String, value: '' },
    evidenceScope: { type: String, value: '' },
    publicationState: { type: String, value: '' },
    reviewedAt: { type: String, value: '' },
    rightsStatus: { type: String, value: '' },
    rightsReviewedAt: { type: String, value: '' },
    platformStatement: {
      type: String,
      value: '平台仅展示资料与第三方报告引用，不提供真伪鉴定结论。',
    },
  },
  methods: {
    handleSourceCopy(event: WechatMiniprogram.CustomEvent<{ sourceUrl: string }>) {
      this.triggerEvent('sourcecopy', { sourceUrl: event.detail.sourceUrl }, { bubbles: true, composed: true });
    },
  },
});
