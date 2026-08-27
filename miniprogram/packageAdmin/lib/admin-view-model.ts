import type {
AuditEntryProjection,
CityProjection,
PublicClubNodeProjection,
ReportProjection,
ReviewCaseProjection,
} from '../../shared/types/projections';
import type {
AdminAuditEntryView,
AdminCaseDetailView,
AdminCityView,
AdminNodeView,
AdminQueueItemView,
} from './admin-types';

const URL_PATTERN = /(?:[a-z][a-z0-9+.-]*:\/\/|(?:blob|data):|\/\/[A-Za-z0-9])[^\s]*/gi;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /(^|[^\d])(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/g;

export function redactFreeText(value: string | undefined, maxLength = 120): string {
const safe = (value ?? '')
.replace(URL_PATTERN, '[链接已隐藏]')
.replace(EMAIL_PATTERN, '[邮箱已隐藏]')
.replace(PHONE_PATTERN, '$1[手机号已隐藏]')
.replace(/\s+/g, ' ')
.trim();
if (!safe) return '未提供可展示摘要';
return safe.length > maxLength ? `${safe.slice(0, maxLength)}…` : safe;
}

export function maskStableId(value: string | undefined): string {
if (!value) return '未记录';
const tail = value.slice(-4);
return `••••${tail}`;
}

export function formatUtcForDisplay(value: string | undefined): string {
if (!value) return '时间未知';
const parsed = new Date(value);
if (Number.isNaN(parsed.getTime())) return '时间格式异常';
const parts = [
parsed.getUTCFullYear(),
String(parsed.getUTCMonth() + 1).padStart(2, '0'),
String(parsed.getUTCDate()).padStart(2, '0'),
];
const time = [
String(parsed.getUTCHours()).padStart(2, '0'),
String(parsed.getUTCMinutes()).padStart(2, '0'),
];
return `${parts.join('-')} ${time.join(':')} UTC`;
}

export function reviewQueueItemView(
reviewCase: ReviewCaseProjection,
handle: string,
): AdminQueueItemView {
return {
handle,
domain: reviewCase.domain,
eyebrow: `${reviewCase.domain} · 受限队列`,
title: `${reviewCase.domain} 受限审核案件`,
summary: '进入经服务端授权的案件详情后，仅短时展示必要的脱敏字段。',
status: reviewCase.status,
updatedAt: formatUtcForDisplay(reviewCase.updatedAt),
meta: `${reviewCase.evidenceAssetIds.length} 份材料 · 版本 ${reviewCase.version}`,
};
}

export function reviewDetailView(
reviewCase: ReviewCaseProjection,
handle: string,
): AdminCaseDetailView {
return {
handle,
eyebrow: `${reviewCase.domain} 案件`,
title: redactFreeText(reviewCase.title, 80),
summary: redactFreeText(reviewCase.summary, 480),
status: reviewCase.status,
updatedAt: formatUtcForDisplay(reviewCase.updatedAt),
metaLines: [
`案件：${maskStableId(reviewCase.reviewCaseId)}`,
`对象：${maskStableId(reviewCase.aggregateId)}`,
`申请人：${maskStableId(reviewCase.submitterUserId)}`,
`审核人：${maskStableId(reviewCase.assignedReviewerUserId)}`,
`版本：${reviewCase.version}`,
],
evidenceLines: reviewCase.evidenceAssetIds.map((id, index) =>
`材料 ${index + 1}：${maskStableId(id)}`,
),
materialNotice:
'冻结 ReviewCaseProjection 未提供原始快照、临时查看令牌或 URL；本页不会绕过审计链路读取材料。',
};
}

export function reportQueueItemView(report: ReportProjection, handle: string): AdminQueueItemView {
return {
handle,
domain: 'REPORT',
eyebrow: `${report.targetType} 举报 · ${maskStableId(report.targetId)}`,
title: `举报原因：${redactFreeText(report.reasonCode, 42)}`,
summary: '列表仅展示冻结 ReportProjection 的最小脱敏字段。',
status: report.status,
updatedAt: formatUtcForDisplay(report.updatedAt),
meta: `举报 ${maskStableId(report.reportId)} · 版本 ${report.version}`,
};
}

export function reportDetailView(report: ReportProjection, handle: string): AdminCaseDetailView {
return {
handle,
eyebrow: `${report.targetType} 举报`,
title: `举报原因：${redactFreeText(report.reasonCode, 80)}`,
summary: '此视图不读取用户、活动或内容模块的私有文档。',
status: report.status,
updatedAt: formatUtcForDisplay(report.updatedAt),
metaLines: [
`举报：${maskStableId(report.reportId)}`,
`目标：${maskStableId(report.targetId)}`,
`目标类型：${report.targetType}`,
`版本：${report.version}`,
],
evidenceLines: [],
materialNotice: '举报详情 Action 未提供原始附件；本页仅处理冻结的最小举报投影。',
};
}

export function auditEntryView(entry: AuditEntryProjection, localHandle: string): AdminAuditEntryView {
return {
id: localHandle,
action: redactFreeText(entry.action, 80),
actor: maskStableId(entry.actorUserId),
actorRole: entry.actorRole,
target: `${redactFreeText(entry.targetType, 32)} · ${maskStableId(entry.targetId)}`,
request: maskStableId(entry.requestId),
occurredAt: formatUtcForDisplay(entry.occurredAt),
result: entry.result,
reason: redactFreeText(entry.reasonCode, 80),
};
}

export function cityView(city: CityProjection, handle: string, countryName: string): AdminCityView {
return {
handle,
cityName: city.name.zh,
countryName,
operationalState: city.operationalState,
timezone: city.timezone,
};
}

export function nodeView(
cityName: string,
node: PublicClubNodeProjection | undefined,
): AdminNodeView {
if (!node) {
return {
cityName,
nodeName: '尚无公开节点',
operationalState: 'PLANNED',
organizerName: '未公开',
};
}
return {
cityName,
nodeName: node.name.zh,
operationalState: node.operationalState,
organizerName: node.organizer?.name.zh ?? '未公开',
};
}
