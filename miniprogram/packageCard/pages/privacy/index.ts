import { Visibility } from '../../../shared/types/enums';
import { getRuntimeEvidence } from '../../../pages/card/services/identity-client';

interface PrivacyFieldView {
  readonly fieldKey: string;
  readonly label: string;
  readonly value: string;
  readonly visibility: string;
  readonly disabled: boolean;
  readonly sensitive: boolean;
  readonly helper: string;
}

const CONTRACT_PENDING_FIELDS: readonly PrivacyFieldView[] = [
  {
    fieldKey: 'displayName',
    label: '昵称',
    value: '公开投影候选字段',
    visibility: '',
    disabled: true,
    sensitive: false,
    helper: '1.0 DTO 未返回逐字段设置，当前无法读取或修改真实值。',
  },
  {
    fieldKey: 'avatar',
    label: '头像',
    value: '公开投影候选字段',
    visibility: '',
    disabled: true,
    sensitive: false,
    helper: '头像上传和字段级可见性动作均待合同集成。',
  },
  {
    fieldKey: 'cityId',
    label: '城市',
    value: '公开投影候选字段',
    visibility: '',
    disabled: true,
    sensitive: false,
    helper: '服务端仍负责最小投影，但客户端目前拿不到该字段的真实 Visibility。',
  },
  {
    fieldKey: 'biography',
    label: '一句话介绍',
    value: '公开投影候选字段',
    visibility: '',
    disabled: true,
    sensitive: false,
    helper: '不能把本地选择冒充服务端隐私设置。',
  },
  ...['教育', '职业', '行业', '公司', '职位', '经历', '兴趣'].map((label, index) => ({
    fieldKey: ['education', 'profession', 'industry', 'company', 'position', 'experience', 'interests'][index] ?? `optional-${index}`,
    label,
    value: '完整资料字段',
    visibility: '',
    disabled: true,
    sensitive: false,
    helper: 'ProfileUpdateInput 与 ProfilePrivateDto 1.0 尚未声明该字段。',
  })),
];

const PERMANENT_PRIVATE_FIELDS: readonly PrivacyFieldView[] = [
  { fieldKey: 'phone', label: '手机号', value: '不显示具体值', visibility: Visibility.PRIVATE, disabled: true, sensitive: true, helper: '永久不进入 cards_public、分享 query 或海报。' },
  { fieldKey: 'identityDocument', label: '证件信息', value: '不显示具体值', visibility: Visibility.PRIVATE, disabled: true, sensitive: true, helper: '只在受控私密域使用，不能改为公开。' },
  { fieldKey: 'reviewEvidence', label: '审核原件', value: '不显示 URL', visibility: Visibility.PRIVATE, disabled: true, sensitive: true, helper: '审核材料 URL 永久不进入公开投影。' },
  { fieldKey: 'wechatIdentity', label: '微信标识', value: '不显示 OPENID/微信号', visibility: Visibility.PRIVATE, disabled: true, sensitive: true, helper: '身份只来自云函数上下文，客户端不读取或提交 OPENID。' },
  { fieldKey: 'risk', label: '内部风控字段', value: '不显示具体值', visibility: Visibility.PRIVATE, disabled: true, sensitive: true, helper: '仅供授权服务端流程使用。' },
];

Page({
  data: {
    runtimeMode: 'OFFLINE_DEMO',
    contractPendingFields: CONTRACT_PENDING_FIELDS,
    permanentPrivateFields: PERMANENT_PRIVATE_FIELDS,
    message: '字段级 Visibility 尚未进入冻结客户端 DTO；本页只解释真实语义，不伪造保存。',
  },

  onLoad() {
    this.setData({ runtimeMode: getRuntimeEvidence().runtimeMode });
  },

  handleUnavailableChange() {
    this.setData({ message: '此设置尚无冻结 action 可提交，未发生任何保存。' });
  },
});
