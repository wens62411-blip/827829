import { RuntimeMode } from '../../shared/types/enums';

const LABELS = {
  LIVE: { label: '正式服务', tone: 'live' },
  DEGRADED: { label: '服务受限', tone: 'degraded' },
  OFFLINE_DEMO: { label: '本机预览', tone: 'offline' },
} as const;

Component({
  properties: {
    mode: { type: String, value: 'OFFLINE_DEMO' },
  },
  data: {
    label: LABELS.OFFLINE_DEMO.label as string,
    tone: LABELS.OFFLINE_DEMO.tone as string,
  },
  observers: {
    mode(mode: string) {
      const normalized =
        mode === RuntimeMode.LIVE || mode === RuntimeMode.DEGRADED
          ? mode
          : RuntimeMode.OFFLINE_DEMO;
      this.setData(LABELS[normalized]);
    },
  },
});
