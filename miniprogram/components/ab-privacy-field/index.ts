import { Visibility, type Visibility as VisibilityValue } from '../../shared/types/enums';

interface VisibilityOption {
  readonly value: VisibilityValue;
  readonly title: string;
  readonly summary: string;
}

const VISIBILITY_OPTIONS: readonly VisibilityOption[] = [
  {
    value: Visibility.PUBLIC,
    title: '所有人可见',
    summary: '会进入服务端公开投影，并可能显示在数字名片、分享入口与海报中。',
  },
  {
    value: Visibility.FRIENDS_ONLY,
    title: '仅已接受好友可见',
    summary: '服务端每次读取都会重查好友与拉黑状态；删除好友或关系失效后，刷新即收回。',
  },
  {
    value: Visibility.PRIVATE,
    title: '仅本人可见',
    summary: '不会进入公开名片、分享 query、小程序码 scene 或海报内容。',
  },
];

const VALID_VISIBILITIES = new Set<VisibilityValue>(VISIBILITY_OPTIONS.map((option) => option.value));

function isVisibility(value: unknown): value is VisibilityValue {
  return typeof value === 'string' && VALID_VISIBILITIES.has(value as VisibilityValue);
}

Component({
  options: {
    multipleSlots: true,
    styleIsolation: 'apply-shared',
  },
  properties: {
    fieldKey: { type: String, value: '' },
    label: { type: String, value: '' },
    visibility: { type: String, value: '' },
    helper: { type: String, value: '' },
    disabled: { type: Boolean, value: false },
    sensitive: { type: Boolean, value: false },
    required: { type: Boolean, value: false },
  },
  data: {
    options: VISIBILITY_OPTIONS,
    selectedVisibility: '' as VisibilityValue | '',
    visibilityKnown: false,
    lockedPrivate: false,
  },
  observers: {
    'visibility, sensitive'(visibility: string, sensitive: boolean) {
      this.syncVisibility(visibility, sensitive);
    },
  },
  lifetimes: {
    attached() {
      this.syncVisibility(this.properties.visibility, this.properties.sensitive);
    },
  },
  methods: {
    syncVisibility(value: string, sensitive: boolean) {
      if (sensitive) {
        this.setData({
          selectedVisibility: Visibility.PRIVATE,
          visibilityKnown: true,
          lockedPrivate: true,
        });
        return;
      }

      this.setData({
        selectedVisibility: isVisibility(value) ? value : '',
        visibilityKnown: isVisibility(value),
        lockedPrivate: false,
      });
    },
    handleSelect(event: WechatMiniprogram.TouchEvent) {
      if (this.properties.disabled || this.properties.sensitive) return;
      const visibility = event.currentTarget.dataset.visibility;
      if (!isVisibility(visibility) || visibility === this.data.selectedVisibility) return;

      this.setData({
        selectedVisibility: visibility,
        visibilityKnown: true,
      });
      this.triggerEvent('change', {
        fieldKey: this.properties.fieldKey,
        visibility,
      });
    },
  },
});
