/**
 * 同步存储在部分设备的隐私模式、容量异常或底层故障下可能直接抛错。
 * 这里保留一份仅当前小程序进程有效的镜像，让页面生命周期继续执行；
 * 真正的持久化仍以微信同步存储成功为准。
 */
type SafeStorageValue = object | string | number | boolean;

const volatileStorage = new Map<string, SafeStorageValue>();

export function safeGetStorageSync<T extends SafeStorageValue>(key: string, fallback: T): T {
  try {
    const persisted = wx.getStorageSync<T | '' | null | undefined>(key);
    if (persisted !== undefined && persisted !== null && persisted !== '') {
      volatileStorage.set(key, persisted);
      return persisted;
    }
  } catch {
    // Fail open to the process-local mirror or caller-provided directory default.
  }

  const mirrored = volatileStorage.get(key);
  return mirrored === undefined ? fallback : mirrored as T;
}

export function safeSetStorageSync<T extends SafeStorageValue>(key: string, value: T): boolean {
  volatileStorage.set(key, value);
  try {
    wx.setStorageSync(key, value);
    return true;
  } catch {
    // The in-memory mirror keeps this launch usable even when persistence fails.
    return false;
  }
}
