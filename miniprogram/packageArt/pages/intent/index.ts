import { RuntimeMode } from '../../../shared/types/enums';
import type {
  ContentId,
  ContentIntentId,
  IdempotencyKey,
  OptimisticVersion,
} from '../../../shared/types/primitives';
import { DEMO_ART_CONTENT, getDemoContent } from '../../data/demo';
import { categoryLabel, type IntentPurpose } from '../../model';
import {
  cancelContentIntent,
  createArtIdempotencyKey,
  createContentIntent,
  getPublicContent,
  getRuntimeEvidence,
} from '../../services/content-client';

const WEAK_NETWORK_DELAY_MS = 2500;
const PURPOSES: readonly { readonly value: IntentPurpose; readonly label: string; readonly description: string }[] = [
  { value: 'VIEWING', label: '预约品鉴意向', description: '表达希望了解线下资料阅读或品鉴安排。' },
  { value: 'COLLABORATION', label: '合作意向', description: '表达内容、展览、机构或城市活动合作需求。' },
];

let weakNetworkTimer: ReturnType<typeof setTimeout> | undefined;
let requestSerial = 0;
let currentContentId = '';
let currentIntentId: ContentIntentId | undefined;
let currentIntentVersion: OptimisticVersion | undefined;
let pendingCreateKey: IdempotencyKey | undefined;
let pendingCancelKey: IdempotencyKey | undefined;

function clearWeakNetworkTimer(): void {
  if (weakNetworkTimer !== undefined) {
    clearTimeout(weakNetworkTimer);
    weakNetworkTimer = undefined;
  }
}

function encodedIntentMessage(purpose: IntentPurpose, note: string): string {
  const safeNote = note.trim().slice(0, 180);
  return `[PURPOSE:${purpose}]${safeNote ? `\n${safeNote}` : ''}`;
}

Page({
  data: {
    runtimeMode: RuntimeMode.OFFLINE_DEMO as string,
    state: 'LOADING' as 'LOADING' | 'READY' | 'ERROR',
    stateTitle: '正在读取内容摘要',
    stateDescription: '联系意向只会绑定当前内容与当前登录用户。',
    retryable: false,
    weakNetwork: false,
    contentId: '',
    contentTitle: '',
    categoryLabel: '',
    evidenceScope: '',
    purposeOptions: PURPOSES,
    purpose: 'VIEWING' as IntentPurpose,
    message: '',
    messageLength: 0,
    intentState: 'NONE' as 'NONE' | 'ACTIVE' | 'CANCELLED',
    submitting: false,
    feedback: '',
    feedbackTone: 'neutral' as 'neutral' | 'success' | 'error',
  },

  onLoad(query: { readonly contentId?: string }) {
    const runtime = getRuntimeEvidence();
    currentContentId = query.contentId || (
      runtime.runtimeMode === RuntimeMode.OFFLINE_DEMO ? DEMO_ART_CONTENT[0]?.contentId ?? '' : ''
    );
    currentIntentId = undefined;
    currentIntentVersion = undefined;
    pendingCreateKey = undefined;
    pendingCancelKey = undefined;
    this.setData({ runtimeMode: runtime.runtimeMode, contentId: currentContentId });
    void this.loadContext();
  },

  onUnload() {
    requestSerial += 1;
    clearWeakNetworkTimer();
  },

  startWeakNetworkWatch(serial: number) {
    clearWeakNetworkTimer();
    weakNetworkTimer = setTimeout(() => {
      if (serial === requestSerial && this.data.state === 'LOADING') {
        this.setData({ weakNetwork: true });
      }
    }, WEAK_NETWORK_DELAY_MS);
  },

  async loadContext() {
    const serial = ++requestSerial;
    const runtime = getRuntimeEvidence();
    this.setData({
      runtimeMode: runtime.runtimeMode,
      state: 'LOADING',
      stateTitle: '正在读取内容摘要',
      stateDescription: '联系意向只会绑定当前内容与当前登录用户。',
      retryable: false,
      weakNetwork: false,
      feedback: '',
    });
    this.startWeakNetworkWatch(serial);

    if (!currentContentId) {
      clearWeakNetworkTimer();
      this.setData({
        state: 'ERROR',
        stateTitle: '缺少内容标识',
        stateDescription: '请从内容详情页进入联系意向。',
        retryable: false,
      });
      return;
    }

    if (runtime.runtimeMode === RuntimeMode.OFFLINE_DEMO) {
      const content = getDemoContent(currentContentId);
      if (serial !== requestSerial) return;
      clearWeakNetworkTimer();
      if (!content) {
        this.setData({
          state: 'ERROR',
          stateTitle: '演示内容不存在',
          stateDescription: '该标识不在 DEMO_ONLY fixture 中。',
          retryable: false,
          weakNetwork: false,
        });
        return;
      }
      this.setData({
        state: 'READY',
        contentTitle: content.title,
        categoryLabel: content.category === 'JEWELRY' && content.jewelry.jewelryKind === 'PEARL'
          ? '珠宝 · 珍珠'
          : categoryLabel(content.category),
        evidenceScope: content.evidenceScope,
        weakNetwork: false,
      });
      return;
    }

    if (runtime.runtimeMode !== RuntimeMode.LIVE || !runtime.cloudConfigured) {
      if (serial !== requestSerial) return;
      clearWeakNetworkTimer();
      this.setData({
        state: 'ERROR',
        stateTitle: '内容服务尚未连接',
        stateDescription: '当前模式不会提交真实意向，也不会切换到演示成功结果。',
        retryable: false,
        weakNetwork: false,
      });
      return;
    }

    const result = await getPublicContent(currentContentId as ContentId);
    if (serial !== requestSerial) return;
    clearWeakNetworkTimer();
    if (!result.ok) {
      this.setData({
        state: 'ERROR',
        stateTitle: '暂时无法读取内容摘要',
        stateDescription: result.message,
        retryable: result.retryable,
        weakNetwork: false,
      });
      return;
    }
    const content = result.data.content;
    this.setData({
      state: 'READY',
      contentTitle: content.title,
      categoryLabel: content.category === 'JEWELRY' && content.jewelry.jewelryKind === 'PEARL'
        ? '珠宝 · 珍珠'
        : categoryLabel(content.category),
      evidenceScope: content.evidenceScope,
      weakNetwork: false,
    });
  },

  handlePurposeTap(event: WechatMiniprogram.TouchEvent) {
    if (this.data.submitting || this.data.intentState === 'ACTIVE') return;
    const purpose = String(event.currentTarget.dataset.purpose ?? '');
    if (purpose === 'VIEWING' || purpose === 'COLLABORATION') {
      this.setData({ purpose, feedback: '' });
    }
  },

  handleMessageInput(event: WechatMiniprogram.Input) {
    const message = event.detail.value.slice(0, 180);
    this.setData({ message, messageLength: message.length, feedback: '' });
  },

  async handleIntentCreate() {
    if (this.data.submitting || this.data.state !== 'READY' || this.data.intentState === 'ACTIVE') return;
    const runtime = getRuntimeEvidence();
    this.setData({ submitting: true, feedback: '', feedbackTone: 'neutral' });

    if (runtime.runtimeMode === RuntimeMode.OFFLINE_DEMO) {
      this.setData({
        submitting: false,
        intentState: 'NONE',
        feedback: 'DEMO_ONLY：未提交、未创建任何联系意向；接入正式服务并完成登录后才能发送。',
        feedbackTone: 'error',
      });
      return;
    }

    if (runtime.runtimeMode !== RuntimeMode.LIVE || !runtime.cloudConfigured) {
      this.setData({
        submitting: false,
        feedback: '当前未连接正式服务，未创建任何意向。',
        feedbackTone: 'error',
      });
      return;
    }

    pendingCreateKey ??= await createArtIdempotencyKey();
    const result = await createContentIntent({
      contentId: currentContentId as ContentId,
      message: encodedIntentMessage(this.data.purpose, this.data.message),
      idempotencyKey: pendingCreateKey,
      ...(this.data.intentState === 'CANCELLED' && currentIntentVersion !== undefined
        ? { expectedVersion: currentIntentVersion }
        : {}),
    });
    if (!result.ok) {
      this.setData({ submitting: false, feedback: result.message, feedbackTone: 'error' });
      return;
    }
    pendingCreateKey = undefined;
    currentIntentId = result.data.intent.intentId;
    currentIntentVersion = result.data.intent.version;
    this.setData({
      submitting: false,
      intentState: result.data.intent.state,
      purpose: result.data.intent.purpose,
      feedback: '当前 ACTIVE 联系意向已确认；可能是本次新建或恢复既有状态，不代表订单或成交。',
      feedbackTone: 'success',
    });
  },

  async handleIntentCancel() {
    if (this.data.submitting || this.data.intentState !== 'ACTIVE' || !currentIntentId || !currentIntentVersion) return;
    const runtime = getRuntimeEvidence();
    this.setData({ submitting: true, feedback: '', feedbackTone: 'neutral' });

    if (runtime.runtimeMode !== RuntimeMode.LIVE || !runtime.cloudConfigured) {
      this.setData({ submitting: false, feedback: '当前未连接正式服务，未变更任何意向。', feedbackTone: 'error' });
      return;
    }

    pendingCancelKey ??= await createArtIdempotencyKey();
    const result = await cancelContentIntent({
      intentId: currentIntentId,
      expectedVersion: currentIntentVersion,
      idempotencyKey: pendingCancelKey,
    });
    if (!result.ok) {
      this.setData({ submitting: false, feedback: result.message, feedbackTone: 'error' });
      return;
    }
    pendingCancelKey = undefined;
    currentIntentVersion = result.data.intent.version;
    this.setData({
      submitting: false,
      intentState: result.data.intent.state,
      feedback: '联系意向已取消。',
      feedbackTone: 'success',
    });
  },

  handleRetry() {
    void this.loadContext();
  },
});
