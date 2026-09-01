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

const activeTimers = new WeakMap<object, ReturnType<typeof setTimeout>>();

function pickRandomCity(preferredId?: string): LoadingCity {
  if (preferredId) {
    const found = CITY_LIST.find((city) => city.id === preferredId);
    if (found) return found;
  }
  return CITY_LIST[Math.floor(Math.random() * CITY_LIST.length)]!;
}

function clearActiveTimer(instance: object) {
  const timer = activeTimers.get(instance);
  if (timer === undefined) return;
  clearTimeout(timer);
  activeTimers.delete(instance);
}

Component({
  options: {
    styleIsolation: 'apply-shared',
  },
  properties: {
    visible: { type: Boolean, value: false, observer: 'onVisibleChange' },
    cityId: { type: String, value: '' },
    minDuration: { type: Number, value: 1200 },
    maxDuration: { type: Number, value: 1200 },
  },
  data: {
    city: pickRandomCity() as LoadingCity,
    progressDuration: 1200,
  },

  lifetimes: {
    detached() {
      clearActiveTimer(this);
    },
  },

  methods: {
    onVisibleChange(newVal: boolean) {
      clearActiveTimer(this);
      if (!newVal) return;

      const min = Math.max(0, this.data.minDuration);
      const max = Math.max(min, this.data.maxDuration);
      const duration = Math.floor(min + Math.random() * (max - min));
      const city = pickRandomCity(this.data.cityId || undefined);
      this.setData({ city, progressDuration: duration });

      const timer = setTimeout(() => {
        if (activeTimers.get(this) !== timer) return;
        activeTimers.delete(this);
        this.triggerEvent('complete', { cityId: city.id, zh: city.zh, en: city.en });
      }, duration);
      activeTimers.set(this, timer);
    },
  },
});
