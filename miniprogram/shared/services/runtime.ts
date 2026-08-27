import { RuntimeMode } from '../types/enums';

export const LOCAL_RUNTIME = Object.freeze({
  contractVersion: '1.0.0',
  mode: RuntimeMode.OFFLINE_DEMO,
  cloudEnvironmentConfigured: false,
  silentSyntheticFallbackAllowed: false,
  paymentCapability: 'DISABLED',
} as const);

export function assertLiveCloudConfigured(): void {
  throw new Error('Cloud calls are disabled in LOCAL_ONLY/OFFLINE_DEMO mode.');
}
