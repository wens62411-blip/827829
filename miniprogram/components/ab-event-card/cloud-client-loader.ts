type EventCloudClient = typeof import('../../shared/services/cloud-client');

declare const require: (path: string) => EventCloudClient;

export function getEventCloudClient(): EventCloudClient {
  return require('../../shared/services/cloud-client');
}
