import { CITY_DIRECTORY, type CityId } from '../../../shared/constants/geography';
import type { ProfileUpdateInput } from '../../../shared/contracts';
import type { MediaAssetId } from '../../../shared/types/primitives';
import type { ProfilePrivateDto } from '../../../shared/types/projections';
import {
  bootstrapIdentity,
  getMyProfile,
  getRuntimeEvidence,
  refreshMyCard,
  updateMyProfile,
} from '../../../pages/card/services/identity-client';
import { cityDisplayName } from '../../../pages/card/services/card-presenter';
import { createEditableIntroduction } from '../../../pages/card/services/introduction-draft';
import { OFFLINE_DEMO_PROFILE, isOfflineDemo } from '../../../pages/card/services/offline-demo';
import {
  readCardThemePreference,
  writeCardThemePreference,
  type CardTheme,
} from '../../../pages/card/services/card-theme-preference';

type EditorMode = 'PREVIEW' | 'EDIT';

interface DraftInput {
  readonly displayName: string;
  readonly biography: string;
  readonly cityIndex: number;
  readonly profession: string;
  readonly selectedLabels: readonly string[];
  readonly avatarUrl: string;
}

const CITY_NAMES = CITY_DIRECTORY.map((city) => `${city.name.zh} · ${city.name.en}`);
const CITY_IDS = CITY_DIRECTORY.map((city) => city.id);

const IDENTITY_LABELS = [
  '海归',
  '985/211',
  'MBA',
  '创始人',
  '企业家',
  '接班二代',
  '投资人',
  '知名博主',
] as const;

const INTEREST_LABELS = [
  '艺术家',
  '收藏家',
  '艺术爱好者',
  '古董爱好者',
  '珍珠爱好者',
  '红酒品鉴',
  '高尔夫',
  '旅行爱好者',
  '读书爱好者',
  '电影爱好者',
  '美食爱好者',
  '音乐爱好者',
] as const;

const PROFILE_LABEL_SET = new Set<string>([...IDENTITY_LABELS, ...INTEREST_LABELS]);

const THEMES: ReadonlyArray<{ readonly value: CardTheme; readonly label: string }> = [
  { value: 'ivory', label: '象牙白' },
  { value: 'ink', label: '墨黑' },
  { value: 'champagne', label: '香槟金' },
  { value: 'stone', label: '石灰灰' },
];

function compactDraftText(value: string, maximumLength: number): string {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, maximumLength);
}

function uniqueLabels(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => compactDraftText(value, 48)).filter(Boolean))].slice(0, 20);
}

function makeTagOptions(values: readonly string[], selectedLabels: readonly string[]) {
  const selected = new Set(selectedLabels);
  return values.map((label) => ({ label, selected: selected.has(label) }));
}

function makeThemeOptions(theme: CardTheme) {
  return THEMES.map((item) => ({ ...item, selected: item.value === theme }));
}

function displayInitial(displayName: string): string {
  return Array.from(compactDraftText(displayName, 60))[0] ?? 'AB';
}

function makePreview(draft: DraftInput) {
  const cityId = draft.cityIndex >= 0 ? CITY_IDS[draft.cityIndex] : undefined;
  const profession = compactDraftText(draft.profession, 80);
  return {
    previewCard: {
      displayName: compactDraftText(draft.displayName, 60) || '你的名字',
      headline: profession || '你的一句话身份',
      cityId: cityId ?? '',
      biography: draft.biography.trim() || '写下你的经历、关注方向，或希望认识怎样的人。',
      avatarUrl: draft.avatarUrl,
      claims: [],
    },
    previewCityLabel: cityDisplayName(cityId),
    previewFields: [],
    previewInitial: displayInitial(draft.displayName),
    identityTagOptions: makeTagOptions(IDENTITY_LABELS, draft.selectedLabels),
    interestTagOptions: makeTagOptions(INTEREST_LABELS, draft.selectedLabels),
  };
}

const EMPTY_DRAFT: DraftInput = {
  displayName: '',
  biography: '',
  cityIndex: -1,
  profession: '',
  selectedLabels: [],
  avatarUrl: '',
};

Page({
  data: {
    runtimeMode: 'OFFLINE_DEMO',
    demoMode: false,
    profile: null as ProfilePrivateDto | null,
    creatingProfile: false,
    status: 'LOADING' as 'LOADING' | 'READY' | 'SAVING' | 'ERROR' | 'SAVED' | 'PROJECTION_PENDING',
    message: '',
    editorMode: 'PREVIEW' as EditorMode,
    cardTheme: 'ivory' as CardTheme,
    themeOptions: makeThemeOptions('ivory'),
    displayName: '',
    biography: '',
    biographyLength: 0,
    profession: '',
    selectedLabels: [] as string[],
    galleryImages: [] as string[],
    showTags: true,
    showGallery: true,
    previewSelectedLabels: [] as string[],
    previewGalleryImages: [] as string[],
    galleryNote: '',
    ...makePreview(EMPTY_DRAFT),
    cityNames: CITY_NAMES,
    cityIndex: -1,
    localAvatarPath: '',
    localAvatarUsable: false,
    avatarDraftPending: false,
    generatingIntroduction: false,
    introductionNote: '',
  },

  syncPreview(overrides: Partial<DraftInput>) {
    const selectedLabels = uniqueLabels(overrides.selectedLabels ?? this.data.selectedLabels);
    const avatarUrl = overrides.avatarUrl ?? (this.data.localAvatarUsable ? this.data.localAvatarPath : '');
    const draft: DraftInput = {
      displayName: overrides.displayName ?? this.data.displayName,
      biography: overrides.biography ?? this.data.biography,
      cityIndex: overrides.cityIndex ?? this.data.cityIndex,
      profession: overrides.profession ?? this.data.profession,
      selectedLabels,
      avatarUrl,
    };
    this.setData({
      ...overrides,
      selectedLabels,
      ...makePreview(draft),
      previewSelectedLabels: this.data.showTags ? selectedLabels : [],
    });
  },

  setEditorMode(event: WechatMiniprogram.TouchEvent) {
    const mode = String(event.currentTarget.dataset.mode ?? '');
    if (mode !== 'PREVIEW' && mode !== 'EDIT') return;
    this.setData({ editorMode: mode as EditorMode });
  },

  selectCardTheme(event: WechatMiniprogram.TouchEvent) {
    const theme = String(event.currentTarget.dataset.theme ?? '');
    if (!THEMES.some((item) => item.value === theme)) return;
    this.setData({
      cardTheme: theme as CardTheme,
      themeOptions: makeThemeOptions(theme as CardTheme),
    });
    writeCardThemePreference(theme as CardTheme);
  },

  onLoad() {
    const cardTheme = readCardThemePreference();
    const runtime = getRuntimeEvidence();
    const demoMode = isOfflineDemo(runtime);
    if (demoMode) {
      const cityIndex = OFFLINE_DEMO_PROFILE.cityId ? CITY_IDS.indexOf(OFFLINE_DEMO_PROFILE.cityId) : -1;
      const selectedLabels = ['创始人', '艺术爱好者', '旅行爱好者'];
      const demoDraft: DraftInput = {
        displayName: OFFLINE_DEMO_PROFILE.displayName,
        biography: OFFLINE_DEMO_PROFILE.biography ?? '',
        cityIndex,
        profession: '跨城市品牌与文化连接者',
        selectedLabels,
        avatarUrl: '',
      };
      this.setData({
        runtimeMode: runtime.runtimeMode,
        demoMode: true,
        cardTheme,
        themeOptions: makeThemeOptions(cardTheme),
        profile: OFFLINE_DEMO_PROFILE,
        status: 'READY',
        editorMode: 'PREVIEW',
        displayName: demoDraft.displayName,
        biography: demoDraft.biography,
        biographyLength: demoDraft.biography.length,
        cityIndex,
        profession: demoDraft.profession,
        selectedLabels,
        previewSelectedLabels: selectedLabels,
        ...makePreview(demoDraft),
        message: 'DEMO_ONLY：当前修改只在本页预览，不会写入云端。',
      });
      return;
    }
    this.setData({
      runtimeMode: runtime.runtimeMode,
      demoMode: false,
      cardTheme,
      themeOptions: makeThemeOptions(cardTheme),
    });
    void this.loadProfile();
  },

  async loadProfile() {
    if (this.data.status === 'SAVING' || this.data.demoMode) return;
    this.setData({ status: 'LOADING', message: '' });
    let result = await getMyProfile();
    if (!result.ok && (result.code === 'AUTH_REQUIRED' || result.code === 'SESSION_EXPIRED')) {
      this.setData({ message: '正在为你准备名片空间…' });
      const bootstrap = await bootstrapIdentity();
      if (!bootstrap.ok) {
        this.setData({
          status: 'ERROR',
          message: bootstrap.code === 'RATE_LIMITED'
            ? '操作较频繁，请稍后再试。'
            : '暂时无法建立微信身份，请检查网络后重试。',
        });
        return;
      }
      result = await getMyProfile();
    }
    if (!result.ok) {
      if (result.code === 'NOT_FOUND') {
        this.setData({
          profile: null,
          creatingProfile: true,
          status: 'READY',
          editorMode: 'EDIT',
          displayName: '',
          biography: '',
          biographyLength: 0,
          cityIndex: -1,
          profession: '',
          selectedLabels: [],
          galleryImages: [],
          previewSelectedLabels: [],
          previewGalleryImages: [],
          ...makePreview(EMPTY_DRAFT),
          message: '',
        });
        return;
      }
      this.setData({ status: 'ERROR', message: result.message });
      return;
    }

    const profile = result.data.profile;
    const cityIndex = profile.cityId ? CITY_IDS.indexOf(profile.cityId) : -1;
    const loadedDraft: DraftInput = {
      displayName: profile.displayName,
      biography: profile.biography ?? '',
      cityIndex,
      profession: '',
      selectedLabels: [],
      avatarUrl: '',
    };
    this.setData({
      profile,
      creatingProfile: false,
      status: 'READY',
      editorMode: 'PREVIEW',
      displayName: loadedDraft.displayName,
      biography: loadedDraft.biography,
      biographyLength: loadedDraft.biography.length,
      cityIndex,
      profession: '',
      selectedLabels: [],
      galleryImages: [],
      previewSelectedLabels: [],
      previewGalleryImages: [],
      ...makePreview(loadedDraft),
      message: '',
      avatarDraftPending: false,
      localAvatarPath: '',
      localAvatarUsable: false,
    });
  },

  onDisplayNameInput(event: WechatMiniprogram.Input) {
    this.syncPreview({ displayName: event.detail.value });
  },

  onBiographyInput(event: WechatMiniprogram.Input) {
    this.syncPreview({ biography: event.detail.value });
    this.setData({ biographyLength: event.detail.value.length });
  },

  onProfessionInput(event: WechatMiniprogram.Input) {
    this.syncPreview({ profession: event.detail.value });
  },

  toggleProfileTag(event: WechatMiniprogram.TouchEvent) {
    const value = compactDraftText(String(event.currentTarget.dataset.tag ?? ''), 48);
    if (!value || !PROFILE_LABEL_SET.has(value)) return;
    const current = uniqueLabels(this.data.selectedLabels);
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    this.syncPreview({ selectedLabels: next });
  },

  onModuleToggle(event: WechatMiniprogram.CustomEvent<{ value: boolean }>) {
    const moduleName = String(event.currentTarget.dataset.module ?? '');
    const enabled = Boolean(event.detail.value);
    if (moduleName === 'tags') {
      this.setData({ showTags: enabled, previewSelectedLabels: enabled ? this.data.selectedLabels : [] });
    }
    if (moduleName === 'gallery') {
      this.setData({ showGallery: enabled, previewGalleryImages: enabled ? this.data.galleryImages : [] });
    }
  },

  onCityChange(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    const index = Number(event.detail.value);
    if (Number.isInteger(index) && index >= 0 && index < CITY_IDS.length) {
      this.syncPreview({ cityIndex: index });
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
    this.syncPreview({ avatarUrl });
  },

  onAvatarImageError() {
    this.setData({ localAvatarUsable: false });
    this.syncPreview({ avatarUrl: '' });
  },

  chooseGalleryImages() {
    const remaining = Math.max(0, 4 - this.data.galleryImages.length);
    if (!remaining) {
      this.setData({ galleryNote: '最多展示 4 张图片。' });
      return;
    }
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (result) => {
        const selected = result.tempFiles.map((file) => file.tempFilePath).filter(Boolean);
        const galleryImages = [...this.data.galleryImages, ...selected].slice(0, 4);
        this.setData({
          galleryImages,
          previewGalleryImages: this.data.showGallery ? galleryImages : [],
          galleryNote: '图片已加入本页预览；当前不会上传或公开。',
        });
      },
    });
  },

  removeGalleryImage(event: WechatMiniprogram.TouchEvent) {
    const index = Number(event.currentTarget.dataset.index);
    if (!Number.isInteger(index) || index < 0 || index >= this.data.galleryImages.length) return;
    const galleryImages = this.data.galleryImages.filter((_, itemIndex) => itemIndex !== index);
    this.setData({
      galleryImages,
      previewGalleryImages: this.data.showGallery ? galleryImages : [],
      galleryNote: '',
    });
  },

  async generateIntroductionDraft() {
    if (this.data.generatingIntroduction) return;
    const cityId = this.data.cityIndex >= 0 ? CITY_IDS[this.data.cityIndex] : undefined;
    this.setData({ generatingIntroduction: true, introductionNote: '正在准备可编辑草稿…' });
    const draft = await createEditableIntroduction({
      displayName: this.data.displayName,
      cityName: cityDisplayName(cityId),
      education: '',
      profession: this.data.profession,
      interests: this.data.selectedLabels.join('、'),
    });
    this.syncPreview({ biography: draft.text });
    this.setData({
      generatingIntroduction: false,
      biographyLength: draft.text.length,
      introductionNote: draft.source === 'AI'
        ? '已生成可编辑草稿，请在保存前确认内容。'
        : '已根据你填写的身份和标签整理出可编辑草稿。',
    });
  },

  async saveProfile() {
    if (this.data.status === 'SAVING') return;
    if (this.data.demoMode) {
      this.setData({
        status: 'READY',
        editorMode: 'PREVIEW',
        message: '未保存：这是 SYNTHETIC · DEMO_ONLY 本页草稿。',
      });
      return;
    }

    const profile = this.data.profile;
    if (!profile && !this.data.creatingProfile) {
      this.setData({ status: 'ERROR', message: '资料版本尚未加载，请重新进入后再保存。' });
      return;
    }
    const displayName = compactDraftText(this.data.displayName, 60);
    const biography = this.data.biography.trim();
    if (!displayName) {
      this.setData({ status: 'ERROR', message: '请填写公开称呼。' });
      return;
    }
    if (biography.length > 240) {
      this.setData({ status: 'ERROR', message: '自由介绍不能超过 240 个字符。' });
      return;
    }
    const selectedCityId = this.data.cityIndex >= 0 ? CITY_IDS[this.data.cityIndex] : undefined;
    if (!selectedCityId) {
      this.setData({ status: 'ERROR', message: '请选择所在城市。' });
      return;
    }
    if (!biography) {
      this.setData({ status: 'ERROR', message: '请填写自由介绍，或先使用 AI 辅助润色。' });
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
    this.setData({ status: 'SAVING', message: '正在保存名片…' });
    const result = await updateMyProfile(update, profile?.version);
    if (!result.ok) {
      this.setData({
        status: 'ERROR',
        message: result.code === 'VERSION_CONFLICT'
          ? '名片已在其他页面更新，请重新加载后再保存。'
          : result.message,
      });
      return;
    }

    const cityIndex = result.data.profile.cityId ? CITY_IDS.indexOf(result.data.profile.cityId) : -1;
    const savedDraft: DraftInput = {
      displayName: result.data.profile.displayName,
      biography: result.data.profile.biography ?? '',
      cityIndex,
      profession: this.data.profession,
      selectedLabels: this.data.selectedLabels,
      avatarUrl: this.data.localAvatarUsable ? this.data.localAvatarPath : '',
    };
    this.setData({
      profile: result.data.profile,
      creatingProfile: false,
      displayName: savedDraft.displayName,
      biography: savedDraft.biography,
      biographyLength: savedDraft.biography.length,
      cityIndex,
      ...makePreview(savedDraft),
    });

    const refresh = await refreshMyCard(result.data.profile.version);
    if (!refresh.ok) {
      this.setData({
        status: 'PROJECTION_PENDING',
        message: '名片资料已保存，但公开展示尚未刷新完成，请稍后重试。',
      });
      return;
    }
    this.setData({
      status: 'SAVED',
      editorMode: 'PREVIEW',
      message: this.data.avatarDraftPending || this.data.selectedLabels.length || this.data.galleryImages.length
        ? '称呼、城市和自由介绍已保存；标签、图片与本地头像仍只在本页预览。'
        : '名片已保存并更新公开展示。',
    });
  },

  async retryProjectionRefresh() {
    if (!this.data.profile || this.data.status === 'SAVING') return;
    this.setData({ status: 'SAVING', message: '正在刷新公开名片…' });
    const result = await refreshMyCard(this.data.profile.version);
    this.setData(result.ok
      ? { status: 'SAVED', editorMode: 'PREVIEW', message: '公开名片已刷新。' }
      : { status: 'PROJECTION_PENDING', message: result.message });
  },
});
