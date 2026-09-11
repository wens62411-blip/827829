import { RuntimeMode } from './shared/types/enums';
import { safeSetStorageSync } from './shared/utils/safe-storage';

const DISCOVER_ENTRY_PATH = 'pages/discover/index';
const CARD_SHARE_ENTRY_PATH = 'pages/card-share/index';
const BRAND_ENTRY_VALUE = 'brand';

interface AppEntryOptions {
  readonly path?: unknown;
  readonly query?: Readonly<Record<string, unknown>>;
  readonly scene?: unknown;
}

function normalizeLaunchPath(path: unknown): string {
  return String(path ?? '')
    .trim()
    .replace(/^\/+/, '')
    .split(/[?#]/, 1)[0] ?? '';
}

function readPathQueryValue(path: unknown, key: string): string {
  const rawPath = String(path ?? '');
  const queryStart = rawPath.indexOf('?');
  if (queryStart < 0) return '';
  const query = rawPath.slice(queryStart + 1).split('#', 1)[0] ?? '';
  for (const pair of query.split('&')) {
    const [rawKey, rawValue = ''] = pair.split('=', 2);
    try {
      if (decodeURIComponent(rawKey ?? '') === key) return decodeURIComponent(rawValue);
    } catch (_error) {
      // A malformed query must never turn a non-brand route into a brand entry.
    }
  }
  return '';
}

function readEntryQueryValue(options: AppEntryOptions, key: string): string {
  const value = options.query?.[key];
  if (typeof value === 'string') return value.trim();
  return readPathQueryValue(options.path, key).trim();
}

function getBrandEntryKey(options: AppEntryOptions): string | null {
  const launchPath = normalizeLaunchPath(options.path);
  if (launchPath !== DISCOVER_ENTRY_PATH) return null;
  if (readEntryQueryValue(options, 'entry') !== BRAND_ENTRY_VALUE) return null;

  const entryId = readEntryQueryValue(options, 'entry_id');
  const scene = String(options.scene ?? '').trim();
  return entryId
    ? `brand:${entryId}`
    : `brand:legacy:${scene || 'unknown'}`;
}

function getColdStartEntryKey(options: AppEntryOptions): string | null {
  const launchPath = normalizeLaunchPath(options.path);
  if (launchPath === CARD_SHARE_ENTRY_PATH) return null;
  return getBrandEntryKey(options)
    ?? (!launchPath || launchPath === DISCOVER_ENTRY_PATH
      ? `cold:${launchPath || 'default'}`
      : null);
}

App({
  globalData: {
    contractVersion: '1.0.0',
    runtimeMode: RuntimeMode.OFFLINE_DEMO,
    cloudEnvironmentConfigured: false,
    entryFilmPending: false,
    entryFilmConsumed: false,
    entryFilmPendingKey: '',
    entryFilmLastHandledKey: '',
    entryFilmSkipNextAppShow: false,
  },
  onLaunch(options: AppEntryOptions = {}) {
    const entryKey = getColdStartEntryKey(options);
    this.globalData.entryFilmPending = Boolean(entryKey);
    this.globalData.entryFilmConsumed = !entryKey;
    this.globalData.entryFilmPendingKey = entryKey ?? '';
    this.globalData.entryFilmLastHandledKey = '';
    // WeChat calls App.onShow immediately after App.onLaunch with the same entry.
    this.globalData.entryFilmSkipNextAppShow = true;

    // LOCAL_ONLY deliberately does not call wx.cloud.init without an authorized env.
    safeSetStorageSync('ab_club_runtime_evidence', {
      contractVersion: '1.0.0',
      runtimeMode: RuntimeMode.OFFLINE_DEMO,
      source: 'LOCAL_ONLY',
    });
  },
  onShow(options: AppEntryOptions = {}) {
    if (this.globalData.entryFilmSkipNextAppShow) {
      this.globalData.entryFilmSkipNextAppShow = false;
      return;
    }

    // Only an explicit external brand route may re-arm the film in a warm app.
    // Normal foreground restores and every card-share route remain untouched.
    const entryKey = getBrandEntryKey(options);
    if (!entryKey
      || entryKey === this.globalData.entryFilmPendingKey
      || entryKey === this.globalData.entryFilmLastHandledKey) return;

    this.globalData.entryFilmPending = true;
    this.globalData.entryFilmConsumed = false;
    this.globalData.entryFilmPendingKey = entryKey;
  },
  consumeEntryFilmLaunch(): boolean {
    if (!this.globalData.entryFilmPending || this.globalData.entryFilmConsumed) return false;
    this.globalData.entryFilmPending = false;
    this.globalData.entryFilmConsumed = true;
    this.globalData.entryFilmLastHandledKey = this.globalData.entryFilmPendingKey;
    return true;
  },
});
