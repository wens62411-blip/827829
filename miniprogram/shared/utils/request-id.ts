import type { RequestId } from '../types/primitives';

let requestSequence = 0;

export function createRequestId(now: number = Date.now()): RequestId {
  requestSequence += 1;
  return `req_${now.toString(36)}_${requestSequence.toString(36)}` as RequestId;
}

