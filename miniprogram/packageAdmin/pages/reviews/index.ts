import type { ApiFailure } from '../../../shared/types/api';
import type { ReportProjection, ReviewCaseProjection } from '../../../shared/types/projections';
import {
approveReviewCase,
bootstrapAdmin,
createAdminIdempotencyKey,
getReviewCase,
listReports,
listReviewCases,
rejectReviewCase,
requestReviewChanges,
resolveReport,
revokeReviewCase,
} from '../../lib/admin-client';
import {
gateStateForFailure,
hasQueue,
reportActions,
requiredChangesAreValid,
socialCaseActions,
splitRequiredChanges,
} from '../../lib/admin-policy';
import type {
AdminDecisionEventDetail,
AdminSelectionSecret,
} from '../../lib/admin-types';
import {
reportDetailView,
reportQueueItemView,
reviewDetailView,
reviewQueueItemView,
} from '../../lib/admin-view-model';

type ReviewsRawSelection = { readonly kind: 'REPORT'; readonly value: ReportProjection };

interface ReviewsController {
generation: number;
sequence: number;
readonly rawByHandle: Map<string, ReviewsRawSelection>;
readonly secretByHandle: Map<string, AdminSelectionSecret>;
selectedHandle: string | undefined;
cursor: import('../../../shared/types/primitives').PaginationCursor | undefined;
detailTimer: number | undefined;
}

type WriteOutcome = 'SUCCESS' | 'VERSION_CONFLICT' | 'DENIED' | 'FAILED';

const controllers = new WeakMap<object, ReviewsController>();

function createController(generation = 1): ReviewsController {
return {
generation,
sequence: 0,
rawByHandle: new Map(),
secretByHandle: new Map(),
selectedHandle: undefined,
cursor: undefined,
detailTimer: undefined,
};
}

function controllerFor(page: object): ReviewsController {
let controller = controllers.get(page);
if (!controller) {
controller = createController();
controllers.set(page, controller);
}
return controller;
}

function resetController(page: object): ReviewsController {
const previous = controllers.get(page);
if (previous?.detailTimer !== undefined) clearTimeout(previous.detailTimer);
const controller = createController((previous?.generation ?? 0) + 1);
controllers.set(page, controller);
return controller;
}

function makeHandle(controller: ReviewsController): string {
controller.sequence += 1;
return `row_${controller.generation}_${controller.sequence}`;
}

function classifyWriteFailure(failure: ApiFailure): WriteOutcome {
if (failure.error.code === 'VERSION_CONFLICT') return 'VERSION_CONFLICT';
return gateStateForFailure(failure) === 'DENIED' ? 'DENIED' : 'FAILED';
}

async function executeDecision(
secret: AdminSelectionSecret,
detail: AdminDecisionEventDetail,
): Promise<WriteOutcome> {
const idempotencyKey = createAdminIdempotencyKey();
if (secret.kind === 'REPORT') {
const resolution = detail.action === 'REPORT_ACTION_TAKEN'
? 'ACTION_TAKEN'
: detail.action === 'REPORT_DISMISS'
? 'DISMISSED'
: undefined;
if (!resolution) return 'FAILED';
const result = await resolveReport(
secret.reportId,
secret.version,
resolution,
detail.note,
idempotencyKey,
);
return result.ok ? 'SUCCESS' : classifyWriteFailure(result);
}
if (detail.action === 'APPROVE') {
const result = await approveReviewCase(
secret.reviewCaseId,
secret.version,
detail.note,
idempotencyKey,
);
return result.ok ? 'SUCCESS' : classifyWriteFailure(result);
}
if (detail.action === 'REJECT') {
const result = await rejectReviewCase(
secret.reviewCaseId,
secret.version,
detail.reasonCode,
detail.note,
idempotencyKey,
);
return result.ok ? 'SUCCESS' : classifyWriteFailure(result);
}
if (detail.action === 'REQUEST_CHANGES') {
const result = await requestReviewChanges(
secret.reviewCaseId,
secret.version,
splitRequiredChanges(detail.changesText),
idempotencyKey,
);
return result.ok ? 'SUCCESS' : classifyWriteFailure(result);
}
if (detail.action === 'REVOKE') {
const result = await revokeReviewCase(
secret.reviewCaseId,
secret.version,
detail.reasonCode,
idempotencyKey,
);
return result.ok ? 'SUCCESS' : classifyWriteFailure(result);
}
return 'FAILED';
}

Page({
data: {
gateState: 'CHECKING' as 'CHECKING' | 'AUTHORIZED' | 'DENIED' | 'UNAVAILABLE',
gateTitle: '正在核验审核权限',
gateMessage: '页面不会信任路径参数中的角色或管理员标记。',
runtimeMode: 'OFFLINE_DEMO',
availableQueues: [] as readonly ('SOCIAL' | 'REPORT')[],
socialAvailable: false,
reportAvailable: false,
selectedQueue: 'SOCIAL' as 'SOCIAL' | 'REPORT',
items: [] as readonly object[],
loading: false,
hasMore: false,
selectedHandle: '',
detail: null as object | null,
actions: [] as readonly object[],
actionBusy: false,
detailNotice: '',
},
onShow() {
void this.refreshAccess();
},
onHide() {
resetController(this);
this.setData({ items: [], selectedHandle: '', detail: null, actions: [], actionBusy: false });
},
onUnload() {
resetController(this);
controllers.delete(this);
},
async refreshAccess() {
const controller = resetController(this);
this.setData({
gateState: 'CHECKING',
gateTitle: '正在核验审核权限',
gateMessage: '页面不会信任路径参数中的角色或管理员标记。',
availableQueues: [],
socialAvailable: false,
reportAvailable: false,
items: [],
loading: false,
hasMore: false,
selectedHandle: '',
detail: null,
actions: [],
actionBusy: false,
detailNotice: '',
});
try {
const result = await bootstrapAdmin('REVIEW');
if (controllers.get(this)?.generation !== controller.generation) return;
if (!result.ok) {
const state = gateStateForFailure(result);
this.setData({
gateState: state,
gateTitle: state === 'DENIED' ? '无标签或举报审核权限' : '审核服务不可用',
gateMessage: state === 'DENIED'
? '服务端拒绝了当前可信身份。直接访问页面不会绕过 RBAC。'
: '无法完成云端授权，本页不会回退到模拟队列。',
});
return;
}
const queues = result.data.availableQueues.filter(
(queue): queue is 'SOCIAL' | 'REPORT' => queue === 'SOCIAL' || queue === 'REPORT',
);
if (!hasQueue(queues, ['SOCIAL', 'REPORT'])) {
this.setData({
gateState: 'DENIED',
gateTitle: '没有可用审核队列',
gateMessage: 'bootstrap 未返回 SOCIAL 或 REPORT 队列。',
});
return;
}
const selectedQueue = queues.includes(this.data.selectedQueue)
? this.data.selectedQueue
: (queues[0] ?? 'SOCIAL');
this.setData({
gateState: 'AUTHORIZED',
runtimeMode: result.data.session.runtimeMode,
availableQueues: queues,
socialAvailable: queues.includes('SOCIAL'),
reportAvailable: queues.includes('REPORT'),
selectedQueue,
});
await this.loadQueue(false);
} catch {
if (controllers.get(this)?.generation !== controller.generation) return;
this.setData({
gateState: 'UNAVAILABLE',
gateTitle: '审核服务不可用',
gateMessage: '当前环境无法完成云端授权，本页不会使用测试 fixture。',
});
}
},
async loadQueue(append: boolean) {
const controller = controllerFor(this);
const generation = controller.generation;
this.setData({ loading: true, detailNotice: '' });
try {
const result = this.data.selectedQueue === 'REPORT'
? await listReports(append ? controller.cursor : undefined)
: await listReviewCases('SOCIAL', append ? controller.cursor : undefined);
if (controllers.get(this)?.generation !== generation) return;
if (!result.ok) {
const state = gateStateForFailure(result);
if (state === 'DENIED') {
resetController(this);
this.setData({
gateState: 'DENIED',
items: [],
detail: null,
loading: false,
gateTitle: '队列访问被拒绝',
gateMessage: '会话权限可能已变化，请返回后重新核验。',
});
} else {
this.setData({ loading: false, detailNotice: '队列读取失败，未展示缓存或模拟数据。' });
}
return;
}
if (!append) {
controller.rawByHandle.clear();
controller.secretByHandle.clear();
}
const nextItems = result.data.page.items.map((item) => {
const handle = makeHandle(controller);
if (this.data.selectedQueue === 'REPORT') {
const report = item as ReportProjection;
controller.rawByHandle.set(handle, { kind: 'REPORT', value: report });
controller.secretByHandle.set(handle, {
kind: 'REPORT',
reportId: report.reportId,
version: report.version,
});
return reportQueueItemView(report, handle);
}
const reviewCase = item as ReviewCaseProjection;
controller.secretByHandle.set(handle, {
kind: 'REVIEW_CASE',
reviewCaseId: reviewCase.reviewCaseId,
aggregateId: reviewCase.aggregateId,
domain: 'SOCIAL',
version: reviewCase.version,
});
return reviewQueueItemView(reviewCase, handle);
});
controller.cursor = result.data.page.nextCursor;
this.setData({
items: append ? [...this.data.items, ...nextItems] : nextItems,
loading: false,
hasMore: result.data.page.hasMore,
});
} catch {
if (controllers.get(this)?.generation !== generation) return;
this.setData({ loading: false, detailNotice: '队列服务不可用，未回退到测试数据。' });
}
},
onQueueChange(event: { currentTarget: { dataset: { queue?: 'SOCIAL' | 'REPORT' } } }) {
const queue = event.currentTarget.dataset.queue;
if (this.data.actionBusy
|| !queue
|| !this.data.availableQueues.includes(queue)
|| queue === this.data.selectedQueue) return;
const previous = controllerFor(this);
const controller = resetController(this);
controller.generation = previous.generation + 1;
this.setData({
selectedQueue: queue,
items: [],
selectedHandle: '',
detail: null,
actions: [],
hasMore: false,
});
void this.loadQueue(false);
},
async onSelect(event: { detail: { handle?: string } }) {
const handle = event.detail.handle;
if (!handle || this.data.actionBusy) return;
const controller = controllerFor(this);
const secret = controller.secretByHandle.get(handle);
if (!secret) return;
if (controller.detailTimer !== undefined) clearTimeout(controller.detailTimer);
controller.detailTimer = undefined;
controller.selectedHandle = handle;
this.setData({
selectedHandle: handle,
detail: null,
actions: [],
actionBusy: false,
detailNotice: '正在读取所选案件…',
});
if (secret.kind === 'REPORT') {
const raw = controller.rawByHandle.get(handle);
if (!raw) return;
this.setData({
detail: reportDetailView(raw.value, handle),
actions: reportActions(raw.value.status),
detailNotice: '',
});
this.armDetailExpiry();
return;
}
try {
const result = await getReviewCase(secret.reviewCaseId);
if (controllerFor(this).selectedHandle !== handle) return;
if (!result.ok) {
this.setData({ detail: null, actions: [], detailNotice: '案件详情读取被拒绝或已失效。' });
return;
}
controller.secretByHandle.set(handle, {
kind: 'REVIEW_CASE',
reviewCaseId: result.data.reviewCase.reviewCaseId,
aggregateId: result.data.reviewCase.aggregateId,
domain: 'SOCIAL',
version: result.data.reviewCase.version,
});
this.setData({
detail: reviewDetailView(result.data.reviewCase, handle),
actions: socialCaseActions(result.data.reviewCase.status),
detailNotice: '',
});
this.armDetailExpiry();
} catch {
if (controllerFor(this).selectedHandle !== handle) return;
this.setData({ detail: null, actions: [], detailNotice: '详情服务不可用，未读取任何本地材料。' });
}
},
armDetailExpiry() {
const controller = controllerFor(this);
if (controller.detailTimer !== undefined) clearTimeout(controller.detailTimer);
controller.detailTimer = setTimeout(() => {
if (controllers.get(this) !== controller) return;
this.clearDetail();
this.setData({ detailNotice: '案件详情已在 120 秒后自动清除。' });
}, 120000);
},
clearDetail() {
const controller = controllerFor(this);
if (controller.detailTimer !== undefined) clearTimeout(controller.detailTimer);
if (controller.selectedHandle) {
controller.rawByHandle.delete(controller.selectedHandle);
controller.secretByHandle.delete(controller.selectedHandle);
}
controller.detailTimer = undefined;
controller.selectedHandle = undefined;
this.setData({ selectedHandle: '', detail: null, actions: [], actionBusy: false });
},
async onDecision(event: { detail: AdminDecisionEventDetail }) {
const controller = controllerFor(this);
const handle = controller.selectedHandle;
const secret = handle ? controller.secretByHandle.get(handle) : undefined;
if (!secret || this.data.actionBusy) return;
const allowed = this.data.actions.some((action: { id?: string }) => action.id === event.detail.action);
const changes = splitRequiredChanges(event.detail.changesText);
const noteRequired = event.detail.action !== 'REQUEST_CHANGES' && event.detail.action !== 'REVOKE';
if (!allowed || (noteRequired && !event.detail.note)) {
this.setData({ detailNotice: '请填写审核说明，并只使用当前案件允许的动作。' });
return;
}
if (
(event.detail.action === 'REJECT' || event.detail.action === 'REVOKE') &&
!event.detail.reasonCode
) {
this.setData({ detailNotice: '拒绝或撤销必须填写原因代码。' });
return;
}
if (event.detail.action === 'REQUEST_CHANGES' && !requiredChangesAreValid(changes)) {
this.setData({ detailNotice: '补充材料须为 1 至 10 项，每项 2 至 200 字且不得包含原始链接。' });
return;
}
if (controller.detailTimer !== undefined) clearTimeout(controller.detailTimer);
controller.detailTimer = undefined;
const activeController = controller;
const activeHandle = handle;
this.setData({
actionBusy: true,
detail: null,
actions: [],
detailNotice: '正在提交明确的人工操作…',
});
try {
const outcome = await executeDecision(secret, event.detail);
if (controllers.get(this) !== activeController
|| activeController.selectedHandle !== activeHandle) return;
if (outcome === 'SUCCESS') {
wx.showToast({ title: '人工操作已提交', icon: 'success' });
this.clearDetail();
await this.loadQueue(false);
return;
}
if (outcome === 'VERSION_CONFLICT') {
this.clearDetail();
this.setData({ detailNotice: '案件版本已变化，未自动重试。请重新读取后再决定。' });
await this.loadQueue(false);
return;
}
if (outcome === 'DENIED') {
resetController(this);
this.setData({
gateState: 'DENIED',
items: [],
detail: null,
actions: [],
actionBusy: false,
gateTitle: '操作权限已失效',
gateMessage: '服务端拒绝了本次 action，未写入客户端模拟结果。',
});
return;
}
this.clearDetail();
this.setData({ detailNotice: '操作未成功，案件状态未在客户端伪造更新；请重新选择案件。' });
} catch {
if (controllers.get(this) !== activeController
|| activeController.selectedHandle !== activeHandle) return;
this.clearDetail();
this.setData({ detailNotice: '操作响应不确定；不会生成新幂等键自动重试，请重新读取案件。' });
}
},
onRetryQueue() {
void this.loadQueue(false);
},
onLoadMore() {
if (this.data.hasMore && !this.data.loading) void this.loadQueue(true);
},
});
