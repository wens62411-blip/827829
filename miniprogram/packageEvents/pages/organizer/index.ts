import { CITY_DIRECTORY } from '../../../shared/constants/geography';
import { callCloudAction } from '../../../shared/services/cloud-client';
import { LOCAL_RUNTIME } from '../../../shared/services/runtime';
import { RuntimeMode } from '../../../shared/types/enums';
import type { OrganizerId } from '../../../shared/types/primitives';
import { createRequestId } from '../../../shared/utils/request-id';
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
stateDescription: '只有服务端返回的人工 APPROVED 主理人公开投影才可展示。',
stateDetail: 'URL 参数、用户资料字段或客户端角色声明都不能生成 organizer 身份。',
},
onLoad(query: Record<string, string | undefined>) {
if (!query.organizerId) return;
void this.loadOrganizer(query.organizerId as OrganizerId);
},
async loadOrganizer(organizerId: OrganizerId) {
if (!LOCAL_RUNTIME.cloudEnvironmentConfigured) {
this.setData({
stateKind: 'OFFLINE',
stateTitle: '正式主理人资料未连接',
stateDescription: '当前 OFFLINE_DEMO 不会伪造已认证主理人。',
});
return;
}
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
stateDetail: '没有回退到用户声明或 AI 推断的 organizer 身份。',
});
},
});
