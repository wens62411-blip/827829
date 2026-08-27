import { bootstrapAdmin, listAuditEntries } from '../../lib/admin-client';
import { gateStateForFailure } from '../../lib/admin-policy';
import { auditEntryView } from '../../lib/admin-view-model';

interface AuditController {
generation: number;
sequence: number;
cursor: import('../../../shared/types/primitives').PaginationCursor | undefined;
}

const controllers = new WeakMap<object, AuditController>();

function resetController(page: object): AuditController {
const previous = controllers.get(page);
const controller = { generation: (previous?.generation ?? 0) + 1, sequence: 0, cursor: undefined };
controllers.set(page, controller);
return controller;
}

Page({
data: {
gateState: 'CHECKING' as 'CHECKING' | 'AUTHORIZED' | 'DENIED' | 'UNAVAILABLE',
gateTitle: '正在核验审计权限',
gateMessage: '审计列表只读且默认脱敏。',
runtimeMode: 'OFFLINE_DEMO',
entries: [] as readonly object[],
loading: false,
hasMore: false,
listNotice: '',
},
onShow() {
void this.refreshAccess();
},
onHide() {
resetController(this);
this.setData({ entries: [], loading: false, hasMore: false });
},
onUnload() {
resetController(this);
controllers.delete(this);
},
async refreshAccess() {
const controller = resetController(this);
this.setData({
gateState: 'CHECKING',
gateTitle: '正在核验审计权限',
gateMessage: '审计列表只读且默认脱敏。',
entries: [],
loading: false,
hasMore: false,
listNotice: '',
});
try {
const result = await bootstrapAdmin('AUDIT');
if (controllers.get(this)?.generation !== controller.generation) return;
if (!result.ok) {
const state = gateStateForFailure(result);
this.setData({
gateState: state,
gateTitle: state === 'DENIED' ? '无审计权限' : '审计服务不可用',
gateMessage: state === 'DENIED'
? '服务端拒绝了当前可信身份。知道页面路径不会获得日志权限。'
: '无法完成云端授权，本页不会读取缓存或测试日志。',
});
return;
}
this.setData({ gateState: 'AUTHORIZED', runtimeMode: result.data.session.runtimeMode });
await this.loadEntries(false);
} catch {
if (controllers.get(this)?.generation !== controller.generation) return;
this.setData({
gateState: 'UNAVAILABLE',
gateTitle: '审计服务不可用',
gateMessage: '当前环境无法完成云端授权，本页不会使用测试 fixture。',
});
}
},
async loadEntries(append: boolean) {
const controller = controllers.get(this);
if (!controller) return;
const generation = controller.generation;
this.setData({ loading: true, listNotice: '' });
try {
const result = await listAuditEntries(append ? controller.cursor : undefined);
if (controllers.get(this)?.generation !== generation) return;
if (!result.ok) {
const state = gateStateForFailure(result);
if (state === 'DENIED') {
resetController(this);
this.setData({
gateState: 'DENIED',
gateTitle: '审计访问被拒绝',
gateMessage: '会话权限可能已变化。',
entries: [],
loading: false,
});
} else {
this.setData({ loading: false, listNotice: '审计列表读取失败，未展示缓存日志。' });
}
return;
}
controller.cursor = result.data.page.nextCursor;
const entries = result.data.page.items.map((entry) => {
controller.sequence += 1;
return auditEntryView(entry, `audit_${controller.generation}_${controller.sequence}`);
});
this.setData({
entries: append ? [...this.data.entries, ...entries] : entries,
loading: false,
hasMore: result.data.page.hasMore,
});
} catch {
if (controllers.get(this)?.generation !== generation) return;
this.setData({ loading: false, listNotice: '审计服务不可用，未回退到测试日志。' });
}
},
onLoadMore() {
if (this.data.hasMore && !this.data.loading) void this.loadEntries(true);
},
});
