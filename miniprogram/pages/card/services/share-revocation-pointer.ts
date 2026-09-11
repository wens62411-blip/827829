import type { ShareTokenId } from '../../../shared/types/primitives';

const STORAGE_KEY = 'ab_card_last_share_revocation_pointer_v1';
const MAX_REVOCATION_POINTERS = 12;
const sessionRevocationTombstones = new Set<string>();

interface LegacyStoredRevocationPointer {
  readonly contractVersion: '1.0.0';
  readonly shareTokenId: string;
  readonly savedAt: string;
}

interface StoredRevocationPointerEntry {
  readonly shareTokenId: string;
  readonly savedAt: string;
}

interface StoredRevocationRegistry {
  readonly contractVersion: '2.0.0';
  readonly pointers: readonly StoredRevocationPointerEntry[];
}

export function isSafeShareTokenId(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 3 && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value);
}

function isSafeEntry(value: unknown): value is StoredRevocationPointerEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entry = value as Record<string, unknown>;
  return isSafeShareTokenId(entry.shareTokenId)
    && typeof entry.savedAt === 'string'
    && Number.isFinite(Date.parse(entry.savedAt));
}

function readRegistry(): StoredRevocationPointerEntry[] {
  try {
    const value = wx.getStorageSync<unknown>(STORAGE_KEY);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const record = value as Record<string, unknown>;
    if (record.contractVersion === '1.0.0' && isSafeEntry(record as unknown as LegacyStoredRevocationPointer)) {
      return [{
        shareTokenId: record.shareTokenId as string,
        savedAt: record.savedAt as string,
      }];
    }
    if (
      record.contractVersion !== '2.0.0'
      || !Array.isArray(record.pointers)
      || record.pointers.length > MAX_REVOCATION_POINTERS
      || !record.pointers.every(isSafeEntry)
    ) return [];
    const seen = new Set<string>();
    return record.pointers.filter((entry) => {
      if (seen.has(entry.shareTokenId)) return false;
      seen.add(entry.shareTokenId);
      return true;
    });
  } catch (_error) {
    return [];
  }
}

function writeRegistry(pointers: readonly StoredRevocationPointerEntry[]): boolean {
  try {
    if (!pointers.length) {
      wx.removeStorageSync(STORAGE_KEY);
      return true;
    }
    const registry: StoredRevocationRegistry = {
      contractVersion: '2.0.0',
      pointers: pointers.slice(-MAX_REVOCATION_POINTERS),
    };
    wx.setStorageSync(STORAGE_KEY, registry);
    return true;
  } catch (_error) {
    return false;
  }
}

export function rememberShareForRevocation(shareTokenId: ShareTokenId): boolean {
  const pointer: StoredRevocationPointerEntry = {
    shareTokenId,
    savedAt: new Date().toISOString(),
  };
  const pointers = readRegistry().filter((entry) => entry.shareTokenId !== shareTokenId);
  return writeRegistry([...pointers, pointer]);
}

export function readShareRevocationPointer(): ShareTokenId | undefined {
  const pointers = readRegistry();
  return pointers[pointers.length - 1]?.shareTokenId as ShareTokenId | undefined;
}

export function markShareRevokedForSession(shareTokenId: ShareTokenId): void {
  if (!isSafeShareTokenId(shareTokenId)) return;
  sessionRevocationTombstones.add(shareTokenId);
}

export function wasShareRevokedForSession(shareTokenId: ShareTokenId): boolean {
  return sessionRevocationTombstones.has(shareTokenId);
}

export function forgetShareRevocationPointer(shareTokenId?: ShareTokenId): void {
  const pointers = readRegistry();
  const target = shareTokenId ?? pointers[pointers.length - 1]?.shareTokenId;
  if (!target) return;
  // A failed local cleanup must not be reported as a server-side revoke failure.
  void writeRegistry(pointers.filter((entry) => entry.shareTokenId !== target));
}
