Component({
options: {
styleIsolation: 'apply-shared',
},
properties: {
cityName: { type: String, value: '' },
cityNameEn: { type: String, value: '' },
timezone: { type: String, value: '' },
catalogLabel: { type: String, value: 'ACTIVE' },
operationalLabel: { type: String, value: '筹备中' },
operationEvidence: { type: String, value: 'CONTENT_LIVE_UNVERIFIED' },
imageSrc: { type: String, value: '' },
imageAlt: { type: String, value: '城市景点图' },
photoCredit: { type: String, value: '' },
mediaRightsLabel: { type: String, value: 'CLAIMED · DRAFT' },
},
data: {
imageFailed: false,
imageReady: false,
},
observers: {
imageSrc() {
this.setData({ imageFailed: false, imageReady: false });
},
},
methods: {
onImageLoad() {
this.setData({ imageReady: true });
},
onImageError() {
this.setData({ imageFailed: true, imageReady: false });
this.triggerEvent('imageerror');
},
},
});
