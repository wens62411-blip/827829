Component({
options: {
styleIsolation: 'apply-shared',
},
properties: {
detail: { type: Object, value: null },
actions: { type: Array, value: [] },
busy: { type: Boolean, value: false },
expiresInSeconds: { type: Number, value: 120 },
notice: { type: String, value: '' },
},
data: {
pendingAction: '',
pendingLabel: '',
note: '',
reasonCode: '',
changesText: '',
},
observers: {
'detail.handle'() {
// A decision draft belongs to exactly one detail lease. Switching the
// selected case must never carry an old human intent into a new case.
this.setData({
pendingAction: '',
pendingLabel: '',
note: '',
reasonCode: '',
changesText: '',
});
},
},
methods: {
beginAction(event: { currentTarget: { dataset: { action?: string; label?: string } } }) {
if (this.data.busy) return;
const action = event.currentTarget.dataset.action;
const label = event.currentTarget.dataset.label;
if (!action || !label) return;
this.setData({ pendingAction: action, pendingLabel: label });
},
cancelAction() {
if (this.data.busy) return;
this.setData({
pendingAction: '',
pendingLabel: '',
note: '',
reasonCode: '',
changesText: '',
});
},
onNoteInput(event: { detail: { value: string } }) {
this.setData({ note: event.detail.value });
},
onReasonInput(event: { detail: { value: string } }) {
this.setData({ reasonCode: event.detail.value });
},
onChangesInput(event: { detail: { value: string } }) {
this.setData({ changesText: event.detail.value });
},
confirmAction() {
if (this.data.busy || !this.data.pendingAction) return;
this.triggerEvent('decision', {
action: this.data.pendingAction,
note: this.data.note.trim(),
reasonCode: this.data.reasonCode.trim(),
changesText: this.data.changesText.trim(),
});
},
closeDetail() {
if (this.data.busy) return;
this.cancelAction();
this.triggerEvent('close');
},
},
});
