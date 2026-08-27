import type {
  IdempotencyKey,
  MediaAssetId,
  OptimisticVersion,
  VerificationRequestId,
} from '../../../shared/types/primitives';
import type { LabelDefinitionProjection } from '../../../shared/types/projections';
import {
  callSocialAction,
  createSocialIdempotencyKey,
  socialErrorMessage,
} from '../../../pages/network/services/social-client';

const MAX_LOCAL_MATERIALS = 3;
const MAX_LOCAL_BYTES = 5 * 1024 * 1024;

interface LabelView {
  readonly labelId: string;
  readonly nameZh: string;
  readonly nameEn: string;
  readonly descriptionZh: string;
  readonly enabled: boolean;
}

interface MaterialView {
  readonly localId: string;
  readonly name: string;
  readonly tempFilePath: string;
  readonly sizeBytes: number;
  readonly sizeLabel: string;
  readonly mediaType: 'IMAGE' | 'DOCUMENT';
  readonly status: 'SELECTED' | 'UPLOADING' | 'UPLOADED' | 'FAILED';
  readonly statusLabel: string;
  readonly mediaAssetId?: MediaAssetId;
}

function toLabelView(label: LabelDefinitionProjection): LabelView {
  return {
    labelId: label.labelId,
    nameZh: label.name.zh,
    nameEn: label.name.en,
    descriptionZh: label.description.zh,
    enabled: label.enabled,
  };
}

function sizeLabel(sizeBytes: number): string {
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

const intentKeys = new Map<string, IdempotencyKey>();

function intentKey(scope: string): IdempotencyKey {
  const existing = intentKeys.get(scope);
  if (existing) return existing;
  const created = createSocialIdempotencyKey(scope);
  intentKeys.set(scope, created);
  return created;
}

function localErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.startsWith('材料')) return error.message;
  if (error instanceof Error && error.message.startsWith('上传授权')) return error.message;
  return socialErrorMessage(error);
}

function getSha256FileInfo(filePath: string): Promise<{ readonly size: number; readonly digest: string }> {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().getFileInfo({
      filePath,
      digestAlgorithm: 'sha256',
      success: ({ size, digest }) => resolve({ size, digest }),
      fail: reject,
    });
  });
}

Page({
  data: {
    labels: [] as LabelView[],
    selectedLabelId: '',
    verificationRequestId: '',
    currentStatus: '',
    requestVersion: 0,
    existingEvidenceAssetIds: [] as MediaAssetId[],
    existingEvidenceCount: 0,
    materials: [] as MaterialView[],
    userStatement: '',
    loadingCatalog: false,
    loadingExisting: false,
    busyAction: '',
    errorMessage: '',
  },

  onLoad(options: Record<string, string | undefined>) {
    void this.loadCatalog();
    const requestId = options.verificationRequestId?.trim();
    if (requestId) void this.loadExisting(requestId);
  },

  onPullDownRefresh() {
    void this.loadCatalog();
  },

  async loadCatalog() {
    if (this.data.loadingCatalog) return;
    this.setData({ loadingCatalog: true, errorMessage: '' });
    try {
      const response = await callSocialAction('tag.catalog', { includeDisabled: false });
      this.setData({ labels: response.labels.map(toLabelView) });
    } catch (error) {
      this.setData({ errorMessage: socialErrorMessage(error) });
    } finally {
      this.setData({ loadingCatalog: false });
      wx.stopPullDownRefresh();
    }
  },

  async loadExisting(requestId: string) {
    if (requestId.length > 160 || this.data.loadingExisting) return;
    this.setData({ loadingExisting: true, errorMessage: '' });
    try {
      const response = await callSocialAction('verification.getMine', {
        verificationRequestId: requestId as VerificationRequestId,
      });
      const request = response.request;
      if (request.status !== 'DRAFT' && request.status !== 'NEEDS_CHANGES') {
        throw new Error('材料申请当前不可编辑，请返回审核状态页查看。');
      }
      this.setData({
        verificationRequestId: request.verificationRequestId,
        selectedLabelId: request.labelId,
        currentStatus: request.status,
        requestVersion: request.version,
        existingEvidenceAssetIds: [...request.evidenceAssetIds],
        existingEvidenceCount: request.evidenceAssetIds.length,
      });
    } catch (error) {
      this.setData({ errorMessage: localErrorMessage(error) });
    } finally {
      this.setData({ loadingExisting: false });
    }
  },

  onSelectLabel(event: WechatMiniprogram.CustomEvent<{ labelId: string }>) {
    if (this.data.verificationRequestId || this.data.busyAction) return;
    this.setData({ selectedLabelId: event.detail.labelId });
  },

  onStatementInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({ userStatement: event.detail.value.slice(0, 500) });
  },

  async onCreateDraft() {
    if (!this.data.selectedLabelId || this.data.busyAction) return;
    this.setData({ busyAction: 'create-draft' });
    try {
      const response = await callSocialAction('verification.createDraft', {
        labelId: this.data.selectedLabelId as LabelDefinitionProjection['labelId'],
        idempotencyKey: intentKey(`draft:${this.data.selectedLabelId}`),
      });
      intentKeys.delete(`draft:${this.data.selectedLabelId}`);
      this.setData({
        verificationRequestId: response.request.verificationRequestId,
        currentStatus: response.request.status,
        requestVersion: response.request.version,
      });
      wx.showToast({ title: '草稿已创建', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: socialErrorMessage(error), icon: 'none', duration: 2800 });
    } finally {
      this.setData({ busyAction: '' });
    }
  },

  async onChooseImages() {
    const remaining = MAX_LOCAL_MATERIALS - this.data.materials.length;
    if (remaining <= 0 || this.data.busyAction) return;
    try {
      const result = await wx.chooseMedia({
        count: remaining,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
      });
      const additions = result.tempFiles.map((file, index): MaterialView => ({
        localId: `image_${Date.now().toString(36)}_${index}`,
        name: `图片材料 ${this.data.materials.length + index + 1}`,
        tempFilePath: file.tempFilePath,
        sizeBytes: file.size,
        sizeLabel: sizeLabel(file.size),
        mediaType: 'IMAGE',
        status: 'SELECTED',
        statusLabel: '待上传',
      }));
      this.appendMaterials(additions);
    } catch {
      // User cancellation is not an error state.
    }
  },

  async onChooseDocuments() {
    const remaining = MAX_LOCAL_MATERIALS - this.data.materials.length;
    if (remaining <= 0 || this.data.busyAction) return;
    try {
      const result = await wx.chooseMessageFile({
        count: remaining,
        type: 'file',
        extension: ['pdf', 'png', 'jpg', 'jpeg'],
      });
      const additions = result.tempFiles.map((file, index): MaterialView => ({
        localId: `document_${Date.now().toString(36)}_${index}`,
        name: file.name || `文件材料 ${this.data.materials.length + index + 1}`,
        tempFilePath: file.path,
        sizeBytes: file.size,
        sizeLabel: sizeLabel(file.size),
        mediaType: 'DOCUMENT',
        status: 'SELECTED',
        statusLabel: '待上传',
      }));
      this.appendMaterials(additions);
    } catch {
      // User cancellation is not an error state.
    }
  },

  appendMaterials(additions: MaterialView[]) {
    const accepted = additions.filter((item) => {
      if (item.sizeBytes > MAX_LOCAL_BYTES) {
        wx.showToast({ title: '单份材料不可超过 5 MB', icon: 'none' });
        return false;
      }
      return true;
    });
    this.setData({ materials: [...this.data.materials, ...accepted].slice(0, MAX_LOCAL_MATERIALS) });
  },

  onRemoveMaterial(event: WechatMiniprogram.BaseEvent) {
    if (this.data.busyAction) return;
    const localId = String(event.currentTarget.dataset.localId ?? '');
    this.setData({ materials: this.data.materials.filter((item) => item.localId !== localId) });
  },

  updateMaterial(localId: string, patch: Partial<MaterialView>) {
    this.setData({
      materials: this.data.materials.map((item) => item.localId === localId ? { ...item, ...patch } : item),
    });
  },

  async uploadMaterial(material: MaterialView, requestId: VerificationRequestId): Promise<MediaAssetId> {
    if (material.mediaAssetId) return material.mediaAssetId;
    this.updateMaterial(material.localId, { status: 'UPLOADING', statusLabel: '上传中' });
    try {
      const info = await getSha256FileInfo(material.tempFilePath);
      if (info.size > MAX_LOCAL_BYTES) throw new Error('材料超过客户端 5 MB 限制。');
      const policy = await callSocialAction('verification.uploadPolicy', {
        verificationRequestId: requestId,
        mediaType: material.mediaType,
        fileSizeBytes: info.size,
        sha256: info.digest,
        idempotencyKey: intentKey(`upload-policy:${requestId}:${material.localId}`),
      });
      if (info.size > policy.maxBytes) throw new Error('材料超过服务器允许的大小。');
      if (Date.parse(policy.uploadExpiresAt) <= Date.now()) throw new Error('上传授权已过期，请重新提交。');
      await wx.cloud.uploadFile({ cloudPath: policy.cloudPath, filePath: material.tempFilePath });
      intentKeys.delete(`upload-policy:${requestId}:${material.localId}`);
      this.updateMaterial(material.localId, {
        status: 'UPLOADED',
        statusLabel: '已安全上传',
        mediaAssetId: policy.mediaAssetId,
      });
      return policy.mediaAssetId;
    } catch (error) {
      this.updateMaterial(material.localId, { status: 'FAILED', statusLabel: '上传失败，可重试' });
      throw error;
    }
  },

  async onSubmit() {
    if (this.data.busyAction) return;
    if (!this.data.verificationRequestId) {
      wx.showToast({ title: '请先选择标签并创建草稿', icon: 'none' });
      return;
    }
    const statement = this.data.userStatement.trim();
    if (!statement) {
      wx.showToast({ title: '请填写本人声明', icon: 'none' });
      return;
    }
    if (!this.data.materials.length && !this.data.existingEvidenceAssetIds.length) {
      wx.showToast({ title: '请至少选择一份必要材料', icon: 'none' });
      return;
    }
    this.setData({ busyAction: 'submit' });
    const requestId = this.data.verificationRequestId as VerificationRequestId;
    try {
      const uploaded = [] as MediaAssetId[];
      for (const material of this.data.materials) {
        uploaded.push(await this.uploadMaterial(material, requestId));
      }
      const evidenceAssetIds = [...new Set([...this.data.existingEvidenceAssetIds, ...uploaded])];
      await callSocialAction('verification.submit', {
        verificationRequestId: requestId,
        evidenceAssetIds,
        userStatement: statement,
        expectedVersion: this.data.requestVersion as OptimisticVersion,
        idempotencyKey: intentKey(`submit:${requestId}`),
      });
      intentKeys.delete(`submit:${requestId}`);
      wx.showToast({ title: '已提交人工审核', icon: 'success' });
      setTimeout(() => {
        wx.redirectTo({ url: `/packageSocial/pages/tag-status/index?verificationRequestId=${requestId}` });
      }, 500);
    } catch (error) {
      wx.showToast({ title: localErrorMessage(error), icon: 'none', duration: 3000 });
    } finally {
      this.setData({ busyAction: '' });
    }
  },
});
