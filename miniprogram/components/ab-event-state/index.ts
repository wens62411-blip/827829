Component({
options: {
styleIsolation: 'apply-shared',
},
properties: {
kind: { type: String, value: 'EMPTY' },
eyebrow: { type: String, value: 'AB CLUB EVENTS' },
title: { type: String, value: '暂无可公开活动' },
description: { type: String, value: '可切换城市浏览。' },
detail: { type: String, value: '' },
actionLabel: { type: String, value: '' },
},
methods: {
onAction() {
this.triggerEvent('action');
},
},
});
