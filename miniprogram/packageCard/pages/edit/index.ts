import { CITY_DIRECTORY, type CityId } from '../../../shared/constants/geography';
import type { ProfileUpdateInput } from '../../../shared/contracts';
import type { MediaAssetId } from '../../../shared/types/primitives';
import type { ProfilePrivateDto } from '../../../shared/types/projections';
import {
  getMyProfile,
  getRuntimeEvidence,
  refreshMyCard,
  updateMyProfile,
} from '../../../pages/card/services/identity-client';
import { cityDisplayName } from '../../../pages/card/services/card-presenter';
import { createEditableIntroduction } from '../../../pages/card/services/introduction-draft';

const CITY_NAMES = CITY_DIRECTORY.map((city) => `${city.name.zh} · ${city.name.en}`);
const CITY_IDS = CITY_DIRECTORY.map((city) => city.id);

Page({
  data: {
    runtimeMode: 'OFFLINE_DEMO',
    profile: null as ProfilePrivateDto | null,
    creatingProfile: false,
    status: 'LOADING' as 'LOADING' | 'READY' | 'SAVING' | 'ERROR' | 'SAVED' | 'PROJECTION_PENDING',
    message: '',
    displayName: '',
    biography: '',
    biographyLength: 0,
    cityNames: CITY_NAMES,
    cityIndex: -1,
    localAvatarPath: '',
    localAvatarUsable: false,
    avatarDraftPending: false,
    generatingIntroduction: false,
    introductionNote: '',
  },

  onLoad() {
    this.setData({ runtimeMode: getRuntimeEvidence().runtimeMode });
    void this.loadProfile();
  },

  async loadProfile() {
    if (this.data.status === 'SAVING') return;
    this.setData({ status: 'LOADING', message: '' });
    const result = await getMyProfile();
    if (!result.ok) {
      if (result.code === 'NOT_FOUND') {
        this.setData({
          profile: null,
          creatingProfile: true,
          status: 'READY',
          displayName: '',
          biography: '',
          biographyLength: 0,
          cityIndex: -1,
          message: '这是首次创建资料。提交前不会生成本地模拟 profile；保存成功后以服务端返回版本为准。',
        });
        return;
      }
      this.setData({
        status: 'ERROR',
        message: result.message,
      });
      return;
    }
    const profile = result.data.profile;
    const cityIndex = profile.cityId ? CITY_IDS.indexOf(profile.cityId) : -1;
    this.setData({
      profile,
      creatingProfile: false,
      status: 'READY',
      displayName: profile.displayName,
      biography: profile.biography ?? '',
      biographyLength: (profile.biography ?? '').length,
      cityIndex,
      message: '',
      avatarDraftPending: false,
      localAvatarPath: '',
      localAvatarUsable: false,
    });
  },

  onDisplayNameInput(event: WechatMiniprogram.Input) {
    this.setData({ displayName: event.detail.value });
  },

  onBiographyInput(event: WechatMiniprogram.Input) {
    this.setData({ biography: event.detail.value, biographyLength: event.detail.value.length });
  },

  onCityChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const index = Number(event.detail.value);
    if (Number.isInteger(index) && index >= 0 && index < CITY_IDS.length) {
      this.setData({ cityIndex: index });
    }
  },

  onChooseAvatar(event: WechatMiniprogram.CustomEvent<{ avatarUrl: string }>) {
    const avatarUrl = event.detail.avatarUrl;
    if (!avatarUrl) return;
    this.setData({
      localAvatarPath: avatarUrl,
      localAvatarUsable: true,
      avatarDraftPending: true,
    });
  },

  onAvatarImageError() {
    this.setData({ localAvatarUsable: false });
  },

  async generateIntroductionDraft() {
    if (this.data.generatingIntroduction) return;
    const cityId = this.data.cityIndex >= 0 ? CITY_IDS[this.data.cityIndex] : undefined;
    this.setData({ generatingIntroduction: true, introductionNote: '正在准备可编辑草稿…' });
    const draft = await createEditableIntroduction({
      displayName: this.data.displayName,
      cityName: cityDisplayName(cityId),
    });
    this.setData({
      generatingIntroduction: false,
      biography: draft.text,
      biographyLength: draft.text.length,
      introductionNote: draft.source === 'AI'
        ? '已生成可编辑 AI 草稿；保存前请自行确认。AI 不会改变认证状态。'
        : '当前没有已冻结的 AI 服务动作，已使用确定性模板；内容仍可编辑，且不会改变认证状态。',
    });
  },

  async saveProfile() {
    if (this.data.status === 'SAVING') return;
    const profile = this.data.profile;
    if (!profile && !this.data.creatingProfile) {
      this.setData({ status: 'ERROR', message: '资料版本尚未加载，无法安全保存。' });
      return;
    }
    const displayName = this.data.displayName.replace(/[\r\n\t]+/g, ' ').trim();
    const biography = this.data.biography.trim();
    if (!displayName || displayName.length > 60) {
      this.setData({ status: 'ERROR', message: '昵称需为 1–60 个字符。' });
      return;
    }
    if (biography.length > 240) {
      this.setData({ status: 'ERROR', message: '一句话介绍不能超过 240 个字符。' });
      return;
    }
    const selectedCityId = this.data.cityIndex >= 0 ? CITY_IDS[this.data.cityIndex] : undefined;
    if (!selectedCityId) {
      this.setData({ status: 'ERROR', message: '请选择城市后再保存最小资料。' });
      return;
    }
    if (!biography) {
      this.setData({ status: 'ERROR', message: '请填写一句话介绍，或先生成可编辑模板。' });
      return;
    }
    const update: ProfileUpdateInput = {
      displayName,
      cityId: selectedCityId as CityId,
      biography,
      ...(profile?.avatarAssetId === undefined
        ? {}
        : { avatarAssetId: profile.avatarAssetId as MediaAssetId }),
    };
    this.setData({
      status: 'SAVING',
      message: this.data.avatarDraftPending
        ? '正在保存合同支持的文字字段；本地头像预览不会上传。'
        : '正在保存资料并请求刷新公开投影…',
    });
    const result = await updateMyProfile(update, profile?.version);
    if (!result.ok) {
      this.setData({
        status: 'ERROR',
        message: result.code === 'VERSION_CONFLICT'
          ? '资料已在其他页面更新。请重新载入后再保存，避免覆盖新版本。'
          : result.message,
      });
      return;
    }
    this.setData({
      profile: result.data.profile,
      creatingProfile: false,
      displayName: result.data.profile.displayName,
      biography: result.data.profile.biography ?? '',
      biographyLength: (result.data.profile.biography ?? '').length,
      avatarDraftPending: false,
      localAvatarPath: '',
      localAvatarUsable: false,
    });

    const refresh = await refreshMyCard(result.data.profile.version);
    if (!refresh.ok) {
      this.setData({
        status: 'PROJECTION_PENDING',
        message: '私密资料已由服务端确认保存，但公开投影刷新尚未确认。请重试刷新；本页不会把它标为完整成功。',
      });
      return;
    }
    this.setData({
      status: 'SAVED',
      message: '资料保存与公开投影刷新均已由服务端确认。',
    });
  },

  async retryProjectionRefresh() {
    if (!this.data.profile || this.data.status === 'SAVING') return;
    this.setData({ status: 'SAVING', message: '正在重试公开投影刷新…' });
    const result = await refreshMyCard(this.data.profile.version);
    this.setData(result.ok
      ? { status: 'SAVED', message: '公开投影刷新已由服务端确认。' }
      : { status: 'PROJECTION_PENDING', message: result.message });
  },
});
