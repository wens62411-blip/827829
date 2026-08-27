interface TimelineStep {
  readonly key: string;
  readonly label: string;
  readonly tone: 'done' | 'current' | 'future';
}

const STATUS_STAGE: Readonly<Record<string, number>> = Object.freeze({
  DRAFT: 0,
  SUBMITTED: 1,
  UNDER_REVIEW: 2,
  NEEDS_CHANGES: 3,
  APPROVED: 3,
  REJECTED: 3,
  EXPIRED: 4,
  REVOKED: 4,
});

const DECISION_LABEL: Readonly<Record<string, string>> = Object.freeze({
  NEEDS_CHANGES: '需要补充材料',
  APPROVED: '审核通过',
  REJECTED: '审核未通过',
  EXPIRED: '认证已过期',
  REVOKED: '认证已撤销',
});

function buildSteps(status: string): TimelineStep[] {
  const stage = STATUS_STAGE[status] ?? 0;
  const labels = [
    ['DRAFT', '创建草稿'],
    ['SUBMITTED', '提交申请'],
    ['UNDER_REVIEW', '人工审核'],
    ['DECISION', DECISION_LABEL[status] ?? '等待审核决定'],
  ] as const;
  const steps: TimelineStep[] = labels.map(([key, label], index) => ({
    key,
    label,
    tone: index < stage ? 'done' : index === stage ? 'current' : 'future',
  }));
  if (status === 'EXPIRED' || status === 'REVOKED') {
    steps[3] = { key: 'APPROVED', label: '审核通过', tone: 'done' };
    steps.push({ key: status, label: DECISION_LABEL[status] ?? '状态已更新', tone: 'current' });
  }
  return steps;
}

Component({
  options: {
    styleIsolation: 'isolated',
  },
  properties: {
    status: { type: String, value: 'DRAFT' },
    createdAtLabel: { type: String, value: '' },
    reviewerNote: { type: String, value: '' },
    evidenceCount: { type: Number, value: 0 },
  },
  data: {
    steps: buildSteps('DRAFT') as TimelineStep[],
  },
  observers: {
    status(status: string) {
      this.setData({ steps: buildSteps(status) });
    },
  },
});
