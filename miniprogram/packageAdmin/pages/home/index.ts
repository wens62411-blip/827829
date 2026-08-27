import { bootstrapAdmin, getPaymentCapability } from '../../lib/admin-client';
import { gateStateForFailure, paymentUiFromCapability } from '../../lib/admin-policy';
import type { AdminQueue, AdminScope } from '../../lib/admin-types';

const SCOPES: readonly AdminScope[] = ['REVIEW', 'OPERATIONS', 'AUDIT'];
const generations = new WeakMap<object, number>();

function nextGeneration(page: object): number {
const generation = (generations.get(page) ?? 0) + 1;
generations.set(page, generation);
return generation;
}

Page({
data: {
gateState: 'CHECKING' as 'CHECKING' | 'AUTHORIZED' | 'DENIED' | 'UNAVAILABLE',
gateTitle: '正在核验管理权限',
gateMessage: '所有入口均以服务端可信身份和 RBAC 结果为准。',
runtimeMode: 'OFFLINE_DEMO',
reviewAvailable: false,
eventsAvailable: false,
contentAvailable: false,
auditAvailable: false,
paymentChecked: false,
paymentEnabled: false,
paymentReason: '尚未核验支付能力，订单与退款入口保持隐藏。',
},
onShow() {
void this.refreshAccess();
},
onUnload() {
nextGeneration(this);
generations.delete(this);
},
async refreshAccess() {
const generation = nextGeneration(this);
this.setData({
gateState: 'CHECKING',
gateTitle: '正在核验管理权限',
gateMessage: '所有入口均以服务端可信身份和 RBAC 结果为准。',
reviewAvailable: false,
eventsAvailable: false,
contentAvailable: false,
auditAvailable: false,
paymentChecked: false,
paymentEnabled: false,
paymentReason: '尚未核验支付能力，订单与退款入口保持隐藏。',
});

const outcomes = await Promise.all(SCOPES.map(async (scope) => {
try {
return { scope, result: await bootstrapAdmin(scope) };
} catch {
return { scope, result: undefined };
}
}));
if (generations.get(this) !== generation) return;

const successful = outcomes.filter((outcome) => outcome.result?.ok === true);
if (successful.length === 0) {
const failures = outcomes
.map((outcome) => outcome.result)
.filter((result) => result !== undefined && result.ok === false);
const allDenied = failures.length > 0 && failures.every((failure) =>
failure !== undefined && !failure.ok && gateStateForFailure(failure) === 'DENIED');
this.setData({
gateState: allDenied ? 'DENIED' : 'UNAVAILABLE',
gateTitle: allDenied ? '无管理权限' : '管理服务不可用',
gateMessage: allDenied
? '当前可信会话未获得任何管理 scope。知道页面路径不会授予权限。'
: '当前环境无法完成云端授权，页面不会回退到测试或模拟数据。',
});
return;
}

const queues = new Set<AdminQueue>();
let runtimeMode = 'OFFLINE_DEMO';
for (const outcome of successful) {
const result = outcome.result;
if (!result?.ok) continue;
result.data.availableQueues.forEach((queue) => queues.add(queue));
runtimeMode = result.data.session.runtimeMode;
}
const auditAvailable = successful.some((outcome) =>
outcome.scope === 'AUDIT' && outcome.result?.ok === true);
this.setData({
gateState: 'AUTHORIZED',
gateTitle: '',
gateMessage: '',
runtimeMode,
reviewAvailable: queues.has('SOCIAL') || queues.has('REPORT'),
eventsAvailable: queues.has('EVENT') || queues.has('ORGANIZER'),
contentAvailable: queues.has('CONTENT'),
auditAvailable,
});

try {
const payment = await getPaymentCapability();
if (generations.get(this) !== generation) return;
const paymentUi = payment.ok
? paymentUiFromCapability(payment.data.capability)
: paymentUiFromCapability(undefined);
this.setData({
paymentChecked: paymentUi.checked,
paymentEnabled: paymentUi.enabled,
paymentReason: paymentUi.reason,
});
} catch {
if (generations.get(this) !== generation) return;
const paymentUi = paymentUiFromCapability(undefined);
this.setData({
paymentChecked: paymentUi.checked,
paymentEnabled: paymentUi.enabled,
paymentReason: paymentUi.reason,
});
}
},
});
