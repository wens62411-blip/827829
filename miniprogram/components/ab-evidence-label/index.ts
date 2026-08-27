import { RuntimeMode } from '../../shared/types/enums';

const LABELS = {
  LIVE: { label: 'LIVE', tone: 'live' },
  DEGRADED: { label: 'DEGRADED', tone: 'degraded' },
  OFFLINE_DEMO: { label: 'OFFLINE_DEMO', tone: 'offline' },
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
