import type { ApiFailure } from '../../../shared/types/api';
import {
bootstrapAdmin,
createAdminIdempotencyKey,
getReviewCase,
listReviewCases,
reviewContent,
} from '../../lib/admin-client';
import {
contentCaseActions,
gateStateForFailure,
requiredChangesAreValid,
splitRequiredChanges,
} from '../../lib/admin-policy';
import type { AdminDecisionEventDetail, ReviewCaseSecret } from '../../lib/admin-types';
import { reviewDetailView, reviewQueueItemView } from '../../lib/admin-view-model';

interface ContentController {
generation: number;
sequence: number;
readonly secretByHandle: Map<string, ReviewCaseSecret>;
selectedHandle: string | undefined;
cursor: import('../../../shared/types/primitives').PaginationCursor | undefined;
detailTimer: number | undefined;
}

type WriteOutcome = 'SUCCESS' | 'VERSION_CONFLICT' | 'DENIED' | 'RIGHTS_REQUIRED' | 'FAILED';

const controllers = new WeakMap<object, ContentController>();

function createController(generation = 1): ContentController {
return {
generation,
sequence: 0,
secretByHandle: new Map(),
selectedHandle: undefined,
cursor: undefined,
detailTimer: undefined,
};
}

function controllerFor(page: object): ContentController {
let controller = controllers.get(page);
if (!controller) {
controller = createController();
controllers.set(page, controller);
}
return controller;
}

function resetController(page: object): ContentController {
const previous = controllers.get(page);
if (previous?.detailTimer !== undefined) clearTimeout(previous.detailTimer);
const controller = createController((previous?.generation ?? 0) + 1);
controllers.set(page, controller);
return controller;
}

function classifyFailure(failure: ApiFailure): WriteOutcome {
if (failure.error.code === 'VERSION_CONFLICT') return 'VERSION_CONFLICT';
if (failure.error.code === 'MEDIA_RIGHTS_REQUIRED') return 'RIGHTS_REQUIRED';
return gateStateForFailure(failure) === 'DENIED' ? 'DENIED' : 'FAILED';
}

async function executeContentDecision(
secret: ReviewCaseSecret,
detail: AdminDecisionEventDetail,
): Promise<WriteOutcome> {
if (!['APPROVE', 'REJECT', 'REQUEST_CHANGES', 'UNPUBLISH'].includes(detail.action)) return 'FAILED';
const requiredChanges = splitRequiredChanges(detail.changesText);
const noteParts = [detail.note];
if (detail.reasonCode) noteParts.push(`原因代码：${detail.reasonCode}`);
if (requiredChanges.length > 0) noteParts.push(`补充材料：${requiredChanges.join('；')}`);
const result = await reviewContent(
secret.reviewCaseId,
secret.aggregateId,
secret.version,
detail.action as 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'UNPUBLISH',
noteParts.filter(Boolean).join('\n'),
createAdminIdempotencyKey(),
);
return result.ok ? 'SUCCESS' : classifyFailure(result);
}

Page({
data: {
gateState: 'CHECKING' as 'CHECKING' | 'AUTHORIZED' | 'DENIED' | 'UNAVAILABLE',
gateTitle: '正在核验内容管理权限',
gateMessage: '内容操作按服务端 CONTENT 队列授权。',
runtimeMode: 'OFFLINE_DEMO',
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
gateTitle: '正在核验内容管理权限',
gateMessage: '内容操作按服务端 CONTENT 队列授权。',
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
const result = await bootstrapAdmin('OPERATIONS');
if (controllers.get(this)?.generation !== controller.generation) return;
if (!result.ok || !result.data.availableQueues.includes('CONTENT')) {
const state = result.ok ? 'DENIED' : gateStateForFailure(result);
this.setData({
gateState: state,
gateTitle: state === 'DENIED' ? '无内容管理权限' : '内容服务不可用',
gateMessage: state === 'DENIED'
? '服务端未授权 CONTENT 队列。直接访问页面不会获得权限。'
: '无法完成云端授权，本页不会回退到模拟内容。',
});
return;
}
this.setData({ gateState: 'AUTHORIZED', runtimeMode: result.data.session.runtimeMode });
await this.loadQueue(false);
} catch {
if (controllers.get(this)?.generation !== controller.generation) return;
this.setData({
gateState: 'UNAVAILABLE',
gateTitle: '内容服务不可用',
gateMessage: '当前环境无法完成云端授权，本页不会使用测试 fixture。',
});
}
},
async loadQueue(append: boolean) {
const controller = controllerFor(this);
const generation = controller.generation;
this.setData({ loading: true, detailNotice: '' });
try {
const result = await listReviewCases('CONTENT', append ? controller.cursor : undefined);
if (controllers.get(this)?.generation !== generation) return;
if (!result.ok) {
if (gateStateForFailure(result) === 'DENIED') {
resetController(this);
this.setData({
gateState: 'DENIED',
gateTitle: '内容队列访问被拒绝',
gateMessage: '会话权限可能已变化。',
items: [],
detail: null,
loading: false,
});
} else {
this.setData({ loading: false, detailNotice: '内容队列读取失败，未展示缓存数据。' });
}
return;
}
if (!append) {
controller.secretByHandle.clear();
}
const nextItems = result.data.page.items
.filter((reviewCase) => reviewCase.domain === 'CONTENT')
.map((reviewCase) => {
controller.sequence += 1;
const handle = `content_${controller.generation}_${controller.sequence}`;
controller.secretByHandle.set(handle, {
kind: 'REVIEW_CASE',
reviewCaseId: reviewCase.reviewCaseId,
aggregateId: reviewCase.aggregateId,
domain: 'CONTENT',
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
this.setData({ loading: false, detailNotice: '内容队列服务不可用，未回退到测试数据。' });
}
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
try {
const result = await getReviewCase(secret.reviewCaseId);
if (controllerFor(this).selectedHandle !== handle) return;
if (!result.ok || result.data.reviewCase.domain !== 'CONTENT') {
this.setData({ detail: null, actions: [], detailNotice: '内容案件详情不可用或域不匹配。' });
return;
}
controller.secretByHandle.set(handle, {
kind: 'REVIEW_CASE',
reviewCaseId: result.data.reviewCase.reviewCaseId,
aggregateId: result.data.reviewCase.aggregateId,
domain: 'CONTENT',
version: result.data.reviewCase.version,
});
this.setData({
detail: reviewDetailView(result.data.reviewCase, handle),
actions: contentCaseActions(result.data.reviewCase.status),
detailNotice: '',
});
this.armDetailExpiry();
} catch {
if (controllerFor(this).selectedHandle !== handle) return;
this.setData({ detail: null, actions: [], detailNotice: '详情服务不可用，未读取内容域私有文档。' });
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
if (controller.selectedHandle) controller.secretByHandle.delete(controller.selectedHandle);
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
if (!allowed || !event.detail.note) {
this.setData({ detailNotice: '所有内容操作都必须填写人工审核说明。' });
return;
}
if (event.detail.action === 'REJECT' && !event.detail.reasonCode) {
this.setData({ detailNotice: '拒绝必须填写原因代码。' });
return;
}
if (event.detail.action === 'REQUEST_CHANGES'
&& !requiredChangesAreValid(splitRequiredChanges(event.detail.changesText))) {
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
const outcome = await executeContentDecision(secret, event.detail);
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
if (outcome === 'RIGHTS_REQUIRED') {
this.clearDetail();
this.setData({ detailNotice: '素材权利状态未满足发布要求，服务端已拒绝批准；请重新选择案件。' });
return;
}
if (outcome === 'DENIED') {
resetController(this);
this.setData({
gateState: 'DENIED',
gateTitle: '操作权限已失效',
gateMessage: '服务端拒绝了本次 action。',
items: [],
detail: null,
actions: [],
actionBusy: false,
});
return;
}
this.clearDetail();
this.setData({ detailNotice: '操作未成功，客户端未伪造发布状态；请重新选择案件。' });
} catch {
if (controllers.get(this) !== activeController
|| activeController.selectedHandle !== activeHandle) return;
this.clearDetail();
this.setData({ detailNotice: '操作响应不确定；不会自动生成新请求重试，请重新读取案件。' });
}
},
onRetryQueue() {
void this.loadQueue(false);
},
onLoadMore() {
if (this.data.hasMore && !this.data.loading) void this.loadQueue(true);
},
});
