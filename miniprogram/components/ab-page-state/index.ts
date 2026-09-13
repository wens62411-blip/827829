Component({
  options: {
    multipleSlots: true,
    styleIsolation: 'apply-shared',
  },
  properties: {
    eyebrow: { type: String, value: 'AB Club' },
    title: { type: String, value: '敬请期待' },
    description: { type: String, value: '' },
    runtimeMode: { type: String, value: 'OFFLINE_DEMO' },
  },
});

