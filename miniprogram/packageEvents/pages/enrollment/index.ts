import { LOCAL_RUNTIME } from '../../../shared/services/runtime';
import { EnrollmentState, PaymentState, RuntimeMode } from '../../../shared/types/enums';
import type {
EventId,
IdempotencyKey,
OptimisticVersion,
} from '../../../shared/types/primitives';
import { createRequestId } from '../../../shared/utils/request-id';
import { getEventCloudClient } from '../../../components/ab-event-card/cloud-client-loader';
const CANCELLABLE_ENROLLMENTS: readonly string[] = [
EnrollmentState.INTERESTED,
EnrollmentState.WAITLISTED,
EnrollmentState.CONFIRMED,
];
function createWriteKey(operation: 'interest' | 'cancel'): IdempotencyKey {
const suffix = Math.random().toString(36).slice(2, 10);
return `idem_evt_${operation}_${Date.now().toString(36)}_${suffix}` as IdempotencyKey;
}
Page({
data: {
runtimeMode: LOCAL_RUNTIME.mode as string,
eventId: '',
loading: false,
busy: false,
loaded: false,
eligibilityLabel: '未检查',
eligibilityDetail: '服务端会检查活动状态、时间和已批准准入标签。',
enrollmentStateLabel: '尚无兴趣登记',
enrollmentVersion: 0,
eventVersion: 0,
canRegisterInterest: false,
canCancelInterest: false,
paymentStateLabel: PaymentState.DISABLED as string,
paymentReasonLabel: 'P0_DISABLED · 支付按钮隐藏',
operationMessage: '',
registerIdempotencyKey: '',
cancelIdempotencyKey: '',
stateKind: 'EMPTY',
stateTitle: '兴趣登记尚未载入',
stateDescription: '请从经人工复核且可公开的活动详情进入。',
stateDetail: '客户端不能提交城市、人数、资格标签或 organizer 角色；服务端从可信记录重新校验。',
},
onLoad(query: Record<string, string | undefined>) {
if (!query.eventId) return;
this.setData({ eventId: query.eventId });
void this.loadEnrollment(query.eventId as EventId);
},
async loadEnrollment(eventId: EventId) {
if (!LOCAL_RUNTIME.cloudEnvironmentConfigured) {
this.setData({
stateKind: 'OFFLINE',
stateTitle: '正式兴趣登记未连接',
stateDescription: 'OFFLINE_DEMO 不会模拟登记、满员、支付或成功状态。',
});
return;
}
const { callCloudAction } = getEventCloudClient();
this.setData({ loading: true });
try {
const [eligibilityResult, enrollmentResult, paymentResult, eventResult] = await Promise.all([
callCloudAction('event.checkEligibility', createRequestId(), {
contractVersion: '1.0.0',
eventId,
}),
callCloudAction('event.getEnrollment', createRequestId(), {
contractVersion: '1.0.0',
eventId,
}),
callCloudAction('payment.getCapability', createRequestId(), {
contractVersion: '1.0.0',
eventId,
}),
callCloudAction('event.get', createRequestId(), {
contractVersion: '1.0.0',
eventId,
}),
]);
if (!eligibilityResult.apiResult.ok) {
this.showFailure(eligibilityResult.apiResult.error.message);
return;
}
if (!enrollmentResult.apiResult.ok) {
this.showFailure(enrollmentResult.apiResult.error.message);
return;
}
if (!eventResult.apiResult.ok) {
this.showFailure(eventResult.apiResult.error.message);
return;
}
const eligibility = eligibilityResult.apiResult.data.eligibility;
const enrollment = enrollmentResult.apiResult.data.enrollment;
const payment = paymentResult.apiResult.ok ? paymentResult.apiResult.data.capability : null;
const canCancelInterest = Boolean(
enrollment && CANCELLABLE_ENROLLMENTS.includes(enrollment.state),
);
this.setData({
runtimeMode: RuntimeMode.LIVE,
loading: false,
loaded: true,
eligibilityLabel: eligibility.eligible ? '符合当前准入条件' : '不符合当前准入条件',
eligibilityDetail: eligibility.eligible
? '资格由服务端根据已批准标签计算；客户端没有提交资格标签。'
: eligibility.failureReason ?? '资格原因未公开',
enrollmentStateLabel: enrollment?.state ?? '尚无兴趣登记',
enrollmentVersion: enrollment?.version ?? 0,
eventVersion: eventResult.apiResult.data.event.version,
canRegisterInterest: eligibility.eligible && !enrollment && eventResult.apiResult.data.event.version > 0,
canCancelInterest,
paymentStateLabel: payment?.state ?? PaymentState.DISABLED,
paymentReasonLabel: payment
? `${payment.reason} · ${payment.enabled ? '能力已声明但无支付发起 action' : '支付按钮隐藏'}`
: '支付能力未满足或未鉴权 · 支付按钮隐藏',
});
} catch {
this.showFailure('无法连接兴趣登记服务。');
}
},
async registerInterest() {
if (!LOCAL_RUNTIME.cloudEnvironmentConfigured || this.data.busy || !this.data.canRegisterInterest || !this.data.eventId) return;
const { callCloudAction } = getEventCloudClient();
const eventId = this.data.eventId as EventId;
const idempotencyKey = (this.data.registerIdempotencyKey ||
createWriteKey('interest')) as IdempotencyKey;
const expectedVersion = this.data.eventVersion as OptimisticVersion;
this.setData({ busy: true, registerIdempotencyKey: idempotencyKey, operationMessage: '' });
try {
const result = await callCloudAction('event.registerInterest', createRequestId(), {
contractVersion: '1.0.0',
eventId,
acknowledgedTermsVersion: 'event-interest-terms-v1',
expectedVersion,
idempotencyKey,
});
if (!result.apiResult.ok) {
this.setData({ busy: false, operationMessage: result.apiResult.error.message });
return;
}
const enrollment = result.apiResult.data.enrollment;
this.setData({
busy: false,
enrollmentStateLabel: enrollment.state,
enrollmentVersion: enrollment.version,
canRegisterInterest: false,
canCancelInterest: CANCELLABLE_ENROLLMENTS.includes(enrollment.state),
paymentStateLabel: enrollment.paymentState,
operationMessage: '兴趣登记已由服务端确认；重复请求会复用同一幂等键。',
registerIdempotencyKey: '',
});
} catch {
this.setData({
busy: false,
operationMessage: '请求结果未知；再次提交会复用同一幂等键，由服务端避免重复登记。',
});
}
},
async cancelInterest() {
if (!LOCAL_RUNTIME.cloudEnvironmentConfigured || this.data.busy || !this.data.canCancelInterest || !this.data.eventId) return;
const { callCloudAction } = getEventCloudClient();
const eventId = this.data.eventId as EventId;
const idempotencyKey = (this.data.cancelIdempotencyKey ||
createWriteKey('cancel')) as IdempotencyKey;
const expectedVersion = this.data.enrollmentVersion as OptimisticVersion;
this.setData({ busy: true, cancelIdempotencyKey: idempotencyKey, operationMessage: '' });
try {
const result = await callCloudAction('event.cancelInterest', createRequestId(), {
contractVersion: '1.0.0',
eventId,
reasonCode: 'OTHER',
expectedVersion,
idempotencyKey,
});
if (!result.apiResult.ok) {
this.setData({ busy: false, operationMessage: result.apiResult.error.message });
return;
}
const enrollment = result.apiResult.data.enrollment;
this.setData({
busy: false,
enrollmentStateLabel: enrollment.state,
enrollmentVersion: enrollment.version,
canRegisterInterest: false,
canCancelInterest: false,
operationMessage: '取消状态已由服务端确认。',
cancelIdempotencyKey: '',
});
} catch {
this.setData({
busy: false,
operationMessage: '取消结果未知；再次提交会复用同一幂等键。',
});
}
},
showFailure(message: string) {
this.setData({
runtimeMode: RuntimeMode.DEGRADED,
loading: false,
loaded: false,
stateKind: 'ERROR',
stateTitle: '兴趣登记不可用',
stateDescription: message,
stateDetail: '没有客户端直写、模拟成功或支付成功回退。',
});
},
});
