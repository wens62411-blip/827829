Component({
options: {
styleIsolation: 'apply-shared',
},
properties: {
items: { type: Array, value: [] },
loading: { type: Boolean, value: false },
hasMore: { type: Boolean, value: false },
selectedHandle: { type: String, value: '' },
emptyText: { type: String, value: '当前没有可处理项目' },
},
methods: {
onSelect(event: { currentTarget: { dataset: { handle?: string } } }) {
const handle = event.currentTarget.dataset.handle;
if (!handle) return;
this.triggerEvent('select', { handle });
},
onRetry() {
this.triggerEvent('retry');
},
onLoadMore() {
if (this.data.loading || !this.data.hasMore) return;
this.triggerEvent('loadmore');
},
},
});
