type ShareState = 'LOADING' | 'SUCCESS' | 'EXPIRED' | 'REVOKED' | 'ERROR';

interface ShareStateCopy {
  readonly icon: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
}

const STATE_COPY: Readonly<Record<ShareState, ShareStateCopy>> = {
  LOADING: {
    icon: '···',
    eyebrow: '正在核验',
    title: '正在检查分享入口',
    description: '正在重新检查撤销、有效期、好友与拉黑状态，请稍候。',
  },
  SUCCESS: {
    icon: '✓',
    eyebrow: '入口可用',
    title: '分享入口已创建',
    description: '是否真正发送由微信界面确认；返回页面不代表已经转发成功。',
  },
  EXPIRED: {
    icon: '⌛',
    eyebrow: '入口失效',
    title: '分享入口已过期',
    description: '该入口不再展示名片内容，请联系名片本人重新生成。',
  },
  REVOKED: {
    icon: '—',
    eyebrow: '入口失效',
    title: '分享入口已撤销',
    description: '撤销立即生效，该入口不会继续展示名片内容。',
  },
  ERROR: {
    icon: '!',
    eyebrow: '暂时失败',
    title: '暂时无法完成分享',
    description: '请检查网络后重试；若小程序码生成失败，可改用微信名片转发。',
  },
};

const retryTimers = new WeakMap<object, ReturnType<typeof setTimeout>>();

function normalizeState(value: string): ShareState {
  if (value === 'SUCCESS') return 'SUCCESS';
  if (value === 'EXPIRED' || value === 'TOKEN_EXPIRED') return 'EXPIRED';
  if (value === 'REVOKED' || value === 'TOKEN_REVOKED') return 'REVOKED';
  if (value === 'LOADING' || value === 'RESOLVING') return 'LOADING';
  return 'ERROR';
}

Component({
  options: {
    multipleSlots: true,
    styleIsolation: 'apply-shared',
  },
  properties: {
    state: { type: String, value: 'LOADING' },
    title: { type: String, value: '' },
    description: { type: String, value: '' },
    allowRetry: { type: Boolean, value: true },
    allowForward: { type: Boolean, value: false },
    busy: { type: Boolean, value: false },
  },
  data: {
    safeState: 'LOADING' as ShareState,
    icon: STATE_COPY.LOADING.icon,
    eyebrow: STATE_COPY.LOADING.eyebrow,
    resolvedTitle: STATE_COPY.LOADING.title,
    resolvedDescription: STATE_COPY.LOADING.description,
    canRetry: false,
    canForward: false,
    retryLocked: false,
    assistText: '',
  },
  observers: {
    'state, title, description, allowRetry, allowForward, busy'() {
      this.syncState();
    },
  },
  lifetimes: {
    attached() {
      this.syncState();
    },
    detached() {
      const timer = retryTimers.get(this);
      if (timer !== undefined) {
        clearTimeout(timer);
        retryTimers.delete(this);
      }
    },
  },
  methods: {
    syncState() {
      const safeState = normalizeState(this.properties.state);
      const copy = STATE_COPY[safeState];
      const terminalFailure = safeState === 'ERROR' || safeState === 'EXPIRED' || safeState === 'REVOKED';
      const forwardable = safeState === 'SUCCESS' || safeState === 'ERROR';

      this.setData({
        safeState,
        icon: copy.icon,
        eyebrow: copy.eyebrow,
        resolvedTitle: this.properties.title.trim() || copy.title,
        resolvedDescription: this.properties.description.trim() || copy.description,
        canRetry: this.properties.allowRetry && terminalFailure && !this.properties.busy,
        canForward: this.properties.allowForward && forwardable && !this.properties.busy,
        assistText: this.properties.busy ? '正在处理，请稍候。' : '',
      });
    },
    handleRetry() {
      if (!this.data.canRetry || this.data.retryLocked || this.properties.busy) return;
      this.setData({
        retryLocked: true,
        assistText: '正在发起重试，请勿重复点击。',
      });
      this.triggerEvent('retry', { state: this.data.safeState });
      const timer = setTimeout(() => {
        retryTimers.delete(this);
        this.setData({ retryLocked: false });
      }, 700);
      retryTimers.set(this, timer);
    },
    handleForward() {
      if (!this.data.canForward || this.properties.busy) return;
      this.setData({
        assistText: '请使用微信转发界面完成发送；只有微信确认后才算真正转发。',
      });
      this.triggerEvent('forward', { state: this.data.safeState });
    },
  },
});
