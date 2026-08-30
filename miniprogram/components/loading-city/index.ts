import { CITY_DIRECTORY } from '../../shared/constants/geography';

interface LoadingCity {
  readonly id: string;
  readonly zh: string;
  readonly en: string;
  readonly iconPath: string;
}

const CITY_LIST: readonly LoadingCity[] = CITY_DIRECTORY.map((city) => ({
  id: city.id,
  zh: city.name.zh,
  en: city.name.en,
  iconPath: `/assets/city-line-icons/${city.id}.svg`,
}));

let activeTimer: number | null = null;

function pickRandomCity(preferredId?: string): LoadingCity {
  if (preferredId) {
    const found = CITY_LIST.find((city) => city.id === preferredId);
    if (found) return found;
  }
  return CITY_LIST[Math.floor(Math.random() * CITY_LIST.length)]!;
}

function clearActiveTimer() {
  if (activeTimer !== null) {
    clearTimeout(activeTimer);
    activeTimer = null;
  }
}

Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    visible: { type: Boolean, value: false, observer: 'onVisibleChange' },
    cityId: { type: String, value: '' },
    minDuration: { type: Number, value: 3000 },
    maxDuration: { type: Number, value: 3000 },
  },
  data: {
    city: pickRandomCity() as LoadingCity,
    progressDuration: 3000,
  },

  lifetimes: {
    detached() {
      clearActiveTimer();
    },
  },

  methods: {
    onVisibleChange(newVal: boolean) {
      clearActiveTimer();
      if (!newVal) return;

      const min = Math.max(0, this.data.minDuration);
      const max = Math.max(min, this.data.maxDuration);
      const duration = Math.floor(min + Math.random() * (max - min));
      const city = pickRandomCity(this.data.cityId || undefined);
      this.setData({ city, progressDuration: duration });

      activeTimer = setTimeout(() => {
        activeTimer = null;
        this.triggerEvent('complete', { cityId: city.id, zh: city.zh, en: city.en });
      }, duration) as unknown as number;
    },
  },
});
