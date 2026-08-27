import type {
  IdempotencyKey,
  OptimisticVersion,
  VerificationRequestId,
} from '../../../shared/types/primitives';
import type {
  LabelDefinitionProjection,
  VerificationRequestProjection,
} from '../../../shared/types/projections';
import {
  callSocialAction,
  createSocialIdempotencyKey,
  socialErrorMessage,
} from '../../../pages/network/services/social-client';
import { REVIEW_STATUS_LABELS } from '../../models/relationship-view';

interface RequestView {
  readonly verificationRequestId: string;
  readonly labelId: string;
  readonly labelName: string;
  readonly status: string;
  readonly statusLabel: string;
  readonly createdAtLabel: string;
  readonly evidenceCount: number;
  readonly reviewerNote: string;
  readonly version: number;
  readonly canWithdraw: boolean;
  readonly canResubmit: boolean;
}

function formatUtc(value: string): string {
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return '时间未提供';
  const year = time.getFullYear();
  const month = String(time.getMonth() + 1).padStart(2, '0');
  const day = String(time.getDate()).padStart(2, '0');
  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function labelMap(labels: readonly LabelDefinitionProjection[]): ReadonlyMap<string, string> {
  return new Map(labels.map((label) => [label.labelId, label.name.zh]));
}

function toRequestView(
  request: VerificationRequestProjection,
  names: ReadonlyMap<string, string>,
): RequestView {
  return {
    verificationRequestId: request.verificationRequestId,
    labelId: request.labelId,
    labelName: names.get(request.labelId) ?? '标签申请',
    status: request.status,
    statusLabel: REVIEW_STATUS_LABELS[request.status] ?? '状态已更新',
    createdAtLabel: formatUtc(request.createdAt),
    evidenceCount: request.evidenceAssetIds.length,
    reviewerNote: request.reviewerNote ?? '',
    version: request.version,
    canWithdraw: request.status === 'DRAFT' || request.status === 'SUBMITTED',
    canResubmit: request.status === 'NEEDS_CHANGES',
  };
}

const withdrawalKeys = new Map<string, IdempotencyKey>();

function withdrawalKey(requestId: string): IdempotencyKey {
  const existing = withdrawalKeys.get(requestId);
  if (existing) return existing;
  const created = createSocialIdempotencyKey('verification-withdraw');
  withdrawalKeys.set(requestId, created);
  return created;
}

Page({
  data: {
    requests: [] as RequestView[],
    selected: null as RequestView | null,
    requestedSelectionId: '',
    loading: false,
    loaded: false,
    busyAction: '',
    errorMessage: '',
  },

  onLoad(options: Record<string, string | undefined>) {
    this.setData({ requestedSelectionId: options.verificationRequestId?.trim() ?? '' });
    void this.loadMine();
  },

  onPullDownRefresh() {
    void this.loadMine();
  },

  async loadMine() {
    if (this.data.loading) return;
    this.setData({ loading: true, errorMessage: '' });
    try {
      const [mine, catalog] = await Promise.all([
        callSocialAction('verification.listMine', { limit: 50 }),
        callSocialAction('tag.catalog', { includeDisabled: false }),
      ]);
      const names = labelMap(catalog.labels);
      const requests = mine.page.items.map((request) => toRequestView(request, names));
      let selected = this.data.selected
        ? requests.find((item) => item.verificationRequestId === this.data.selected?.verificationRequestId) ?? null
        : null;
      if (this.data.requestedSelectionId) {
        selected = requests.find((item) => item.verificationRequestId === this.data.requestedSelectionId) ?? null;
      }
      if (!selected && requests.length) selected = requests[0] ?? null;
      this.setData({ requests, selected, loaded: true });
      if (this.data.requestedSelectionId && !selected) {
        await this.loadOwnedDetail(this.data.requestedSelectionId, names);
      }
    } catch (error) {
      this.setData({ errorMessage: socialErrorMessage(error) });
    } finally {
      this.setData({ loading: false });
      wx.stopPullDownRefresh();
    }
  },

  async loadOwnedDetail(requestId: string, names?: ReadonlyMap<string, string>) {
    if (!requestId || requestId.length > 160) return;
    try {
      const response = await callSocialAction('verification.getMine', {
        verificationRequestId: requestId as VerificationRequestId,
      });
      const selected = toRequestView(response.request, names ?? new Map());
      const requests = this.data.requests.some((item) => item.verificationRequestId === requestId)
        ? this.data.requests.map((item) => item.verificationRequestId === requestId ? selected : item)
        : [selected, ...this.data.requests];
      this.setData({ selected, requests });
    } catch (error) {
      this.setData({ errorMessage: socialErrorMessage(error) });
    }
  },

  onSelectRequest(event: WechatMiniprogram.BaseEvent) {
    const requestId = String(event.currentTarget.dataset.requestId ?? '');
    const selected = this.data.requests.find((item) => item.verificationRequestId === requestId) ?? null;
    if (selected) this.setData({ selected });
  },

  async onWithdraw() {
    const selected = this.data.selected;
    if (!selected?.canWithdraw || this.data.busyAction) return;
    const confirm = await wx.showModal({
      title: '撤回并删除申请？',
      content: '冻结协议规定：草稿或已提交申请会被物理删除，并追加审计与认证投影失效事件。此操作不可撤销。',
      confirmText: '撤回删除',
      confirmColor: '#9D3F36',
    });
    if (!confirm.confirm) return;
    this.setData({ busyAction: 'withdraw' });
    try {
      await callSocialAction('verification.withdraw', {
        verificationRequestId: selected.verificationRequestId as VerificationRequestId,
        expectedVersion: selected.version as OptimisticVersion,
        idempotencyKey: withdrawalKey(selected.verificationRequestId),
      });
      withdrawalKeys.delete(selected.verificationRequestId);
      const requests = this.data.requests.filter(
        (item) => item.verificationRequestId !== selected.verificationRequestId,
      );
      this.setData({ requests, selected: requests[0] ?? null });
      wx.showToast({ title: '申请已撤回删除', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: socialErrorMessage(error), icon: 'none', duration: 3000 });
    } finally {
      this.setData({ busyAction: '' });
    }
  },
});
