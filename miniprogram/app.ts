import { RuntimeMode } from './shared/types/enums';
import { safeSetStorageSync } from './shared/utils/safe-storage';

const DISCOVER_ENTRY_PATH = 'pages/discover/index';

function normalizeLaunchPath(path: unknown): string {
  return String(path ?? '')
    .trim()
    .replace(/^\/+/, '')
    .split(/[?#]/, 1)[0] ?? '';
}

App({
  globalData: {
    contractVersion: '1.0.0',
    runtimeMode: RuntimeMode.OFFLINE_DEMO,
    cloudEnvironmentConfigured: false,
    entryFilmPending: false,
    entryFilmConsumed: false,
  },
  onLaunch(options: { path?: string } = {}) {
    const launchPath = normalizeLaunchPath(options.path);
    const shouldPlayEntryFilm = !launchPath || launchPath === DISCOVER_ENTRY_PATH;
    this.globalData.entryFilmPending = shouldPlayEntryFilm;
    this.globalData.entryFilmConsumed = !shouldPlayEntryFilm;

    // LOCAL_ONLY deliberately does not call wx.cloud.init without an authorized env.
    safeSetStorageSync('ab_club_runtime_evidence', {
      contractVersion: '1.0.0',
      runtimeMode: RuntimeMode.OFFLINE_DEMO,
      source: 'LOCAL_ONLY',
    });
  },
  consumeEntryFilmLaunch(): boolean {
    if (!this.globalData.entryFilmPending || this.globalData.entryFilmConsumed) return false;
    this.globalData.entryFilmPending = false;
    this.globalData.entryFilmConsumed = true;
    return true;
  },
});
