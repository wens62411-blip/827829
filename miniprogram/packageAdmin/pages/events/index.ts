import { COUNTRY_DIRECTORY, type CityId } from '../../../shared/constants/geography';
import type { ApiFailure } from '../../../shared/types/api';
import type { CityProjection } from '../../../shared/types/projections';
import {
bootstrapAdmin,
createAdminIdempotencyKey,
getClubNode,
getPaymentCapability,
getReviewCase,
listCities,
listReviewCases,
reviewEvent,
reviewOrganizer,
} from '../../lib/admin-client';
import {
gateStateForFailure,
hasQueue,
operationsCaseActions,
paymentUiFromCapability,
requiredChangesAreValid,
splitRequiredChanges,
} from '../../lib/admin-policy';
import type {
AdminDecisionEventDetail,
AdminSelectionSecret,
} from '../../lib/admin-types';
import {
cityView,
nodeView,
reviewDetailView,
reviewQueueItemView,
} from '../../lib/admin-view-model';

interface EventsController {
generation: number;
sequence: number;
readonly secretByHandle: Map<string, AdminSelectionSecret>;
readonly cityByHandle: Map<string, CityProjection>;
selectedHandle: string | undefined;
cursor: import('../../../shared/types/primitives').PaginationCursor | undefined;
detailTimer: number | undefined;
}

type WriteOutcome = 'SUCCESS' | 'VERSION_CONFLICT' | 'DENIED' | 'FAILED';

const controllers = new WeakMap<object, EventsController>();

function createController(generation = 1): EventsController {
return {
generation,
sequence: 0,
secretByHandle: new Map(),
cityByHandle: new Map(),
selectedHandle: undefined,
cursor: undefined,
detailTimer: undefined,
};
}

function controllerFor(page: object): EventsController {
let controller = controllers.get(page);
if (!controller) {
controller = createController();
controllers.set(page, controller);
}
return controller;
}

function resetController(page: object): EventsController {
const previous = controllers.get(page);
if (previous?.detailTimer !== undefined) clearTimeout(previous.detailTimer);
const controller = createController((previous?.generation ?? 0) + 1);
controllers.set(page, controller);
return controller;
}

function makeHandle(controller: EventsController, prefix: string): string {
controller.sequence += 1;
return `${prefix}_${controller.generation}_${controller.sequence}`;
}

function classifyWriteFailure(failure: ApiFailure): WriteOutcome {
if (failure.error.code === 'VERSION_CONFLICT') return 'VERSION_CONFLICT';
return gateStateForFailure(failure) === 'DENIED' ? 'DENIED' : 'FAILED';
}

async function executeOperationDecision(
secret: Extract<AdminSelectionSecret, { kind: 'REVIEW_CASE' }>,
detail: AdminDecisionEventDetail,
): Promise<WriteOutcome> {
const idempotencyKey = createAdminIdempotencyKey();
const requiredChanges = splitRequiredChanges(detail.changesText);
const noteParts = [detail.note];
if (detail.reasonCode) noteParts.push(`原因代码：${detail.reasonCode}`);
if (requiredChanges.length > 0) noteParts.push(`补充材料：${requiredChanges.join('；')}`);
const note = noteParts.filter(Boolean).join('\n');

if (secret.domain === 'ORGANIZER') {
if (!['APPROVE', 'REJECT', 'REQUEST_CHANGES'].includes(detail.action)) return 'FAILED';
const result = await reviewOrganizer(
secret.reviewCaseId,
secret.aggregateId,
secret.version,
detail.action as 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES',
note,
idempotencyKey,
);
return result.ok ? 'SUCCESS' : classifyWriteFailure(result);
}
if (!['APPROVE', 'REJECT', 'REQUEST_CHANGES', 'PAUSE', 'CANCEL'].includes(detail.action)) {
return 'FAILED';
}
const result = await reviewEvent(
secret.reviewCaseId,
secret.aggregateId,
secret.version,
detail.action as 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES' | 'PAUSE' | 'CANCEL',
note,
idempotencyKey,
);
return result.ok ? 'SUCCESS' : classifyWriteFailure(result);
}

Page({
data: {
gateState: 'CHECKING' as 'CHECKING' | 'AUTHORIZED' | 'DENIED' | 'UNAVAILABLE',
gateTitle: '正在核验运营权限',
gateMessage: '活动与主理人操作按服务端动作授权。',
runtimeMode: 'OFFLINE_DEMO',
eventAvailable: false,
organizerAvailable: false,
selectedDomain: 'EVENT' as 'EVENT' | 'ORGANIZER',
items: [] as readonly object[],
loading: false,
hasMore: false,
selectedHandle: '',
detail: null as object | null,
actions: [] as readonly object[],
actionBusy: false,
detailNotice: '',
cities: [] as readonly object[],
citiesNotice: '授权完成后读取公开城市投影。',
selectedNode: null as object | null,
paymentReason: '尚未核验支付能力，订单与退款入口保持隐藏。',
paymentEnabled: false,
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
gateTitle: '正在核验运营权限',
gateMessage: '活动与主理人操作按服务端动作授权。',
eventAvailable: false,
organizerAvailable: false,
items: [],
loading: false,
hasMore: false,
selectedHandle: '',
detail: null,
actions: [],
actionBusy: false,
detailNotice: '',
cities: [],
selectedNode: null,
citiesNotice: '授权完成后读取公开城市投影。',
paymentEnabled: false,
paymentReason: '尚未核验支付能力，订单与退款入口保持隐藏。',
});
try {
const result = await bootstrapAdmin('OPERATIONS');
if (controllers.get(this)?.generation !== controller.generation) return;
if (!result.ok) {
const state = gateStateForFailure(result);
this.setData({
gateState: state,
gateTitle: state === 'DENIED' ? '无活动运营权限' : '运营服务不可用',
gateMessage: state === 'DENIED'
? '服务端拒绝了当前可信身份。直接访问页面不会获得权限。'
: '无法完成云端授权，本页不会回退到模拟活动。',
});
return;
}
const eventAvailable = result.data.availableQueues.includes('EVENT');
const organizerAvailable = result.data.availableQueues.includes('ORGANIZER');
if (!hasQueue(result.data.availableQueues, ['EVENT', 'ORGANIZER'])) {
this.setData({
gateState: 'DENIED',
gateTitle: '没有可用运营队列',
gateMessage: 'bootstrap 未返回 EVENT 或 ORGANIZER 队列。',
});
return;
}
const selectedDomain = this.data.selectedDomain === 'EVENT' && eventAvailable
? 'EVENT'
: organizerAvailable
? 'ORGANIZER'
: 'EVENT';
this.setData({
gateState: 'AUTHORIZED',
runtimeMode: result.data.session.runtimeMode,
eventAvailable,
organizerAvailable,
selectedDomain,
});
await Promise.all([this.loadQueue(false), this.loadCities(), this.loadPaymentCapability()]);
} catch {
if (controllers.get(this)?.generation !== controller.generation) return;
this.setData({
gateState: 'UNAVAILABLE',
gateTitle: '运营服务不可用',
gateMessage: '当前环境无法完成云端授权，本页不会使用测试 fixture。',
});
}
},
async loadQueue(append: boolean) {
const controller = controllerFor(this);
const generation = controller.generation;
const domain = this.data.selectedDomain;
this.setData({ loading: true, detailNotice: '' });
try {
const result = await listReviewCases(domain, append ? controller.cursor : undefined);
if (controllers.get(this)?.generation !== generation || this.data.selectedDomain !== domain) return;
if (!result.ok) {
if (gateStateForFailure(result) === 'DENIED') {
resetController(this);
this.setData({
gateState: 'DENIED',
gateTitle: '运营队列访问被拒绝',
gateMessage: '会话权限可能已变化。',
items: [],
detail: null,
loading: false,
});
} else {
this.setData({ loading: false, detailNotice: '队列读取失败，未展示缓存数据。' });
}
return;
}
if (!append) {
controller.secretByHandle.clear();
}
const nextItems = result.data.page.items
.filter((reviewCase) => reviewCase.domain === domain)
.map((reviewCase) => {
const handle = makeHandle(controller, 'case');
controller.secretByHandle.set(handle, {
kind: 'REVIEW_CASE',
reviewCaseId: reviewCase.reviewCaseId,
aggregateId: reviewCase.aggregateId,
domain,
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
onDomainChange(event: { currentTarget: { dataset: { domain?: 'EVENT' | 'ORGANIZER' } } }) {
const domain = event.currentTarget.dataset.domain;
if (this.data.actionBusy || !domain || domain === this.data.selectedDomain) return;
if ((domain === 'EVENT' && !this.data.eventAvailable) || (domain === 'ORGANIZER' && !this.data.organizerAvailable)) return;
resetController(this);
this.setData({
selectedDomain: domain,
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
if (!secret || secret.kind !== 'REVIEW_CASE') return;
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
if (!result.ok || result.data.reviewCase.domain !== secret.domain) {
this.setData({ detail: null, actions: [], detailNotice: '案件详情不可用或域不匹配。' });
return;
}
controller.secretByHandle.set(handle, {
kind: 'REVIEW_CASE',
reviewCaseId: result.data.reviewCase.reviewCaseId,
aggregateId: result.data.reviewCase.aggregateId,
domain: secret.domain,
version: result.data.reviewCase.version,
});
if (secret.domain !== 'EVENT' && secret.domain !== 'ORGANIZER') return;
this.setData({
detail: reviewDetailView(result.data.reviewCase, handle),
actions: operationsCaseActions(secret.domain, result.data.reviewCase.status),
detailNotice: '',
});
this.armDetailExpiry();
} catch {
if (controllerFor(this).selectedHandle !== handle) return;
this.setData({ detail: null, actions: [], detailNotice: '详情服务不可用，未读取私有活动文档。' });
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
if (!secret || secret.kind !== 'REVIEW_CASE' || this.data.actionBusy) return;
const allowed = this.data.actions.some((action: { id?: string }) => action.id === event.detail.action);
if (!allowed || !event.detail.note) {
this.setData({ detailNotice: '所有活动与主理人动作都必须填写人工审核说明。' });
return;
}
if (event.detail.action === 'REQUEST_CHANGES'
&& !requiredChangesAreValid(splitRequiredChanges(event.detail.changesText))) {
this.setData({ detailNotice: '补充材料须为 1 至 10 项，每项 2 至 200 字且不得包含原始链接。' });
return;
}
if (event.detail.action === 'REJECT' && !event.detail.reasonCode) {
this.setData({ detailNotice: '拒绝必须填写原因代码。' });
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
const outcome = await executeOperationDecision(secret, event.detail);
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
this.setData({ detailNotice: '操作未成功，客户端未伪造公开投影；请重新选择案件。' });
} catch {
if (controllers.get(this) !== activeController
|| activeController.selectedHandle !== activeHandle) return;
this.clearDetail();
this.setData({ detailNotice: '操作响应不确定；不会自动生成新请求重试，请重新读取案件。' });
}
},
async loadCities() {
const controller = controllerFor(this);
const generation = controller.generation;
try {
const result = await listCities();
if (controllers.get(this)?.generation !== generation) return;
if (!result.ok) {
this.setData({ cities: [], citiesNotice: '公开城市投影读取失败。' });
return;
}
controller.cityByHandle.clear();
const countries = new Map(COUNTRY_DIRECTORY.map((country) => [country.id, country.name.zh]));
const cities = result.data.cities.map((city) => {
const handle = makeHandle(controller, 'city');
controller.cityByHandle.set(handle, city);
return cityView(city, handle, countries.get(city.countryId) ?? '未知国家或地区');
});
this.setData({ cities, citiesNotice: '城市与节点状态仅供读取；冻结合同未提供变更 Action。' });
} catch {
if (controllers.get(this)?.generation !== generation) return;
this.setData({ cities: [], citiesNotice: '城市服务不可用，未使用静态目录冒充运行状态。' });
}
},
async onCitySelect(event: { currentTarget: { dataset: { handle?: string } } }) {
const handle = event.currentTarget.dataset.handle;
const city = handle ? controllerFor(this).cityByHandle.get(handle) : undefined;
if (!city) return;
this.setData({ selectedNode: null, citiesNotice: '正在读取公开节点投影…' });
try {
const result = await getClubNode(city.id as CityId);
if (!result.ok) {
this.setData({ citiesNotice: '节点公开投影不可用。' });
return;
}
this.setData({
selectedNode: nodeView(result.data.city.name.zh, result.data.node),
citiesNotice: '节点状态只读；未提供状态变更入口。',
});
} catch {
this.setData({ citiesNotice: '节点服务不可用，未回退到模拟节点。' });
}
},
async loadPaymentCapability() {
try {
const result = await getPaymentCapability();
const payment = result.ok
? paymentUiFromCapability(result.data.capability)
: paymentUiFromCapability(undefined);
this.setData({ paymentEnabled: payment.enabled, paymentReason: payment.reason });
} catch {
const payment = paymentUiFromCapability(undefined);
this.setData({ paymentEnabled: payment.enabled, paymentReason: payment.reason });
}
},
onRetryQueue() {
void this.loadQueue(false);
},
onLoadMore() {
if (this.data.hasMore && !this.data.loading) void this.loadQueue(true);
},
});
