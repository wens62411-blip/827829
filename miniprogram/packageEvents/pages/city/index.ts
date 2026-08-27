import {
CITY_DIRECTORY,
COUNTRY_DIRECTORY,
CityId,
REGION_DIRECTORY,
} from '../../../shared/constants/geography';
import { callCloudAction } from '../../../shared/services/cloud-client';
import { LOCAL_RUNTIME } from '../../../shared/services/runtime';
import {
OperationalState,
RuntimeMode,
} from '../../../shared/types/enums';
import type { OperationalState as OperationalStateValue } from '../../../shared/types/enums';
import { createRequestId } from '../../../shared/utils/request-id';
import { getCityMediaPresentation } from '../../../components/ab-city-hero/city-media';
interface DirectoryCityView {
readonly id: (typeof CITY_DIRECTORY)[number]['id'];
readonly label: string;
readonly nameEn: string;
readonly timezone: string;
readonly catalogLabel: 'ACTIVE';
readonly operationalState: OperationalStateValue;
readonly operationalLabel: string;
}
interface DirectoryCountryView {
readonly id: string;
readonly label: string;
readonly nameEn: string;
readonly cities: readonly DirectoryCityView[];
}
interface DirectoryRegionView {
readonly id: string;
readonly label: string;
readonly nameEn: string;
readonly countries: readonly DirectoryCountryView[];
}
const OPERATION_LABELS: Readonly<Record<OperationalStateValue, string>> = {
[OperationalState.PLANNED]: '筹备中',
[OperationalState.RECRUITING_HOST]: '招募主理人',
[OperationalState.PILOT]: '小范围试运营',
[OperationalState.LIVE]: '运营中',
[OperationalState.PAUSED]: '暂停运营',
[OperationalState.DISABLED]: '停止开放',
};
function buildCities(states: ReadonlyMap<string, OperationalStateValue> = new Map()): DirectoryCityView[] {
return CITY_DIRECTORY.map((city) => {
const operationalState = states.get(city.id) ?? OperationalState.PLANNED;
return {
id: city.id,
label: city.name.zh,
nameEn: city.name.en,
timezone: city.timezone,
catalogLabel: 'ACTIVE',
operationalState,
operationalLabel: OPERATION_LABELS[operationalState],
};
});
}
function buildRegions(cities: readonly DirectoryCityView[]): DirectoryRegionView[] {
return REGION_DIRECTORY.map((region) => ({
id: region.id,
label: region.name.zh,
nameEn: region.name.en,
countries: COUNTRY_DIRECTORY.filter((country) => country.parentId === region.id).map((country) => ({
id: country.id,
label: country.name.zh,
nameEn: country.name.en,
cities: cities.filter((city) => {
const frozen = CITY_DIRECTORY.find((item) => item.id === city.id);
return frozen?.parentId === country.id;
}),
})),
}));
}
function makeHero(city: DirectoryCityView, formalStateLoaded = false) {
const media = getCityMediaPresentation(city.id);
return {
...city,
imageSrc: `/assets/cities/${city.id}.jpg`,
imageAlt: media.alt,
photoCredit: media.credit,
operationEvidence: formalStateLoaded
? '运营状态来自 eventApi · 活动供给仍单独核验'
: 'CONTENT_LIVE_UNVERIFIED · 安全默认筹备中',
mediaRightsLabel: 'CLAIMED · DRAFT',
};
}
const INITIAL_CITIES = buildCities();
const INITIAL_SELECTED = INITIAL_CITIES.find((city) => city.id === CityId.CN_BEIJING)!;
let nodeRequestGeneration = 0;
Page({
data: {
runtimeMode: LOCAL_RUNTIME.mode as string,
cities: INITIAL_CITIES as DirectoryCityView[],
regions: buildRegions(INITIAL_CITIES),
selectedCityId: INITIAL_SELECTED.id as string,
hero: makeHero(INITIAL_SELECTED),
nodeLabel: 'AB Club 节点未建立或未经当前证据核验',
nodeOperationalLabel: '筹备中',
nodeOrganizerLabel: '主理人未提供',
},
onLoad(query: Record<string, string | undefined>) {
const stored = wx.getStorageSync('ab-events-city-id') as string;
const requested = query.cityId || stored;
const selected = this.data.cities.find((city) => city.id === requested);
if (selected) this.selectCityView(selected);
void this.refreshDirectory();
},
async refreshDirectory() {
if (!LOCAL_RUNTIME.cloudEnvironmentConfigured) return;
try {
const result = await callCloudAction('geo.listCities', createRequestId(), {
contractVersion: '1.0.0',
});
if (!result.apiResult.ok) return;
const states = new Map<string, OperationalStateValue>(
result.apiResult.data.cities.map((city) => [city.id, city.operationalState]),
);
const cities = buildCities(states);
const selected = cities.find((city) => city.id === this.data.selectedCityId) ?? cities[0];
if (!selected) return;
this.setData({
runtimeMode: RuntimeMode.LIVE,
cities,
regions: buildRegions(cities),
hero: makeHero(selected, true),
});
await this.refreshNode(selected);
} catch {
this.setData({ runtimeMode: RuntimeMode.DEGRADED });
}
},
onSelectCity(event: WechatMiniprogram.CustomEvent) {
const cityId = String(event.currentTarget.dataset.cityId ?? '');
const selected = this.data.cities.find((city) => city.id === cityId);
if (!selected) return;
this.selectCityView(selected);
void this.refreshNode(selected);
},
selectCityView(city: DirectoryCityView) {
nodeRequestGeneration += 1;
wx.setStorageSync('ab-events-city-id', city.id);
this.setData({
selectedCityId: city.id,
hero: makeHero(city, LOCAL_RUNTIME.cloudEnvironmentConfigured),
nodeLabel: 'AB Club 节点未建立或未经当前证据核验',
nodeOperationalLabel: city.operationalLabel,
nodeOrganizerLabel: '主理人未提供',
});
},
async refreshNode(city: DirectoryCityView) {
const requestGeneration = ++nodeRequestGeneration;
const isCurrent = () =>
requestGeneration === nodeRequestGeneration && this.data.selectedCityId === city.id;
if (!LOCAL_RUNTIME.cloudEnvironmentConfigured) return;
try {
const result = await callCloudAction('geo.getNode', createRequestId(), {
contractVersion: '1.0.0',
cityId: city.id,
});
if (!isCurrent()) return;
if (!result.apiResult.ok || !result.apiResult.data.node) {
this.setData({
nodeLabel: 'AB Club 节点未建立或未经当前证据核验',
nodeOperationalLabel: city.operationalLabel,
nodeOrganizerLabel: '主理人未提供',
});
return;
}
const node = result.apiResult.data.node;
this.setData({
nodeLabel: node.name.zh,
nodeOperationalLabel: OPERATION_LABELS[node.operationalState],
nodeOrganizerLabel: node.organizer?.name.zh ?? '主理人未提供',
});
} catch {
if (isCurrent()) this.setData({
nodeLabel: 'AB Club 节点读取失败',
nodeOperationalLabel: city.operationalLabel,
nodeOrganizerLabel: '主理人未提供',
});
}
},
backToEvents() {
void wx.switchTab({ url: '/pages/events/index' });
},
});
