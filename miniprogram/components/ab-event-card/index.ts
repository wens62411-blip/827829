import { RecordOrigin, VerificationState } from '../../shared/types/enums';
Component({
options: {
styleIsolation: 'apply-shared',
},
properties: {
eventId: { type: String, value: '' },
title: { type: String, value: '' },
summary: { type: String, value: '' },
cityName: { type: String, value: '' },
timeLabel: { type: String, value: '' },
timezone: { type: String, value: '' },
stateLabel: { type: String, value: '' },
registrationLabel: { type: String, value: '当前无公开报名入口' },
origin: { type: String, value: RecordOrigin.SYNTHETIC },
verificationState: { type: String, value: VerificationState.USER_DECLARED },
coverSrc: { type: String, value: '' },
coverAlt: { type: String, value: '活动所在城市图片' },
detailAvailable: { type: Boolean, value: false },
},
data: {
evidenceLabel: '合成示例',
imageFailed: false,
},
observers: {
'origin, verificationState'(origin: string, verificationState: string) {
let evidenceLabel = '公开内容 · 待核验';
if (origin === RecordOrigin.SYNTHETIC) {
evidenceLabel = '合成示例';
} else if (verificationState === VerificationState.HUMAN_REVIEWED) {
evidenceLabel = '已人工核验';
}
this.setData({ evidenceLabel });
},
coverSrc() {
this.setData({ imageFailed: false });
},
},
methods: {
onImageError() {
this.setData({ imageFailed: true });
},
openDetail() {
if (!this.properties.detailAvailable || !this.properties.eventId) return;
this.triggerEvent('open', { eventId: this.properties.eventId });
},
},
});
