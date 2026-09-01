import { CITY_DIRECTORY } from '../../shared/constants/geography';

interface EntryCity {
  readonly zh: string;
  readonly en: string;
  readonly country: string;
  readonly imagePath: string;
}

interface EntryFilmData {
  readonly visible: boolean;
  readonly sceneIndex: number;
  readonly cityIndex: number;
  readonly city: EntryCity;
  readonly nextCity: EntryCity;
  readonly fastFlash: boolean;
  readonly exiting: boolean;
  readonly tapHintVisible: boolean;
  readonly imageFailed: boolean;
}

interface EntryFilmInstance {
  readonly data: EntryFilmData;
  setData(data: Partial<EntryFilmData>, callback?: () => void): void;
  triggerEvent(name: string, detail?: Record<string, unknown>): void;
}

interface EntryFilmRuntime {
  autoTimer?: ReturnType<typeof setTimeout>;
  cityTimer?: ReturnType<typeof setInterval>;
  transitionTimer?: ReturnType<typeof setTimeout>;
  exitTimer?: ReturnType<typeof setTimeout>;
  generation: number;
  lastTapTimestamp: number;
  pendingTaps: number;
  started: boolean;
  transitioning: boolean;
  completed: boolean;
  completionReason: 'auto' | 'tap' | 'skip';
}

const CITY_FRAME_MS = 92;
const FAST_FLASH_MS = 72;
const FAST_SETTLE_MS = 82;
const AUTO_FLASH_MS = 118;
const AUTO_SETTLE_MS = 132;
const EXIT_MS = 460;
// The manor layers settle in about one second, then remain still for about one second.
const FINAL_FRAME_HOLD_MS = 2100;
const SCENE_DURATIONS = [CITY_DIRECTORY.length * CITY_FRAME_MS, 1600, 1600, 1450, FINAL_FRAME_HOLD_MS] as const;
const LAST_SCENE_INDEX = SCENE_DURATIONS.length - 1;

const ENTRY_CITIES: readonly EntryCity[] = CITY_DIRECTORY.map((city) => ({
    zh: city.name.zh,
    en: city.name.en.toUpperCase(),
    country: city.id.slice(0, 2).toUpperCase(),
    imagePath: `/assets/cities/${city.id}.jpg`,
}));

function getNextCity(cityIndex: number): EntryCity {
  return ENTRY_CITIES[Math.min(cityIndex + 1, ENTRY_CITIES.length - 1)]!;
}

const runtimes = new WeakMap<object, EntryFilmRuntime>();

function clearPlaybackTimers(runtime: EntryFilmRuntime) {
  if (runtime.autoTimer !== undefined) clearTimeout(runtime.autoTimer);
  if (runtime.cityTimer !== undefined) clearInterval(runtime.cityTimer);
  delete runtime.autoTimer;
  delete runtime.cityTimer;
}

function clearAllTimers(runtime: EntryFilmRuntime) {
  clearPlaybackTimers(runtime);
  if (runtime.transitionTimer !== undefined) clearTimeout(runtime.transitionTimer);
  if (runtime.exitTimer !== undefined) clearTimeout(runtime.exitTimer);
  delete runtime.transitionTimer;
  delete runtime.exitTimer;
  runtime.generation += 1;
}

function armScene(instance: EntryFilmInstance, sceneIndex: number) {
  const runtime = runtimes.get(instance);
  if (!runtime || !instance.data.visible || instance.data.exiting) return;

  clearPlaybackTimers(runtime);
  const generation = ++runtime.generation;

  if (sceneIndex === 0) {
    runtime.cityTimer = setInterval(() => {
      if (runtime.generation !== generation || instance.data.sceneIndex !== 0) return;
      const cityIndex = Math.min(instance.data.cityIndex + 1, ENTRY_CITIES.length - 1);
      if (cityIndex === instance.data.cityIndex) return;
      instance.setData({ cityIndex, city: ENTRY_CITIES[cityIndex]!, nextCity: getNextCity(cityIndex) });
    }, CITY_FRAME_MS);
  }

  runtime.autoTimer = setTimeout(() => {
    if (runtime.generation !== generation) return;
    requestAdvance(instance, false);
  }, SCENE_DURATIONS[sceneIndex]!);
}

function completeIntro(instance: EntryFilmInstance) {
  const runtime = runtimes.get(instance);
  if (!runtime || runtime.completed) return;
  runtime.completed = true;
  runtime.transitioning = false;
  clearAllTimers(runtime);
  instance.setData({ visible: false, exiting: false, fastFlash: false, tapHintVisible: false });
  instance.triggerEvent('complete', { reason: runtime.completionReason });
}

function skipIntro(instance: EntryFilmInstance) {
  const runtime = runtimes.get(instance);
  if (!runtime || runtime.completed || !instance.data.visible) return;
  runtime.pendingTaps = 0;
  runtime.transitioning = false;
  runtime.completionReason = 'skip';
  completeIntro(instance);
}

function finishIntro(instance: EntryFilmInstance, fast: boolean) {
  const runtime = runtimes.get(instance);
  if (!runtime || runtime.transitioning || instance.data.exiting) return;

  clearAllTimers(runtime);
  runtime.transitioning = true;
  runtime.pendingTaps = 0;
  runtime.completionReason = fast ? 'tap' : 'auto';
  const generation = runtime.generation;
  const revealHome = () => {
    if (runtime.generation !== generation) return;
    instance.setData({ exiting: true, fastFlash: false, tapHintVisible: false });
    runtime.exitTimer = setTimeout(() => {
      if (runtime.generation !== generation) return;
      completeIntro(instance);
    }, EXIT_MS);
  };

  if (fast) {
    instance.setData({ fastFlash: true, tapHintVisible: false });
    runtime.transitionTimer = setTimeout(revealHome, FAST_FLASH_MS);
  } else {
    revealHome();
  }
}

function transitionToNext(instance: EntryFilmInstance, fast: boolean) {
  const runtime = runtimes.get(instance);
  if (!runtime || runtime.transitioning || instance.data.exiting) return;

  const nextSceneIndex = instance.data.sceneIndex + 1;
  if (nextSceneIndex > LAST_SCENE_INDEX) {
    finishIntro(instance, fast);
    return;
  }

  clearAllTimers(runtime);
  runtime.transitioning = true;
  const generation = runtime.generation;
  const flashMs = fast ? FAST_FLASH_MS : AUTO_FLASH_MS;
  const settleMs = fast ? FAST_SETTLE_MS : AUTO_SETTLE_MS;

  instance.setData({ fastFlash: true, tapHintVisible: !fast && instance.data.tapHintVisible });
  runtime.transitionTimer = setTimeout(() => {
    if (runtime.generation !== generation) return;
    instance.setData({
      sceneIndex: nextSceneIndex,
      cityIndex: 0,
      city: ENTRY_CITIES[0]!,
      nextCity: getNextCity(0),
      fastFlash: false,
      tapHintVisible: fast ? false : instance.data.tapHintVisible,
      imageFailed: false,
    }, () => {
      if (runtime.generation !== generation) return;
      runtime.transitionTimer = setTimeout(() => {
        if (runtime.generation !== generation) return;
        runtime.transitioning = false;
        if (nextSceneIndex === LAST_SCENE_INDEX) {
          runtime.pendingTaps = 0;
          armScene(instance, nextSceneIndex);
          return;
        }
        if (runtime.pendingTaps > 0) {
          runtime.pendingTaps -= 1;
          transitionToNext(instance, true);
          return;
        }
        armScene(instance, nextSceneIndex);
      }, settleMs);
    });
  }, flashMs);
}

function requestAdvance(instance: EntryFilmInstance, fromTap: boolean) {
  const runtime = runtimes.get(instance);
  if (!runtime || !instance.data.visible || instance.data.exiting) return;
  if (fromTap && instance.data.sceneIndex === LAST_SCENE_INDEX) return;

  if (fromTap) {
    const remaining = Math.max(0, LAST_SCENE_INDEX + 1 - instance.data.sceneIndex);
    runtime.pendingTaps = Math.min(runtime.pendingTaps + 1, remaining);
  }
  if (runtime.transitioning) return;
  if (fromTap) runtime.pendingTaps = Math.max(0, runtime.pendingTaps - 1);
  transitionToNext(instance, fromTap);
}

function startIntro(instance: EntryFilmInstance) {
  const runtime = runtimes.get(instance);
  if (!runtime || runtime.started) return;
  runtime.started = true;
  instance.setData({
    visible: true,
    sceneIndex: 0,
    cityIndex: 0,
    city: ENTRY_CITIES[0]!,
    nextCity: getNextCity(0),
    fastFlash: false,
    exiting: false,
    tapHintVisible: true,
    imageFailed: false,
  }, () => armScene(instance, 0));
}

Component({
  options: {
    styleIsolation: 'apply-shared',
  },

  data: {
    // The parent only creates this component for the claimed cold start. Keep
    // the cover opaque from the component's very first render so a slow view
    // bridge cannot expose the Discover page before ready() runs.
    visible: true,
    sceneIndex: 0,
    cityIndex: 0,
    city: ENTRY_CITIES[0]!,
    nextCity: getNextCity(0),
    fastFlash: false,
    exiting: false,
    tapHintVisible: true,
    imageFailed: false,
  },

  lifetimes: {
    attached() {
      runtimes.set(this, {
        generation: 0,
        lastTapTimestamp: -1,
        pendingTaps: 0,
        started: false,
        transitioning: false,
        completed: false,
        completionReason: 'auto',
      });
    },
    ready() {
      startIntro(this as unknown as EntryFilmInstance);
    },
    detached() {
      const runtime = runtimes.get(this);
      if (runtime) clearAllTimers(runtime);
      runtimes.delete(this);
    },
  },

  pageLifetimes: {
    hide() {
      const runtime = runtimes.get(this);
      if (!runtime) return;
      clearAllTimers(runtime);
      runtime.transitioning = false;
      (this as unknown as EntryFilmInstance).setData({ fastFlash: false });
    },
    show() {
      const instance = this as unknown as EntryFilmInstance;
      const runtime = runtimes.get(this);
      if (!runtime?.started || !instance.data.visible) return;
      if (instance.data.exiting) {
        completeIntro(instance);
        return;
      }
      armScene(instance, instance.data.sceneIndex);
    },
  },

  methods: {
    handleSkip() {
      skipIntro(this as unknown as EntryFilmInstance);
    },
    handleTap(event: WechatMiniprogram.TouchEvent) {
      const runtime = runtimes.get(this);
      const timestamp = Number(event.timeStamp);
      if (!runtime || timestamp === runtime.lastTapTimestamp) return;
      runtime.lastTapTimestamp = timestamp;
      requestAdvance(this as unknown as EntryFilmInstance, true);
    },
    handleImageError() {
      const instance = this as unknown as EntryFilmInstance;
      if (instance.data.sceneIndex !== 0) {
        instance.setData({ imageFailed: true });
        return;
      }
      const cityIndex = instance.data.cityIndex + 1;
      if (cityIndex < ENTRY_CITIES.length) {
        instance.setData({ cityIndex, city: ENTRY_CITIES[cityIndex]!, nextCity: getNextCity(cityIndex) });
      } else {
        requestAdvance(instance, false);
      }
    },
    blockTouchMove() {},
  },
});
