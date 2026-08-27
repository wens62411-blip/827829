const STATE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  PENDING: '等待处理',
  ACCEPTED: '已接受',
  REJECTED: '已婉拒',
  CANCELLED: '已撤回',
  REMOVED: '关系已解除',
});

Component({
  options: {
    styleIsolation: 'isolated',
  },
  properties: {
    friendshipId: { type: String, value: '' },
    displayName: { type: String, value: 'AB Club 成员' },
    headline: { type: String, value: '' },
    avatarUrl: { type: String, value: '' },
    message: { type: String, value: '' },
    state: { type: String, value: 'PENDING' },
    direction: { type: String, value: 'INCOMING' },
    busy: { type: Boolean, value: false },
  },
  data: {
    statusLabel: STATE_LABELS.PENDING,
    showIncomingActions: true,
    showCancelAction: false,
  },
  observers: {
    'state,direction'(state: string, direction: string) {
      this.setData({
        statusLabel: STATE_LABELS[state] ?? '状态已更新',
        showIncomingActions: state === 'PENDING' && direction === 'INCOMING',
        showCancelAction: state === 'PENDING' && direction === 'OUTGOING',
      });
    },
  },
  methods: {
    emitAction(action: 'accept' | 'reject' | 'cancel') {
      if (this.data.busy || this.data.state !== 'PENDING') return;
      this.triggerEvent(action, { friendshipId: this.data.friendshipId });
    },
    onAccept() { this.emitAction('accept'); },
    onReject() { this.emitAction('reject'); },
    onCancel() { this.emitAction('cancel'); },
  },
});
