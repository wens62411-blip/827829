import {
CITY_DIRECTORY,
COUNTRY_DIRECTORY,
CityId,
REGION_DIRECTORY,
} from '../../shared/constants/geography';
import { callCloudAction } from '../../shared/services/cloud-client';
import { LOCAL_RUNTIME } from '../../shared/services/runtime';
import {
EventState,
OperationalState,
PublicationState,
RecordOrigin,
RuntimeMode,
VerificationState,
} from '../../shared/types/enums';
import type { OperationalState as OperationalStateValue } from '../../shared/types/enums';
import type { PublicEventProjection } from '../../shared/types/projections';
import { createRequestId } from '../../shared/utils/request-id';
import { getCityMediaPresentation } from '../../components/ab-city-hero/city-media';
interface CityOptionView {
readonly id: (typeof CITY_DIRECTORY)[number]['id'];
readonly label: string;
readonly nameEn: string;
readonly timezone: string;
readonly regionLabel: string;
readonly countryLabel: string;
readonly groupStart: boolean;
readonly catalogLabel: 'ACTIVE';
readonly operationalState: OperationalStateValue;
readonly operationalLabel: string;
}
interface CityHeroView extends CityOptionView {
readonly imageSrc: string;
readonly imageAlt: string;
readonly photoCredit: string;
readonly operationEvidence: string;
readonly mediaRightsLabel: 'CLAIMED · DRAFT';
}
interface EventCardView {
readonly eventId: string;
readonly title: string;
readonly summary: string;
readonly cityName: string;
readonly timeLabel: string;
readonly timezone: string;
readonly stateLabel: string;
readonly registrationLabel: string;
readonly origin: string;
readonly verificationState: string;
readonly coverSrc: string;
readonly coverAlt: string;
readonly detailAvailable: boolean;
readonly startsAtEpoch: number;
}
const OPERATIONAL_LABELS: Readonly<Record<OperationalStateValue, string>> = {
[OperationalState.PLANNED]: '筹备中',
[OperationalState.RECRUITING_HOST]: '招募主理人',
[OperationalState.PILOT]: '小范围试运营',
[OperationalState.LIVE]: '运营中',
[OperationalState.PAUSED]: '暂停运营',
[OperationalState.DISABLED]: '停止开放',
};
const EVENT_STATE_LABELS: Readonly<Record<string, string>> = {
[EventState.DRAFT]: '草稿',
[EventState.SUBMITTED]: '待审核',
[EventState.UNDER_REVIEW]: '审核中',
[EventState.PUBLISHED]: '已发布',
[EventState.PAUSED]: '已暂停',
[EventState.CANCELLED]: '已取消',
[EventState.COMPLETED]: '已结束',
[EventState.REJECTED]: '未通过',
};
const TYPE_FILTERS = [
{ id: 'ALL', label: '全部类型' },
{ id: 'SALON', label: '主题沙龙' },
{ id: 'CULTURE', label: '艺术文化' },
{ id: 'DINING', label: '餐叙交流' },
] as const;
const TIME_FILTERS = [
{ id: 'ALL', label: '全部时间' },
{ id: 'NEXT_7_DAYS', label: '未来 7 天' },
{ id: 'NEXT_30_DAYS', label: '未来 30 天' },
] as const;
const PRICE_FILTERS = [
{ id: 'ALL', label: '全部价格' },
{ id: 'FREE', label: '免费' },
{ id: 'PAID', label: '付费' },
] as const;
const ACCESS_FILTERS = [
{ id: 'ALL', label: '全部准入' },
{ id: 'OPEN', label: '公开参与' },
{ id: 'MEMBER', label: '会员参与' },
] as const;
function buildCityOptions(
operationalByCity: ReadonlyMap<string, OperationalStateValue> = new Map(),
): CityOptionView[] {
let previousCountry = '';
return CITY_DIRECTORY.map((city) => {
const country = COUNTRY_DIRECTORY.find((item) => item.id === city.parentId);
const region = REGION_DIRECTORY.find((item) => item.id === city.regionId);
const operationalState = operationalByCity.get(city.id) ?? OperationalState.PLANNED;
const groupStart = previousCountry !== city.parentId;
previousCountry = city.parentId;
return {
id: city.id,
label: city.name.zh,
nameEn: city.name.en,
timezone: city.timezone,
regionLabel: region?.name.zh ?? '全球',
countryLabel: country?.name.zh ?? '国家/地区待核验',
groupStart,
catalogLabel: 'ACTIVE',
operationalState,
operationalLabel: OPERATIONAL_LABELS[operationalState],
};
});
}
function toHero(city: CityOptionView, formalStateLoaded = false): CityHeroView {
const media = getCityMediaPresentation(city.id);
return {
...city,
imageSrc: `/assets/cities/${city.id}.jpg`,
imageAlt: media.alt,
photoCredit: media.credit,
operationEvidence: formalStateLoaded
? '运营状态来自 eventApi · 不等于活动已核验'
: 'CONTENT_LIVE_UNVERIFIED · 安全默认筹备中',
mediaRightsLabel: 'CLAIMED · DRAFT',
};
}
function formatLocalTime(startsAt: string, timezone: string): string {
const date = new Date(startsAt);
if (Number.isNaN(date.getTime())) return '时间待核验';
try {
return new Intl.DateTimeFormat('zh-CN', {
timeZone: timezone,
month: 'short',
day: 'numeric',
weekday: 'short',
hour: '2-digit',
minute: '2-digit',
hour12: false,
}).format(date);
} catch {
return '时间待核验';
}
}
function toEventCard(event: PublicEventProjection): EventCardView {
const city = CITY_DIRECTORY.find((item) => item.id === event.cityId);
const media = getCityMediaPresentation(event.cityId);
const detailAvailable =
event.origin === RecordOrigin.REAL &&
event.verificationState === VerificationState.HUMAN_REVIEWED &&
event.publicationState === PublicationState.PUBLISHED &&
(event.state === EventState.PUBLISHED ||
event.state === EventState.PAUSED ||
event.state === EventState.COMPLETED);
return {
eventId: event.eventId,
title: event.title,
summary: event.summary,
cityName: city?.name.zh ?? '目录城市待核验',
timeLabel: formatLocalTime(event.startsAt, event.timezone),
timezone: event.timezone,
stateLabel: EVENT_STATE_LABELS[event.state] ?? event.state,
registrationLabel: event.reservationAvailable ? 'INTEREST 兴趣登记' : '主办方官方入口 / 暂无',
origin: event.origin,
verificationState: event.verificationState,
coverSrc: city ? `/assets/cities/${city.id}.jpg` : '',
coverAlt: city ? media.alt : '活动城市图片不可用',
detailAvailable,
startsAtEpoch: Date.parse(event.startsAt),
};
}
const INITIAL_CITIES = buildCityOptions();
const INITIAL_CITY = INITIAL_CITIES.find((city) => city.id === CityId.CN_BEIJING)!;
let eventRequestGeneration = 0;
Page({
data: {
runtimeMode: LOCAL_RUNTIME.mode as string,
cities: INITIAL_CITIES as CityOptionView[],
selectedCityId: INITIAL_CITY.id as string,
selectedCityLabel: INITIAL_CITY.label,
selectedCityMeta: `${INITIAL_CITY.countryLabel} · ${INITIAL_CITY.timezone}`,
hero: toHero(INITIAL_CITY),
browseGlobal: false,
browseScopeLabel: '当前城市',
allEvents: [] as EventCardView[],
events: [] as EventCardView[],
loading: false,
stateKind: 'EMPTY',
stateTitle: '暂无经当前证据核验的活动',
stateDescription: '北京已进入稳定城市目录，但目录入口存在不等于 AB Club 节点已运营。',
stateDetail: 'event.list 当前没有可公开记录；不会回退展示虚构活动、报名人数或合作方。',
typeFilters: TYPE_FILTERS,
timeFilters: TIME_FILTERS,
priceFilters: PRICE_FILTERS,
accessFilters: ACCESS_FILTERS,
typeFilterIndex: 0,
timeFilterIndex: 0,
priceFilterIndex: 0,
accessFilterIndex: 0,
extendedFiltersAvailable: false,
filterContractNote: '类型、价格、准入字段不在冻结 1.0.0 公开 DTO 中，控件已禁用；时间筛选可用。',
paymentGateLabel: '真实微信支付 DISABLED · 本页无支付按钮',
},
onLoad(query: Record<string, string | undefined>) {
const stored = wx.getStorageSync('ab-events-city-id') as string;
const requested = query.cityId || stored;
const selected = this.data.cities.find((city) => city.id === requested);
if (selected) this.applySelectedCity(selected);
void this.refreshDirectoryAndEvents();
},
onShow() {
const stored = wx.getStorageSync('ab-events-city-id') as string;
if (!stored || stored === this.data.selectedCityId) return;
const selected = this.data.cities.find((city) => city.id === stored);
if (!selected) return;
this.applySelectedCity(selected);
void this.refreshEvents();
},
async onPullDownRefresh() {
await this.refreshDirectoryAndEvents();
wx.stopPullDownRefresh();
},
applySelectedCity(city: CityOptionView) {
wx.setStorageSync('ab-events-city-id', city.id);
this.setData({
selectedCityId: city.id,
selectedCityLabel: city.label,
selectedCityMeta: `${city.countryLabel} · ${city.timezone}`,
hero: toHero(city, LOCAL_RUNTIME.cloudEnvironmentConfigured),
browseGlobal: false,
browseScopeLabel: '当前城市',
stateDescription: `${city.label}已进入稳定城市目录，但目录入口存在不等于 AB Club 节点已运营。`,
});
},
onCityChange(event: WechatMiniprogram.CustomEvent<{ cityId: string }>) {
const selected = this.data.cities.find((city) => city.id === event.detail.cityId);
if (!selected) return;
this.applySelectedCity(selected);
void this.refreshEvents();
},
toggleBrowseScope() {
const browseGlobal = !this.data.browseGlobal;
this.setData({
browseGlobal,
browseScopeLabel: browseGlobal ? '全球 13 城' : '当前城市',
});
void this.refreshEvents();
},
onTimeFilterChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
const parsed = Number(event.detail.value);
const timeFilterIndex = Number.isInteger(parsed) && TIME_FILTERS[parsed] ? parsed : 0;
this.setData({ timeFilterIndex });
this.applyTimeFilter();
},
applyTimeFilter() {
const selected = TIME_FILTERS[this.data.timeFilterIndex] ?? TIME_FILTERS[0];
if (selected.id === 'ALL') {
this.setData({ events: this.data.allEvents });
return;
}
const now = Date.now();
const days = selected.id === 'NEXT_7_DAYS' ? 7 : 30;
const upperBound = now + days * 24 * 60 * 60 * 1000;
this.setData({
events: this.data.allEvents.filter(
(event) => event.startsAtEpoch >= now && event.startsAtEpoch <= upperBound,
),
});
},
async refreshDirectoryAndEvents() {
await this.refreshDirectory();
await this.refreshEvents();
},
async refreshDirectory() {
if (!LOCAL_RUNTIME.cloudEnvironmentConfigured) return;
try {
const result = await callCloudAction('geo.listCities', createRequestId(), {
contractVersion: '1.0.0',
});
if (!result.apiResult.ok) return;
const stateMap = new Map<string, OperationalStateValue>(
result.apiResult.data.cities.map((city) => [city.id, city.operationalState]),
);
const cities = buildCityOptions(stateMap);
const selected = cities.find((city) => city.id === this.data.selectedCityId) ?? cities[0];
if (!selected) return;
this.setData({
cities,
selectedCityLabel: selected.label,
selectedCityMeta: `${selected.countryLabel} · ${selected.timezone}`,
hero: toHero(selected, true),
});
} catch {
}
},
async refreshEvents() {
const requestGeneration = ++eventRequestGeneration;
const selected = this.data.cities.find((city) => city.id === this.data.selectedCityId);
if (!selected) return;
const browseGlobal = this.data.browseGlobal;
const isCurrent = () =>
requestGeneration === eventRequestGeneration &&
this.data.selectedCityId === selected.id &&
this.data.browseGlobal === browseGlobal;
if (!LOCAL_RUNTIME.cloudEnvironmentConfigured) {
this.setData({
runtimeMode: RuntimeMode.OFFLINE_DEMO,
allEvents: [],
events: [],
loading: false,
stateKind: 'EMPTY',
stateTitle: '暂无经当前证据核验的活动',
stateDescription: browseGlobal
? '13 个城市入口均可浏览，但目前没有获准公开的真实活动。'
: `${selected.label}已有目录入口，当前没有获准公开的真实活动。`,
stateDetail: 'OFFLINE_DEMO 不合成活动成功结果；真实活动内容状态为 CONTENT_LIVE_UNVERIFIED。',
});
return;
}
this.setData({ loading: true });
try {
const payload = browseGlobal
? { contractVersion: '1.0.0' as const, limit: 20 }
: { contractVersion: '1.0.0' as const, limit: 20, cityId: selected.id };
const result = await callCloudAction('event.list', createRequestId(), payload);
if (!isCurrent()) return;
if (!result.apiResult.ok) {
this.showListFailure(result.apiResult.error.message);
return;
}
const allEvents = result.apiResult.data.page.items.map(toEventCard);
this.setData({
runtimeMode: RuntimeMode.LIVE,
allEvents,
events: allEvents,
loading: false,
stateKind: 'EMPTY',
stateTitle: '暂无可公开活动',
stateDescription: browseGlobal
? '当前全球目录没有通过公开门的活动。'
: `${selected.label}当前没有通过公开门的活动。`,
stateDetail: '目录、节点运营和活动供给是三个独立事实。',
});
this.applyTimeFilter();
} catch {
if (isCurrent()) this.showListFailure('本次正式请求失败，请稍后重试。');
}
},
showListFailure(message: string) {
this.setData({
runtimeMode: RuntimeMode.DEGRADED,
allEvents: [],
events: [],
loading: false,
stateKind: 'ERROR',
stateTitle: '活动列表暂不可用',
stateDescription: message,
stateDetail: '正式运行失败后未回退到 synthetic / DEMO_ONLY 数据。',
});
},
openCityDirectory() {
void wx.navigateTo({ url: '/packageEvents/pages/city/index' });
},
openEvent(event: WechatMiniprogram.CustomEvent<{ eventId: string }>) {
if (!event.detail.eventId) return;
void wx.navigateTo({
url: `/packageEvents/pages/event/index?eventId=${encodeURIComponent(event.detail.eventId)}`,
});
},
openDemoDetail() {
void wx.navigateTo({ url: '/packageEvents/pages/event/index?demo=1' });
},
});
