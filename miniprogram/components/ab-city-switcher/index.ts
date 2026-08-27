Component({
options: {
styleIsolation: 'apply-shared',
},
properties: {
cities: { type: Array, value: [] },
selectedCityId: { type: String, value: '' },
selectedCityLabel: { type: String, value: '选择城市' },
selectedCityMeta: { type: String, value: '全球城市目录' },
},
data: {
expanded: false,
},
methods: {
toggle() {
this.setData({ expanded: !this.data.expanded });
},
close() {
this.setData({ expanded: false });
},
chooseCity(event: WechatMiniprogram.CustomEvent) {
const cityId = String(event.currentTarget.dataset.cityId ?? '');
if (!cityId) return;
this.setData({ expanded: false });
this.triggerEvent('change', { cityId });
},
},
});
