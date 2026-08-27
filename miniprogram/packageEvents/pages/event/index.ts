import { CITY_DIRECTORY, CityId } from '../../../shared/constants/geography';
import { callCloudAction } from '../../../shared/services/cloud-client';
import { LOCAL_RUNTIME } from '../../../shared/services/runtime';
import {
EventState,
PublicationState,
RecordOrigin,
RuntimeMode,
VerificationState,
} from '../../../shared/types/enums';
import type { EventId } from '../../../shared/types/primitives';
import type { PublicEventProjection, PublicOrganizerProjection } from '../../../shared/types/projections';
import { createRequestId } from '../../../shared/utils/request-id';
import { getCityMediaPresentation } from '../../../components/ab-city-hero/city-media';
interface EventDetailView {
readonly displayId: string;
readonly title: string;
readonly summary: string;
readonly cityName: string;
readonly cityNameEn: string;
readonly imageSrc: string;
readonly imageAlt: string;
readonly evidenceLabel: string;
readonly secondaryEvidenceLabel: string;
readonly stateLabel: string;
readonly sourceLabel: string;
readonly organizerName: string;
readonly organizerSummary: string;
readonly localTimeLabel: string;
readonly timezone: string;
readonly timezoneDifferenceLabel: string;
readonly addressRangeLabel: string;
readonly admissionTags: readonly string[];
readonly registrationMethodLabel: string;
readonly capacityLabel: string;
readonly minParticipantsLabel: string;
readonly mediaRightsLabel: string;
readonly mediaSourceLicenseLabel: string;
readonly referencedCoverLabel: string;
readonly paymentCapabilityLabel: string;
readonly canRegisterInterest: boolean;
readonly organizerId: string;
}
const DEMO_DETAIL: EventDetailView = {
displayId: 'DEMO_PRESENTATION_ONLY',
title: '活动详情字段结构示例',
summary: '此页面只展示字段与安全边界，不代表活动存在、主理人获批、名额可用或报名成功。',
cityName: '北京',
cityNameEn: 'Beijing',
imageSrc: `/assets/cities/${CityId.CN_BEIJING}.jpg`,
imageAlt: `${getCityMediaPresentation(CityId.CN_BEIJING).alt}；用于 DEMO_ONLY 详情结构示例`,
evidenceLabel: 'DEMO_ONLY',
secondaryEvidenceLabel: 'CONTENT_LIVE_UNVERIFIED',
stateLabel: 'DRAFT · 不可发布',
sourceLabel: '未提供（DEMO_ONLY）',
organizerName: '未提供（未经人工批准）',
organizerSummary: '普通用户不能通过客户端字段自称 organizer；只有服务端认可的 APPROVED 主理人可公开。',
localTimeLabel: '开始/结束时间未提供',
timezone: 'Asia/Shanghai',
timezoneDifferenceLabel: '示例活动按北京当地时区展示；用户所在城市未经读取。',
addressRangeLabel: '未提供（公开详情仅应展示经批准的地址范围）',
admissionTags: ['准入标签未提供'],
registrationMethodLabel: 'INTEREST 结构示意；当前不可提交',
capacityLabel: '未提供',
minParticipantsLabel: '未启用；不得默认“两人成团”',
mediaRightsLabel: '本地城市图 CLAIMED / DRAFT；详见 cities.json，尚非人工 APPROVED',
mediaSourceLicenseLabel: `${getCityMediaPresentation(CityId.CN_BEIJING).licenseLabel}；来源页见城市素材 manifest；权利状态仍为 CLAIMED / DRAFT`,
referencedCoverLabel: '活动 cover 未提供；当前只显示本地城市 fallback',
paymentCapabilityLabel: 'DISABLED · 无支付按钮 · 无模拟支付成功',
canRegisterInterest: false,
organizerId: '',
};
const EMPTY_DETAIL: EventDetailView = {
...DEMO_DETAIL,
displayId: '',
title: '',
summary: '',
evidenceLabel: '',
secondaryEvidenceLabel: '',
};
function formatEventRange(event: PublicEventProjection): string {
const start = new Date(event.startsAt);
const end = new Date(event.endsAt);
if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '时间格式待核验';
try {
const formatter = new Intl.DateTimeFormat('zh-CN', {
timeZone: event.timezone,
month: 'long',
day: 'numeric',
weekday: 'short',
hour: '2-digit',
minute: '2-digit',
hour12: false,
});
return `${formatter.format(start)} — ${formatter.format(end)}`;
} catch {
return '时间格式待核验';
}
}
function describeTimezoneDifference(event: PublicEventProjection): string {
const userCityId = wx.getStorageSync('ab-events-city-id') as string;
const userCity = CITY_DIRECTORY.find((city) => city.id === userCityId);
if (!userCity) return `活动时间按 ${event.timezone}；用户所在城市未设置。`;
if (userCity.timezone === event.timezone) {
return `活动与当前选择城市 ${userCity.name.zh} 使用同一时区。`;
}
return `活动按 ${event.timezone}；当前选择城市 ${userCity.name.zh} 为 ${userCity.timezone}。请留意时差与夏令时。`;
}
function mapEventDetail(
event: PublicEventProjection,
organizer: PublicOrganizerProjection,
): EventDetailView {
const city = CITY_DIRECTORY.find((item) => item.id === event.cityId);
const media = getCityMediaPresentation(event.cityId);
const humanReviewed = event.verificationState === VerificationState.HUMAN_REVIEWED;
const realRecord = event.origin === RecordOrigin.REAL;
const canRegisterInterest =
realRecord &&
humanReviewed &&
event.state === EventState.PUBLISHED &&
event.publicationState === PublicationState.PUBLISHED &&
event.reservationAvailable;
return {
displayId: event.eventId,
title: event.title,
summary: event.summary,
cityName: city?.name.zh ?? '目录城市待核验',
cityNameEn: city?.name.en ?? '',
imageSrc: city ? `/assets/cities/${city.id}.jpg` : '',
imageAlt: city ? media.alt : '活动所在城市图片不可用',
evidenceLabel: event.origin === RecordOrigin.SYNTHETIC ? 'DEMO_ONLY' : humanReviewed ? 'HUMAN_REVIEWED' : 'CONTENT_LIVE_UNVERIFIED',
secondaryEvidenceLabel: realRecord && humanReviewed ? 'PUBLIC_PROJECTION' : 'CONTENT_LIVE_UNVERIFIED',
stateLabel: `${event.state} · ${event.publicationState}`,
sourceLabel: realRecord
? '具体来源字段未在冻结 1.0.0 公开 DTO 提供'
: 'DEMO_ONLY · synthetic record',
organizerName: organizer.name.zh,
organizerSummary: organizer.summary,
localTimeLabel: formatEventRange(event),
timezone: event.timezone,
timezoneDifferenceLabel: describeTimezoneDifference(event),
addressRangeLabel: '未提供（冻结 1.0.0 公开 DTO 未暴露地址范围）',
admissionTags: ['未提供（准入字段待合同扩展）'],
registrationMethodLabel: event.reservationAvailable ? 'INTEREST 兴趣登记' : '主办方官方入口 / 当前无入口',
capacityLabel: '未提供（容量字段待合同扩展）',
minParticipantsLabel: '未提供 / 未启用',
mediaRightsLabel: '当前实际显示：本地城市图 CLAIMED / DRAFT；不得视为人工 APPROVED',
mediaSourceLicenseLabel: `${media.licenseLabel}；来源页见城市素材 manifest；不从活动公开 DTO 推断图片权利`,
referencedCoverLabel: event.coverAssetId
? `活动 cover 引用 ${event.coverAssetId} 未解析、未显示；许可详情未在公开 DTO 提供`
: '活动 cover 未提供；当前只显示本地城市 fallback',
paymentCapabilityLabel: '支付能力待鉴权检查；入口默认隐藏',
canRegisterInterest,
organizerId: organizer.organizerId,
};
}
Page({
data: {
runtimeMode: LOCAL_RUNTIME.mode as string,
loading: false,
hasDetail: false,
detail: EMPTY_DETAIL,
stateKind: 'EMPTY',
stateTitle: '请选择可公开活动',
stateDescription: '当前没有活动详情可展示。',
stateDetail: '不会根据任意 URL 参数生成活动、主理人或报名成功结果。',
imageFailed: false,
},
onLoad(query: Record<string, string | undefined>) {
if (query.demo === '1') {
this.setData({ hasDetail: true, detail: DEMO_DETAIL });
return;
}
if (!query.eventId) return;
void this.loadEvent(query.eventId as EventId);
},
async loadEvent(eventId: EventId) {
if (!LOCAL_RUNTIME.cloudEnvironmentConfigured) {
this.setData({
stateKind: 'OFFLINE',
stateTitle: '正式活动详情未连接',
stateDescription: '当前为 OFFLINE_DEMO，未解析真实活动记录。',
stateDetail: '需要详情结构可从活动首页进入显著标注的 DEMO_ONLY 示例。',
});
return;
}
this.setData({ loading: true, hasDetail: false });
try {
const result = await callCloudAction('event.get', createRequestId(), {
contractVersion: '1.0.0',
eventId,
});
if (!result.apiResult.ok) {
this.showFailure(result.apiResult.error.message);
return;
}
const detail = mapEventDetail(result.apiResult.data.event, result.apiResult.data.organizer);
this.setData({
runtimeMode: RuntimeMode.LIVE,
loading: false,
hasDetail: true,
detail,
imageFailed: false,
});
if (detail.canRegisterInterest) void this.loadPaymentCapability(eventId);
} catch {
this.showFailure('无法连接活动服务，请稍后重试。');
}
},
async loadPaymentCapability(eventId: EventId) {
try {
const result = await callCloudAction('payment.getCapability', createRequestId(), {
contractVersion: '1.0.0',
eventId,
});
if (!result.apiResult.ok) return;
const capability = result.apiResult.data.capability;
this.setData({
'detail.paymentCapabilityLabel': capability.enabled
? `${capability.state} · 能力已声明，但本客户端没有支付发起 action`
: `${capability.state} · ${capability.reason} · 支付入口隐藏`,
});
} catch {
}
},
showFailure(message: string) {
this.setData({
runtimeMode: RuntimeMode.DEGRADED,
loading: false,
hasDetail: false,
stateKind: 'ERROR',
stateTitle: '活动详情不可用',
stateDescription: message,
stateDetail: '没有回退到 DEMO_ONLY 详情，也没有生成报名或支付结果。',
});
},
onImageError() {
this.setData({ imageFailed: true });
},
openOrganizer() {
if (!this.data.detail.organizerId) return;
void wx.navigateTo({
url: `/packageEvents/pages/organizer/index?organizerId=${encodeURIComponent(this.data.detail.organizerId)}`,
});
},
registerInterest() {
if (!this.data.detail.canRegisterInterest || !this.data.detail.displayId) return;
void wx.navigateTo({
url: `/packageEvents/pages/enrollment/index?eventId=${encodeURIComponent(this.data.detail.displayId)}`,
});
},
backToEvents() {
void wx.switchTab({ url: '/pages/events/index' });
},
});
