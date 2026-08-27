import type { ApiFailure } from '../../shared/types/api';
import type { PaymentCapabilityProjection } from '../../shared/types/projections';
import type {
AdminCaseActionView,
AdminGateState,
AdminQueue,
PaymentUiState,
} from './admin-types';

const ACCESS_FAILURES = new Set(['AUTH_REQUIRED', 'SESSION_EXPIRED', 'FORBIDDEN', 'ROLE_REQUIRED']);

export function gateStateForFailure(failure: ApiFailure): Exclude<AdminGateState, 'CHECKING' | 'AUTHORIZED'> {
return ACCESS_FAILURES.has(failure.error.code) ? 'DENIED' : 'UNAVAILABLE';
}

export function hasQueue(
queues: readonly AdminQueue[],
required: AdminQueue | readonly AdminQueue[],
): boolean {
const requested = Array.isArray(required) ? required : [required];
return requested.some((queue) => queues.includes(queue));
}

export function socialCaseActions(status: string): readonly AdminCaseActionView[] {
if (status === 'UNDER_REVIEW') {
return [
{ id: 'APPROVE', label: '人工通过', tone: 'primary' },
{ id: 'REJECT', label: '拒绝', tone: 'danger' },
{ id: 'REQUEST_CHANGES', label: '补充材料', tone: 'warning' },
];
}
if (status === 'APPROVED') {
return [{ id: 'REVOKE', label: '撤销公开标签', tone: 'danger' }];
}
return [];
}

export function reportActions(status: string): readonly AdminCaseActionView[] {
if (status !== 'OPEN') return [];
return [
{ id: 'REPORT_ACTION_TAKEN', label: '已采取措施', tone: 'primary' },
{ id: 'REPORT_DISMISS', label: '驳回举报', tone: 'neutral' },
];
}

export function operationsCaseActions(
domain: 'EVENT' | 'ORGANIZER',
status: string,
): readonly AdminCaseActionView[] {
if (status === 'UNDER_REVIEW') {
if (domain === 'ORGANIZER') {
// Frozen PublicOrganizerProjection can represent only an approved,
// human-reviewed organizer. Do not render buttons whose frozen response
// cannot safely represent REJECT or REQUEST_CHANGES.
return [{ id: 'APPROVE', label: '人工通过', tone: 'primary' }];
}
return [
{ id: 'APPROVE', label: '人工通过', tone: 'primary' },
{ id: 'REJECT', label: '拒绝', tone: 'danger' },
{ id: 'REQUEST_CHANGES', label: '补充材料', tone: 'warning' },
];
}
if (domain === 'EVENT' && status === 'APPROVED') {
return [
{ id: 'PAUSE', label: '暂停活动', tone: 'warning' },
{ id: 'CANCEL', label: '取消活动', tone: 'danger' },
];
}
return [];
}

export function contentCaseActions(status: string): readonly AdminCaseActionView[] {
if (status === 'UNDER_REVIEW') {
return [
{ id: 'APPROVE', label: '人工发布', tone: 'primary' },
{ id: 'REJECT', label: '拒绝', tone: 'danger' },
{ id: 'REQUEST_CHANGES', label: '补充材料', tone: 'warning' },
];
}
if (status === 'APPROVED') {
return [{ id: 'UNPUBLISH', label: '下架内容', tone: 'danger' }];
}
return [];
}

export function paymentUiFromCapability(
capability: PaymentCapabilityProjection | undefined,
): PaymentUiState {
if (!capability) {
return {
checked: false,
enabled: false,
reason: '无法确认支付能力，订单与退款入口保持隐藏。',
};
}
if (
capability.enabled === true &&
capability.state !== 'DISABLED' &&
capability.reason === 'CAPABILITY_AVAILABLE'
) {
return {
checked: true,
enabled: true,
reason: '支付能力已启用，但冻结合同尚未提供订单或退款管理 Action。',
};
}
const reasons: Record<string, string> = {
P0_DISABLED: 'P0 支付能力未启用，不显示订单或退款入口。',
EVENT_FREE: '当前活动无需支付，不显示订单或退款入口。',
};
return {
checked: true,
enabled: false,
reason: reasons[capability.reason] ?? '支付能力不可用，订单与退款入口保持隐藏。',
};
}

export function splitRequiredChanges(value: string): readonly string[] {
return value
.split(/\r?\n/)
.map((item) => item.trim())
.filter((item) => item.length > 0);
}

export function requiredChangesAreValid(items: readonly string[]): boolean {
return items.length >= 1
&& items.length <= 10
&& items.every((item) => item.length >= 2
&& item.length <= 200
&& !/[\u0000-\u001F\u007F]/.test(item)
&& !/(?:[a-z][a-z0-9+.-]*:\/\/|(?:blob|data):|\/\/[A-Za-z0-9])/i.test(item));
}
