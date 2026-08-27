Component({
  options: {
    multipleSlots: true,
    styleIsolation: 'apply-shared',
  },
  properties: {
    eyebrow: { type: String, value: 'AB Club' },
    title: { type: String, value: '模块待接入' },
    description: { type: String, value: '当前仅提供接口和导航骨架。' },
    runtimeMode: { type: String, value: 'OFFLINE_DEMO' },
  },
});

