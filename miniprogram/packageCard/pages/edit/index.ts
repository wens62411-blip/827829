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
import {
  MAX_PROFILE_LABELS,
  addProfileLabel,
  normalizeProfileLabels,
  readOfflineDemoDraft,
  writeOfflineDemoDraft,
} from '../../../pages/card/services/offline-demo-draft';
import { buildOfflineDemoSharePath } from '../../../pages/card/services/offline-demo-share-snapshot';
import {
  LOCAL_IDENTITY_CONTRACT_VERSION,
  hasLocalIdentity,
  readLocalIdentity,
  saveLocalIdentity,
  type LocalIdentity,
} from '../../../pages/card/services/local-identity';

type EditorMode = 'PREVIEW' | 'EDIT';

interface DraftInput {
  readonly displayName: string;
  readonly biography: string;
  readonly cityIndex: number;
  readonly profession: string;
  readonly selectedLabels: readonly string[];
  readonly phone: string;
  readonly email: string;
  readonly showPhone: boolean;
  readonly showEmail: boolean;
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

function normalizeDraftPhone(value: string): string {
  const candidate = compactDraftText(value, 24);
  return candidate.length >= 6 && /^\+?[0-9](?:[0-9 ()-]*[0-9])$/.test(candidate)
    ? candidate
    : '';
}

function normalizeDraftEmail(value: string): string {
  const candidate = compactDraftText(value, 72);
  if (!candidate || /\s/.test(candidate)) return '';
  const parts = candidate.split('@');
  return parts.length === 2
    && Boolean(parts[0])
    && /^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(parts[1] ?? '')
    ? candidate
    : '';
}

function uniqueLabels(values: readonly string[]): string[] {
  return normalizeProfileLabels(values);
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
  const phone = normalizeDraftPhone(draft.phone);
  const email = normalizeDraftEmail(draft.email);
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
    previewFields: [
      ...(draft.showPhone && phone ? [{ key: 'phone', label: '电话', value: phone }] : []),
      ...(draft.showEmail && email ? [{ key: 'email', label: '邮箱', value: email }] : []),
    ],
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
  phone: '',
  email: '',
  showPhone: false,
  showEmail: false,
  avatarUrl: '',
};

Page({
  data: {
    runtimeMode: 'OFFLINE_DEMO',
    demoMode: false,
    localIdentityReady: false,
    registerMode: false,
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
    phone: '',
    email: '',
    showPhone: false,
    showEmail: false,
    contactMessage: '',
    galleryImages: [] as string[],
    showTags: true,
    showGallery: true,
    previewSelectedLabels: [] as string[],
    previewPublicLabels: [] as string[],
    previewGalleryImages: [] as string[],
    customLabelInput: '',
    tagMessage: '',
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
      phone: overrides.phone ?? this.data.phone,
      email: overrides.email ?? this.data.email,
      showPhone: overrides.showPhone ?? this.data.showPhone,
      showEmail: overrides.showEmail ?? this.data.showEmail,
      avatarUrl,
    };
    this.setData({
      ...overrides,
      selectedLabels,
      ...makePreview(draft),
      previewSelectedLabels: [],
      previewPublicLabels: this.data.showTags ? selectedLabels : [],
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

  onLoad(query: Record<string, string | undefined> = {}) {
    const cardTheme = readCardThemePreference();
    const runtime = getRuntimeEvidence();
    const demoMode = isOfflineDemo(runtime);
    const localReady = hasLocalIdentity();
    const registerMode = query.register === '1';
    if (localReady || registerMode) {
      const identity = localReady ? readLocalIdentity() : null;
      const displayName = identity?.displayName ?? '';
      const biography = identity?.biography ?? '';
      const profession = identity?.profession ?? '';
      const cityIndex = identity ? CITY_IDS.indexOf(identity.cityId) : -1;
      const selectedLabels = identity ? [...identity.selectedLabels] : [];
      const phone = identity?.phone ?? '';
      const email = identity?.email ?? '';
      const showPhone = identity?.showPhone ?? false;
      const showEmail = identity?.showEmail ?? false;
      const showTags = identity?.showTags ?? true;
      const myDraft: DraftInput = {
        displayName,
        biography,
        cityIndex,
        profession,
        selectedLabels,
        phone,
        email,
        showPhone,
        showEmail,
        avatarUrl: '',
      };
      this.setData({
        runtimeMode: runtime.runtimeMode,
        demoMode: true,
        localIdentityReady: true,
        registerMode: Boolean(registerMode) && !localReady,
        cardTheme,
        themeOptions: makeThemeOptions(cardTheme),
        status: 'READY',
        editorMode: 'PREVIEW',
        displayName,
        biography,
        biographyLength: biography.length,
        cityIndex,
        profession,
        selectedLabels,
        phone,
        email,
        showPhone,
        showEmail,
        contactMessage: '',
        showTags,
        previewSelectedLabels: [],
        previewPublicLabels: showTags ? selectedLabels : [],
        ...makePreview(myDraft),
        message: localReady ? '' : '第一次建立名片：资料只保存在这台设备，不会上传或生成真实账户。',
      });
      return;
    }
    if (demoMode) {
      const storedDraft = readOfflineDemoDraft();
      const cityIndex = CITY_IDS.indexOf(storedDraft.cityId);
      const selectedLabels = [...storedDraft.selectedLabels];
      const demoDraft: DraftInput = {
        displayName: storedDraft.displayName,
        biography: storedDraft.biography,
        cityIndex,
        profession: storedDraft.profession,
        selectedLabels,
        phone: storedDraft.phone,
        email: storedDraft.email,
        showPhone: storedDraft.showPhone,
        showEmail: storedDraft.showEmail,
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
        phone: demoDraft.phone,
        email: demoDraft.email,
        showPhone: demoDraft.showPhone,
        showEmail: demoDraft.showEmail,
        contactMessage: '',
        showTags: storedDraft.showTags,
        previewSelectedLabels: [],
        previewPublicLabels: storedDraft.showTags ? selectedLabels : [],
        ...makePreview(demoDraft),
        message: '体验版：名片可保存为本机体验草稿，不会写入云端。',
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
          phone: '',
          email: '',
          showPhone: false,
          showEmail: false,
          contactMessage: '',
          galleryImages: [],
          previewSelectedLabels: [],
          previewPublicLabels: [],
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
      phone: '',
      email: '',
      showPhone: false,
      showEmail: false,
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
      phone: '',
      email: '',
      showPhone: false,
      showEmail: false,
      contactMessage: '',
      galleryImages: [],
      previewSelectedLabels: [],
      previewPublicLabels: [],
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

  onPhoneInput(event: WechatMiniprogram.Input) {
    this.syncPreview({ phone: event.detail.value });
    this.setData({ contactMessage: '' });
  },

  onEmailInput(event: WechatMiniprogram.Input) {
    this.syncPreview({ email: event.detail.value });
    this.setData({ contactMessage: '' });
  },

  toggleProfileTag(event: WechatMiniprogram.TouchEvent) {
    const value = String(event.currentTarget.dataset.tag ?? '').trim();
    if (!value || !PROFILE_LABEL_SET.has(value)) return;
    const current = uniqueLabels(this.data.selectedLabels);
    if (current.includes(value)) {
      this.syncPreview({ selectedLabels: current.filter((item) => item !== value) });
      this.setData({ tagMessage: '' });
      return;
    }
    const result = addProfileLabel(current, value);
    if (!result.ok) {
      this.setData({ tagMessage: result.code === 'MAX_COUNT' ? `最多添加 ${MAX_PROFILE_LABELS} 个标签。` : '这个标签暂时无法添加。' });
      return;
    }
    this.syncPreview({ selectedLabels: result.labels });
    this.setData({ tagMessage: '' });
  },

  onCustomLabelInput(event: WechatMiniprogram.Input) {
    this.setData({ customLabelInput: event.detail.value, tagMessage: '' });
  },

  addCustomProfileTag() {
    const result = addProfileLabel(this.data.selectedLabels, this.data.customLabelInput);
    if (!result.ok) {
      const messages = {
        EMPTY: '请先输入标签内容。',
        CONTROL_CHARACTER: '标签不能包含换行或不可见控制字符。',
        TOO_LONG: '每个标签最多 10 个字。',
        DUPLICATE: '这个标签已经添加过了。',
        MAX_COUNT: `最多添加 ${MAX_PROFILE_LABELS} 个标签。`,
      } as const;
      this.setData({ tagMessage: messages[result.code] });
      return;
    }
    this.syncPreview({ selectedLabels: result.labels });
    this.setData({ customLabelInput: '', tagMessage: '' });
  },

  removeProfileTag(event: WechatMiniprogram.TouchEvent) {
    const value = String(event.currentTarget.dataset.tag ?? '').trim();
    if (!value) return;
    this.syncPreview({ selectedLabels: this.data.selectedLabels.filter((label) => label !== value) });
    this.setData({ tagMessage: '' });
  },

  onModuleToggle(event: WechatMiniprogram.CustomEvent<{ value: boolean }>) {
    const moduleName = String(event.currentTarget.dataset.module ?? '');
    const enabled = Boolean(event.detail.value);
    if (moduleName === 'tags') {
      this.setData({
        showTags: enabled,
        previewSelectedLabels: [],
        previewPublicLabels: enabled ? this.data.selectedLabels : [],
      });
    }
    if (moduleName === 'gallery') {
      this.setData({ showGallery: enabled, previewGalleryImages: enabled ? this.data.galleryImages : [] });
    }
    if (moduleName === 'phone') {
      this.syncPreview({ showPhone: enabled });
      this.setData({ contactMessage: '' });
    }
    if (moduleName === 'email') {
      this.syncPreview({ showEmail: enabled });
      this.setData({ contactMessage: '' });
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
    if (this.data.localIdentityReady || this.data.registerMode) {
      const cityId = this.data.cityIndex >= 0 ? CITY_IDS[this.data.cityIndex] : undefined;
      const phone = normalizeDraftPhone(this.data.phone);
      const email = normalizeDraftEmail(this.data.email);
      const displayName = compactDraftText(this.data.displayName, 60);
      if (!displayName) {
        this.setData({ status: 'ERROR', message: '请填写公开称呼。' });
        return;
      }
      if (this.data.phone.trim() && !phone) {
        this.setData({ status: 'ERROR', contactMessage: '请填写有效电话号码，或留空。', message: '电话格式需要检查。' });
        return;
      }
      if (this.data.email.trim() && !email) {
        this.setData({ status: 'ERROR', contactMessage: '请填写有效邮箱地址，或留空。', message: '邮箱格式需要检查。' });
        return;
      }
      const identity: LocalIdentity = {
        contractVersion: LOCAL_IDENTITY_CONTRACT_VERSION,
        displayName,
        biography: this.data.biography.trim(),
        profession: compactDraftText(this.data.profession, 80),
        cityId: (cityId ?? CITY_DIRECTORY[0].id) as CityId,
        selectedLabels: this.data.selectedLabels,
        showTags: this.data.showTags,
        phone,
        email,
        showPhone: this.data.showPhone,
        showEmail: this.data.showEmail,
        registeredAt: new Date().toISOString(),
      };
      if (!saveLocalIdentity(identity)) {
        this.setData({ status: 'ERROR', message: '本机名片保存失败，请检查存储空间后重试。' });
        return;
      }
      this.setData({
        status: 'SAVED',
        editorMode: 'PREVIEW',
        localIdentityReady: true,
        registerMode: false,
        phone,
        email,
        contactMessage: '',
        message: '已保存到本机名片，仅保存在这台设备。',
      });
      return;
    }
    if (this.data.demoMode) {
      const current = readOfflineDemoDraft();
      const cityId = this.data.cityIndex >= 0 ? CITY_IDS[this.data.cityIndex] : undefined;
      const phone = normalizeDraftPhone(this.data.phone);
      const email = normalizeDraftEmail(this.data.email);
      if (this.data.phone.trim() && !phone) {
        this.setData({ status: 'ERROR', contactMessage: '请填写有效电话号码，或留空。', message: '电话格式需要检查。' });
        return;
      }
      if (this.data.email.trim() && !email) {
        this.setData({ status: 'ERROR', contactMessage: '请填写有效邮箱地址，或留空。', message: '邮箱格式需要检查。' });
        return;
      }
      const draft = {
        ...current,
        displayName: this.data.displayName,
        biography: this.data.biography,
        profession: this.data.profession,
        cityId,
        selectedLabels: this.data.selectedLabels,
        showTags: this.data.showTags,
        phone,
        email,
        showPhone: this.data.showPhone,
        showEmail: this.data.showEmail,
      };
      const sharePreflight = buildOfflineDemoSharePath(draft, this.data.cardTheme);
      if (!sharePreflight.ok) {
        this.setData({
          status: 'ERROR',
          message: '名片内容超出微信分享路径预算，请精简个人简介后再保存。',
        });
        return;
      }
      if (!writeOfflineDemoDraft(draft)) {
        this.setData({ status: 'ERROR', message: '本机体验草稿保存失败，请检查存储空间后重试。' });
        return;
      }
      this.setData({
        status: 'SAVED',
        editorMode: 'PREVIEW',
        phone,
        email,
        contactMessage: '',
        message: '已保存到本机体验版草稿；未写入云端。',
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
      phone: '',
      email: '',
      showPhone: false,
      showEmail: false,
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
