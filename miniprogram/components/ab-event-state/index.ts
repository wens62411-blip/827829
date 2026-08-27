Component({
options: {
styleIsolation: 'apply-shared',
},
properties: {
kind: { type: String, value: 'EMPTY' },
eyebrow: { type: String, value: 'AB CLUB EVENTS' },
title: { type: String, value: '暂无可公开活动' },
description: { type: String, value: '城市目录入口已经建立，但这不代表当地节点正在运营。' },
detail: { type: String, value: '没有当前来源和人工复核证据时，不展示活动或报名入口。' },
actionLabel: { type: String, value: '' },
},
methods: {
onAction() {
this.triggerEvent('action');
},
},
});
