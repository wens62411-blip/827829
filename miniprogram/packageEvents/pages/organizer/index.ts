import { CITY_DIRECTORY } from '../../../shared/constants/geography';
import { LOCAL_RUNTIME } from '../../../shared/services/runtime';
import { RuntimeMode } from '../../../shared/types/enums';
import type { OrganizerId } from '../../../shared/types/primitives';
import { createRequestId } from '../../../shared/utils/request-id';
import { getEventCloudClient } from '../../../components/ab-event-card/cloud-client-loader';
interface OrganizerView {
readonly id: string;
readonly name: string;
readonly nameEn: string;
readonly summary: string;
readonly cities: readonly string[];
readonly reviewLabel: 'APPROVED';
readonly verificationLabel: 'HUMAN_REVIEWED';
}
Page({
data: {
runtimeMode: LOCAL_RUNTIME.mode as string,
loading: false,
hasOrganizer: false,
organizer: null as OrganizerView | null,
stateKind: 'EMPTY',
stateTitle: '主理人资料未提供',
stateDescription: '资料尚未开放。',
stateDetail: '',
},
onLoad(query: Record<string, string | undefined>) {
if (!query.organizerId) return;
void this.loadOrganizer(query.organizerId as OrganizerId);
},
async loadOrganizer(organizerId: OrganizerId) {
if (!LOCAL_RUNTIME.cloudEnvironmentConfigured) {
this.setData({
stateKind: 'OFFLINE',
stateTitle: '主理人资料暂不可用',
stateDescription: '请稍后再试。',
});
return;
}
const { callCloudAction } = getEventCloudClient();
this.setData({ loading: true });
try {
const result = await callCloudAction('organizer.getPublic', createRequestId(), {
contractVersion: '1.0.0',
organizerId,
});
if (!result.apiResult.ok) {
this.showFailure(result.apiResult.error.message);
return;
}
const organizer = result.apiResult.data.organizer;
const view: OrganizerView = {
id: organizer.organizerId,
name: organizer.name.zh,
nameEn: organizer.name.en,
summary: organizer.summary,
cities: organizer.cityIds.map((cityId) => {
const city = CITY_DIRECTORY.find((item) => item.id === cityId);
return city ? `${city.name.zh} / ${city.name.en}` : cityId;
}),
reviewLabel: organizer.reviewStatus,
verificationLabel: organizer.verificationState,
};
this.setData({
runtimeMode: RuntimeMode.LIVE,
loading: false,
hasOrganizer: true,
organizer: view,
});
} catch {
this.showFailure('无法连接主理人公开资料服务。');
}
},
showFailure(message: string) {
this.setData({
runtimeMode: RuntimeMode.DEGRADED,
loading: false,
hasOrganizer: false,
organizer: null,
stateKind: 'ERROR',
stateTitle: '主理人资料不可用',
stateDescription: message,
stateDetail: '',
});
},
});
