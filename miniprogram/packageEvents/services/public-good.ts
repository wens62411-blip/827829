import { PUBLIC_GOOD_ACTIONS, type PublicGoodAction } from '../data/public-good';

export const PUBLIC_GOOD_STORAGE_KEY = 'abclub.public-good.v1';

interface StoredProgress {
  version: 1;
  currentId: string | null;
  completedIds: string[];
}

export interface PublicGoodStorage {
  getStorageSync(key: string): unknown;
  setStorageSync(key: string, value: StoredProgress): void;
}

export interface PublicGoodSnapshot {
  current: PublicGoodAction | null;
  completedIds: string[];
  completedCount: number;
  currentCompleted: boolean;
  saveFailed: boolean;
  repaired: boolean;
}

const actionsById = new Map(PUBLIC_GOOD_ACTIONS.map((action) => [action.id, action]));

export function normalizePublicGoodProgress(value: unknown): { progress: StoredProgress; repaired: boolean } {
  const empty: StoredProgress = { version: 1, currentId: null, completedIds: [] };
  if (value === '' || value === undefined || value === null) return { progress: empty, repaired: false };
  if (typeof value !== 'object' || Array.isArray(value)) return { progress: empty, repaired: true };
  const source = value as Record<string, unknown>;
  if (source.version !== 1) return { progress: empty, repaired: true };
  const completedIds = Array.isArray(source.completedIds)
    ? [...new Set(source.completedIds.filter((id): id is string => typeof id === 'string' && actionsById.has(id)))]
    : [];
  const currentId = typeof source.currentId === 'string' && actionsById.has(source.currentId) ? source.currentId : null;
  const repaired = !Array.isArray(source.completedIds)
    || completedIds.length !== source.completedIds.length
    || (source.currentId !== null && source.currentId !== currentId);
  return { progress: { version: 1, currentId, completedIds }, repaired };
}

export function pickPublicGoodAction(completedIds: readonly string[], currentId: string | null, random: () => number = Math.random): PublicGoodAction {
  const completed = new Set(completedIds);
  const unfinished = PUBLIC_GOOD_ACTIONS.filter((action) => !completed.has(action.id) && action.id !== currentId);
  const alternatives = PUBLIC_GOOD_ACTIONS.filter((action) => action.id !== currentId);
  const pool = unfinished.length ? unfinished : alternatives;
  const roll = random();
  const bounded = Number.isFinite(roll) ? Math.min(Math.max(roll, 0), 1 - Number.EPSILON) : 0;
  return pool[Math.floor(bounded * pool.length)] ?? PUBLIC_GOOD_ACTIONS[0]!;
}

export function createPublicGoodStore(storage: PublicGoodStorage) {
  let progress: StoredProgress = { version: 1, currentId: null, completedIds: [] };
  let hydrated = false;
  let saveFailed = false;
  let repaired = false;
  let readFailed = false;

  function persist(): boolean {
    try {
      // 读取曾失败时先恢复旧记录，避免用空状态覆盖尚未读到的历史。
      if (readFailed) {
        const recovered = normalizePublicGoodProgress(storage.getStorageSync(PUBLIC_GOOD_STORAGE_KEY));
        progress = {
          version: 1,
          currentId: progress.currentId ?? recovered.progress.currentId,
          completedIds: [...new Set([...recovered.progress.completedIds, ...progress.completedIds])],
        };
        repaired = repaired || recovered.repaired;
        readFailed = false;
      }
      storage.setStorageSync(PUBLIC_GOOD_STORAGE_KEY, { ...progress, completedIds: [...progress.completedIds] });
      saveFailed = false;
      return true;
    } catch {
      saveFailed = true;
      return false;
    }
  }

  function hydrate(): void {
    if (hydrated) return;
    hydrated = true;
    try {
      const normalized = normalizePublicGoodProgress(storage.getStorageSync(PUBLIC_GOOD_STORAGE_KEY));
      progress = normalized.progress;
      repaired = normalized.repaired;
      if (repaired) persist();
    } catch {
      saveFailed = true;
      readFailed = true;
    }
  }

  function snapshot(): PublicGoodSnapshot {
    hydrate();
    const action = progress.currentId ? actionsById.get(progress.currentId) : null;
    return {
      current: action ? { ...action } : null,
      completedIds: [...progress.completedIds],
      completedCount: progress.completedIds.length,
      currentCompleted: progress.currentId !== null && progress.completedIds.includes(progress.currentId),
      saveFailed,
      repaired,
    };
  }

  return {
    snapshot,
    draw(random?: () => number): PublicGoodSnapshot {
      hydrate();
      progress.currentId = pickPublicGoodAction(progress.completedIds, progress.currentId, random).id;
      persist();
      return snapshot();
    },
    select(id: string): PublicGoodSnapshot {
      hydrate();
      if (actionsById.has(id) && progress.currentId !== id) {
        progress.currentId = id;
        persist();
      }
      return snapshot();
    },
    complete(): { added: boolean; snapshot: PublicGoodSnapshot } {
      hydrate();
      // 若磁盘已经恢复，先读回历史再决定是否首次完成。
      if (readFailed) persist();
      if (!progress.currentId || progress.completedIds.includes(progress.currentId)) return { added: false, snapshot: snapshot() };
      progress.completedIds = [...progress.completedIds, progress.currentId];
      persist();
      return { added: true, snapshot: snapshot() };
    },
    retrySave(): PublicGoodSnapshot {
      hydrate();
      persist();
      return snapshot();
    },
  };
}

// 单个会话共用内存状态；磁盘写入失败时，返回页面也不会丢失本次已经完成的记录。
export const publicGoodStore = createPublicGoodStore({
  getStorageSync: (key) => wx.getStorageSync(key) as unknown,
  setStorageSync: (key, value) => wx.setStorageSync(key, value),
});
