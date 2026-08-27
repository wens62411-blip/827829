// GENERATED FROM TYPESCRIPT BY scripts/build-cloud-runtime.mjs — DO NOT EDIT
// CLOUD_RUNTIME_SOURCE_SHA256:4f54b0888ea0693f6f062f4083a23a1d4567c9056d842942d7402bb1e98e24df
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// cloudfunctions/_shared/audit/index.ts
var audit_exports = {};
__export(audit_exports, {
  appendAudit: () => appendAudit,
  assertAuditMutation: () => assertAuditMutation,
  createAuditAppend: () => createAuditAppend
});
module.exports = __toCommonJS(audit_exports);
function createAuditAppend(input) {
  return Object.freeze({ ...input });
}
async function appendAudit(writer, entry) {
  const result = await writer.add({ data: entry });
  return result.id;
}
function assertAuditMutation(operation) {
  if (operation !== "add") throw new Error("audit_logs is append-only");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  appendAudit,
  assertAuditMutation,
  createAuditAppend
});
