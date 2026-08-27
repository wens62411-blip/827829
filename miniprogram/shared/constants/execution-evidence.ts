import type { EvidenceGateStatus, EvidenceOverall, EvidencePhase } from '../types/enums';
import type { ContractVersion, UtcInstant } from '../types/primitives';

export interface EvidenceGate {
  readonly status: EvidenceGateStatus;
  readonly evidence: readonly string[];
  readonly note?: string;
}

export interface ExecutionEvidenceManifest {
  readonly contractVersion: ContractVersion;
  readonly module: string;
  readonly phase: EvidencePhase;
  readonly generatedAt: UtcInstant;
  readonly overall: EvidenceOverall;
  readonly gates: {
    readonly local: EvidenceGate;
    readonly devtoolsPreview: EvidenceGate;
    readonly iosDevice: EvidenceGate;
    readonly androidDevice: EvidenceGate;
    readonly devVersionUpload: EvidenceGate;
    readonly release: EvidenceGate;
  };
}
