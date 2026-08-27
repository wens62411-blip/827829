import type { CloudAction } from '../../../miniprogram/shared/contracts';
import type {
  AuditEntryId,
  RequestId,
  StableId,
  UserId,
  UtcInstant,
} from '../../../miniprogram/shared/types/primitives';
import type { ServerRole } from '../auth';

export interface AuditAppend {
  readonly auditEntryId: AuditEntryId;
  readonly actorUserId?: UserId;
  readonly actorRole: ServerRole | 'SYSTEM';
  readonly action: CloudAction;
  readonly targetType: string;
  readonly targetId: StableId;
  readonly requestId: RequestId;
  readonly occurredAt: UtcInstant;
  readonly result: 'SUCCEEDED' | 'FAILED';
  readonly reasonCode?: string;
}

export interface AppendOnlyWriter<T> {
  add(input: { readonly data: T }): Promise<{ readonly id: string }>;
}

export function createAuditAppend(input: AuditAppend): Readonly<AuditAppend> {
  return Object.freeze({ ...input });
}

export async function appendAudit(
  writer: AppendOnlyWriter<Readonly<AuditAppend>>,
  entry: Readonly<AuditAppend>,
): Promise<string> {
  const result = await writer.add({ data: entry });
  return result.id;
}

export function assertAuditMutation(operation: 'add' | 'update' | 'remove'): void {
  if (operation !== 'add') throw new Error('audit_logs is append-only');
}
