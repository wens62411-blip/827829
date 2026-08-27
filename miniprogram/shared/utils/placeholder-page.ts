import { type ShareEntryQuery } from '../contracts';
import { RuntimeMode } from '../types/enums';

export interface PlaceholderPageCopy {
  readonly title: string;
  readonly eyebrow: string;
  readonly description: string;
  readonly runtimeMode: typeof RuntimeMode.OFFLINE_DEMO;
}

export function createPlaceholderPage(title: string, eyebrow: string, description: string) {
  return {
    data: {
      title,
      eyebrow,
      description,
      runtimeMode: RuntimeMode.OFFLINE_DEMO,
    } satisfies PlaceholderPageCopy,
  };
}

export function createShareEntryPage(title: string, targetType: 'CARD' | 'EVENT') {
  return {
    data: {
      title,
      eyebrow: '微信分享冷启动入口',
      description: '模块待接入。当前不会解析真实分享内容，也不会回退到演示数据。',
      runtimeMode: RuntimeMode.OFFLINE_DEMO,
      action: 'share.resolve' as const,
      targetType,
      referencePresent: false,
    },
    onLoad(this: { setData(data: { referencePresent: boolean }): void }, query: ShareEntryQuery) {
      this.setData({ referencePresent: Boolean(query.scene || query.token) });
    },
  };
}
