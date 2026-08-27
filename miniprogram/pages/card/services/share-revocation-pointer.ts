import type { ShareTokenId } from '../../../shared/types/primitives';

const STORAGE_KEY = 'ab_card_last_share_revocation_pointer_v1';

interface StoredRevocationPointer {
  readonly contractVersion: '1.0.0';
  readonly shareTokenId: string;
  readonly savedAt: string;
}

export function isSafeShareTokenId(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 3 && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value);
}

export function rememberShareForRevocation(shareTokenId: ShareTokenId): boolean {
  const pointer: StoredRevocationPointer = {
    contractVersion: '1.0.0',
    shareTokenId,
    savedAt: new Date().toISOString(),
  };
  try {
    wx.setStorageSync(STORAGE_KEY, pointer);
    return true;
  } catch (_error) {
    return false;
  }
}

export function readShareRevocationPointer(): ShareTokenId | undefined {
  try {
    const value = wx.getStorageSync<StoredRevocationPointer | undefined>(STORAGE_KEY);
    if (
      value?.contractVersion !== '1.0.0' ||
      !isSafeShareTokenId(value.shareTokenId) ||
      typeof value.savedAt !== 'string' ||
      !Number.isFinite(Date.parse(value.savedAt))
    ) {
      return undefined;
    }
    return value.shareTokenId as ShareTokenId;
  } catch (_error) {
    return undefined;
  }
}

export function forgetShareRevocationPointer(): void {
  try {
    wx.removeStorageSync(STORAGE_KEY);
  } catch (_error) {
    // A failed local cleanup must not be reported as a server-side revoke failure.
  }
}
